# 10 — Refresh token rotation

**Tier B. Depends on: nothing structurally, but this is the highest-risk
prompt in the whole set — it changes how every authenticated request is
verified. Do it in isolation, test extensively, and keep the old
single-token behavior in a git branch/tag you can roll back to if
something breaks.**

## Purpose
Currently (check `controllers/authController.js` and
`middleware/auth.js`) there's a single long-lived JWT issued at login,
used directly as the bearer token for every request, with no way to
revoke it before it expires. Move to a short-lived access token +
longer-lived, revocable refresh token pair — the standard pattern.

## Model change: `models/User.js` (or a new `models/RefreshToken.js` —
prefer a separate collection so a user can have multiple valid sessions,
e.g. logged in on both a phone and a laptop, and you can revoke one
without logging out the other)
Create `models/RefreshToken.js`:
- `user` — ObjectId ref `'User'`, required.
- `tokenHash` — String, required (store a hash of the token, never the
  raw value, same principle as the password-reset token in prompt 03).
- `expiresAt` — Date, required.
- `revoked` — Boolean, default `false`.

## Changes to `login` / `register`
Instead of issuing one token, issue two:
- **Access token**: short-lived JWT (15 minutes — set via
  `JWT_ACCESS_EXPIRE` env var), signed the same way the current token is,
  containing the same payload (`{ id, role }` or whatever the current
  payload shape is — check the existing code).
- **Refresh token**: a separate random value (`crypto.randomBytes(40)
  .toString('hex')`), stored hashed in a new `RefreshToken` document with
  a longer expiry (7 days — `JWT_REFRESH_EXPIRE_DAYS` env var).

Respond with both: `{ success: true, user, accessToken, refreshToken }`.
(Keep responding with a field literally named the same as whatever the
frontend currently reads as `token` for backward compatibility during the
transition, OR update both sides together — coordinate with the frontend
prompt for this, prompt 08 in the frontend advanced set, since the
frontend's token-storage and axios-interceptor logic has to change in
lockstep with this one.)

## New handler: `refreshAccessToken`
- Public (no bearer auth — the whole point is the access token has
  expired). Body: `{ refreshToken }`.
- Hash the incoming token, look up a matching, non-revoked,
  non-expired `RefreshToken` document. If none found, 401 error.
- Issue a new access token. **Also rotate the refresh token** — mark the
  old `RefreshToken` document `revoked: true` and issue a brand new one,
  returning both new tokens. (Rotation means a stolen refresh token is
  only useful once before the legitimate client's next refresh
  invalidates it — a meaningful security property, worth the extra
  complexity here.)
- Respond `{ success: true, accessToken, refreshToken }`.

## New handler: `logout`
- Auth required. Body or a stored client-side value: `{ refreshToken }`.
- Find and mark that specific `RefreshToken` document `revoked: true`.
- Respond `{ success: true, message: 'Logged out' }`.
- (Optional but good practice: also add a `logoutAllSessions` handler that
  revokes every refresh token for `req.user.id` — useful after a password
  change, tying back into prompt 02.)

## Changes to `middleware/auth.js`
`isAuthenticatedUser` now verifies the **access token** specifically
(short expiry) — no structural change to the verification logic itself,
just confirm the expiry window is now the shorter one. When it expires,
the middleware should return a distinct, recognizable 401 error message
(e.g. `"Access token expired"` vs a generic `"Not authenticated"`) so the
frontend's interceptor (frontend prompt 08) can tell "needs a silent
refresh" apart from "actually logged out."

## Route wiring
- `POST /refresh-token` → `refreshAccessToken` — public
- `POST /logout` → `logout` — auth required

## Acceptance check
Login returns both tokens. Using the access token immediately works.
Manually expiring/waiting out the access token and then calling a
protected route with it fails with the specific "expired" message.
Calling `/refresh-token` with the refresh token issued at login succeeds
once, returns new tokens, and using the *original* refresh token a second
time fails (proving rotation works). `/logout` followed by a
`/refresh-token` attempt with that same refresh token fails.

# 02 — Add profile update + password change to `controllers/authController.js`

**Tier A. Depends on: nothing.**

## Purpose
There's currently no way for a logged-in user to update their own name,
avatar, or password. Add two handlers to the existing auth controller.

## Handler: `updateProfile`
- Auth required (any role).
- Accepts `name` and/or `avatar` (a Cloudinary URL string, already
  uploaded via the existing `/api/v1/upload` endpoint by the frontend
  before this call — this endpoint just saves the URL, it doesn't handle
  file upload itself) from `req.body`. Only update whichever of these two
  fields were actually provided — don't overwrite one with `undefined` if
  the client only sent the other.
- Never allow `email`, `role`, or `password` to be changed through this
  endpoint — those need their own dedicated, more careful flows (email
  changes arguably need re-verification, which is out of scope here;
  password has its own handler below).
- Save, respond `{ success: true, user }` (same shape the existing
  login/register responses use for the `user` object, so the frontend can
  reuse its existing "update stored user" logic).

## Handler: `changePassword`
- Auth required.
- Accepts `currentPassword` and `newPassword` from `req.body`. Both
  required — 400 error if either is missing.
- Load the user **with the password field included** (check how the
  existing login handler does this — the schema likely has `select: false`
  on `password`, so you need `.select('+password')` explicitly).
- Compare `currentPassword` against the stored hash using the same
  bcrypt comparison the login handler already uses. If it doesn't match,
  401 error ("Current password is incorrect").
- Validate `newPassword` meets whatever minimum the existing registration
  validation already enforces (check `models/User.js` for the existing
  `minlength` on password, match it here for consistency).
- Hash and save the new password using the same method the registration
  flow uses (don't reimplement hashing differently — reuse the existing
  pre-save hook if the schema has one, or the same manual bcrypt call if
  it doesn't).
- Respond `{ success: true, message: 'Password updated' }`. Don't return
  a new token — keep the existing session valid (or, if you want to be
  stricter, note in a comment that invalidating other sessions would need
  the refresh-token system from prompt 10, which isn't done yet at this
  point in the sequence).

## Route wiring (add to `routes/authRoutes.js`)
- `PUT /me` → `updateProfile` — auth required
- `PUT /me/password` → `changePassword` — auth required

## Acceptance check
Updating just `avatar` doesn't clear `name`, and vice versa. Attempting
`changePassword` with a wrong `currentPassword` fails with 401 and does
NOT change the stored password. A subsequent login with the new password
succeeds and the old one fails.

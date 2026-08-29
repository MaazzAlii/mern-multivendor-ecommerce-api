# 03 — Password reset flow

**Tier B. Depends on: 04 (mailer).**

## Purpose
A standard "forgot password" flow: user requests a reset link by email,
gets a time-limited token, uses it to set a new password.

## Model change: `models/User.js`
Add two fields (additive, don't touch anything else):
- `resetPasswordToken` — String, optional (stores a **hashed** version of
  the token, never the raw token — see below).
- `resetPasswordExpire` — Date, optional.

## Handler: `forgotPassword` (in `controllers/authController.js`)
- **Public** (no auth — the whole point is the user is locked out).
- Accepts `email` from `req.body`. Find the user; if not found, **still
  respond with a generic success message** (`{ success: true, message:
  "If that email is registered, a reset link has been sent." }`) — never
  reveal whether an email exists in the system, that's an account
  enumeration vulnerability.
- If found: generate a random token (`crypto.randomBytes(32).toString('hex')`).
  Hash it (`crypto.createHash('sha256').update(token).digest('hex')`) and
  store the **hash** in `resetPasswordToken`, with `resetPasswordExpire`
  set to 15 minutes from now. Save the user.
- Build a reset URL using the **raw** (unhashed) token:
  `${process.env.CLIENT_URL}/reset-password/${token}`.
- Call `sendEmail` (prompt 04) with a simple HTML body containing that
  link. Wrap in try/catch — if sending fails, clear the token fields you
  just set (so a broken email doesn't leave a valid-but-unusable pending
  reset) and respond with a 500 error; if it succeeds, respond with the
  same generic success message as above.

## Handler: `resetPassword`
- Public. Route param is the raw token: `req.params.token`. Body has
  `newPassword`.
- Hash the incoming token the same way (sha256) and look up
  `User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: {
  $gt: Date.now() } })`. If none found, 400 error ("Invalid or expired
  reset token").
- Set the new password (same hashing path as prompt 02's
  `changePassword`), clear both `resetPasswordToken` and
  `resetPasswordExpire`, save.
- Respond `{ success: true, message: 'Password has been reset' }`.

## Route wiring
- `POST /forgot-password` → `forgotPassword` — public
- `PUT /reset-password/:token` → `resetPassword` — public

## Acceptance check
Requesting a reset for a non-existent email returns the same generic
success message as a real one (no timing/response difference an attacker
could use to enumerate accounts). The reset link only works once — using
it a second time with the same token fails with "Invalid or expired." A
token older than 15 minutes fails.

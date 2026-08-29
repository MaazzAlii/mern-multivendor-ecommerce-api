# 05 — Email verification on signup

**Tier B. Depends on: 04 (mailer).**

## Purpose
Confirm a user actually controls the email they registered with. Not
strictly enforced everywhere (don't lock unverified users out of
browsing/buying — that's a product decision, not a security one) but
tracked, so the frontend can show a "verify your email" prompt.

## Model change: `models/User.js`
Add:
- `isEmailVerified` — Boolean, default `false`.
- `emailVerificationToken` — String, optional (hashed, same pattern as
  prompt 03's reset token).
- `emailVerificationExpire` — Date, optional.

## Changes to the existing `register` handler
After creating the user (but before or after issuing their login
token/session — either order is fine, don't block registration on email
sending succeeding):
1. Generate + hash a verification token, same pattern as prompt 03.
2. Store the hash + a 24-hour expiry on the user, save.
3. Send an email (via prompt 04's `sendEmail`) with a link like
   `${CLIENT_URL}/verify-email/${token}`. Wrap in try/catch — a failed
   verification email should not fail registration itself, just log the
   error.

## New handler: `verifyEmail`
- Public. Route param is the raw token.
- Hash it, look up `User.findOne({ emailVerificationToken: hashedToken,
  emailVerificationExpire: { $gt: Date.now() } })`. 400 error if not found.
- Set `isEmailVerified = true`, clear the token fields, save.
- Respond `{ success: true, message: 'Email verified' }`.

## New handler: `resendVerificationEmail`
- Auth required (the user must at least be logged in to request this,
  even if unverified).
- If already verified, 400 error ("Email is already verified").
- Otherwise repeat the token generation + send from the `register` flow.
- Respond `{ success: true, message: 'Verification email sent' }`.

## Route wiring
- `GET /verify-email/:token` → `verifyEmail` — public
- `POST /resend-verification` → `resendVerificationEmail` — auth required

## Acceptance check
A freshly registered user has `isEmailVerified: false`. Visiting the
verification link sets it to `true` and the link doesn't work a second
time. `resendVerificationEmail` on an already-verified account returns
the "already verified" error instead of sending a redundant email.

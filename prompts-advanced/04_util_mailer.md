# 04 — Create `utils/mailer.js`

**Tier B. Depends on: nothing (but 03, 05, and 16 depend on this).**

## Purpose
A single reusable function for sending transactional emails — password
reset, email verification, order status updates. Build this before
prompts `03`, `05`, and `16`, all of which call it.

## What to do
Use `nodemailer` with an SMTP transport (works with any provider — Gmail
app passwords, SendGrite, Mailgun, Resend's SMTP endpoint, etc. — don't
hardcode a specific provider, just read standard SMTP config from env
vars so the person deploying this can point it at whatever they have
access to).

Create a file exporting a single async function, e.g. `sendEmail({ to,
subject, html })`:
1. Create a transporter via `nodemailer.createTransport({ host:
   process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure:
   process.env.SMTP_PORT === '465', auth: { user: process.env.SMTP_USER,
   pass: process.env.SMTP_PASS } })`.
2. Call `.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER,
   to, subject, html })`.
3. Wrap the whole thing in a try/catch that **logs the error but does not
   throw** — a failed email should never crash or fail the request that
   triggered it (e.g. an order status update should still succeed even if
   the notification email bounces). Log clearly enough that a developer
   checking logs can tell an email failed and why.

Add to `.env.example` (prompt 19 will cover the full dependency list, but
add these env var names now):
```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Acceptance check
With real SMTP credentials set, calling `sendEmail({ to: 'test@example.com',
subject: 'Test', html: '<p>Hello</p>' })` actually delivers an email.
With no credentials set (or wrong ones), the call fails silently from the
caller's perspective (doesn't throw) but logs a clear error server-side.

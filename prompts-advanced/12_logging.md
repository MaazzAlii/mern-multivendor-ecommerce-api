# 12 — Structured logging

**Tier B. Depends on: nothing.**

## Purpose
Right now, the only visibility into what the server is doing is
`console.log`/default error output. Add structured request logging and a
proper logger for application-level events, so a real bug in production
is actually diagnosable instead of invisible.

## What to do
Install `morgan` (HTTP request logging) and `winston` (application
logging).

Create `utils/logger.js` exporting a configured `winston` logger:
- In development (`NODE_ENV !== 'production'`), log to the console with
  a readable, colorized format.
- In production, log to the console as structured JSON (so a hosting
  platform's log aggregator — Vercel's own logs, or wherever this ends up
  — can parse it), at `info` level and above.
- Export at least `logger.info`, `logger.warn`, `logger.error`.

In `app.js`, add `app.use(morgan(process.env.NODE_ENV === 'production' ?
'combined' : 'dev'))` early in the middleware stack, so every request is
logged with method/path/status/response time.

Update the existing global error-handling middleware (check
`middleware/error.js` or wherever errors are finally caught) to call
`logger.error(err.message, { stack: err.stack, path: req.path })` before
sending the error response — right now an unhandled error probably just
gets swallowed into a JSON response with no server-side trace.

Also add a couple of `logger.info(...)` calls at genuinely significant
business events, not everywhere — e.g. in the checkout handler when an
order is successfully created, and in the Stripe webhook handler when a
payment is confirmed. Don't log sensitive data (passwords, full card
details — Stripe already keeps those off your server, but don't log
tokens or password reset links either).

## Acceptance check
Every request produces one readable log line with method, path, status,
and timing. A deliberately triggered error (e.g. hit a route with a
malformed id causing a Mongoose cast error) produces a clear error log
entry with a stack trace, not just a bare JSON response with nothing on
the server side to debug from.

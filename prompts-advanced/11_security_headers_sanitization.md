# 11 — Security headers and input sanitization

**Tier B. Depends on: nothing.**

## Purpose
Add three commonly-expected security middleware layers that are currently
absent: security headers, NoSQL injection sanitization, and stored-XSS
protection on any free-text field a user controls (product descriptions,
reviews, chat messages).

## What to do
Install `helmet`, `express-mongo-sanitize`, `xss-clean` (if `xss-clean`
is unmaintained/incompatible with your Express version at install time,
substitute the actively-maintained `xss` package and apply it manually
to specific string fields in the relevant controllers instead of as
blanket middleware — note in a comment which approach you used and why).

In `app.js`, near the top of the middleware stack (after body parsing,
before route handlers):
1. `app.use(helmet())` — sets a batch of sensible security headers
   (disables `X-Powered-By`, sets `X-Content-Type-Options`, etc.) with
   its defaults; no custom config needed for an API-only backend.
2. `app.use(mongoSanitize())` — strips any request key starting with `$`
   or containing `.`, preventing NoSQL operator injection (e.g. someone
   sending `{ email: { "$ne": null } }` as a login body trying to bypass
   the query).
3. XSS protection on stored free text — apply to at minimum: product
   `description`, review `comment`, chat message `text`, shop `name`/
   `description` if those exist. Either via the `xss-clean` middleware
   globally, or by explicitly running each of those specific fields
   through `xss()` (from the `xss` package) right before saving, in
   their respective controllers — pick whichever approach you installed
   above and apply it consistently.

## Acceptance check
Submitting a review with `comment: "<script>alert(1)</script>"` results
in the stored/returned comment having the script tag neutralized (either
stripped or escaped, not raw executable HTML) when later rendered.
Attempting a login with a MongoDB operator injection payload as the email
field fails cleanly (treated as an invalid string, not interpreted as a
query operator) rather than returning unexpected results.

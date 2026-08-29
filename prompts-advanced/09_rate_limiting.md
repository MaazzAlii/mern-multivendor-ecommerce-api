# 09 — Rate limiting

**Tier B. Depends on: nothing.**

## Purpose
Nothing currently stops repeated hammering of login, registration, or
checkout endpoints — an easy brute-force or abuse vector. Add
`express-rate-limit`.

## What to do
Install `express-rate-limit`. Create `middleware/rateLimiters.js`
exporting a couple of pre-configured limiters (each is
`rateLimit({ windowMs, max, message, standardHeaders: true,
legacyHeaders: false })`):

- `authLimiter` — for login/register/password-reset-request: something
  like 10 requests per 15 minutes per IP. Message: "Too many attempts,
  please try again later."
- `generalApiLimiter` — a looser global limiter for everything else, e.g.
  200 requests per 15 minutes per IP, to catch obvious abuse/scraping
  without bothering normal usage.

Apply `authLimiter` specifically to `POST /login`, `POST /register`,
`POST /forgot-password` (once prompt 03 exists). Apply
`generalApiLimiter` globally in `app.js` (mounted early, before the route
handlers, but after the Stripe webhook's raw-body route if that's
positioned first — don't rate-limit Stripe's own webhook calls the same
way you'd rate-limit a browser, since Stripe retries failed webhooks and
you don't want to accidentally block legitimate retries. Exclude the
webhook path from the general limiter, or give it a much higher limit).

## Acceptance check
11 rapid login attempts from the same test client within 15 minutes — the
11th gets a 429 response with the configured message, not a normal
401/200. Normal browsing traffic (product listing, etc.) is unaffected
until it genuinely exceeds the general limiter's threshold.

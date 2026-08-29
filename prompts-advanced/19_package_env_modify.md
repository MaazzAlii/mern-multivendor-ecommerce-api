# 19 — Dependencies and environment variables

**Do incrementally, as you reach each prompt that needs a package — this
file is a consolidated reference, not a "do this all at once" step.**

## New dependencies by prompt
- Prompt 04 (mailer): `nodemailer`
- Prompt 08 (validation): `express-validator`
- Prompt 09 (rate limiting): `express-rate-limit`
- Prompt 10 (refresh tokens): no new package (uses built-in `crypto`,
  already-present `jsonwebtoken`)
- Prompt 11 (security): `helmet`, `express-mongo-sanitize`, and either
  `xss-clean` or `xss` (see that prompt's note on picking whichever is
  actively maintained at the time you do this)
- Prompt 12 (logging): `morgan`, `winston`
- Prompt 13 (testing): dev dependencies `jest`, `supertest`,
  `mongodb-memory-server`

Install each as you reach its prompt (`npm install <package>`), not all
up front — that way if a build breaks, you know exactly which addition
caused it.

## New environment variables (accumulate these in `.env.example` as you
implement each prompt, not all at once)

From prompt 04:
```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

From prompt 10:
```
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE_DAYS=7
```

## Acceptance check
At the end of implementing everything you chose to do from this set,
`npm install` completes clean, `npm test` (prompt 13) passes, and
`.env.example` accurately lists every environment variable the running
app actually reads — no undocumented required config.

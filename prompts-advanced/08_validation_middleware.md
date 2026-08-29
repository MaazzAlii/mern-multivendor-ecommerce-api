# 08 — Input validation middleware

**Tier B. Depends on: nothing, but touches most route files — do this in
one focused pass, not spread across unrelated work.**

## Purpose
Right now, request validation is whatever Mongoose schema validation
happens to catch at save time — which means bad input can get fairly deep
into a handler (e.g. a malformed email format only fails when `.save()`
runs, after other logic may have already executed). Add an explicit
validation layer at the route boundary using `express-validator`.

## What to do
Install `express-validator`. Create `middleware/validate.js` exporting a
small helper: a function that takes an array of `express-validator` chain
rules and returns an Express middleware that runs them, then checks
`validationResult(req)` — if there are errors, respond `400` with
`{ success: false, message: <first error's message> }` (matching the
existing error response shape) instead of calling `next()`.

Apply validation rules to at least these routes (add more if it's cheap
to do while you're already touching a given route file, but these are the
minimum — they're the ones most exposed to untrusted/malicious input):

- `POST /register` — `email` must be a valid email, `password` minimum
  length matching what's already enforced in the model, `name` non-empty,
  `role` must be one of the valid enum values.
- `POST /login` — `email` valid format, `password` non-empty.
- `POST /product/new` — `name`/`description`/`category` non-empty,
  `discountPrice`/`stock` are numbers and `>= 0`.
- `POST /checkout` — `items` is a non-empty array, `paymentMethod` is one
  of the two valid values, `shippingAddress` fields are non-empty strings.
- `POST /coupon/new` — `discountPercent` is a number between 1 and 100.
- `POST /product/:id/review` — `rating` is a number between 1 and 5.

## Acceptance check
`POST /register` with an obviously malformed email (`"not-an-email"`)
returns a 400 with a clear message, without ever reaching the database.
Valid requests continue to work exactly as before — this should be
invisible to well-formed traffic.

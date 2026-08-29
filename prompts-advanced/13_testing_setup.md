# 13 — Automated testing setup

**Tier B. Depends on: as much of the rest of Tier B as you've done so
far — write tests for what actually exists in the codebase at the point
you do this, don't write tests for prompts you haven't implemented yet.**

## Purpose
There are currently zero automated tests in this project. This is the
single biggest gap between "looks production-ready" and "is
production-ready" — add a real test suite, even a modest one, covering
the highest-value paths.

## Setup
Install `jest`, `supertest`, and `mongodb-memory-server` (a real in-memory
MongoDB instance for tests — much better than mocking Mongoose, since it
catches real schema/query bugs) as dev dependencies.

Create a `tests/` folder with:
- `tests/setup.js` — starts an in-memory MongoDB instance before the
  suite runs (`beforeAll`) and tears it down after (`afterAll`), with
  `mongoose.connect()` pointed at its connection string. Also clear all
  collections between individual tests (`afterEach`) so tests don't leak
  state into each other.
- A Jest config (in `package.json` or `jest.config.js`) pointing
  `setupFilesAfterEach`/`globalSetup` (whichever Jest hook fits) at this
  file, and a `"test": "jest --runInBand"` script in `package.json` (
  `--runInBand` avoids parallel workers stepping on the same in-memory DB
  instance unless you set up a separate instance per worker, which is
  more complexity than this needs).

## Minimum test coverage — write real tests for these, not placeholders
1. **Auth**: register succeeds and returns a token; register with a
   duplicate email fails; login with correct credentials succeeds; login
   with wrong password fails.
2. **Products**: creating a product as a seller with no shop yet fails
   with the expected error; creating one after shop creation succeeds;
   the public product list endpoint returns it.
3. **Checkout + coupon math** (this is the most important one to get
   right, given how sensitive the actual money logic is): seed a shop, a
   product, and a coupon; hit `/checkout` with `Cash On Delivery` and a
   valid coupon code; assert the resulting order's `discountAmount` and
   `totalPrice` match the expected hand-calculated values. Also test the
   coupon-doesn't-apply-to-this-shop rejection case, and the
   below-minimum-order rejection case.
4. **Auth middleware**: hitting any protected route with no token returns
   401; with a token for the wrong role (e.g. a buyer token on a
   seller-only route) returns 403.

Each test file should use `supertest(app)` to make real HTTP requests
against the Express app (import `app.js` directly, don't actually bind a
port for tests) and assert on status codes and response bodies.

## Acceptance check
`npm test` runs the whole suite against the in-memory database and passes.
Deliberately breaking something (e.g. temporarily changing the coupon
discount formula) causes the relevant test to fail — proving the tests
actually exercise the real logic, not just trivially pass regardless.

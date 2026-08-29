# 14 — Platform commission model

**Tier C. Depends on: nothing structurally, but touches checkout (prompt
16 of the original set) and the withdrawal balance calculation (original
`withdrawController.js`) — read both of those fully before starting, this
is not a quick add.**

## Purpose
Right now, sellers keep 100% of every sale — there's no revenue mechanism
for the marketplace itself. Add a configurable platform commission
percentage, deducted from what counts toward a seller's withdrawable
balance.

## Model: create `models/PlatformSettings.js`
A single-document collection (only ever one row) holding platform-wide
config:
- `commissionPercent` — Number, default e.g. `10` (10%).
- Add a static helper method or a plain exported function `getSettings()`
  that does `findOne()` and, if no document exists yet, creates one with
  defaults — so the rest of the codebase never has to handle "what if
  settings don't exist yet."

## Model change: `models/Order.js`
Add:
- `commissionAmount` — Number, default 0. The platform's cut of this
  order, computed at checkout time.
- `sellerEarnings` — Number, default 0. `totalPrice - commissionAmount -
  shippingPrice` (decide whether shipping counts toward the seller's
  earnings or the platform's — a reasonable default is shipping passes
  through to the seller untouched, commission only applies to
  `itemsPrice` after any coupon discount; document whichever choice you
  make in a comment, since this is a business decision, not a purely
  technical one).

## Changes to `checkout` (in `controllers/orderController.js`)
When creating each shop's `Order`, after the existing coupon-discount
logic (from the original prompt set's `16_controller_order_modify.md`)
has already adjusted `itemsPrice`/`discountAmount`:
- Fetch `PlatformSettings` via `getSettings()`.
- `commissionAmount = Math.round((group.itemsPrice - discountAmount) *
  (settings.commissionPercent / 100))`.
- `sellerEarnings = group.itemsPrice - discountAmount - commissionAmount`.
- Store both on the created order.

## Changes to withdrawal balance calculation (in
`controllers/withdrawController.js`)
Wherever "available balance" is currently computed by summing delivered
orders' `totalPrice`, change it to sum `sellerEarnings` instead —
`totalPrice` includes shipping and, pre-commission, the full item price;
what a seller can actually withdraw is their earnings net of commission.
Update both `createWithdrawRequest` and `getMyWithdrawals`.

## New admin endpoint: manage the commission rate
- `GET /admin/settings` → returns current `PlatformSettings` — admin only.
- `PUT /admin/settings` → updates `commissionPercent` (validate it's
  between 0 and 100) — admin only.

## Acceptance check
With commission set to 10%, an order with `itemsPrice` 1000 (no coupon)
results in `commissionAmount: 100`, `sellerEarnings: 900`. That seller's
available withdrawal balance, once the order is Delivered, reflects 900,
not 1000. Changing the commission rate via the admin endpoint affects
subsequent orders but does not retroactively change already-created
orders' stored `commissionAmount`.

# 06 — Order cancellation and return requests

**Tier A. Depends on: nothing.**

## Purpose
Buyers currently have no way to cancel an order or request a return —
only sellers can change order status. Add both, with sane guardrails.

## Model: create `models/Return.js`
- `order` — ObjectId ref `'Order'`, required.
- `buyer` — ObjectId ref `'User'`, required.
- `reason` — String, required.
- `status` — enum `['Requested', 'Approved', 'Rejected', 'Refunded']`,
  default `'Requested'`.
- `sellerNote` — String, default `''`.

Use `{ timestamps: true }`.

## Handler: `cancelOrder` (add to `controllers/orderController.js`)
- Auth required. Route param `req.params.id` (order id).
- Load the order; 404 if not found. **Ownership check**: `order.buyer`
  must equal `req.user.id`, or 403.
- Only allow cancellation while `order.status === 'Processing'` — once a
  seller has marked it `Shipped` or later, the buyer can no longer
  self-cancel (400 error explaining that a return should be requested
  instead once shipped).
- Set `order.status = 'Cancelled'`. If the order was already paid
  (`paymentInfo.status === 'Paid'`), do NOT automatically process a
  refund here — refunds require calling Stripe's refund API, which is a
  real financial operation; instead set a flag or leave a note that this
  needs manual admin handling (out of scope to fully automate here — note
  this clearly in a code comment).
- Restore stock: for each item in `order.items`, `$inc` the corresponding
  Product's `stock` back up by the cancelled quantity (mirror of what
  checkout decremented).
- Save, respond `{ success: true, order }`.

## Handler: `requestReturn` (new, in a new `controllers/returnController.js`
or added to `orderController.js` — match whichever existing file
organization makes more sense given how the codebase is structured by
this point)
- Auth required. Body: `{ orderId, reason }`.
- Load the order; 404 if not found; ownership check as above.
- Only allow when `order.status === 'Delivered'` (matches the same
  verified-purchase gating the review system already uses — check
  `controllers/productController.js`'s review handler for the pattern of
  confirming a delivered order).
- Create the `Return` document, respond `{ success: true, return }`.

## Handler: `getMyReturns` / `getShopReturns` / `getAllReturns`
Mirror the access-pattern style of the withdrawal controller (buyer's
own, seller's shop's, admin's all) — buyer sees their own return
requests, seller sees requests against their shop's orders, admin sees
everything.

## Handler: `updateReturnStatus`
- Seller or admin (check the order's shop matches the seller's shop, or
  allow admin regardless).
- Body: `{ status, sellerNote }`, `status` one of `Approved`, `Rejected`,
  `Refunded`.
- Update and save, respond `{ success: true, return }`.
- Note: `Refunded` status here is just a record-keeping state — like
  withdrawals, this doesn't itself move money. A real Stripe refund
  integration is a separate, larger task not covered here.

## Route wiring
- `PUT /order/:id/cancel` → `cancelOrder` — auth required
- `POST /return/new` → `requestReturn` — auth required
- `GET /returns/mine` → `getMyReturns` — auth required
- `GET /returns/shop` → `getShopReturns` — auth + seller
- `GET /admin/returns` → `getAllReturns` — auth + admin
- `PUT /return/:id` → `updateReturnStatus` — auth + seller or admin

## Acceptance check
An order in `Processing` can be cancelled by its buyer and stock is
restored. The same attempt on a `Shipped` order fails with a clear error.
A `Delivered` order can have a return requested; requesting one on a
non-delivered order fails.

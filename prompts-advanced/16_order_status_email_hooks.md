# 16 — Order status change email notifications

**Tier B. Depends on: 04 (mailer).**

## Purpose
Buyers currently get no email at all — not on order placement, not on
shipping, not on delivery. Wire the mailer (prompt 04) into the existing
order lifecycle at the points that matter.

## Where to add calls
In `controllers/orderController.js`:
1. **Order placed** — at the end of the `checkout` handler, after orders
   are successfully created (for Cash On Delivery — for Card payment,
   send this from the webhook handler instead, once payment is actually
   confirmed, not at checkout-session-creation time, since a Card order
   isn't real yet until the webhook fires).
2. **Payment confirmed** (Card only) — in the Stripe webhook handler,
   after marking orders `Paid`.

In wherever order status updates happen (the seller's "update order
status" handler):
3. **Order shipped** — when `status` transitions to `'Shipped'`.
4. **Order delivered** — when `status` transitions to `'Delivered'`.

Each of these calls `sendEmail` (prompt 04) with the buyer's email, a
clear subject (e.g. "Your order has shipped!"), and a short HTML body
including the order id, item names, and total. Keep the templates simple
— a few lines of inline HTML is fine, this doesn't need a templating
engine for this scope.

**Important**: every one of these calls must not block or fail the actual
request if the email fails — `sendEmail` (prompt 04) already swallows its
own errors internally, so just call it and don't `await` it inside a
try/catch that could affect the response (fire it and let it resolve in
the background, or await it but don't let its rejection propagate — since
prompt 04's `sendEmail` never rejects, either approach is safe as long as
you built prompt 04 as specified).

## Acceptance check
Placing a Cash On Delivery order sends one email. A Card order sends the
"confirmed" email only after the Stripe webhook fires, not at checkout
time (test with Stripe's test webhook triggering, not just hitting
checkout and assuming). Changing an order's status to Shipped, then later
to Delivered, sends two more distinct emails at the right moments.

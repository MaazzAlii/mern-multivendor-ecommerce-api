# 18 — Review moderation

**Tier A. Depends on: nothing.**

## Purpose
There's currently no way to deal with an abusive or spam review short of
directly editing the database. Give admins a hide/unhide toggle.

## Model change: check how reviews are stored on `models/Product.js`
(they're likely an embedded array on the product document, based on the
existing review-submission handler). Add a field to each review subdocument:
- `isHidden` — Boolean, default `false`.

## Handler: `toggleReviewVisibility` (add to `controllers/productController.js`)
- Admin only. Route params: `req.params.productId`, `req.params.reviewId`.
- Find the product; 404 if not found. Find the specific review within its
  `reviews` array by id; 404 if not found.
- Flip `isHidden` to the opposite of its current value (or accept an
  explicit `{ isHidden: true/false }` in the body if you'd rather be
  explicit than toggle — either is fine, document which you chose).
- Save, respond `{ success: true, review }`.

## Changes to the public product-fetch handler
Wherever a product (and its reviews) is returned to a **public/buyer**
request, filter out reviews where `isHidden === true` before sending the
response — hidden reviews should be invisible to normal browsing.
When an **admin** fetches a product (e.g. via an admin-specific route, if
one exists, or by checking `req.user?.role === 'admin'` if the same
handler serves both), include hidden reviews too, so admins can actually
see what they're moderating and toggle it back.

## Route wiring
- `PUT /admin/product/:productId/review/:reviewId/visibility` →
  `toggleReviewVisibility` — admin only

## Acceptance check
A hidden review doesn't appear in the normal public product-detail
response, but does appear (clearly marked as hidden) in an admin view,
and can be un-hidden again.

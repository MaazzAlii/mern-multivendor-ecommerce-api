# 17 — Related products endpoint

**Tier A. Depends on: nothing.**

## Purpose
Give the product detail page something to show under "You may also
like" — a simple, honest recommendation, not a real ML-driven engine
(that's out of scope for this project's size).

## Handler: `getRelatedProducts` (add to `controllers/productController.js`)
- Public. Route param `req.params.id` (the current product).
- Load the current product to get its `category` and `shop`.
- Query other products (`_id: { $ne: currentId }`) matching the same
  `category`, sorted by `ratings` descending, limited to 6.
- If fewer than 6 are found in the same category, top up the remainder
  with other products from the **same shop** (still excluding the current
  product and anything already included), so the section never looks
  sparse for a niche category.
- Respond `{ success: true, products }`.

## Route wiring
- `GET /product/:id/related` → `getRelatedProducts` — public

## Acceptance check
For a product that's the only one in its category from a shop with other
products, the response is topped up with that shop's other listings
rather than returning an empty or tiny array.

# 15 — Product variants

**Tier C. This is the largest single change in the whole advanced set —
it touches the Product model, the cart/checkout item shape, and every
place that currently reads `product.stock` or `product.discountPrice`
directly. Budget real time for this; don't attempt it as a quick add.**

## Purpose
Products currently have one price and one stock number. Real products
often need variants — e.g. a T-shirt in sizes S/M/L, each with its own
stock and optionally its own price.

## Model change: `models/Product.js`
Add an optional `variants` field:
```
variants: [
  {
    name: String,       // e.g. "Size" or "Color"
    options: [
      {
        label: String,   // e.g. "Medium" or "Red"
        priceModifier: { type: Number, default: 0 }, // added to discountPrice
        stock: { type: Number, default: 0 },
        sku: String,
      }
    ]
  }
]
```
Keep this **optional** — a product with an empty `variants` array behaves
exactly as it does today (single price/stock, unchanged). This is
additive, not a breaking migration; existing products without variants
must continue to work with zero changes to their stored data.

For a product WITH variants, `product.stock` (the top-level field) stops
being meaningful for purchase decisions — the real available stock is
per-option. Decide and document (in a comment) whether you keep the
top-level `stock` as a sum of all variant option stocks (auto-computed,
useful for quick display) or just ignore it for variant products — pick
one and be consistent everywhere you read it.

## Changes to checkout (`controllers/orderController.js`)
Cart items now need an optional `variantOptionSku` (or similar) alongside
`productId`/`quantity`. When present:
- Look up that specific variant option within the product's `variants`
  array (not just the product itself).
- Use `product.discountPrice + option.priceModifier` as the line price.
- Validate/decrement `option.stock`, not the top-level `product.stock`.
- Store which variant was purchased on the `Order.items` entry (add a
  `variantLabel` string field there so order history/seller order views
  can show "Size: Medium" rather than just the bare product name).

When absent (a non-variant product, or a variant product where the buyer
is being allowed to add without specifying — decide whether to require a
selection for variant products; the safer choice is to reject checkout
for a variant product with no `variantOptionSku` specified, 400 error
"Please select a variant").

## Changes to the seller product create/update handlers
Accept an optional `variants` array in the create/update payload, same
shape as the schema above. No other change needed there — sellers who
don't send `variants` continue creating simple products exactly as
before.

## Acceptance check
An existing product created before this change (no `variants` field)
still adds to cart and checks out exactly as it did before this prompt —
zero regression. A new product created with two size variants, each with
different stock, correctly decrements only the selected size's stock at
checkout and rejects checkout if that specific size is out of stock even
while other sizes still have stock.

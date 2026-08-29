# 01 — Modify `controllers/productController.js`: pagination, sorting, filtering

**Tier A. Depends on: nothing.**

## Purpose
`GET /api/v1/products` currently returns every matching product with no
limit. Add pagination, sorting, and a price-range filter, on top of the
existing keyword/category filtering — don't remove or change those.

## Changes
Accept these additional optional query params on the existing product
list handler:
- `page` — default 1
- `limit` — default 12, cap at 50 (don't let a client request 10,000 at once)
- `sort` — one of `newest` (default, `-createdAt`), `price_asc`
  (`discountPrice` ascending), `price_desc` (`discountPrice` descending),
  `rating` (`-ratings`)
- `minPrice`, `maxPrice` — optional numbers, filter `discountPrice`
  between them (inclusive) when present

Apply `.skip((page - 1) * limit).limit(limit)` and the appropriate
`.sort(...)` to the existing query. Also run a separate `.countDocuments()`
with the same filter (minus skip/limit) to get the total count.

Response shape — extend the existing `{ success: true, products }` to:
```
{ success: true, products, page, totalPages, totalCount }
```
where `totalPages = Math.ceil(totalCount / limit)`.

## Acceptance check
`GET /api/v1/products?page=2&limit=5&sort=price_asc` returns at most 5
products, sorted ascending by price, and correct `page`/`totalPages`/
`totalCount` values that match manually counting matching documents.

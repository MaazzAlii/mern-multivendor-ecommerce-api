# 07 — Seller analytics endpoint

**Tier A. Depends on: nothing.**

## Purpose
The seller dashboard currently shows one revenue number. Add a real
analytics endpoint: revenue over time and top-selling products, using
MongoDB aggregation.

## Handler: `getShopAnalytics` (add to `controllers/orderController.js`,
or a new `controllers/analyticsController.js` if that reads more cleanly
given the codebase's size by this point — your call, just be consistent)

- Seller-only. Find the seller's shop; 404 if none.
- Accept an optional `days` query param (default 30) — the reporting
  window.
- **Revenue-over-time series**: aggregate `Order` documents for this shop
  where `createdAt >= now - days` and `status !== 'Cancelled'`, grouped by
  calendar day (`$dateToString: { format: '%Y-%m-%d', date: '$createdAt'
  }`), summing `totalPrice` and counting orders per day. Return as an
  array sorted by date ascending, e.g.:
  `[{ date: '2026-08-01', revenue: 4200, orders: 3 }, ...]`. Days with
  zero orders don't need an entry (don't bother filling gaps — that's a
  frontend concern if it wants a continuous line).
- **Top products**: aggregate the same window's orders, `$unwind` the
  `items` array, group by `product` (or by `name` if that's simpler given
  how items are stored), sum `quantity` and `price * quantity`, sort by
  total quantity descending, limit to top 5. Return e.g.
  `[{ name: 'Wireless Mouse', unitsSold: 42, revenue: 12600 }, ...]`.
- **Order status breakdown**: count orders in this window grouped by
  `status`, e.g. `{ Processing: 3, Shipped: 5, Delivered: 40, Cancelled: 2 }`.

Respond:
```
{ success: true, revenueOverTime, topProducts, statusBreakdown }
```

## Route wiring
- `GET /analytics/shop` → `getShopAnalytics` — auth + seller only

## Acceptance check
With a handful of test orders spread across a few different days and
products, the three pieces of the response match a manual count/sum you
do by hand against the same seeded data.

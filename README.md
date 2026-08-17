# Multi-Vendor E-commerce API

A multi-vendor e-commerce backend — **buyers, sellers, and admins**, with shops, products, cart checkout that automatically splits across vendors, real Stripe payments (or Cash on Delivery), and verified-purchase reviews. Built with Express, MongoDB/Mongoose, JWT auth, and a clean MVC architecture.

## A note on scope and what's actually verified

The reference tutorial for this project (Becodemy Multi-Vendor E-commerce) also includes Cloudinary image uploads, real-time buyer↔seller chat (Socket.io), seller payout/withdrawal requests, and a coupon code system. **None of those are required by this assignment's acceptance criteria** (multi-vendor auth, working payment integration, product/order lifecycle, case study), so they're deliberately left out — building untestable extras would mean shipping code I can't actually verify works.

**What I could fully verify myself, with automated tests:**
- Every route's access control (public vs. buyer vs. seller vs. admin) — 19 automated checks, including two real route-ordering bugs I caught and fixed (`/shop/mine` and `/product/new` were initially being swallowed by the `/shop/:id` and `/product/:id` dynamic routes, since Express matches `:id` against literally any path segment including words like "mine" or "new" — fixed by registering static routes first)
- The vendor-splitting and pricing math — 7 automated checks confirming a cart spanning multiple shops splits into the correct per-shop orders, stock/not-found validation works, and critically, that **the sum of per-shop order totals exactly matches what the combined Stripe session would charge** (a mismatch there would mean money doesn't add up)

**What I could not verify myself:** actually completing a live Stripe payment. This sandbox has no network access to `stripe.com`, so while the integration code follows Stripe's documented Checkout Session + webhook pattern exactly, **you need to add your own Stripe test-mode keys and run one real test checkout** to confirm the payment path works end-to-end. Steps below make this as close to copy-paste as possible.

## Acceptance Criteria

- ✅ **Multi-vendor auth flow (buyer, seller, admin)** — one `User` model, `role` enum, JWT + `authorizeRoles` middleware
- ✅ **Payment integration** — Stripe Checkout (hosted page, redirect-based — no frontend Stripe SDK needed) + Cash on Delivery as a fallback; webhook confirms payment and releases stock only once paid
- ✅ **Product and order lifecycle fully implemented** — sellers create/manage products under their shop; checkout splits a multi-shop cart into one order per shop; sellers advance order status (`Processing → Shipped → Delivered`, or `Cancelled`); buyers leave reviews only on delivered orders (verified purchase)
- ✅ **Case study document** — see the paired case study doc

## Tech Stack

Express 4, Mongoose 8, jsonwebtoken, bcryptjs, cors, dotenv, **stripe**.

## Data Model (4 core collections)

- **User** — `role: buyer | seller | admin`, optional `shop` ref (once a seller creates one), embedded `addresses`
- **Shop** — one per seller (`owner` is unique), name/description/logo
- **Product** — belongs to a `Shop`, embedded `reviews` array (verified-purchase only)
- **Order** — **one document per shop per checkout**, all sharing a `checkoutGroupId` so a single multi-vendor cart shows up as one logical purchase to the buyer while each seller only ever sees their own slice

## How Checkout & Payment Works

1. `POST /api/v1/checkout` with cart items (from any number of shops) + shipping address + `paymentMethod`.
2. Backend groups items by shop, validates stock, computes per-shop `itemsPrice + shipping = totalPrice`, and creates one `Order` per shop sharing a `checkoutGroupId`.
3. **Cash On Delivery**: orders are created immediately, stock is decremented right away, `paymentInfo.status` stays `"Not Paid"` until the seller marks the order `Delivered` (at which point COD is assumed collected and flips to `"Paid"`).
4. **Card**: a single Stripe Checkout Session is created covering every shop's items (with a separate shipping line per shop, matching each order's `shippingPrice`), and the buyer is redirected to Stripe's hosted payment page. Stock is **not yet** decremented.
5. On successful payment, Stripe calls `POST /api/v1/webhook/stripe`. The handler verifies the signature, finds every order sharing that `checkoutGroupId`, marks them paid, and **only then** decrements stock — so abandoned checkouts never falsely reduce inventory.

## Setup

```bash
git clone <your-repo-url>
cd multivendor-ecommerce-api
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, and Stripe keys (see below)
npm run dev
```

Runs on `http://localhost:7000` by default.

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Local port (default 7000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random secret for signing JWTs |
| `JWT_EXPIRE` | Token lifetime, e.g. `7d` |
| `NODE_ENV` | `development` or `production` |
| `STRIPE_SECRET_KEY` | From [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) — use the **test mode** secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | See "Setting up the Stripe webhook" below |
| `CLIENT_URL` | Your frontend's URL, used for Stripe's success/cancel redirect |

## Setting Up Stripe (required to actually test payments)

1. Create a free [Stripe account](https://dashboard.stripe.com/register) if you don't have one — no business verification needed for test mode.
2. Go to **Developers → API keys**, copy the **test mode** Secret key into `STRIPE_SECRET_KEY`.
3. For the webhook (choose one):
   - **Local testing**: install the [Stripe CLI](https://stripe.com/docs/stripe-cli), run `stripe listen --forward-to localhost:7000/api/v1/webhook/stripe`. It prints a `whsec_...` value — put that in `STRIPE_WEBHOOK_SECRET`.
   - **Deployed on Vercel**: in Stripe Dashboard → Developers → Webhooks → Add endpoint → URL = `https://your-backend.vercel.app/api/v1/webhook/stripe`, event to listen for: `checkout.session.completed`. Stripe shows you the signing secret — put that in `STRIPE_WEBHOOK_SECRET` (as a Vercel env var, then redeploy).
4. Test a real checkout with Stripe's [test card](https://stripe.com/docs/testing): card number `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP. This is a real Stripe test-mode transaction — it will actually complete the flow above (order created → redirected to Stripe → webhook fires → order marked paid → stock decremented), just with fake money.

## Routes

All routes are prefixed with `/api/v1`.

### Auth

| Method | Route | Access |
|---|---|---|
| POST | `/register` | Public — `{ name, email, password, role? }` (`role` is `"buyer"` or `"seller"`) |
| POST | `/login` | Public |
| GET | `/me` | Private |
| POST | `/me/address` | Private — add a shipping address |

### Shops

| Method | Route | Access |
|---|---|---|
| GET | `/shops` | Public |
| GET | `/shop/:id` | Public — shop + its products |
| POST | `/shop/new` | Seller — one shop per seller |
| GET / PUT | `/shop/mine` | Seller |

### Products

| Method | Route | Access |
|---|---|---|
| GET | `/products` | Public — `?keyword=`, `?category=`, `?shop=` |
| GET | `/products/mine` | Seller |
| GET | `/product/:id` | Public |
| POST | `/product/new` | Seller |
| PUT / DELETE | `/product/:id` | Seller (owner's shop only) |
| POST | `/product/:id/review` | Buyer — only if you have a **Delivered** order containing this product |

### Checkout & Orders

| Method | Route | Access |
|---|---|---|
| POST | `/checkout` | Buyer — `{ items: [{productId, quantity}], shippingAddress, paymentMethod }` |
| POST | `/webhook/stripe` | Stripe only (signature-verified) |
| GET | `/orders/group/:checkoutGroupId` | Buyer — all orders from one checkout |
| GET | `/orders/me` | Buyer |
| GET | `/orders/shop` | Seller — this shop's orders + revenue |
| PUT | `/order/:id/status` | Seller (owner's shop only) |

### Admin

| Method | Route |
|---|---|
| GET | `/admin/stats` |
| GET | `/admin/users` · DELETE `/admin/user/:id` |
| GET | `/admin/shops` · DELETE `/admin/shop/:id` |
| GET | `/admin/products` |
| GET | `/admin/orders` |

## Becoming a Seller / Admin

Register with `"role": "seller"` to get seller access, then `POST /shop/new` to create your storefront before adding products. There's no public admin-signup by design — promote a user manually via MongoDB Atlas.

## Deployment (Vercel)

Pre-configured with `vercel.json` + `api/index.js`.

1. Push to GitHub.
2. Vercel → New Project → import the repo.
3. Add all env vars from `.env.example`, including the Stripe ones.
4. Deploy, then set up the Stripe webhook pointing at the deployed URL (see above) — **this requires a redeploy after adding `STRIPE_WEBHOOK_SECRET`**, since Vercel doesn't apply new env vars to an already-built deployment.
5. Use a MongoDB Atlas cluster with network access allowed from anywhere (`0.0.0.0/0`), set to **never expire**.

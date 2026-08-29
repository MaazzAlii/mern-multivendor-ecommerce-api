# 00 — OVERVIEW (read this first, in full)

## Read this before you read anything else

If you have a deadline in the next day or two: **stop here, don't start
this set.** What you already built (the `prompts/` set — coupons, flash
sales, wishlist, withdrawals, image upload, real-time chat) is a complete,
solid revision on its own. This folder is "phase 2" — the difference
between "a strong bootcamp project" and "something closer to a real
product." None of it is needed to pass your current review. Submit first.

When you do come back to this (after grading, over a longer stretch of
time, not under deadline pressure), read on.

## What this set is

Unlike the first `prompts/` set, this one is intentionally **tiered** —
not everything here is equally important, and some items depend on others.
Three tiers:

**Tier A — polish a careful reviewer would notice** (do these first, each
is small and mostly independent):
`01, 02, 06, 07, 17, 18`

**Tier B — production hardening** (do these together, several depend on
`04`'s mailer utility and touch shared middleware, so do this tier as a
block rather than interleaved with Tier C):
`03, 04, 05, 08, 09, 10, 11, 12, 13, 16`

**Tier C — bigger structural/business changes** (each is a real project on
its own — expect these to take a full day+ each, not an hour):
`14, 15`

`19` (dependencies) should be done incrementally as you hit each prompt
that needs a new package — don't try to install everything up front.

## Conventions — same as the first prompt set
Match existing patterns: `catchAsyncErrors`, `ErrorHandler`,
`isAuthenticatedUser`/`authorizeRoles` from `middleware/auth.js`, one
router file per resource mounted under `/api/v1` in `app.js`, Mongoose
models with `{ timestamps: true }`, `res.json({ success: true, ... })`
response shape. Also now check `models/Coupon.js`, `models/Event.js`, etc.
(built in the first prompt set) as additional style references, not just
the original pre-existing files.

## Order within a tier
Prompts within the same tier don't have to be done in strict numeric
order unless a prompt explicitly says it depends on another (e.g. `03`
depends on `04`, `16` depends on `04`). Do NOT skip a tier's dependency
prompt just because the number is higher — read each prompt's "Depends
on" line before starting it.

## Verification discipline
Same as before: after each prompt, confirm the server still boots
(`node -e "require('./app.js')"`) before moving on. For Tier B especially,
also re-run through a full login → browse → checkout flow manually after
each prompt — this tier touches shared middleware that every request
passes through, so a mistake here breaks everything, not just one feature.

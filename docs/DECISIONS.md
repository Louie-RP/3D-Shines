# Architecture & Product Decisions (ADR-lite)

Repo: `Louie-RP/3D-Shines`
Owner: Luis
Last updated: 2026-05-19

---

## Decision 001 — Host the storefront as a static site on GitHub Pages
**Status:** Accepted
**Why:** Simple, free hosting for a small business site. Fast deploys. Minimal ops.
**Consequences:**
- No server code can run on GitHub Pages.
- Any secure operations (Stripe secret usage, webhooks) must live in a serverless backend.

---

## Decision 002 — Use Cloudflare Workers as the backend
**Status:** Accepted
**Why:** Fits existing familiarity, serverless, easy secret management, good performance.
**Consequences:**
- All backend functionality is via HTTP endpoints (Worker routes).
- CORS must be configured properly for the GitHub Pages origin.

---

## Decision 003 — Stripe Dashboard is the source of truth for products/prices
**Status:** Accepted
**Why:** Seller can manage catalog without code changes. Stripe handles price integrity.
**Consequences:**
- Frontend will not hardcode product arrays for real pricing.
- Frontend loads catalog via `GET /products` from the Worker.
- Checkout uses Stripe `priceId` values only.

---

## Decision 004 — Use Stripe Checkout Sessions for payments
**Status:** Accepted
**Why:** Secure, fast to implement, supports Apple Pay/Google Pay/cards via Stripe.
**Consequences:**
- No customer account/login required.
- PayPal/Venmo are out-of-scope for v1 (Stripe Checkout does not provide them).

---

## Decision 005 — Use a dedicated cart page + localStorage cart
**Status:** Accepted
**Why:** Simpler UX than a modal-only cart; persistent cart without accounts.
**Consequences:**
- Cart is client-side state; clearing browser storage clears cart.
- Cart contents must use Stripe-backed `priceId` data, not client-provided prices.

---

## Decision 006 — Store completed orders in Cloudflare D1 via Stripe webhooks
**Status:** Accepted
**Why:** Consistent workflow as the business grows; durable order list; avoids relying on logs.
**Consequences:**
- Must implement webhook signature verification.
- Must implement idempotent writes (Stripe retries webhooks).
- D1 becomes the internal “order ledger” (Stripe remains payment source of truth).

---

## Decision 007 — Keep v1 product catalog as a simple list
**Status:** Accepted
**Why:** Small catalog now; avoid overbuilding categories/filters.
**Consequences:**
- No category UI, featured UI, or complex sorting in v1.
- Enhancements can be added later using Stripe metadata if needed.

---

## Decision 008 — No inventory tracking in v1
**Status:** Accepted
**Why:** Premade items but small scale; avoid complexity.
**Consequences:**
- “Sold out” behavior is not implemented.
- Seller manages availability by disabling products/prices in Stripe if needed.

---

## Decision 009 — No admin dashboard in v1
**Status:** Accepted
**Why:** Keep launch focused; seller can fulfill using Stripe for now.
**Consequences:**
- Orders stored in D1 but not exposed in UI.
- Future: add a protected orders page if needed.

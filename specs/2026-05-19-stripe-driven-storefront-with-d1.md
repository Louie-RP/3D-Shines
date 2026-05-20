# Spec: Stripe-Driven Storefront (Stripe Catalog API + Cart Page + Checkout + Webhooks + D1 Orders)
Date: 2026-05-19
Owner: Luis
Status: Draft

Repo: `Louie-RP/3D-Shines`

---

## 1) Outcomes & Objectives

**Business outcome**
- Launch a static storefront for premade 3D printed items where customers can browse products, add to cart, and checkout securely using Stripe.
- Enable the seller (your friend) to add/update products in **Stripe Dashboard** without needing code changes or GitHub commits.
- Persist paid orders automatically in a durable store (Cloudflare D1) so the seller’s workflow stays consistent as the business grows.

**Success definition (must be measurable)**
- [ ] Products displayed on `products.html` are driven by Stripe Dashboard data (not a hardcoded JS array).
- [ ] A customer can add multiple items (with quantities) to a cart and view/manage them on a dedicated `cart.html` page.
- [ ] Clicking “Checkout” from `cart.html` creates a Stripe Checkout Session via Cloudflare Worker and redirects to Stripe Checkout successfully.
- [ ] Stripe webhooks are verified and `checkout.session.completed` events are processed reliably.
- [ ] Each completed checkout is stored in Cloudflare D1 without duplicates (idempotent).
- [ ] Frontend contains **no secrets** and cannot modify pricing (Stripe price IDs are the source of truth).

---

## 2) Scope & Boundaries

### In Scope
- Static frontend hosted on GitHub Pages.
- Dedicated cart page (`cart.html`) with:
  - line items, quantities, remove item, clear cart
  - subtotal/total calculation
  - persistent cart storage using `localStorage`
- Cloudflare Worker backend with:
  - `GET /products` (Stripe-backed catalog API)
  - `POST /create-checkout-session` (Stripe Checkout Session creation)
  - `POST /webhook` (Stripe webhook receiver + signature verification)
- Stripe Dashboard-managed products and prices:
  - Only active products + active prices appear on site
  - Product image(s) and description shown if provided
- Cloudflare D1 order storage:
  - Store paid orders on webhook `checkout.session.completed`
  - Idempotent writes (no duplicates on retries)

### Out of Scope (explicit)
- PayPal / Venmo checkout options (Stripe Checkout does not provide them)
- Customer accounts/login
- Inventory tracking (stock counts) and “sold out” logic
- Discount codes, gift cards, subscriptions
- Advanced shipping rate calculations (carrier APIs), tax automation, returns/refunds automation
- Admin dashboard for orders (viewing/editing orders in a UI)

### Non-goals (not this iteration)
- CMS integration
- Product search/filter UI beyond a simple list

---

## 3) Users & Flows

### Primary user story (customer)
- As a customer, I want to browse premade items, add them to a cart, and checkout quickly without creating an account.

### Primary user story (seller)
- As the seller, I want to add/edit/disable products in Stripe Dashboard and have them appear/update on the website without developer help.
- As the seller, I want paid orders automatically captured so I can later use a stable “orders list” workflow without changing tools.

### Flow summary (customer)
1. User visits `products.html`.
2. Frontend loads products from `GET /products`.
3. User clicks “Add to cart” on product card.
4. Cart is saved to `localStorage` and cart count updates.
5. User opens `cart.html`.
6. User edits quantities / removes items.
7. User clicks “Checkout”.
8. Frontend calls `POST /create-checkout-session`.
9. Worker returns a Stripe Checkout URL.
10. Frontend redirects user to Stripe Checkout.
11. On payment completion, user is redirected to `success.html`.

### Flow summary (seller)
1. Seller creates/updates products/prices in Stripe Dashboard.
2. Refreshing the site shows the updated catalog (from Worker `GET /products`).
3. Stripe sends webhook on successful payment.
4. Worker verifies signature and writes a record into D1 (`orders` table).

---

## 4) Architectural Constraints (Non-negotiables)

### Hosting
- Frontend: GitHub Pages static site
- Backend: Cloudflare Worker (Wrangler-managed)
- Orders DB: Cloudflare D1

### Security
- [ ] Stripe secret key stored only in Cloudflare Worker secrets.
- [ ] Webhook signature verification required for `/webhook`.
- [ ] CORS restricted to the production GitHub Pages origin (and optional localhost for development).
- [ ] Checkout creation must use **Stripe Price IDs** to prevent price tampering.

### Data & State
- Cart stored client-side using `localStorage`.
- No customer accounts.
- Order source of truth remains Stripe; D1 stores a durable copy to support future workflows.

### Dependencies
- Frontend: vanilla JS only (no new frameworks required).
- Backend: Worker uses Stripe REST API (no heavy external dependencies required).

### Performance
- `GET /products` should be cached (target: 60–300 seconds) to reduce Stripe API calls and improve load time.

---

## 5) APIs / Interfaces

### 5.1 `GET /products`
**Purpose:** Provide the product catalog from Stripe to the static frontend.

**Response shape**
```json
{
  "products": [
    {
      "productId": "prod_...",
      "name": "3D Printed Item Name",
      "description": "Optional description",
      "image": "https://...",
      "priceId": "price_...",
      "unitAmount": 1200,
      "currency": "usd"
    }
  ],
  "generatedAt": "2026-05-19T00:00:00Z"
}
```

**Rules**
- Only include Stripe products where:
  - product is `active=true`
  - there exists at least one active one-time price (`type=one_time`, `active=true`)
- If multiple active prices exist for a product:
  - pick the “default” based on metadata `default_price=true` if present, else lowest unit amount, else first returned.
- Keep v1 as a simple list (no categories/featured sorting UI).

**Caching**
- Worker returns caching headers and/or uses Cloudflare cache to reduce Stripe calls.

**Errors**
- `500` if Stripe API fails, with a generic message (no secrets).

---

### 5.2 `POST /create-checkout-session`
**Purpose:** Create a Stripe Checkout Session based on the cart.

**Request**
```json
{
  "items": [
    { "priceId": "price_XXXX", "quantity": 1 }
  ]
}
```

**Response**
```json
{ "url": "https://checkout.stripe.com/..." }
```

**Validation rules**
- Items length: `1..20`
- Quantity per item: `1..10`
- `priceId` must be valid:
  - Validate each `priceId` is present in the current Stripe-backed catalog **OR**
  - Fetch the Price from Stripe and verify it is `active=true` and `type=one_time`.
- Reject unknown/invalid `priceId` with `400`.

**Checkout configuration**
- mode: `payment`
- success_url: `.../success.html?session_id={CHECKOUT_SESSION_ID}`
- cancel_url: `.../cart.html`
- shipping_address_collection allowed countries: `US` (expand later)

**Errors**
- `400` invalid payload or invalid priceId/quantity
- `500` Stripe API error (return generic error)

---

### 5.3 `POST /webhook`
**Purpose:** Verify Stripe webhooks and persist completed orders to D1.

**Must handle**
- `checkout.session.completed`

**Verification rules**
- Verify `Stripe-Signature` using webhook signing secret.
- Use raw request body (`request.text()` before JSON parse).
- Return `200` quickly after successful processing.

**Persistence rules**
- On `checkout.session.completed`, upsert order record to D1 (idempotent).
- Use `session_id` as primary key.

**Errors**
- `400` missing/invalid signature
- `400` invalid JSON body
- `500` unexpected internal error (should be rare)

---

## 6) D1 Order Storage

### Goals
- Persist each paid order at webhook time.
- Prevent duplicates when Stripe retries webhooks.

### Table: `orders`
Fields (minimum v1)
- `session_id` TEXT PRIMARY KEY
- `created_at` TEXT (ISO timestamp)
- `payment_intent_id` TEXT
- `customer_email` TEXT
- `amount_total` INTEGER
- `currency` TEXT
- `shipping_name` TEXT
- `shipping_address_json` TEXT
- `status` TEXT (default `paid`)
- `raw_event_id` TEXT (Stripe event id for audit/debug)

### Idempotency
- Use `session_id` as primary key.
- Use `INSERT ... ON CONFLICT(session_id) DO UPDATE ...` (or equivalent) so webhook retries don’t duplicate.

### Schema (SQL)
Create file: `worker/schema.sql`
```sql
CREATE TABLE IF NOT EXISTS orders (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_email TEXT,
  amount_total INTEGER,
  currency TEXT,
  shipping_name TEXT,
  shipping_address_json TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  raw_event_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
```

---

## 7) Frontend UI Requirements

### Pages
- `products.html`
  - shows products grid
  - each product card includes: image, name, price, “Add to cart”
  - global cart indicator (count)
- `cart.html`
  - list of cart items:
    - image, name, unit price, quantity (editable), line total
    - remove button
  - subtotal + total
  - “Checkout” button
  - “Clear cart” button
- `success.html`
  - simple confirmation page
- Optional `cancel.html` (can reuse `cart.html`)

### Cart data model (localStorage)
Key: `cart`
Value example:
```json
{
  "items": [
    {
      "priceId": "price_...",
      "productId": "prod_...",
      "name": "Item name",
      "image": "https://...",
      "unitAmount": 1200,
      "currency": "usd",
      "quantity": 2
    }
  ]
}
```

**Rules**
- Adding the same `priceId` increments quantity.
- Quantity changes update totals instantly.
- Cart persists across refresh.

---

## 8) Implementation Plan (Step-by-step)

### Step 1: Add spec + folder structure
- Add `/specs/` folder.
- Save this spec as: `/specs/2026-05-19-stripe-driven-storefront-with-d1.md`.

### Step 2: Add new pages
- Add files at repo root:
  - `cart.html`
  - `success.html`
  - (optional) `cancel.html`
- Update nav links in `index.html` and `products.html` to include Cart.

### Step 3: Refactor frontend JS to support a real cart
- Modify `script.js`:
  - Replace “demo cart count only” logic with real cart state in `localStorage`.
  - Implement:
    - `getCart()`, `saveCart(cart)`, `addToCart(product)`, `removeFromCart(priceId)`,
      `updateQuantity(priceId, qty)`, `clearCart()`
    - `renderCartCount()` used on all pages
- Create `cart.js` (recommended) OR keep in `script.js` but ensure `cart.html` loads required code.

### Step 4: Replace hardcoded products with Stripe-backed catalog API
- Modify `script.js` (or add `products.js`) to:
  - Fetch `GET /products` from Worker on page load
  - Render product cards from returned JSON
  - Each “Add to cart” uses returned `priceId` and `unitAmount`
- Remove/disable old hardcoded products list (or keep as an explicitly disabled fallback).

### Step 5: Add Cloudflare Worker project
- Add `/worker/` directory with:
  - `worker/src/worker.js`
  - `worker/wrangler.toml`
  - `worker/schema.sql` (D1 schema)
- Implement endpoints:
  - `GET /products`
  - `POST /create-checkout-session`
  - `POST /webhook`
- Configure strict CORS for GitHub Pages origin.

### Step 6: Create D1 database + bind to Worker
- Create D1 DB (example name): `3dshines-orders`
- Apply `schema.sql`
- Bind D1 database to Worker as `DB` in `wrangler.toml`.

### Step 7: Stripe setup + secrets
- In Stripe Dashboard:
  - Create products/prices
  - Configure webhook endpoint: `https://<worker-domain>/webhook`
  - Subscribe to `checkout.session.completed`
- In Cloudflare:
  - Set Worker secrets:
    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`

### Step 8: End-to-end testing (Stripe test mode)
- Verify catalog loads.
- Add to cart → go to cart page → checkout redirect.
- Complete payment with Stripe test card.
- Confirm:
  - redirect to `success.html`
  - webhook writes a row to D1.

### Step 9: Production readiness
- Switch to live keys only after passing all verification criteria.
- Confirm CORS origin matches production domain exactly.
- Confirm caching enabled for `/products`.

---

## 9) Verification Criteria (Must-pass)

### Manual test cases
- [ ] Product catalog loads from Stripe-backed API
  - Steps: open `products.html`
  - Expected: products appear even if JS hardcoded list is removed.
- [ ] Seller adds a product in Stripe → it appears on site
  - Steps: create active product + active one-time price → refresh `products.html`
  - Expected: new product appears without code changes.
- [ ] Cart behavior works
  - Steps: add 2 different items, adjust quantity, remove one
  - Expected: totals update correctly and persist after refresh.
- [ ] Checkout session creation works
  - Steps: from `cart.html`, click Checkout
  - Expected: redirect to Stripe Checkout page.
- [ ] Successful payment works
  - Steps: complete payment in Stripe test mode
  - Expected: redirected to `success.html`.
- [ ] Webhook verification works
  - Steps: complete payment
  - Expected: Worker processes `checkout.session.completed`.
- [ ] D1 order stored (idempotent)
  - Steps: complete payment; (optional) replay webhook event
  - Expected: one row exists in `orders` for the `session_id`; no duplicates.
- [ ] Price tampering blocked
  - Steps: modify request to send a priceId not in the valid Stripe-backed catalog
  - Expected: Worker returns 400 and does not create session.

### Observability / logs
- [ ] Worker logs include session id + customer email for completed checkouts.

---

## 10) Rollout Plan
1. Implement Worker + frontend in development/test mode.
2. Deploy Worker to staging domain/subdomain if possible.
3. Verify all must-pass items in Stripe test mode.
4. Create D1 DB in production and bind to Worker.
5. Switch to live Stripe keys and run a minimal live smoke test.
6. Announce site launch.

**Rollback**
- Revert Worker deployment to previous version OR disable the checkout button while leaving the catalog visible.

---

## 11) Risks & Edge Cases
- CORS blocks requests → ensure strict origin match and OPTIONS handling.
- Stripe webhook signature failures → ensure raw body verification.
- Product has no image/description → UI handles missing fields gracefully.
- Stripe product has multiple active prices → deterministic selection rule.
- Too many Stripe API calls → cache `/products`.
- Webhook retries → ensure idempotent D1 writes.

---

## 12) Decisions
- Orders will be stored in **Cloudflare D1** via the Stripe webhook (`checkout.session.completed`) to maintain a consistent workflow as the business grows.
- Product catalog will be a **single simple list** for v1 (no categories/featured sorting UI yet).

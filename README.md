## Managing Products (Seller Workflow — No Code Needed)

This storefront is **Stripe-driven**:
- Products and prices are created/managed in **Stripe Dashboard**
- The website automatically loads the latest catalog from a Cloudflare Worker endpoint: `GET /products`
- Checkout uses **Stripe Checkout Sessions**, so pricing is always controlled by Stripe

### How to add a new product (in Stripe Dashboard)
1. Go to **Stripe Dashboard → Products**
2. Click **Add product**
3. Fill in:
   - **Name**
   - **Description** (optional)
   - **Images** (optional but recommended)
4. Add a **Price**
   - Type: **One-time**
   - Currency: **USD**
   - Set the amount
5. Make sure the product is **Active** (not archived)
6. Refresh the store website:
   - New products should appear automatically

### How to update an existing product
- Update the product name/description/images directly in Stripe
- If you need to change the price:
  - Create a **new active price** (Stripe best practice)
  - Deactivate the old price if you no longer want it used
- Refresh the website to see updates

### How to remove (hide) a product from the website
To hide a product from the store:
- Set the Stripe product to **Inactive**, OR
- Deactivate all its one-time prices

The store only displays products that have:
- `active = true`
- at least one **active one-time** price

---

## How long does it take for product changes to show up?

The product list is **cached** to keep the site fast and reduce Stripe API usage.

### Typical behavior
- After you add/update a product in Stripe, it may take up to **a few minutes** to show on the site.
- If it doesn’t appear right away:
  1. Hard refresh the page (Ctrl+F5 / Cmd+Shift+R)
  2. Wait 1–5 minutes and refresh again

> Why: the Worker caches the `/products` response for a short time (usually 60–300 seconds).

### If you need changes to show immediately (optional)
A developer can reduce the cache time or add a “refresh catalog” option later.
For v1, caching stays enabled for performance.

---

## Payments & Checkout
- Customers do **not** need an account to purchase.
- Checkout is handled by **Stripe Checkout** (Apple Pay / Google Pay / card payment methods based on device and region).
- The website never stores payment details.

---

## Orders & Fulfillment
- When a customer completes checkout, Stripe sends a webhook event (`checkout.session.completed`)
- The Cloudflare Worker verifies the webhook signature and stores the order in **Cloudflare D1**
- Stripe remains the payment source of truth; D1 acts as a durable “order ledger” for future growth
# Seller Guide: Managing Products & Orders (No Code Needed)

This guide is for the store owner/seller. You **do not** need GitHub or coding to manage products.

Your website is set up like this:
- **Stripe Dashboard** = where you add/edit products and prices
- **Website** = automatically shows products from Stripe
- **Stripe Checkout** = where customers pay
- **Orders Database (Cloudflare D1)** = stores a copy of paid orders for tracking as the business grows

---

## 1) Log in to Stripe
1. Go to Stripe Dashboard and sign in.
2. Use the left menu for **Products**, **Payments**, and **Customers**.

Tip: If you manage multiple businesses, confirm you’re in the correct Stripe account/workspace.

---

## 2) Add a new product (most common task)
1. In Stripe, open **Products**.
2. Click **Add product**.
3. Fill out:
   - **Name** (required): example “3D Printed Keychain – Pikachu”
   - **Description** (optional): short and clear
   - **Images** (optional but recommended): upload 1–3 good photos
4. Pricing section:
   - Choose **One-time** price (not recurring/subscription)
   - Set the **amount** and **currency**
5. Make sure the product is **Active**.
6. Click **Save product**.

✅ Result: The product will appear on the website automatically after a short delay (because of caching).

---

## 3) Update product name, description, or images
1. Go to **Products**.
2. Click the product.
3. Edit the **Name**, **Description**, or **Images**.
4. Click **Save**.

✅ Result: Updates show on the website after a short delay.

---

## 4) Change a product’s price (recommended way)
Stripe’s best practice is to **create a new price** instead of editing the old one.

1. Go to **Products** → open the product.
2. Find the **Pricing** section.
3. Click **Add price**.
4. Create a new **One-time** price.
5. (Optional but recommended) **Deactivate** the old price if you no longer want it used.

✅ Result: The website will show an active price for the product.

Note: If there are multiple active prices, the website will choose one based on the rules in the project spec (default/lowest/first). If you want consistent behavior, keep only one active one-time price per product.

---

## 5) Hide or remove a product from the website
You have two simple options:

### Option A: Make the product inactive
1. Go to **Products** → open the product.
2. Set the product to **Inactive** (or Archive, depending on Stripe UI).
3. Save.

### Option B: Deactivate the price
1. Go to **Products** → open the product.
2. In **Pricing**, deactivate the active one-time price.

✅ Result: The product will no longer appear on the website.

---

## 6) How long until changes show up on the website?
The website product list is cached to keep it fast.

### Typical timing
- Changes usually show up within **1–5 minutes**.

### If you need it sooner
1. Refresh the page
2. Try a hard refresh:
   - Windows: **Ctrl + F5**
   - Mac: **Cmd + Shift + R**
3. Wait 1–5 minutes and refresh again

If it still doesn’t show after ~10 minutes, tell the developer (Luis) to check caching and the products API.

---

## 7) Orders: where to find them
### The easiest place (recommended daily workflow)
Go to **Payments** in Stripe:
- You’ll see every successful payment
- Click a payment to see customer email, amount, and details

### Customers list
Go to **Customers** in Stripe:
- Useful if you need to find repeat buyers

### D1 Order Ledger (for growth / future)
A copy of each paid order is stored automatically after payment completes.
This is mainly for future features (like an “Orders” page, fulfillment status, analytics).

For now, you can run the business from Stripe Payments confidently.

---

## 8) Troubleshooting (quick fixes)

### “My new product isn’t showing on the website”
- Confirm the product is **Active**
- Confirm there is an **active one-time price**
- Wait **1–5 minutes** (cache)
- Hard refresh the website
- If still missing after ~10 minutes: contact Luis

### “Customers say checkout won’t load”
- Stripe may be down (rare) OR the site can’t reach the serverless API
- Try from your phone on cellular to rule out local internet issues
- Contact Luis to check the Worker status and logs

### “I want to stop selling temporarily”
- Set product **Inactive** or disable the price (Section 5)

---

## 9) Seller best practices (keeps the store clean)
- Use clear product names (include size/material if needed)
- Use good photos (bright lighting, multiple angles)
- Keep **one active one-time price** per product (simplest)
- If you run out of stock, set product inactive until you restock

---

## 10) Quick checklist (printable)
- [ ] Product Active
- [ ] One-time price Active
- [ ] Photo uploaded
- [ ] Description added
- [ ] Refresh website after 1–5 minutes

---

## Glossary
- **Product**: The item name/info (example: “3D Printed Dragon”)
- **Price**: The payment amount attached to a product (example: $15.00)
- **Active**: Visible/available
- **Stripe Checkout**: The payment page customers use
- **Cache**: Temporary storage that speeds up loading (causes a short delay when updates are made)

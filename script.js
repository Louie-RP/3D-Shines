const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const CART_KEY = "cart";
const MAX_ITEMS_PER_CHECKOUT = 20;
const MAX_QTY_PER_ITEM = 10;
const DEFAULT_STOREFRONT_API_BASE = "https://3dshines.lreyperez18.workers.dev";

const state = {
  productsByPriceId: new Map(),
};

function getApiBase() {
  const override = window.STOREFRONT_API_BASE;
  if (typeof override === "string" && override.trim()) {
    return override.replace(/\/+$/, "");
  }

  const meta = document.querySelector('meta[name="storefront-api-base"]');
  if (meta && typeof meta.content === "string" && meta.content.trim()) {
    return meta.content.replace(/\/+$/, "");
  }

  if (
    window.location.hostname.endsWith("github.io") ||
    window.location.hostname === "localhost" ||
    window.location.protocol === "file:"
  ) {
    return DEFAULT_STOREFRONT_API_BASE;
  }

  return "";
}

function endpoint(path) {
  return `${getApiBase()}${path}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amountMinor, currency = "usd") {
  const amount = Number(amountMinor || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
  }).format(amount);
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };

    const items = parsed.items
      .map((item) => ({
        priceId: String(item.priceId || ""),
        productId: String(item.productId || ""),
        name: String(item.name || ""),
        image: item.image ? String(item.image) : "",
        unitAmount: Number(item.unitAmount || 0),
        currency: String(item.currency || "usd"),
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.priceId && item.name && item.quantity > 0)
      .map((item) => ({
        ...item,
        quantity: Math.min(MAX_QTY_PER_ITEM, Math.max(1, Math.trunc(item.quantity))),
      }));

    return { items };
  } catch {
    return { items: [] };
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount(cart = getCart()) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

function renderCartCount() {
  const count = getCartCount();
  $$("[data-cart-count]").forEach((el) => {
    el.textContent = String(count);
  });
}

function addToCart(product) {
  const cart = getCart();
  const idx = cart.items.findIndex((item) => item.priceId === product.priceId);

  if (idx >= 0) {
    cart.items[idx].quantity = Math.min(
      MAX_QTY_PER_ITEM,
      cart.items[idx].quantity + 1
    );
  } else {
    if (cart.items.length >= MAX_ITEMS_PER_CHECKOUT) return false;
    cart.items.push({
      priceId: product.priceId,
      productId: product.productId,
      name: product.name,
      image: product.image || "",
      unitAmount: product.unitAmount,
      currency: product.currency,
      quantity: 1,
    });
  }

  saveCart(cart);
  renderCartCount();
  return true;
}

function removeFromCart(priceId) {
  const cart = getCart();
  cart.items = cart.items.filter((item) => item.priceId !== priceId);
  saveCart(cart);
  renderCartCount();
}

function updateQuantity(priceId, qty) {
  const cart = getCart();
  const item = cart.items.find((entry) => entry.priceId === priceId);
  if (!item) return;

  const quantity = Math.trunc(Number(qty));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    removeFromCart(priceId);
    return;
  }

  item.quantity = Math.min(MAX_QTY_PER_ITEM, Math.max(1, quantity));
  saveCart(cart);
  renderCartCount();
}

function clearCart() {
  saveCart({ items: [] });
  renderCartCount();
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  const imageHtml = product.image
    ? `<img class="thumb__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
    : `<div class="thumb__monogram">${escapeHtml(product.name.trim().slice(0, 1).toUpperCase())}</div>`;

  card.innerHTML = `
    <div class="thumb">${imageHtml}</div>
    <div class="card__body">
      <div class="tag">Available</div>
      <h3 class="card__title">${escapeHtml(product.name)}</h3>
      <p class="muted small">${escapeHtml(product.description || "")}</p>
      <div class="price">${formatCurrency(product.unitAmount, product.currency)}</div>
      <div class="card__actions">
        <button class="button button--small" type="button" data-add-to-cart data-price-id="${escapeHtml(product.priceId)}">Add to cart</button>
      </div>
    </div>
  `;

  return card;
}

function renderProductError(message) {
  const lovedGrid = $("[data-product-grid]");
  const allGrid = $("[data-product-grid-all]");
  const error = `<p class="empty-state">${escapeHtml(message)}</p>`;

  if (lovedGrid) lovedGrid.innerHTML = error;
  if (allGrid) allGrid.innerHTML = error;
}

function renderProductLoading() {
  const lovedGrid = $("[data-product-grid]");
  const allGrid = $("[data-product-grid-all]");
  const loading = `<p class="empty-state">Loading products...</p>`;

  if (lovedGrid) lovedGrid.innerHTML = loading;
  if (allGrid) allGrid.innerHTML = loading;
}

function renderProducts(products) {
  const lovedGrid = $("[data-product-grid]");
  const allGrid = $("[data-product-grid-all]");

  if (!products.length) {
    renderProductError("No products are available right now. Please check back soon.");
    return;
  }

  if (lovedGrid) {
    const mostLoved = products.slice(0, 6);
    lovedGrid.replaceChildren(...mostLoved.map((product) => createProductCard(product)));
  }

  if (allGrid) {
    allGrid.replaceChildren(...products.map((product) => createProductCard(product)));
  }
}

async function fetchProducts() {
  const response = await fetch(endpoint("/products"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load products");
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.products)) {
    throw new Error("Invalid product response");
  }

  return payload.products;
}

async function initProducts() {
  const hasGrid = Boolean($("[data-product-grid]")) || Boolean($("[data-product-grid-all]"));
  if (!hasGrid) return;

  try {
    renderProductLoading();
    const products = await fetchProducts();
    state.productsByPriceId.clear();
    products.forEach((product) => {
      state.productsByPriceId.set(product.priceId, product);
    });
    renderProducts(products);
  } catch {
    renderProductError("Catalog is temporarily unavailable. Please try again.");
  }
}

function renderCartItems(items) {
  const host = $("[data-cart-items]");
  if (!host) return;

  host.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement("article");
      row.className = "cart-item";

      const imageHtml = item.image
        ? `<img class="cart-item__img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />`
        : `<div class="cart-item__img cart-item__img--fallback">${escapeHtml(
            item.name.trim().slice(0, 1).toUpperCase()
          )}</div>`;

      const lineTotal = item.unitAmount * item.quantity;

      row.innerHTML = `
        <div class="cart-item__media">${imageHtml}</div>
        <div class="cart-item__info">
          <h3 class="cart-item__name">${escapeHtml(item.name)}</h3>
          <p class="cart-item__meta">${formatCurrency(item.unitAmount, item.currency)} each</p>
        </div>
        <div class="cart-item__controls">
          <label>
            <span class="sr-only">Quantity</span>
            <input
              class="qty-input"
              type="number"
              min="1"
              max="10"
              value="${item.quantity}"
              data-qty-input
              data-price-id="${escapeHtml(item.priceId)}"
            />
          </label>
          <p class="cart-item__line-total">${formatCurrency(lineTotal, item.currency)}</p>
          <button class="button button--small button--ghost" type="button" data-remove-item data-price-id="${escapeHtml(item.priceId)}">Remove</button>
        </div>
      `;

      return row;
    })
  );
}

function renderCartSummary(cart) {
  const subtotalValue = cart.items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  );
  const currency = cart.items[0]?.currency || "usd";
  const subtotal = formatCurrency(subtotalValue, currency);

  const subtotalEl = $("[data-cart-subtotal]");
  const totalEl = $("[data-cart-total]");
  const countEl = $("[data-cart-item-count]");
  if (subtotalEl) subtotalEl.textContent = subtotal;
  if (totalEl) totalEl.textContent = subtotal;
  if (countEl) countEl.textContent = String(getCartCount(cart));

  const isEmpty = cart.items.length === 0;
  const emptyEl = $("[data-cart-empty]");
  const checkoutBtn = $("[data-cart-checkout]");
  const clearBtn = $("[data-cart-clear]");

  if (emptyEl) emptyEl.hidden = !isEmpty;
  if (checkoutBtn) checkoutBtn.disabled = isEmpty;
  if (clearBtn) clearBtn.disabled = isEmpty;
}

function renderCartPage() {
  if (!$("[data-cart-page]")) return;

  const cart = getCart();
  renderCartItems(cart.items);
  renderCartSummary(cart);
}

async function beginCheckout() {
  const errorEl = $("[data-cart-error]");
  const checkoutBtn = $("[data-cart-checkout]");
  const cart = getCart();

  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  if (!cart.items.length) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = "Your cart is empty.";
    }
    return;
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Redirecting...";
  }

  try {
    const response = await fetch(endpoint("/create-checkout-session"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cart.items.map((item) => ({
          priceId: item.priceId,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error("Checkout initialization failed");
    }

    const payload = await response.json();
    if (!payload || typeof payload.url !== "string") {
      throw new Error("Invalid checkout session response");
    }

    window.location.href = payload.url;
  } catch {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = "Unable to start checkout. Please try again.";
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout";
    }
  }
}

function wireCartPage() {
  const cartRoot = $("[data-cart-page]");
  if (!cartRoot) return;

  cartRoot.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const removeButton = target.closest("[data-remove-item]");
    if (removeButton instanceof HTMLElement) {
      const priceId = removeButton.dataset.priceId;
      if (!priceId) return;
      removeFromCart(priceId);
      renderCartPage();
      return;
    }

    if (target.matches("[data-cart-clear]")) {
      clearCart();
      renderCartPage();
      return;
    }

    if (target.matches("[data-cart-checkout]")) {
      beginCheckout();
    }
  });

  cartRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-qty-input]")) return;

    const priceId = target.dataset.priceId;
    if (!priceId) return;

    updateQuantity(priceId, target.value);
    renderCartPage();
  });
}

function wireAddToCart() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest("[data-add-to-cart]");
    if (!(button instanceof HTMLButtonElement)) return;

    const priceId = button.dataset.priceId;
    if (!priceId) return;

    const product = state.productsByPriceId.get(priceId);
    if (!product) return;

    const added = addToCart(product);
    button.textContent = added ? "Added" : "Cart full";
    window.setTimeout(() => {
      button.textContent = "Add to cart";
    }, 700);
  });
}

function wireMenu() {
  const menuButton = $("[data-menu-button]");
  const closeButton = $("[data-menu-close]");
  const mobile = $("[data-mobile]");

  if (!menuButton || !closeButton || !mobile) return;

  const open = () => {
    mobile.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    mobile.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
  };

  menuButton.addEventListener("click", () => {
    if (mobile.hidden) open();
    else close();
  });

  closeButton.addEventListener("click", close);

  $$("[data-mobile-link]", mobile).forEach((anchor) =>
    anchor.addEventListener("click", close)
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function wireForms() {
  const contact = $("[data-contact-form]");
  if (contact) {
    contact.addEventListener("submit", (event) => {
      event.preventDefault();
      const hint = $("[data-form-hint]");
      if (hint) hint.hidden = false;
      contact.reset();
    });
  }

  const subscribe = $("[data-subscribe-form]");
  if (subscribe) {
    subscribe.addEventListener("submit", (event) => {
      event.preventDefault();
      subscribe.reset();
    });
  }
}

function initYear() {
  const el = $("[data-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function normalizeCartLinks() {
  $$(".nav__cart").forEach((anchor) => {
    if (anchor instanceof HTMLAnchorElement) {
      anchor.href = "cart.html";
    }
  });
}

function clearCartOnSuccessPage() {
  const path = window.location.pathname;
  if (!path.endsWith("/success.html") && path !== "/success.html") {
    return;
  }

  const sessionId = new URLSearchParams(window.location.search).get("session_id");
  if (!sessionId) return;

  clearCart();
}

async function init() {
  clearCartOnSuccessPage();
  normalizeCartLinks();
  wireAddToCart();
  wireCartPage();
  wireMenu();
  wireForms();
  initYear();

  renderCartCount();
  renderCartPage();
  await initProducts();
}

init();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  cartCount: 0,
};

const products = [
  {
    id: "aurora-keychain",
    name: "Aurora Keychain",
    price: 12,
    tag: "Best seller",
    desc: "Lightweight and durable — a shiny everyday carry for keys and bags.",
  },
  {
    id: "desk-daisy",
    name: "Desk Daisy",
    price: 10,
    tag: "New",
    desc: "A tiny shelf buddy with petal details that catch the light.",
  },
  {
    id: "clicker-cube",
    name: "Clicker Cube",
    price: 15,
    tag: "Most loved",
    desc: "Satisfying tactile clicks in a clean, minimal form.",
  },
  {
    id: "mini-vase",
    name: "Mini Vase",
    price: 14,
    tag: "Limited",
    desc: "A small decorative vase for dried stems and desk decor.",
  },
  {
    id: "cable-charm",
    name: "Cable Charm",
    price: 8,
    tag: "Giftable",
    desc: "Clip it on chargers and cables to keep your setup tidy.",
  },
  {
    id: "phone-stand",
    name: "Phone Stand",
    price: 16,
    tag: "Classic",
    desc: "Stable angles for calls, videos, and bedside charging.",
  },
  {
    id: "sparkle-tray",
    name: "Sparkle Tray",
    price: 18,
    tag: "New",
    desc: "Catch-all tray for rings, dice, earbuds, and tiny treasures.",
  },
  {
    id: "bookmark-wave",
    name: "Wave Bookmark",
    price: 9,
    tag: "New",
    desc: "A flexible, smooth bookmark with an elegant ripple profile.",
  },
  {
    id: "plant-labels",
    name: "Plant Labels (Set)",
    price: 11,
    tag: "Practical",
    desc: "Minimal labels for herbs, seedlings, and indoor plants.",
  },
  {
    id: "desk-hook",
    name: "Under-Desk Hook",
    price: 13,
    tag: "Practical",
    desc: "Hang headphones or bags with a simple adhesive mount.",
  },
  {
    id: "coin-case",
    name: "Pocket Coin Case",
    price: 12,
    tag: "Limited",
    desc: "A satisfying snap-fit case for coins and tiny keepsakes.",
  },
  {
    id: "pen-caddy",
    name: "Pen Caddy",
    price: 17,
    tag: "Most loved",
    desc: "Clean organizer for pens, tools, and small accessories.",
  },
];

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function createProductCard(product, { compact = false } = {}) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.setAttribute("aria-label", `Open ${product.name}`);
  card.dataset.productId = product.id;

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  const monogram = document.createElement("div");
  monogram.className = "thumb__monogram";
  monogram.textContent = product.name.trim().slice(0, 1).toUpperCase();
  thumb.appendChild(monogram);

  const body = document.createElement("div");
  body.className = "card__body";

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = product.tag;

  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = product.name;

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = compact ? `From ${currency(product.price)}` : currency(product.price);

  const actions = document.createElement("div");
  actions.className = "card__actions";

  const quick = document.createElement("span");
  quick.className = "button button--small button--ghost";
  quick.textContent = "Quick view";
  quick.setAttribute("aria-hidden", "true");

  const add = document.createElement("span");
  add.className = "button button--small";
  add.textContent = "Add";
  add.setAttribute("aria-hidden", "true");

  actions.appendChild(quick);
  actions.appendChild(add);

  body.appendChild(tag);
  body.appendChild(title);
  body.appendChild(price);
  body.appendChild(actions);

  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}

function renderProducts() {
  const lovedGrid = $("[data-product-grid]");
  const allGrid = $("[data-product-grid-all]");

  if (lovedGrid) {
    const mostLoved = products.slice(0, 6);
    lovedGrid.replaceChildren(
      ...mostLoved.map((p) => createProductCard(p, { compact: true }))
    );
  }

  if (allGrid) {
    allGrid.replaceChildren(
      ...products.map((p) => createProductCard(p, { compact: true }))
    );
  }
}

function setCartCount(nextCount) {
  state.cartCount = nextCount;
  const el = $("[data-cart-count]");
  if (el) el.textContent = String(state.cartCount);
}

function openModal(product) {
  const dialog = $("[data-modal]");
  if (!dialog) return;

  $("[data-modal-tag]", dialog).textContent = product.tag;
  $("[data-modal-title]", dialog).textContent = product.name;
  $("[data-modal-price]", dialog).textContent = currency(product.price);
  $("[data-modal-desc]", dialog).textContent = product.desc;

  const thumb = $("[data-modal-thumb]", dialog);
  if (thumb) {
    thumb.innerHTML = "";
    const mono = document.createElement("div");
    mono.className = "thumb__monogram";
    mono.textContent = product.name.trim().slice(0, 1).toUpperCase();
    thumb.appendChild(mono);
  }

  const add = $("[data-add-to-cart]", dialog);
  if (add) {
    add.onclick = () => {
      setCartCount(state.cartCount + 1);
      dialog.close();
    };
  }

  const copyLink = $("[data-copy-link]", dialog);
  if (copyLink) {
    copyLink.onclick = async () => {
      const url = new URL(window.location.href);
      url.hash = product.id;
      try {
        await navigator.clipboard.writeText(url.toString());
        copyLink.textContent = "Copied";
        setTimeout(() => (copyLink.textContent = "Copy link"), 900);
      } catch {
        copyLink.textContent = "Copy failed";
        setTimeout(() => (copyLink.textContent = "Copy link"), 900);
      }
    };
  }

  dialog.showModal();
}

function wireProductGrid() {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const card = target.closest(".card");
    if (!(card instanceof HTMLElement)) return;

    const id = card.dataset.productId;
    const product = products.find((p) => p.id === id);
    if (!product) return;

    openModal(product);
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

  $$("[data-mobile-link]", mobile).forEach((a) =>
    a.addEventListener("click", close)
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function wireForms() {
  const contact = $("[data-contact-form]");
  if (contact) {
    contact.addEventListener("submit", (e) => {
      e.preventDefault();
      const hint = $("[data-form-hint]");
      if (hint) hint.hidden = false;
      contact.reset();
    });
  }

  const subscribe = $("[data-subscribe-form]");
  if (subscribe) {
    subscribe.addEventListener("submit", (e) => {
      e.preventDefault();
      subscribe.reset();
    });
  }
}

function initYear() {
  const el = $("[data-year]");
  if (el) el.textContent = String(new Date().getFullYear());
}

function openFromHash() {
  const id = window.location.hash.replace("#", "").trim();
  if (!id) return;

  const product = products.find((p) => p.id === id);
  if (product) openModal(product);
}

renderProducts();
wireProductGrid();
wireMenu();
wireForms();
initYear();
setCartCount(0);
openFromHash();

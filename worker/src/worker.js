const STRIPE_API_BASE = "https://api.stripe.com/v1";
const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return handleOptions(request, env);
		}

		if (url.pathname === "/webhook" && request.method === "POST") {
			return handleWebhook(request, env);
		}

		const corsOrigin = getCorsOrigin(request, env);
		const hasOriginHeader = request.headers.has("Origin");

		if (hasOriginHeader && !corsOrigin) {
			return jsonResponse({ error: "Forbidden origin" }, 403);
		}

		try {
			if (url.pathname === "/products" && request.method === "GET") {
				const response = await handleProducts(env);
				return withCors(response, corsOrigin);
			}

			if (url.pathname === "/create-checkout-session" && request.method === "POST") {
				const response = await handleCreateCheckoutSession(request, env);
				return withCors(response, corsOrigin);
			}

			return withCors(jsonResponse({ error: "Not found" }, 404), corsOrigin);
		} catch (error) {
			console.error("Unhandled worker error", error);
			return withCors(
				jsonResponse({ error: "Internal server error" }, 500),
				corsOrigin
			);
		}
	},
};

function getAllowedOrigins(env) {
	const origins = new Set(DEV_ORIGINS);

	if (env.FRONTEND_ORIGIN) {
		origins.add(String(env.FRONTEND_ORIGIN).trim());
	}

	if (env.CORS_ALLOWED_ORIGINS) {
		String(env.CORS_ALLOWED_ORIGINS)
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean)
			.forEach((origin) => origins.add(origin));
	}

	return origins;
}

function getCorsOrigin(request, env) {
	const origin = request.headers.get("Origin");
	if (!origin) return null;
	return getAllowedOrigins(env).has(origin) ? origin : null;
}

function buildCorsHeaders(origin) {
	if (!origin) return {};
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

function withCors(response, origin) {
	if (!origin) return response;
	const nextHeaders = new Headers(response.headers);
	const cors = buildCorsHeaders(origin);
	Object.entries(cors).forEach(([key, value]) => {
		nextHeaders.set(key, value);
	});

	return new Response(response.body, {
		status: response.status,
		headers: nextHeaders,
	});
}

function jsonResponse(payload, status = 200, headers = {}) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
	});
}

function handleOptions(request, env) {
	const origin = getCorsOrigin(request, env);
	if (request.headers.has("Origin") && !origin) {
		return new Response(null, { status: 403 });
	}

	return new Response(null, {
		status: 204,
		headers: buildCorsHeaders(origin),
	});
}

async function stripeRequest(env, path, init = {}) {
	if (!env.STRIPE_SECRET_KEY) {
		throw new Error("STRIPE_SECRET_KEY is not configured");
	}

	const response = await fetch(`${STRIPE_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
			...(init.headers || {}),
		},
	});

	const payload = await response.json();

	if (!response.ok) {
		const message = payload?.error?.message || "Stripe API request failed";
		throw new Error(message);
	}

	return payload;
}

function parseBoolean(value) {
	return String(value || "").toLowerCase() === "true";
}

function choosePrice(prices) {
	const explicitDefault = prices.find((price) =>
		parseBoolean(price.metadata?.default_price)
	);
	if (explicitDefault) return explicitDefault;

	const withAmount = prices.filter((price) => Number.isInteger(price.unit_amount));
	if (withAmount.length > 0) {
		return withAmount.sort((a, b) => a.unit_amount - b.unit_amount)[0];
	}

	return prices[0];
}

async function listAllActiveOneTimePrices(env) {
	const prices = [];
	let startingAfter = null;

	while (true) {
		const query = new URLSearchParams();
		query.set("active", "true");
		query.set("type", "one_time");
		query.set("limit", "100");
		query.append("expand[]", "data.product");
		if (startingAfter) query.set("starting_after", startingAfter);

		const page = await stripeRequest(env, `/prices?${query.toString()}`);
		prices.push(...page.data);

		if (!page.has_more || page.data.length === 0) break;
		startingAfter = page.data[page.data.length - 1].id;
	}

	return prices;
}

function buildCatalogFromPrices(prices) {
	const byProduct = new Map();

	prices.forEach((price) => {
		const product = price.product;
		if (!product || typeof product !== "object") return;
		if (!product.active) return;

		if (!byProduct.has(product.id)) {
			byProduct.set(product.id, {
				product,
				prices: [],
			});
		}

		byProduct.get(product.id).prices.push(price);
	});

	return Array.from(byProduct.values())
		.map(({ product, prices: productPrices }) => {
			const chosen = choosePrice(productPrices);
			return {
				productId: product.id,
				name: product.name,
				description: product.description || null,
				image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
				priceId: chosen.id,
				unitAmount: chosen.unit_amount,
				currency: chosen.currency,
			};
		})
		.filter((entry) => entry.productId && entry.priceId && Number.isInteger(entry.unitAmount))
		.sort((a, b) => a.name.localeCompare(b.name));
}

async function handleProducts(env) {
	try {
		const prices = await listAllActiveOneTimePrices(env);
		const products = buildCatalogFromPrices(prices);

		return jsonResponse(
			{
				products,
				generatedAt: new Date().toISOString(),
			},
			200,
			{
				"Cache-Control": "public, max-age=60, s-maxage=300",
			}
		);
	} catch (error) {
		console.error("GET /products failed", error);
		return jsonResponse({ error: "Unable to load products" }, 500);
	}
}

function normalizeCheckoutItems(items) {
	if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS_PER_CHECKOUT) {
		return null;
	}

	const merged = new Map();

	for (const entry of items) {
		if (!entry || typeof entry !== "object") return null;

		const priceId = String(entry.priceId || "").trim();
		const quantity = Number(entry.quantity);

		if (!priceId) return null;
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
			return null;
		}

		const current = merged.get(priceId) || 0;
		const next = current + quantity;
		if (next > MAX_QTY_PER_ITEM) return null;
		merged.set(priceId, next);
	}

	if (merged.size < 1 || merged.size > MAX_ITEMS_PER_CHECKOUT) {
		return null;
	}

	return Array.from(merged.entries()).map(([priceId, quantity]) => ({
		priceId,
		quantity,
	}));
}

const MAX_ITEMS_PER_CHECKOUT = 20;
const MAX_QTY_PER_ITEM = 10;

async function isValidPriceId(env, priceId) {
	try {
		const price = await stripeRequest(env, `/prices/${encodeURIComponent(priceId)}`);
		return Boolean(price?.active) && price?.type === "one_time";
	} catch {
		return false;
	}
}

function getSiteOrigin(request, env) {
	if (env.FRONTEND_ORIGIN) {
		return String(env.FRONTEND_ORIGIN).trim().replace(/\/+$/, "");
	}

	const requestOrigin = request.headers.get("Origin");
	if (requestOrigin) {
		return requestOrigin.replace(/\/+$/, "");
	}

	return new URL(request.url).origin;
}

async function handleCreateCheckoutSession(request, env) {
	let payload;

	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON payload" }, 400);
	}

	const normalizedItems = normalizeCheckoutItems(payload?.items);
	if (!normalizedItems) {
		return jsonResponse({ error: "Invalid items payload" }, 400);
	}

	const validationResults = await Promise.all(
		normalizedItems.map((item) => isValidPriceId(env, item.priceId))
	);

	if (validationResults.some((isValid) => !isValid)) {
		return jsonResponse({ error: "Invalid or inactive priceId" }, 400);
	}

	const siteOrigin = getSiteOrigin(request, env);
	const body = new URLSearchParams();
	body.set("mode", "payment");
	body.set("success_url", `${siteOrigin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
	body.set("cancel_url", `${siteOrigin}/cart.html`);
	body.set("shipping_address_collection[allowed_countries][0]", "US");

	normalizedItems.forEach((item, index) => {
		body.set(`line_items[${index}][price]`, item.priceId);
		body.set(`line_items[${index}][quantity]`, String(item.quantity));
	});

	try {
		const session = await stripeRequest(env, "/checkout/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: body.toString(),
		});

		if (!session?.url) {
			return jsonResponse({ error: "Failed to create checkout session" }, 500);
		}

		return jsonResponse({ url: session.url });
	} catch (error) {
		console.error("POST /create-checkout-session failed", error);
		return jsonResponse({ error: "Unable to create checkout session" }, 500);
	}
}

function parseStripeSignature(signatureHeader) {
	const parts = String(signatureHeader || "").split(",");
	const parsed = {
		t: null,
		v1: [],
	};

	for (const part of parts) {
		const [key, value] = part.split("=");
		if (!key || !value) continue;
		const trimmedKey = key.trim();
		const trimmedValue = value.trim();

		if (trimmedKey === "t") parsed.t = trimmedValue;
		if (trimmedKey === "v1") parsed.v1.push(trimmedValue);
	}

	return parsed;
}

function hex(buffer) {
	return Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function timingSafeEqual(a, b) {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i += 1) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

async function computeStripeSignature(secret, payload) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{
			name: "HMAC",
			hash: "SHA-256",
		},
		false,
		["sign"]
	);

	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return hex(signature);
}

async function verifyWebhookSignature(rawBody, signatureHeader, secret) {
	if (!signatureHeader || !secret) return false;

	const { t, v1 } = parseStripeSignature(signatureHeader);
	if (!t || v1.length === 0) return false;

	const timestamp = Number(t);
	if (!Number.isFinite(timestamp)) return false;

	const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
	if (age > 300) return false;

	const signedPayload = `${t}.${rawBody}`;
	const expected = await computeStripeSignature(secret, signedPayload);

	return v1.some((candidate) => timingSafeEqual(candidate, expected));
}

function asIsoTimestamp(unixSeconds) {
	if (!Number.isFinite(unixSeconds)) return new Date().toISOString();
	return new Date(unixSeconds * 1000).toISOString();
}

async function persistCompletedCheckout(session, eventId, env) {
	const sessionId = String(session.id || "");
	if (!sessionId) return;

	const shippingAddress = session?.shipping_details?.address || null;

	await env.DB.prepare(
		`
		INSERT INTO orders (
			session_id,
			created_at,
			payment_intent_id,
			customer_email,
			amount_total,
			currency,
			shipping_name,
			shipping_address_json,
			status,
			raw_event_id
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(session_id) DO UPDATE SET
			created_at = excluded.created_at,
			payment_intent_id = excluded.payment_intent_id,
			customer_email = excluded.customer_email,
			amount_total = excluded.amount_total,
			currency = excluded.currency,
			shipping_name = excluded.shipping_name,
			shipping_address_json = excluded.shipping_address_json,
			status = excluded.status,
			raw_event_id = excluded.raw_event_id
	`
	)
		.bind(
			sessionId,
			asIsoTimestamp(Number(session.created)),
			session.payment_intent ? String(session.payment_intent) : null,
			session?.customer_details?.email || session?.customer_email || null,
			Number.isInteger(session.amount_total) ? session.amount_total : null,
			session.currency || null,
			session?.shipping_details?.name || null,
			shippingAddress ? JSON.stringify(shippingAddress) : null,
			"paid",
			eventId || null
		)
		.run();

	console.log("checkout.session.completed stored", {
		sessionId,
		customerEmail: session?.customer_details?.email || session?.customer_email || null,
	});
}

async function handleWebhook(request, env) {
	const signatureHeader = request.headers.get("Stripe-Signature");
	const rawBody = await request.text();

	const valid = await verifyWebhookSignature(
		rawBody,
		signatureHeader,
		env.STRIPE_WEBHOOK_SECRET
	);

	if (!valid) {
		return jsonResponse({ error: "Invalid webhook signature" }, 400);
	}

	let event;

	try {
		event = JSON.parse(rawBody);
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}

	try {
		if (event.type === "checkout.session.completed") {
			await persistCompletedCheckout(event.data?.object || {}, event.id, env);
		}

		return jsonResponse({ received: true });
	} catch (error) {
		console.error("POST /webhook failed", error);
		return jsonResponse({ error: "Internal webhook error" }, 500);
	}
}

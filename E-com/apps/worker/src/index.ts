import { Hono } from "hono"

type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  ADMIN_API_TOKEN: string
  RAZORPAY_KEY_ID?: string
  RAZORPAY_KEY_SECRET?: string
}

const app = new Hono<{ Bindings: Env }>()

/* ── edge rate limiter (in-memory sliding window, per isolate) ──
   Best-effort shield at the edge; exact login throttling lives in the
   Next.js login route (Supabase-backed, survives scaling). */
const buckets = new Map<string, number[]>()
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= max) return false
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) buckets.clear()
  return true
}
const ipOf = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

/* ── coupon engine (shared: public validate + checkout) ── */
interface CouponRow {
  code: string
  percent: number
  active: boolean
  type: string
  amount: number
  min_subtotal: number
  max_discount: number
  applies_to: string
  product_ids: string[]
  category_ids: string[]
  states: string[]
  starts_at: string | null
  ends_at: string | null
  max_redemptions: number
  per_user_limit: number
  bogo_buy_qty: number
  bogo_get_qty: number
}
interface EvalCtx {
  subtotal?: number
  shipping?: number
  productIds?: string[]
  categoryIds?: string[]
  state?: string
  usedByUser?: number
  liveCount?: number
  now?: Date
  unitPrices?: { pid: string; cid: string | null; price: number }[]
  eligibleQty?: number
}
const COUPON_COLS =
  "code,percent,active,type,amount,min_subtotal,max_discount,applies_to,product_ids,category_ids,states,starts_at,ends_at,max_redemptions,per_user_limit,bogo_buy_qty,bogo_get_qty"

/** Discount the coupon grants, or `{valid:false, reason}`. Checks with no
   ctx field provided are skipped (the caller re-checks fully at checkout). */
function evalCoupon(cp: CouponRow, ctx: EvalCtx = {}) {
  const fail = (reason: string) => ({ valid: false, reason, discount: 0 })
  if (!cp.active) return fail("inactive")
  const now = ctx.now ?? new Date()
  if (cp.starts_at && now < new Date(cp.starts_at)) return fail("not_started")
  if (cp.ends_at && now > new Date(cp.ends_at)) return fail("expired")
  if (ctx.subtotal !== undefined && ctx.subtotal < cp.min_subtotal) return fail("min_subtotal")
  if (ctx.state !== undefined && cp.states.length > 0 && !cp.states.includes(ctx.state))
    return fail("state")
  if (ctx.usedByUser !== undefined && cp.per_user_limit > 0 && ctx.usedByUser >= cp.per_user_limit)
    return fail("per_user_limit")
  if (ctx.liveCount !== undefined && cp.max_redemptions > 0 && ctx.liveCount >= cp.max_redemptions)
    return fail("max_redemptions")
  const inScope = (pid: string, cid: string | null) =>
    cp.applies_to === "all" ||
    (cp.applies_to === "products" && cp.product_ids.includes(pid)) ||
    (cp.applies_to === "categories" && (cid ?? "") !== "" && cp.category_ids.includes(cid as string))
  if (ctx.productIds && cp.applies_to !== "all") {
    if (cp.applies_to === "products" && !ctx.productIds.some((p) => cp.product_ids.includes(p)))
      return fail("scope")
    if (cp.applies_to === "categories" && !(ctx.categoryIds ?? []).some((c) => cp.category_ids.includes(c)))
      return fail("scope")
  }
  const subtotal = ctx.subtotal ?? 0
  const shipping = ctx.shipping ?? 0
  let discount = 0
  if (cp.type === "percent") discount = Math.round(((subtotal + shipping) * cp.percent) / 100)
  else if (cp.type === "fixed") discount = Math.min(cp.amount, subtotal)
  else if (cp.type === "free_shipping") discount = shipping
  else if (cp.type === "bogo") {
    // ponytail: line-level BOGO on cheapest eligible units — swap for a
    // line-aware rule if promotions ever need per-product matching.
    const unitPrices: number[] = []
    if (ctx.unitPrices) {
      for (const u of ctx.unitPrices) if (inScope(u.pid, u.cid)) unitPrices.push(u.price)
    }
    const qty = ctx.eligibleQty ?? 0
    const free = Math.floor(qty / Math.max(1, cp.bogo_buy_qty)) * cp.bogo_get_qty
    unitPrices.sort((a, b) => a - b)
    discount = unitPrices.slice(0, free).reduce((s, p) => s + p, 0)
  }
  if (cp.max_discount > 0) discount = Math.min(discount, cp.max_discount)
  // bogo without cart units (validate endpoint) = structural check only; the
  // client previews the amount and order-create re-checks with real lines.
  if (discount <= 0 && cp.type !== "percent" && !(cp.type === "bogo" && ctx.unitPrices === undefined))
    return fail("no_benefit")
  return { valid: true, reason: "ok", discount: Math.max(0, Math.min(discount, subtotal + shipping)) }
}

/* public coupon check (code + percent are not secrets; tight limit).
   Mounted BEFORE the Bearer middleware on purpose. */
app.get("/v1/coupons/validate", async (c) => {
  const ip = ipOf(c)
  if (!limited(`cp:${ip}`, 15, 60_000)) return c.json({ error: "rate_limited" }, 429)
  const code = (c.req.query("code") ?? "").trim().toUpperCase().slice(0, 32)
  if (!code) return c.json({ valid: false, reason: "not_found" })
  const rows = (await sb(c, `coupons?code=eq.${encodeURIComponent(code)}&select=${COUPON_COLS}&limit=1`)) as CouponRow[]
  const hit = rows[0]
  if (!hit) return c.json({ valid: false, reason: "not_found" })
  const subQ = Number(c.req.query("subtotal"))
  const shipQ = Number(c.req.query("shipping"))
  const ev = evalCoupon(hit, {
    ...(Number.isFinite(subQ) && subQ > 0 ? { subtotal: subQ } : {}),
    ...(Number.isFinite(shipQ) && shipQ > 0 ? { shipping: shipQ } : {}),
  })
  return c.json({
    valid: ev.valid,
    reason: ev.reason,
    percent: hit.type === "percent" ? hit.percent : 0,
    type: hit.type,
    amount: hit.type === "fixed" ? hit.amount : 0,
    max_discount: hit.max_discount,
    min_subtotal: hit.min_subtotal,
    bogo_buy_qty: hit.bogo_buy_qty,
    bogo_get_qty: hit.bogo_get_qty,
  })
})

/* public newsletter subscribe (no Bearer; tight limit, idempotent). */
app.post("/v1/subscribers", async (c) => {
  const ip = ipOf(c)
  if (!limited(`sub:${ip}`, 5, 60_000)) return c.json({ error: "rate_limited" }, 429)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const email = str(body.email, 160)?.trim().toLowerCase() ?? ""
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "bad_email" }, 400)
  await sb(c, "subscribers?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ email, source: str(body.source, 60) ?? "storefront" }]),
  })
  return c.json({ ok: true })
})

/* ── auth: every /v1 route below needs the shared Bearer token ── */
app.use("/v1/*", async (c, next) => {
  const ip = ipOf(c)
  if (!limited(`rl:${ip}`, 120, 60_000)) return c.json({ error: "rate_limited" }, 429)
  const auth = c.req.header("authorization") ?? ""
  if (auth !== `Bearer ${c.env.ADMIN_API_TOKEN}`) return c.json({ error: "unauthorized" }, 401)
  await next()
})

/* ── tiny PostgREST client (no supabase-js — keeps the bundle small) ── */
async function sb(c: { env: Env }, path: string, init: RequestInit = {}) {
  const res = await fetch(`${c.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null
const str = (v: unknown, maxLen: number) =>
  typeof v === "string" && v.length <= maxLen ? v : null

app.get("/health", (c) => c.json({ ok: true }))

/* image CDN: proxy Supabase storage with immutable edge caching.
   URLs are content-hashed, so a year of edge+browser cache is safe. */
app.get("/img/*", async (c) => {
  const path = c.req.path.replace(/^\/img\//, "").replace(/\.\./g, "")
  if (!path || path.length > 200) return c.json({ error: "bad_path" }, 400)
  const upstream = await fetch(`${c.env.SUPABASE_URL}/storage/v1/object/public/product-images/${path}`, {
    cf: { cacheTtl: 31536000, cacheEverything: true },
  } as RequestInit)
  if (!upstream.ok) return c.json({ error: "not_found" }, 404)
  const headers = new Headers(upstream.headers)
  headers.set("Cache-Control", "public, max-age=31536000, immutable")
  headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable")
  return new Response(upstream.body, { status: 200, headers })
})

/* dashboard numbers — three small indexed queries (fine into the thousands) */
app.get("/v1/stats", async (c) => {
  const [products, orders, reviews] = await Promise.all([
    sb(c, "products?select=id&limit=1000") as Promise<{ id: string }[]>,
    sb(c, "orders?select=total,status&limit=1000") as Promise<{ total: number; status: string }[]>,
    sb(c, "reviews?select=id&limit=1000") as Promise<{ id: string }[]>,
  ])
  const paid = orders.filter((o) => o.status === "paid")
  return c.json({
    products: products.length,
    orders: orders.length,
    paidOrders: paid.length,
    revenueInr: paid.reduce((s, o) => s + (o.total || 0), 0),
    reviews: reviews.length,
  })
})

/* product updates — whitelisted fields only */
app.patch("/v1/products/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  const title = str(body.title, 160)
  if (title) patch.title = title
  const description = str(body.description, 2000)
  if (description !== null) patch.description = description
  const badges = str(body.badges, 120)
  if (badges !== null) patch.badges = badges
  if (Object.keys(patch).length === 0) return c.json({ error: "nothing_to_update" }, 400)
  const rows = await sb(c, `products?id=eq.${c.req.param("id")}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  })
  return c.json({ ok: true, product: (rows as unknown[])[0] ?? null })
})

/* variant price/stock */
app.patch("/v1/variants/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  const inr = num(body.price_inr, 0, 10000000)
  if (inr !== null) patch.price_inr = inr
  const usd = num(body.price_usd, 0, 1000000)
  if (usd !== null) patch.price_usd = usd
  const qty = num(body.inventory_qty, 0, 1000000)
  if (qty !== null) patch.inventory_qty = Math.floor(qty)
  if (Object.keys(patch).length === 0) return c.json({ error: "nothing_to_update" }, 400)
  await sb(c, `variants?id=eq.${c.req.param("id")}`, { method: "PATCH", body: JSON.stringify(patch) })
  return c.json({ ok: true })
})

/* orders */
app.get("/v1/orders", async (c) => {
  const status = c.req.query("status") ?? ""
  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200)
  const q = `orders?select=id,email,name,phone,total,status,created_at,items&order=created_at.desc&limit=${limit}${
    ["pending", "paid", "failed", "refunded", "cancelled"].includes(status) ? `&status=eq.${status}` : ""
  }`
  return c.json(await sb(c, q))
})
app.patch("/v1/orders/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  if (!["pending", "paid", "failed", "refunded", "cancelled"].includes(String(body.status))) {
    return c.json({ error: "bad_status" }, 400)
  }
  await sb(c, `orders?id=eq.${c.req.param("id")}`, {
    method: "PATCH",
    body: JSON.stringify({ status: body.status }),
  })
  return c.json({ ok: true })
})

/* reviews */
app.get("/v1/reviews", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200)
  return c.json(await sb(c, `reviews?select=id,product_id,name,rating,title,body,verified,status,reply,replied_at,created_at&order=created_at.desc&limit=${limit}`))
})
app.post("/v1/reviews", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const product_id = str(body.product_id, 64)
  const name = str(body.name, 60)?.trim()
  const rating = num(body.rating, 1, 5)
  const title = str(body.title, 160) ?? ""
  const text = str(body.body, 2000) ?? ""
  if (!product_id || !name || rating === null || !text) return c.json({ error: "bad_review" }, 400)
  const rows = (await sb(c, "reviews", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ product_id, name, rating: Math.floor(rating), title, body: text }]),
  })) as unknown[]
  return c.json({ ok: true, review: rows[0] ?? null })
})
app.delete("/v1/reviews/:id", async (c) => {
  await sb(c, `reviews?id=eq.${c.req.param("id")}`, { method: "DELETE" })
  return c.json({ ok: true })
})

/* single product with variants + images (edit page) */
app.get("/v1/products/:id", async (c) => {
  type Full = Record<string, unknown> & { product_images: { position: number }[]; variants: unknown[] }
  const [rows] = (await sb(c, `products?id=eq.${c.req.param("id")}&select=*,product_images(*),variants(*)`)) as [Full?]
  if (!rows) return c.json({ error: "not_found" }, 404)
  rows.product_images = [...rows.product_images].sort(
    (a, b) => (a as { position: number }).position - (b as { position: number }).position
  )
  return c.json(rows)
})

/* create product */
app.post("/v1/products", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const title = str(body.title, 160)?.trim()
  const handle = str(body.handle, 120)?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  if (!title || !handle) return c.json({ error: "bad_product" }, 400)
  const collection = ["iphone", "samsung", "accessories"].includes(String(body.collection)) ? String(body.collection) : "accessories"
  const brand = ["apple", "samsung", "accessory"].includes(String(body.brand)) ? String(body.brand) : "accessory"
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 12) : []
  const colors = Array.isArray(body.colors) ? body.colors.filter((t): t is string => typeof t === "string").slice(0, 12) : []
  const category_id = str(body.category_id, 64) ?? null
  const rows = (await sb(c, "products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      title, handle,
      description: str(body.description, 2000) ?? "",
      collection, brand, tags, colors,
      badges: str(body.badges, 120) ?? "",
      category_id,
    }]),
  })) as unknown[]
  if (!rows[0]) return c.json({ error: "handle_taken" }, 409)
  return c.json({ ok: true, product: rows[0] })
})

/* delete product (variants + images cascade) */
app.delete("/v1/products/:id", async (c) => {
  await sb(c, `products?id=eq.${c.req.param("id")}`, { method: "DELETE" })
  return c.json({ ok: true })
})

/* variants */
app.post("/v1/variants", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const product_id = str(body.product_id, 64)
  const title = str(body.title, 60)?.trim()
  const price_inr = num(body.price_inr, 0, 10000000)
  if (!product_id || !title || price_inr === null) return c.json({ error: "bad_variant" }, 400)
  const skuBase = str(body.sku, 120)?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || `${Date.now().toString(36)}`
  const rows = (await sb(c, "variants", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      product_id, title, sku: `${skuBase.slice(0, 100)}`,
      price_inr: Math.floor(price_inr),
      price_usd: num(body.price_usd, 0, 1000000) ?? 0,
      inventory_qty: Math.floor(num(body.inventory_qty, 0, 1000000) ?? 100),
    }]),
  })) as unknown[]
  return c.json({ ok: true, variant: rows[0] ?? null })
})
app.delete("/v1/variants/:id", async (c) => {
  await sb(c, `variants?id=eq.${c.req.param("id")}`, { method: "DELETE" })
  return c.json({ ok: true })
})

/* images: add by URL, or upload a file (5MB cap, images only) */
app.post("/v1/images", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const product_id = str(body.product_id, 64)
  const url = str(body.url, 500)
  if (!product_id || !url || !/^https:\/\//.test(url)) return c.json({ error: "bad_image" }, 400)
  const existing = (await sb(c, `product_images?product_id=eq.${product_id}&select=position&order=position.desc&limit=1`)) as { position: number }[]
  const rows = (await sb(c, "product_images", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ product_id, url, position: (existing[0]?.position ?? -1) + 1 }]),
  })) as unknown[]
  return c.json({ ok: true, image: rows[0] ?? null })
})
app.post("/v1/uploads", async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    return c.json({ error: "bad_upload" }, 400)
  }
  const ext = (file.type.split("/")[1] ?? "webp").replace(/[^a-z]/g, "").slice(0, 4) || "webp"
  const name = `uploads/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const put = await fetch(`${c.env.SUPABASE_URL}/storage/v1/object/product-images/${name}`, {
    method: "POST",
    headers: {
      apikey: c.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file.stream(),
  })
  if (!put.ok) return c.json({ error: "upload_failed" }, 502)
  return c.json({ ok: true, url: `${c.env.SUPABASE_URL}/storage/v1/object/public/product-images/${name}` })
})
app.delete("/v1/images/:id", async (c) => {
  await sb(c, `product_images?id=eq.${c.req.param("id")}`, { method: "DELETE" })
  return c.json({ ok: true })
})

/* categories */
app.get("/v1/categories", async (c) => {
  return c.json(await sb(c, "categories?select=id,name,handle,description&order=name"))
})
app.patch("/v1/categories/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  const name = str(body.name, 120)?.trim()
  if (name) patch.name = name
  const description = str(body.description, 2000)
  if (description !== null) patch.description = description
  if (!Object.keys(patch).length) return c.json({ error: "nothing_to_update" }, 400)
  await sb(c, `categories?id=eq.${c.req.param("id")}`, { method: "PATCH", body: JSON.stringify(patch) })
  return c.json({ ok: true })
})

/* single order */
app.get("/v1/orders/:id", async (c) => {
  const [row] = (await sb(c, `orders?id=eq.${c.req.param("id")}&select=*`)) as unknown[]
  if (!row) return c.json({ error: "not_found" }, 404)
  return c.json(row)
})

/* coupons — admin-managed; checkout validates against this table */
app.get("/v1/coupons", async (c) => {
  return c.json(await sb(c, "coupons?select=id,code,percent,active,created_at&order=created_at.desc&limit=100"))
})
app.post("/v1/coupons", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const code = str(body.code, 32)?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  const percent = num(body.percent, 1, 90)
  if (!code || percent === null) return c.json({ error: "bad_coupon" }, 400)
  const rows = (await sb(c, "coupons", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ code, percent: Math.floor(percent) }]),
  })) as unknown[]
  if (!rows[0]) return c.json({ error: "code_taken" }, 409)
  return c.json({ ok: true, coupon: rows[0] })
})
app.patch("/v1/coupons/:id", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (typeof body.active === "boolean") patch.active = body.active
  const percent = body.percent === undefined ? undefined : num(body.percent, 1, 90)
  if (percent !== undefined) {
    if (percent === null) return c.json({ error: "bad_coupon" }, 400)
    patch.percent = Math.floor(percent)
  }
  if (!Object.keys(patch).length) return c.json({ error: "nothing_to_update" }, 400)
  await sb(c, `coupons?id=eq.${c.req.param("id")}`, { method: "PATCH", body: JSON.stringify(patch) })
  return c.json({ ok: true })
})
app.delete("/v1/coupons/:id", async (c) => {
  await sb(c, `coupons?id=eq.${c.req.param("id")}`, { method: "DELETE" })
  return c.json({ ok: true })
})

/* ── checkout: prices always recomputed server-side, never trusted ── */
const FREE_SHIP_AT = 999
const SHIP_FLAT = 99
const SHIP_EXPRESS = 299

interface CheckoutItem {
  variant_id: string
  qty: number
}

app.post("/v1/checkout/orders", async (c) => {
  const ip = ipOf(c)
  if (!limited(`co:${ip}`, 10, 60_000)) return c.json({ error: "rate_limited" }, 429)
  const body = (await c.req.json().catch(() => ({}))) as {
    items?: CheckoutItem[]
    email?: string
    name?: string
    phone?: string
    address?: Record<string, string>
    shipping?: string
    coupon?: string
    method?: string
  }
  const email = str(body.email, 160)?.trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "bad_email" }, 400)
  const items = (body.items ?? []).filter(
    (i): i is CheckoutItem =>
      typeof i?.variant_id === "string" && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 10
  )
  if (!items.length) return c.json({ error: "empty_cart" }, 400)
  const method = body.method === "manual" ? "manual" : "razorpay"
  if (method === "razorpay" && (!c.env.RAZORPAY_KEY_ID || !c.env.RAZORPAY_KEY_SECRET)) {
    return c.json({ error: "payments_offline" }, 503)
  }

  // authoritative price + stock check
  const ids = [...new Set(items.map((i) => i.variant_id))]
  const variants = (await sb(c, `variants?id=in.(${ids.join(",")})&select=id,title,price_inr,inventory_qty,product_id,products(title,category_id)`)) as {
    id: string; title: string; price_inr: number; inventory_qty: number; product_id: string
    products: { title: string; category_id: string | null } | null
  }[]
  if (variants.length !== ids.length) return c.json({ error: "bad_variant" }, 400)
  const byId = new Map(variants.map((v) => [v.id, v]))
  const lines = items.map((i) => {
    const v = byId.get(i.variant_id)!
    return { title: v.products?.title ?? "Flowcase", variant: v.title, qty: i.qty, price: v.price_inr, variant_id: v.id }
  })
  const short = lines.find((l) => {
    const v = byId.get(l.variant_id)!
    return v.inventory_qty < l.qty
  })
  if (short) return c.json({ error: "out_of_stock", title: short.title }, 409)
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const express = body.shipping === "express"
  const shipping = express ? SHIP_EXPRESS : subtotal >= FREE_SHIP_AT ? 0 : SHIP_FLAT
  // REUSE10 and friends live in the coupons table — validated here, never trusted
  const rawCoupon = str(body.coupon, 32)?.trim().toUpperCase() ?? ""
  let coupon: string | null = null
  let discount = 0
  if (rawCoupon) {
    const hits = (await sb(c, `coupons?code=eq.${encodeURIComponent(rawCoupon)}&select=${COUPON_COLS}&limit=1`)) as CouponRow[]
    const cp = hits[0]
    if (cp) {
      const productIds = lines.map((l) => byId.get(l.variant_id)!.product_id)
      const categoryIds = [...new Set(lines.map((l) => byId.get(l.variant_id)!.products?.category_id).filter(Boolean))] as string[]
      let liveCount: number | undefined
      if (cp.max_redemptions > 0)
        liveCount = ((await sb(c, `orders?coupon_code=eq.${encodeURIComponent(rawCoupon)}&status=in.(pending,paid)&select=id&limit=1000`)) as unknown[]).length
      let usedByUser: number | undefined
      if (cp.per_user_limit > 0)
        usedByUser = ((await sb(c, `orders?email=eq.${encodeURIComponent(email)}&coupon_code=eq.${encodeURIComponent(rawCoupon)}&status=in.(pending,paid)&select=id&limit=1000`)) as unknown[]).length
      const unitPrices: { pid: string; cid: string | null; price: number }[] = []
      let eligibleQty = 0
      for (const l of lines) {
        const v = byId.get(l.variant_id)!
        for (let n = 0; n < l.qty; n++) {
          unitPrices.push({ pid: v.product_id, cid: v.products?.category_id ?? null, price: v.price_inr })
        }
        if (cp.applies_to === "all" ||
            (cp.applies_to === "products" && cp.product_ids.includes(v.product_id)) ||
            (cp.applies_to === "categories" && (v.products?.category_id ?? null) !== null && cp.category_ids.includes(v.products!.category_id as string)))
          eligibleQty += l.qty
      }
      const ev = evalCoupon(cp, { subtotal, shipping, productIds, categoryIds, state: "new", liveCount, usedByUser, unitPrices, eligibleQty })
      if (ev.valid) {
        coupon = rawCoupon
        discount = ev.discount
      }
    }
  }
  const total = subtotal + shipping - discount

  const created = (await sb(c, "orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      email, name: str(body.name, 120) ?? "", phone: str(body.phone, 20) ?? "",
      address: body.address && typeof body.address === "object" ? body.address : {},
      items: lines, subtotal, shipping, total, currency: "inr",
      payment_method: method, state: "new",
      coupon_code: coupon ?? "", discount,
    }]),
  })) as { id: string }[]
  const order = created[0]
  if (!order) return c.json({ error: "order_failed" }, 500)

  // customer record for the admin CRM (non-fatal; merge keeps admin-edited fields)
  await sb(c, "customers?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{
      email,
      ...(str(body.name, 120) ? { name: str(body.name, 120) } : {}),
      ...(str(body.phone, 20) ? { phone: str(body.phone, 20) } : {}),
      last_order_at: new Date().toISOString(),
    }]),
  }).catch(() => null)

  if (method === "manual") return c.json({ ok: true, orderId: order.id, amount: total, manual: true })

  const rzp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: total * 100, currency: "INR", receipt: order.id.slice(0, 40) }),
  })
  if (!rzp.ok) {
    await sb(c, `orders?id=eq.${order.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed" }) })
    return c.json({ error: "gateway_failed" }, 502)
  }
  const rz = (await rzp.json()) as { id: string }
  await sb(c, `orders?id=eq.${order.id}`, { method: "PATCH", body: JSON.stringify({ razorpay_order_id: rz.id }) })
  return c.json({ ok: true, orderId: order.id, razorpayOrderId: rz.id, amount: total, keyId: c.env.RAZORPAY_KEY_ID })
})

app.post("/v1/checkout/verify", async (c) => {
  const ip = ipOf(c)
  if (!limited(`cv:${ip}`, 20, 60_000)) return c.json({ error: "rate_limited" }, 429)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const orderId = str(body.orderId, 64)
  const rzOrder = str(body.razorpay_order_id, 64)
  const rzPayment = str(body.razorpay_payment_id, 64)
  const signature = str(body.razorpay_signature, 256)
  if (!orderId || !rzOrder || !rzPayment || !signature || !c.env.RAZORPAY_KEY_SECRET) {
    return c.json({ error: "bad_verify" }, 400)
  }
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(c.env.RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  )
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${rzOrder}|${rzPayment}`))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")
  if (hex !== signature) {
    await sb(c, `orders?id=eq.${orderId}`, { method: "PATCH", body: JSON.stringify({ status: "failed" }) })
    return c.json({ error: "bad_signature" }, 400)
  }
  const [order] = (await sb(c, `orders?id=eq.${orderId}&select=id,items,status`)) as {
    id: string; items: { variant_id: string; qty: number }[]; status: string
  }[]
  if (!order || order.status === "paid") return c.json({ ok: true, already: true })
  for (const line of order.items ?? []) {
    const ok = await sb(c, "rpc/decrement_stock", {
      method: "POST",
      body: JSON.stringify({ p_variant_id: line.variant_id, p_qty: line.qty }),
    }).catch(() => false)
    if (ok !== true) {
      await sb(c, `orders?id=eq.${orderId}`, { method: "PATCH", body: JSON.stringify({ status: "failed" }) })
      return c.json({ error: "out_of_stock" }, 409)
    }
  }
  await sb(c, `orders?id=eq.${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paid", razorpay_payment_id: rzPayment }),
  })
  return c.json({ ok: true })
})

/* daily revenue/orders series for the dashboard sparkline (last N days) */
app.get("/v1/stats/daily", async (c) => {
  const days = Math.min(Math.max(Number(c.req.query("days") ?? 14) || 14, 2), 90)
  const rows = (await sb(c,
    `orders?select=total,status,created_at&created_at=gte.${new Date(Date.now() - days * 86400000).toISOString()}&order=created_at&limit=2000`
  )) as { total: number; status: string; created_at: string }[]
  const byDay = new Map<string, { revenue: number; orders: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    byDay.set(d, { revenue: 0, orders: 0 })
  }
  for (const o of rows) {
    const d = o.created_at.slice(0, 10)
    const slot = byDay.get(d)
    if (!slot) continue
    slot.orders += 1
    if (o.status === "paid") slot.revenue += o.total || 0
  }
  return c.json([...byDay].map(([date, v]) => ({ date, ...v })))
})

/* low-stock variants + top products by paid revenue (dashboard ops) */
app.get("/v1/stats/alerts", async (c) => {
  const threshold = Math.min(Math.max(Number(c.req.query("threshold") ?? 10) || 10, 1), 100)
  const [low, orders] = await Promise.all([
    sb(c, `variants?select=id,title,inventory_qty,price_inr,products(title)&inventory_qty=lt.${threshold}&order=inventory_qty&limit=20`),
    sb(c, `orders?select=items&status=eq.paid&limit=1000`),
  ])
  const sales = new Map<string, { title: string; qty: number; revenue: number }>()
  for (const o of (orders ?? []) as { items: { title?: string; qty?: number; price?: number }[] }[]) {
    for (const i of o.items ?? []) {
      if (!i.title) continue
      const s = sales.get(i.title) ?? { title: i.title, qty: 0, revenue: 0 }
      s.qty += i.qty ?? 1
      s.revenue += (i.price ?? 0) * (i.qty ?? 1)
      sales.set(i.title, s)
    }
  }
  return c.json({
    lowStock: low,
    topProducts: [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  })
})

/* site settings (announcement bar, promo modal, admin theme, social/billing/ops) */
const SETTING_KEYS = ["announcement", "promo", "admin_theme", "social", "billing", "ops"] as const
app.get("/v1/settings", async (c) => {
  const rows = (await sb(c, "site_settings?select=key,value")) as { key: string; value: unknown }[]
  return c.json(Object.fromEntries(rows.map((r) => [r.key, r.value])))
})
app.patch("/v1/settings/:key", async (c) => {
  const key = c.req.param("key")
  if (!(SETTING_KEYS as readonly string[]).includes(key)) return c.json({ error: "bad_key" }, 400)
  const value = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!value || typeof value !== "object" || Array.isArray(value)) return c.json({ error: "bad_value" }, 400)
  // upsert, not PATCH — a PATCH on a missing key silently no-ops
  await sb(c, "site_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
  })
  return c.json({ ok: true })
})

export default app

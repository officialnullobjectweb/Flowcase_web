/**
 * Flowcase -> Supabase migration (idempotent — safe to re-run).
 * 1. Downloads every Medusa product image, converts to high-quality WebP (q85),
 *    uploads to the public `product-images` storage bucket.
 * 2. Upserts categories, products, images, variants into Postgres.
 *
 * Run: node supabase/migrate.mjs
 * Needs: local Medusa on :9000, storefront .env.local (Supabase keys).
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pg = require("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/backend/node_modules/pg")
const sharp = require("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/node_modules/sharp")

const { Client } = pg
const MEDUSA = "http://localhost:9000"
const CONCURRENCY = 6

const envFile = (p) =>
  Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
  )
const sf = envFile("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/.env.local")
const SUPABASE_URL = sf.SUPABASE_URL
const SERVICE_KEY = sf.SUPABASE_SERVICE_ROLE_KEY
const PK = sf.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const api = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(opts.headers || {}) },
  })
  if (!res.ok && res.status !== 409) throw new Error(`${path} -> ${res.status}: ${(await res.text()).slice(0, 120)}`)
  return res
}

const brandOf = (p) => {
  const tags = (p.tags ?? []).map((t) => t.value.toLowerCase())
  if (tags.includes("samsung")) return "samsung"
  if (tags.includes("apple")) return "apple"
  if (/galaxy|samsung/i.test(p.title)) return "samsung"
  if (/iphone/i.test(p.title)) return "apple"
  return "accessory"
}
const collectionOf = (p) => {
  const cats = ((p.categories ?? []).map((c) => c.handle) ?? []).join(" ")
  if (/magsafe|airpods|speaker|power|cable/i.test(cats)) return "accessories"
  if (brandOf(p) === "apple") return "iphone"
  if (brandOf(p) === "samsung") return "samsung"
  return "accessories"
}

// --- WebP pipeline (memory-only, deterministic names) ---
const webpFor = async (src) => {
  const name = createHash("sha256").update(src).digest("hex").slice(0, 32) + ".webp"
  const path = `products/${name}`
  const head = await fetch(`${SUPABASE_URL}/storage/v1/object/info/product-images/${path}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (head.ok) return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
  const dl = await fetch(src)
  if (!dl.ok) throw new Error(`download ${dl.status} ${src.slice(0, 80)}`)
  const buf = Buffer.from(await dl.arrayBuffer())
  const webp = await sharp(buf).rotate().webp({ quality: 85, effort: 6 }).toBuffer()
  await api(`/storage/v1/object/product-images/${path}`, {
    method: "POST",
    headers: { "Content-Type": "image/webp", "x-upsert": "true" },
    body: webp,
  })
  console.log(`  webp ${(webp.length / 1024).toFixed(0)}KB <- ${(buf.length / 1024).toFixed(0)}KB ${name.slice(0, 12)}`)
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
}

const pool = async (items, fn) => {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const n = i++
        out[n] = await fn(items[n], n)
      }
    })
  )
  return out
}

const main = async () => {
  await api("/storage/v1/bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "product-images", public: true }),
  }).catch(() => {})
  console.log("bucket ok")

  const regions = await fetch(`${MEDUSA}/store/regions?limit=10`, {
    headers: { "x-publishable-api-key": PK },
  }).then((r) => r.json())
  const inr = regions.regions.find((r) => r.currency_code === "inr").id
  const usdReg = regions.regions.find((r) => r.currency_code === "usd")
  const FIELDS = "id,title,handle,description,thumbnail,images.url,tags.value,categories.handle,metadata,variants.title,variants.sku,variants.calculated_price";
  const q = (rid) => fetch(
    `${MEDUSA}/store/products?limit=100&region_id=${rid}&fields=${FIELDS}`,
    { headers: { "x-publishable-api-key": PK } }
  ).then((r) => r.json()).then((d) => d.products)
  const products = await q(inr)
  const usdMap = {}
  if (usdReg) {
    for (const p of await q(usdReg.id))
      for (const v of p.variants ?? [])
        usdMap[`${p.handle}::${v.title}`] = v.calculated_price?.calculated_amount ?? 0
  }
  console.log(`medusa products: ${products.length}`)

  // unique source images -> webp urls
  const sources = [...new Set(products.flatMap((p) => [p.thumbnail, ...(p.images ?? []).map((im) => im.url)].filter(Boolean)))]
  console.log(`unique images: ${sources.length}`)
  const webpUrls = await pool(sources, webpFor)
  const webpOf = Object.fromEntries(sources.map((s, i) => [s, webpUrls[i]]))

  const db = new Client({ connectionString: envFile("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/backend/.env").DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  // Medusa store API doesn't expose categories — derive from handles (stable).
  const catOf = (handle) => {
    if (handle.includes("speaker")) return ["Speakers", "speakers"]
    if (handle.includes("power") || handle.includes("volt")) return ["Powerbank", "powerbank"]
    if (handle.includes("cable") || handle.includes("braid") || handle.includes("coil")) return ["Cables", "cables"]
    if (handle.includes("magsafe")) return ["MagSafe Cases", "magsafe-cases"]
    if (handle.includes("airpods")) return ["AirPods Cases", "airpods-cases"]
    return ["Phone case", "phone-case"]
  }
  const catIds = {}
  for (const [name, handle] of [...new Set(products.map((p) => catOf(p.handle)).map(JSON.stringify))].map(JSON.parse)) {
    const r = await db.query(
      `insert into categories (name, handle) values ($1, $2)
       on conflict (handle) do update set name = excluded.name returning id`,
      [name, handle]
    )
    catIds[handle] = r.rows[0].id
  }
  console.log(`categories: ${Object.keys(catIds).length}`)

  let np = 0, ni = 0, nv = 0
  for (const p of products) {
    const md = p.metadata ?? {}
    const colors = String(md.colors ?? "").split(",").map((c) => c.trim()).filter(Boolean)
    const catHandle = catOf(p.handle)[1]
    const pr = await db.query(
      `insert into products (title, handle, description, collection, brand, tags, colors, badges, rating, review_count, category_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (handle) do update set title=excluded.title, description=excluded.description,
         collection=excluded.collection, brand=excluded.brand, tags=excluded.tags, colors=excluded.colors,
         badges=excluded.badges, rating=excluded.rating, review_count=excluded.review_count,
         category_id=excluded.category_id returning id`,
      [p.title, p.handle, (p.description ?? "").slice(0, 2000), collectionOf(p), brandOf(p),
       (p.tags ?? []).map((t) => t.value), colors, String(md.badges ?? ""),
       Number(md.rating ?? 0), Number(md.review_count ?? 0), catHandle ? catIds[catHandle] : null]
    )
    const pid = pr.rows[0].id
    np++
    const gallery = [p.thumbnail, ...(p.images ?? []).map((im) => im.url)]
      .filter(Boolean).filter((u, idx, arr) => arr.indexOf(u) === idx).slice(0, 4)
    await db.query(`update products set thumbnail_webp = $2 where id = $1`, [pid, webpOf[gallery[0]]])
    await db.query(`delete from product_images where product_id = $1`, [pid])
    for (let k = 0; k < gallery.length; k++) {
      await db.query(`insert into product_images (product_id, url, position) values ($1,$2,$3)`, [pid, webpOf[gallery[k]], k])
      ni++
    }
    for (const v of p.variants ?? []) {
      const cp = v.calculated_price ?? {}
      await db.query(
        `insert into variants (product_id, title, sku, price_inr, price_usd)
         values ($1,$2,$3,$4,$5) on conflict (sku) do update set
         title=excluded.title, price_inr=excluded.price_inr, price_usd=excluded.price_usd`,
        [pid, v.title ?? "Default", v.sku ?? `${p.handle}-${(v.title ?? "d").toLowerCase()}`, cp.calculated_amount ?? 0, usdMap[`${p.handle}::${v.title}`] ?? 0]
      )
      nv++
    }
  }
  console.log(`migrated: ${np} products, ${ni} images, ${nv} variants`)
  await db.end()
}

main().catch((e) => { console.error("MIGRATION FAIL:", e.message); process.exit(1) })

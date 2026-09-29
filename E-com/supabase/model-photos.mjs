/**
 * Model-photo pipeline: downloads the user-provided phone photos, converts to
 * WebP, uploads to Supabase storage (models/), and assigns one per phone-case
 * product as the lead gallery image (3-image galleries: model + 2 case shots).
 * Idempotent — reuses uploaded files by URL hash, skips existing products.
 *
 * Run: node supabase/model-photos.mjs
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pg = require("./node_modules/pg")
const sharp = require("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/node_modules/sharp")

const { Client } = pg
const ef = (p) =>
  Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      })
  )
const sf = ef("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/.env")
const SUPABASE_URL = sf.SUPABASE_URL
const SERVICE_KEY = sf.SUPABASE_SERVICE_ROLE_KEY
const MEDUSA = "http://localhost:9000"
const PK = sf.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

// user-provided model photos (labels normalized)
const PHOTOS = {
  "iPhone 15": "https://rukminim3.flixcart.com/image/480/640/xif0q/mobile/k/l/l/-resized-original-imagtc5fz9spysyk.jpeg?q=90",
  "iPhone 15 Plus": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBlFF5Rp2j9TgwQmi7rjKqSfa36bpZT-2avovQPJuuDA&s=10",
  "iPhone 15 Pro": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS76D9t63VUfuTR_0zRPu7vZg7r7YBuSDdkghKqelICZg&s=10",
  "iPhone 15 Pro Max": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdVJVfgOoAfdxCWlNIO-L-r04DvuwoUXKJ-zM0B1fb5A&s=10",
  "iPhone 16": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFjy2Hi9YNbDObk-vRQ1SvH_rDSeNFTCCcciOQGIHwgA&s",
  "iPhone 16 Plus": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaNWinu_WiMPuqvHXAPsjR5vwZQFjF1DIpQwjnLPjDQw&s=10",
  "iPhone 16 Pro": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaHAPIprq5sl9DeAWmuPraXslbEQFZqpRjldREtPMaGw&s",
  "iPhone 16 Pro Max": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTN34uzeitxVtkIhWxZZ5Gb5hiiCKFJ-khUx0AtK9FHqA&s=10",
  "iPhone 17": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR-DugIe92jkH_nd-HHJTn8H2Gy_uOwxF2xPFP4QCekQ&s=10",
  "iPhone 17 Pro": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1jG7djnWgE42t6DJ-3r8iynlRYuT3f1JsL5PjIAFA1w&s",
  "iPhone 17 Pro Max": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR2tr245AKSrsBFjfwZ7hwGwq-Np8Zsz1WdTiIR9nigQ&s=10",
  "Galaxy A26": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShIi7qMYUcgAXb_HFz9BKujHB_xjTQdmXNTi7X7iAk8A&s=10",
  "Galaxy A36": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjPRWWSLgCFh_OoShfTMJtVn3Mgz7GFgMcjPcq8Ioddw&s=10",
  "Galaxy A56": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVJxdkrggDWY0xLITV51pQxaPsnsKIf3xVxjMVkxlsHg&s=10",
  "Galaxy S25 FE": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdha04kw7E7uBcyzNriRBi5xGb319uyzbC5ecRrjRZCA&s=10",
  "Galaxy S25+": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFCqiyjAe1DxEYG_2wtocgmrXyOAaHcrerMJGwnnPD5Q&s=10",
  "Galaxy S25 Ultra": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA1Hpr6Rct3hGnW-FF1r5RC6m8_7lEb6W9kD49K8q1JA&s=10",
  "Galaxy S25": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1Yl7gQY8s-qrKqodrR3Lr6_-pKXG3CG2maomPSM7N9Q&s=10",
}

// model label as it appears in product titles ("Flowcase for X" / "Flowcase MagSafe for X")
const modelOf = (title) =>
  title.replace(/^Flowcase (MagSafe )?for\s+/i, "").trim()

const api = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res
}

const main = async () => {
  // 1. upload model photos
  const uploaded = {}
  for (const [label, src] of Object.entries(PHOTOS)) {
    const name = `models/${createHash("sha256").update(src).digest("hex").slice(0, 32)}.webp`
    const head = await fetch(`${SUPABASE_URL}/storage/v1/object/info/product-images/${name}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}` },
    })
    if (head.ok) {
      uploaded[label] = `${SUPABASE_URL}/storage/v1/object/public/product-images/${name}`
      console.log(`reuse ${label}`)
      continue
    }
    const dl = await fetch(src, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.google.com/" } })
    if (!dl.ok) throw new Error(`download ${dl.status} ${label}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const webp = await sharp(buf).rotate().webp({ quality: 85, effort: 6 }).toBuffer()
    await api(`/storage/v1/object/product-images/${name}`, {
      method: "POST",
      headers: { "Content-Type": "image/webp", "x-upsert": "true" },
      body: webp,
    })
    uploaded[label] = `${SUPABASE_URL}/storage/v1/object/public/product-images/${name}`
    console.log(`up ${label} ${(webp.length / 1024).toFixed(0)}KB`)
  }

  // 2. assign: phone-case products get [model, case, case] (exactly 3)
  const be = ef("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/.env")
  const db = new Client({ connectionString: be.SUPABASE_DB_POOLER_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const { rows: products } = await db.query(`select id, title, thumbnail_webp from products`)
  let n = 0
  for (const p of products) {
    if (!/^Flowcase (MagSafe )?for (iPhone|Galaxy)/i.test(p.title)) continue
    const model = modelOf(p.title)
    const modelUrl = uploaded[model]
    if (!modelUrl) {
      console.log(`no photo for model: ${model}`)
      continue
    }
    const { rows: imgs } = await db.query(
      `select url from product_images where product_id = $1 order by position`, [p.id]
    )
    const cases = imgs.map((r) => r.url).filter((u) => !u.includes("/models/")).slice(0, 2)
    const gallery = [modelUrl, ...cases].slice(0, 3)
    await db.query(`delete from product_images where product_id = $1`, [p.id])
    for (let k = 0; k < gallery.length; k++) {
      await db.query(`insert into product_images (product_id, url, position) values ($1,$2,$3)`, [p.id, gallery[k], k])
    }
    await db.query(`update products set thumbnail_webp = $2 where id = $1`, [p.id, gallery[0]])
    n++
  }
  console.log(`re-galleried ${n} phone-case products`)
  await db.end()
  // print map for nav wiring
  console.log("MODEL_MAP=" + JSON.stringify(uploaded, null, 0).slice(0, 120) + "...")
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })

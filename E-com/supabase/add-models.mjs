/** One-off: add the 3 real missing models (iPhone 15 Plus, 16 Plus, Galaxy S25 FE). */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const pg = require("./node_modules/pg")

const { Client } = pg
const ef = (p) =>
  Object.fromEntries(
    readFileSync(p, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)] })
  )
const sf = ef("/Users/karandhiver/Developer/hero/mindup-game/E-com/apps/storefront/.env")
const SB = sf.SUPABASE_URL

const SRC = {
  "iPhone 15 Plus": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSBlFF5Rp2j9TgwQmi7rjKqSfa36bpZT-2avovQPJuuDA&s=10",
  "iPhone 16 Plus": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaNWinu_WiMPuqvHXAPsjR5vwZQFjF1DIpQwjnLPjDQw&s=10",
  "Galaxy S25 FE": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdha04kw7E7uBcyzNriRBi5xGb319uyzbC5ecRrjRZCA&s=10",
}
const modelUrl = (label) =>
  `${SB}/storage/v1/object/public/product-images/models/${createHash("sha256").update(SRC[label]).digest("hex").slice(0, 32)}.webp`

const NEW = [
  { title: "Flowcase for iPhone 15 Plus", handle: "flowcase-iphone-15-plus", brand: "apple", collection: "iphone",
    category: "phone-case", tags: ["apple", "iphone", "plus"], priceInr: 1599, priceUsd: 24,
    colors: ["Sand", "Onyx"], rating: 4.6, reviews: 88,
    blurb: "Full-coverage case for iPhone 15 Plus. Big-screen protection with camera guard lip and Flowcase grip." },
  { title: "Flowcase for iPhone 16 Plus", handle: "flowcase-iphone-16-plus", brand: "apple", collection: "iphone",
    category: "phone-case", tags: ["apple", "iphone", "plus", "new"], priceInr: 1699, priceUsd: 25,
    colors: ["Ocean", "Onyx"], rating: 4.7, reviews: 64,
    blurb: "Slim armor for iPhone 16 Plus with Camera Control cutout and 2m drop protection." },
  { title: "Flowcase for Galaxy S25 FE", handle: "flowcase-galaxy-s25-fe", brand: "samsung", collection: "samsung",
    category: "phone-case", tags: ["samsung", "galaxy", "s-series", "new"], priceInr: 1499, priceUsd: 22,
    colors: ["Graphite", "Onyx"], rating: 4.5, reviews: 52,
    blurb: "Fan-edition fit for Galaxy S25 FE. Flagship feel, Flowcase durability, honest price." },
]

const main = async () => {
  const db = new Client({ connectionString: sf.SUPABASE_DB_POOLER_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  for (const p of NEW) {
    const model = p.title.replace(/^Flowcase for\s+/i, "")
    const { rows: ex } = await db.query(`select id from products where handle = $1`, [p.handle])
    if (ex.length) {
      console.log(`exists ${p.handle}`)
      continue
    }
    const { rows: [cat] } = await db.query(`select id from categories where handle = $1`, [p.category])
    // case photos: reuse two category sibling shots for texture variety
    const { rows: sibs } = await db.query(
      `select i.url from product_images i join products pr on pr.id = i.product_id
       where pr.collection = $1 and i.position > 0 order by pr.created_at limit 2`, [p.collection])
    const gallery = [modelUrl(model), ...sibs.map((r) => r.url)].slice(0, 3)
    const { rows: [prod] } = await db.query(
      `insert into products (title, handle, description, collection, brand, tags, colors, badges, rating, review_count, category_id, thumbnail_webp)
       values ($1,$2,$3,$4,$5,$6,$7,'new',$8,$9,$10,$11) returning id`,
      [p.title, p.handle, p.blurb, p.collection, p.brand, p.tags, p.colors, p.rating, p.reviews, cat?.id ?? null, gallery[0]])
    for (let k = 0; k < gallery.length; k++) {
      await db.query(`insert into product_images (product_id, url, position) values ($1,$2,$3)`, [prod.id, gallery[k], k])
    }
    for (const color of p.colors) {
      await db.query(
        `insert into variants (product_id, title, sku, price_inr, price_usd, inventory_qty)
         values ($1,$2,$3,$4,$5,100)`,
        [prod.id, color, `${p.handle}-${color.toLowerCase()}`, p.priceInr, p.priceUsd])
    }
    console.log(`created ${p.handle}`)
  }
  await db.end()
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })

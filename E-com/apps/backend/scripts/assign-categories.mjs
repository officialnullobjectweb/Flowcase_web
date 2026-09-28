/**
 * One-off: link every product to its admin category (Products → Categories),
 * derived from the product tags the seeds already carry. Shop chips read
 * /store/product-categories, so this is what makes them admin-managed.
 * Usage: node scripts/assign-categories.mjs              (local :5433)
 *        DATABASE_URL=postgres://... node scripts/assign-categories.mjs  (prod)
 */
import pgpkg from "pg"

const CATS = {
  "magsafe-cases": null,
  "airpods-cases": null,
  cables: null,
  powerbank: null,
  speakers: null,
  "phone-case": null,
}

function categoryFor(tags) {
  const t = new Set(tags.map((v) => v.toLowerCase()))
  if (t.has("magsafe")) return "magsafe-cases"
  if (t.has("airpods")) return "airpods-cases"
  if (t.has("cable") || t.has("cables")) return "cables"
  if (t.has("powerbank") || t.has("power-bank")) return "powerbank"
  if (t.has("speaker") || t.has("speakers")) return "speakers"
  return "phone-case"
}

const base = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : { host: "localhost", port: 5433, user: "postgres", password: "postgres", database: "flowcase" }

const client = new pgpkg.Client(base)
await client.connect()

// local category handles → ids
const { rows: cats } = await client.query(
  `SELECT id, handle FROM product_category WHERE deleted_at IS NULL`
)
const byHandle = Object.fromEntries(cats.map((c) => [c.handle, c.id]))
for (const h of Object.keys(CATS)) {
  if (!byHandle[h]) throw new Error(`missing category ${h}`)
}

const { rows: products } = await client.query(
  `SELECT p.id, p.handle, COALESCE(
     (SELECT array_agg(t.value) FROM product_tags pt
      JOIN product_tag t ON t.id = pt.product_tag_id WHERE pt.product_id = p.id), '{}'
   ) AS tags
   FROM product p WHERE p.deleted_at IS NULL ORDER BY p.handle`
)

let n = 0
for (const p of products) {
  const handle = categoryFor(p.tags)
  await client.query(`DELETE FROM product_category_product WHERE product_id = $1`, [p.id])
  await client.query(
    `INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2)`,
    [p.id, byHandle[handle]]
  )
  n++
  console.log(`${p.handle} → ${handle}`)
}
await client.end()
console.log(`categorized ${n} products`)

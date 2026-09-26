/**
 * One-off: stamp explicit product badge CSVs onto the live Flowcase DB.
 * Mirrors BADGES_BY_HANDLE in seed-flowcase.ts so reseeds stay consistent.
 * Usage: node scripts/stamp-badges.mjs   (from apps/backend)
 */
import pgpkg from "pg"

const BADGES_BY_HANDLE = {
  "flowcase-iphone-15-pro": "limited",
  "flowcase-iphone-15-pro-max": "bestseller",
  "flowcase-iphone-16": "trending",
  "flowcase-iphone-16-pro": "sale",
  "flowcase-iphone-17": "new",
  "flowcase-iphone-17-pro": "new",
  "flowcase-iphone-17-pro-max": "trending",
  "flowcase-galaxy-a56": "budget",
  "flowcase-galaxy-a36": "budget",
  "flowcase-galaxy-s25": "bestseller",
  "flowcase-galaxy-s25-plus": "trending",
  "flowcase-galaxy-s25-ultra": "limited",
}

const { Client } = pgpkg
const client = new Client({
  host: "localhost",
  port: 5433,
  user: "postgres",
  password: "postgres",
  database: "flowcase",
})

await client.connect()
let stamped = 0
for (const [handle, badges] of Object.entries(BADGES_BY_HANDLE)) {
  const { rowCount } = await client.query(
    `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('badges', $1::text)
     WHERE handle = $2`,
    [badges, handle]
  )
  if (rowCount) {
    stamped += rowCount
    console.log(`${handle} → ${badges}`)
  } else {
    console.warn(`skip (not found): ${handle}`)
  }
}
await client.end()
console.log(`stamped ${stamped} products`)

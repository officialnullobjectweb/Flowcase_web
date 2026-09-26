/**
 * One-off: stamp editable review rows onto live product metadata.
 * Mirrors the seeded pool in storefront ReviewsSection so renders stay
 * identical, but after stamping they are editable in
 * Medusa admin → Products → Metadata (r1_name, r1_title, … r3_avatar).
 * Usage: node scripts/stamp-reviews.mjs   (from apps/backend)
 */
import pgpkg from "pg"

const SNIPPETS = [
  { name: "Ananya G.", title: "Snug fit, zero rattle", body: "The lip sits flush over the screen and the buttons don't mush. Feels like it shipped with the phone." },
  { name: "Vikram T.", title: "Dropped it twice already", body: "Corner-first onto tile both times — no cracks, just a small scuff. That's exactly what I paid for." },
  { name: "Sara L.", title: "Matte back beats glossy", body: "No fingerprint smear after a full day of messaging, and it doesn't slide off the gym bench." },
  { name: "Imran H.", title: "Camera ring is the detail", body: "Raised enough to protect the lens on a flat table, thin enough not to catch on pockets." },
  { name: "Priyanka D.", title: "Arrived in 48 hours", body: "Packed in cardboard with the REUSE10 return envelope. Exchanged my old case the same week." },
  { name: "Joseph M.", title: "Grip ribs actually grip", body: "One-hand scroll on the metro without the death grip. Slight texture, not sticky." },
  { name: "Lena K.", title: "Looks better in person", body: "Photos undersell the depth of the Onyx. Under sunlight it has a subtle brushed look." },
  { name: "Harsh V.", title: "Worth the premium", body: "Had a cheap TPU before this — buttons wore out in months. This still feels new after a year." },
]

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=faces",
]

const IMAGES = [
  "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541877944-ac82a091518a?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=80&auto=format&fit=crop",
]

/** Same algorithm as storefront seededPick (seeded on product id). */
function seededPick(seed, pool, count) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const out = []
  const used = new Set()
  for (let i = 0; i < count; i++) {
    const idx = (h + i * 7) % pool.length
    const pick = used.has(idx) ? (idx + 1) % pool.length : idx
    used.add(pick)
    out.push(pool[pick])
  }
  return out
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
const { rows } = await client.query(
  `SELECT id, handle, metadata FROM product WHERE handle LIKE 'flowcase-%' ORDER BY handle`
)
let stamped = 0
for (const row of rows) {
  const meta = row.metadata ?? {}
  const picks = seededPick(row.id, SNIPPETS, 3)
  let h = 0
  for (let i = 0; i < row.handle.length; i++) h = (h * 31 + row.handle.charCodeAt(i)) >>> 0
  const patch = {}
  picks.forEach((pick, i) => {
    const n = i + 1
    patch[`r${n}_name`] = pick.name
    patch[`r${n}_title`] = pick.title
    patch[`r${n}_body`] = pick.body
    patch[`r${n}_rating`] = String(Math.round(Number(meta.rating ?? 4.6)))
    patch[`r${n}_avatar`] = AVATARS[(h + i) % AVATARS.length]
    patch[`r${n}_image`] = IMAGES[(h + i) % IMAGES.length]
  })
  await client.query(
    `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
    [JSON.stringify(patch), row.id]
  )
  stamped += 1
  console.log(`${row.handle} → r1..r3`)
}
await client.end()
console.log(`stamped reviews on ${stamped} products`)

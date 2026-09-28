/**
 * One-off: stamp editable review rows onto live product metadata — content is
 * category-aware (mirrors storefront lib/pdp-copy.ts snippet pools) and each
 * review photo is the product's own gallery shot (unique per product).
 * Editable after stamping in Medusa admin → Products → Metadata
 * (r1_name, r1_title, … r3_image).
 * Usage: node scripts/stamp-reviews.mjs              (local :5433)
 *        DATABASE_URL=postgres://... node scripts/stamp-reviews.mjs  (prod)
 */
import pgpkg from "pg"

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=faces",
]

const POOLS = {
  "phone-case": [
    { name: "Ananya G.", title: "Snug fit, zero rattle", body: "The lip sits flush over the screen and the buttons don't mush. Feels like it shipped with the phone." },
    { name: "Vikram T.", title: "Dropped it twice already", body: "Corner-first onto tile both times — no cracks, just a small scuff. That's exactly what I paid for." },
    { name: "Sara L.", title: "Matte back beats glossy", body: "No fingerprint smear after a full day of messaging, and it doesn't slide off the gym bench." },
    { name: "Imran H.", title: "Camera ring is the detail", body: "Raised enough to protect the lens on a flat table, thin enough not to catch on pockets." },
    { name: "Joseph M.", title: "Grip ribs actually grip", body: "One-hand scroll on the metro without the death grip. Slight texture, not sticky." },
    { name: "Harsh V.", title: "Worth the premium", body: "Had a cheap TPU before this — buttons wore out in months. This still feels new after a year." },
  ],
  "magsafe-cases": [
    { name: "Ananya G.", title: "The magnet is the real thing", body: "Wallet snaps on and stays on over speed breakers. No creep, no sag, no sliding around." },
    { name: "Vikram T.", title: "Charges without removing", body: "Drop it on the car mount or the desk pad and it just aligns. I stopped taking the case off entirely." },
    { name: "Imran H.", title: "Slim despite the ring", body: "You can't feel the magnet ring inside — profile is the same as my old non-MagSafe case." },
    { name: "Priyanka D.", title: "Arrived in 48 hours", body: "Packed in cardboard with the REUSE10 return envelope. Exchanged my old case the same week." },
    { name: "Lena K.", title: "Holds the heavy wallet", body: "Three cards in the folio and it still doesn't budge on the mount. That's the N52 ring doing its job." },
    { name: "Harsh V.", title: "Drop-tested for real", body: "Phone slipped off the mount onto tarmac — case scuffed, glass perfect. Exactly the trade I wanted." },
  ],
  "airpods-cases": [
    { name: "Ananya G.", title: "Snug, no bulk", body: "Cover slides on and stays on — the lid still clicks shut like nothing's there." },
    { name: "Vikram T.", title: "Survived the metro floor", body: "Case took a full drop onto platform tiles. Not a mark on it, buds unharmed." },
    { name: "Sara L.", title: "Carabiner is the hero", body: "Clipped inside my bag strap. First week I stopped losing the case for good." },
    { name: "Imran H.", title: "Pairs without removing", body: "Bluetooth connects and it charges on the pad with the cover on. Never take it off." },
    { name: "Joseph M.", title: "Grip that actually grips", body: "The silicone isn't slick — pulling it out of a pocket one-handed finally works." },
    { name: "Harsh V.", title: "Worth ₹500", body: "Cheaper than replacing a charging case. Fits the Pro 2 exactly, cutouts dead-centre." },
  ],
  cables: [
    { name: "Ananya G.", title: "The braid feels serious", body: "Thick weave, no kinks when it lives coiled in a bag. The old rubber ones always frayed at the ends." },
    { name: "Vikram T.", title: "Actually charges the laptop", body: "MacBook goes from dead to full on this alone — no charger-brick drama." },
    { name: "Sara L.", title: "Perfect length", body: "1.5 m reaches the bed socket without a metre of slack on the floor." },
    { name: "Priyanka D.", title: "Bends without dying", body: "Folded it in the same spot for months — no split jacket, no intermittent charge." },
    { name: "Lena K.", title: "Replaced the whole drawer", body: "One of these per desk now. Fast enough for everything I own, and it doesn't tangle." },
    { name: "Harsh V.", title: "Connector seats tight", body: "Clicks in and stays — no wobble, no waking up to 8% battery." },
  ],
  powerbank: [
    { name: "Ananya G.", title: "Survives a full travel day", body: "Phone, buds, and a top-up for my friend's — still had a bar left at the hotel." },
    { name: "Vikram T.", title: "Fast charge is real", body: "Screen shows the fast-charge icon on both ends. Laptop-class speed for the phone." },
    { name: "Imran H.", title: "Light for the capacity", body: "Fits the jacket pocket and doesn't drag it down. The mAh actually feels usable." },
    { name: "Priyanka D.", title: "Came with the cable", body: "USB-C cable in the box — I didn't have to hunt the drawer for one." },
    { name: "Lena K.", title: "Airline-approved size", body: "Security didn't blink at it — under 100Wh, straight through the scanner." },
    { name: "Harsh V.", title: "Still strong after months", body: "No swelling, no heat panic, no mystery drain sitting in the bag." },
  ],
  speakers: [
    { name: "Ananya G.", title: "Punches way above size", body: "Filled the living room without buzzing. Bass stays clean at volumes that should rattle it." },
    { name: "Vikram T.", title: "Pairs instantly", body: "Open the lid, it's connected. Switching between phone and tablet just works." },
    { name: "Sara L.", title: "Battery matches the claim", body: "Beach afternoon into the night and it still had charge — no charger anxiety." },
    { name: "Priyanka D.", title: "Survived the splash", body: "Rained on during the trek, wiped it dry, kept playing. IPX6 earned its keep." },
    { name: "Lena K.", title: "Goes in the backpack", body: "Roughly a can of cola, lighter than one. It's been in the bag for every trip since." },
    { name: "Harsh V.", title: "Worth it over no-name", body: "Clear calls on speaker too — the mic actually picks me up in a noisy room." },
  ],
}

function kindOf(tags) {
  const t = new Set(tags.map((v) => v.toLowerCase()))
  if (t.has("magsafe")) return "magsafe-cases"
  if (t.has("airpods")) return "airpods-cases"
  if (t.has("cable") || t.has("cables")) return "cables"
  if (t.has("powerbank") || t.has("power-bank")) return "powerbank"
  if (t.has("speaker") || t.has("speakers")) return "speakers"
  return "phone-case"
}

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

const base = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : { host: "localhost", port: 5433, user: "postgres", password: "postgres", database: "flowcase" }
const client = new pgpkg.Client(base)

await client.connect()
const { rows } = await client.query(`
  SELECT p.id, p.handle, p.metadata,
         COALESCE((SELECT array_agg(t.value) FROM product_tags pt
                   JOIN product_tag t ON t.id = pt.product_tag_id
                   WHERE pt.product_id = p.id), '{}') AS tags,
         COALESCE((SELECT array_agg(i.url ORDER BY i.rank) FROM image i
                   WHERE i.product_id = p.id), '{}') AS images
  FROM product p
  WHERE p.deleted_at IS NULL AND p.handle LIKE 'flowcase-%'
  ORDER BY p.handle`)

let stamped = 0
for (const row of rows) {
  const meta = row.metadata ?? {}
  const picks = seededPick(row.id, POOLS[kindOf(row.tags)], 3)
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
    patch[`r${n}_image`] = row.images[i % Math.max(row.images.length, 1)] ?? ""
  })
  await client.query(
    `UPDATE product SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
    [JSON.stringify(patch), row.id]
  )
  stamped += 1
  console.log(`${row.handle} → r1..r3 (${kindOf(row.tags)})`)
}
await client.end()
console.log(`stamped reviews on ${stamped} products`)

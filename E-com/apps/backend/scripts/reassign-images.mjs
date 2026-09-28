/**
 * One-off: give every product 4 unique gallery images from the Openverse pool
 * (/tmp/ov_pool.json, category-tagged) — replaces the 63 duplicated Unsplash
 * URLs shared across all 65 products. Also rewrites product.thumbnail.
 * Usage: node scripts/reassign-images.mjs              (local :5433)
 *        DATABASE_URL=postgres://... node scripts/reassign-images.mjs  (prod)
 */
import fs from "node:fs"
import pgpkg from "pg"

const POOL_PATH = process.env.POOL_PATH || "/tmp/ov_pool.json"
const pool = JSON.parse(fs.readFileSync(POOL_PATH, "utf8"))

const JUNK = [
  /public domain|nara|pearl harbor|wwi\b|wwii|convicted|dr\. sun|yatsen/i,
  /clipart|illustration|vector|abstract/i,
  /keyboard|monitor|calendar|newspaper|paper\b|book\b|books\b|pen\b/i,
  /youtube|instagram|vpn\b|apps?\b|app\b|whatsapp/i,
  /case study|boeing|skytrain|tesla model|paypal|alaska|edison|giftmaster|knits|psion|ibm/i,
  /bridge|golden gate|chairlift|gondola|zip lining|cable car|chairlift/i,
  /hat\b|scarf|wristwarmer|wristwarmers|neckwarmer|alpaca|knitting|tow hook|cowl|rib\b|anterler|antler/i,
  /commons|gillette|reprimand|farmers|stump\b|tris speaker|palace yard|wedding|congress|votes are in|streetperformer|busker|political|radio channel/i,
  /food|kids?|girl|woman|man\b|woman\b|people|person|guy|walking|fitness|beach|beauty/i,
  /mug|cup|desk|office|work\b|workspace|couch|chair\b|passport|train station|travel kit|bag\b|luggage/i,
  /camera|flash|watch\b|sunglasses|mouse\b|speedometer|lens\b|tripad|postal|tools set/i,
  /telephone|vintage united|transistor|sähköurut|smartboard|whiteboard|house commons|speaker's/i,
  /nature|snow|winter|landscape|birds|perched|flowers?|food/i,
  /headphones mod|earphones\b.*(70|mod)/i,
  /loud speaker operation|first loud/i,
  /knit|yarn|sweater|cardigan|shawl|wool\b|knitwear/i,
  /duracell|energizer|alkaline|batteries|aa battery|aaa battery|9v battery|flashlight|torch\b/i,
  /record player|turntable|gramovox|gramophone|organ\b|church\b/i,
  /trade show|exhibition|\bbooth\b|\bexpo\b|price tag|clearance/i,
  /advertisement|specification|diagram|brochure|flyer\b|spec sheet/i,
  /tramway|aerial lift|ski lift|cableway|power lines?\b|pylon/i,
  /\bboy\b|selfie|smiling|portrait\b/i,
  /warmer|ribs?\b|cablecar|headband|\bwires\b|^cables? lines?$/i,
  /simbiosc|nanodelarosa|#.*#.*#|ravpower/i,
  /patent|fig\.?\s*\d|comic|cartoon|toddler|child|infant|statue|helmet|crochet|gdgt|senior|\busing\b/i,
]

const SCORE = {
  case: [
    [/phone\s?case|iphone\s.*case|cases?\b.*(iphone|phone|galaxy)|iphone .*cases|cell phone cases|phone cases|galaxy case|samsung case|case for (iphone|galaxy|samsung)/i, 5],
    [/close-up of (multiple|low).*cases?|pile of|stack of|line of smart phone cases|sale, mixed lot/i, 4],
    [/case\b/i, 4],
    [/cover\b|sleeve|silicone|leather|glitter/i, 2],
    [/iphone|galaxy|samsung/i, 1],
    [/phone|smartphone|mobile/i, 1],
  ],
  speaker: [
    [/bluetooth speaker|portable (bluetooth )?speaker|wireless.*speaker/i, 5],
    [/bose|jbl|soundlink|jambox|marshall|zebronics|creative d100|hiddenradio/i, 4],
    [/speaker\b/i, 3],
    [/audio|sound|music/i, 1],
  ],
  powerbank: [
    [/power\s?bank|powerbank|power pack|portable charger/i, 5],
    [/charging|charger|usb/i, 2],
  ],
  cable: [
    [/usb|charging cable|iphone charging|sync cable|lighting cable/i, 5],
    [/adam elements/i, 4],
    [/braided cable\b|braided cable detail|cable wire|cable wire/i, 3],
    [/cable|connector/i, 2],
    [/charging|charger/i, 1],
  ],
  earbuds: [
    [/earbud|airpod/i, 5],
    [/earphone|headphone|headset/i, 4],
    [/earbuds? case|charging case/i, 3],
  ],
}

function scoreOf(cat, title) {
  if (JUNK.some((re) => re.test(title))) return -1
  let s = 0
  for (const [re, w] of SCORE[cat] ?? []) if (re.test(title)) s += w
  return s
}

// category handle → ordered pool queues (later queues fill shortages)
const QUEUES = {
  "phone-case": ["case"],
  "magsafe-cases": ["case"],
  "airpods-cases": ["earbuds"],
  cables: ["cable"],
  powerbank: ["powerbank"],
  speakers: ["speaker"],
}

const byCat = { case: [], speaker: [], powerbank: [], cable: [], earbuds: [] }
for (const [url, m] of Object.entries(pool)) {
  const s = scoreOf(m.cat, m.title ?? "")
  if (s >= 0) byCat[m.cat]?.push({ url, s })
}
for (const c of Object.keys(byCat)) {
  byCat[c].sort((a, b) => b.s - a.s)
  console.log(`${c}: ${byCat[c].length} usable`)
}
if (process.env.DRY) process.exit(0)

const base = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : { host: "localhost", port: 5433, user: "postgres", password: "postgres", database: "flowcase" }
const client = new pgpkg.Client(base)
await client.connect()

const { rows } = await client.query(`
  SELECT p.id, p.handle, c.handle AS cat
  FROM product p
  JOIN product_category_product pcp ON pcp.product_id = p.id
  JOIN product_category c ON c.id = pcp.product_category_id
  WHERE p.deleted_at IS NULL
  ORDER BY c.handle, p.handle`)

// fail fast if any primary queue can't fill 4 per product
const demand = {}
for (const p of rows) demand[QUEUES[p.cat][0]] = (demand[QUEUES[p.cat][0]] ?? 0) + 4
for (const [q, n] of Object.entries(demand)) {
  const have = byCat[q]?.length ?? 0
  if (have < n) throw new Error(`queue ${q}: only ${have} usable urls, need ${n}`)
}

const cursors = {} // pool cat → next index
const used = new Set()
function nextUrl(poolCat) {
  const list = byCat[poolCat] ?? []
  let i = cursors[poolCat] ?? 0
  while (i < list.length && used.has(list[i].url)) i++
  cursors[poolCat] = i + 1
  if (i >= list.length) return null
  used.add(list[i].url)
  return list[i].url
}

let ok = 0
for (const p of rows) {
  const queues = QUEUES[p.cat]
  if (!queues) throw new Error(`no queue for category ${p.cat}`)
  const urls = []
  outer: for (const q of queues) {
    while (urls.length < 4) {
      const u = nextUrl(q)
      if (!u) break
      urls.push(u)
    }
    if (urls.length === 4) break outer
  }
  if (urls.length < 4) throw new Error(`${p.handle}: only ${urls.length}/4 images left`)

  const { rows: imgs } = await client.query(
    `SELECT id FROM image WHERE product_id = $1 ORDER BY rank, created_at`,
    [p.id]
  )
  if (imgs.length !== 4) throw new Error(`${p.handle}: has ${imgs.length} image rows`)
  for (let i = 0; i < 4; i++) {
    await client.query(`UPDATE image SET url = $1 WHERE id = $2`, [urls[i], imgs[i].id])
  }
  await client.query(`UPDATE product SET thumbnail = $1 WHERE id = $2`, [urls[0], p.id])
  ok++
}
await client.end()
console.log(`reassigned 4 images x ${ok} products (${used.size} unique urls)`)

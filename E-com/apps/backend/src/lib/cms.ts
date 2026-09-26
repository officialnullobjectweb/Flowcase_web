import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"

export interface CmsMessage {
  text: string
  link?: string
}

export interface CmsAnnouncement {
  enabled: boolean
  /** which page groups show the bar: "home" | "shop" | "cart" | "product" */
  pages: string[]
  /** marquee scrolling for multi-message content */
  marquee: boolean
  /** seconds for one full marquee loop */
  speed: number
  /** bar-wide link ("" = no link) */
  link: string
  messages: CmsMessage[]
}

export interface CmsPromo {
  enabled: boolean
  image: string
  title: string
  body: string
  cta_label: string
  cta_link: string
  /** seconds before the modal appears */
  delay: number
}

export interface CmsSlide {
  src: string
  poster: string
  alt: string
}

export interface CmsHeroes {
  home: CmsSlide[]
  shop: CmsSlide
}

export interface CmsPdpRow {
  term: string
  detail: string
}

/** Product-page content edited from the admin panel's Site CMS page. */
export interface CmsPdp {
  /** Highlight-tab rows; empty = derived from the product title */
  highlights: CmsPdpRow[]
  /** Full-details tab body; empty = product description */
  details: string
  /** Rating-ring labels (Quality / Pricing / Grip / Protection) */
  categories: string[]
  /** One-line horizontal carousel for the rating rings (admin option) */
  carousel: boolean
}

export interface CmsPaymentEvent {
  id: string
  event: string
  status: "success" | "failed"
  order_id: string | null
  payment_id: string | null
  /** rupees */
  amount: number | null
  method: string | null
  at: string
}

export interface CmsConfig {
  announcement: CmsAnnouncement
  promo: CmsPromo
  heroes: CmsHeroes
  pdp: CmsPdp
  payments: CmsPaymentEvent[]
}

const CLOUD = "dvekceihu"

const vod = (id: string) =>
  `https://res.cloudinary.com/${CLOUD}/video/upload/f_auto,q_auto,w_1600/${id}.mp4`
const vposter = (id: string) =>
  `https://res.cloudinary.com/${CLOUD}/video/upload/so_0,w_1600,q_auto,f_jpg/${id}.jpg`

export const DEFAULT_CMS: CmsConfig = {
  announcement: {
    enabled: true,
    pages: ["home", "shop", "cart", "product"],
    marquee: false,
    speed: 24,
    link: "",
    messages: [
      { text: "Free shipping over ₹999 · 7-day returns · 10% off with reuse10", link: "" },
    ],
  },
  promo: {
    enabled: false,
    image: "",
    title: "10% off your first case",
    body: "Use code reuse10 at checkout — sustainability bonus included.",
    cta_label: "Shop cases",
    cta_link: "/shop",
    delay: 4,
  },
  heroes: {
    home: [
      {
        src: vod("v1790321523/ttkpfoett07jlyvrlh09"),
        poster: vposter("v1790321523/ttkpfoett07jlyvrlh09"),
        alt: "Phone spinning in a Flowcase case",
      },
      {
        src: vod("v1790321522/j7vl6vmjuuhhrr2c6x4h"),
        poster: vposter("v1790321522/j7vl6vmjuuhhrr2c6x4h"),
        alt: "Close-up of case texture and camera ring",
      },
    ],
    shop: {
      src: vod("v1790321522/avgvexercaikpgl7evln"),
      poster: vposter("v1790321522/avgvexercaikpgl7evln"),
      alt: "Phone spinning in a Flowcase case",
    },
  },
  payments: [],
  pdp: {
    highlights: [],
    details: "",
    categories: ["Quality", "Pricing", "Grip", "Protection"],
    carousel: true,
  },
}

function file(): string {
  return path.join(process.cwd(), ".cms", "config.json")
}

function merge(base: CmsConfig, raw: Partial<CmsConfig>): CmsConfig {
  return {
    ...base,
    ...raw,
    announcement: { ...base.announcement, ...(raw.announcement ?? {}) },
    promo: { ...base.promo, ...(raw.promo ?? {}) },
    heroes: {
      home: raw.heroes?.home ?? base.heroes.home,
      shop: raw.heroes?.shop ?? base.heroes.shop,
    },
    pdp: { ...base.pdp, ...(raw.pdp ?? {}) },
    payments: raw.payments ?? [],
  }
}

export function getConfig(): CmsConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), "utf8")) as Partial<CmsConfig>
    return merge(DEFAULT_CMS, raw)
  } catch {
    return structuredClone(DEFAULT_CMS)
  }
}

export function saveConfig(patch: Partial<CmsConfig>): CmsConfig {
  const next = merge(getConfig(), patch)
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true })
    fs.writeFileSync(file(), JSON.stringify(next, null, 2))
  } catch {
    // read-only fs — keep serving in-memory defaults
  }
  return next
}

export function logPayment(
  ev: Omit<CmsPaymentEvent, "id" | "at">
): CmsPaymentEvent {
  const cfg = getConfig()
  const entry: CmsPaymentEvent = {
    ...ev,
    id: randomUUID().slice(0, 8),
    at: new Date().toISOString(),
  }
  // Same payment can arrive twice (verify-route forward + real gateway
  // webhook) — keep only the newest row per payment_id.
  const rest = cfg.payments.filter(
    (p) => !entry.payment_id || p.payment_id !== entry.payment_id
  )
  const next = { ...cfg, payments: [entry, ...rest].slice(0, 100) }
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true })
    fs.writeFileSync(file(), JSON.stringify(next, null, 2))
  } catch {
    // ignore
  }
  return entry
}

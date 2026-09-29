/**
 * Site CMS content served by the backend (`GET /store/cms`) and edited from
 * the admin panel's "Site CMS" page. Falls back to sane defaults so the
 * storefront never breaks when the backend is unreachable.
 */

export interface CmsMessage {
  text: string
  link?: string
}

export interface CmsAnnouncement {
  enabled: boolean
  pages: string[]
  marquee: boolean
  speed: number
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

function merge(raw: Partial<CmsConfig> | null): CmsConfig {
  if (!raw) return DEFAULT_CMS
  return {
    ...DEFAULT_CMS,
    ...raw,
    announcement: { ...DEFAULT_CMS.announcement, ...(raw.announcement ?? {}) },
    promo: { ...DEFAULT_CMS.promo, ...(raw.promo ?? {}) },
    heroes: {
      home: raw.heroes?.home?.length ? raw.heroes.home : DEFAULT_CMS.heroes.home,
      shop: raw.heroes?.shop?.src ? raw.heroes.shop : DEFAULT_CMS.heroes.shop,
    },
    pdp: { ...DEFAULT_CMS.pdp, ...(raw.pdp ?? {}) },
    payments: raw.payments ?? [],
  }
}

/* ── homepage section order (admin "Homepage" page) ── */

export interface HomeSectionCfg {
  key: string
  title: string
  enabled: boolean
  position: number
  limitCount: number
}

/** Mirrors supabase/schema-11 seed — fallback when the table is unreachable. */
export const DEFAULT_HOME_SECTIONS: HomeSectionCfg[] = [
  { key: "best_sellers", title: "Best sellers", enabled: true, position: 1, limitCount: 10 },
  { key: "categories", title: "Shop by category", enabled: true, position: 2, limitCount: 6 },
  { key: "models", title: "Shop by model", enabled: true, position: 3, limitCount: 12 },
  { key: "just_landed", title: "Just landed", enabled: true, position: 4, limitCount: 8 },
  { key: "this_month", title: "This month", enabled: true, position: 5, limitCount: 6 },
  { key: "sustainability", title: "Sustainability", enabled: true, position: 6, limitCount: 4 },
  { key: "collections", title: "Collections", enabled: true, position: 7, limitCount: 8 },
  { key: "reviews", title: "Reviews", enabled: true, position: 8, limitCount: 8 },
  { key: "best_rated", title: "Best rated", enabled: true, position: 9, limitCount: 8 },
  { key: "the_standard", title: "The standard", enabled: true, position: 10, limitCount: 4 },
  { key: "reuse", title: "Reuse programme", enabled: true, position: 11, limitCount: 4 },
  { key: "cta_newsletter", title: "Ready when you are", enabled: true, position: 12, limitCount: 4 },
]

export async function getHomeSections(): Promise<HomeSectionCfg[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return DEFAULT_HOME_SECTIONS
    // no-store: admin toggles must be seen on the next render — the page's
    // own ISR window is the only allowed staleness.
    const res = await fetch(`${url}/rest/v1/home_sections?select=key,title,enabled,position,limit_count`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    })
    if (!res.ok) return DEFAULT_HOME_SECTIONS
    const rows = (await res.json()) as
      | { key: string; title: string; enabled: boolean; position: number; limit_count: number }[]
      | { message?: string }
    if (!Array.isArray(rows) || !rows.length) return DEFAULT_HOME_SECTIONS
    return rows.map((r) => ({
      key: r.key,
      title: r.title,
      enabled: r.enabled,
      position: r.position,
      limitCount: r.limit_count,
    }))
  } catch {
    return DEFAULT_HOME_SECTIONS
  }
}

export async function getCms(): Promise<CmsConfig> {
  try {
    const { supabaseAnon } = await import("./supabase")
    const sb = supabaseAnon()
    const { data } = await sb.from("site_settings").select("key,value").in("key", ["announcement", "promo"])
    if (!data?.length) return DEFAULT_CMS
    const raw: Partial<CmsConfig> = {}
    for (const row of data as { key: string; value: unknown }[]) {
      if (row.key === "announcement" || row.key === "promo") {
        ;(raw as Record<string, unknown>)[row.key] = row.value
      }
    }
    return merge(raw)
  } catch {
    return DEFAULT_CMS
  }
}

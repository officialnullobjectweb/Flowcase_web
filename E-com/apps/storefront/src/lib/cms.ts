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

export async function getCms(): Promise<CmsConfig> {
  try {
    const base =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
      process.env.MEDUSA_BACKEND_URL ??
      "http://localhost:9000"
    const res = await fetch(`${base}/store/cms`, {
      headers: {
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
      },
      // free-tier backend may be asleep — never stall the build on CMS copy
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 5 },
    })
    if (!res.ok) throw new Error(`cms ${res.status}`)
    return merge((await res.json()) as Partial<CmsConfig>)
  } catch {
    return DEFAULT_CMS
  }
}

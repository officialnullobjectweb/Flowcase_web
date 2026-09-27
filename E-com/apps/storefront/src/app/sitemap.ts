import type { MetadataRoute } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const STATIC_ROUTES = [
  "",
  "/shop",
  "/search",
  "/about",
  "/contact",
  "/faq",
  "/sustainability",
  "/shipping-returns",
  "/terms",
  "/privacy",
  "/returns",
  "/refunds",
  "/data-collection",
  "/wishlist",
  "/cart",
]

async function dynamicRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const base =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
      process.env.MEDUSA_BACKEND_URL ??
      "http://localhost:9000"
    const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    const headers: Record<string, string> = key ? { "x-publishable-api-key": key } : {}
    // sitemap builds on Vercel while the free-tier backend may be asleep —
    // cap each fetch so a cold start can't fail the deployment
    const timeout = { signal: AbortSignal.timeout(10_000) }
    const [productsRes, collectionsRes] = await Promise.all([
      fetch(`${base}/store/products?limit=100&fields=handle,updated_at,thumbnail`, { headers, ...timeout, next: { revalidate: 3600 } }),
      fetch(`${base}/store/collections?limit=100`, { headers, ...timeout, next: { revalidate: 3600 } }),
    ])
    const out: MetadataRoute.Sitemap = []
    if (productsRes.ok) {
      const { products = [] } = (await productsRes.json()) as {
        products: { handle: string; updated_at?: string; thumbnail?: string | null }[]
      }
      for (const p of products) {
        if (p.handle) out.push({ url: `${SITE_URL}/products/${p.handle}`, lastModified: p.updated_at ? new Date(p.updated_at) : new Date(), changeFrequency: "weekly", priority: 0.8, ...(p.thumbnail ? { images: [p.thumbnail] } : {}) })
      }
    }
    if (collectionsRes.ok) {
      const { collections = [] } = (await collectionsRes.json()) as {
        collections: { handle?: string | null; id: string; updated_at?: string }[]
      }
      for (const c of collections) {
        out.push({ url: `${SITE_URL}/collections/${c.handle ?? c.id}`, lastModified: c.updated_at ? new Date(c.updated_at) : new Date(), changeFrequency: "weekly", priority: 0.7 })
      }
    }
    return out
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const statics: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r || "/"}`,
    lastModified: now,
    changeFrequency: r === "" ? "daily" : "weekly",
    priority: r === "" ? 1 : r === "/shop" ? 0.9 : 0.6,
  }))
  return [...statics, ...(await dynamicRoutes())]
}

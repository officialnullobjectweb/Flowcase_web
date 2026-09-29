import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

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

const COLLECTION_HANDLES = ["iphone", "samsung-galaxy", "accessories"]

async function dynamicRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data } = await sb
      .from("products")
      .select("handle,created_at,thumbnail_webp")
      .limit(200)
    const out: MetadataRoute.Sitemap = (data ?? [])
      .filter((p) => p.handle)
      .map((p) => ({
        url: `${SITE_URL}/products/${p.handle}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        ...(p.thumbnail_webp ? { images: [p.thumbnail_webp] } : {}),
      }))
    for (const handle of COLLECTION_HANDLES) {
      out.push({ url: `${SITE_URL}/collections/${handle}`, changeFrequency: "weekly" as const, priority: 0.7 })
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

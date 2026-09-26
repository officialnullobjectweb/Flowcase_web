import type { MetadataRoute } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Google + all crawlers: full access, including favicon & OG images.
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout", "/account/", "/cart", "/order/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

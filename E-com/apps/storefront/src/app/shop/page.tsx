import type { Metadata } from "next"
import { Catalog } from "@/components/Catalog"
import { VideoHero } from "@/components/VideoHero"
import { loadCatalog } from "@/lib/api"
import { getCms } from "@/lib/cms"

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse Flowcase cases for iPhone 15–17 and Samsung Galaxy A & S series.",
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    tag?: string
    tags?: string
    sort?: string
    min?: string
    max?: string
    color?: string
    rating?: string
    reviews?: string
    badge?: string
  }>
}) {
  const p = await searchParams
  const cms = await getCms()
  const tag = p.tag ?? (p.tags && !p.tags.includes(",") ? p.tags : undefined)

  const { products, tags } = await loadCatalog({
    q: p.q,
    tag,
    sort: p.sort,
    min: p.min,
    max: p.max,
    color: p.color,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge,
    limit: 48,
  })

  const limited = p.badge === "limited"

  return (
    <>
      <VideoHero
        clips={[cms.heroes.shop]}
        eyebrow={limited ? "Shop — Limited edition" : "Shop — All cases"}
        title={limited ? "Small batch. Big flex." : "Find your flow."}
        description="Slim, drop-tested cases for iPhone 15 through 17 and Samsung Galaxy A & S. Filter by device, pick a finish, check out in minutes."
        ctas={[{ href: "#catalog", label: "Browse the grid" }]}
        footer={
          <>
            <span className="label">2.5 m drop-tested</span>
            <span className="label">Free shipping over ₹999</span>
            <span className="label">7-day returns</span>
          </>
        }
        className="scroll-mt-16"
      />
      <section id="catalog" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14">
        <Catalog
          basePath="/shop"
          state={{
            q: p.q,
            tag,
            sort: p.sort,
            min: p.min,
            max: p.max,
            color: p.color,
            rating: p.rating,
            reviews: p.reviews,
            badge: p.badge,
          }}
          products={products}
          tags={tags}
        />
      </section>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Catalog } from "@/components/Catalog"
import { VideoHero } from "@/components/VideoHero"
import { listColorOptions, loadCatalog } from "@/lib/api"
import { getCms } from "@/lib/cms"

export const metadata: Metadata = {
  title: "Shop Phone Cases, Speakers, Power Banks & Accessories",
  description:
    "Shop Flowcase: drop-tested iPhone 15–17 & Samsung Galaxy cases, Bluetooth speakers, fast-charging power banks, braided cables, MagSafe and AirPods cases.",
  alternates: { canonical: "/shop" },
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    tag?: string
    tags?: string
    cat?: string
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

  const { products, categories } = await loadCatalog({
    q: p.q,
    tag,
    cat: p.cat,
    sort: p.sort,
    min: p.min,
    max: p.max,
    color: p.color,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge,
    limit: 48,
  })
  const colorOptions = await listColorOptions()

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
            cat: p.cat,
            sort: p.sort,
            min: p.min,
            max: p.max,
            color: p.color,
            rating: p.rating,
            reviews: p.reviews,
            badge: p.badge,
          }}
          products={products}
          categories={categories}
          colorOptions={colorOptions}
        />
        {/* indexable category copy + internal links */}
        <div className="mx-auto mt-14 max-w-3xl border-t border-border pt-8 text-center">
          <h2 className="display-tight font-display text-2xl font-bold">
            Cases, audio, and charging — one standard.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every Flowcase product earns its place: phone cases moulded to one
            exact model, speakers tuned for rooms not labs, power banks rated
            in real charges, and cables braided to survive bags and cars. Free
            shipping over ₹999, 7-day returns, and a reuse programme that keeps
            old cases out of landfill.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { href: "/collections/iphone", label: "iPhone cases" },
              { href: "/collections/samsung-galaxy", label: "Samsung cases" },
              { href: "/collections/accessories", label: "Accessories" },
              { href: "/sustainability", label: "Our mission" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="label border-b border-foreground pb-0.5 transition hover:border-muted-foreground hover:text-muted-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

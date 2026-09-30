import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Catalog } from "@/components/Catalog"
import { JsonLd, siteUrl } from "@/components/JsonLd"
import { PageHeader } from "@/components/PageHeader"
import { getCollectionByHandle, listColorOptions, loadCatalog } from "@/lib/api"

interface PageProps {
  params: Promise<{ handle: string }>
  searchParams: Promise<{
    q?: string
    tag?: string
    cat?: string
    sort?: string
    min?: string
    max?: string
    color?: string
    rating?: string
    reviews?: string
  }>
}

type CollectionKind = "iphone" | "samsung" | "accessories" | "other"

function kindOf(title: string): CollectionKind {
  if (/accessor/i.test(title)) return "accessories"
  if (/iphone|apple/i.test(title)) return "iphone"
  if (/samsung|galaxy/i.test(title)) return "samsung"
  return "other"
}

const COPY: Record<CollectionKind, { eyebrow: string; blurb: string; seo: string; links: { href: string; label: string }[] }> = {
  iphone: {
    eyebrow: "Collection — iPhone",
    blurb: "Exact fit for iPhone 15 through 17 — camera lips, button covers, and MagSafe-ready rings.",
    seo: "Every iPhone case is moulded to one model — no shared shells, no loose buttons. Drop-tested corners, slim profiles, and finishes from Onyx to Lavender, with free shipping over ₹999 and 7-day returns.",
    links: [
      { href: "/collections/samsung-galaxy", label: "Samsung Galaxy cases" },
      { href: "/collections/accessories", label: "Accessories" },
      { href: "/shop?tag=magsafe", label: "MagSafe cases" },
    ],
  },
  samsung: {
    eyebrow: "Collection — Samsung",
    blurb: "Galaxy A and S series — precise cutouts, raised bezels, and Flowcase grip edges.",
    seo: "Galaxy cases with millimetre-perfect USB-C and camera cutouts, anti-yellow coating on S series, and rugged options for A series. Drop-tested, pocket-friendly, and covered by 7-day returns.",
    links: [
      { href: "/collections/iphone", label: "iPhone cases" },
      { href: "/collections/accessories", label: "Accessories" },
      { href: "/shop?tag=magsafe", label: "MagSafe cases" },
    ],
  },
  accessories: {
    eyebrow: "Collection — Accessories",
    blurb: "Speakers, power banks, cables, MagSafe and AirPods cases — the full Flowcase ecosystem.",
    seo: "Bluetooth speakers with 12–24 hour playtime, 5000–27000mAh power banks with fast charging, braided USB-C and Lightning cables up to 240W, magnetic MagSafe cases, and shock-proof AirPods cases. Everything ships plastic-free with free shipping over ₹999.",
    links: [
      { href: "/shop?tag=speaker", label: "Speakers" },
      { href: "/shop?tag=powerbank", label: "Power banks" },
      { href: "/shop?tag=cable", label: "Cables" },
      { href: "/shop?tag=airpods", label: "AirPods cases" },
    ],
  },
  other: {
    eyebrow: "Collection",
    blurb: "Drop-tested protection with precise fit.",
    seo: "Flowcase protection — slim profiles, drop-tested corners, free shipping over ₹999 and 7-day returns across India.",
    links: [
      { href: "/shop", label: "Shop all" },
      { href: "/collections/accessories", label: "Accessories" },
    ],
  },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle).catch(() => null)
  if (!collection) return { title: "Collection not found" }
  const kind = kindOf(collection.title)
  const desc =
    kind === "accessories"
      ? "Shop Flowcase accessories — Bluetooth speakers, power banks, braided cables, MagSafe and AirPods cases."
      : `Shop ${collection.title} cases — precise fit, drop-tested protection, free shipping over ₹999.`
  return {
    title: kind === "accessories" ? "Accessories" : `${collection.title} Cases`,
    description: desc,
    alternates: { canonical: `/collections/${collection.handle ?? handle}` },
    openGraph: { title: `${collection.title} · Flowcase`, description: desc },
  }
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params
  const p = await searchParams

  const collection = await getCollectionByHandle(handle).catch(() => null)
  if (!collection) notFound()

  const { products, categories } = await loadCatalog({
    collection_id: collection.id,
    q: p.q,
    tag: p.tag,
    cat: p.cat,
    sort: p.sort,
    min: p.min,
    max: p.max,
    color: p.color,
    rating: p.rating,
    reviews: p.reviews,
    limit: 48,
  })
  const colorOptions = await listColorOptions()

  const kind = kindOf(collection.title)
  const copy = COPY[kind]
  const base = siteUrl()

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: base },
            { "@type": "ListItem", position: 2, name: "Shop", item: `${base}/shop` },
            {
              "@type": "ListItem",
              position: 3,
              name: collection.title,
              item: `${base}/collections/${collection.handle ?? handle}`,
            },
          ],
        }}
      />
      <PageHeader eyebrow={copy.eyebrow} title={collection.title} description={copy.blurb} />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <Catalog
          basePath={`/collections/${handle}`}
          state={{ q: p.q, tag: p.tag, cat: p.cat, sort: p.sort, min: p.min, max: p.max, color: p.color, rating: p.rating, reviews: p.reviews }}
          products={products}
          colorOptions={colorOptions}
          categories={categories}
        />
        {/* indexable buying-guide copy + internal links */}
        <div className="mx-auto mt-14 max-w-3xl border-t border-border pt-8 text-center">
          <h2 className="display-tight font-display text-2xl font-bold">
            {kind === "accessories" ? "Why Flowcase accessories?" : `Why a Flowcase ${collection.title} case?`}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy.seo}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {copy.links.map((l) => (
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

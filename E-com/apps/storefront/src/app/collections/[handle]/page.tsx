import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Catalog } from "@/components/Catalog"
import { PageHeader } from "@/components/PageHeader"
import { getCollectionByHandle, loadCatalog } from "@/lib/api"

interface PageProps {
  params: Promise<{ handle: string }>
  searchParams: Promise<{
    q?: string
    tag?: string
    sort?: string
    min?: string
    max?: string
    color?: string
    rating?: string
    reviews?: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const collection = await getCollectionByHandle(handle).catch(() => null)
  return {
    title: collection?.title ?? "Collection",
    description: `Shop ${collection?.title ?? "Flowcase"} cases — precise fit, drop-tested protection.`,
  }
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params
  const p = await searchParams

  const collection = await getCollectionByHandle(handle).catch(() => null)
  if (!collection) notFound()

  const { products, tags } = await loadCatalog({
    collection_id: collection.id,
    q: p.q,
    tag: p.tag,
    sort: p.sort,
    min: p.min,
    max: p.max,
    color: p.color,
    rating: p.rating,
    reviews: p.reviews,
    limit: 48,
  })

  const isIphone = /iphone|apple/i.test(collection.title)

  return (
    <>
      <PageHeader
        eyebrow={`Collection — ${isIphone ? "iPhone" : "Samsung"}`}
        title={collection.title}
        description={
          isIphone
            ? "Exact fit for iPhone 15 through 17 — camera lips, button covers, and MagSafe-ready rings."
            : "Galaxy A and S series — precise cutouts, raised bezels, and Flowcase grip edges."
        }
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <Catalog
          basePath={`/collections/${handle}`}
          state={{ q: p.q, tag: p.tag, sort: p.sort, min: p.min, max: p.max, color: p.color, rating: p.rating, reviews: p.reviews }}
          products={products}
          tags={tags}
        />
      </section>
    </>
  )
}

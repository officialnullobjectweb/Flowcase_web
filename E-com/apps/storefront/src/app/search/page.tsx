import type { Metadata } from "next"
import { Catalog } from "@/components/Catalog"
import { PageHeader } from "@/components/PageHeader"
import { loadCatalog } from "@/lib/api"

export const metadata: Metadata = {
  title: "Search",
  description: "Search Flowcase cases by model, device, or finish.",
}

export default async function SearchPage({
  searchParams,
}: {
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
}) {
  const p = await searchParams

  const { products, count, tags } = await loadCatalog({
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

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={p.q ? <>Results for “{p.q}”</> : "What are you looking for?"}
        description={
          p.q
            ? `${count} ${count === 1 ? "case matches" : "cases match"} your search.`
            : "Search by model — iPhone 17 Pro, Galaxy S25 Ultra, and everything between."
        }
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {!p.q && (
          <form action="/search" method="get" role="search" className="mb-10 max-w-xl">
            <label htmlFor="search-page-q" className="sr-only">
              Search cases
            </label>
            <div className="flex items-center gap-2 border-b-2 border-foreground">
              <input
                id="search-page-q"
                type="search"
                name="q"
                autoFocus
                placeholder="E.G. IPHONE 17 PRO MAX"
                className="label w-full min-w-0 bg-transparent py-3 text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="label shrink-0 rounded-full bg-primary px-6 py-2.5 text-primary-foreground transition hover:bg-primary/85"
              >
                Search
              </button>
            </div>
          </form>
        )}
        <Catalog
          basePath="/search"
          state={{ q: p.q, tag: p.tag, sort: p.sort, min: p.min, max: p.max, color: p.color, rating: p.rating, reviews: p.reviews }}
          products={products}
          tags={tags}
        />
      </section>
    </>
  )
}

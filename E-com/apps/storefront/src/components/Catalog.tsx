"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { FilterSortBar, type CatalogState } from "./FilterSortBar"
import { ProductCard } from "./ProductCard"
import type { Product, ProductCategory } from "@/lib/types"

interface CatalogProps {
  basePath: string
  state: CatalogState
  products: Product[]
  categories: ProductCategory[]
}

/** Products revealed per bunch — scroll past the grid and the next bunch mounts. */
const BATCH = 8

function EditorialBanner({
  href,
  eyebrow,
  title,
  image,
}: {
  href: string
  eyebrow: string
  title: string
  image: string
}) {
  return (
    <Link
      href={href}
      className="group relative isolate col-span-2 flex min-h-52 items-end overflow-hidden bg-hero-ink lg:col-span-2"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 p-5 sm:p-6">
        <p className="label flex items-center gap-3 text-white/70">
          <span className="h-1.5 w-1.5 bg-foreground" aria-hidden="true" />
          {eyebrow}
        </p>
        <p className="display-tight mt-2 flex items-center gap-2 font-display text-xl font-bold text-white sm:text-2xl">
          {title}
          <ArrowRight
            className="h-4 w-4 shrink-0 transition group-hover:translate-x-1"
            aria-hidden="true"
          />
        </p>
      </div>
    </Link>
  )
}

export function Catalog({
  basePath,
  state,
  products,
  categories,
}: CatalogProps) {
  // ponytail: batches revealed client-side from one payload — switch to a
  // route handler fetching /store/products per batch past ~200 products
  const [shown, setShown] = useState(() => Math.min(BATCH, products.length))
  const sentinel = useRef<HTMLDivElement>(null)

  // New filter/sort → back to the first bunch.
  useEffect(() => {
    setShown(Math.min(BATCH, products.length))
  }, [products])

  useEffect(() => {
    const el = sentinel.current
    if (!el || shown >= products.length) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting))
          setShown((s) => Math.min(s + BATCH, products.length))
      },
      { rootMargin: "300px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown, products.length])

  const visible = products.slice(0, shown)

  return (
    <div className="space-y-8">
      <FilterSortBar basePath={basePath} state={state} categories={categories} />

      {products.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="display-tight font-display text-lg font-semibold">
            Nothing here yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another filter — or run the Flowcase seed script if the
            catalogue looks empty.
          </p>
          <Link
            href={basePath}
            className="label mt-6 inline-flex border-b border-foreground pb-1"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div
          aria-live="polite"
          className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4"
        >
          {visible.map((product, i) => (
            <Fragment key={product.id}>
              <ProductCard product={product} />
              {i === 3 && (
                <>
                  <EditorialBanner
                    href="/sustainability"
                    eyebrow="Reuse programme"
                    title="Send an old case, save 10%"
                    image="https://images.unsplash.com/photo-1541877944-ac82a091518a?w=1200&q=80&auto=format&fit=crop"
                  />
                  <EditorialBanner
                    href="/shop?sort=-created_at"
                    eyebrow="Fresh this week"
                    title="See the latest drops"
                    image="https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=80&auto=format&fit=crop"
                  />
                </>
              )}
            </Fragment>
          ))}
        </div>
      )}

      {shown < products.length && (
        <div ref={sentinel} className="flex justify-center border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setShown((s) => Math.min(s + BATCH, products.length))}
            className="label border border-border px-6 py-2.5 transition hover:border-foreground"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}

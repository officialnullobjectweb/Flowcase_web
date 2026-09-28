import { FALLBACK_MODELS, modelFromTitle, type NavModel } from "./nav-models"
import { fuzzyRank } from "./fuzzy"
import { sdk } from "./sdk"
import type { Collection, Product, ProductCategory, ProductTag, Region } from "./types"

/**
 * Build-time guard: the backend sleeps on free-tier hosting (Render cold
 * start) and hanging fetches used to stall `next build` past Vercel's 60s
 * page timeout. Every store fetch aborts after 10s and falls through to the
 * existing offline fallbacks — pages still pre-render, ISR refills them.
 */
const FETCH_TIMEOUT_MS = 10_000
const withTimeout = () => ({ signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })

const PRODUCT_LIST_FIELDS =
  "*variants.calculated_price,id,title,handle,thumbnail,metadata,images.id,images.url,images.alt,tags.id,tags.value,variants.id,variants.title,variants.sku,variants.inventory_quantity,variants.manage_inventory,variants.allow_backorder"

const PRODUCT_DETAIL_FIELDS =
  "*variants.calculated_price,id,title,handle,description,thumbnail,collection_id,metadata,images.id,images.url,images.alt,tags.id,tags.value,options.id,options.title,options.values.id,options.values.value,variants.id,variants.title,variants.sku,variants.inventory_quantity,variants.manage_inventory,variants.allow_backorder,variants.options.id,variants.options.option_id,variants.options.value"

const TAG_FIELDS = "id,tags.id,tags.value"

export interface ProductFilters {
  q?: string
  collection_id?: string
  category_id?: string
  tags?: string[]
  price_min?: string
  price_max?: string
  order?: string
  offset?: number
  limit?: number
}

let regionPromise: Promise<Region> | null = null

export function getDefaultRegion(): Promise<Region> {
  regionPromise ??= sdk.client
    .fetch<{ regions: Region[] }>("/store/regions", {
      ...withTimeout(), query: { limit: 10 },
      next: { revalidate: 3600 },
    })
    .then(({ regions }) => {
      if (!regions?.length) {
        throw new Error(
          "No store region configured. Create one in the Medusa Admin."
        )
      }
      // Store copy, price sliders, and Razorpay are all INR-first.
      return regions.find((r) => r.currency_code === "inr") ?? regions[0]
    })
    .catch((err) => {
      regionPromise = null
      throw err
    })
  return regionPromise
}

export async function listProducts(
  filters: ProductFilters,
  revalidate = 3600
): Promise<{ products: Product[]; count: number }> {
  const region = await getDefaultRegion()

  const query: Record<string, unknown> = {
    region_id: region.id,
    limit: filters.limit ?? 12,
    offset: filters.offset ?? 0,
    order: filters.order ?? "-created_at",
    fields: PRODUCT_LIST_FIELDS,
  }

  if (filters.q) query.q = filters.q
  if (filters.collection_id) query.collection_id = filters.collection_id
  if (filters.category_id) query.category_id = filters.category_id
  // store API rejects `tags` and >2-level price accessors — filter in JS
  const res = await sdk.client.fetch<{ products: Product[]; count: number }>(
    "/store/products",
    { ...withTimeout(), query, next: { revalidate } }
  )

  let products = res.products
  if (filters.tags?.length) {
    const wanted = filters.tags.map((t) => t.toLowerCase())
    products = products.filter((p) =>
      wanted.every((tv) =>
        (p.tags ?? []).some((t) => t.value.toLowerCase() === tv)
      )
    )
  }
  const priceOf = (p: Product) =>
    p.variants?.[0]?.calculated_price?.calculated_amount ??
    p.variants?.[0]?.calculated_price?.original_amount ??
    null
  if (filters.price_min) {
    const min = Number(filters.price_min)
    products = products.filter((p) => {
      const price = priceOf(p)
      return price == null || price >= min
    })
  }
  if (filters.price_max) {
    const max = Number(filters.price_max)
    products = products.filter((p) => {
      const price = priceOf(p)
      return price == null || price <= max
    })
  }

  return { products, count: products.length }
}

export async function getProductByHandle(
  handle: string,
  revalidate = 3600
): Promise<Product | null> {
  const region = await getDefaultRegion()
  const { products } = await sdk.client.fetch<{ products: Product[] }>(
    "/store/products",
    {
      ...withTimeout(), query: { handle, region_id: region.id, fields: PRODUCT_DETAIL_FIELDS },
      next: { revalidate },
    }
  )
  return products?.[0] ?? null
}

export function listCollections(revalidate = 3600): Promise<{
  collections: Collection[]
  count: number
}> {
  return sdk.client.fetch("/store/collections", {
    ...withTimeout(), query: { limit: 100 },
    next: { revalidate },
  })
}

export async function getCollectionByHandle(
  handle: string,
  revalidate = 3600
): Promise<Collection | null> {
  const { collections } = await sdk.client.fetch<{ collections: Collection[] }>(
    "/store/collections",
    { ...withTimeout(), query: { handle, limit: 1 }, next: { revalidate } }
  )
  return collections?.[0] ?? null
}

export async function listTagFacets(revalidate = 3600): Promise<ProductTag[]> {
  const { products } = await sdk.client.fetch<{ products: { tags: ProductTag[] }[] }>(
    "/store/products",
    { ...withTimeout(), query: { limit: 100, fields: TAG_FIELDS }, next: { revalidate } }
  )
  const seen = new Map<string, string>()
  for (const product of products ?? []) {
    for (const tag of product.tags ?? []) {
      if (tag?.id && !seen.has(tag.id)) seen.set(tag.id, tag.value)
    }
  }
  // ponytail: facets derived from first 100 products — Meilisearch when the
  // tag set outgrows a single page
  return [...seen].map(([id, value]) => ({ id, value }))
}

export async function listCategories(revalidate = 3600): Promise<ProductCategory[]> {
  const { product_categories } = await sdk.client.fetch<{
    product_categories: ProductCategory[]
  }>("/store/product-categories", {
    ...withTimeout(), query: { limit: 50 }, next: { revalidate },
  })
  return product_categories ?? []
}

export function sortProducts(products: Product[], order?: string): Product[] {
  const priceOf = (p: Product) =>
    p.variants?.[0]?.calculated_price?.calculated_amount ?? Number.MAX_SAFE_INTEGER
  const copy = [...products]
  switch (order) {
    case "price_asc":
      return copy.sort((a, b) => priceOf(a) - priceOf(b))
    case "price_desc":
      return copy.sort((a, b) => priceOf(b) - priceOf(a))
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    default:
      return copy
  }
}

export interface CatalogQuery {
  q?: string
  tag?: string
  cat?: string
  sort?: string
  min?: string
  max?: string
  color?: string
  rating?: string
  reviews?: string
  badge?: string
  collection_id?: string
  offset?: number
  limit?: number
}

/**
 * One loader for shop / search / collections: API-side filters + tag facets,
 * JS-side sort + offset slice.
 * ponytail: sorts the first 100 matches in JS — move `order` to the API when
 * the catalogue outgrows one page.
 */
export async function loadCatalog(query: CatalogQuery): Promise<{
  products: Product[]
  count: number
  tags: ProductTag[]
  categories: ProductCategory[]
}> {
  try {
    // Medusa's `q` is a plain substring ("apple 15" → no hits), so search
    // queries fetch the pool and get fuzzy-ranked in JS instead.
    const categories = await listCategories().catch(() => [] as ProductCategory[])
    const cat = query.cat ? categories.find((c) => c.handle === query.cat)?.id : undefined
    const [res, tags] = await Promise.all([
      listProducts({
        limit: 100,
        ...(query.collection_id ? { collection_id: query.collection_id } : {}),
        ...(cat ? { category_id: cat } : {}),
        ...(query.tag ? { tags: [query.tag] } : {}),
        ...(query.min ? { price_min: query.min } : {}),
        ...(query.max ? { price_max: query.max } : {}),
      }),
      listTagFacets().catch(() => [] as ProductTag[]),
    ])
    // color/rating/reviews live in product metadata — API can't filter them
    let items = res.products
    if (query.q) items = fuzzyRank(query.q, items, 100)
    if (query.color) {
      const wanted = query.color.toLowerCase()
      items = items.filter((p) =>
        String(p.metadata?.colors ?? "")
          .split(",")
          .map((c) => c.trim().toLowerCase())
          .includes(wanted)
      )
    }
    if (query.rating) {
      const min = Number(query.rating)
      items = items.filter((p) => Number(p.metadata?.rating ?? 0) >= min)
    }
    if (query.reviews) {
      const min = Number(query.reviews)
      items = items.filter((p) => Number(p.metadata?.review_count ?? 0) >= min)
    }
    // badge chips live in metadata.badges as a CSV ("limited,bestseller")
    if (query.badge) {
      const wanted = query.badge.toLowerCase()
      items = items.filter((p) =>
        String(p.metadata?.badges ?? "")
          .split(",")
          .map((b) => b.trim().toLowerCase())
          .includes(wanted)
      )
    }
    const sorted = sortProducts(items, query.sort)
    const offset = query.offset ?? 0
    const limit = query.limit ?? 48
    return {
      products: sorted.slice(offset, offset + limit),
      count: items.length,
      tags,
      categories,
    }
  } catch {
    return { products: [], count: 0, tags: [], categories: [] }
  }
}

/** Nav models for the mega menu — phone cases only (accessories excluded). */
export async function getNavModels(): Promise<NavModel[]> {
  try {
    const { products } = await sdk.client.fetch<{
      products: { title: string; handle: string; thumbnail: string | null; tags?: { value: string }[] }[]
    }>("/store/products", {
      ...withTimeout(), query: { limit: 100, fields: "title,handle,thumbnail,tags.value" },
      next: { revalidate: 3600 },
    })
    if (!products?.length) return FALLBACK_MODELS
    // ponytail: phone-case titles are the model source of truth — accessories
    // ("Flowcase Alto Mini Speaker", "Flowcase for AirPods Pro 2") stay out
    // of the model rail / mega menu and live under collections + search.
    return products
      .filter((p) => /^Flowcase for (iPhone|Galaxy)/i.test(p.title))
      .map((p) => ({
        label: modelFromTitle(p.title),
        handle: p.handle,
        image: p.thumbnail ?? undefined,
        brand: p.tags?.some((t) => t.value === "samsung") ? "samsung" : "apple",
      }))
  } catch {
    return FALLBACK_MODELS
  }
}

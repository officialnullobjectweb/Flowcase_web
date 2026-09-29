import { FALLBACK_MODELS, modelFromTitle, type NavModel } from "./nav-models"
import { fuzzyRank } from "./fuzzy"
import { supabaseAnon } from "./supabase"
import type { Collection, Product, ProductCategory, ProductTag, Region } from "./types"

/**
 * Catalog data layer — Supabase edition (post-Medusa cutover).
 * Same exports + return shapes as the old Medusa implementation, so every
 * page, rail, and card works untouched. Reads use the anon key (RLS:
 * public SELECT on catalog tables); all writes go through the Worker.
 */

export interface ProductFilters {
  q?: string
  collection_id?: string
  tags?: string[]
  price_min?: string
  price_max?: string
  order?: string
  offset?: number
  limit?: number
}

const COLLECTIONS: (Collection & { key: string })[] = [
  { id: "col-iphone", title: "iPhone", handle: "iphone", key: "iphone" },
  { id: "col-samsung", title: "Samsung Galaxy", handle: "samsung-galaxy", key: "samsung" },
  { id: "col-accessories", title: "Accessories", handle: "accessories", key: "accessories" },
]

const colKeyToId = (key: string) =>
  COLLECTIONS.find((c) => c.key === key)?.id ?? key
const colIdToKey = (id: string) =>
  COLLECTIONS.find((c) => c.id === id)?.key ?? id

interface Row {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail_webp: string | null
  collection: string
  brand: string
  tags: string[]
  colors: string[]
  badges: string | null
  rating: number | string | null
  review_count: number | string | null
  product_images: { url: string; position: number }[]
  variants: {
    id: string
    title: string
    sku: string
    price_inr: number
    price_usd: number
    inventory_qty: number
  }[]
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default"

function adapt(row: Row): Product {
  const colors =
    row.colors?.length
      ? row.colors
      : [...new Set(row.variants.map((v) => v.title))]
  const values = colors.map((c) => ({ id: `c-${row.id.slice(0, 8)}-${slug(c)}`, value: c }))
  const byColor = new Map(values.map((v) => [v.value, v.id]))
  const gallery = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)
  const thumbnail = row.thumbnail_webp ?? gallery[0]?.url ?? null
  return {
    id: row.id,
    title: row.title,
    handle: row.handle,
    description: row.description ?? "",
    thumbnail,
    collection_id: colKeyToId(row.collection),
    images: gallery.map((g, i) => ({ id: `${row.id}-img-${i}`, url: g.url })),
    tags: (row.tags ?? []).map((value) => ({ value })),
    options: [{ id: "color", title: "Color", values }],
    metadata: {
      rating: String(row.rating ?? 0),
      review_count: String(row.review_count ?? 0),
      colors: colors.join(","),
      ...(row.badges ? { badges: row.badges } : {}),
    },
    variants: row.variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      inventory_quantity: v.inventory_qty,
      manage_inventory: true,
      allow_backorder: false,
      calculated_price: {
        calculated_amount: v.price_inr,
        original_amount: null,
        currency_code: "inr",
      },
      options: [{ id: byColor.get(v.title) ?? values[0]?.id ?? "c-default", option_id: "color", value: v.title }],
    })),
  }
}

const POOL_SELECT = "*, product_images(url,position), variants(id,title,sku,price_inr,price_usd,inventory_qty)"

async function pool(): Promise<Product[]> {
  const sb = supabaseAnon()
  const { data, error } = await sb
    .from("products")
    .select(POOL_SELECT)
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Row[]).map(adapt)
}

export async function getDefaultRegion(): Promise<Region> {
  return { id: "in", currency_code: "inr" }
}

export async function listProducts(
  filters: ProductFilters
): Promise<{ products: Product[]; count: number }> {
  let items = await pool()
  if (filters.collection_id) {
    const key = colIdToKey(filters.collection_id)
    items = items.filter((p) => {
      const k = colIdToKey(p.collection_id ?? "")
      return k === key || (p.tags ?? []).some((t) => t.value.toLowerCase() === key);
    })
  }
  if (filters.tags?.length) {
    const wanted = filters.tags.map((t) => t.toLowerCase())
    items = items.filter((p) =>
      wanted.every((tv) => (p.tags ?? []).some((t) => t.value.toLowerCase() === tv))
    )
  }
  const priceOf = (p: Product) =>
    p.variants?.[0]?.calculated_price?.calculated_amount ?? null
  if (filters.price_min) {
    const min = Number(filters.price_min)
    items = items.filter((p) => {
      const price = priceOf(p)
      return price == null || price >= min
    })
  }
  if (filters.price_max) {
    const max = Number(filters.price_max)
    items = items.filter((p) => {
      const price = priceOf(p)
      return price == null || price <= max
    })
  }
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? 12
  return { products: items.slice(offset, offset + limit), count: items.length }
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const sb = supabaseAnon()
  const { data, error } = await sb
    .from("products")
    .select(POOL_SELECT)
    .eq("handle", handle)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? adapt(data as unknown as Row) : null
}

export async function listCollections(): Promise<{
  collections: Collection[]
  count: number
}> {
  const collections = COLLECTIONS.map(({ id, title, handle }) => ({ id, title, handle }))
  return { collections, count: collections.length }
}

export async function getCollectionByHandle(handle: string): Promise<Collection | null> {
  return (
    COLLECTIONS.find((c) => c.handle === handle) ?? null
  )
}

export async function listTagFacets(): Promise<ProductTag[]> {
  const items = await pool()
  const seen = new Set<string>()
  for (const p of items) for (const t of p.tags ?? []) seen.add(t.value)
  // ponytail: facets derived from the catalog pool — server-side distinct
  // values when the catalogue outgrows one page
  return [...seen].sort().map((value) => ({ value }))
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

/** Category facets with live counts (for the Catalog category filter). */
async function listCategoryFacets(items: Product[]): Promise<ProductCategory[]> {
  const sb = supabaseAnon()
  const { data } = await sb.from("categories").select("id,handle,name").order("name")
  const counts = new Map<string, number>()
  for (const p of items) {
    const key = (p as Product & { category_handle?: string }).category_handle
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return ((data ?? []) as ProductCategory[]).filter((c) => (counts.get(c.handle) ?? 0) > 0)
}

/** One loader for shop / search / collections — pool once, filter in JS. */
export async function loadCatalog(query: CatalogQuery): Promise<{
  products: Product[]
  count: number
  tags: ProductTag[]
  categories: ProductCategory[]
}> {
  const emptyCats: ProductCategory[] = []
  try {
    const [all, tags] = await Promise.all([
      pool(),
      listTagFacets().catch(() => [] as ProductTag[]),
    ])
    // attach category handles for faceting (single extra indexed query)
    const sb = supabaseAnon()
    const { data: prodCats } = await sb.from("products").select("handle,categories!inner(handle)").limit(200)
    const catByHandle = new Map(
      (((prodCats ?? []) as unknown as { handle: string; categories: { handle: string } | null }[])).map((r) => [r.handle, r.categories?.handle ?? ""])
    )
    for (const p of all) (p as Product & { category_handle?: string }).category_handle = catByHandle.get(p.handle) ?? ""
    const categories = await listCategoryFacets(all).catch(() => emptyCats)
    let items = all
    if (query.cat) {
      const wanted = query.cat.toLowerCase()
      items = items.filter(
        (p) => ((p as Product & { category_handle?: string }).category_handle ?? "").toLowerCase() === wanted
      )
    }
    if (query.collection_id) {
      const key = colIdToKey(query.collection_id)
      items = items.filter((p) => {
        const k = colIdToKey(p.collection_id ?? "")
        return k === key || (p.tags ?? []).some((t) => t.value.toLowerCase() === key)
      })
    }
    if (query.tag) {
      const wanted = query.tag.toLowerCase()
      items = items.filter((p) =>
        (p.tags ?? []).some((t) => t.value.toLowerCase() === wanted)
      )
    }
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
    if (query.badge) {
      const wanted = query.badge.toLowerCase()
      items = items.filter((p) =>
        String(p.metadata?.badges ?? "")
          .split(",")
          .map((b) => b.trim().toLowerCase())
          .includes(wanted)
      )
    }
    const priceOf = (p: Product) =>
      p.variants?.[0]?.calculated_price?.calculated_amount ?? null
    if (query.min) {
      const min = Number(query.min)
      items = items.filter((p) => {
        const price = priceOf(p)
        return price == null || price >= min
      })
    }
    if (query.max) {
      const max = Number(query.max)
      items = items.filter((p) => {
        const price = priceOf(p)
        return price == null || price <= max
      })
    }
    const sorted = sortProducts(items, query.sort)
    const offset = query.offset ?? 0
    const limit = query.limit ?? 48
    return { products: sorted.slice(offset, offset + limit), count: items.length, tags, categories }
  } catch {
    return { products: [], count: 0, tags: [], categories: [] }
  }
}

/** Nav models for the mega menu — phone cases only, thumbnails from Supabase. */
export async function getNavModels(): Promise<NavModel[]> {
  try {
    const items = await pool()
    const phones = items.filter((p) => /^Flowcase for (iPhone|Galaxy)/i.test(p.title))
    if (!phones.length) return FALLBACK_MODELS
    return phones.map((p) => ({
      label: modelFromTitle(p.title),
      handle: p.handle,
      image: p.thumbnail ?? undefined,
      brand: (p.tags ?? []).some((t) => t.value === "samsung") ? "samsung" : "apple",
    }))
  } catch {
    return FALLBACK_MODELS
  }
}

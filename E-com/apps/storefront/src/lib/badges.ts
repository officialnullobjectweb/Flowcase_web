import type { Product } from "./types"

export interface CardBadge {
  label: string
  tone: "signal" | "ink" | "outline"
}

const KNOWN: Record<string, CardBadge> = {
  trending: { label: "Trending", tone: "ink" },
  bestseller: { label: "Best seller", tone: "ink" },
  featured: { label: "Featured", tone: "ink" },
  exclusive: { label: "Exclusive", tone: "ink" },
  editorschoice: { label: "Editor's choice", tone: "ink" },
  new: { label: "New", tone: "signal" },
  sale: { label: "Sale", tone: "signal" },
  preorder: { label: "Pre-order", tone: "signal" },
  clearance: { label: "Clearance", tone: "signal" },
  limited: { label: "Limited", tone: "outline" },
  budget: { label: "Budget pick", tone: "outline" },
  hot: { label: "Hot", tone: "outline" },
  eco: { label: "Eco", tone: "outline" },
  bundle: { label: "Bundle", tone: "outline" },
}

/** Curated badge library — admin chip picker mirrors this list. */
export const BADGE_LIBRARY = Object.entries(KNOWN).map(([key, b]) => ({
  key,
  label: b.label,
  tone: b.tone,
}))

/**
 * Badges for a product card. Explicit assignment wins:
 * `metadata.badges = "trending,limited"` (CSV, any label works).
 * Falls back to deterministic rules so cards are never bare.
 */
export function productBadges(
  product: Product,
  discountPercent = 0
): CardBadge[] {
  const out: CardBadge[] = []
  if (discountPercent > 0) out.push({ label: `−${discountPercent}%`, tone: "signal" })

  const explicit = product.metadata?.badges
  if (typeof explicit === "string" && explicit.trim()) {
    for (const raw of explicit.split(",")) {
      const key = raw.trim().toLowerCase()
      if (!key) continue
      out.push(KNOWN[key] ?? { label: raw.trim(), tone: "outline" })
    }
  } else {
    const rating = Number(product.metadata?.rating ?? 0)
    const reviews = Number(product.metadata?.review_count ?? 0)
    if (reviews >= 300) out.push({ label: "Trending", tone: "ink" })
    else if (rating >= 4.8) out.push({ label: "Best seller", tone: "ink" })
    if (product.tags?.some((t) => /(^|\W)new(\W|$)/i.test(t.value)))
      out.push({ label: "New", tone: "signal" })
  }

  return out.slice(0, 3)
}

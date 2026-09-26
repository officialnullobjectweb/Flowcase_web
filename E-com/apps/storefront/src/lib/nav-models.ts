/**
 * Static nav fallback (used only when the catalog fetch fails).
 * Images come from the live catalog when available — see getNavModels().
 */
export type NavModel = {
  label: string
  handle: string
  image?: string
  brand: "apple" | "samsung"
}

export const FALLBACK_MODELS: NavModel[] = [
  { label: "iPhone 15", handle: "flowcase-iphone-15", brand: "apple" },
  { label: "iPhone 15 Pro", handle: "flowcase-iphone-15-pro", brand: "apple" },
  { label: "iPhone 15 Pro Max", handle: "flowcase-iphone-15-pro-max", brand: "apple" },
  { label: "iPhone 16", handle: "flowcase-iphone-16", brand: "apple" },
  { label: "iPhone 16 Pro", handle: "flowcase-iphone-16-pro", brand: "apple" },
  { label: "iPhone 16 Pro Max", handle: "flowcase-iphone-16-pro-max", brand: "apple" },
  { label: "iPhone 17", handle: "flowcase-iphone-17", brand: "apple" },
  { label: "iPhone 17 Pro", handle: "flowcase-iphone-17-pro", brand: "apple" },
  { label: "iPhone 17 Pro Max", handle: "flowcase-iphone-17-pro-max", brand: "apple" },
  { label: "Galaxy A56", handle: "flowcase-galaxy-a56", brand: "samsung" },
  { label: "Galaxy A36", handle: "flowcase-galaxy-a36", brand: "samsung" },
  { label: "Galaxy A26", handle: "flowcase-galaxy-a26", brand: "samsung" },
  { label: "Galaxy S25", handle: "flowcase-galaxy-s25", brand: "samsung" },
  { label: "Galaxy S25+", handle: "flowcase-galaxy-s25-plus", brand: "samsung" },
  { label: "Galaxy S25 Ultra", handle: "flowcase-galaxy-s25-ultra", brand: "samsung" },
]

/** "Flowcase for iPhone 15 Pro" → "iPhone 15 Pro" */
export const modelFromTitle = (title: string) =>
  title.replace(/^Flowcase for\s+/i, "")

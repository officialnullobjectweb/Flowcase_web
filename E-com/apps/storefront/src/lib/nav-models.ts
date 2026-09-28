/**
 * Static nav fallback (used only when the catalog fetch fails).
 * Images: NAV_IMAGES (hand-picked per model) override catalog thumbnails.
 */
export type NavModel = {
  label: string
  handle: string
  image?: string
  brand: "apple" | "samsung"
}

/** Hand-picked hover images for the mega menu, keyed by product handle. */
export const NAV_IMAGES: Record<string, string> = {
  "flowcase-iphone-15":
    "https://rukminim3.flixcart.com/image/480/640/xif0q/mobile/k/l/l/-resized-original-imagtc5fz9spysyk.jpeg?q=90",
  "flowcase-iphone-15-pro":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS76D9t63VUfuTR_0zRPu7vZg7r7YBuSDdkghKqelICZg&s=10",
  "flowcase-iphone-15-pro-max":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdVJVfgOoAfdxCWlNIO-L-r04DvuwoUXKJ-zM0B1fb5A&s=10",
  "flowcase-iphone-16":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFjy2Hi9YNbDObk-vRQ1SvH_rDSeNFTCCcciOQGIHwgA&s",
  "flowcase-iphone-16-pro":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaHAPIprq5sl9DeAWmuPraXslbEQFZqpRjldREtPMaGw&s",
  "flowcase-iphone-16-pro-max":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTN34uzeitxVtkIhWxZZ5Gb5hiiCKFJ-khUx0AtK9FHqA&s=10",
  "flowcase-iphone-17":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR-DugIe92jkH_nd-HHJTn8H2Gy_uOwxF2xPFP4QCekQ&s=10",
  "flowcase-iphone-17-pro":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1jG7djnWgE42t6DJ-3r8iynlRYuT3f1JsL5PjIAFA1w&s",
  "flowcase-iphone-17-pro-max":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR2tr245AKSrsBFjfwZ7hwGwq-Np8Zsz1WdTiIR9nigQ&s=10",
  "flowcase-galaxy-a26":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShIi7qMYUcgAXb_HFz9BKujHB_xjTQdmXNTi7X7iAk8A&s=10",
  "flowcase-galaxy-a56":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVJxdkrggDWY0xLITV51pQxaPsnsKIf3xVxjMVkxlsHg&s=10",
  "flowcase-galaxy-a36":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjPRWWSLgCFh_OoShfTMJtVn3Mgz7GFgMcjPcq8Ioddw&s=10",
  "flowcase-galaxy-s25-plus":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFCqiyjAe1DxEYG_2wtocgmrXyOAaHcrerMJGwnnPD5Q&s=10",
  "flowcase-galaxy-s25-ultra":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQA1Hpr6Rct3hGnW-FF1r5RC6m8_7lEb6W9kD49K8q1JA&s=10",
  "flowcase-galaxy-s25":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1Yl7gQY8s-qrKqodrR3Lr6_-pKXG3CG2maomPSM7N9Q&s=10",
}

const FALLBACK: NavModel[] = [
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

export const FALLBACK_MODELS: NavModel[] = FALLBACK.map((m) => ({
  ...m,
  image: NAV_IMAGES[m.handle],
}))

/** "Flowcase for iPhone 15 Pro" → "iPhone 15 Pro" */
export const modelFromTitle = (title: string) =>
  title.replace(/^Flowcase for\s+/i, "")

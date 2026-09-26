import Medusa from "@medusajs/js-sdk"

const baseUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  process.env.MEDUSA_BACKEND_URL ??
  "http://localhost:9000"

export const sdk = new Medusa({
  baseUrl,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
})

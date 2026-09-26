import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: typeof window !== "undefined" ? window.location.origin : "/",
  auth: {
    type: "session",
  },
})

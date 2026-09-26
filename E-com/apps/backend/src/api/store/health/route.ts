import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.setHeader("Cache-Control", "no-store")
  res.json({
    status: "live",
    timestamp: new Date().toISOString(),
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Bare admin.flowcase.in hits "/" — the admin SPA lives at /app.
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.redirect("/app")
}

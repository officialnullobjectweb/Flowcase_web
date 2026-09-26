import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getConfig } from "../../../lib/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.setHeader("Cache-Control", "no-store")
  res.json(getConfig())
}

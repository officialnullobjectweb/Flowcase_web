import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getConfig, saveConfig } from "../../../lib/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.setHeader("Cache-Control", "no-store")
  res.json(getConfig())
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (body.announcement) patch.announcement = body.announcement
  if (body.promo) patch.promo = body.promo
  if (body.heroes) patch.heroes = body.heroes
  if (body.pdp) patch.pdp = body.pdp
  saveConfig(patch)
  res.setHeader("Cache-Control", "no-store")
  res.json(getConfig())
}

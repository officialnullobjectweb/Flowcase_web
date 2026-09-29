import { NextResponse } from "next/server"

/** Public coupon check proxy — code/percent aren't secrets, tight limit here too. */
const hits = new Map<string, number[]>()

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= 15) return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 2000) hits.clear()

  const code = new URL(req.url).searchParams.get("code") ?? ""
  const token = process.env.ADMIN_API_TOKEN
  const base = (process.env.WORKER_URL ?? "").replace(/\/$/, "")
  if (!token || !base) return NextResponse.json({ valid: false }, { status: 200 })
  const sp = new URL(req.url).searchParams
  const qs = new URLSearchParams({ code })
  if (sp.get("subtotal")) qs.set("subtotal", sp.get("subtotal") as string)
  if (sp.get("shipping")) qs.set("shipping", sp.get("shipping") as string)
  // validate endpoint is public on the Worker; no Bearer needed
  const res = await fetch(`${base}/v1/coupons/validate?${qs}`).catch(() => null)
  if (!res) return NextResponse.json({ valid: false }, { status: 200 })
  const data = (await res.json().catch(() => ({ valid: false }))) as Record<string, unknown>
  return NextResponse.json(data)
}

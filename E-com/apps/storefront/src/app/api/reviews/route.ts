import { NextResponse } from "next/server"

/** Public review submit — light per-IP throttle, then Worker insert. */
const hits = new Map<string, number[]>()
const ipOf = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"

export async function POST(req: Request) {
  const ip = ipOf(req)
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= 3) return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 2000) hits.clear()

  const body = (await req.json().catch(() => ({}))) as {
    product_id?: string
    name?: string
    rating?: number
    title?: string
    body?: string
  }
  if (
    typeof body.product_id !== "string" || !body.product_id ||
    typeof body.name !== "string" || !body.name.trim() ||
    typeof body.rating !== "number" ||
    typeof body.body !== "string" || !body.body.trim()
  ) {
    return NextResponse.json({ error: "bad_review" }, { status: 400 })
  }
  const token = process.env.ADMIN_API_TOKEN
  const base = (process.env.WORKER_URL ?? "").replace(/\/$/, "")
  if (!token || !base) return NextResponse.json({ error: "reviews_offline" }, { status: 503 })
  const res = await fetch(`${base}/v1/reviews`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: body.product_id,
      name: body.name.trim().slice(0, 60),
      rating: Math.floor(body.rating),
      title: String(body.title ?? "").slice(0, 160),
      body: body.body.trim().slice(0, 2000),
    }),
  }).catch(() => null)
  if (!res) return NextResponse.json({ error: "reviews_offline" }, { status: 503 })
  const data = (await res.json().catch(() => ({ error: "bad_gateway" }))) as Record<string, unknown>
  return NextResponse.json(data, { status: res.status })
}

import { NextResponse } from "next/server"

/** Public checkout entry — forwards to the Worker (Bearer stays server-side).
 *  The Worker recomputes every rupee; client totals are display-only. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 })
  }
  const token = process.env.ADMIN_API_TOKEN
  const base = (process.env.WORKER_URL ?? "").replace(/\/$/, "")
  if (!token || !base) return NextResponse.json({ error: "checkout_offline" }, { status: 503 })
  const res = await fetch(`${base}/v1/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null)
  if (!res) return NextResponse.json({ error: "checkout_offline" }, { status: 503 })
  const data = (await res.json().catch(() => ({ error: "bad_gateway" }))) as Record<string, unknown>
  return NextResponse.json(data, { status: res.status })
}

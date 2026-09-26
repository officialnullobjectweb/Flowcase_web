import { NextResponse } from "next/server"
import {
  BACKEND,
  adminHeaders,
  adminToken,
  isNextResponse,
  verifySupabaseEmail,
} from "@/lib/medusa-admin"

/** Single order for the signed-in user — token email must own it. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySupabaseEmail(req)
  if (isNextResponse(auth)) return auth

  const { id } = await params
  try {
    const token = await adminToken()
    // email lives only in the list projection — ownership check first
    const ownRes = await fetch(
      `${BACKEND}/admin/orders?id=${encodeURIComponent(id)}&fields=id,email`,
      { headers: adminHeaders(token) }
    )
    if (!ownRes.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    const own = (await ownRes.json()) as {
      orders?: Array<{ id?: string; email?: string | null }>
    }
    const owner = (own.orders ?? [])[0]
    if (!owner) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    if ((owner.email ?? "").toLowerCase() !== auth.email) {
      return NextResponse.json({ error: "Email does not match this order" }, { status: 403 })
    }
    // full order for rendering (detail retrieve omits email, list omits items)
    const res = await fetch(
      `${BACKEND}/admin/orders/${encodeURIComponent(id)}`,
      { headers: adminHeaders(token) }
    )
    if (!res.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    const payload = (await res.json()) as { order?: Record<string, unknown> }
    return NextResponse.json({ order: { ...payload.order, email: owner.email } })
  } catch {
    return NextResponse.json({ error: "Could not reach the backend" }, { status: 502 })
  }
}

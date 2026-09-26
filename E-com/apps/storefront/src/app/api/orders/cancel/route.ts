import { NextResponse } from "next/server"
import {
  BACKEND,
  adminHeaders,
  adminToken,
  isNextResponse,
  verifySupabaseEmail,
} from "@/lib/medusa-admin"

/**
 * Storefront order cancellation (the js-sdk has no store-side cancel).
 * Ownership = the caller's verified Supabase token email must match the
 * order's email; then the server-side Medusa admin session cancels it.
 */
export async function POST(req: Request) {
  const auth = await verifySupabaseEmail(req)
  if (isNextResponse(auth)) return auth

  let orderId = ""
  try {
    const body = await req.json()
    orderId = String(body?.orderId ?? "")
    if (!orderId) throw new Error()
  } catch {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  }

  try {
    const token = await adminToken()

    // email lives only in the list projection — ownership check by id
    const ownRes = await fetch(
      `${BACKEND}/admin/orders?id=${encodeURIComponent(orderId)}&fields=id,email`,
      { headers: adminHeaders(token) }
    )
    if (!ownRes.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    const own = (await ownRes.json()) as {
      orders?: Array<{ email?: string | null }>
    }
    const owner = (own.orders ?? [])[0]
    if (!owner || (owner.email ?? "").toLowerCase() !== auth.email) {
      return NextResponse.json({ error: "Email does not match this order" }, { status: 403 })
    }

    const cancelRes = await fetch(
      `${BACKEND}/admin/orders/${encodeURIComponent(orderId)}/cancel`,
      { method: "POST", headers: adminHeaders(token), body: JSON.stringify({}) }
    )
    if (!cancelRes.ok) {
      const detail = (await cancelRes.json().catch(() => null)) as
        | { message?: string }
        | null
      return NextResponse.json(
        { error: detail?.message ?? "Could not cancel this order" },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Could not reach the backend" },
      { status: 502 }
    )
  }
}

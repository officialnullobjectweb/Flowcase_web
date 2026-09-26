import { NextResponse } from "next/server"
import {
  BACKEND,
  adminHeaders,
  adminToken,
  isNextResponse,
  verifySupabaseEmail,
} from "@/lib/medusa-admin"

/**
 * Orders for the signed-in Supabase user. Identity = verified token email,
 * matched against order.email — no Medusa customer session involved, so
 * guest-placed orders under the same e-mail show up too.
 */
export async function GET(req: Request) {
  const auth = await verifySupabaseEmail(req)
  if (isNextResponse(auth)) return auth

  try {
    const token = await adminToken()
    // email is NOT in the default list projection — request it explicitly
    const res = await fetch(
      `${BACKEND}/admin/orders?q=${encodeURIComponent(auth.email)}&limit=100&fields=id,email,display_id,status,total,currency_code,created_at,payment_status,fulfillment_status`,
      { headers: adminHeaders(token) }
    )
    if (!res.ok) {
      return NextResponse.json({ error: "Could not load orders" }, { status: 502 })
    }
    const payload = (await res.json()) as {
      orders?: Array<{ email?: string | null }>
    }
    const orders = (payload.orders ?? []).filter(
      (o) => (o.email ?? "").toLowerCase() === auth.email
    )
    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: "Could not reach the backend" }, { status: 502 })
  }
}

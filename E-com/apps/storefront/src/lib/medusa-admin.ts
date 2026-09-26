import { NextResponse } from "next/server"

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

/**
 * Verify the caller's Supabase bearer token server-side (plain REST call —
 * no SDK needed on the server) and return the signed-in email, which is the
 * identity orders are matched against.
 */
export async function verifySupabaseEmail(
  req: Request
): Promise<{ email: string } | NextResponse> {
  const header = req.headers.get("authorization") ?? ""
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : ""
  if (!token || !SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }
    const user = (await res.json()) as { email?: string }
    if (!user.email) {
      return NextResponse.json({ error: "Account has no email" }, { status: 403 })
    }
    return { email: user.email.toLowerCase() }
  } catch {
    return NextResponse.json({ error: "Could not verify session" }, { status: 502 })
  }
}

export function isNextResponse(
  v: { email: string } | NextResponse
): v is NextResponse {
  return v instanceof NextResponse
}

/** Server-side Medusa admin session (same pattern as /api/orders/cancel). */
export async function adminToken(): Promise<string> {
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (!email || !password) throw new Error("Admin credentials not configured")
  const login = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!login.ok) throw new Error("Admin login failed")
  const { token } = (await login.json()) as { token: string }
  return token
}

export function adminHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

export { BACKEND }

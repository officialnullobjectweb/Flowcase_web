import { NextResponse } from "next/server"
import { clearSessionCookie, sessionCookie, signSession } from "@/lib/admin-session"
import { supabaseAnon } from "@/lib/supabase"

const ipOf = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip")?.trim() ||
  "unknown"

export async function POST(req: Request) {
  const sb = supabaseAnon()
  const ip = ipOf(req)

  // exact throttle: 5 failures / 10 min / IP (Supabase-backed, survives scale)
  const { data: gate } = await sb.rpc("check_login_throttle", { p_ip: ip })
  if (!gate || (gate as { allowed?: boolean }).allowed !== true) {
    return NextResponse.json({ error: "locked_out" }, { status: 429 })
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  const want = process.env.ADMIN_PASSWORD
  if (!want || !password || password !== want) {
    return NextResponse.json({ error: "bad_credentials", remaining: (gate as { remaining?: number }).remaining ?? 0 }, { status: 401 })
  }

  await sb.rpc("clear_login_throttle", { p_ip: ip })
  const res = NextResponse.json({ ok: true })
  res.headers.set("Set-Cookie", sessionCookie(signSession()))
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.headers.set("Set-Cookie", clearSessionCookie())
  return res
}

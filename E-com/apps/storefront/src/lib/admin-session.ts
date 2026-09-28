import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Admin sessions — HMAC-signed tokens in an httpOnly cookie. No database,
 * no dependency. Must only be imported by server code (routes, middleware
 * uses a light structural check; full verification happens in routes).
 */
const COOKIE = "fc_admin"
const TTL_MS = 12 * 60 * 60 * 1000

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set")
  return s
}

export const adminCookieName = COOKIE

export function signSession(now = Date.now()): string {
  const exp = now + TTL_MS
  const sig = createHmac("sha256", secret()).update(String(exp)).digest("base64url")
  return `${exp}.${sig}`
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false
  const [expStr, sig] = token.split(".")
  const exp = Number(expStr)
  if (!expStr || !sig || !Number.isFinite(exp) || exp < Date.now()) return false
  const want = createHmac("sha256", secret()).update(expStr).digest("base64url")
  if (sig.length !== want.length) return false
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want))
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${TTL_MS / 1000}`
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

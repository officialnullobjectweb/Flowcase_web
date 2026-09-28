import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "./admin-session"

/** Bounces to login unless the request carries a valid admin session.
 *  Server components and actions only (redirect, never throw). */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get("fc_admin")?.value
  if (!verifySession(token)) redirect("/admin/login")
}

/** Same-origin guard for mutations (CSRF backstop alongside SameSite). */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin")
  if (!origin) return // same-origin navigations / curl without Origin
  const host = req.headers.get("host") ?? ""
  try {
    if (new URL(origin).host !== host) throw new Error("bad_origin")
  } catch {
    throw new Error("bad_origin")
  }
}

function workerBase(): string {
  const url = process.env.WORKER_URL
  if (!url) throw new Error("WORKER_URL is not set")
  return url.replace(/\/$/, "")
}

/** Server-to-Worker call (ADMIN_API_TOKEN never reaches the browser). */
export async function worker<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.ADMIN_API_TOKEN
  if (!token) throw new Error("ADMIN_API_TOKEN is not set")
  const res = await fetch(`${workerBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`worker ${res.status}`)
  return res.json() as Promise<T>
}

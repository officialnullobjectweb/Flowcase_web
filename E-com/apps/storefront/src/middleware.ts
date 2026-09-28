import { NextResponse, type NextRequest } from "next/server"

const ADMIN_PAGES = new Set(["/login", "/products", "/orders", "/reviews"])

function isAdminHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase()
  return bare === "admin.flowcase.in" || bare === "admin.localhost" || bare.startsWith("admin.")
}

function isLocal(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase().replace(/^\[(.*)\]$/, "$1")
  if (bare === "localhost" || bare === "admin.localhost" || bare.endsWith(".localhost")) return true
  // loopback + LAN IPs are always dev (and admin.<ip> is not a valid host anyway)
  if (bare === "127.0.0.1" || bare === "::1") return true
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(bare)
}

/**
 * Two apps, one deployment:
 * - admin.flowcase.in (prod) / admin.localhost:3000 (local) serves the admin
 *   panel at clean paths (/login, /products …) rewritten to /admin/*.
 * - the main domain never serves admin pages (redirects to the admin host
 *   in production; localhost keeps direct /admin access for development).
 * Every admin response carries X-Robots-Tag: noindex, nofollow.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get("host") ?? ""
  const res = NextResponse.next()
  res.headers.set("X-Robots-Tag", "noindex, nofollow")

  if (isAdminHost(host)) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/admin", req.url))
    }
    if (ADMIN_PAGES.has(pathname)) {
      return NextResponse.rewrite(new URL(`/admin${pathname}`, req.url))
    }
    if (pathname.startsWith("/api/") || pathname.startsWith("/admin")) {
      // the login endpoint issues sessions — never gate it
      if (pathname === "/api/admin/login") return res
      return checkSession(req, res)
    }
    return NextResponse.rewrite(new URL("/admin", req.url))
  }

  // main domain: admin pages live on the subdomain (except local dev)
  if (pathname.startsWith("/admin") && !isLocal(host)) {
    const bare = host.split(":")[0]
    const url = req.nextUrl.clone()
    url.host = `admin.${bare}`
    url.pathname = pathname.replace(/^\/admin/, "") || "/"
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login") return res
    return checkSession(req, res)
  }
  return res
}

function checkSession(req: NextRequest, res: NextResponse): NextResponse {
  // the login page itself is always reachable (it issues the session)
  if (req.nextUrl.pathname === "/admin/login") return res
  const token = req.cookies.get("fc_admin")?.value ?? ""
  const [expStr, sig] = token.split(".")
  const exp = Number(expStr)
  if (!expStr || !sig || !Number.isFinite(exp) || exp < Date.now()) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = "/admin/login"
    return NextResponse.redirect(url)
  }
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}

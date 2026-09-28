"use client"

import { Camera, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All cases" },
      { href: "/shop?tags=apple", label: "iPhone cases" },
      { href: "/shop?tags=samsung", label: "Samsung cases" },
      { href: "/collections/accessories", label: "Accessories" },
      { href: "/search", label: "Search" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/sustainability", label: "Sustainability" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/shipping-returns", label: "Shipping & returns" },
      { href: "/returns", label: "Return policy" },
      { href: "/refunds", label: "Refund policy" },
      { href: "/account", label: "Your account" },
      { href: "/account/orders", label: "Order history" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & conditions" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/data-collection", label: "Data collection" },
    ],
  },
]

export function Footer() {
  const [openCol, setOpenCol] = useState<string | null>(null)
  const pathname = usePathname()

  // Checkout is a focused, distraction-free flow.
  if (pathname === "/checkout") return null

  return (
    <footer className="border-t border-border bg-hero-ink text-hero-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Brand + tagline — super minimal */}
        <div className="flex flex-col items-center gap-2 border-b border-white/10 py-8 text-center">
          <Link href="/" className="display-tight font-display text-xl font-bold text-white" aria-label="Flowcase home">
            Flowcase.
          </Link>
          <p className="label text-white/60">Go with flow</p>
        </div>

        {/* Link columns — expandable buttons below lg, static on desktop */}
        <div className="grid gap-0 lg:grid-cols-5 lg:gap-10 lg:py-10">
          <div className="hidden lg:block lg:col-span-1">
            <p className="label text-white/60">Support — mon–fri, 10:00–18:00 ist</p>
            <a
              href="mailto:support@flowcase.in"
              className="mt-1 block break-all text-sm text-hero-muted transition hover:text-white"
            >
              support@flowcase.in
            </a>
            <div className="mt-4 flex gap-2">
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white hover:text-black"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          {COLS.map((col) => {
            const open = openCol === col.title
            return (
              <nav
                key={col.title}
                aria-label={col.title}
                className="border-b border-white/10 last:border-b-0 lg:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenCol(open ? null : col.title)}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white lg:pointer-events-none lg:py-0"
                >
                  <span className="label text-white">{col.title}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/60 transition-transform lg:hidden ${
                      open ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <ul
                  className={`${
                    open ? "block" : "hidden"
                  } space-y-2.5 pb-4 pt-2 lg:block lg:pb-0 lg:pt-4`}
                >
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-hero-muted transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )
          })}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-3 border-t border-white/10 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="label text-hero-muted">
            © {new Date().getFullYear()} Flowcase · Go with flow
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["UPI", "Visa", "Mastercard", "COD"].map((p) => (
              <span key={p} className="label border border-white/25 px-2 py-1 text-white/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

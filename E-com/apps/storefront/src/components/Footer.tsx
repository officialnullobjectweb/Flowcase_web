"use client"

import { ArrowRight, Camera, Check, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type FormEvent } from "react"

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All cases" },
      { href: "/shop?tags=apple", label: "iPhone cases" },
      { href: "/shop?tags=samsung", label: "Samsung cases" },
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
      { href: "/account", label: "Your account" },
      { href: "/account/orders", label: "Order history" },
      { href: "/account/login", label: "Sign in" },
    ],
  },
]

export function Footer() {
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [openCol, setOpenCol] = useState<string | null>(null)
  const pathname = usePathname()

  // Checkout is a focused, distraction-free flow.
  if (pathname === "/checkout") return null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    setSubscribed(true)
  }

  return (
    <footer className="border-t border-border bg-hero-ink text-hero-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Statement + newsletter */}
        <div className="grid gap-10 border-b border-white/10 py-14 lg:grid-cols-2 lg:py-16">
          <div className="text-center lg:text-left">
            <p className="label text-white/60">Go with flow</p>
            <p className="display-tight mx-auto mt-3 max-w-md font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:mx-0">
              Protection you stop noticing.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-hero-muted lg:mx-0">
              Slim, drop-tested cases for iPhone 15–17 and Samsung Galaxy A
              &amp; S — plus a reuse programme that keeps old cases out of
              landfill.
            </p>
            <Link
              href="/sustainability"
              className="label mt-5 inline-flex items-center gap-1.5 text-white underline-offset-4 transition hover:underline"
            >
              Our sustainability mission
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="text-center lg:justify-self-end lg:pl-8 lg:text-left">
            <p className="label text-white/60">Newsletter</p>
            <p className="mx-auto mt-3 text-sm text-hero-muted lg:mx-0">
              New drops, restocks, and reuse discounts. No spam.
            </p>
            {subscribed ? (
              <p className="label mt-4 flex items-center justify-center gap-2 text-white lg:justify-start">
                <Check className="h-4 w-4" aria-hidden="true" /> You&apos;re on
                the list.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="mx-auto mt-4 flex max-w-md gap-0 lg:mx-0">
                <label className="sr-only" htmlFor="footer-email">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOU@EMAIL.COM"
                  className="label w-full min-w-0 border border-white/25 bg-transparent px-4 py-3 text-white placeholder:text-white/50 focus:border-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="label shrink-0 border border-white bg-white px-5 py-3 text-black transition hover:bg-black hover:text-white hover:border-white/40"
                >
                  Join
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Link columns — collapsible on mobile, static from sm up */}
        <div className="grid gap-0 border-t border-white/10 sm:grid-cols-2 sm:gap-10 sm:border-t-0 sm:py-14 lg:grid-cols-5">
          <div className="py-10 sm:col-span-2 sm:py-0 lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3 text-white"
              aria-label="Flowcase home"
            >
              <span className="display-tight font-display text-xl font-bold">
                Flowcase.
              </span>
            </Link>
            <p className="label mt-5 text-white/60">Support — mon–fri, 10:00–18:00 ist</p>
            <a
              href="mailto:support@flowcase.example"
              className="mt-1 block break-all text-sm text-hero-muted transition hover:text-white"
            >
              support@flowcase.example
            </a>
            <div className="mt-6 flex gap-2">
              <a
                href="https://instagram.com"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white hover:text-black"
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
                className="border-b border-white/10 last:border-b-0 sm:block sm:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenCol(open ? null : col.title)}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:pointer-events-none sm:py-0"
                >
                  <span className="label text-white">{col.title}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/60 transition-transform sm:hidden ${
                      open ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <ul
                  className={`${
                    open ? "block" : "hidden"
                  } space-y-2.5 pb-4 pt-2 sm:block sm:pb-0 sm:pt-4`}
                >
                  {col.links.map((link) => (
                    <li key={link.href}>
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
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="label text-hero-muted">
            © {new Date().getFullYear()} Flowcase. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {["UPI", "Visa", "Mastercard", "COD"].map((p) => (
              <span
                key={p}
                className="label border border-white/25 px-2 py-1 text-white/70"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

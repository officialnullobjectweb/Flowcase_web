"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useCart } from "@/context/CartContext"
import { fuzzyRank, type FuzzyItem } from "@/lib/fuzzy"
import { sdk } from "@/lib/sdk"
import { FALLBACK_MODELS, modelFromTitle, type NavModel } from "@/lib/nav-models"
import type { CmsAnnouncement } from "@/lib/cms"

const LINKS = [
  { href: "/shop", label: "Shop", mega: null as null },
  { href: "/shop?tags=samsung", label: "Samsung", mega: "samsung" as const },
  { href: "/shop?tags=apple", label: "Apple", mega: "apple" as const },
  { href: "/collections/accessories", label: "Accessories", mega: null },
  { href: "/shop?badge=limited", label: "Limited edition", mega: null },
]

const MEGA_TITLES = {
  apple: "iPhone",
  samsung: "Samsung Galaxy",
}

function SearchField({
  id,
  tone,
  autoFocus,
  onSubmitted,
}: {
  id: string
  tone: "light" | "dark"
  autoFocus?: boolean
  onSubmitted?: () => void
}) {
  const router = useRouter()
  const dark = tone === "dark"
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<FuzzyItem[]>([])
  const [active, setActive] = useState(-1)
  const pool = useRef<FuzzyItem[] | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const ensurePool = async (): Promise<FuzzyItem[]> => {
    if (pool.current) return pool.current
    try {
      const res = await sdk.client.fetch<{
        products: { id: string; title: string; handle: string; thumbnail?: string | null }[]
      }>("/store/products", {
        query: { limit: 100, fields: "id,title,handle,thumbnail" },
      })
      pool.current = res.products ?? []
    } catch {
      pool.current = []
    }
    return pool.current
  }

  const onInput = (value: string) => {
    setQ(value)
    setActive(-1)
    ensurePool().then((pool) => {
      setItems(value.trim() ? fuzzyRank(value, pool, 5) : [])
      setOpen(value.trim().length > 0)
    })
  }

  const go = (item: FuzzyItem) => {
    setOpen(false)
    setQ("")
    router.push(`/products/${item.handle}`)
    onSubmitted?.()
  }

  const submit = () => {
    if (!q.trim()) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    onSubmitted?.()
  }

  return (
    <div
      ref={box}
      className="relative"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <form
        action="/search"
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (active >= 0 && items[active]) go(items[active])
          else submit()
        }}
      >
        <label className="sr-only" htmlFor={id}>
          Search cases
        </label>
        <div
          className={`flex items-center gap-2 border-b transition focus-within:border-foreground ${
            dark ? "border-white/40" : "border-border"
          }`}
        >
          <Search
            className={`h-4 w-4 shrink-0 ${dark ? "text-white/70" : "text-muted-foreground"}`}
            aria-hidden="true"
          />
          <input
            id={id}
            type="search"
            name="q"
            role="combobox"
            autoFocus={autoFocus}
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="SEARCH CASES"
            value={q}
            onChange={(e) => onInput(e.target.value)}
            onFocus={() => q.trim() && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false)
              if (e.key === "ArrowDown" && items.length) {
                e.preventDefault()
                setActive((i) => (i + 1) % items.length)
              }
              if (e.key === "ArrowUp" && items.length) {
                e.preventDefault()
                setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
              }
            }}
            className={`label w-full min-w-0 bg-transparent py-2.5 placeholder:opacity-70 focus:outline-none ${
              dark
                ? "text-white placeholder:text-white/70"
                : "text-foreground placeholder:text-muted-foreground"
            }`}
          />
          <button
            type="submit"
            className={`label shrink-0 transition hover:opacity-70 ${dark ? "text-white" : "text-foreground"}`}
          >
            Go
          </button>
        </div>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            id={`${id}-list`}
            role="listbox"
            aria-label="Search suggestions"
            className="absolute left-0 right-0 top-full z-50 mt-2 border border-border bg-background text-foreground"
          >
            {items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No cases match “{q}”.
              </p>
            ) : (
              <ul>
                {items.map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition last:border-b-0 ${
                        i === active ? "bg-muted" : ""
                      }`}
                    >
                      <span className="h-10 w-10 shrink-0 overflow-hidden border border-border bg-muted">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="label block text-muted-foreground">
                          View case
                        </span>
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={submit}
                    className="label w-full bg-muted px-4 py-3 text-left text-muted-foreground transition hover:text-foreground"
                  >
                    See all results for “{q}” →
                  </button>
                </li>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CountBadge({ count, solid }: { count: number; solid: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
        solid ? "bg-primary text-primary-foreground" : "bg-white text-black"
      }`}
    >
      {count}
    </span>
  )
}

function ModelRow({
  model,
  onClose,
}: {
  model: NavModel
  onClose?: () => void
}) {
  return (
    <Link
      href={`/products/${model.handle}`}
      onClick={onClose}
      className="group flex items-center gap-3 border border-border px-3 py-2.5 transition hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
    >
      <span className="relative h-10 w-10 shrink-0 overflow-hidden bg-muted">
        {model.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover grayscale transition group-hover:grayscale-0"
          />
        ) : null}
      </span>
      <span className="label flex-1 truncate text-foreground">{model.label}</span>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground"
        aria-hidden="true"
      />
    </Link>
  )
}

function AnnouncementBar({
  cfg,
  messages,
}: {
  cfg?: CmsAnnouncement
  messages: { text: string; link?: string }[]
}) {
  if (!messages.length) return null
  const barLink = cfg?.link?.trim() || ""

  const inner = cfg?.marquee ? (
    <div className="relative w-full overflow-hidden">
      <style>{`@keyframes fc-ann{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){[style*="fc-ann"]{animation:none !important}}`}</style>
      <div
        className="flex w-max"
        style={{ animation: `fc-ann ${cfg.speed || 24}s linear infinite` }}
      >
        {[0, 1].map((dup) => (
          <span
            key={dup}
            className="label flex shrink-0 items-center gap-10 pr-10 text-white/90"
            aria-hidden={dup === 1}
          >
            {messages.map((m, i) => (
              <span key={i} className="whitespace-nowrap">
                {m.text}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  ) : (
    <p className="label text-center text-white/90">
      {messages.map((m, i) => (
        <span key={i}>
          {i > 0 ? " · " : ""}
          {m.link ? (
            <Link href={m.link} className="underline-offset-2 hover:underline">
              {m.text}
            </Link>
          ) : (
            m.text
          )}
        </span>
      ))}
    </p>
  )

  const content = (
    <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 sm:px-6">
      <span className="h-1.5 w-1.5 shrink-0 bg-white" aria-hidden="true" />
      {inner}
    </div>
  )

  if (barLink) {
    return (
      <Link href={barLink} className="block transition hover:opacity-80">
        {content}
      </Link>
    )
  }
  return content
}

export function SiteHeader({
  models,
  announcement,
}: {
  models?: NavModel[]
  announcement?: CmsAnnouncement
}) {
  const list = models?.length ? models : FALLBACK_MODELS
  const apple = list.filter((m) => m.brand === "apple")
  const samsung = list.filter((m) => m.brand === "samsung")

  const { itemCount, openCart, ready } = useCart()
  const pathname = usePathname()
  const overlayRoute = pathname === "/" || pathname === "/shop" || pathname === "/sustainability"

  const annPageKey =
    pathname === "/"
      ? "home"
      : pathname === "/shop"
        ? "shop"
        : pathname === "/cart"
          ? "cart"
          : pathname.startsWith("/products/")
            ? "product"
            : ""
  const annPages = announcement?.pages ?? ["home", "shop", "cart", "product"]
  const annVisible =
    (announcement?.enabled ?? true) &&
    !!annPageKey &&
    annPages.includes(annPageKey)
  const annMessages = (announcement?.messages ?? []).filter((m) => m.text?.trim())

  const [scrolled, setScrolled] = useState(false)
  const [mega, setMega] = useState<"apple" | "samsung" | null>(null)
  const [active, setActive] = useState<{ brand: "apple" | "samsung"; index: number }>({
    brand: "apple",
    index: 0,
  })
  const [mobileMenu, setMobileMenu] = useState(false)
  const [mobileBrand, setMobileBrand] = useState<"apple" | "samsung">("apple")
  const [searchOpen, setSearchOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // mega no longer forces the bar solid — navbar stays transparent over the
  // hero while a menu panel is open (the panel itself is frosted, not solid)
  const transparent = overlayRoute && !scrolled && !mobileMenu

  useEffect(() => {
    // Hysteresis (40px down / 8px up) + rAF batching so the announcement
    // collapse and transparent→solid flip happen once per direction — no
    // flicker or vibration when scroll jitters around the threshold.
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        setScrolled((prev) => (prev ? y > 8 : y > 40))
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    setMobileMenu(false)
    setMega(null)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(null)
        setMobileMenu(false)
        setSearchOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!mobileMenu) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileMenu])

  const hoverMega = (m: "apple" | "samsung" | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    if (m === null) {
      closeTimer.current = setTimeout(() => setMega(null), 140)
    } else {
      setMega(m)
      setActive({ brand: m, index: 0 })
    }
  }

  const activeList = active.brand === "apple" ? apple : samsung
  const activeModel = activeList[active.index] ?? activeList[0]

  const megaGroups =
    mega === "samsung"
      ? [{ brand: "samsung" as const, title: "Samsung Galaxy", items: samsung }]
      : [{ brand: "apple" as const, title: "iPhone", items: apple }]

  const megaTitle = mega ? MEGA_TITLES[mega] : ""
  const megaCount = megaGroups.reduce((sum, g) => sum + g.items.length, 0)

  const iconTone = transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
  const solid = !transparent

  return (
    <>
      <header
        className={overlayRoute ? "fixed inset-x-0 top-0 z-50" : "sticky top-0 z-40"}
        onMouseLeave={() => hoverMega(null)}
      >
        {/* Announcement — collapses on scroll; hidden on the checkout flow */}
        <motion.div
          initial={false}
          animate={{
            height:
              scrolled || mobileMenu || pathname === "/checkout" || !annVisible
                ? 0
                : "auto",
            opacity:
              scrolled || mobileMenu || pathname === "/checkout" || !annVisible
                ? 0
                : 1,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden bg-hero-ink"
        >
          <AnnouncementBar cfg={announcement} messages={annMessages} />
        </motion.div>

        <div
          className={`transition-colors duration-300 ${
            solid
              ? "border-b border-border bg-background/90 text-foreground backdrop-blur-xl"
              // transparent over the hero: gradient scrim guarantees the white
              // nav stays readable over bright videos, light posters, or a
              // slow-loading hero — no white-on-white, ever.
              : "border-b border-transparent bg-gradient-to-b from-black/55 via-black/15 to-transparent text-white"
          }`}
        >
          <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setMobileMenu(true)}
                aria-label="Open menu"
                aria-expanded={mobileMenu}
                className={`-ml-2 flex h-11 w-11 items-center justify-center rounded-full transition lg:hidden ${iconTone}`}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link
                href="/"
                className="hidden shrink-0 items-center gap-2 transition hover:opacity-70 lg:flex"
                aria-label="Flowcase home"
              >
                <span className="display-tight font-display text-lg font-bold">
                  Flowcase.
                </span>
              </Link>
              {/* Mobile/tablet: centered logo */}
              <Link
                href="/"
                className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 transition hover:opacity-70 lg:hidden"
                aria-label="Flowcase home"
              >
                <span className="display-tight font-display text-lg font-bold">
                  Flowcase.
                </span>
              </Link>
            </div>

            {/* Desktop: centered menu — shop / samsung / apple */}
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex"
              aria-label="Primary"
            >
              {LINKS.map((link) => {
                const open = !!link.mega && mega === link.mega
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onMouseEnter={() => hoverMega(link.mega)}
                    onFocus={() => hoverMega(link.mega)}
                    aria-haspopup={link.mega ? "menu" : undefined}
                    aria-expanded={link.mega ? open : undefined}
                    className={`label group relative py-5 transition ${
                      solid
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-white/80 hover:text-white"
                    } ${open ? (solid ? "text-foreground" : "text-white") : ""}`}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-4 h-px origin-left transition-transform duration-300 group-hover:scale-x-100 ${
                        open ? "scale-x-100" : "scale-x-0"
                      } ${solid ? "bg-foreground" : "bg-white"}`}
                    />
                  </Link>
                )
              })}
            </nav>

            {/* Desktop search panel — toggled by the right-side icon */}
            {searchOpen && (
              <div className="absolute inset-0 z-10 hidden items-center gap-3 border-b border-border bg-background px-4 text-foreground sm:px-6 lg:flex">
                <div className="mx-auto w-full max-w-xl">
                  <SearchField
                    id="nav-search-desktop"
                    tone="light"
                    autoFocus
                    onSubmitted={() => setSearchOpen(false)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-muted"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-0.5">
              <Link
                href="/search"
                aria-label="Search"
                className={`flex h-11 w-11 items-center justify-center rounded-full transition lg:hidden ${iconTone}`}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search"
                aria-expanded={searchOpen}
                className={`hidden h-11 w-11 items-center justify-center rounded-full transition lg:flex ${iconTone}`}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={openCart}
                aria-label={`Open cart, ${ready ? itemCount : 0} items`}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${iconTone}`}
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                <AnimatePresence>
                  {ready && itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    >
                      <CountBadge count={itemCount} solid={solid} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <Link
                href="/account"
                aria-label="Account"
                className={`hidden h-11 w-11 items-center justify-center rounded-full transition lg:flex ${iconTone}`}
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop mega — contained floating overlay, never pushes the page */}
        <AnimatePresence>
          {mega && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full hidden px-6 lg:block"
              role="menu"
              aria-label={MEGA_TITLES[mega]}
              onMouseEnter={() => hoverMega(mega)}
            >
              <div className="relative mx-auto grid max-w-5xl border border-border bg-background/90 text-foreground shadow-[0_40px_80px_-32px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:h-[472px] lg:grid-cols-2">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 bg-foreground"
                />
                {/* Left: hovered model visual */}
                <div className="relative overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
                  <div className="relative h-full bg-muted">
                    <AnimatePresence mode="wait">
                      {activeModel?.image && (
                        <motion.div
                          key={activeModel.handle}
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.28 }}
                          className="absolute inset-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeModel.image}
                            alt={activeModel.label}
                            className="h-full w-full object-cover"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-5 left-6 right-6">
                      <p className="label text-white/70">
                        {activeModel?.brand === "samsung" ? "Samsung" : "Apple"}
                      </p>
                      <p className="display-tight mt-1 font-display text-2xl font-bold text-white">
                        {activeModel?.label}
                      </p>
                      <p className="label mt-2 inline-flex items-center gap-1.5 text-white/80">
                        View cases
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: model lists */}
                <div className="flex min-h-0 flex-col p-8">
                  <div className="flex items-baseline justify-between border-b border-border pb-3">
                    <p className="label text-foreground">
                      <span
                        className="mr-2 inline-block h-1.5 w-1.5 bg-foreground align-middle"
                        aria-hidden="true"
                      />
                      {megaTitle}
                    </p>
                    <p className="label text-muted-foreground">{megaCount} models</p>
                  </div>

                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    {megaGroups.map((group) => (
                      <div key={group.brand}>
                        <ul className="grid gap-x-8 sm:grid-cols-2">
                          {group.items.map((m, i) => (
                            <li key={m.handle}>
                              <Link
                                href={`/products/${m.handle}`}
                                aria-label={`View ${m.label} cases`}
                                onMouseEnter={() => setActive({ brand: group.brand, index: i })}
                                onFocus={() => setActive({ brand: group.brand, index: i })}
                                onClick={() => setMega(null)}
                                className="group flex w-full items-center justify-between gap-3 border-b border-border py-3 text-left transition hover:border-foreground focus:outline-none"
                              >
                                <span className="label text-foreground transition group-hover:translate-x-1">
                                  {m.label}
                                </span>
                                <ArrowRight
                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                                  aria-hidden="true"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
                    <p className="label text-muted-foreground">
                      Free shipping over ₹999
                    </p>
                    <Link
                      href={`/shop?tags=${mega}`}
                      onClick={() => setMega(null)}
                      className="label inline-flex items-center gap-1.5 text-foreground transition hover:underline"
                    >
                      View all {megaTitle} cases
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile: full-page menu */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {mobileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menu"
              >
                <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
                  <Link href="/" onClick={() => setMobileMenu(false)} className="flex items-center gap-2">
                    <span className="display-tight font-display text-lg font-bold">
                      Flowcase.
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenu(false)}
                    aria-label="Close menu"
                    className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-muted"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col px-4 py-6">
                  <SearchField id="nav-search-mobile" tone="light" onSubmitted={() => setMobileMenu(false)} />

                  {/* Brand pages — filter auto-applied */}
                  <p className="label mt-8 text-muted-foreground">Shop by brand</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {(
                      [
                        { key: "apple" as const, name: "Apple", sub: "iPhone 15–17", count: apple.length },
                        { key: "samsung" as const, name: "Samsung", sub: "Galaxy A & S", count: samsung.length },
                      ]
                    ).map((b) => (
                      <Link
                        key={b.key}
                        href={`/shop?tags=${b.key}`}
                        onClick={() => setMobileMenu(false)}
                        className="group flex flex-col justify-between border border-border p-4 transition active:bg-muted hover:border-foreground"
                      >
                        <div>
                          <p className="display-tight font-display text-lg font-bold">{b.name}</p>
                          <p className="label mt-1 text-muted-foreground">{b.sub}</p>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="label text-muted-foreground">{b.count} cases</span>
                          <ArrowRight
                            className="h-4 w-4 transition group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/collections/accessories"
                    onClick={() => setMobileMenu(false)}
                    className="mt-4 flex items-center justify-between border border-border p-4 transition hover:border-foreground active:bg-muted"
                  >
                    <span className="label">Accessories — speakers · power banks · cables</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  <Link
                    href="/shop?badge=limited"
                    onClick={() => setMobileMenu(false)}
                    className="mt-4 flex items-center justify-between border border-border p-4 transition hover:border-foreground active:bg-muted"
                  >
                    <span className="label">Limited edition</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  {/* Model selector */}
                  <div className="mt-8 flex items-center justify-between">
                    <p className="label text-muted-foreground">Pick your model</p>
                    <div className="flex border border-border">
                      {(["apple", "samsung"] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setMobileBrand(b)}
                          aria-pressed={mobileBrand === b}
                          className={`label px-3 py-1.5 transition ${
                            mobileBrand === b
                              ? "bg-foreground text-background"
                              : "text-muted-foreground"
                          }`}
                        >
                          {b === "apple" ? "iPhone" : "Galaxy"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1.5">
                    {(mobileBrand === "apple" ? apple : samsung).map((m) => (
                      <ModelRow
                        key={m.handle}
                        model={m}
                        onClose={() => setMobileMenu(false)}
                      />
                    ))}
                  </div>

                  {/* Account — pinned to the very bottom of the menu */}
                  <div className="mt-auto pt-8">
                    <Link
                      href="/account"
                      onClick={() => setMobileMenu(false)}
                      className="group flex items-center gap-4 border border-border bg-muted/60 p-4 transition hover:border-foreground active:bg-muted"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <User className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Your account</span>
                        <span className="label mt-1 block text-muted-foreground">
                          Sign in · Orders · Profile
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

export { modelFromTitle }

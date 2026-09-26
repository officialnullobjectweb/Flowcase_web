"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { CmsPromo } from "@/lib/cms"

const KEY = "flowcase_promo_dismissed"

/** Admin-managed offer popup — once per session, never on checkout. */
export function PromoModal({ promo }: { promo: CmsPromo }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!promo.enabled || pathname === "/checkout") return
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(KEY) === "1"
    } catch {
      // private mode — just don't show
      return
    }
    if (dismissed) return
    const t = setTimeout(
      () => setOpen(true),
      Math.max(0, promo.delay || 0) * 1000
    )
    return () => clearTimeout(t)
  }, [promo.enabled, promo.delay, pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const close = () => {
    setOpen(false)
    try {
      sessionStorage.setItem(KEY, "1")
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={promo.title || "Offer"}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close offer"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground transition hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {promo.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promo.image}
                alt=""
                className="h-44 w-full object-cover sm:h-52"
              />
            ) : null}

            <div className="p-6 sm:p-7">
              <p className="label text-muted-foreground">Limited-time offer</p>
              <h2 className="display-tight mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
                {promo.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {promo.body}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {promo.cta_label ? (
                  <Link
                    href={promo.cta_link || "/shop"}
                    onClick={close}
                    className="label inline-flex h-11 items-center rounded-full bg-foreground px-7 text-background transition hover:opacity-85"
                  >
                    {promo.cta_label}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="label inline-flex h-11 items-center rounded-full border border-border px-6 transition hover:border-foreground"
                >
                  No thanks
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

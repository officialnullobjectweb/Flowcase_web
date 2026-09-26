"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { useCart } from "@/context/CartContext"
import { formatPrice } from "@/lib/format"

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    setQuantity,
    removeItem,
    ready,
    subtotal,
    currency,
    itemCount,
  } = useCart()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [closeCart])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" role="presentation">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="absolute inset-0 bg-black/40"
            aria-label="Close cart overlay"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="display-tight font-display text-base font-bold">
                Your bag{" "}
                {ready && itemCount > 0 && (
                  <span className="text-muted-foreground">({itemCount})</span>
                )}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ready && items.length > 0 && (() => {
              const freeAt = currency === "inr" ? 999 : 25
              const remaining = Math.max(0, freeAt - subtotal)
              const pct = Math.min(100, Math.round((subtotal / freeAt) * 100))
              return (
                <div className="border-b border-border px-5 py-3" aria-live="polite">
                  <p className="label text-muted-foreground">
                    {remaining > 0 ? (
                      <>
                        Add <span className="text-foreground">{formatPrice(remaining, currency)}</span> for free shipping
                      </>
                    ) : (
                      <span className="text-success">Free shipping unlocked ✓</span>
                    )}
                  </p>
                  <div className="mt-2 h-1 w-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Free shipping progress">
                    <div
                      className={remaining > 0 ? "h-full bg-foreground transition-[width] duration-700" : "h-full bg-success transition-[width] duration-700"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!ready ? (
                <p className="text-sm text-muted-foreground">Loading cart…</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <span className="label grid h-14 w-14 place-items-center rounded-full border border-border text-muted-foreground">
                    0
                  </span>
                  <p className="mt-5 text-sm font-semibold">Your bag is empty</p>
                  <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                    Slim, drop-tested cases for iPhone 15–17 and Galaxy A/S — ready to ship in 48 hours.
                  </p>
                  <Link
                    href="/shop"
                    onClick={closeCart}
                    className="label mt-6 inline-flex h-10 items-center rounded-full bg-primary px-6 text-primary-foreground transition hover:bg-primary/85"
                  >
                    Browse cases
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 32, transition: { duration: 0.18 } }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="flex gap-4"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-muted">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.handle}`}
                              onClick={closeCart}
                              className="truncate text-sm font-medium hover:underline"
                            >
                              {item.title}
                            </Link>
                            {item.variantTitle && (
                              <p className="truncate text-xs text-muted-foreground">
                                {item.variantTitle}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
                            aria-label={`Remove ${item.title}`}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center border border-border">
                            <button
                              type="button"
                              onClick={() => setQuantity(item.id, item.quantity - 1)}
                              className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-5 text-center text-sm">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.id, item.quantity + 1)}
                              className="px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-medium">
                            {formatPrice(item.unitPrice * item.quantity, currency)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {ready && items.length > 0 && (
              <div className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">
                    {formatPrice(subtotal, currency)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shipping and taxes calculated at checkout.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="label flex h-11 w-full items-center justify-center rounded-full border border-border transition hover:border-foreground"
                  >
                    View bag
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="label flex h-11 w-full items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/85"
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

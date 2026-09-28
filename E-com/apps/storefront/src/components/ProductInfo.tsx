"use client"

import { RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/context/CartContext"
import { useSelection } from "@/context/SelectionContext"
import { SWATCHES } from "@/components/FilterSortBar"
import { productBadges } from "@/lib/badges"
import { formatPrice } from "@/lib/format"
import type { Product, ProductVariant } from "@/lib/types"
import { Button } from "./ui/button"
import { useToast } from "./ui/toast"

interface ProductInfoProps {
  product: Product
}

function selectedVariant(
  product: Product,
  optionSelection: Record<string, string>
): ProductVariant | null {
  if (!product.variants?.length) return null
  if (!product.options?.length) return product.variants[0]

  // selection holds option-value ids keyed by option id; each variant
  // carries the value id it was created with (vo.id) — match on ids,
  // never on the display name.
  const matches = product.variants.filter((variant) =>
    (variant.options ?? []).every((vo) => {
      const chosen = optionSelection[vo.option_id ?? ""]
      return chosen ? vo.id === chosen : vo.value === chosen
    })
  )
  return matches[0] ?? product.variants[0]
}

const TRUST = [
  { icon: Truck, label: "Free shipping over ₹999" },
  { icon: RotateCcw, label: "7-day returns" },
  { icon: ShieldCheck, label: "COD available" },
  { icon: Wallet, label: "UPI · cards · netbanking" },
]

export function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter()
  const { addItem, closeCart } = useCart()
  const { toast } = useToast()
  const [added, setAdded] = useState(false)

  // Sticky bottom buy bar only appears once the main CTA row has scrolled
  // out of view above the viewport — no floating bar at the top of the page.
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const [showBar, setShowBar] = useState(false)

  useEffect(() => {
    const el = ctaRef.current
    if (!el) return
    // ponytail: plain scroll+rect instead of IntersectionObserver — IO never
    // fires for jumps that skip the intersecting phase (CTA starts below fold,
    // so End key / programmatic scroll left the bar stuck hidden)
    let raf = 0
    const update = () => {
      raf = 0
      setShowBar(el.getBoundingClientRect().bottom <= 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const { selection, select } = useSelection()

  const variant = selectedVariant(product, selection)
  const price = variant?.calculated_price?.calculated_amount ?? null
  const original = variant?.calculated_price?.original_amount ?? null
  const currency = variant?.calculated_price?.currency_code ?? "inr"
  const hasDiscount = original != null && price != null && original > price
  const discountPercent =
    hasDiscount && price != null && original != null
      ? Math.round((1 - price / original) * 100)
      : 0
  const stock = variant?.inventory_quantity ?? null
  const backorder = variant?.allow_backorder ?? false
  const manage = variant?.manage_inventory ?? false
  const inStock = !manage || backorder || (stock != null && stock > 0)

  const colors = String(product.metadata?.colors ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)

  const handleAdd = () => {
    if (!variant) return
    addItem({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantTitle: variant.title,
      handle: product.handle,
      thumbnail: product.thumbnail ?? product.images?.[0]?.url ?? null,
      unitPrice: price ?? 0,
      currency,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
    toast({ title: "Added to bag", detail: product.title, icon: "bag" })
  }

  const handleBuyNow = () => {
    if (!variant) return
    addItem({
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantTitle: variant.title,
      handle: product.handle,
      thumbnail: product.thumbnail ?? product.images?.[0]?.url ?? null,
      unitPrice: price ?? 0,
      currency,
    })
    // addItem opens the drawer — close it again, we're heading to checkout
    closeCart()
    router.push("/checkout")
  }

  return (
    <div className="space-y-7 text-center lg:text-left">
      <div>
        <p className="label text-muted-foreground">
          {product.tags?.[0]?.value ?? "Case"}
          {variant?.sku ? ` — ${variant.sku}` : ""}
        </p>
        <h1 className="display-tight mt-3 font-display text-3xl font-bold leading-[1.05] sm:text-4xl">
          {product.title}
        </h1>
        {(() => {
          const badges = productBadges(product, discountPercent)
          if (!badges.length) return null
          const toneCls: Record<string, string> = {
            signal: "bg-primary text-primary-foreground",
            ink: "bg-foreground text-background",
            outline: "border border-border text-muted-foreground",
          }
          return (
            <ul className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
              {badges.map((b) => (
                <li key={b.label} className={`label px-2 py-1 ${toneCls[b.tone]}`}>
                  {b.label}
                </li>
              ))}
            </ul>
          )
        })()}
        <p aria-live="polite" className="label mt-4">
          {inStock ? (
            <span className="text-success">● In stock — dispatches in 48h</span>
          ) : (
            <span className="text-danger">● Out of stock</span>
          )}
        </p>
        <p className="label mt-2 flex items-center gap-2 text-muted-foreground">
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Delivery in 3–5 days across India · Free over ₹999
        </p>
      </div>

      <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 border-y border-border py-5 lg:justify-start">
        <span className="display-tight font-display text-3xl font-bold">
          {formatPrice(price, currency)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(original, currency)}
            </span>
            <span className="label bg-foreground px-2 py-1 text-white">
              −{discountPercent}% off
            </span>
          </>
        )}
        <span className="label w-full text-muted-foreground">
          Inclusive of all taxes · shipping calculated at checkout
        </span>
      </div>

      {colors.length > 0 && (
        <div>
          <p className="label mb-3 text-muted-foreground">Colours</p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
            {colors.map((c) => (
              <li
                key={c}
                className="label flex items-center gap-2 text-muted-foreground"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-border"
                  style={{ background: SWATCHES[c] ?? "#e5e5e5" }}
                  aria-hidden="true"
                />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(product.options ?? []).map((option) => (
        <div key={option.id}>
          <p className="label mb-3 text-muted-foreground">
            Select {option.title}
          </p>
          <div role="radiogroup" aria-label={option.title} className="flex flex-wrap justify-center gap-2 lg:justify-start">
            {option.values.map((value) => {
              const active = selection[option.id] === value.id
              return (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => select(option.id, value.id)}
                  className={`label min-h-11 border px-5 transition ${
                    active
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-foreground"
                  }`}
                >
                  {value.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div ref={ctaRef} className="flex items-center justify-center gap-3 lg:justify-start">
        <Button
          variant="outline"
          size="lg"
          className="h-12 flex-1 sm:flex-none sm:px-10"
          disabled={!inStock || !variant}
          onClick={handleAdd}
        >
          {!inStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
        </Button>
        <Button
          size="lg"
          className="h-12 flex-1 sm:flex-none sm:px-10"
          disabled={!inStock || !variant}
          onClick={handleBuyNow}
        >
          Buy now
        </Button>
      </div>

      <ul className="grid gap-3 border-y border-border py-5 sm:grid-cols-4">
        {TRUST.map(({ icon: Icon, label }) => (
          <li key={label} className="label flex items-center justify-center gap-2 text-muted-foreground lg:justify-start">
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>

      <p className="label text-muted-foreground">
        Questions?{" "}
        <a href="/shipping-returns" className="border-b border-foreground text-foreground">
          Shipping &amp; returns policy
        </a>{" "}
        · <a href="/contact" className="border-b border-foreground text-foreground">Contact us</a>
      </p>

      {/* Sticky bottom buy bar — anchored, solid, revealed after the CTA row.
          Must stay the LAST child: space-y-7 gives non-last children
          margin-block-end:28px, which would float the fixed bar above the bottom. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background transition-all duration-300 ease-out lg:hidden ${
          showBar ? "translate-y-0 visible" : "translate-y-full invisible"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="min-w-0 flex-1 text-left">
            <p className="display-tight truncate font-display text-lg font-bold">
              {formatPrice(price, currency)}
            </p>
            <p className="label truncate text-muted-foreground">
              {inStock ? "In stock · 48h dispatch" : "Out of stock"}
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 shrink-0 px-4"
            disabled={!inStock || !variant}
            onClick={handleAdd}
          >
            {!inStock ? "Sold out" : added ? "Added ✓" : "Add to cart"}
          </Button>
          <Button
            className="h-11 shrink-0 px-5"
            disabled={!inStock || !variant}
            onClick={handleBuyNow}
          >
            Buy now
          </Button>
        </div>
      </div>
    </div>
  )
}

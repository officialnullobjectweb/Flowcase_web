"use client"

import { Minus, Plus, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { useWishlist } from "@/context/WishlistContext"
import { formatPrice } from "@/lib/format"

export function CartView() {
  const { items, ready, setQuantity, removeItem, subtotal, currency } = useCart()
  const { toggle } = useWishlist()

  if (!ready) {
    return <p className="label text-muted-foreground">Loading bag…</p>
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border p-14 text-center">
        <p className="display-tight font-display text-xl font-semibold">
          Your bag is empty.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Add a case and it'll show up here — your bag is kept on this device.
        </p>
        <Link
          href="/shop"
          className="label mt-6 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
        >
          Browse cases
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <ul className="space-y-0 lg:col-span-7">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-4 border-b border-border py-6 first:pt-0"
          >
            <Link
              href={`/products/${item.handle}`}
              className="relative h-28 w-24 shrink-0 overflow-hidden border border-border bg-muted sm:h-32 sm:w-28"
            >
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${item.handle}`}
                    className="display-tight font-display text-sm font-semibold leading-snug hover:underline sm:text-base"
                  >
                    {item.title}
                  </Link>
                  {item.variantTitle && (
                    <p className="label mt-1.5 text-muted-foreground">
                      {item.variantTitle}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatPrice(item.unitPrice, item.currency)} each
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.title} from bag`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <div className="flex items-center border border-border">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.title}`}
                    className="flex h-10 w-10 items-center justify-center transition hover:bg-muted"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span
                    className="label w-8 text-center"
                    aria-live="polite"
                    aria-label={`Quantity ${item.quantity}`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.id, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.title}`}
                    className="flex h-10 w-10 items-center justify-center transition hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatPrice(item.unitPrice * item.quantity, item.currency)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      toggle({
                        id: item.productId,
                        variantId: item.id,
                        title: item.title,
                        handle: item.handle,
                        thumbnail: item.thumbnail,
                        unitPrice: item.unitPrice,
                        currency: item.currency,
                      })
                      removeItem(item.id)
                    }}
                    className="label mt-1 text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
                  >
                    Save for later
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:col-span-5">
        <div className="border border-border p-6 lg:sticky lg:top-24">
          <h2 className="label text-muted-foreground">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatPrice(subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-muted-foreground">At checkout</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="display-tight font-display text-lg font-bold">
                {formatPrice(subtotal, currency)}
              </dd>
            </div>
          </dl>
          <p className="label mt-3 text-muted-foreground">
            Inclusive of all taxes
          </p>
          <Link
            href="/checkout"
            className="label mt-6 flex h-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/85"
          >
            Checkout →
          </Link>
          <Link
            href="/shop"
            className="label mt-4 block text-center text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
          >
            Continue shopping
          </Link>
          <p className="label mt-6 border-t border-border pt-4 text-muted-foreground">
            Free shipping over ₹999 · 7-day returns · cod available
          </p>
        </div>
      </aside>
    </div>
  )
}

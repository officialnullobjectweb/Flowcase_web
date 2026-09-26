"use client"

import { Heart, ShoppingCart, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { useWishlist } from "@/context/WishlistContext"
import { formatPrice } from "@/lib/format"

export function WishlistView() {
  const { items, ready, remove } = useWishlist()
  const { addItem } = useCart()

  if (!ready) {
    return <p className="label text-muted-foreground">Loading wishlist…</p>
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border p-14 text-center">
        <Heart className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="display-tight mt-4 font-display text-xl font-semibold">
          Nothing saved yet.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Tap the heart on any case to keep it here — no account needed.
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
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="group relative">
          <Link href={`/products/${item.handle}`} className="block">
            <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="label flex h-full items-center justify-center text-muted-foreground">
                  No image
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1">
              <p className="display-tight font-display text-sm font-semibold leading-snug sm:text-base">
                {item.title}
              </p>
              <p className="text-sm font-semibold">
                {formatPrice(item.unitPrice, item.currency)}
              </p>
            </div>
          </Link>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                addItem({
                  variantId: item.variantId,
                  productId: item.id,
                  title: item.title,
                  handle: item.handle,
                  thumbnail: item.thumbnail,
                  unitPrice: item.unitPrice,
                  currency: item.currency,
                })
              }
              disabled={!item.variantId}
              className="label flex h-10 flex-1 items-center justify-center gap-2 border border-border transition hover:border-foreground disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.title} from wishlist`}
              className="flex h-10 w-10 items-center justify-center border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

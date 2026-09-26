"use client"

import { Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useWishlist } from "@/context/WishlistContext"
import { Stars } from "./ui/stars"
import { formatPrice } from "@/lib/format"
import { productBadges } from "@/lib/badges"
import { useToast } from "./ui/toast"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

export function ProductCard({ product }: { product: Product }) {
  const variant = product.variants?.[0]
  const price = variant?.calculated_price?.calculated_amount
  const currency = variant?.calculated_price?.currency_code ?? "inr"
  const original = variant?.calculated_price?.original_amount
  const hasDiscount = original != null && price != null && original > price
  const discountPercent =
    hasDiscount && price != null && original != null
      ? Math.round((1 - price / original) * 100)
      : 0
  const { has, toggle } = useWishlist()
  const { toast } = useToast()
  const saved = has(product.id)
  const rating = Number(product.metadata?.rating ?? 0)
  const reviewCount = Number(product.metadata?.review_count ?? 0)
  const badges = productBadges(product, discountPercent)
  // Gallery order: default = first image, hover swaps to the second.
  const gallery = product.images ?? []
  const primarySrc = gallery[0]?.url ?? product.thumbnail
  const hoverSrc = gallery[1]?.url

  return (
    <div className="group relative">
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
          {primarySrc ? (
            <>
              <Image
                src={primarySrc}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-0"
              />
              {hoverSrc && (
                <Image
                  src={hoverSrc}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="label flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {badges.length > 0 && (
            <span className="absolute left-0 top-0 flex flex-col items-start">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className={cn(
                    "label px-2 py-1.5",
                    badge.tone === "signal" && "bg-foreground text-background",
                    badge.tone === "ink" && "bg-foreground text-background",
                    badge.tone === "outline" &&
                      "border-b border-r border-border bg-background/95 text-foreground backdrop-blur"
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1.5">
          <p className="label text-muted-foreground">
            {product.tags?.[0]?.value ?? "Case"}
          </p>
          <p className="display-tight font-display text-sm font-semibold leading-snug text-foreground group-hover:underline sm:text-base">
            {product.title}
          </p>
          {rating > 0 && (
            <p className="flex items-center gap-2">
              <Stars rating={rating} size={12} />
              <span className="label text-muted-foreground">
                {rating.toFixed(1)}
                {reviewCount > 0 && ` · ${reviewCount} reviews`}
              </span>
            </p>
          )}
          <p className="text-sm">
            {hasDiscount && (
              <span className="mr-2 text-muted-foreground line-through">
                {formatPrice(original, currency)}
              </span>
            )}
            <span className="font-semibold text-foreground">
              {formatPrice(price, currency)}
            </span>
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          toggle({
            id: product.id,
            variantId: variant?.id ?? "",
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail ?? null,
            unitPrice: price ?? 0,
            currency,
          })
          toast({
            title: saved ? "Removed from wishlist" : "Saved to wishlist",
            detail: product.title,
            icon: "heart",
          })
        }}
        aria-label={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
        aria-pressed={saved}
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground backdrop-blur transition hover:border-foreground"
      >
        <Heart
          className={`h-4 w-4 ${saved ? "fill-foreground" : ""}`}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

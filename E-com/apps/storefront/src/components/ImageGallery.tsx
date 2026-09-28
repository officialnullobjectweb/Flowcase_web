"use client"

import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { Heart, Share2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useWishlist } from "@/context/WishlistContext"
import { useSelection } from "@/context/SelectionContext"
import type { Product, ProductImage } from "@/lib/types"
import { useToast } from "./ui/toast"

interface ImageGalleryProps {
  images: ProductImage[]
  thumbnail?: string | null
  alt: string
  /** Enables the wishlist + share buttons pinned to the image's top-right. */
  product?: Product
}

export function ImageGallery({ images, thumbnail, alt, product }: ImageGalleryProps) {
  const base = images.length
    ? images
    : thumbnail
      ? [{ id: "thumb", url: thumbnail, alt }]
      : []
  // All 4 shots always — gallery images are product-specific, not colour-keyed.
  const { colorIndex } = useSelection()
  const all = base
  const [active, setActive] = useState(0)
  const { has, toggle } = useWishlist()
  const { toast } = useToast()
  const shown = Math.min(active, Math.max(all.length - 1, 0))
  const current = all[shown]

  // colour swap → back to the first shot of the new colour
  useEffect(() => {
    setActive(0)
  }, [colorIndex])

  const saved = product ? has(product.id) : false

  const toggleWishlist = () => {
    if (!product) return
    toggle({
      id: product.id,
      variantId: product.variants?.[0]?.id ?? "",
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail ?? null,
      unitPrice: product.variants?.[0]?.calculated_price?.calculated_amount ?? 0,
      currency: product.variants?.[0]?.calculated_price?.currency_code ?? "inr",
    })
    toast({
      title: saved ? "Removed from wishlist" : "Saved to wishlist",
      detail: product.title,
      icon: "heart",
    })
  }

  const share = async () => {
    if (!product) return
    const url = window.location.href
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: product.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", detail: product.title, icon: "check" })
    } catch {
      // share sheet dismissed or clipboard blocked — nothing to report
    }
  }

  if (!current) {
    return (
      <div className="label flex aspect-[4/5] items-center justify-center border border-border bg-muted text-muted-foreground">
        No image
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <Image
              src={current.url}
              alt={current.alt || alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
        {product && (
          <div className="absolute right-2 top-2 z-10 flex gap-2">
            <button
              type="button"
              onClick={toggleWishlist}
              aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
              aria-pressed={saved}
              className="flex h-11 w-11 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Heart className={`h-5 w-5 ${saved ? "fill-white" : ""}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={share}
              aria-label="Share this product"
              className="flex h-11 w-11 items-center justify-center bg-transparent text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
        {all.length > 1 && (
          <span className="label absolute bottom-0 right-0 bg-background/90 px-2.5 py-1.5 text-foreground backdrop-blur">
            {String(shown + 1).padStart(2, "0")} / {String(all.length).padStart(2, "0")}
          </span>
        )}
      </div>

      {all.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
          {all.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === shown}
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden border transition ${
                index === active
                  ? "border-foreground"
                  : "border-border opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt || `${alt} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
              <span className="label absolute bottom-0 left-0 bg-background/85 px-1 text-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

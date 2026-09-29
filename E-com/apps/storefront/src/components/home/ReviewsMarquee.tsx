"use client"

import { MessageSquare, Plus } from "lucide-react"
import { useState } from "react"
import { SectionHeader } from "@/components/SectionHeader"
import { ReviewDialog, type ReviewDraft } from "@/components/ReviewDialog"
import { Button } from "@/components/ui/button"
import { Stars } from "@/components/ui/stars"
import { useToast } from "@/components/ui/toast"
import { metadataReviews } from "@/lib/reviews"
import { modelFromTitle } from "@/lib/nav-models"
import type { Product } from "@/lib/types"

interface Review {
  name: string
  avatar: string
  rating: number
  title: string
  body: string
  model: string
  local?: boolean
  /** Product thumbnail matching the reviewed model. */
  photo?: string
  /** Photos the buyer uploaded with the review. */
  images?: string[]
}

const PRESET: Review[] = [
  {
    name: "Aisha R.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "Survived a concrete drop",
    body: "Phone went flying off my scooter at a red light. Case scuffed, screen perfect. The grip ribs actually work with sweaty hands.",
    model: "iPhone 17 Pro",
  },
  {
    name: "Rohan M.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "Slim without being fragile",
    body: "Third case from Flowcase. Buttons are clicky, camera ring doesn't catch on the table, and it slides into my jeans pocket.",
    model: "Galaxy S25",
  },
  {
    name: "Meera K.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=faces",
    rating: 4,
    title: "Colour hasn't faded",
    body: "Six months of daily use in Chennai heat — the Onyx still looks black, not grey. Wish it came with a lanyard cutout.",
    model: "iPhone 16",
  },
  {
    name: "Dev S.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "REUSE10 is real",
    body: "Sent back my old Spigen in their envelope, got the 10% code by email same week. Cheapest premium-feeling case I've owned.",
    model: "Galaxy A56",
  },
  {
    name: "Tara J.",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "MagSafe magnets are strong",
    body: "Holds my charger puck through the case without slipping. Car mount too — no wobble on Bengaluru roads.",
    model: "iPhone 17",
  },
  {
    name: "Kabir A.",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "Fit is millimetre-perfect",
    body: "Cutouts line up with the USB-C port even with a braided cable plugged in. That's the detail nobody else gets right.",
    model: "iPhone 15 Pro",
  },
  {
    name: "Nisha P.",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=faces",
    rating: 4,
    title: "Grip without bulk",
    body: "Textured back means it doesn't slide off the armrest anymore. Slightly harder to pocket than a silicone one.",
    model: "Galaxy S24",
  },
  {
    name: "Arjun V.",
    avatar:
      "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=96&h=96&fit=crop&crop=faces",
    rating: 5,
    title: "Delivery in 3 days",
    body: "Ordered Sunday, arrived Wednesday with the return envelope tucked in the box. Packaging is 100% plastic-free.",
    model: "iPhone 16 Pro",
  },
]

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="mr-4 flex w-[17rem] shrink-0 flex-col gap-3 border border-border bg-background p-5 sm:w-[20rem]">
      <div className="flex items-center gap-3">
        <span
          className="label grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background"
          aria-hidden="true"
        >
          {review.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{review.name}</p>
          <p className="label text-muted-foreground">Verified buyer</p>
        </div>
        <Stars rating={review.rating} className="ml-auto" />
      </div>
      <p className="text-sm font-semibold leading-snug">{review.title}</p>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {review.body}
      </p>
      <div className="mt-auto flex items-center gap-3 pt-1">
        {review.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={review.photo}
            alt={`${review.model} case — buyer photo`}
            loading="lazy"
            className="h-11 w-11 shrink-0 border border-border object-cover grayscale"
          />
        )}
        <p className="label flex items-center gap-1.5 text-muted-foreground">
          <MessageSquare className="h-3 w-3" aria-hidden="true" />
          Fits {review.model}
        </p>
      </div>
    </article>
  )
}

/**
 * Infinite marquee of buyer reviews + a working write-review dialog.
 */
export function ReviewsMarquee({
  products = [],
  index = "09",
  label = "Reviews",
}: {
  products?: Product[]
  index?: string
  label?: string
}) {
  // Product thumbnail for a model name ("iPhone 17 Pro" → its case image).
  const thumbFor = (model: string) =>
    products.find((p) => modelFromTitle(p.title) === model)?.thumbnail ?? undefined

  // Reviews stamped on products in Medusa admin (Products → Metadata);
  // falls back to the editorial preset wall when none are configured.
  const managed: Review[] = []
  for (const p of products) {
    for (const r of metadataReviews(p.metadata)) {
      const model = p.title.replace(/^Flowcase for /, "")
      managed.push({
        name: r.name,
        avatar: r.avatar,
        rating: r.rating,
        title: r.title,
        body: r.body,
        model,
        photo: p.thumbnail ?? undefined,
      })
    }
  }
  const withPhotos = (list: Review[]) =>
    list.map((r) => (r.photo ? r : { ...r, photo: thumbFor(r.model) }))
  const [reviews, setReviews] = useState<Review[]>(
    withPhotos(managed.length ? managed : PRESET)
  )
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const submit = (draft: ReviewDraft) => {
    setReviews((prev) => [
      {
        ...draft,
        avatar: "",
        model: "Flowcase",
        local: true,
      },
      ...prev,
    ])
    setOpen(false)
    toast({ title: "Review published", detail: "Thanks — it's live on the wall." })
  }

  const renderCard = (review: Review, i: number) =>
    review.local ? (
      <article key={`local-${i}`} className="mr-4 flex w-[17rem] shrink-0 flex-col gap-3 border border-foreground bg-background p-5 sm:w-[20rem]">
        <div className="flex items-center gap-3">
          <span className="label grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background" aria-hidden="true">
            {review.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{review.name}</p>
            <p className="label text-foreground">Your review</p>
          </div>
          <Stars rating={review.rating} className="ml-auto" />
        </div>
        <p className="text-sm font-semibold leading-snug">{review.title}</p>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
        {review.images && review.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {review.images.map((src, j) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={j}
                src={src}
                alt=""
                className="h-14 w-14 border border-border object-cover"
              />
            ))}
          </div>
        )}
      </article>
    ) : (
      <ReviewCard key={review.name + i} review={review} />
    )

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6" aria-labelledby="reviews-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          index={index}
          label={label}
          title="Stories from the drop test."
          className="w-full border-t-0 pt-0"
        />
        <Button variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Write a review
        </Button>
      </div>

      {/* mobile + tablet: swipeable snap carousel (touch-first) */}
      <div className="mt-8 overflow-x-auto pb-2 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max snap-x snap-mandatory" aria-label="Customer reviews">
          {reviews.map((review, i) => (
            <div key={`m-${review.name}-${i}`} className="snap-start">
              {renderCard(review, i)}
            </div>
          ))}
        </div>
      </div>

      {/* desktop: infinite marquee */}
      <div className="mt-8 hidden overflow-hidden lg:block">
        <div className="marquee-track flex w-max pb-2" aria-label="Customer reviews">
          {reviews.map(renderCard)}
          <div aria-hidden="true" className="flex">
            {reviews.map(renderCard)}
          </div>
        </div>
      </div>

      <ReviewDialog open={open} onClose={() => setOpen(false)} onSubmit={submit} />
    </section>
  )
}

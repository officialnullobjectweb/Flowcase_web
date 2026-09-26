"use client"

import { motion } from "framer-motion"
import { Plus, Quote, ZoomIn } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { SectionHeader } from "@/components/SectionHeader"
import { ReviewDialog, type ReviewDraft } from "@/components/ReviewDialog"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Rail } from "@/components/ui/rail"
import { Stars } from "@/components/ui/stars"
import { useToast } from "@/components/ui/toast"
import { useSelection } from "@/context/SelectionContext"
import type { CmsPdp } from "@/lib/cms"
import { metadataReviews } from "@/lib/reviews"
import type { Product } from "@/lib/types"

/** Deterministic pick so SSR/CSR stay in sync. */
function seededPick<T>(seed: string, pool: T[], count: number): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const out: T[] = []
  const used = new Set<number>()
  for (let i = 0; i < count; i++) {
    const idx = (h + i * 7) % pool.length
    const pick = used.has(idx) ? (idx + 1) % pool.length : idx
    used.add(pick)
    out.push(pool[pick])
  }
  return out
}

const REVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541877944-ac82a091518a?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1601593346740-925612772716?w=1200&q=80&auto=format&fit=crop",
]

const SNIPPETS = [
  { name: "Ananya G.", title: "Snug fit, zero rattle", body: "The lip sits flush over the screen and the buttons don't mush. Feels like it shipped with the phone." },
  { name: "Vikram T.", title: "Dropped it twice already", body: "Corner-first onto tile both times — no cracks, just a small scuff. That's exactly what I paid for." },
  { name: "Sara L.", title: "Matte back beats glossy", body: "No fingerprint smear after a full day of messaging, and it doesn't slide off the gym bench." },
  { name: "Imran H.", title: "Camera ring is the detail", body: "Raised enough to protect the lens on a flat table, thin enough not to catch on pockets." },
  { name: "Priyanka D.", title: "Arrived in 48 hours", body: "Packed in cardboard with the REUSE10 return envelope. Exchanged my old case the same week." },
  { name: "Joseph M.", title: "Grip ribs actually grip", body: "One-hand scroll on the metro without the death grip. Slight texture, not sticky." },
  { name: "Lena K.", title: "Looks better in person", body: "Photos undersell the depth of the Onyx. Under sunlight it has a subtle brushed look." },
  { name: "Harsh V.", title: "Worth the premium", body: "Had a cheap TPU before this — buttons wore out in months. This still feels new after a year." },
]

/** Counts up from 0 to target whenever `run` flips true; resets when false. */
function useCountUp(target: number, run: boolean, decimals = 0): string {
  const [val, setVal] = useState(target)
  useEffect(() => {
    if (!run) {
      setVal(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 1100
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return val.toFixed(decimals)
}

function Ring({
  value,
  label,
  size = 96,
  delay = 0,
  display,
  runKey,
}: {
  value: number
  label: string
  size?: number
  delay?: number
  display?: string
  runKey: number
}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    setOn(false)
    const t = setTimeout(() => setOn(true), 150 + delay)
    return () => clearTimeout(t)
  }, [runKey, delay])

  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={on ? c * (1 - clamped / 100) : c}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)",
              transitionDelay: `${delay}ms`,
            }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-display text-xl font-bold">{display ?? clamped}</span>
        </span>
      </div>
      <span className="label text-center text-muted-foreground">{label}</span>
    </div>
  )
}

interface DisplayReview {
  key: string
  name: string
  title: string
  body: string
  rating: number
  avatar: string
  image: string
  color?: string
}

/** Cards per bunch — reviews load in bunches inside the carousel. */
const BUNCH = 3

/**
 * PDP review block — count-up ratings, progress rings and cards that
 * re-animate every time the section scrolls into view, review photos
 * with a lightbox, plus a working write-review dialog.
 *
 * Rating rings sit in a one-line horizontal carousel on every device
 * (admin toggle via Site CMS → Product page); review cards are a
 * carousel fed in bunches of three.
 */
export function ReviewsSection({ product, pdp }: { product: Product; pdp?: CmsPdp }) {
  const meta = product.metadata ?? {}
  const rating = Number(meta.rating ?? 4.6)
  const count = Number(meta.review_count ?? 240)

  const labels = pdp?.categories?.length
    ? pdp.categories.filter((c) => c.trim())
    : ["Quality", "Pricing", "Grip", "Protection"]
  const offsets = [6, -8, 2, 8]
  const categories = labels.map((label, i) => ({
    label,
    value:
      i === 1
        ? Math.max(55, Math.round((rating / 5) * 100) + offsets[i % offsets.length])
        : Math.min(99, Math.round((rating / 5) * 100) + offsets[i % offsets.length]),
  }))
  const ringCarousel = pdp?.carousel !== false

  const [extra, setExtra] = useState<ReviewDraft[]>([])
  const { colorName } = useSelection()
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<DisplayReview | null>(null)
  const [runKey, setRunKey] = useState(0)
  const [inView, setInView] = useState(false)
  const [shown, setShown] = useState(BUNCH)
  const sectionRef = useRef<HTMLElement | null>(null)
  const { toast } = useToast()

  // Replay everything each time the section (re-)enters the viewport.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            setRunKey((k) => k + 1)
          } else {
            setInView(false)
          }
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ratingDisplay = useCountUp(rating, inView, 1)
  const countDisplay = useCountUp(count, inView, 0)

  // Reviews stamped on the product in Medusa admin (Products → Metadata);
  // falls back to the seeded pool when none are configured.
  const fromAdmin = metadataReviews(meta)
  const seeded = seededPick(product.id, SNIPPETS, 3)
  const list: DisplayReview[] = [
    ...extra.map((e, i) => ({
      key: `you-${i}`,
      name: e.name,
      title: e.title,
      body: e.body,
      rating: e.rating,
      avatar: "",
      image: e.images?.[0] ?? "",
      color: e.color,
    })),
    ...(fromAdmin.length
      ? fromAdmin.map((s, i) => ({ ...s, key: `s-${i}` }))
      : seeded.map((s, i) => ({
          ...s,
          rating: Math.round(rating),
          key: `s-${i}`,
          avatar: "",
          image: REVIEW_IMAGES[i % REVIEW_IMAGES.length],
        }))),
  ]

  return (
    <section ref={sectionRef} className="mt-16 sm:mt-20" aria-labelledby="pdp-reviews">
      <div id="pdp-reviews">
        <motion.div
          key={`head-${runKey}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionHeader
            index="Reviews"
            label={`${Number(countDisplay).toLocaleString("en-IN")} buyers`}
            title={`Rated ${ratingDisplay} out of 5`}
          />
        </motion.div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
        {/* Overall */}
        <div className="flex flex-row items-center gap-6 lg:flex-col lg:items-start">
          <Ring
            value={(rating / 5) * 100}
            display={ratingDisplay}
            label="Overall"
            size={132}
            runKey={runKey}
          />
          <div className="lg:mt-2">
            <Stars rating={rating} size={18} />
            <p className="mt-2 text-sm text-muted-foreground">
              {Number(countDisplay).toLocaleString("en-IN")} verified ratings
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Write a review
            </Button>
          </div>
        </div>

        {/* Category rings — one horizontal line on every device */}
        {ringCarousel ? (
          <Rail
            ariaLabel="Rating categories"
            itemClass="w-[46%] sm:w-[30%] lg:w-[calc((100%-3rem)/4)]"
          >
            {categories.map((cat, i) => (
              <div
                key={cat.label}
                className="flex flex-col items-center gap-2 border border-border p-5"
              >
                <Ring value={cat.value} label={cat.label} delay={i * 150} runKey={runKey} />
              </div>
            ))}
          </Rail>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
            {categories.map((cat, i) => (
              <div key={cat.label} className="flex flex-col items-center gap-2 border border-border p-5">
                <Ring value={cat.value} label={cat.label} delay={i * 150} runKey={runKey} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review list — horizontal carousel fed in bunches; entrance replays when in view */}
      <div className="mt-12">
        <Rail
          ariaLabel="Customer reviews"
          itemClass="w-[82%] sm:w-[52%] lg:w-[calc((100%-2rem)/3)]"
        >
          {list.slice(0, shown).map((review, i) => (
          <motion.article
            key={review.key}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-3 border border-border p-6"
          >
            {review.image && (
              <button
                type="button"
                onClick={() => setLightbox(review)}
                aria-label={`Open photo from ${review.name}`}
                className="group relative -mx-6 -mt-6 mb-1 block aspect-[16/10] overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.image}
                  alt={`Photo shared by ${review.name}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center bg-background/85 text-foreground backdrop-blur">
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            )}
            <Quote className="h-4 w-4 text-border" aria-hidden="true" />
            <p className="text-sm font-semibold leading-snug">{review.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{review.body}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              <span className="min-w-0 truncate text-sm font-semibold">
                {review.name}
                {review.color && (
                  <span className="label ml-2 font-normal text-muted-foreground">
                    {review.color}
                  </span>
                )}
              </span>
              <Stars rating={review.rating} size={12} />
            </div>
          </motion.article>
          ))}
        </Rail>
        {list.length > shown && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setShown((s) => s + BUNCH)}>
              Load more reviews ({list.length - shown})
            </Button>
          </div>
        )}
      </div>

      {/* Photo lightbox / full review */}
      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.title || "Review"}
      >
        {lightbox && (
          <div className="space-y-4">
            {lightbox.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.image}
                alt={`Photo shared by ${lightbox.name}`}
                className="max-h-[60vh] w-full object-contain bg-muted"
              />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-semibold">
                {lightbox.name}
                {lightbox.color && (
                  <span className="label ml-2 font-normal text-muted-foreground">
                    {lightbox.color}
                  </span>
                )}
              </span>
              <Stars rating={lightbox.rating} size={14} />
            </div>
            <p className="text-sm font-semibold">{lightbox.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{lightbox.body}</p>
          </div>
        )}
      </Dialog>

      <ReviewDialog
        open={open}
        onClose={() => setOpen(false)}
        contextLabel={product.title}
        onSubmit={(draft) => {
          setExtra((prev) => [{ ...draft, color: draft.color ?? colorName ?? undefined }, ...prev])
          setOpen(false)
          toast({ title: "Review published", detail: `Thanks for reviewing ${product.title}.` })
        }}
      />
    </section>
  )
}

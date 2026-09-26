"use client"

import { useState, type ChangeEvent } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Stars } from "@/components/ui/stars"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Camera, Star, X } from "lucide-react"

export interface ReviewDraft {
  name: string
  rating: number
  title: string
  body: string
  /** Product photos the buyer uploaded (data URLs, max 3). */
  images?: string[]
  /** Colour variant the review was written against (stamped automatically). */
  color?: string
}

const MAX_PHOTOS = 3

export function ReviewDialog({
  open,
  onClose,
  onSubmit,
  contextLabel,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (review: ReviewDraft) => void
  contextLabel?: string
}) {
  const [name, setName] = useState("")
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [images, setImages] = useState<string[]>([])

  const valid = name.trim().length >= 2 && body.trim().length >= 8

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue
      const reader = new FileReader()
      reader.onload = () =>
        setImages((prev) =>
          prev.length >= MAX_PHOTOS ? prev : [...prev, String(reader.result)]
        )
      reader.readAsDataURL(f)
    }
  }

  const submit = () => {
    if (!valid) return
    onSubmit({
      name: name.trim(),
      rating,
      title: title.trim() || "Would buy again",
      body: body.trim(),
      images,
    })
    setName("")
    setRating(5)
    setTitle("")
    setBody("")
    setImages([])
  }

  return (
    <Dialog open={open} onClose={onClose} title="Write a review">
      <div className="space-y-5 px-6 py-5">
        {contextLabel && (
          <p className="label text-muted-foreground">On {contextLabel}</p>
        )}

        <div>
          <p className="label mb-2 text-foreground">Your rating</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                className="p-0.5 transition hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition",
                    n <= rating ? "fill-foreground text-foreground" : "fill-transparent text-border"
                  )}
                  strokeWidth={1.5}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{rating}.0</span>
          </div>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="label text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya S." />
          </label>
          <label className="grid gap-1.5">
            <span className="label text-muted-foreground">Headline (optional)</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Survived a concrete drop"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="label text-muted-foreground">Review</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="How does it fit, feel, hold up?"
              className="w-full resize-none border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-foreground"
            />
          </label>
          <div className="grid gap-1.5">
            <span className="label text-muted-foreground">
              Photos of your case ({MAX_PHOTOS - images.length} left)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {images.map((src, i) => (
                <span
                  key={i}
                  className="relative block h-16 w-16 overflow-hidden border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-foreground text-background transition hover:bg-signal"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {images.length < MAX_PHOTOS && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border text-muted-foreground transition hover:border-foreground hover:text-foreground">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <span className="label leading-none">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onFiles}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <p className="label text-muted-foreground">
            <Stars rating={rating} size={12} /> {rating}/5
          </p>
          <Button onClick={submit} disabled={!valid}>
            Submit review
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

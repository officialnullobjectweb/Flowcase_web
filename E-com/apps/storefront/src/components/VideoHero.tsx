"use client"

import Link from "next/link"
import { Children, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface HeroClip {
  src: string
  poster: string
  alt: string
}

interface VideoHeroProps {
  clips: HeroClip[]
  eyebrow?: string
  title: ReactNode
  description?: string
  ctas?: { href: string; label: string; variant?: "solid" | "outline" }[]
  /** stats row rendered on a hairline at the bottom of the hero */
  footer?: ReactNode
  /** min-h-svh (home) vs compact (shop) */
  full?: boolean
  className?: string
}

const ROTATE_MS = 6000

/**
 * Cloudinary URLs are authored at `w_1600`; swap the width token so phones
 * fetch smaller renditions (video 960 on <768px, posters via srcset).
 */
const withWidth = (url: string, w: number) => url.replace(/w_\d+/, `w_${w}`)
const posterSrcSet = (url: string) =>
  [640, 960, 1600].map((w) => `${withWidth(url, w)} ${w}w`).join(", ")

/**
 * Full-bleed video hero.
 *
 * - Every slide paints instantly as a responsive `<img>` poster
 *   (640/960/1600 srcset, LCP image preloaded with fetchpriority=high).
 * - One `<video>` plays the *active* slide only: src attaches when the hero
 *   is near the viewport, width is picked for the device, and it fades in
 *   over the poster once frames actually arrive — so a slow connection just
 *   sees posters, never a black/broken box.
 * - Apple/iOS: muted flag + attribute are set *before* src/load() (Safari
 *   gates autoplay on the attribute), playsinline + explicit play().
 * - Data Saver / 2G → poster-only, zero video bytes.
 * - prefers-reduced-motion → poster-only, no rotation.
 */
export function VideoHero({
  clips,
  eyebrow,
  title,
  description,
  ctas = [],
  footer,
  full = false,
  className,
}: VideoHeroProps) {
  const ref = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [inView, setInView] = useState(false)
  const [attach, setAttach] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [lowData, setLowData] = useState(false)
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) {
      setReduced(true)
      return
    }
    const conn = (
      navigator as unknown as {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (
      conn &&
      (conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType ?? ""))
    ) {
      setLowData(true)
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting) setAttach(true)
      },
      { rootMargin: "250px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (clips.length < 2 || reduced || !inView) return
    const id = setInterval(
      () => setActive((a) => (a + 1) % clips.length),
      ROTATE_MS
    )
    return () => clearInterval(id)
  }, [clips.length, reduced, inView])

  // Attach / swap the active clip's src and keep play state in sync.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !attach || reduced || lowData || !clips.length) return
    const url = withWidth(
      clips[active % clips.length].src,
      window.innerWidth < 768 ? 960 : 1600
    )
    if (v.getAttribute("src") !== url) {
      setReady(false)
      // Safari/iOS gate autoplay on the muted *attribute*, set before load().
      v.muted = true
      v.defaultMuted = true
      v.setAttribute("muted", "")
      v.src = url
      v.load()
    }
    if (inView) v.play().catch(() => {})
    else v.pause()
  }, [attach, inView, reduced, lowData, active, clips])

  const idx = clips.length ? active % clips.length : 0

  return (
    <section
      ref={ref}
      className={cn(
        "relative isolate flex w-full flex-col justify-end overflow-hidden bg-hero-ink text-white",
        full ? "min-h-svh" : "min-h-[72vh] sm:min-h-[78vh]",
        // Compact heroes center their block on desktop so copy never crowds
        // the bottom edge; the fullscreen home hero stays bottom-anchored.
        !full && "lg:justify-center",
        className
      )}
    >
      {/* Poster layer — responsive stills paint instantly for every slide */}
      <div className="absolute inset-0" aria-hidden="true">
        {clips.map((clip, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={clip.src}
            src={withWidth(clip.poster, 1600)}
            srcSet={posterSrcSet(clip.poster)}
            sizes="100vw"
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === idx ? "high" : "auto"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover grayscale transition-opacity duration-700 ease-out",
              i === idx ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
        {!reduced && !lowData && attach && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setReady(true)}
            onError={() => setReady(false)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover grayscale transition-opacity duration-500 ease-out",
              ready ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </div>

      {/* Legibility gradients */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/40 lg:bg-gradient-to-r lg:from-black/90 lg:via-black/70 lg:to-black/35"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
        aria-hidden="true"
      />

      {/* Pagination — home: super-minimal 3px lines (faint, brighten on hover);
          compact heroes keep the classic dots */}
      {clips.length > 1 && (
        <div
          className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2"
          role="group"
          aria-label="Hero slides"
        >
          {clips.map((clip, i) => (
            <button
              key={clip.src}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === idx}
              onClick={() => setActive(i)}
              className={cn(
                "group/hs flex h-6 items-center justify-center",
                full ? "w-8" : "w-6"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "rounded-full transition-all duration-300",
                  full
                    ? i === idx
                      ? "h-[3px] w-7 bg-white"
                      : "h-[3px] w-5 bg-white/25 group-hover/hs:bg-white/80"
                    : i === idx
                      ? "h-1.5 w-5 bg-white"
                      : "h-1.5 w-1.5 bg-white/40 group-hover/hs:bg-white/70"
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 pb-14 pt-36 sm:px-6 sm:pb-16 sm:pt-40 lg:pt-32">
        <div className="mx-auto max-w-2xl space-y-5 text-center lg:mx-0 lg:text-left">
          {eyebrow && (
            <p className="label flex items-center justify-center gap-3 text-white/70 lg:justify-start">
              <span className="h-1.5 w-1.5 bg-white" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h1 className="display-tight font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-7xl">
            {title}
          </h1>
          {description && (
            <p className="mx-auto max-w-xl text-base leading-relaxed text-white/75 sm:text-lg lg:mx-0">
              {description}
            </p>
          )}
          {ctas.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-1 lg:justify-start">
              {ctas.map((cta, i) => {
                const isFilled = i === 0 ? cta.variant !== "outline" : cta.variant === "solid"
                return (
                  <Link
                    key={cta.href + cta.label}
                    href={cta.href}
                    className={cn(
                      "label inline-flex h-11 items-center rounded-full px-7 transition",
                      isFilled
                        ? "bg-white text-foreground hover:bg-white/85"
                        : "border border-white/30 text-white hover:border-white/70"
                    )}
                  >
                    {cta.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {footer && (
          <div className="mt-12 grid grid-cols-3 gap-x-4 gap-y-4 border-t border-white/15 pt-5 text-center sm:gap-x-6 lg:text-left">
            {Children.toArray(footer).map((child, i) => (
              <div
                key={i}
                className={cn(
                  i > 0 && "lg:border-l lg:border-white/20 lg:pl-6"
                )}
              >
                {child}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

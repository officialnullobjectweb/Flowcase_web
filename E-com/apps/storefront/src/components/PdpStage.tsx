"use client"

import { useState } from "react"
import { ImageGallery } from "@/components/ImageGallery"
import { swatchHex } from "@/components/FilterSortBar"
import { useSelection } from "@/context/SelectionContext"
import type { Product } from "@/lib/types"

interface Hotspot {
  x: number
  y: number
  title: string
  body: string
}

const CASE_SPOTS: Hotspot[] = [
  { x: 50, y: 44, title: "MagSafe ring", body: "N52 magnets aligned to the exact coil geometry — chargers snap on first try." },
  { x: 79, y: 16, title: "Camera lip", body: "Raised 1.2 mm guard ring — lenses never touch the table." },
  { x: 11, y: 58, title: "Grip edges", body: "Micro-rib texture tuned for sweaty hands and shallow pockets." },
  { x: 88, y: 84, title: "Drop corners", body: "Air-pocket corners rated to 2.5 m on concrete." },
]

const GEAR_SPOTS: Hotspot[] = [
  { x: 50, y: 40, title: "Slim profile", body: "Pocket-friendly dimensions with zero wasted bulk." },
  { x: 78, y: 20, title: "Finish", body: "Matte soft-touch coating that resists prints and scratches." },
  { x: 14, y: 62, title: "In the box", body: "Ships plastic-free with a prepaid reuse envelope inside." },
  { x: 86, y: 84, title: "7-day returns", body: "Changed your mind? Send it back within a week." },
]

/**
 * Apple-style product stage: the backdrop tint follows the selected colour,
 * the visual pins while you scroll on desktop, and annotated hotspots invite
 * exploration instead of a plain carousel.
 */
export function PdpStage({ product }: { product: Product }) {
  const { colorName } = useSelection()
  const [active, setActive] = useState<number | null>(null)
  const isCase = /^Flowcase (MagSafe )?for (iPhone|Galaxy|AirPods)/i.test(product.title)
  const spots = isCase ? CASE_SPOTS : GEAR_SPOTS
  const tint = (colorName && swatchHex(colorName)) || "#e5e5e5"

  return (
    <div
      className="lg:sticky lg:top-24 lg:self-start"
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${tint}33 0%, transparent 60%)`,
        transition: "background 0.5s ease",
      }}
    >
      <div className="relative">
        <ImageGallery
          images={product.images ?? []}
          thumbnail={product.thumbnail}
          alt={product.title}
          product={product}
        />
        {/* hotspot dots */}
        <div className="pointer-events-none absolute inset-0">
          {spots.map((s, i) => (
            <div key={s.title} className="pointer-events-auto absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              <button
                type="button"
                onClick={() => setActive(active === i ? null : i)}
                aria-expanded={active === i}
                aria-label={`${s.title}: ${s.body}`}
                className={`grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border backdrop-blur transition ${
                  active === i
                    ? "border-foreground bg-foreground text-background"
                    : "border-white/70 bg-black/45 text-white hover:scale-110"
                }`}
              >
                <span className="text-sm font-bold leading-none">{active === i ? "×" : "+"}</span>
              </button>
              {active === i && (
                <div className="absolute left-1/2 top-8 z-20 w-44 -translate-x-1/2 border border-border bg-background p-3 text-left shadow-xl">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="label mt-3 text-center text-muted-foreground sm:text-left">
        {colorName ? `Showing ${colorName} — pick a finish to re-light the stage` : "Tap + to explore the details"}
      </p>
    </div>
  )
}

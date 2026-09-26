"use client"

import { useCallback, useRef } from "react"

/**
 * Dual-thumb price range slider built on native <input type="range">
 * (keyboard + screen-reader support for free, styled via CSS classes
 * from globals.css: .range-slider / .range-slider__thumb).
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v: number) => String(v),
  ariaLabelFrom = "Minimum price",
  ariaLabelTo = "Maximum price",
}: {
  min: number
  max: number
  step?: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  formatValue?: (v: number) => string
  ariaLabelFrom?: string
  ariaLabelTo?: string
}) {
  const [lo, hi] = value
  const trackRef = useRef<HTMLDivElement>(null)

  const pct = (v: number) =>
    max === min ? 0 : ((v - min) / (max - min)) * 100

  const setLo = useCallback(
    (v: number) => onChange([Math.min(v, hi), hi]),
    [hi, onChange]
  )
  const setHi = useCallback(
    (v: number) => onChange([lo, Math.max(v, lo)]),
    [lo, onChange]
  )

  return (
    <div className="px-1 pt-2">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="border border-border px-2 py-1">
          {formatValue(lo)}
        </span>
        <span className="text-muted-foreground" aria-hidden="true">
          —
        </span>
        <span className="border border-border px-2 py-1">
          {formatValue(hi)}
        </span>
      </div>
      <div ref={trackRef} className="range-slider relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={ariaLabelFrom}
          onChange={(e) => setLo(Number(e.target.value))}
          className="range-slider__thumb"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={ariaLabelTo}
          onChange={(e) => setHi(Number(e.target.value))}
          className="range-slider__thumb"
        />
      </div>
    </div>
  )
}

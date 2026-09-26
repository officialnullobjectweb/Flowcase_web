"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/* ── Research-backed constants ─────────────────────────────────────────────
 * Per-case CO2e: ISO 14067-compliant phone-case LCAs (QDOS/Carbon
 * Footprint Ltd, Fraunhofer IZM) put a virgin-plastic case at 1.5–3 kg
 * CO2e; Fraunhofer's Fairphone TPU case measured 0.46 kg (optimized
 * small case). We use material midpoints inside the 1.5–3 band.
 * Weights: retail cases weigh ~20–30 g (product specs: TPU 21 g,
 * hard PC 25–28 g, silicone 18–22 g).
 * Persistence: blended/plastic cases take up to ~500 years in landfill.
 * Driving: average petrol car ≈ 120 g CO2e/km.
 */
type MaterialKey = "tpu" | "pc" | "silicone" | "unknown"

const MATERIALS: Record<
  MaterialKey,
  { label: string; sub: string; g: number; co2: number }
> = {
  tpu: { label: "Soft TPU", sub: "flexible gel", g: 22, co2: 2.0 },
  pc: { label: "Hard PC", sub: "shell", g: 26, co2: 2.5 },
  silicone: { label: "Silicone", sub: "slim fit", g: 20, co2: 1.8 },
  unknown: { label: "Not sure", sub: "use average", g: 24, co2: 2.2 },
}

const LANDFILL_YEARS = 500
const CAR_KG_PER_KM = 0.12
const MAX_CASES = 20

/* ── animated counter ──────────────────────────────────────────────────── */

function useCountUp(target: number, decimals = 1) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      fromRef.current = target
      setValue(target)
      return
    }
    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    const dur = 450
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (target - from) * eased
      setValue(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])

  return value.toFixed(decimals)
}

/* ── main ──────────────────────────────────────────────────────────────── */

export function ReuseCalculator() {
  const [count, setCount] = useState(3)
  const [material, setMaterial] = useState<MaterialKey>("tpu")

  const m = MATERIALS[material]
  const co2 = m.co2 * count
  const grams = m.g * count
  const km = Math.round(co2 / CAR_KG_PER_KM)

  const co2Str = useCountUp(co2, 1)
  const gStr = useCountUp(grams, 0)
  const kmStr = useCountUp(km, 0)

  return (
    <section
      id="calculator"
      className="border-y border-border bg-muted scroll-mt-20"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
        <p className="label text-center text-muted-foreground lg:text-left">
          02 — Impact calculator
        </p>
        <div className="mt-3 flex flex-col items-center gap-3 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
          <h2 className="display-tight max-w-xl font-display text-3xl font-bold sm:text-4xl">
            Your drawer is a small landfill.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Tell us what&apos;s rotting in there — we&apos;ll show what it costs
            the planet, and what it&apos;s worth back.
          </p>
        </div>

        <div className="mt-8 grid gap-px border border-border bg-border lg:grid-cols-2">
          {/* ── inputs ── */}
          <div className="bg-background p-6 lg:p-8">
            <p className="label text-muted-foreground">Your drawer</p>

            {/* count */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(0, c - 1))}
                aria-label="One case fewer"
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-foreground text-xl font-bold transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-30"
                disabled={count === 0}
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="display-tight font-display text-5xl font-bold tabular-nums">
                  {count}
                </span>
                <span className="label ml-2 text-muted-foreground">
                  case{count === 1 ? "" : "s"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(MAX_CASES, c + 1))}
                aria-label="One case more"
                className="flex h-11 w-11 shrink-0 items-center justify-center border border-foreground text-xl font-bold transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-30"
                disabled={count === MAX_CASES}
              >
                +
              </button>
            </div>

            {/* quick picks */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[1, 3, 5, 10, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={cn(
                    "label border px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-signal",
                    count === n
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* mini case glyphs */}
            <div className="mt-5 flex min-h-8 flex-wrap items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: count }).map((_, i) => (
                <span
                  key={i}
                  className="h-5 w-3 rounded-[3px] border-2 border-foreground transition-transform duration-300 motion-reduce:transition-none"
                />
              ))}
              {count === 0 && (
                <span className="text-sm text-muted-foreground">
                  Drawer&apos;s clean — nice.
                </span>
              )}
            </div>

            {/* material */}
            <p className="label mt-7 text-muted-foreground">
              What are they made of?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Case material">
              {(Object.keys(MATERIALS) as MaterialKey[]).map((key) => {
                const mat = MATERIALS[key]
                const active = material === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMaterial(key)}
                    className={cn(
                      "border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-signal",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:border-foreground"
                    )}
                  >
                    <span className="block text-sm font-semibold">
                      {mat.label}
                    </span>
                    <span
                      className={cn(
                        "label mt-0.5 block",
                        active ? "text-background/60" : "text-muted-foreground"
                      )}
                    >
                      {mat.sub} · {mat.g} g
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── results ── */}
          <div className="bg-hero-ink p-6 text-white lg:p-8">
            <p className="label text-white/60">If you bin them</p>

            <dl className="mt-4 space-y-6">
              <Stat
                value={`${co2Str} kg`}
                unit="CO₂e"
                hint={`≈ ${kmStr} km driven by an average petrol car`}
              />
              <Stat
                value={`${LANDFILL_YEARS}`}
                unit="years"
                hint="in landfill before it breaks down — still there in 2526"
              />
              <Stat
                value={`${gStr} g`}
                unit="of plastic"
                hint="sheds microplastics the whole way down"
              />
            </dl>

            {/* payoff */}
            <div className="mt-8 border-t border-white/15 pt-6">
              <p className="label text-white/60">Send them back instead</p>
              <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                <span className="bg-foreground px-2 py-1 text-white">10% off</span>{" "}
                your next order.
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                Prepaid envelope in every box. Drop it with your courier —
                REUSE10 lands in your inbox.
              </p>
              <a
                href="/shop"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-hero-ink transition-colors hover:bg-signal hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                Pick your next case
              </a>
            </div>

            {/* show the maths */}
            <details className="mt-6 border-t border-white/15 pt-4">
              <summary className="label cursor-pointer text-white/60 transition-colors hover:text-white">
                Show the maths
              </summary>
              <div className="mt-3 space-y-2 font-mono text-xs leading-relaxed text-white/70">
                <p>
                  CO₂e = {count} × {m.co2} kg = {co2.toFixed(1)} kg
                </p>
                <p>
                  plastic = {count} × {m.g} g = {grams} g
                </p>
                <p>driving = {co2.toFixed(1)} kg ÷ 0.12 kg/km = {km} km</p>
                <p className="pt-1 text-white/45">
                  Per-case factors sit inside the 1.5–3 kg CO₂e range from
                  ISO 14067 phone-case LCAs (Fraunhofer IZM / QDOS).
                  Weights from retail specs; ~500-year persistence from
                  plastics decomposition studies. Illustrative estimates.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({
  value,
  unit,
  hint,
}: {
  value: string
  unit: string
  hint: string
}) {
  return (
    <div>
      <dt className="sr-only">{unit}</dt>
      <dd>
        <span className="display-tight font-display text-5xl font-bold tabular-nums sm:text-6xl">
          {value}
        </span>
        <span className="label ml-2 text-white/60">{unit}</span>
        <span className="mt-1 block text-sm text-white/70">{hint}</span>
      </dd>
    </div>
  )
}

"use client"

import { motion } from "framer-motion"

const EASE = [0.22, 1, 0.36, 1] as const

/** Big confirmation check — circle pops, tick draws in. */
export function AnimatedCheck({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <span
      className={`mx-auto grid place-items-center rounded-full bg-primary text-primary-foreground ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-3/5 w-3/5">
        <motion.path
          d="M12 25l8 8L36 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
        />
      </svg>
    </span>
  )
}

/** Cancellation cross — X draws in. */
export function AnimatedCross({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <span
      className={`mx-auto grid place-items-center rounded-full bg-danger text-white ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="h-3/5 w-3/5">
        <motion.path
          d="M16 16l16 16M32 16L16 32"
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
        />
      </svg>
    </span>
  )
}

/**
 * Packing loop: flaps fold shut, tape seals the seam, label pops on — then
 * opens back up for the next cycle.
 */
export function PackagingScene({ className = "" }: { className?: string }) {
  const cycle = 5
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg viewBox="0 0 200 140" className="w-full max-w-[220px]" aria-hidden="true">
        {/* box base */}
        <path d="M40 70 L100 45 L160 70 L100 95 Z" fill="currentColor" opacity="0.08" />
        <path d="M40 70 L40 110 L100 135 L100 95 Z" fill="currentColor" opacity="0.16" />
        <path d="M160 70 L160 110 L100 135 L100 95 Z" fill="currentColor" opacity="0.11" />
        {/* left flap */}
        <motion.path
          d="M40 70 L100 45 L100 68 L40 92 Z"
          fill="currentColor"
          opacity="0.28"
          style={{ transformBox: "fill-box", transformOrigin: "right top" }}
          animate={{ rotate: [-64, 0, 0, -64] }}
          transition={{ duration: cycle, times: [0, 0.28, 0.82, 1], repeat: Infinity, ease: EASE }}
        />
        {/* right flap */}
        <motion.path
          d="M160 70 L100 45 L100 68 L160 92 Z"
          fill="currentColor"
          opacity="0.22"
          style={{ transformBox: "fill-box", transformOrigin: "left top" }}
          animate={{ rotate: [64, 0, 0, 64] }}
          transition={{ duration: cycle, times: [0, 0.3, 0.84, 1], repeat: Infinity, ease: EASE }}
        />
        {/* tape strip across the seam */}
        <motion.path
          d="M70 74 L100 61 L130 74 L100 87 Z"
          fill="currentColor"
          opacity="0.85"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 0, 1, 1, 0] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          transition={{ duration: cycle, times: [0, 0.42, 0.55, 0.86, 0.96], repeat: Infinity, ease: EASE }}
        />
        {/* shipping label */}
        <motion.g
          animate={{ opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, 6] }}
          transition={{ duration: cycle, times: [0, 0.5, 0.62, 0.86, 0.96], repeat: Infinity }}
        >
          <rect x="84" y="66" width="32" height="20" fill="currentColor" opacity="0.9" />
          <rect x="88" y="71" width="24" height="2.5" fill="white" opacity="0.75" />
          <rect x="88" y="76" width="16" height="2.5" fill="white" opacity="0.55" />
        </motion.g>
      </svg>
      <p className="label text-muted-foreground">Packed plastic-free within 48h</p>
    </div>
  )
}

/**
 * Courier van: package loads, van bobs along, wheels spin and the road
 * rushes underneath — loops forever.
 */
export function VanScene({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg viewBox="0 0 240 140" className="w-full max-w-[260px]" overflow="visible" aria-hidden="true">
        {/* road */}
        <motion.g
          animate={{ x: [0, -48] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        >
          {[0, 48, 96, 144, 192, 240, 288].map((x) => (
            <rect key={x} x={x} y={116} width="28" height="4" rx="2" fill="currentColor" opacity="0.25" />
          ))}
        </motion.g>

        {/* van group — drives across and repeats */}
        <motion.g
          animate={{ x: [-90, 260] }}
          transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" }}
        >
          {/* package waits at the kerb, then hops aboard */}
          <motion.g
            animate={{ x: [0, 0, 46, 46, 0, 0], y: [0, -14, -14, 0, 0, 0], opacity: [1, 1, 1, 0, 0, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 0.7, ease: EASE }}
          >
            <rect x="6" y="86" width="26" height="22" fill="currentColor" opacity="0.55" />
            <rect x="6" y="95" width="26" height="3.5" fill="currentColor" opacity="0.9" />
            <rect x="17" y="86" width="3.5" height="22" fill="currentColor" opacity="0.9" />
          </motion.g>

          <motion.g
            animate={{ y: [0, -1.6, 0, -1.2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* cargo body */}
            <rect x="48" y="58" width="96" height="48" rx="4" fill="currentColor" opacity="0.92" />
            {/* cabin */}
            <path d="M144 72 L172 72 L186 92 L186 106 L144 106 Z" fill="currentColor" opacity="0.92" />
            {/* window */}
            <path d="M150 78 L168 78 L178 92 L150 92 Z" fill="white" opacity="0.85" />
            {/* stripe */}
            <rect x="52" y="84" width="88" height="6" fill="white" opacity="0.35" />
            {/* headlight */}
            <circle cx="184" cy="101" r="3.5" fill="#f5c518" />
            {/* wheels */}
            {[76, 166].map((cx) => (
              <motion.g
                key={cx}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              >
                <circle cx={cx} cy={108} r="13" fill="currentColor" />
                <circle cx={cx} cy={108} r="6" fill="white" opacity="0.9" />
                <rect x={cx - 1.4} y={95} width="2.8" height="26" rx="1.4" fill="currentColor" />
              </motion.g>
            ))}
          </motion.g>
        </motion.g>
      </svg>
      <p className="label text-muted-foreground">On the van — deliveries in 3–6 days</p>
    </div>
  )
}

/**
 * ETA timeline: three milestones with a line that draws itself once and
 * dots that pop in sequence. Dates derive from the order placement time.
 */
export function EtaTimeline({
  placedAt,
  className = "",
}: {
  placedAt?: string | Date
  className?: string
}) {
  const start = placedAt ? new Date(placedAt) : new Date()
  const plus = (days: number) => new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })

  const nodes = [
    { label: "Order placed", date: fmt(start) },
    { label: "On the way", date: `by ${fmt(plus(3))}` },
    { label: "Delivered", date: `by ${fmt(plus(6))}` },
  ]

  return (
    <div className={`border border-border p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="label text-muted-foreground">Estimated delivery</p>
        <p className="label text-foreground">3–6 days</p>
      </div>
      <div className="relative mt-6 flex items-start justify-between">
        {/* base line */}
        <div className="absolute left-3 right-3 top-3 h-0.5 bg-border sm:top-3.5" aria-hidden="true">
          <motion.div
            className="h-full bg-foreground"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            style={{ transformOrigin: "left" }}
            transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
          />
        </div>
        {nodes.map((node, i) => (
          <motion.div
            key={node.label}
            className="relative flex w-1/3 flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 + i * 0.25, ease: EASE }}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full border-2 text-[11px] ${
                i === 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="text-sm font-semibold">{node.label}</span>
            <span className="label text-muted-foreground">{node.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

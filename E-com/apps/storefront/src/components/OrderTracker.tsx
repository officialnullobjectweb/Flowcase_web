"use client"

import {
  House,
  MapPin,
  Package,
  Truck,
  ClipboardList,
  type LucideIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Step {
  title: string
  desc: string
  icon: LucideIcon
}

export const TRACKER_STEPS: Step[] = [
  {
    title: "Order placed",
    desc: "Payment confirmed — we're queueing your case for print.",
    icon: ClipboardList,
  },
  {
    title: "Packed",
    desc: "Wrapped in plastic-free board with your REUSE10 return envelope.",
    icon: Package,
  },
  {
    title: "Shipped",
    desc: "Handed to the courier — tracking link is on its way to your inbox.",
    icon: Truck,
  },
  {
    title: "Out for delivery",
    desc: "On the van for today's run. Someone should be around to receive it.",
    icon: MapPin,
  },
  {
    title: "Delivered",
    desc: "Dropped off. Enjoy the case — and send the old one back for 10% off.",
    icon: House,
  },
]

function DrawCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="draw-mark"
      />
    </svg>
  )
}

function DrawCross() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M7 7l10 10M17 7L7 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="draw-mark"
      />
    </svg>
  )
}

function fmt(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

/**
 * Interactive delivery timeline: drawn check/cross marks, pulsing active step,
 * animated progress line, click-to-inspect step details.
 */
export function OrderTracker({
  stage,
  failedAt = null,
  placedAt,
  compact = false,
}: {
  /** Index of the active step; 5 = delivered. */
  stage: number
  /** Set when something failed — that step shows a drawn cross. */
  failedAt?: number | null
  placedAt?: string | Date
  compact?: boolean
}) {
  const start = placedAt ? new Date(placedAt) : new Date()
  const [active, setActive] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const resolvedActive = active ?? (failedAt ?? stage)
  const stepTime = (i: number) => {
    if (failedAt != null && i >= failedAt) return null
    if (i > stage) return null
    if (i === stage && stage < TRACKER_STEPS.length) {
      return { expected: new Date(start.getTime() + (i + 1) * 36 * 3600 * 1000) }
    }
    return { at: new Date(start.getTime() + i * 36 * 3600 * 1000) }
  }

  const doneCount = failedAt != null ? failedAt : Math.min(stage, TRACKER_STEPS.length)
  const fill = (doneCount / (TRACKER_STEPS.length - 1)) * 100

  const state = (i: number): "done" | "failed" | "active" | "pending" => {
    if (failedAt != null && i === failedAt) return "failed"
    if (i < doneCount) return "done"
    if (i === resolvedActive && (failedAt == null || i < failedAt)) return "active"
    return "pending"
  }

  const detail = TRACKER_STEPS[resolvedActive] ?? TRACKER_STEPS[TRACKER_STEPS.length - 1]
  const detailState = state(resolvedActive)
  const time = stepTime(resolvedActive)

  return (
    <div className={cn("border border-border bg-background", compact ? "p-5" : "p-5 sm:p-8")}>
      <div className="flex items-center justify-between gap-4">
        <p className="label text-muted-foreground">Track order</p>
        <span
          className={cn(
            "label px-2 py-1",
            failedAt != null
              ? "bg-danger text-white"
              : stage >= TRACKER_STEPS.length
                ? "bg-success text-white"
                : "bg-muted text-foreground"
          )}
        >
          {failedAt != null
            ? "Issue"
            : stage >= TRACKER_STEPS.length
              ? "Delivered"
              : "In transit"}
        </span>
      </div>

      <div className="relative mt-8">
        {/* progress line */}
        <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-border sm:top-6">
          <div
            className={cn(
              "h-full transition-[width] duration-[1200ms] ease-out",
              failedAt != null ? "bg-danger" : "bg-foreground"
            )}
            style={{ width: mounted ? `${fill}%` : "0%" }}
          />
        </div>

        <ol className="relative grid grid-cols-5 gap-1" aria-label="Order status">
          {TRACKER_STEPS.map((step, i) => {
            const s = state(i)
            const Icon = step.icon
            return (
              <li key={step.title} className="flex flex-col items-center">
                <button
                  type="button"
                  aria-current={s === "active" ? "step" : undefined}
                  aria-label={`${step.title} — ${
                    s === "done" ? "complete" : s === "failed" ? "failed" : s === "active" ? "in progress" : "pending"
                  }`}
                  onClick={() => setActive(i)}
                  className="group relative flex flex-col items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span
                    className={cn(
                      "relative grid h-10 w-10 place-items-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12",
                      s === "done" && "border-foreground bg-foreground text-background",
                      s === "active" && "border-foreground bg-background text-foreground",
                      s === "failed" && "border-danger bg-background text-danger",
                      s === "pending" && "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {s === "done" ? (
                      <DrawCheck />
                    ) : s === "failed" ? (
                      <DrawCross />
                    ) : (
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                    )}
                    {s === "active" && (
                      <span
                        className="absolute inset-[-4px] animate-ping rounded-full border-2 border-foreground/30"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "label hidden text-center leading-tight sm:block",
                      s === "pending" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* active step detail */}
      <div className="mt-6 border-t border-border pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={resolvedActive}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-4"
          >
            <span
              className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                detailState === "failed"
                  ? "border-danger text-danger"
                  : detailState === "done"
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground text-foreground"
              )}
            >
              {detailState === "failed" ? (
                <DrawCross />
              ) : detailState === "done" ? (
                <DrawCheck />
              ) : (
                <detail.icon className="h-4 w-4" strokeWidth={1.75} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {detail.title}
                <span
                  className={cn(
                    "label ml-2 px-1.5 py-0.5",
                    detailState === "failed"
                      ? "bg-danger text-white"
                      : detailState === "done"
                        ? "bg-muted text-foreground"
                        : "bg-foreground text-white"
                  )}
                >
                  {detailState === "failed"
                    ? "Failed"
                    : detailState === "done"
                      ? "Complete"
                      : detailState === "active"
                        ? "Now"
                        : "Pending"}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail.desc}</p>
              {time && (
                <p className="label mt-2 text-muted-foreground">
                  {time.at ? fmt(time.at) : `Expected by ${fmt(time.expected)}`}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

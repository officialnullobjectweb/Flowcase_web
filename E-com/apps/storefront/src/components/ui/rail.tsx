"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Children, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Horizontal snap-scroll rail with arrow controls.
 * Children are wrapped in fixed-width slide cells via `itemClass`.
 */
export function Rail({
  children,
  itemClass,
  ariaLabel,
  className,
}: {
  children: ReactNode
  itemClass: string
  ariaLabel?: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" })
  }

  return (
    <div className={cn("group/rail relative min-w-0", className)}>
      <div
        ref={ref}
        aria-label={ariaLabel}
        role={ariaLabel ? "region" : undefined}
        // Scrollable regions need keyboard access (axe: scrollable-region-focusable)
        tabIndex={ariaLabel ? 0 : undefined}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <div className={cn("shrink-0 snap-start", itemClass)}>{child}</div>
        ))}
      </div>
      <div className="pointer-events-none mt-5 hidden justify-end gap-2 lg:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll back"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll forward"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

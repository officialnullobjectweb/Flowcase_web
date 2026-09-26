"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Custom dropdown menu — replaces native <select> with brand-styled
 * trigger + floating panel. Full keyboard support (Enter/Space/Arrows/Esc).
 */
export function Dropdown({
  trigger,
  children,
  align = "start",
  direction = "down",
  ariaLabel,
  panelClass = "",
  triggerClass = "",
}: {
  trigger: ReactNode
  children: (close: () => void) => ReactNode
  align?: "start" | "end"
  direction?: "down" | "up"
  ariaLabel: string
  panelClass?: string
  triggerClass?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = panelRef.current?.querySelectorAll<HTMLElement>(
          '[role="option"],button,a'
        )
        if (!items?.length) return
        e.preventDefault()
        const list = [...items]
        const idx = list.indexOf(document.activeElement as HTMLElement)
        const next =
          e.key === "ArrowDown"
            ? list[(idx + 1 + list.length) % list.length]
            : list[(idx - 1 + list.length) % list.length]
        next.focus()
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 ${triggerClass}`}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className={`absolute z-50 min-w-44 border border-border bg-background py-1 ${
              direction === "up" ? "bottom-full mb-2" : "mt-2"
            } ${align === "end" ? "right-0" : "left-0"} ${panelClass}`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  selected = false,
  href,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  href?: string
}) {
  const cls = `flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-muted focus:bg-muted focus:outline-none ${
    selected ? "font-semibold" : "text-muted-foreground"
  }`
  const inner = (
    <>
      {children}
      {selected && <span aria-hidden="true">✓</span>}
    </>
  )
  if (href)
    return (
      <a href={href} role="option" className={cls}>
        {inner}
      </a>
    )
  return (
    <button type="button" role="option" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

/** Select-style trigger used by FilterSortBar etc. */
export function SelectTrigger({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <span className="label flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      {compact ? null : null}
    </span>
  )
}

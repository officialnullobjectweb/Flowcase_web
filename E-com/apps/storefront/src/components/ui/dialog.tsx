"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * Sharp, hairline dialog — centered modal, or bottom sheet on small screens.
 * Replaces native <dialog> for consistent brand styling + mobile patterns.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  sheet = false,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  sheet?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={sheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 12 }}
            animate={sheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className={
              sheet
                ? "relative flex max-h-[88svh] w-full flex-col border-t border-border bg-background sm:max-w-lg"
                : "relative m-4 flex max-h-[85svh] w-full max-w-lg flex-col border border-border bg-background"
            }
          >
            {(title || sheet) && (
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="display-tight font-display text-base font-bold">
                  {title}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="border-t border-border px-5 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

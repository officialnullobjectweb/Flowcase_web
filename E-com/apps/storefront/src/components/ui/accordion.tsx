"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus } from "lucide-react"
import { useId, useState, type ReactNode } from "react"

export function Accordion({
  items,
  allowMultiple = false,
}: {
  items: { title: string; content: ReactNode }[]
  allowMultiple?: boolean
}) {
  const [open, setOpen] = useState<number[]>([])
  const baseId = useId()

  const toggle = (i: number) =>
    setOpen((prev) =>
      prev.includes(i)
        ? prev.filter((x) => x !== i)
        : allowMultiple
          ? [...prev, i]
          : [i]
    )

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, i) => {
        const isOpen = open.includes(i)
        return (
          <div key={item.title}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${baseId}-${i}`}
              onClick={() => toggle(i)}
              className="flex w-full items-start justify-between gap-4 py-5 text-left text-sm font-semibold text-foreground transition hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:text-base"
            >
              {item.title}
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-muted-foreground"
              >
                {isOpen ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${baseId}-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="max-w-prose pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.content}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

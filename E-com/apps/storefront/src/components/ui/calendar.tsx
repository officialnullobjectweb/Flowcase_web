"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const sameDay = (a: Date | null, b: Date) =>
  !!a &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/**
 * Month-grid date picker — replaces native <input type="date">.
 * Roving tabindex via natural buttons; arrow-key month nav on the grid.
 */
export function Calendar({
  selected,
  onSelect,
  min,
  max,
}: {
  selected: Date | null
  onSelect: (d: Date) => void
  min?: Date
  max?: Date
}) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState<Date>(() => {
    const d = selected ? new Date(selected) : new Date(today)
    d.setDate(1)
    return d
  })
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate()

  const cells: (Date | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)
    ),
  ]

  const shift = (delta: number) =>
    setCursor(
      (c) => new Date(c.getFullYear(), c.getMonth() + delta, 1)
    )

  const disabled = (d: Date) =>
    (min && d < new Date(min.getFullYear(), min.getMonth(), min.getDate())) ||
    (max && d > max)

  return (
    <div className="w-full border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="label">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px p-2" role="grid">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="label py-1 text-center text-muted-foreground"
            aria-hidden="true"
          >
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              disabled={!!disabled(d)}
              aria-pressed={sameDay(selected, d)}
              aria-label={d.toDateString()}
              onClick={() => onSelect(d)}
              className={`flex h-9 items-center justify-center text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-30 ${
                sameDay(selected, d)
                  ? "bg-foreground font-semibold text-background"
                  : sameDay(today, d)
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.getDate()}
            </button>
          ) : (
            <span key={i} />
          )
        )}
      </div>
    </div>
  )
}

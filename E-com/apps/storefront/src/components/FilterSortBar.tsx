"use client"

import { SlidersHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { ProductCategory } from "@/lib/types"
import { Dialog } from "./ui/dialog"
import { Dropdown, DropdownItem, SelectTrigger } from "./ui/dropdown"
import { RangeSlider } from "./ui/slider"

export interface CatalogState {
  q?: string
  sort?: string
  tag?: string
  cat?: string
  min?: string
  max?: string
  color?: string
  rating?: string
  reviews?: string
  badge?: string
}

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "title", label: "A – Z" },
]

export const SWATCHES: Record<string, string> = {
  Onyx: "#141414",
  Glacier: "#dbe7e9",
  Sand: "#d9c9a8",
  Sage: "#a9b8a0",
  Blush: "#e6c9c9",
  Ocean: "#aec6d8",
  Crimson: "#c2373f",
  Amber: "#e0a437",
  Forest: "#3d6b4f",
  Lavender: "#c3b2e0",
}

const RATING_OPTS = [
  { value: "", label: "Any rating" },
  { value: "4.5", label: "4.5 ★ & up" },
  { value: "4", label: "4.0 ★ & up" },
]

const REVIEW_OPTS = [
  { value: "", label: "Any" },
  { value: "10", label: "10+ reviews" },
  { value: "50", label: "50+ reviews" },
]

const PRICE_CAP = 5000

function buildHref(base: string, state: CatalogState, patch: Partial<CatalogState>) {
  const next = { ...state, ...patch }
  const params = new URLSearchParams()
  if (next.q) params.set("q", next.q)
  if (next.tag) params.set("tag", next.tag)
  if (next.cat) params.set("cat", next.cat)
  if (next.sort && next.sort !== "-created_at") params.set("sort", next.sort)
  if (next.min) params.set("min", next.min)
  if (next.max) params.set("max", next.max)
  if (next.color) params.set("color", next.color)
  if (next.rating) params.set("rating", next.rating)
  if (next.reviews) params.set("reviews", next.reviews)
  if (next.badge) params.set("badge", next.badge)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function activeFilterCount(s: CatalogState): number {
  return [s.min, s.max, s.color, s.rating, s.reviews].filter(Boolean).length
}

function FilterPanel({
  basePath,
  state,
  onApply,
  showSort = false,
}: {
  basePath: string
  state: CatalogState
  onApply?: () => void
  showSort?: boolean
}) {
  const router = useRouter()
  const [price, setPrice] = useState<[number, number]>([
    Number(state.min) || 0,
    Number(state.max) || PRICE_CAP,
  ])
  const push = (patch: Partial<CatalogState>) =>
    router.push(buildHref(basePath, state, patch), { scroll: false })

  useEffect(() => {
    setPrice([Number(state.min) || 0, Number(state.max) || PRICE_CAP])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.min, state.max])

  const facet =
    "label border px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"

  return (
    <div className="space-y-6">
      {/* Sort — lives inside the filter panel on desktop */}
      {showSort && (
        <fieldset>
          <legend className="label mb-3 text-muted-foreground">Sort</legend>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => {
              const active = (state.sort ?? "-created_at") === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => push({ sort: opt.value })}
                  className={`${facet} ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* Color swatches */}
      <fieldset>
        <legend className="label mb-3 text-muted-foreground">Color</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SWATCHES).map(([name, hex]) => {
            const active = state.color === name
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => push({ color: active ? "" : name })}
                className={`label flex items-center gap-2 border px-3 py-2 transition ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/20"
                  style={{ background: hex }}
                  aria-hidden="true"
                />
                {name}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Rating */}
      <fieldset>
        <legend className="label mb-3 text-muted-foreground">Minimum rating</legend>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTS.map((opt) => {
            const active = (state.rating ?? "") === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={active}
                onClick={() => push({ rating: opt.value })}
                className={`${facet} ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Review count */}
      <fieldset>
        <legend className="label mb-3 text-muted-foreground">Reviews</legend>
        <div className="flex flex-wrap gap-2">
          {REVIEW_OPTS.map((opt) => {
            const active = (state.reviews ?? "") === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={active}
                onClick={() => push({ reviews: opt.value })}
                className={`${facet} ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Price slider */}
      <div>
        <p className="label mb-1 text-muted-foreground">Price range</p>
        <RangeSlider
          min={0}
          max={PRICE_CAP}
          step={50}
          value={price}
          onChange={setPrice}
          formatValue={(v) => `₹${v}`}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              const patch: Partial<CatalogState> = {}
              patch.min = price[0] > 0 ? String(price[0]) : ""
              patch.max = price[1] < PRICE_CAP ? String(price[1]) : ""
              push(patch)
              onApply?.()
            }}
            className="label h-9 flex-1 bg-primary text-primary-foreground transition hover:bg-primary/85"
          >
            Apply price
          </button>
          <button
            type="button"
            onClick={() => {
              push({ min: "", max: "", color: "", rating: "", reviews: "" })
              onApply?.()
            }}
            className="label h-9 border border-border px-3 text-muted-foreground transition hover:border-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}

/** Hide when scrolling down, reveal when scrolling up or near the top. */
function useRevealOnScroll(): boolean {
  const [show, setShow] = useState(true)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 60) setShow(true)
      else if (y - last > 6) setShow(false)
      else if (last - y > 6) setShow(true)
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return show
}

export function FilterSortBar({
  basePath,
  state,
  categories,
}: {
  basePath: string
  state: CatalogState
  categories: ProductCategory[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const showFloating = useRevealOnScroll()
  const pills = [
    { value: "", label: "All" },
    ...categories.map((c) => ({ value: c.handle, label: c.name })),
  ]
  const activeCount = activeFilterCount(state)
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === (state.sort ?? "-created_at"))?.label ?? "Newest"

  const filterCls = `label flex h-9 cursor-pointer items-center gap-2 border px-3.5 transition ${
    activeCount
      ? "border-foreground text-foreground"
      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
  }`
  const filterContent = (
    <>
      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      Filters
      {activeCount > 0 && (
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      )}
    </>
  )

  return (
    <div className="flex items-center gap-3 border-y border-border py-3">
      {/* Category pills — horizontal snap carousel */}
      <nav
        aria-label="Filter by category"
        className="-mx-4 flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0"
      >
        {pills.map((pill) => {
          const active = pill.value ? state.cat === pill.value : !state.cat
          const href = buildHref(basePath, state, { cat: pill.value })
          return (
            <a
              key={pill.label}
              href={href}
              aria-current={active ? "true" : undefined}
              onClick={(e) => {
                // Client-side nav so the page doesn't reload back to the top.
                e.preventDefault()
                router.push(href, { scroll: false })
              }}
              className={`label shrink-0 snap-start whitespace-nowrap border px-3.5 py-2 transition ${
                active
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {pill.label}
            </a>
          )
        })}
      </nav>

      {/* Desktop: anchored filter panel (sort lives inside it) */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <Dropdown
          ariaLabel="Open filters"
          align="end"
          panelClass="w-80 p-4"
          trigger={<span className={filterCls}>{filterContent}</span>}
        >
          {(close) => (
            <div onClick={(e) => e.stopPropagation()}>
              <FilterPanel
                basePath={basePath}
                state={state}
                onApply={close}
                showSort
              />
            </div>
          )}
        </Dropdown>
      </div>

      {/* Mobile/tablet: floating bar, bottom-center, reveals on scroll up */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out lg:hidden ${
          showFloating && !sheetOpen ? "translate-y-0" : "translate-y-[130%]"
        }`}
      >
        <div
          inert={!showFloating || sheetOpen ? true : undefined}
          aria-hidden={!showFloating || sheetOpen}
          className={`flex items-center gap-2 rounded-full border border-border bg-background/95 px-2.5 py-2 backdrop-blur transition-opacity duration-300 ${
            showFloating && !sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Open filters"
            className={filterCls}
          >
            {filterContent}
          </button>
          <Dropdown
            ariaLabel="Sort products"
            align="end"
            direction="up"
            trigger={<SelectTrigger label="Sort:" value={sortLabel} />}
          >
            {(close) =>
              SORT_OPTIONS.map((option) => (
                <DropdownItem
                  key={option.value}
                  selected={option.value === (state.sort ?? "-created_at")}
                  onClick={() => {
                    close()
                    router.push(buildHref(basePath, state, { sort: option.value }), { scroll: false })
                  }}
                >
                  {option.label}
                </DropdownItem>
              ))
            }
          </Dropdown>
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      <Dialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        sheet
        title="Filters"
        footer={
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="label h-11 w-full bg-primary text-primary-foreground transition hover:bg-primary/85"
          >
            Show results
          </button>
        }
      >
        <FilterPanel basePath={basePath} state={state} />
      </Dialog>
    </div>
  )
}

"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { ProductCard } from "@/components/ProductCard"
import { Dropdown, DropdownItem } from "@/components/ui/dropdown"
import { modelFromTitle, type NavModel } from "@/lib/nav-models"
import type { Product } from "@/lib/types"

interface BrandEntry {
  title: string
  href: string
  thumb?: string
}

const GROUPS = [
  { key: "apple" as const, label: "iPhone" },
  { key: "samsung" as const, label: "Samsung" },
]

/**
 * Section 05: two dropdowns — iPhone and Samsung — each listing that
 * brand's models with a product image. Picking one shows its cases below.
 */
export function CollectionsPicker({
  products,
  models,
  apple,
  samsung,
}: {
  products: Product[]
  models: NavModel[]
  apple?: BrandEntry
  samsung?: BrandEntry
}) {
  const [brand, setBrand] = useState<"apple" | "samsung">("apple")
  const [model, setModel] = useState("")

  const results = model
    ? products.filter((p) => modelFromTitle(p.title) === model)
    : []
  const active = brand === "apple" ? apple : samsung

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {GROUPS.map(({ key, label }) => {
          const entry = key === "apple" ? apple : samsung
          const list = models
            .filter((m) => m.brand === key)
            .sort((a, b) =>
              a.label.localeCompare(b.label, undefined, { numeric: true })
            )
          const picked = brand === key ? model : ""
          return (
            <Dropdown
              key={key}
              ariaLabel={`${label} models`}
              panelClass="min-w-72"
              triggerClass={`w-full justify-between border bg-background px-5 py-4 text-left transition ${
                picked
                  ? "border-foreground"
                  : "border-border hover:border-muted-foreground"
              }`}
              trigger={
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="display-tight font-display text-xl font-bold">
                      {label}
                    </span>
                    <span className="label mt-1 truncate text-muted-foreground">
                      {picked || `${list.length} models`}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              }
            >
              {(close) => (
                <div className="max-h-80 overflow-y-auto py-1">
                  {list.map((m) => (
                    <DropdownItem
                      key={m.handle}
                      selected={picked === m.label}
                      onClick={() => {
                        close()
                        setBrand(key)
                        setModel(m.label)
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="h-9 w-9 shrink-0 overflow-hidden border border-border bg-muted">
                          {m.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="truncate">{m.label}</span>
                      </span>
                    </DropdownItem>
                  ))}
                  {picked && (
                    <button
                      type="button"
                      role="option"
                      aria-selected="true"
                      onClick={() => {
                        close()
                        setModel("")
                      }}
                      className="label flex w-full items-center justify-between px-4 py-2.5 text-left text-muted-foreground transition hover:bg-muted focus:bg-muted focus:outline-none"
                    >
                      Show all {label} models
                      <span aria-hidden="true">↺</span>
                    </button>
                  )}
                  {entry && (
                    <Link
                      href={entry.href}
                      className="label block border-t border-border px-4 py-3 text-foreground transition hover:bg-muted"
                    >
                      View all {entry.title} →
                    </Link>
                  )}
                </div>
              )}
            </Dropdown>
          )
        })}
      </div>

      {/* Results */}
      {model === "" ? (
        <p className="mt-6 border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
          Pick a model from either dropdown — its cases show up right here.
        </p>
      ) : results.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label text-muted-foreground">
              {results.length} case{results.length > 1 ? "s" : ""} for {model}
            </p>
            {active && (
              <Link
                href={active.href}
                className="label border-b border-foreground pb-0.5 transition hover:border-muted-foreground hover:text-muted-foreground"
              >
                View all {active.title} →
              </Link>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
          No cases stocked for {model} yet.{" "}
          {active && (
            <Link href={active.href} className="text-foreground underline underline-offset-4">
              Browse all {active.title} →
            </Link>
          )}
        </p>
      )}
    </>
  )
}

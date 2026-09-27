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
}

const GROUPS = [
  { key: "apple" as const, label: "iPhone" },
  { key: "samsung" as const, label: "Samsung" },
]

const LOGOS: Record<"apple" | "samsung", string> = {
  apple:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOlDllipbzBYdmBgtudhNXWTEjJ--DvlUYNWGMf-g_qA&s=10",
  samsung:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8B1TcHuGgrDXF8o__I_LqtKyJXIHAANU9gK3x9qtHyg&s=10",
}

function brandOf(p: Product): "apple" | "samsung" | "accessory" {
  const tags = (p.tags ?? []).map((t) => t.value.toLowerCase())
  if (tags.includes("samsung")) return "samsung"
  if (tags.includes("apple")) return "apple"
  if (/galaxy|samsung/i.test(p.title)) return "samsung"
  if (/iphone/i.test(p.title)) return "apple"
  return "accessory"
}

/**
 * Section 06: minimal brand dropdowns — brand thumb + label + count,
 * panel exactly matches trigger width.
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
  // brand-logo hotlinks can 403 — fall back to a case photo, never a hole
  const [logoOk, setLogoOk] = useState({ apple: true, samsung: true })

  const results = model
    ? products.filter((p) => modelFromTitle(p.title) === model)
    : []
  const active = brand === "apple" ? apple : samsung

  const brandThumb = (key: "apple" | "samsung") =>
    models.find((m) => m.brand === key && m.image)?.image ??
    products.find((p) => brandOf(p) === key)?.thumbnail ??
    undefined

  return (
    <>
      <div className="mx-auto mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {GROUPS.map(({ key, label }) => {
          const entry = key === "apple" ? apple : samsung
          const list = models
            .filter((m) => m.brand === key)
            .sort((a, b) =>
              a.label.localeCompare(b.label, undefined, { numeric: true })
            )
          const picked = brand === key ? model : ""
          const thumb = brandThumb(key)
          return (
            <div key={key} className="min-w-0">
              {/* brand mark — logo up top so the dropdown below reads instantly */}
              <div className="flex h-20 items-center justify-center border border-b-0 border-border bg-white px-6">
                {logoOk[key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={LOGOS[key]}
                    alt={`${label} logo`}
                    loading="lazy"
                    onError={() => setLogoOk((s) => ({ ...s, [key]: false }))}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={`${label} cases`}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="display-tight font-display text-xl font-bold">
                    {label}
                  </span>
                )}
              </div>
              <Dropdown
              ariaLabel={`${label} models`}
              panelClass="left-0 right-0 w-full min-w-0"
              triggerClass={`w-full justify-between border bg-background px-4 py-3 text-left transition ${
                picked
                  ? "border-foreground"
                  : "border-border hover:border-foreground"
              }`}
              trigger={
                <span className="flex w-full items-center gap-3">
                  <span className="h-10 w-10 shrink-0 overflow-hidden border border-border bg-muted">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={`${label} cases`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="label grid h-full place-items-center text-muted-foreground">
                        {label.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="display-tight font-display text-base font-bold leading-none">
                      {label}
                    </span>
                    <span className="label mt-1.5 truncate text-muted-foreground">
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
            </div>
          )
        })}
      </div>

      {/* Results */}
      {model === "" ? (
        <p className="mx-auto mt-5 max-w-3xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
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
        <p className="mx-auto mt-5 max-w-3xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
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

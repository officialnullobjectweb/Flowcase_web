"use client"

import { ArrowRight, Check, Copy, RotateCcw, Truck } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useToast } from "@/components/ui/toast"

const CODE = "REUSE10"

export function OfferBanners() {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(CODE)
      ok = true
    } catch {
      try {
        const ta = document.createElement("textarea")
        ta.value = CODE
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand("copy")
        ta.remove()
      } catch {
        ok = false
      }
    }
    setCopied(true)
    toast({
      title: ok ? "Code copied" : "Copy the code from the banner",
      detail: `${CODE} — 10% off at checkout`,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Hero offer */}
      <div className="flex min-h-[17rem] flex-col justify-between bg-hero-ink p-6 text-white sm:p-8 lg:col-span-2 lg:row-span-2 lg:min-h-[24rem]">
        <div>
          <p className="label flex items-center gap-2 text-white/60">
            <span className="h-1.5 w-1.5 bg-foreground" aria-hidden="true" />
            Offer of the month
          </p>
          <p className="display-tight mt-4 font-display text-5xl font-bold leading-none sm:text-6xl">
            FLAT 10% OFF
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Send back your old case — any brand — in the prepaid envelope that
            ships with every order. We email the code, you keep 10% forever.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy code ${CODE}`}
            className="group flex items-center gap-3 border border-dashed border-white/40 px-4 py-2.5 transition hover:border-white"
          >
            <span className="label text-sm tracking-widest text-white">{CODE}</span>
            {copied ? (
              <Check className="h-4 w-4 text-white" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 text-white/60 transition group-hover:text-white" aria-hidden="true" />
            )}
          </button>
          <Link
            href="/sustainability"
            className="label inline-flex items-center gap-1.5 text-white/70 transition hover:text-white"
          >
            How it works
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Free shipping */}
      <Link
        href="/shipping-returns"
        className="group flex min-h-[10rem] flex-col justify-between border border-border bg-muted p-6 transition hover:border-foreground"
      >
        <Truck className="h-5 w-5 text-foreground" aria-hidden="true" />
        <div>
          <p className="display-tight font-display text-2xl font-bold">Free shipping</p>
          <p className="mt-1 text-sm text-muted-foreground">
            On orders over ₹999, pan-India.
          </p>
          <p className="label mt-3 inline-flex items-center gap-1 text-muted-foreground transition group-hover:text-foreground">
            Details <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </p>
        </div>
      </Link>

      {/* New arrivals */}
      <Link
        href="/shop"
        className="group flex min-h-[10rem] flex-col justify-between border border-border bg-background p-6 transition hover:border-foreground"
      >
        <RotateCcw className="h-5 w-5 text-foreground" aria-hidden="true" />
        <div>
          <p className="display-tight font-display text-2xl font-bold">Just landed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            iPhone 17 & Galaxy S25 — early-fit cases in stock.
          </p>
          <p className="label mt-3 inline-flex items-center gap-1 text-muted-foreground transition group-hover:text-foreground">
            Shop new <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </p>
        </div>
      </Link>
    </div>
  )
}

"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

/**
 * Reuse-programme coupon display — click to copy the code, then paste it
 * into the checkout discount field (backend has no promotion API).
 */
export function CouponCard({ code = "REUSE10" }: { code?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — the code is visible, user can copy manually
    }
  }

  return (
    <div className="border border-foreground bg-background p-6 sm:p-8">
      <p className="label text-muted-foreground">Your reuse discount</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="display-tight font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {code}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            10% off your next order — enter it at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy code ${code}`}
          className="label inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-primary-foreground transition hover:bg-primary/85"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" /> Copy code
            </>
          )}
        </button>
      </div>
    </div>
  )
}

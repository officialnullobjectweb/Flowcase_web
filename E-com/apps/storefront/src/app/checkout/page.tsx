import type { Metadata } from "next"
import { CheckoutFlow } from "@/components/CheckoutFlow"

export const metadata: Metadata = { title: "Checkout" }

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="label text-center text-muted-foreground lg:text-left">Checkout — Secure</p>
      <h1 className="display-tight mb-8 mt-3 text-center font-display text-3xl font-bold sm:text-4xl lg:text-left">
        Checkout
      </h1>
      <CheckoutFlow />
    </div>
  )
}

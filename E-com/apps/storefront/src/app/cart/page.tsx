import type { Metadata } from "next"
import { RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react"
import { CartView } from "@/components/CartView"
import { PageHeader } from "@/components/PageHeader"

export const metadata: Metadata = { title: "Your bag" }

const CART_TRUST = [
  { icon: Truck, label: "Free shipping over ₹999" },
  { icon: RotateCcw, label: "7-day easy returns" },
  { icon: ShieldCheck, label: "Cash on delivery" },
  { icon: Wallet, label: "UPI · cards · netbanking" },
]

export default function CartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Bag — Review & checkout"
        title="Your bag."
        description="Everything you're considering, in one place. Saved on this device until you're ready."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <CartView />
        <ul className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-6 lg:grid-cols-4">
          {CART_TRUST.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="label flex items-center gap-2 text-muted-foreground"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

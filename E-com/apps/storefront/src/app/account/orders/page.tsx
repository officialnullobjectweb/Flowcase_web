import type { Metadata } from "next"
import { OrderHistory } from "@/components/account/AccountViews"
import { PageHeader } from "@/components/PageHeader"

export const metadata: Metadata = { title: "Order history" }

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Account — Orders"
        title="Order history."
        description="Every order placed with your account — status, totals, and full details."
      />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <OrderHistory />
      </section>
    </>
  )
}

import type { Metadata } from "next"
import { OrderDetailView } from "@/components/account/AccountViews"

export const metadata: Metadata = { title: "Order details" }

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <OrderDetailView orderId={id} />
    </section>
  )
}

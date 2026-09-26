import type { Metadata } from "next"
import { OrderConfirmation } from "@/components/OrderConfirmation"

export const metadata: Metadata = { title: "Order confirmed" }

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ display_id?: string }>
}) {
  const { display_id } = await searchParams
  return (
    <OrderConfirmation displayId={display_id ?? null} />
  )
}

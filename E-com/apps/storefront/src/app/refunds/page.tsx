import type { Metadata } from "next"
import { PolicyPage } from "@/components/PolicyPage"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Flowcase refund timelines by payment method: UPI, cards, netbanking, and COD.",
  alternates: { canonical: "/refunds" },
}

export default function RefundsPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Refund policy."
      description="Approved refunds leave us in 5–7 business days, to the original payment method."
      updated="September 2026"
      sections={[
        {
          title: "Timelines",
          items: [
            "Processed within 5–7 business days of return inspection.",
            "UPI: 1–2 days after processing. Cards: 3–5 days per your bank.",
            "Netbanking: 2–4 days. COD: bank transfer within 7 days.",
            "Tracking and refund IDs are emailed at every step.",
          ],
        },
        {
          title: "What is refunded",
          items: [
            "Full product price for defective, wrong, or cancelled-before-dispatch orders.",
            "Change-of-mind returns: product price only; original shipping is non-refundable.",
            "Return shipping is free for our mistakes, otherwise deducted up to ₹99.",
            "Discounts are honoured: you get back exactly what you paid.",
          ],
        },
        {
          title: "Non-refundable",
          items: [
            "Shipping fees on change-of-mind returns, unless the order was faulty.",
            "Items that fail inspection (used, damaged by misuse, missing parts).",
            "COD convenience fees charged by the courier, where applicable.",
          ],
        },
        {
          title: "Delays & help",
          items: [
            "Past 7 business days with no credit? Email support@flowcase.in.",
            "Include your order number and bank's last-4 for fastest tracing.",
            "Chargebacks freeze a case — contact us first and we resolve in 48 hours.",
          ],
        },
      ]}
    />
  )
}

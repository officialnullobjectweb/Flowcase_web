import type { Metadata } from "next"
import { PolicyPage } from "@/components/PolicyPage"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Flowcase terms of sale, pricing, order acceptance, warranty limits, and governing law for India.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms & conditions."
      description="The short version of buying from Flowcase — pricing, orders, warranty, and liability."
      updated="September 2026"
      sections={[
        {
          title: "Orders & pricing",
          items: [
            "Prices are in INR and inclusive of GST where applicable.",
            "An order is accepted when we email confirmation with a tracking ID.",
            "We may cancel unpaid, fraudulent, or mis-priced orders and refund you in full.",
            "Discount codes (including REUSE10) cannot be stacked unless stated.",
          ],
        },
        {
          title: "Use & compatibility",
          items: [
            "Cases are moulded per model — check your exact model before ordering.",
            "Drop protection is rated to 2.5 m on flat surfaces, not a guarantee against all damage.",
            "MagSafe-compatible; third-party chargers and mounts vary in magnet strength.",
          ],
        },
        {
          title: "Warranty limits",
          items: [
            "6-month warranty against manufacturing defects from delivery.",
            "Excludes cosmetic wear, misuse, and damage beyond the rated drop spec.",
            "Remedy is limited to replacement or refund of the case price.",
          ],
        },
        {
          title: "Liability & law",
          items: [
            "Liability is capped at the price paid for the order giving rise to the claim.",
            "We are not liable for indirect loss, including damage to the phone itself.",
            "Governed by the laws of India; disputes subject to Bengaluru courts.",
          ],
        },
      ]}
    />
  )
}

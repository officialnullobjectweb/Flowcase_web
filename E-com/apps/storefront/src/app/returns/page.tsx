import type { Metadata } from "next"
import { PolicyPage } from "@/components/PolicyPage"

export const metadata: Metadata = {
  title: "Return Policy",
  description: "Flowcase 7-day return window, condition rules, and how to start a return.",
  alternates: { canonical: "/returns" },
}

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Return policy."
      description="7 days from delivery, unused in original packaging — started by one email."
      updated="September 2026"
      sections={[
        {
          title: "Window & eligibility",
          items: [
            "7 days from delivery, tracked by the courier's delivery scan.",
            "Unused, in original packaging, with tags and freebies included.",
            "Wrong or defective items are always eligible, even past 7 days.",
            "Final-sale or REUSE-discounted clearance items are non-returnable.",
          ],
        },
        {
          title: "How to start",
          items: [
            "Email orders@flowcase.example with your order number and photos.",
            "We reply within 1 business day with a return label or pickup slot.",
            "Metro pickups in 2–4 days; self-ship elsewhere and we reimburse up to ₹99.",
            "Keep the prepaid reuse envelope — it is not part of the return.",
          ],
        },
        {
          title: "Inspection",
          items: [
            "Inspected within 2 business days of arrival at our warehouse.",
            "Failed inspection (used, missing parts) is returned to you COD.",
            "Photo evidence is shared if a return is rejected.",
          ],
        },
        {
          title: "After approval",
          items: [
            "Choose replacement or refund at approval time.",
            "Replacements dispatch in 48 hours; refunds follow the refund policy.",
            "Full details: see refunds and shipping & returns pages.",
          ],
        },
      ]}
    />
  )
}

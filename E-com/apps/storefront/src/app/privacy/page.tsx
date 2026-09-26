import type { Metadata } from "next"
import { PolicyPage } from "@/components/PolicyPage"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Flowcase collects, uses, stores, and deletes your personal data. DPDP Act 2023 aligned.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy policy."
      description="What we collect, why we collect it, and how you can delete it."
      updated="September 2026"
      sections={[
        {
          title: "Data we collect",
          items: [
            "Contact: name, email, phone for order updates and support.",
            "Address: shipping and billing addresses for fulfilment.",
            "Device: anonymised pages viewed and crash logs for performance.",
            "We never collect card or UPI credentials — payments go via Razorpay.",
          ],
        },
        {
          title: "How we use it",
          items: [
            "Fulfil orders, send tracking, and handle returns and refunds.",
            "Email new drops and REUSE10 codes only if you opt in.",
            "Fraud prevention and tax invoicing as required by Indian law.",
            "We never sell personal data to third parties.",
          ],
        },
        {
          title: "Sharing & retention",
          items: [
            "Shared only with couriers, payment processors, and tax advisors.",
            "Order records retained for 8 years for GST compliance, then anonymised.",
            "Marketing data deleted within 30 days of an unsubscribe or delete request.",
          ],
        },
        {
          title: "Your rights",
          items: [
            "Access, correct, or delete your data: privacy@flowcase.example.",
            "Withdraw marketing consent any time — every email has unsubscribe.",
            "Grievance officer responds within 30 days per DPDP Act 2023.",
            "Escalation: dataprotection@flowcase.example with your order email.",
          ],
        },
      ]}
    />
  )
}

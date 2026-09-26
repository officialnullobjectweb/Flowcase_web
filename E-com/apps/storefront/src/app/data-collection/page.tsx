import type { Metadata } from "next"
import { PolicyPage } from "@/components/PolicyPage"

export const metadata: Metadata = {
  title: "Data Collection & Cookies",
  description: "What Flowcase stores in cookies and analytics, and how to opt out.",
  alternates: { canonical: "/data-collection" },
}

export default function DataCollectionPage() {
  return (
    <PolicyPage
      title="Data collection."
      description="Cookies, analytics, and marketing pixels — what runs, and how to switch it off."
      updated="September 2026"
      sections={[
        {
          title: "Essential",
          items: [
            "Cart, wishlist, and login session — required for checkout to work.",
            "Consent choice itself (12-month cookie) so we stop asking.",
            "No consent needed; disabling breaks cart and sign-in.",
          ],
        },
        {
          title: "Analytics",
          items: [
            "Privacy-friendly page analytics: pages viewed, referrer, device type.",
            "IP addresses truncated; no cross-site tracking or fingerprinting.",
            "Opt out: enable Do-Not-Track and we skip analytics automatically.",
          ],
        },
        {
          title: "Marketing",
          items: [
            "Only loads after you accept marketing cookies or join the newsletter.",
            "Used to measure drop campaigns and REUSE10 email performance.",
            "Every marketing email carries one-click unsubscribe.",
          ],
        },
        {
          title: "Your controls",
          items: [
            "Delete cookies in your browser to reset consent and sessions.",
            "Request export or deletion: privacy@flowcase.example.",
            "Reviews you publish show your first name — ask to anonymise any time.",
          ],
        },
      ]}
    />
  )
}

import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { WishlistView } from "@/components/WishlistView"

export const metadata: Metadata = { title: "Wishlist", robots: { index: false, follow: true } }

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        eyebrow="Wishlist — Saved for later"
        title="Your shortlist."
        description="Saved on this device — no account needed. Move a case to the bag whenever you're ready."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <WishlistView />
      </section>
    </>
  )
}

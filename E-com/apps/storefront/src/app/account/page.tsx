import type { Metadata } from "next"
import { AccountDashboard } from "@/components/account/AccountDashboard"
import { PageHeader } from "@/components/PageHeader"

export const metadata: Metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <>
      <PageHeader
        eyebrow="Account — Your profile"
        title="Your account."
        description="Profile, orders, wishlist, and saved addresses — everything tied to your Flowcase account."
      />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <AccountDashboard />
      </section>
    </>
  )
}

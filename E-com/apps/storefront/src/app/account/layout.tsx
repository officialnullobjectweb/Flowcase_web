import type { Metadata } from "next"
import { AuthGate } from "@/components/account/AuthGate"

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: true },
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGate>{children}</AuthGate>
}

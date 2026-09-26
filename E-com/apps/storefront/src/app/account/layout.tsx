import { AuthGate } from "@/components/account/AuthGate"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGate>{children}</AuthGate>
}

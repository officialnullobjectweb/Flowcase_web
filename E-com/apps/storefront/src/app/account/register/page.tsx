import type { Metadata } from "next"
import { AuthForm } from "@/components/account/AuthForms"

export const metadata: Metadata = { title: "Create account" }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <p className="label text-center text-muted-foreground lg:text-left">Account — Register</p>
      <h1 className="display-tight mt-3 text-center font-display text-3xl font-bold sm:text-4xl lg:text-left">
        Create your account.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        One account for orders, tracking, and faster checkout.
      </p>
      <div className="mt-8">
        <AuthForm next={next} defaultTab="signup" />
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import { AuthForm } from "@/components/account/AuthForms"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <p className="label text-center text-muted-foreground lg:text-left">Account — Sign in</p>
      <h1 className="display-tight mt-3 text-center font-display text-3xl font-bold sm:text-4xl lg:text-left">
        Welcome back.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Sign in to see your orders — your wishlist stays on this device either
        way.
      </p>
      <div className="mt-8">
        <AuthForm next={next} defaultTab="signin" />
      </div>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function formError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return "Something went wrong — check your details and try again."
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6.1 6.1 0 1 1 0-12.2c1.55 0 2.95.55 4.05 1.55l2.15-2.15A9.1 9.1 0 1 0 12 21.1c4.55 0 8.55-3.25 8.55-8.55 0-.5-.05-1-.1-1.45Z"
      />
    </svg>
  )
}

/**
 * One tabbed auth card — Sign in / Sign up switch instantly, Google OAuth
 * below the email form. Used by /account/login, /account/register, and the
 * signed-out /account overview (replaces the old two-button block).
 */
export function AuthForm({
  next,
  defaultTab = "signin",
}: {
  next?: string
  defaultTab?: "signin" | "signup"
}) {
  const { login, register, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = () => {
    router.push(next && next.startsWith("/") ? next : "/account")
    router.refresh()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (tab === "signin") {
        await login(email, password)
      } else {
        await register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        })
      }
      go()
    } catch (err) {
      setError(formError(err))
    } finally {
      setBusy(false)
    }
  }

  const onGoogle = async () => {
    setGoogleBusy(true)
    setError(null)
    try {
      await loginWithGoogle()
      // redirects to Google — no local navigation
    } catch (err) {
      setError(formError(err))
      setGoogleBusy(false)
    }
  }

  const switchTab = (t: "signin" | "signup") => {
    setTab(t)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Account access"
        className="flex border border-border"
      >
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Sign up"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={`label flex-1 px-4 py-3 transition ${
              tab === key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {tab === "signup" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="label text-muted-foreground">First name</span>
              <Input
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label text-muted-foreground">Last name</span>
              <Input
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>
        )}
        <label className="block">
          <span className="label text-muted-foreground">Email</span>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label text-muted-foreground">
            {tab === "signup"
              ? "Password (min 8 characters)"
              : "Password"}
          </span>
          <Input
            type="password"
            required
            minLength={tab === "signup" ? 8 : undefined}
            autoComplete={
              tab === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="label border border-danger px-3 py-2.5 text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
          {busy
            ? tab === "signin"
              ? "Signing in…"
              : "Creating account…"
            : tab === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="label text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-3"
        onClick={onGoogle}
        disabled={googleBusy}
      >
        <GoogleIcon />
        {googleBusy ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  )
}

"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { phoneGateEnabled, supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const OPEN_PATHS = [
  "/account/login",
  "/account/register",
  "/account/auth/callback",
]

/**
 * Account-wide guard: logged-out visitors are sent to /account/login, and
 * signed-in users who haven't verified a mobile number (required for email
 * and Google sign-ins) see the phone step instead of account content.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const open = OPEN_PATHS.includes(pathname)

  useEffect(() => {
    if (!loading && !user && !open) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, open, pathname, router])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="label text-muted-foreground">Loading account…</p>
      </div>
    )
  }
  if (!user) return open ? <>{children}</> : null
  if (phoneGateEnabled() && !user.phone) return <VerifyPhone />
  return <>{children}</>
}

function VerifyPhone() {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("+91 ")
  const [code, setCode] = useState("")
  const [sentTo, setSentTo] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const target = phone.trim()
    try {
      const { error: err } = await supabase.auth.updateUser({ phone: target })
      if (err) {
        throw new Error(
          /already|in use|registered|exists/i.test(err.message)
            ? "That mobile number is already linked to another account — sign in with it instead."
            : err.message
        )
      }
      setSentTo(target)
      setStep("otp")
      setCode("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code")
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: sentTo,
        token: code.trim(),
        type: "phone_change",
      })
      if (err) throw new Error(err.message)
      // session's user now carries phone — AuthProvider picks it up and the gate lifts
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      <p className="label text-center text-muted-foreground lg:text-left">
        Account — Verify phone
      </p>
      <h1 className="display-tight mt-3 text-center font-display text-3xl font-bold sm:text-4xl lg:text-left">
        One last step.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        For your security, we text a 6-digit code to confirm your mobile
        number. It's required once — after that you're straight in.
      </p>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-8 space-y-5">
          <label className="block">
            <span className="label text-muted-foreground">Mobile number</span>
            <Input
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="label border border-danger px-3 py-2.5 text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>
            {busy ? "Sending code…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-5">
          <p className="label text-muted-foreground">
            Code sent to {sentTo}
          </p>
          <label className="block">
            <span className="label text-muted-foreground">6-digit code</span>
            <Input
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          {error && (
            <p role="alert" className="label border border-danger px-3 py-2.5 text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={busy || code.length !== 6}
          >
            {busy ? "Verifying…" : "Verify"}
          </Button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep("phone")
                setError(null)
              }}
              className="label border-b border-foreground text-foreground"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={() => supabase.auth.updateUser({ phone: sentTo }).catch(() => {})}
              className="label text-muted-foreground hover:text-foreground"
            >
              Resend code
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

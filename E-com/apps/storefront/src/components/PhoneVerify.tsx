"use client"

import { Check, Loader2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { phoneGateEnabled, supabase } from "@/lib/supabase"
import { useToast } from "./ui/toast"

/**
 * Per-address phone verification: OTP-confirms the mobile entered in an
 * address form (Supabase phone_change flow, same as the account gate).
 * Renders nothing when the phone gate is off (local/QA) or the number is
 * incomplete. A number equal to the verified account mobile shows the
 * "Verified" badge automatically.
 */
export function PhoneVerify({
  phone,
  onVerified,
}: {
  phone: string
  onVerified?: () => void
}) {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<"idle" | "otp">("idle")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!phoneGateEnabled() || !user) return null
  const digits = (phone ?? "").replace(/\D/g, "")
  if (!/^[6-9]\d{9}$/.test(digits)) return null

  const target = `+91${digits}`
  const accountDigits = (user.phone ?? "").replace(/\D/g, "")
  const verified = accountDigits === digits

  if (verified) {
    return (
      <p className="label mt-2 flex items-center gap-1.5 text-success">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Mobile verified
      </p>
    )
  }

  const sendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.updateUser({ phone: target })
      if (err) throw new Error(err.message)
      setStep("otp")
      setCode("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code")
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (ev: FormEvent) => {
    ev.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: target,
        token: code.trim(),
        type: "phone_change",
      })
      if (err) throw new Error(err.message)
      await refreshUser()
      setStep("idle")
      toast({ title: "Mobile verified", detail: target, icon: "check" })
      onVerified?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't work")
    } finally {
      setBusy(false)
    }
  }

  if (step === "idle") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sendCode}
          disabled={busy}
          className="label flex items-center gap-1.5 border border-border px-2.5 py-1.5 transition hover:border-foreground"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
          {busy ? "Sending code…" : "Verify this number"}
        </button>
        {error && (
          <span role="alert" className="label text-red-600">
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={verifyCode} className="mt-2 flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2">
        <span className="label text-muted-foreground">6-digit code</span>
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-28 border border-border bg-background px-2.5 py-1.5 text-sm outline-none transition focus:border-foreground"
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="label border border-foreground bg-primary px-3 py-1.5 text-primary-foreground transition disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={sendCode}
        className="label text-muted-foreground hover:text-foreground"
      >
        Resend
      </button>
      <button
        type="button"
        onClick={() => setStep("idle")}
        className="label text-muted-foreground hover:text-foreground"
      >
        Change number
      </button>
      {error && (
        <span role="alert" className="label w-full text-red-600">
          {error}
        </span>
      )}
    </form>
  )
}

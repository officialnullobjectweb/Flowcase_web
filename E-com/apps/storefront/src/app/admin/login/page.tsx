"use client"

import { useState, type FormEvent } from "react"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    setBusy(false)
    if (res.ok) {
      window.location.href = "/admin"
      return
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    setError(
      data.error === "locked_out"
        ? "Too many attempts — try again in 10 minutes."
        : "Wrong password."
    )
    setPassword("")
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <p className="label text-center text-muted-foreground">Flowcase · Admin</p>
      <h1 className="display-tight mt-3 text-center font-display text-3xl font-bold">
        Sign in
      </h1>
      <form onSubmit={submit} className="mt-8 border border-border p-6">
        <label htmlFor="admin-password" className="label text-muted-foreground">
          Password
        </label>
        <div className="relative mt-2">
          <input
            id="admin-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-transparent px-4 py-3 pr-12 text-sm focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="label absolute right-1 top-1/2 -translate-y-1/2 px-3 py-2 text-muted-foreground transition hover:text-foreground"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="label mt-4 w-full bg-foreground py-3 text-background transition hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}

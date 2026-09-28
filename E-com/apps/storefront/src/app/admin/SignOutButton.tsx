"use client"

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        fetch("/api/admin/login", { method: "DELETE" }).then(() => {
          window.location.href = "/admin/login"
        })
      }}
      className="label border border-border px-3 py-2 transition hover:border-foreground"
    >
      Sign out
    </button>
  )
}

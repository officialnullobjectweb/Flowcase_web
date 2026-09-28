"use client"

import { useState } from "react"

/** Two-tap delete (no window.confirm): first tap arms, second confirms. */
export function DeleteButton({
  id,
  name = "id",
  label,
  extra,
  action,
}: {
  id: string
  name?: string
  label: string
  extra?: Record<string, string>
  action: (form: FormData) => Promise<void>
}) {
  const [arming, setArming] = useState(false)
  return (
    <form
      action={async (form: FormData) => {
        if (!arming) {
          setArming(true)
          setTimeout(() => setArming(false), 4000)
          return
        }
        await action(form)
      }}
    >
      <input type="hidden" name={name} value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        className="label border border-danger px-3 py-1.5 text-danger transition hover:bg-danger hover:text-white"
      >
        {arming ? "Sure?" : label}
      </button>
    </form>
  )
}

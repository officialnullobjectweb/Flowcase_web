"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

/**
 * Google OAuth landing: PKCE code exchange happens on client init
 * (detectSessionInUrl), then we move on to /account — the phone gate there
 * applies like any other sign-in.
 */
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      router.replace("/account")
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish()
    })
    const timer = setTimeout(finish, 4000)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [router])

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="label text-muted-foreground">Finishing sign-in…</p>
    </div>
  )
}

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    email: string
    password: string
    first_name: string
    last_name: string
  }) => Promise<void>
  loginWithGoogle: () => Promise<void>
  sendPhoneOtp: (
    phone: string,
    profile?: { first_name: string; last_name: string }
  ) => Promise<void>
  verifyPhoneOtp: (phone: string, code: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}

function authError(err: { message?: string; error_description?: string }): Error {
  return new Error(err.error_description || err.message || "Authentication failed")
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw authError(error)
  }, [])

  const register = useCallback(
    async (input: {
      email: string
      password: string
      first_name: string
      last_name: string
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { first_name: input.first_name, last_name: input.last_name },
          // Confirm email is ON: the email link must land back here with a
          // PKCE code (same origin stores the code_verifier) or the session
          // never completes.
          emailRedirectTo: `${window.location.origin}/account/auth/callback`,
        },
      })
      if (error) {
        if (/user_already_exists|already registered/i.test(error.message))
          throw new Error("This email is already registered — sign in instead.")
        throw authError(error)
      }
      // Email confirmation ON: re-signing-up an existing account returns a
      // user with an EMPTY identities array and no error (GoTrue hides the
      // account) — treat it as a duplicate, not as "check your inbox".
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        throw new Error("This email is already registered — sign in instead.")
      }
      if (!data.session) {
        throw new Error(
          "Check your inbox to confirm your email, then sign in."
        )
      }
    },
    []
  )

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account/auth/callback`,
      },
    })
    if (error) throw authError(error)
  }, [])

  const sendPhoneOtp = useCallback(
    async (phone: string, profile?: { first_name: string; last_name: string }) => {
      // Passwordless: sign-up and sign-in are the same OTP flow (GoTrue
      // creates the account on first code if signups are enabled).
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: profile ? { data: profile } : undefined,
      })
      if (error) throw authError(error)
    },
    []
  )

  const verifyPhoneOtp = useCallback(async (phone: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    })
    if (error) throw authError(error)
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      sendPhoneOtp,
      verifyPhoneOtp,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

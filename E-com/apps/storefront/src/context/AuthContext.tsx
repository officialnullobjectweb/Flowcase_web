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
        },
      })
      if (error) throw authError(error)
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
    () => ({ user, loading, login, register, loginWithGoogle, logout, refreshUser }),
    [user, loading, login, register, loginWithGoogle, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

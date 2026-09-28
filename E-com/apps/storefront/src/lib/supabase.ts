import { createClient } from "@supabase/supabase-js"

/**
 * Supabase Auth is the storefront's identity layer: email/password, Google
 * OAuth, and the mandatory phone-OTP step all resolve to one session here.
 * The anon key is public by design — row-level access is what the service
 * key (server routes only) or RLS would guard.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

/** True when the phone-OTP gate is enforced (default on; set NEXT_PUBLIC_PHONE_VERIFY=off to skip locally). */
export const phoneGateEnabled = () =>
  process.env.NEXT_PUBLIC_PHONE_VERIFY !== "off"

/** Anon-key client for server-side reads (RLS: public SELECT only). */
export function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

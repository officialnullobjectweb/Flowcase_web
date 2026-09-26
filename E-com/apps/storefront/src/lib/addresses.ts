import { supabase } from "@/lib/supabase"
import type { Address } from "@/lib/types"

/**
 * An address saved to the signed-in Supabase user's `user_metadata.addresses`.
 * Shared by the account dashboard (CRUD) and checkout (picker).
 */
export interface SavedAddress extends Address {
  id: string
  label?: string
  is_default?: boolean
}

export const INDIA_STATES = [
  "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DH", "DL", "GA", "GJ", "HP",
  "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ",
  "NL", "OD", "PB", "PY", "RJ", "SK", "TN", "TR", "TS", "UP", "UK", "WB",
]

/** Normalized state-name aliases → INDIA_STATES code (geo-lookup). */
const STATE_NAME_TO_CODE: Record<string, string> = {
  andamanandnicobarislands: "AN",
  andhrapradesh: "AP",
  arunachalpradesh: "AR",
  assam: "AS",
  bihar: "BR",
  chhattisgarh: "CG",
  chandigarh: "CH",
  dadraandnagarhaveliandamananddiu: "DH",
  delhi: "DL",
  nctofdelhi: "DL",
  goa: "GA",
  gujarat: "GJ",
  himachalpradesh: "HP",
  haryana: "HR",
  jharkhand: "JH",
  jammuandkashmir: "JK",
  karnataka: "KA",
  kerala: "KL",
  ladakh: "LA",
  lakshadweep: "LD",
  maharashtra: "MH",
  meghalaya: "ML",
  manipur: "MN",
  madhyapradesh: "MP",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  orissa: "OD",
  punjab: "PB",
  puducherry: "PY",
  pondicherry: "PY",
  rajasthan: "RJ",
  sikkim: "SK",
  tamilnadu: "TN",
  tripura: "TR",
  telangana: "TS",
  uttarpradesh: "UP",
  uttarakhand: "UK",
  uttaranchal: "UK",
  westbengal: "WB",
}

function stateNameToCode(name: string): string | null {
  const key = name.toLowerCase().replace(/[^a-z]/g, "")
  return STATE_NAME_TO_CODE[key] ?? null
}

/**
 * Geo-lookup: 6-digit PIN → district + state code via India Post's public
 * postal API (no key, CORS-enabled). Returns null when unreachable.
 */
export async function lookupPin(
  pin: string
): Promise<{ city: string; province: string } | null> {
  if (!/^\d{6}$/.test(pin)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    if (!res.ok) return null
    const data = (await res.json()) as Array<{
      Status?: string
      PostOffice?: Array<{ District?: string; State?: string }>
    }>
    const po = data?.[0]?.PostOffice?.[0]
    if (!po) return null
    const city = (po.District ?? "").trim()
    const province = stateNameToCode(po.State ?? "") ?? ""
    if (!city && !province) return null
    return { city, province }
  } catch {
    return null
  }
}

export function newAddressId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Read saved addresses from the signed-in user's metadata. */
export async function loadSavedAddresses(): Promise<SavedAddress[]> {
  const { data } = await supabase.auth.getUser()
  const meta = data.user?.user_metadata as { addresses?: SavedAddress[] } | undefined
  if (!Array.isArray(meta?.addresses)) return []
  return meta.addresses.filter((a) => a && a.address_1)
}

/** Replace the saved-address list on the signed-in user's metadata. */
export async function saveSavedAddresses(addresses: SavedAddress[]): Promise<void> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error("Sign in to save addresses.")
  const { error } = await supabase.auth.updateUser({
    data: { ...(data.user.user_metadata ?? {}), addresses },
  })
  if (error) throw new Error(error.message)
}

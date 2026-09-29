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
  /** contact email captured with the address (checkout stores it per entry) */
  email?: string
  /** last-used timestamp (ms) — most recent sorts first */
  updatedAt?: number
}

const BOOK_KEY = "flowcase_addresses"
const LEGACY_KEY = "flowcase_last_address"
const BOOK_MAX = 5

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`

function sameEntry(a: SavedAddress, email: string, b: Address): boolean {
  return (
    (a.email ?? "").toLowerCase() === email.toLowerCase() &&
    (a.address_1 ?? "").trim().toLowerCase() === (b.address_1 ?? "").trim().toLowerCase() &&
    (a.postal_code ?? "").trim() === (b.postal_code ?? "").trim()
  )
}

/** Load the address book (newest first), migrating the legacy single entry once. */
export function loadAddressBook(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(BOOK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((p) => p?.address_1).slice(0, BOOK_MAX)
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (parsed?.address_1) {
        const entry: SavedAddress = { ...parsed, id: uid(), updatedAt: Date.now() }
        localStorage.setItem(BOOK_KEY, JSON.stringify([entry]))
        return [entry]
      }
    }
  } catch {
    /* corrupt storage — start fresh */
  }
  return []
}

/** Insert-or-refresh an entry (dedupe by email + street + PIN), newest first. */
export function saveToAddressBook(email: string, address: Address): SavedAddress[] {
  const book = loadAddressBook().filter((p) => !sameEntry(p, email, address))
  const { id: _drop, ...rest } = address as Address & { id?: string }
  book.unshift({ ...rest, id: uid(), email, updatedAt: Date.now() })
  const trimmed = book.slice(0, BOOK_MAX)
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(trimmed))
  } catch {
    /* private mode — picker simply won't persist */
  }
  return trimmed
}

/** Remove one entry by id. */
export function removeFromAddressBook(id: string): SavedAddress[] {
  const book = loadAddressBook().filter((p) => p.id !== id)
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(book))
  } catch {
    /* ignore */
  }
  return book
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

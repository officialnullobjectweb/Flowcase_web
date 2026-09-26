import { supabase } from "./supabase"

export interface OrderListItem {
  id: string
  display_id?: number
  status?: string
  payment_status?: string
  fulfillment_status?: string
  total?: number | null
  currency_code?: string
  created_at?: string
  email?: string | null
  summary?: { item_count?: number } | null
}

export interface OrderLineItem {
  id: string
  title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
  quantity?: number
  unit_price?: number | null
  subtotal?: number | null
  total?: number | null
}

export interface OrderDetail extends OrderListItem {
  subtotal?: number | null
  shipping_total?: number | null
  tax_total?: number | null
  item_total?: number | null
  items?: OrderLineItem[]
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    province?: string | null
    postal_code?: string | null
    country_code?: string | null
    phone?: string | null
  } | null
}

/** Bearer header for the /api/orders routes, or null when signed out. */
export async function ordersAuthHeader(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

async function ordersFetch(path: string, init?: RequestInit): Promise<Response> {
  const auth = await ordersAuthHeader()
  if (!auth) throw new Error("Sign in to see your orders.")
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth, ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Could not load orders")
  }
  return res
}

/**
 * Orders for the signed-in user — /api/orders verifies the Supabase token
 * server-side and matches orders by that email.
 */
export async function listMyOrders(): Promise<OrderListItem[]> {
  const res = await ordersFetch("/api/orders")
  const { orders } = (await res.json()) as { orders?: OrderListItem[] }
  return orders ?? []
}

export async function getMyOrder(id: string): Promise<OrderDetail> {
  const res = await ordersFetch(`/api/orders/${encodeURIComponent(id)}`)
  const { order } = (await res.json()) as { order?: OrderDetail }
  if (!order) throw new Error("Order not found")
  return order
}

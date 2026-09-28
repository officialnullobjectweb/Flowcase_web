import Link from "next/link"
import { requireAdmin, worker } from "@/lib/admin-api"
import { formatPrice } from "@/lib/format"
import { setOrderStatus } from "../../actions"

export const dynamic = "force-dynamic"

interface OrderDetail {
  id: string
  email: string
  name: string
  phone: string
  address: Record<string, string>
  items: { title?: string; variant?: string; qty?: number; price?: number }[]
  subtotal: number
  shipping: number
  total: number
  currency: string
  status: string
  razorpay_order_id: string
  razorpay_payment_id: string
  created_at: string
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const order = await worker<OrderDetail>(`/v1/orders/${id}`).catch(() => null)
  if (!order) {
    return (
      <>
        <Link href="/admin/orders" className="label text-muted-foreground transition hover:text-foreground">← Orders</Link>
        <p className="mt-8 border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Order not found.</p>
      </>
    )
  }
  return (
    <>
      <Link href="/admin/orders" className="label text-muted-foreground transition hover:text-foreground">← Orders</Link>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="display-tight font-display text-3xl font-bold">{formatPrice(order.total, order.currency)}</h1>
        <p className="label text-muted-foreground">{new Date(order.created_at).toLocaleString("en-IN")}</p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="border border-border p-5">
          <p className="label text-muted-foreground">Customer</p>
          <p className="mt-2 text-sm font-semibold">{order.name || "—"}</p>
          <p className="text-sm text-muted-foreground">{order.email}</p>
          <p className="text-sm text-muted-foreground">{order.phone || "—"}</p>
          <p className="label mt-4 text-muted-foreground">Payments</p>
          <p className="mt-1 break-all font-mono text-xs">order: {order.razorpay_order_id || "—"}</p>
          <p className="break-all font-mono text-xs">payment: {order.razorpay_payment_id || "—"}</p>
          {Object.keys(order.address ?? {}).length > 0 && (
            <>
              <p className="label mt-4 text-muted-foreground">Address</p>
              <p className="mt-1 text-sm leading-relaxed">{Object.values(order.address).filter(Boolean).join(", ")}</p>
            </>
          )}
        </div>
        <div className="border border-border p-5">
          <p className="label text-muted-foreground">Items</p>
          <ul className="mt-2 divide-y divide-border">
            {(order.items ?? []).map((i, n) => (
              <li key={n} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{i.title ?? "?"} {i.variant ? <span className="label text-muted-foreground">· {i.variant}</span> : null} <span className="label text-muted-foreground">×{i.qty ?? 1}</span></span>
                <span className="font-semibold">{i.price != null ? formatPrice(i.price * (i.qty ?? 1), order.currency) : "—"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <p className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(order.subtotal, order.currency)}</span></p>
            <p className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{formatPrice(order.shipping, order.currency)}</span></p>
            <p className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total, order.currency)}</span></p>
          </div>
          <form action={setOrderStatus} className="mt-4 flex items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <label htmlFor="od-status" className="label text-muted-foreground">Status</label>
            <select id="od-status" name="status" defaultValue={order.status} className="label border border-border bg-transparent px-2 py-1.5 focus:border-foreground focus:outline-none">
              {["pending", "paid", "failed", "refunded", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="label bg-foreground px-4 py-1.5 text-background transition hover:opacity-85">Save</button>
          </form>
        </div>
      </div>
    </>
  )
}

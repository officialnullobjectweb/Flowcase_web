import { requireAdmin, worker } from "@/lib/admin-api"
import { supabaseAnon } from "@/lib/supabase"
import { formatPrice } from "@/lib/format"
import Link from "next/link"
import { DeleteButton } from "./DeleteButton"
import { deleteProduct, deleteReview, setOrderStatus, updateVariant } from "./actions"

export const dynamic = "force-dynamic"

interface ProductRow {
  id: string
  title: string
  handle: string
}
interface VariantRow {
  id: string
  title: string
  price_inr: number
  inventory_qty: number
}
interface OrderRow {
  id: string
  email: string
  name: string
  total: number
  status: string
  created_at: string
  items: { title?: string; qty?: number }[]
}
interface ReviewRow {
  id: string
  name: string
  rating: number
  title: string
  body: string
  created_at: string
}

export default async function AdminProductsPage() {
  await requireAdmin()
  const sb = supabaseAnon()
  const [{ data: products }, { data: variants }] = await Promise.all([
    sb.from("products").select("id,title,handle").order("title").limit(200),
    sb.from("variants").select("id,title,price_inr,inventory_qty,product_id").limit(1000),
  ])
  const byProduct = new Map<string, VariantRow[]>()
  for (const v of (variants ?? []) as (VariantRow & { product_id: string })[]) {
    const list = byProduct.get(v.product_id) ?? []
    list.push(v)
    byProduct.set(v.product_id, list)
  }
  return (
    <>
      <h1 className="display-tight font-display text-3xl font-bold">Products</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="label text-muted-foreground">{(products ?? []).length} products · price & stock save instantly</p>
        <Link href="/admin/products/new" className="label bg-foreground px-4 py-2 text-background transition hover:opacity-85">
          + New product
        </Link>
      </div>
      <div className="mt-8 space-y-6">
        {((products ?? []) as ProductRow[]).map((p) => (
          <section key={p.id} className="border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <p className="font-display text-base font-bold">{p.title}</p>
                <p className="label mt-1 text-muted-foreground">{p.handle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/products/${p.id}`} className="label border border-border px-3 py-1.5 transition hover:border-foreground">
                  Edit
                </Link>
                <DeleteButton id={p.id} label="Delete" action={deleteProduct} />
              </div>
            </div>
            <ul className="divide-y divide-border">
              {(byProduct.get(p.id) ?? []).map((v) => (
                <li key={v.id}>
                  <form action={updateVariant} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <input type="hidden" name="id" value={v.id} />
                    <span className="label w-24 text-muted-foreground">{v.title}</span>
                    <label className="label flex items-center gap-2">
                      ₹
                      <input
                        name="price_inr"
                        type="number"
                        min={0}
                        defaultValue={v.price_inr}
                        className="w-24 border border-border bg-transparent px-2 py-1.5 text-sm focus:border-foreground focus:outline-none"
                      />
                    </label>
                    <label className="label flex items-center gap-2">
                      Stock
                      <input
                        name="inventory_qty"
                        type="number"
                        min={0}
                        defaultValue={v.inventory_qty}
                        className="w-20 border border-border bg-transparent px-2 py-1.5 text-sm focus:border-foreground focus:outline-none"
                      />
                    </label>
                    <button type="submit" className="label bg-foreground px-4 py-1.5 text-background transition hover:opacity-85">
                      Save
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export async function AdminOrdersPage() {
  await requireAdmin()
  const orders = await worker<OrderRow[]>("/v1/orders?limit=100").catch(() => [] as OrderRow[])
  return (
    <>
      <h1 className="display-tight font-display text-3xl font-bold">Orders</h1>
      <p className="label mt-2 text-muted-foreground">{orders.length} orders · newest first</p>
      <div className="mt-8 space-y-4">
        {orders.map((o) => (
          <div key={o.id} className="border border-border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">
                <Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.email}</Link>
              </p>
              <p className="font-display text-lg font-bold">{formatPrice(o.total, "inr")}</p>
            </div>
            <p className="label mt-1 text-muted-foreground">
              {o.name} · {new Date(o.created_at).toLocaleString("en-IN")} · {(o.items ?? []).map((i) => `${i.title ?? "?"}×${i.qty ?? 1}`).join(", ") || "no items"}
            </p>
            <form action={setOrderStatus} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="id" value={o.id} />
              <label htmlFor={`st-${o.id}`} className="label text-muted-foreground">Status</label>
              <select
                id={`st-${o.id}`}
                name="status"
                defaultValue={o.status}
                className="label border border-border bg-transparent px-2 py-1.5 focus:border-foreground focus:outline-none"
              >
                {["pending", "paid", "failed", "refunded", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button type="submit" className="label bg-foreground px-4 py-1.5 text-background transition hover:opacity-85">
                Save
              </button>
            </form>
          </div>
        ))}
        {orders.length === 0 && (
          <p className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No orders yet — they land here the moment checkout goes live.
          </p>
        )}
      </div>
    </>
  )
}

export async function AdminReviewsPage() {
  await requireAdmin()
  const reviews = await worker<ReviewRow[]>("/v1/reviews?limit=100").catch(() => [] as ReviewRow[])
  return (
    <>
      <h1 className="display-tight font-display text-3xl font-bold">Reviews</h1>
      <p className="label mt-2 text-muted-foreground">{reviews.length} reviews · newest first</p>
      <div className="mt-8 space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border border-border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{r.name} · {r.rating}★</p>
              <p className="label text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
            </div>
            <p className="mt-2 text-sm font-semibold">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            <form action={deleteReview} className="mt-3">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="label border border-border px-4 py-1.5 text-danger transition hover:border-danger">
                Delete
              </button>
            </form>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No buyer reviews yet.
          </p>
        )}
      </div>
    </>
  )
}

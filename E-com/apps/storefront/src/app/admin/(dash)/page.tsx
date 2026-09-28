import { requireAdmin, worker } from "@/lib/admin-api"
import { formatPrice } from "@/lib/format"

export const dynamic = "force-dynamic"

interface Stats {
  products: number
  orders: number
  paidOrders: number
  revenueInr: number
  reviews: number
}

const CARDS: { key: keyof Stats; label: string; money?: boolean }[] = [
  { key: "revenueInr", label: "Revenue (paid)", money: true },
  { key: "orders", label: "Orders" },
  { key: "paidOrders", label: "Paid orders" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Reviews" },
]

export default async function AdminDashboard() {
  await requireAdmin()
  let stats: Stats = { products: 0, orders: 0, paidOrders: 0, revenueInr: 0, reviews: 0 }
  try {
    stats = await worker<Stats>("/v1/stats")
  } catch {
    // worker unreachable — dashboard renders zeros, not a crash
  }
  return (
    <>
      <h1 className="display-tight font-display text-3xl font-bold">Dashboard</h1>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.key} className="border border-border p-5">
            <p className="display-tight font-display text-3xl font-bold">
              {c.money ? formatPrice(stats[c.key], "inr") : stats[c.key]}
            </p>
            <p className="label mt-2 text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Manage the catalogue under Products, fulfil and refund under Orders, and
        moderate buyer reviews under Reviews. Changes go live on the storefront
        within minutes.
      </p>
    </>
  )
}

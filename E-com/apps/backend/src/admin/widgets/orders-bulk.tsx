import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder } from "@medusajs/framework/types"
import { Badge, Button, Checkbox, Container, Heading, Text, toast } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../lib/sdk"

type PayFilter = "all" | "cod" | "prepaid"

function money(amount: number | null | undefined, currency = "inr") {
  if (amount == null) return "—"
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency.toUpperCase()} ${amount}`
  }
}

/** Prepaid orders carry Razorpay ids in the payment data; COD payments are empty. */
function isPrepaid(order: AdminOrder): boolean {
  const payments = (order.payment_collections ?? []).flatMap(
    (collection) => collection.payments ?? []
  )
  return payments.some((payment) => {
    const data = (payment.data ?? {}) as Record<string, unknown>
    return Boolean(data.razorpay_order_id || data.razorpay_payment_id)
  })
}

function printOrders(orders: AdminOrder[]) {
  const win = window.open("", "_blank", "width=520,height=760")
  if (!win) {
    toast.error("Popup blocked", { description: "Allow popups to print slips." })
    return
  }
  const sections = orders
    .map((order) => {
      const addr = order.shipping_address
      const rows = (order.items ?? [])
        .map(
          (item) =>
            `<tr><td style="padding:4px 0">${item.title ?? "Item"}${
              item.variant_title ? ` (${item.variant_title})` : ""
            } × ${item.quantity}</td></tr>`
        )
        .join("")
      return `<section class="slip">
  <p class="brand">Flowcase · Go With Flow</p>
  <h1>Packing slip · #${order.display_id ?? "—"}</h1>
  <p class="muted">${new Date(order.created_at ?? Date.now()).toLocaleString("en-IN")} · ${
    isPrepaid(order) ? "PREPAID" : "COD"
  }</p>
  <p class="muted">Customer: ${order.email ?? "—"}</p>
  <p class="muted">Ship to: ${
    addr
      ? `${addr.first_name ?? ""} ${addr.last_name ?? ""}, ${addr.address_1 ?? ""}, ${
          addr.city ?? ""
        } ${addr.postal_code ?? ""}`
      : "—"
  }</p>
  <table><tbody>${rows}</tbody></table>
  <p class="total">Total ${money(order.total, order.currency_code)}</p>
</section>`
    })
    .join("")

  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Flowcase packing slips (${orders.length})</title>
  <style>
    body { font-family: ui-monospace, monospace; font-size: 13px; color: #111; margin: 24px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .total { font-weight: 700; border-top: 1px solid #111; padding-top: 8px; margin-top: 8px; }
    .brand { letter-spacing: 0.12em; text-transform: uppercase; font-size: 11px; }
    .slip { page-break-after: always; margin-bottom: 32px; }
  </style>
</head>
<body>${sections}</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
}

export default function OrdersBulkWidget() {
  const [payFilter, setPayFilter] = useState<PayFilter>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const ordersQuery = useQuery({
    queryKey: ["flowcase:orders-bulk"],
    queryFn: async () => {
      const { orders } = await sdk.admin.order.list({
        limit: 50,
        fields:
          "display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at,payment_collections.payments.data,items.title,items.quantity,items.variant_title,shipping_address",
      })
      return (orders ?? []) as AdminOrder[]
    },
    refetchInterval: 30_000,
  })

  const rows = useMemo(() => {
    const all = (ordersQuery.data ?? []).map((order) => ({
      order,
      prepaid: isPrepaid(order),
    }))
    if (payFilter === "all") return all
    return all.filter((r) => (payFilter === "prepaid" ? r.prepaid : !r.prepaid))
  }, [ordersQuery.data, payFilter])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedOrders = (ordersQuery.data ?? []).filter((o) =>
    selected.has(o.id)
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level="h2">Fulfilment desk</Heading>
            <Badge color="grey" size="small" rounded="full">
              {rows.length}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Select orders and print packing slips in one go. COD shows cash to
            collect; prepaid is already paid.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-ui-border-base">
            {(
              [
                ["all", "All"],
                ["cod", "COD"],
                ["prepaid", "Prepaid"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant={payFilter === key ? "primary" : "transparent"}
                size="small"
                type="button"
                onClick={() => setPayFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              setSelected(
                payFilter === "all"
                  ? new Set((ordersQuery.data ?? []).map((o) => o.id))
                  : new Set(rows.map((r) => r.order.id))
              )
            }
          >
            Select shown
          </Button>
          <Button
            variant="secondary"
            size="small"
            type="button"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            size="small"
            type="button"
            disabled={selectedOrders.length === 0}
            onClick={() => printOrders(selectedOrders)}
          >
            Print {selectedOrders.length || ""} slip{selectedOrders.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ui-border-base text-left text-ui-fg-muted">
              <th className="px-6 py-3 font-medium">Order</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Payment</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ordersQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`s-${i}`} className="border-b border-ui-border-base">
                  <td colSpan={5} className="px-6 py-4">
                    <span className="block h-4 w-full max-w-md animate-pulse rounded bg-ui-bg-subtle" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <Text size="small" className="text-ui-fg-muted">
                    No orders match this filter.
                  </Text>
                </td>
              </tr>
            ) : (
              rows.map(({ order, prepaid }) => (
                <tr
                  key={order.id}
                  className="border-b border-ui-border-base last:border-0"
                >
                  <td className="px-6 py-3">
                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={selected.has(order.id)}
                        onCheckedChange={() => toggle(order.id)}
                      />
                      <span className="font-medium">
                        #{order.display_id ?? "—"}
                      </span>
                      <span className="text-ui-fg-muted">
                        {new Date(order.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </label>
                  </td>
                  <td className="px-3 py-3 text-ui-fg-subtle">
                    {order.email ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      color={
                        order.fulfillment_status === "delivered"
                          ? "green"
                          : order.status === "canceled"
                            ? "red"
                            : "orange"
                      }
                      size="small"
                      rounded="full"
                    >
                      {order.fulfillment_status ?? order.status ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      color={prepaid ? "green" : "grey"}
                      size="small"
                      rounded="full"
                    >
                      {prepaid ? "Prepaid" : "COD"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {money(order.total, order.currency_code)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.after",
  id: "flowcase:orders-bulk",
})

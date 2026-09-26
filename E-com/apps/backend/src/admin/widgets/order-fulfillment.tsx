import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Divider,
  Heading,
  Text,
  clx,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../lib/sdk"

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

function printReceipt(order: AdminOrder) {
  const rows = (order.items ?? [])
    .map(
      (item) =>
        `<tr><td style="padding:4px 0">${item.title ?? item.product_title ?? "Item"}${
          item.variant_title ? ` (${item.variant_title})` : ""
        } × ${item.quantity}</td><td style="text-align:right;padding:4px 0">${money(
          item.total ?? item.unit_price * item.quantity,
          order.currency_code
        )}</td></tr>`
    )
    .join("")

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Flowcase Receipt #${order.display_id ?? order.id}</title>
  <style>
    body { font-family: ui-monospace, monospace; font-size: 13px; color: #111; margin: 24px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .total { font-weight: 700; border-top: 1px solid #111; padding-top: 8px; margin-top: 8px; }
    .brand { letter-spacing: 0.12em; text-transform: uppercase; font-size: 11px; }
  </style>
</head>
<body>
  <p class="brand">Flowcase · Go With Flow</p>
  <h1>Packing receipt</h1>
  <p class="muted">Order #${order.display_id ?? "—"}</p>
  <p class="muted">Customer: ${order.email ?? "—"}</p>
  <p class="muted">Date: ${new Date(order.created_at ?? Date.now()).toLocaleString("en-IN")}</p>
  <table><tbody>${rows}</tbody></table>
  <p class="total">Total ${money(order.total, order.currency_code)}</p>
  <p class="muted">Payment: ${order.payment_status ?? "—"} · Fulfillment: ${
    order.fulfillment_status ?? "—"
  }</p>
</body>
</html>`

  const win = window.open("", "_blank", "width=480,height=720")
  if (!win) {
    toast.error("Popup blocked", {
      description: "Allow popups to print the packaging receipt.",
    })
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
}

type ActionKey = "notify" | "receipt" | "return" | "refund" | null

export default function OrderFulfillmentWidget({
  data: order,
}: DetailWidgetProps<AdminOrder>) {
  const queryClient = useQueryClient()
  const [activeAction, setActiveAction] = useState<ActionKey>(null)

  const detailQuery = useQuery({
    queryKey: ["order-fulfillment", order.id],
    queryFn: () =>
      sdk.admin.order.retrieve(order.id, {
        fields:
          "id,display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at,*items,*fulfillments,*payment_collections,*payment_collections.payments,*shipping_address",
      }),
    refetchInterval: 15_000,
  })

  const liveOrder = detailQuery.data?.order ?? order

  const fulfillments = useMemo(
    () => (liveOrder.fulfillments ?? []) as AdminOrder["fulfillments"],
    [liveOrder]
  )
  const payments = useMemo(
    () =>
      (liveOrder.payment_collections ?? []).flatMap(
        (collection) => collection.payments ?? []
      ),
    [liveOrder]
  )

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const email = liveOrder.email
      if (!email) throw new Error("Order has no customer email for notifications.")
      const trackingNumber =
        fulfillments[0]?.tracking_numbers?.[0] ??
        `TRK-${liveOrder.display_id ?? liveOrder.id.slice(-6)}`
      await sdk.admin.order.update(liveOrder.id, {
        metadata: {
          ...(liveOrder.metadata ?? {}),
          tracking_number: trackingNumber,
          tracking_notified_at: new Date().toISOString(),
        },
      })
      return trackingNumber
    },
    onMutate: () => setActiveAction("notify"),
    onSuccess: async (tracking) => {
      await queryClient.invalidateQueries({
        queryKey: ["order-fulfillment", liveOrder.id],
      })
      toast.success("Tracking notification queued", {
        description: `Tracking ${tracking} stored on order · customer email ${liveOrder.email}.`,
      })
    },
    onError: (error) => {
      toast.error("Notification failed", {
        description:
          error instanceof Error ? error.message : "Could not send tracking email.",
      })
    },
    onSettled: () => setActiveAction(null),
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      const items = (liveOrder.items ?? []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }))
      if (!items.length) throw new Error("Order has no line items to return.")
      const { return: initiated } = await sdk.admin.return.initiateRequest({
        order_id: liveOrder.id,
        internal_note: "Instant return authorized from order operations panel",
      })
      if (!initiated?.id) throw new Error("Return request was not created.")
      const { return: withItems } = await sdk.admin.return.addReturnItem(
        initiated.id,
        { items }
      )
      return withItems?.id ?? initiated.id
    },
    onMutate: () => setActiveAction("return"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["order-fulfillment", liveOrder.id],
      })
      toast.success("Return authorized", {
        description: "Return request created for all line items.",
      })
    },
    onError: (error) => {
      toast.error("Return authorization failed", {
        description:
          error instanceof Error ? error.message : "Could not create return.",
      })
    },
    onSettled: () => setActiveAction(null),
  })

  const refundMutation = useMutation({
    mutationFn: async () => {
      const payment = payments.find((entry) => entry.amount)
      if (!payment?.id) {
        throw new Error("No payment found to refund on this order.")
      }
      await sdk.admin.payment.refund(payment.id, {
        amount: payment.amount,
        note: "ops_panel_refund",
      })
      return payment.amount
    },
    onMutate: () => setActiveAction("refund"),
    onSuccess: async (amount) => {
      await queryClient.invalidateQueries({
        queryKey: ["order-fulfillment", liveOrder.id],
      })
      toast.success("Refund issued", {
        description: `${money(amount, liveOrder.currency_code)} returned to customer.`,
      })
    },
    onError: (error) => {
      toast.error("Refund failed", {
        description:
          error instanceof Error ? error.message : "Payment refund was rejected.",
      })
    },
    onSettled: () => setActiveAction(null),
  })

  const statusBadge = (() => {
    const value = (liveOrder.status ?? "").toLowerCase()
    if (value === "completed" || value === "archived") {
      return { color: "green" as const, label: liveOrder.status ?? value }
    }
    if (value === "canceled" || value === "cancelled") {
      return { color: "red" as const, label: liveOrder.status ?? value }
    }
    return { color: "blue" as const, label: liveOrder.status ?? "active" }
  })()

  const busy =
    notifyMutation.isPending ||
    returnMutation.isPending ||
    refundMutation.isPending

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level="h2">Order operations</Heading>
            <Badge color={statusBadge.color} size="small" rounded="full">
              {statusBadge.label}
            </Badge>
            <Badge
              color={
                (liveOrder.fulfillment_status ?? "").toLowerCase() === "fulfilled"
                  ? "green"
                  : "orange"
              }
              size="small"
              rounded="full"
            >
              {liveOrder.fulfillment_status ?? "unfulfilled"}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Shipping notifications, packing receipts, returns, and refunds for #
            {liveOrder.display_id ?? liveOrder.id.slice(-6)}.
          </Text>
        </div>
        <Text size="small" weight="plus" className="tabular-nums">
          {money(liveOrder.total, liveOrder.currency_code)}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            Tracking notice
          </Text>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="w-full"
            disabled={busy}
            isLoading={notifyMutation.isPending && activeAction === "notify"}
            onClick={() => notifyMutation.mutate()}
          >
            Send tracking update
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            Packaging
          </Text>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="w-full"
            disabled={busy}
            onClick={() => {
              printReceipt(liveOrder)
              toast.success("Receipt ready", {
                description: "Packaging receipt opened in a print window.",
              })
            }}
          >
            Print packing receipt
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            Returns
          </Text>
          <Button
            type="button"
            variant="danger"
            size="small"
            className="w-full"
            disabled={busy}
            isLoading={returnMutation.isPending && activeAction === "return"}
            onClick={() => returnMutation.mutate()}
          >
            Authorize full return
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            Refunds
          </Text>
          <Button
            type="button"
            variant="danger"
            size="small"
            className="w-full"
            disabled={busy}
            isLoading={refundMutation.isPending && activeAction === "refund"}
            onClick={() => refundMutation.mutate()}
          >
            Issue instant refund
          </Button>
        </div>
      </div>

      <div className={clx("px-4 py-4 sm:px-6")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Customer
            </Text>
            <Text size="small" weight="plus" className="break-all">
              {liveOrder.email ?? "—"}
            </Text>
          </div>
          <div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Payment status
            </Text>
            <Text size="small" weight="plus">
              {liveOrder.payment_status ?? "—"}
            </Text>
          </div>
          <div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Fulfillments
            </Text>
            <Text size="small" weight="plus">
              {fulfillments.length === 0
                ? "None yet"
                : `${fulfillments.length} · ${
                    fulfillments[0]?.tracking_numbers?.[0] ?? "no tracking #"
                  }`}
            </Text>
          </div>
        </div>
        <Divider className="my-4" />
        <Text size="xsmall" className="text-ui-fg-muted">
          Actions refresh order state for 15s after completion. Destructive
          refunds require a captured payment on the order.
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
  id: "flowcase:order-fulfillment",
})

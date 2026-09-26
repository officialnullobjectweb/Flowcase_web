import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartPie } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  clx,
  toast,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

interface AdminOrderRow {
  id: string
  display_id?: number
  status?: string
  payment_status?: string
  fulfillment_status?: string
  total?: number | null
  currency_code?: string
  email?: string | null
  created_at?: string
  item_count?: number
}

interface LowStockRow {
  productId: string
  productTitle: string
  variantId: string
  variantTitle: string
  sku: string | null
  quantity: number
}

const REFRESH_MS = 15_000
const DEFAULT_THRESHOLD = 5

function formatMoney(amount: number | null | undefined, currency = "inr") {
  if (amount == null) return "—"
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`
  }
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function orderBadge(status: string | undefined) {
  const value = (status ?? "").toLowerCase()
  if (value === "completed" || value === "fulfilled" || value === "captured") {
    return { color: "green" as const, label: status ?? "completed" }
  }
  if (value === "pending" || value === "requires_action") {
    return { color: "orange" as const, label: status ?? "pending" }
  }
  if (value === "canceled" || value === "cancelled" || value === "failed") {
    return { color: "red" as const, label: status ?? value }
  }
  if (value === "partially_fulfilled" || value === "partially_shipped") {
    return { color: "blue" as const, label: status ?? value }
  }
  return { color: "grey" as const, label: status ?? "unknown" }
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: "green" | "blue" | "orange" | "purple"
}) {
  const ring =
    accent === "green"
      ? "border-emerald-200 bg-emerald-50/60"
      : accent === "blue"
        ? "border-blue-200 bg-blue-50/60"
        : accent === "orange"
          ? "border-amber-200 bg-amber-50/60"
          : accent === "purple"
            ? "border-violet-200 bg-violet-50/60"
            : "border-ui-border-base bg-ui-bg-subtle"

  return (
    <div className={clx("rounded-lg border p-4 sm:p-5", ring)}>
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-ui-fg-base sm:text-3xl">
        {value}
      </p>
      <Text size="xsmall" className="mt-1 text-ui-fg-muted">
        {hint}
      </Text>
    </div>
  )
}

export default function OperationsDashboardPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [live, setLive] = useState(true)

  const ordersQuery = useQuery({
    queryKey: ["ops-dashboard", "orders"],
    queryFn: async () => {
      const { orders, count } = await sdk.admin.order.list({
        limit: 100,
        order: "-created_at",
        fields: "id,display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at",
      })
      return { orders: (orders ?? []) as AdminOrderRow[], count: count ?? 0 }
    },
    refetchInterval: live ? REFRESH_MS : false,
  })

  const productsQuery = useQuery({
    queryKey: ["ops-dashboard", "products"],
    queryFn: async () => {
      const { products } = await sdk.admin.product.list({
        limit: 200,
        fields:
          "id,title,variants.id,variants.title,variants.sku,variants.manage_inventory,+variants.inventory_quantity",
      })
      return products ?? []
    },
    refetchInterval: live ? REFRESH_MS : false,
  })

  const inventoryQuery = useQuery({
    queryKey: ["ops-dashboard", "inventory"],
    queryFn: async () => {
      const { count } = await sdk.admin.inventoryItem.list({ limit: 1 })
      return count ?? 0
    },
    refetchInterval: live ? REFRESH_MS : false,
  })

  const stats = useMemo(() => {
    const orders = ordersQuery.data?.orders ?? []
    const completed = orders.filter((order) => {
      const status = (order.status ?? "").toLowerCase()
      return status === "completed" || status === "captured"
    })
    const revenue = completed.reduce((sum, order) => sum + (order.total ?? 0), 0)
    const aov = completed.length > 0 ? revenue / completed.length : 0
    const activeSkus =
      productsQuery.data?.reduce((sum, product) => {
        return (
          sum +
          (product.variants ?? []).filter((variant) => {
            if (variant.manage_inventory === false) return true
            return (variant.inventory_quantity ?? 0) > 0
          }).length
        )
      }, 0) ?? 0

    return {
      revenue,
      orderCount: orders.length,
      completedCount: completed.length,
      aov,
      activeSkus,
      currency: completed[0]?.currency_code ?? "inr",
    }
  }, [ordersQuery.data, productsQuery.data])

  const lowStock = useMemo(() => {
    const rows: LowStockRow[] = []
    for (const product of productsQuery.data ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant.manage_inventory === false) continue
        const quantity = variant.inventory_quantity ?? 0
        if (quantity < threshold) {
          rows.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantTitle: variant.title ?? "—",
            sku: variant.sku ?? null,
            quantity,
          })
        }
      }
    }
    return rows.sort((a, b) => a.quantity - b.quantity)
  }, [productsQuery.data, threshold])

  const recentOrders = useMemo(() => {
    return (ordersQuery.data?.orders ?? []).slice(0, 8)
  }, [ordersQuery.data])

  const isLoading = ordersQuery.isLoading || productsQuery.isLoading
  const isError = ordersQuery.isError || productsQuery.isError

  const refreshNow = async () => {
    await Promise.all([
      ordersQuery.refetch(),
      productsQuery.refetch(),
      inventoryQuery.refetch(),
    ])
    toast.success("Dashboard metrics refreshed", {
      description: "Live sales, inventory, and order data updated.",
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Heading level="h1">Operations & Sales</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Unified retail metrics with auto-refresh every {REFRESH_MS / 1000}s.
            Threshold changes apply instantly.
          </Text>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-threshold">Low-stock threshold</Label>
            <Input
              id="stock-threshold"
              type="number"
              min={0}
              max={999}
              value={threshold}
              onChange={(event) => {
                const next = Number(event.target.value)
                setThreshold(Number.isFinite(next) && next >= 0 ? next : 0)
              }}
              className="w-28"
            />
          </div>
          <Button
            variant={live ? "secondary" : "primary"}
            size="small"
            onClick={() => setLive((value) => !value)}
            type="button"
          >
            {live ? "Pause live feed" : "Resume live feed"}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => void refreshNow()}
            type="button"
            isLoading={ordersQuery.isFetching || productsQuery.isFetching}
          >
            Refresh now
          </Button>
        </div>
      </div>

      {isError && (
        <Container className="border-ui-border-error bg-ui-bg-error">
          <Text size="small" weight="plus" className="text-ui-fg-error">
            Failed to load metrics. Check backend connectivity and retry.
          </Text>
          <Button
            className="mt-3"
            variant="secondary"
            size="small"
            onClick={() => void refreshNow()}
            type="button"
          >
            Retry
          </Button>
        </Container>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sales revenue"
          value={isLoading ? "…" : formatMoney(stats.revenue, stats.currency)}
          hint={`${stats.completedCount} completed orders`}
          accent="green"
        />
        <StatCard
          label="Orders"
          value={isLoading ? "…" : String(stats.orderCount)}
          hint="Last 100 orders loaded"
          accent="blue"
        />
        <StatCard
          label="Active inventory SKUs"
          value={isLoading ? "…" : String(stats.activeSkus)}
          hint={`${inventoryQuery.data ?? 0} inventory items tracked`}
          accent="purple"
        />
        <StatCard
          label="Average order value"
          value={isLoading ? "…" : formatMoney(stats.aov, stats.currency)}
          hint="Completed orders only"
          accent="orange"
        />
      </div>

      <Container className="p-0" style={{ maxWidth: "100%" }}>
        <div className="flex flex-col gap-1 border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading level="h2">Recent orders log</Heading>
            <Badge color={live ? "green" : "grey"} rounded="full" size="small">
              {live ? "Live" : "Paused"}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Color-coded fulfillment and payment status for the latest activity.
          </Text>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Payment</Table.HeaderCell>
              <Table.HeaderCell>Fulfillment</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell>Placed</Table.HeaderCell>
            </Table.Header>
            <Table.Body>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Table.Row key={`skeleton-${index}`}>
                    <Table.Cell>
                      <span className="block h-4 w-16 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-32 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-28 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                  </Table.Row>
                ))
              ) : recentOrders.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={7}>
                    <div className="py-8 text-center">
                      <Text size="small" className="text-ui-fg-muted">
                        No orders yet. Place a test order from the storefront.
                      </Text>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                recentOrders.map((order) => {
                  const status = orderBadge(order.status)
                  const payment = orderBadge(order.payment_status)
                  const fulfillment = orderBadge(order.fulfillment_status)
                  return (
                    <Table.Row key={order.id}>
                      <Table.Cell>
                        <span className="font-medium tabular-nums">
                          #{order.display_id ?? order.id.slice(-6)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="block max-w-40 truncate text-sm">
                          {order.email || "—"}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={status.color} size="small" rounded="full">
                          {status.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={payment.color} size="small" rounded="full">
                          {payment.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={fulfillment.color}
                          size="small"
                          rounded="full"
                        >
                          {fulfillment.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="tabular-nums">
                          {formatMoney(order.total, order.currency_code)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="whitespace-nowrap text-sm text-ui-fg-muted">
                          {formatDate(order.created_at)}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  )
                })
              )}
            </Table.Body>
          </Table>
        </div>
      </Container>

      <Container className="p-0" style={{ maxWidth: "100%" }}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <Heading level="h2">Low-stock watchlist</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Variants with fewer than {threshold} units remaining.
            </Text>
          </div>
          <Badge
            color={lowStock.length > 0 ? "orange" : "green"}
            size="small"
            rounded="full"
          >
            {lowStock.length} alert{lowStock.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Variant</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Stock</Table.HeaderCell>
              <Table.HeaderCell>Severity</Table.HeaderCell>
            </Table.Header>
            <Table.Body>
              {lowStock.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <div className="py-8 text-center">
                      <Text size="small" className="text-ui-fg-muted">
                        All tracked variants are above the threshold.
                      </Text>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                lowStock.map((row) => (
                  <Table.Row key={row.variantId}>
                    <Table.Cell>
                      <span className="block max-w-56 truncate">
                        {row.productTitle}
                      </span>
                    </Table.Cell>
                    <Table.Cell>{row.variantTitle}</Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs">{row.sku ?? "—"}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="tabular-nums font-medium">
                        {row.quantity}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={row.quantity === 0 ? "red" : "orange"}
                        size="small"
                        rounded="full"
                      >
                        {row.quantity === 0 ? "Out of stock" : "Critical"}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Operations Dashboard",
  icon: ChartPie,
  rank: 1,
})

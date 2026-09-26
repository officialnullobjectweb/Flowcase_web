import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState, type FormEvent } from "react"
import { sdk } from "../../lib/sdk"

interface OrderItemRow {
  title?: string
  quantity?: number
  unit_price?: number
  product_id?: string | null
  variant_title?: string | null
}

interface OrderRow {
  id: string
  display_id?: number
  status?: string
  payment_status?: string
  total?: number | null
  currency_code?: string
  created_at?: string
  items?: OrderItemRow[]
}

interface VariantRow {
  id: string
  title?: string
  sku?: string | null
  manage_inventory?: boolean
  inventory_quantity?: number
}

interface ProductRow {
  id: string
  title: string
  variants?: VariantRow[]
}

interface ExpenseRow {
  id: string
  spent_on: string
  category: string
  note: string
  amount: number
  created_at: string
}

const ORDER_FIELDS =
  "id,display_id,status,payment_status,total,currency_code,created_at," +
  "items.title,items.quantity,items.unit_price,items.product_id,items.variant_title"

const PRODUCT_FIELDS =
  "id,title,variants.id,variants.title,variants.sku,variants.manage_inventory,+variants.inventory_quantity"

const CATEGORIES = [
  "packaging",
  "shipping",
  "marketing",
  "software",
  "supplies",
  "other",
]

const DAY_MS = 86_400_000

/**
 * Counts toward revenue: money that is authorized or captured (and not
 * canceled). Matches how the operations dashboard treats paid orders while
 * still counting pre-capture authorized payments as sales in flight.
 */
const PAID_PAYMENT = new Set([
  "authorized",
  "captured",
  "partially_refunded",
  "refunded",
  "succeeded",
])

function isPaid(order: OrderRow): boolean {
  const status = (order.status ?? "").toLowerCase()
  const payment = (order.payment_status ?? "").toLowerCase()
  return status !== "canceled" && PAID_PAYMENT.has(payment)
}

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

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

function dayLabel(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(
    new Date(ms)
  )
}

function spendLabel(row: ExpenseRow): string {
  return row.category
}

function Kpi({
  label,
  value,
  hint,
  delta,
  deltaLabel,
}: {
  label: string
  value: string
  hint: string
  delta?: number | null
  deltaLabel: string
}) {
  const deltaText =
    delta == null
      ? "—"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`
  const deltaClass =
    delta == null || delta === 0
      ? "text-ui-fg-muted"
      : delta > 0
        ? "text-emerald-600"
        : "text-ui-fg-error"
  return (
    <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4 sm:p-5">
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-ui-fg-base sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className={`text-xs font-medium tabular-nums ${deltaClass}`}>
          {deltaText}
        </span>
        <span className="text-xs text-ui-fg-muted">{deltaLabel}</span>
      </p>
      <Text size="xsmall" className="mt-1 text-ui-fg-muted">
        {hint}
      </Text>
    </div>
  )
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0
  return ((current - previous) / previous) * 100
}

export default function ReportsPage() {
  const [days, setDays] = useState(30)
  const [spendDate, setSpendDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [spendCategory, setSpendCategory] = useState("packaging")
  const [spendAmount, setSpendAmount] = useState("")
  const [spendNote, setSpendNote] = useState("")
  const queryClient = useQueryClient()

  const ordersQuery = useQuery({
    queryKey: ["reports", "orders"],
    queryFn: async () => {
      const all: OrderRow[] = []
      const floor = Date.now() - 190 * DAY_MS
      for (let page = 0; page < 10; page++) {
        const { orders } = await sdk.admin.order.list({
          limit: 100,
          offset: page * 100,
          order: "-created_at",
          fields: ORDER_FIELDS,
        })
        const batch = (orders ?? []) as OrderRow[]
        all.push(...batch)
        if (batch.length < 100) break
        const oldest = Date.parse(batch[batch.length - 1]?.created_at ?? "")
        if (oldest < floor) break
      }
      return all
    },
  })

  const productsQuery = useQuery({
    queryKey: ["reports", "products"],
    queryFn: async () => {
      const { products } = await sdk.admin.product.list({
        limit: 200,
        fields: PRODUCT_FIELDS,
      })
      return (products ?? []) as ProductRow[]
    },
  })

  const expensesQuery = useQuery({
    queryKey: ["reports", "expenses"],
    queryFn: () =>
      sdk.client.fetch<{ expenses: ExpenseRow[] }>("/admin/expenses"),
  })

  const addExpense = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<{ expense: ExpenseRow }>("/admin/expenses", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reports", "expenses"] })
      toast.success("Expense added", { description: "Reports updated." })
      setSpendAmount("")
      setSpendNote("")
    },
    onError: (error: Error) => {
      toast.error("Could not add expense", { description: error.message })
    },
  })

  const deleteExpense = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch<{ deleted: number }>(`/admin/expenses?id=${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reports", "expenses"] })
    },
    onError: (error: Error) => {
      toast.error("Could not delete expense", { description: error.message })
    },
  })

  const orders = ordersQuery.data ?? []
  const expenses = expensesQuery.data?.expenses ?? []

  const metrics = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const curStart = todayStart - (days - 1) * DAY_MS
    const curEnd = todayStart + DAY_MS
    const prevStart = curStart - days * DAY_MS

    const inWindow = (order: OrderRow, from: number, to: number) => {
      const at = Date.parse(order.created_at ?? "")
      return at >= from && at < to && isPaid(order)
    }

    const sumRevenue = (from: number, to: number) =>
      orders.filter((o) => inWindow(o, from, to)).reduce((s, o) => s + (o.total ?? 0), 0)

    const curOrders = orders.filter((o) => inWindow(o, curStart, curEnd))
    const prevOrders = orders.filter((o) => inWindow(o, prevStart, curStart))
    const revenue = curOrders.reduce((s, o) => s + (o.total ?? 0), 0)
    const prevRevenue = prevOrders.reduce((s, o) => s + (o.total ?? 0), 0)
    const aov = curOrders.length ? revenue / curOrders.length : 0
    const prevAov = prevOrders.length ? prevRevenue / prevOrders.length : 0

    const inSpend = (date: string, from: number, to: number) => {
      const at = Date.parse(`${date}T00:00:00`)
      return at >= from && at < to
    }
    const spend = expenses
      .filter((e) => inSpend(e.spent_on, curStart, curEnd))
      .reduce((s, e) => s + (e.amount ?? 0), 0)
    const prevSpend = expenses
      .filter((e) => inSpend(e.spent_on, prevStart, curStart))
      .reduce((s, e) => s + (e.amount ?? 0), 0)

    const daily: { label: string; revenue: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const start = todayStart - i * DAY_MS
      const value = sumRevenue(start, start + DAY_MS)
      daily.push({ label: dayLabel(start), revenue: value })
    }

    const movementMap = new Map<
      string,
      { title: string; units: number; revenue: number }
    >()
    for (const order of curOrders) {
      for (const item of order.items ?? []) {
        const key = item.product_id || item.title || "unknown"
        const row = movementMap.get(key) ?? {
          title: item.title ?? "Unknown item",
          units: 0,
          revenue: 0,
        }
        row.units += item.quantity ?? 0
        row.revenue += (item.quantity ?? 0) * (item.unit_price ?? 0)
        movementMap.set(key, row)
      }
    }
    const movement = [...movementMap.values()].sort((a, b) => b.units - a.units)

    const stock: {
      product: string
      variant: string
      sku: string | null
      quantity: number
    }[] = []
    for (const product of productsQuery.data ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant.manage_inventory === false) continue
        stock.push({
          product: product.title,
          variant: variant.title ?? "Default",
          sku: variant.sku ?? null,
          quantity: variant.inventory_quantity ?? 0,
        })
      }
    }
    stock.sort((a, b) => a.quantity - b.quantity)

    const currency =
      curOrders[0]?.currency_code ?? prevOrders[0]?.currency_code ?? "inr"

    return {
      revenue,
      prevRevenue,
      orderCount: curOrders.length,
      prevOrderCount: prevOrders.length,
      aov,
      prevAov,
      spend,
      prevSpend,
      net: revenue - spend,
      prevNet: prevRevenue - prevSpend,
      daily,
      maxDaily: Math.max(1, ...daily.map((d) => d.revenue)),
      movement,
      stock,
      currency,
      spentCount: expenses.filter((e) => inSpend(e.spent_on, curStart, curEnd)).length,
      prevStart,
      curStart,
      curEnd,
    }
  }, [orders, expenses, days, productsQuery.data])

  const isLoading =
    ordersQuery.isLoading || productsQuery.isLoading || expensesQuery.isLoading
  const isError = ordersQuery.isError || productsQuery.isError

  const deltaLabel = `vs previous ${days} days`

  const onSubmitSpend = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(spendAmount)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a whole-rupee amount above 0")
      return
    }
    addExpense.mutate({
      amount,
      category: spendCategory,
      note: spendNote,
      spent_on: spendDate,
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-16" data-testid="reports-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Heading level="h1">Reports & Analytics</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Revenue, spend, product movement, and inventory health for the
            selected window.
          </Text>
        </div>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Report period"
        >
          {[7, 30, 90].map((value) => (
            <Button
              key={value}
              variant={days === value ? "primary" : "secondary"}
              size="small"
              type="button"
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {value} days
            </Button>
          ))}
        </div>
      </div>

      {isError && (
        <Container className="border-ui-border-error bg-ui-bg-error">
          <Text size="small" weight="plus" className="text-ui-fg-error">
            Failed to load report data. Check backend connectivity and retry.
          </Text>
          <Button
            className="mt-3"
            variant="secondary"
            size="small"
            type="button"
            onClick={() => {
              void ordersQuery.refetch()
              void productsQuery.refetch()
              void expensesQuery.refetch()
            }}
          >
            Retry
          </Button>
        </Container>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          label="Revenue"
          value={isLoading ? "…" : formatMoney(metrics.revenue, metrics.currency)}
          hint={`Net after spend: ${formatMoney(metrics.net, metrics.currency)}`}
          delta={pctChange(metrics.revenue, metrics.prevRevenue)}
          deltaLabel={deltaLabel}
        />
        <Kpi
          label="Paid orders"
          value={isLoading ? "…" : String(metrics.orderCount)}
          hint={`${metrics.movement.length} products sold in window`}
          delta={pctChange(metrics.orderCount, metrics.prevOrderCount)}
          deltaLabel={deltaLabel}
        />
        <Kpi
          label="Average order value"
          value={isLoading ? "…" : formatMoney(metrics.aov, metrics.currency)}
          hint="Paid orders only"
          delta={pctChange(metrics.aov, metrics.prevAov)}
          deltaLabel={deltaLabel}
        />
        <Kpi
          label="Business spend"
          value={isLoading ? "…" : formatMoney(metrics.spend, metrics.currency)}
          hint={`${metrics.spentCount} expense entries in window`}
          delta={pctChange(metrics.spend, metrics.prevSpend)}
          deltaLabel={deltaLabel}
        />
        <Kpi
          label="Net"
          value={isLoading ? "…" : formatMoney(metrics.net, metrics.currency)}
          hint="Revenue minus recorded expenses"
          delta={pctChange(metrics.net, metrics.prevNet)}
          deltaLabel={deltaLabel}
        />
      </div>

      <Container className="p-0" style={{ maxWidth: "100%" }}>
        <div className="flex flex-col gap-1 border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading level="h2">Daily revenue</Heading>
            <Text size="xsmall" className="text-ui-fg-muted">
              Peak day: {formatMoney(metrics.maxDaily, metrics.currency)}
            </Text>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Paid orders per day for the last {days} days.
          </Text>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <div
            className="flex h-44 items-end gap-[2px]"
            role="img"
            aria-label={`Daily revenue for the last ${days} days`}
          >
            {isLoading
              ? Array.from({ length: days }).map((_, index) => (
                  <span
                    key={`bar-skeleton-${index}`}
                    className="h-10 flex-1 animate-pulse rounded-t bg-ui-bg-subtle"
                  />
                ))
              : metrics.daily.map((day, index) => {
                  const height = Math.max(
                    2,
                    Math.round((day.revenue / metrics.maxDaily) * 100)
                  )
                  return (
                    <span
                      key={`${day.label}-${index}`}
                      className="flex-1 rounded-t hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        backgroundColor: "var(--fg-base)",
                      }}
                      title={`${day.label}: ${formatMoney(day.revenue, metrics.currency)}`}
                    />
                  )
                })}
          </div>
          <div className="mt-2 flex justify-between">
            <Text size="xsmall" className="text-ui-fg-muted">
              {metrics.daily[0]?.label ?? "—"}
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted">
              {metrics.daily[metrics.daily.length - 1]?.label ?? "—"}
            </Text>
          </div>
        </div>
      </Container>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Container className="p-0" style={{ maxWidth: "100%" }}>
          <div className="border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
            <Heading level="h2">Product movement</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Units sold from paid orders in this window.
            </Text>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Units sold</Table.HeaderCell>
                <Table.HeaderCell>Item revenue</Table.HeaderCell>
              </Table.Header>
              <Table.Body>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Table.Row key={`m-skeleton-${index}`}>
                      <Table.Cell>
                        <span className="block h-4 w-40 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="block h-4 w-12 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : metrics.movement.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <div className="py-8 text-center">
                        <Text size="small" className="text-ui-fg-muted">
                          No paid orders in this period.
                        </Text>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  metrics.movement.slice(0, 12).map((row) => (
                    <Table.Row key={row.title}>
                      <Table.Cell>
                        <span className="block max-w-56 truncate">{row.title}</span>
                      </Table.Cell>
                      <Table.Cell className="tabular-nums font-medium">
                        {row.units}
                      </Table.Cell>
                      <Table.Cell className="tabular-nums">
                        {formatMoney(row.revenue, metrics.currency)}
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        </Container>

        <Container className="p-0" style={{ maxWidth: "100%" }}>
          <div className="border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
            <Heading level="h2">Inventory health</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Lowest stock first — {metrics.stock.length} tracked variants.
            </Text>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.HeaderCell>Variant</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Stock</Table.HeaderCell>
              </Table.Header>
              <Table.Body>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Table.Row key={`s-skeleton-${index}`}>
                      <Table.Cell>
                        <span className="block h-4 w-40 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="block h-4 w-16 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                      <Table.Cell>
                        <span className="block h-4 w-24 animate-pulse rounded bg-ui-bg-subtle" />
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : metrics.stock.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <div className="py-8 text-center">
                        <Text size="small" className="text-ui-fg-muted">
                          No tracked variants.
                        </Text>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  metrics.stock.slice(0, 15).map((row) => {
                    const width = Math.min(100, Math.max(3, row.quantity * 5))
                    return (
                      <Table.Row key={`${row.product}-${row.variant}`}>
                        <Table.Cell>
                          <span className="block max-w-48 truncate">
                            {row.product} · {row.variant}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-mono text-xs">{row.sku ?? "—"}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 rounded-full"
                              style={{
                                width: `${width}%`,
                                minWidth: 6,
                                backgroundColor: "var(--fg-base)",
                              }}
                              aria-hidden="true"
                            />
                            <span className="tabular-nums text-sm font-medium">
                              {row.quantity}
                            </span>
                            {row.quantity === 0 ? (
                              <Badge color="red" size="small" rounded="full">
                                Out of stock
                              </Badge>
                            ) : row.quantity < 5 ? (
                              <Badge color="orange" size="small" rounded="full">
                                Low
                              </Badge>
                            ) : null}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table>
          </div>
        </Container>
      </div>

      <Container className="p-0" style={{ maxWidth: "100%" }}>
        <div className="border-b border-ui-border-base px-4 py-4 sm:px-6 sm:py-5">
          <Heading level="h2">Business expenses</Heading>
          <Text size="small" className="text-ui-fg-muted">
            Track spend that orders don’t capture — packaging, ads, tools.
          </Text>
        </div>

        <form
          onSubmit={onSubmitSpend}
          className="flex flex-wrap items-end gap-3 border-b border-ui-border-base px-4 py-4 sm:px-6"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={spendDate}
              onChange={(event) => setSpendDate(event.target.value)}
              className="w-40"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-category">Category</Label>
            <select
              id="expense-category"
              value={spendCategory}
              onChange={(event) => setSpendCategory(event.target.value)}
              className="h-9 w-40 rounded-md border border-ui-border-base bg-ui-bg-subtle px-2.5 text-sm text-ui-fg-base"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-amount">Amount (₹)</Label>
            <Input
              id="expense-amount"
              type="number"
              min={1}
              step={1}
              placeholder="450"
              value={spendAmount}
              onChange={(event) => setSpendAmount(event.target.value)}
              className="w-32"
              required
            />
          </div>
          <div className="flex min-w-44 flex-1 flex-col gap-1.5">
            <Label htmlFor="expense-note">Note</Label>
            <Input
              id="expense-note"
              placeholder="Bubble wrap roll"
              value={spendNote}
              onChange={(event) => setSpendNote(event.target.value)}
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="small"
            className="mb-0.5"
            isLoading={addExpense.isPending}
          >
            Add expense
          </Button>
        </form>

        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Category</Table.HeaderCell>
              <Table.HeaderCell>Note</Table.HeaderCell>
              <Table.HeaderCell>Amount</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Header>
            <Table.Body>
              {expensesQuery.isLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <Table.Row key={`e-skeleton-${index}`}>
                    <Table.Cell>
                      <span className="block h-4 w-24 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-20 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-32 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block h-4 w-16 animate-pulse rounded bg-ui-bg-subtle" />
                    </Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                ))
              ) : expenses.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <div className="py-8 text-center">
                      <Text size="small" className="text-ui-fg-muted">
                        No expenses recorded yet.
                      </Text>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                expenses.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell className="tabular-nums">{row.spent_on}</Table.Cell>
                    <Table.Cell>
                      <Badge color="grey" size="small" rounded="full">
                        {spendLabel(row)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="block max-w-56 truncate">
                        {row.note || "—"}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums font-medium">
                      {formatMoney(row.amount, metrics.currency)}
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Button
                        variant="transparent"
                        size="small"
                        type="button"
                        onClick={() => deleteExpense.mutate(row.id)}
                        isLoading={deleteExpense.isPending}
                      >
                        Delete
                      </Button>
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
  label: "Reports",
  icon: ChartBar,
  rank: 2,
})

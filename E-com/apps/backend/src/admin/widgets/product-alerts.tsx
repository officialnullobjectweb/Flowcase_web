import { defineWidgetConfig } from "@medusajs/admin-sdk"
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { sdk } from "../lib/sdk"

interface LowStockRow {
  productId: string
  productTitle: string
  productHandle: string
  variantId: string
  variantTitle: string
  sku: string | null
  quantity: number
  inventoryItemId: string | null
}

const DEFAULT_THRESHOLD = 5
const REFILL_AMOUNT = 50

function severity(quantity: number) {
  if (quantity <= 0) return { color: "red" as const, label: "Out of stock" }
  if (quantity <= 2) return { color: "orange" as const, label: "Critical" }
  return { color: "orange" as const, label: "Low" }
}

export default function ProductAlertsWidget() {
  const queryClient = useQueryClient()
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)
  const [refillTarget, setRefillTarget] = useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ["product-alerts", "products"],
    queryFn: async () => {
      const { products } = await sdk.admin.product.list({
        limit: 200,
        fields:
          "id,title,handle,variants.id,variants.title,variants.sku,variants.manage_inventory,+variants.inventory_quantity,variants.allow_backorder",
      })
      return products ?? []
    },
    refetchInterval: 20_000,
  })

  const inventoryQuery = useQuery({
    queryKey: ["product-alerts", "inventory-map"],
    queryFn: async () => {
      const { inventory_items } = await sdk.admin.inventoryItem.list({
        limit: 200,
        fields: "id,sku,location_levels.id,location_levels.stocked_quantity,location_levels.location_id",
      })
      const bySku = new Map<
        string,
        { id: string; levels: { location_id: string; stocked_quantity: number }[] }
      >()
      for (const item of inventory_items ?? []) {
        if (item.sku) {
          bySku.set(item.sku, {
            id: item.id,
            levels: (item.location_levels ?? []).map((level) => ({
              location_id: level.location_id,
              stocked_quantity: level.stocked_quantity ?? 0,
            })),
          })
        }
      }
      return bySku
    },
    refetchInterval: 20_000,
  })

  const lowStock = useMemo(() => {
    const rows: LowStockRow[] = []
    for (const product of productsQuery.data ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant.manage_inventory === false) continue
        const quantity = variant.inventory_quantity ?? 0
        if (quantity >= threshold) continue
        rows.push({
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          variantId: variant.id,
          variantTitle: variant.title ?? "—",
          sku: variant.sku ?? null,
          quantity,
          inventoryItemId: variant.sku
            ? inventoryQuery.data?.get(variant.sku)?.id ?? null
            : null,
        })
      }
    }
    return rows.sort((a, b) => a.quantity - b.quantity)
  }, [productsQuery.data, inventoryQuery.data, threshold])

  const refillMutation = useMutation({
    mutationFn: async (row: LowStockRow) => {
      if (!row.inventoryItemId) {
        throw new Error(
          "No inventory item linked to this variant SKU. Restock from Inventory settings."
        )
      }
      const levels = await sdk.admin.inventoryItem.listLevels(
        row.inventoryItemId,
        { limit: 20 }
      )
      const target = levels.inventory_levels?.[0]
      if (!target?.location_id) {
        throw new Error(
          "No stock location level found. Create a location level first."
        )
      }
      const next =
        (target.stocked_quantity ?? 0) +
        Math.max(REFILL_AMOUNT, threshold - row.quantity + REFILL_AMOUNT)
      await sdk.admin.inventoryItem.updateLevel(
        row.inventoryItemId,
        target.location_id,
        { stocked_quantity: next }
      )
      return { ...row, next }
    },
    onMutate: (row) => setRefillTarget(row.variantId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["product-alerts"] })
      toast.success("Inventory refill queued", {
        description: `${result.productTitle} · ${result.variantTitle} → ${result.next} units at primary location.`,
      })
    },
    onError: (error) => {
      toast.error("Refill failed", {
        description:
          error instanceof Error ? error.message : "Unexpected inventory error.",
      })
    },
    onSettled: () => setRefillTarget(null),
  })

  const bulkRefresh = async () => {
    await Promise.all([
      productsQuery.refetch(),
      inventoryQuery.refetch(),
    ])
    toast.success("Inventory scan updated", {
      description: `${lowStock.length} variant(s) below threshold ${threshold}.`,
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level="h2">Low-stock alerts</Heading>
            <Badge
              color={lowStock.length > 0 ? "orange" : "green"}
              size="small"
              rounded="full"
            >
              {lowStock.length}
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-muted">
            Isolates variants under {threshold} units. Threshold updates re-filter
            instantly; stock polls every 20s.
          </Text>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alerts-threshold">Threshold</Label>
            <Input
              id="alerts-threshold"
              type="number"
              min={0}
              max={99}
              value={threshold}
              onChange={(event) => {
                const next = Number(event.target.value)
                setThreshold(Number.isFinite(next) && next >= 0 ? next : 0)
              }}
              className="w-24"
            />
          </div>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() => void bulkRefresh()}
            isLoading={productsQuery.isFetching}
          >
            Rescan
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Variant</Table.HeaderCell>
            <Table.HeaderCell>SKU</Table.HeaderCell>
            <Table.HeaderCell>In stock</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Header>
          <Table.Body>
            {productsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Table.Row key={`skeleton-${index}`}>
                  <Table.Cell colSpan={6}>
                    <span className="block h-5 w-full max-w-md animate-pulse rounded bg-ui-bg-subtle" />
                  </Table.Cell>
                </Table.Row>
              ))
            ) : lowStock.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6}>
                  <div className={clx("py-10 text-center")}>
                    <Text size="small" className="text-ui-fg-muted">
                      {productsQuery.isError
                        ? "Could not load products. Retry from the product list."
                        : "No variants below the current threshold."}
                    </Text>
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : (
              lowStock.map((row) => {
                const level = severity(row.quantity)
                const busy = refillMutation.isPending && refillTarget === row.variantId
                return (
                  <Table.Row key={row.variantId}>
                    <Table.Cell>
                      <Link
                        to={`/products/${row.productId}`}
                        className="text-ui-fg-base hover:underline"
                      >
                        {row.productTitle}
                      </Link>
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
                      <Badge color={level.color} size="small" rounded="full">
                        {level.label}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="small"
                          variant="secondary"
                          type="button"
                          disabled={!row.inventoryItemId || refillMutation.isPending}
                          isLoading={busy}
                          onClick={() => refillMutation.mutate(row)}
                        >
                          Refill +{REFILL_AMOUNT}
                        </Button>
                        <Link to={`/products/${row.productId}/edit`}>
                          <Button size="small" variant="primary" type="button">
                            Re-order
                          </Button>
                        </Link>
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
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.after",
  id: "flowcase:product-alerts",
})

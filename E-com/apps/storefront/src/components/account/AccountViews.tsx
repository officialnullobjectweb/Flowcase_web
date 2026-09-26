"use client"

import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { formatDate, formatPrice } from "@/lib/format"
import {
  getMyOrder,
  listMyOrders,
  ordersAuthHeader,
  type OrderDetail,
  type OrderListItem,
} from "@/lib/orders"
import { Dialog } from "@/components/ui/dialog"
import { AnimatedCross } from "@/components/OrderAnimations"
import { OrderTracker } from "@/components/OrderTracker"

export function OrderStatusRow({ order }: { order: OrderListItem }) {
  const payment =
    order.payment_status === "captured" || order.payment_status === "authorized"
      ? "Paid"
      : order.payment_status
        ? order.payment_status.replace(/_/g, " ")
        : null
  const fulfillment = order.fulfillment_status
    ? order.fulfillment_status.replace(/_/g, " ")
    : null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {payment && (
        <span
          className={`label ${payment === "Paid" ? "text-success" : "text-muted-foreground"}`}
        >
          {payment}
        </span>
      )}
      {fulfillment && <span className="label text-muted-foreground">{fulfillment}</span>}
      <span className="label text-muted-foreground">
        {order.status ? order.status.replace(/_/g, " ") : ""}
      </span>
    </div>
  )
}

export function OrderHistory() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listMyOrders()
      .then((result) => {
        if (!cancelled) setOrders(result)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load orders")
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <p className="label text-muted-foreground">Loading…</p>
  }

  if (!user) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="display-tight font-display text-lg font-semibold">
          Sign in to see your orders.
        </p>
        <Link
          href="/account/login?next=/account/orders"
          className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
        >
          Sign in
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <p role="alert" className="label border border-danger px-4 py-3 text-danger">
        {error}
      </p>
    )
  }

  if (orders === null) {
    return <p className="label text-muted-foreground">Loading orders…</p>
  }

  if (orders.length === 0) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="display-tight font-display text-lg font-semibold">
          No orders yet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          When you place one, it'll show up here with live status.
        </p>
        <Link
          href="/shop"
          className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
        >
          Browse cases
        </Link>
      </div>
    )
  }

  return (
    <ul className="border-t border-border">
      {orders.map((order) => (
        <li key={order.id} className="border-b border-border">
          <Link
            href={`/account/orders/${order.id}`}
            className="flex flex-col gap-2 py-5 transition hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:px-3"
          >
            <div>
              <p className="label text-muted-foreground">
                Order #{order.display_id ?? "—"} · {formatDate(order.created_at)}
                {order.summary?.item_count
                  ? ` · ${order.summary.item_count} item${order.summary.item_count === 1 ? "" : "s"}`
                  : ""}
              </p>
              <div className="mt-1.5">
                <OrderStatusRow order={order} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="display-tight font-display font-bold">
                {formatPrice(order.total, order.currency_code)}
              </span>
              <span className="label text-muted-foreground">Details →</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [justCancelled, setJustCancelled] = useState(false)

  const confirmCancel = async () => {
    if (!order) return
    setCancelling(true)
    setCancelError(null)
    try {
      const auth = await ordersAuthHeader()
      if (!auth) throw new Error("Sign in to cancel this order.")
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not cancel this order")
      setShowCancel(false)
      setJustCancelled(true)
      setOrder(await getMyOrder(orderId))
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Could not cancel this order")
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getMyOrder(orderId)
      .then((result) => {
        if (!cancelled) setOrder(result)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Order not found")
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (error) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="display-tight font-display text-lg font-semibold">
          We couldn't find that order.
        </p>
        <Link
          href="/account/orders"
          className="label mt-5 inline-flex border-b border-foreground pb-1"
        >
          ← Back to orders
        </Link>
      </div>
    )
  }

  if (!order) {
    return <p className="label text-muted-foreground">Loading order…</p>
  }

  const address = order.shipping_address
  const items = order.items ?? []

  const fulfillment = order.fulfillment_status ?? ""
  const cancelled =
    order.status === "canceled" ||
    order.status === "returned" ||
    order.payment_status === "canceled" ||
    order.payment_status === "refunded"
  const baseStage = cancelled
    ? 1
    : fulfillment === "delivered"
      ? 5
      : fulfillment === "shipped" || fulfillment === "partially_shipped"
        ? 3
        : fulfillment === "fulfilled" ||
            fulfillment === "partially_fulfilled" ||
            fulfillment === "in_progress"
          ? 2
          : 1
  const canCancel =
    !cancelled &&
    fulfillment !== "shipped" &&
    fulfillment !== "partially_shipped" &&
    fulfillment !== "delivered"

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-muted-foreground">
            Placed {formatDate(order.created_at)} ·{" "}
            {order.payment_status?.replace(/_/g, " ") ?? "status n/a"}
          </p>
          <h1 className="display-tight mt-2 font-display text-3xl font-bold sm:text-4xl">
            Order #{order.display_id ?? "—"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {canCancel && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null)
                setShowCancel(true)
              }}
              className="label rounded-full border border-danger px-4 py-2 text-danger transition hover:bg-danger hover:text-white"
            >
              Cancel order
            </button>
          )}
          <Link
            href="/account/orders"
            className="label text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            ← All orders
          </Link>
        </div>
      </div>

      {/* Cancel confirmation */}
      <Dialog
        open={showCancel}
        onClose={() => {
          setShowCancel(false)
          setCancelError(null)
        }}
        title="Cancel this order?"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCancel(false)
                setCancelError(null)
              }}
              className="label rounded-full border border-border px-5 py-2.5 transition hover:border-foreground"
            >
              Keep order
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={confirmCancel}
              className="label rounded-full bg-danger px-5 py-2.5 text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {cancelling ? "Cancelling…" : "Yes, cancel it"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Order #{order.display_id ?? "—"} will be cancelled right away. Any online
          payment is refunded to the original method within 3–5 working days. This
          can&apos;t be undone.
        </p>
        {cancelError && (
          <p className="label mt-3 text-red-600" role="alert">
            {cancelError}
          </p>
        )}
      </Dialog>

      {/* Cancelled overlay — animated cross */}
      <AnimatePresence>
        {justCancelled && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="alertdialog"
              aria-label="Order cancelled"
              initial={{ scale: 0.9, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm border border-border bg-background p-8 text-center"
            >
              <AnimatedCross className="h-16 w-16" />
              <p className="label mt-6 text-danger">Order cancelled</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Order #{order.display_id ?? "—"} is cancelled. Refunds, if any, land
                in 3–5 working days.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setJustCancelled(false)}
                  className="label rounded-full bg-primary px-6 py-3 text-primary-foreground transition hover:bg-primary/85"
                >
                  Done
                </button>
                <Link
                  href="/account/orders"
                  onClick={() => setJustCancelled(false)}
                  className="label rounded-full border border-border px-6 py-3 transition hover:border-foreground"
                >
                  All orders
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <OrderTracker
        stage={baseStage}
        failedAt={cancelled ? baseStage : null}
        placedAt={order.created_at}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="label text-muted-foreground">Items</p>
          <ul className="mt-4 border-t border-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 border-b border-border py-4"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden border border-border bg-muted">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title ?? "Item"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.variant_title && (
                    <p className="label mt-1 text-muted-foreground">
                      {item.variant_title}
                    </p>
                  )}
                  <p className="label mt-1 text-muted-foreground">
                    Qty {item.quantity}
                  </p>
                </div>
                <span className="font-semibold">
                  {formatPrice(item.subtotal ?? item.total, order.currency_code)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotal, order.currency_code)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatPrice(order.shipping_total, order.currency_code)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd>{formatPrice(order.tax_total, order.currency_code)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="display-tight font-display font-bold">
                {formatPrice(order.total, order.currency_code)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="border border-border p-5">
            <p className="label text-muted-foreground">Shipping to</p>
            {address ? (
              <address className="mt-3 space-y-1 text-sm not-italic">
                <p className="font-semibold">
                  {address.first_name} {address.last_name}
                </p>
                <p>{address.address_1}</p>
                {address.address_2 && <p>{address.address_2}</p>}
                <p>
                  {address.city}
                  {address.province ? `, ${address.province}` : ""}{" "}
                  {address.postal_code}
                </p>
                <p>{address.country_code?.toUpperCase()}</p>
                {address.phone && <p>{address.phone}</p>}
              </address>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">—</p>
            )}
          </div>
          <div className="border border-border p-5">
            <p className="label text-muted-foreground">Confirmation sent to</p>
            <p className="mt-3 break-all text-sm">{order.email ?? "—"}</p>
          </div>
          <Link
            href="/contact"
            className="label flex h-11 items-center justify-center rounded-full border border-border transition hover:border-foreground"
          >
            Need help with this order?
          </Link>
        </div>
      </div>
    </div>
  )
}

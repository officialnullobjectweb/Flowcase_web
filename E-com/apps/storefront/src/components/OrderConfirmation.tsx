"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatPrice } from "@/lib/format"
import { OrderTracker } from "@/components/OrderTracker"
import { Confetti } from "@/components/Confetti"
import {
  AnimatedCheck,
  EtaTimeline,
  PackagingScene,
  VanScene,
} from "@/components/OrderAnimations"

interface LastOrder {
  display_id: number | null
  orderId?: string | null
  email: string
  items: { title: string; variantTitle?: string | null; quantity: number; unitPrice: number; currency: string }[]
  total: number
  currency: string
  payment: string
  placedAt: string
}

function readLastOrder(): LastOrder | null {
  try {
    const raw = sessionStorage.getItem("flowcase_last_order")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as LastOrder) : null
  } catch {
    return null
  }
}

export function OrderConfirmation({ displayId, orderId }: { displayId: string | null; orderId?: string | null }) {
  const [order, setOrder] = useState<LastOrder | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setOrder(readLastOrder())
    setReady(true)
  }, [])

  const id = displayId ?? (order?.display_id ? String(order.display_id) : null) ?? (orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : null)

  return (
    <>
      <Confetti />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="text-center">
        <AnimatedCheck className="h-14 w-14" />
        <p className="label mt-6 text-muted-foreground">Order confirmed</p>
        <h1 className="display-tight mt-3 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
          {id ? <>Order #{id} is placed.</> : "Your order is placed."}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
          {ready && order?.email
            ? `A confirmation is on its way to ${order.email}.`
            : "A confirmation email is on its way."}
        </p>
      </div>

      {ready && (
        <div className="mt-10 space-y-4">
          <EtaTimeline placedAt={order?.placedAt} />
          <OrderTracker stage={0} placedAt={order?.placedAt} />
        </div>
      )}

      {/* Packaging → van journey, animated */}
      <div className="mt-8 grid gap-8 border border-border p-6 sm:grid-cols-2 sm:p-8">
        <PackagingScene />
        <VanScene />
      </div>

      <div className="mt-8 border border-border">
        <div className="border-b border-border px-6 py-4">
          <p className="label text-muted-foreground">What happens next</p>
        </div>
        <ul className="divide-y divide-border text-sm">
          <li className="flex gap-4 px-6 py-4">
            <span className="label w-16 shrink-0 text-muted-foreground">01</span>
            <p>We pack your case and dispatch within 48 hours.</p>
          </li>
          <li className="flex gap-4 px-6 py-4">
            <span className="label w-16 shrink-0 text-muted-foreground">02</span>
            <p>Tracking lands in your inbox — deliveries take 3–6 days pan-India.</p>
          </li>
          <li className="flex gap-4 px-6 py-4">
            <span className="label w-16 shrink-0 text-muted-foreground">03</span>
            <p>Changed your mind? You have 7 days to send it back.</p>
          </li>
        </ul>
      </div>

      {ready && order && order.items?.length > 0 && (
        <div className="mt-8 border border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <p className="label text-muted-foreground">Order summary</p>
            <p className="label text-muted-foreground">
              {order.payment === "razorpay" ? "Paid online" : "Cash on delivery"}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                <span className="min-w-0">
                  {item.title}
                  {item.variantTitle ? ` (${item.variantTitle})` : ""}{" "}
                  <span className="text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="font-semibold">
                  {formatPrice(item.unitPrice * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <span className="label text-muted-foreground">Total</span>
            <span className="display-tight font-display text-lg font-bold">
              {formatPrice(order.total, order.currency)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/account/orders"
          className="label inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-primary-foreground transition hover:bg-primary/85"
        >
          Track your orders
        </Link>
        <Link
          href="/shop"
          className="label inline-flex h-12 items-center justify-center rounded-full border border-border px-8 transition hover:border-foreground"
        >
          Continue shopping
        </Link>
      </div>
      </div>
    </>
  )
}

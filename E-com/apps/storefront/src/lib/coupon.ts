/**
 * Checkout-side coupon preview helpers. The worker's order-create eval is
 * authoritative — these only mirror it so the order summary shows the real
 * number before the customer pays.
 */

export interface CouponInfo {
  valid: boolean
  reason: string
  type: "percent" | "fixed" | "free_shipping" | "bogo"
  percent: number
  amount: number
  maxDiscount: number
  minSubtotal: number
  bogoBuyQty: number
  bogoGetQty: number
}

/** null = network failure (unknown); otherwise a definite valid/invalid answer. */
export async function fetchCoupon(
  code: string,
  subtotal?: number,
  shipping?: number
): Promise<CouponInfo | null> {
  try {
    const q = new URLSearchParams({ code })
    if (subtotal && subtotal > 0) q.set("subtotal", String(Math.round(subtotal)))
    if (shipping && shipping > 0) q.set("shipping", String(Math.round(shipping)))
    const res = await fetch(`/api/coupons/validate?${q}`)
    const d = (await res.json()) as Record<string, unknown>
    if (typeof d.valid !== "boolean") return null
    return {
      valid: d.valid,
      reason: String(d.reason ?? ""),
      type: (d.type as CouponInfo["type"]) || "percent",
      percent: Number(d.percent ?? 0),
      amount: Number(d.amount ?? 0),
      maxDiscount: Number(d.max_discount ?? 0),
      minSubtotal: Number(d.min_subtotal ?? 0),
      bogoBuyQty: Number(d.bogo_buy_qty ?? 2),
      bogoGetQty: Number(d.bogo_get_qty ?? 1),
    }
  } catch {
    return null
  }
}

export function couponLabel(c: CouponInfo, format: (n: number) => string): string {
  if (c.type === "percent") return `${c.percent}% off`
  if (c.type === "fixed") return `${format(c.amount)} off`
  if (c.type === "free_shipping") return "Free shipping"
  return `Buy ${c.bogoBuyQty} get ${c.bogoGetQty}`
}

/** Mirrors the worker's evalCoupon for a known cart. `unitPrices` = one entry per unit. */
export function couponDiscount(
  c: CouponInfo,
  subtotal: number,
  shipping: number,
  unitPrices: number[]
): number {
  let d = 0
  if (c.type === "percent") d = Math.round(((subtotal + shipping) * c.percent) / 100)
  else if (c.type === "fixed") d = Math.min(c.amount, subtotal)
  else if (c.type === "free_shipping") d = shipping
  else {
    // ponytail: previews every cart unit — the server re-checks product/category scope.
    const free = Math.floor(unitPrices.length / Math.max(1, c.bogoBuyQty)) * c.bogoGetQty
    d = [...unitPrices]
      .sort((a, b) => a - b)
      .slice(0, free)
      .reduce((s, p) => s + p, 0)
  }
  if (c.maxDiscount > 0) d = Math.min(d, c.maxDiscount)
  return Math.max(0, Math.min(d, subtotal + shipping))
}

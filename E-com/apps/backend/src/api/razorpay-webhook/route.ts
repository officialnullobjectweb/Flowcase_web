import { createHmac, timingSafeEqual } from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { logPayment } from "../../lib/cms"

/**
 * Razorpay webhook — verifies x-razorpay-signature over the raw body and
 * records success/failure events so the admin CMS panel can surface them.
 * Configure in Razorpay Dashboard → Settings → Webhooks:
 *   URL    http://localhost:9000/store/razorpay-webhook
 *   Secret RAZORPAY_WEBHOOK_SECRET (falls back to RAZORPAY_KEY_SECRET)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET
  const signature = String(req.headers["x-razorpay-signature"] || "")

  if (!secret || !signature) {
    return res.status(400).json({ error: "Missing webhook secret or signature" })
  }

  const raw = req.rawBody ?? JSON.stringify(req.body ?? {})
  const rawBuf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw))
  const expected = createHmac("sha256", secret).update(rawBuf).digest()
  const received = Buffer.from(signature, "hex")
  const valid =
    received.length === expected.length && timingSafeEqual(received, expected)

  if (!valid) {
    return res.status(400).json({ error: "Invalid signature" })
  }

  const event = (req.body ?? {}) as {
    event?: string
    payload?: { payment?: { entity?: Record<string, unknown> } }
  }
  const type = String(event.event || "")
  const entity = event.payload?.payment?.entity ?? {}

  let status: "success" | "failed" | null = null
  if (type === "payment.captured" || type === "order.paid") status = "success"
  else if (type === "payment.failed") status = "failed"

  if (status) {
    const amount = entity.amount
    logPayment({
      event: type,
      status,
      order_id: (entity.order_id as string) ?? null,
      payment_id: (entity.id as string) ?? null,
      amount: typeof amount === "number" ? amount / 100 : null,
      method: (entity.method as string) ?? null,
    })
  }

  res.json({ received: true })
}

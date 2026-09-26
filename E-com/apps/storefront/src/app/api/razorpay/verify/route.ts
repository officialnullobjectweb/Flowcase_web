import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    return NextResponse.json(
      { error: "Razorpay is not configured on the server" },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }

    if (
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Missing payment fields" },
        { status: 400 }
      )
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
      .digest("hex")

    const expectedBuf = Buffer.from(expected, "utf8")
    const receivedBuf = Buffer.from(body.razorpay_signature, "utf8")

    const valid =
      expectedBuf.length === receivedBuf.length &&
      timingSafeEqual(expectedBuf, receivedBuf)

    if (!valid) {
      return NextResponse.json(
        { error: "Signature verification failed" },
        { status: 400 }
      )
    }

    // Record the payment in the admin CMS payments log (best-effort).
    // Signed with the shared secret so the backend webhook accepts it.
    try {
      const backend =
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
        process.env.MEDUSA_BACKEND_URL ??
        "http://localhost:9000"
      const event = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: body.razorpay_payment_id,
              order_id: body.razorpay_order_id,
              method: "checkout",
            },
          },
        },
      })
      const signature = createHmac("sha256", keySecret)
        .update(event)
        .digest("hex")
      void fetch(`${backend}/razorpay-webhook`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: event,
      }).catch(() => {})
    } catch {
      // never fail verification because of logging
    }

    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}

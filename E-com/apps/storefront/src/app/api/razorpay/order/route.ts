import { NextResponse } from "next/server"

const RAZORPAY_API = "https://api.razorpay.com/v1/orders"

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay is not configured on the server" },
      { status: 503 }
    )
  }

  try {
    const body = (await request.json()) as {
      amount: number
      currency?: string
      receipt?: string
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      )
    }

    const amountPaise = Math.round(body.amount * 100)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")

    const response = await fetch(RAZORPAY_API, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: (body.currency ?? "INR").toUpperCase(),
        receipt: body.receipt ?? `fc_${Date.now()}`,
      }),
    })

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: { description?: string } }
        | null
      return NextResponse.json(
        { error: errorBody?.error?.description ?? "Razorpay order failed" },
        { status: response.status }
      )
    }

    const order = (await response.json()) as { id: string; amount: number; currency: string }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch {
    return NextResponse.json(
      { error: "Could not create payment order" },
      { status: 500 }
    )
  }
}

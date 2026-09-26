export interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, cb: (response: unknown) => void) => void
    }
  }
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpay(options: {
  amount: number
  currency: string
  orderId: string
  name: string
  description?: string
  email?: string
  contact?: string
}): Promise<RazorpaySuccess> {
  const loaded = await loadRazorpayScript()
  if (!loaded || !window.Razorpay) {
    throw new Error("Could not load Razorpay checkout")
  }
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error("Razorpay is not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID)")
  }

  return new Promise((resolve, reject) => {
    const RazorpayCtor = window.Razorpay
    if (!RazorpayCtor) {
      reject(new Error("Razorpay checkout script not loaded"))
      return
    }
    const rzp = new RazorpayCtor({
      key: keyId,
      amount: options.amount,
      currency: options.currency,
      order_id: options.orderId,
      name: options.name,
      description: options.description,
      prefill: {
        email: options.email,
        contact: options.contact,
      },
      theme: { color: "#18181b" },
      handler: (response: unknown) => {
        resolve(response as RazorpaySuccess)
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    })
    rzp.on("payment.failed", (response: unknown) => {
      const message =
        (response as { error?: { description?: string } })?.error
          ?.description ?? "Payment failed"
      reject(new Error(message))
    })
    rzp.open()
  })
}

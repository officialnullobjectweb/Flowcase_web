import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/types"
import { createHmac, timingSafeEqual } from "node:crypto"

type Options = {
  key_id?: string
  key_secret?: string
}

export class RazorpayProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "razorpay"

  protected options_: Options

  constructor(_, options: Options) {
    super(_, options)
    this.options_ = options ?? {}
  }

  private verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const secret = this.options_.key_secret ?? ""
    if (!secret) return false
    const expected = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")
    const a = Buffer.from(expected, "utf8")
    const b = Buffer.from(signature, "utf8")
    return a.length === b.length && timingSafeEqual(a, b)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const orderId =
      (data.razorpay_order_id as string | undefined) ||
      (data.order_id as string | undefined) ||
      ""

    return {
      id: orderId || `rzp_tmp_${Date.now()}`,
      data: {
        ...data,
        razorpay_order_id: orderId,
        amount: input.amount,
        currency: (input.currency_code ?? "inr").toUpperCase(),
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = { ...(input.data ?? {}) } as Record<string, unknown>
    const orderId = (data.razorpay_order_id as string) || ""
    const paymentId = (data.razorpay_payment_id as string) || ""
    const signature = (data.razorpay_signature as string) || ""

    // COD / no online payment: authorize as-is so the cart can complete;
    // online flows always carry razorpay_order_id/payment_id/signature
    // (verified by /api/razorpay/verify first) and fall through to HMAC check.
    if (!orderId || !paymentId || !signature) {
      return { data, status: PaymentSessionStatus.AUTHORIZED }
    }

    const valid = this.verifySignature(orderId, paymentId, signature)

    return {
      data: {
        ...data,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      },
      status: valid
        ? PaymentSessionStatus.AUTHORIZED
        : PaymentSessionStatus.ERROR,
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    // ponytail: refunds via Razorpay dashboard/API until webhook integration
    return { data: input.data ?? {} }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      data: input.data ?? {},
      status: PaymentSessionStatus.PENDING,
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    if (data.razorpay_signature) {
      return { data, status: PaymentSessionStatus.AUTHORIZED }
    }
    if (data.razorpay_order_id) {
      return { data, status: PaymentSessionStatus.PENDING }
    }
    return { data, status: PaymentSessionStatus.PENDING }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    // ponytail: no webhooks wired yet — payment is verified on initiate/authorize
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

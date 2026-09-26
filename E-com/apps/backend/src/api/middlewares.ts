import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares([
  {
    matcher: "/razorpay-webhook",
    methods: ["POST"],
    // HMAC verification needs the exact bytes Razorpay signed.
    bodyParser: { preserveRawBody: true },
  },
])

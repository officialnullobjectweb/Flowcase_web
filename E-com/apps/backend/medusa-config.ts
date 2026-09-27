import path from "node:path"
import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { config as loadDotenv } from "dotenv"

loadEnv(process.env.NODE_ENV || "development", process.cwd())
// .env = production values (the copy-source for Render); local dev overrides
// live in .env.local. No .env.local on Render → silent no-op.
loadDotenv({ path: path.join(process.cwd(), ".env.local"), override: true })

// Redis is DISABLED: this stack is free-tier only — Upstash free = 500k
// requests/month and it's exhausted, and a quota-dead endpoint makes ioredis
// retry-storm until the 512MB Render instance OOMs. Medusa runs on its
// in-memory cache/events/workflows defaults (single instance needs no Redis).
// To re-enable later: paid Upstash/Redis → restore the cache-redis,
// event-bus-redis, workflow-engine-redis and locking modules below.

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "https://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "https://localhost:7001",
      authCors: process.env.AUTH_CORS || "https://localhost:7001",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "./src/modules/cloudinary",
            id: "cloudinary",
            options: {
              cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
              api_key: process.env.CLOUDINARY_API_KEY,
              api_secret: process.env.CLOUDINARY_API_SECRET,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/razorpay",
            id: "default",
            options: {
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
            },
          },
        ],
      },
    },
  ],
})

import path from "node:path"
import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { config as loadDotenv } from "dotenv"

loadEnv(process.env.NODE_ENV || "development", process.cwd())
// .env = production values (the copy-source for Render); local dev overrides
// live in .env.local. No .env.local on Render → silent no-op.
loadDotenv({ path: path.join(process.cwd(), ".env.local"), override: true })

// Redis (Upstash) — activates cache / events / workflows / locking on Redis.
// Without REDIS_URL the spread collapses to [] and Medusa uses its local defaults.
// GATE (Sep-27 Render outage): only rediss:// TCP URLs activate Redis. A pasted
// Upstash REST URL (https://) or a quota-exhausted endpoint made ioredis
// retry-storm until the 512MB instance OOM'd — such values are now ignored with
// a warning and the app runs on in-memory defaults instead of crashing.
const rawRedis = (process.env.REDIS_URL ?? "").trim()
const redisUrl = /^rediss?:\/\//.test(rawRedis) ? rawRedis : undefined
if (process.env.REDIS_URL && !redisUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "[medusa-config] ignoring REDIS_URL (expected rediss://) — running without Redis"
  )
}

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: redisUrl,
    http: {
      storeCors: process.env.STORE_CORS || "https://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "https://localhost:7001",
      authCors: process.env.AUTH_CORS || "https://localhost:7001",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    ...(redisUrl
      ? [
          { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl } },
          { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: { redis: { redisUrl } },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "redis",
                  options: { redisUrl },
                },
              ],
            },
          },
        ]
      : []),
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

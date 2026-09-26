import path from "node:path"
import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { config as loadDotenv } from "dotenv"

loadEnv(process.env.NODE_ENV || "development", process.cwd())
// .env = production values (the copy-source for Render); local dev overrides
// live in .env.local. No .env.local on Render → silent no-op.
loadDotenv({ path: path.join(process.cwd(), ".env.local"), override: true })

// Redis (Upstash) — activates cache / events / workflows / locking on Redis.
// Without REDIS_URL the spread collapses to [] and Medusa uses its local defaults.
const redisUrl = process.env.REDIS_URL

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
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

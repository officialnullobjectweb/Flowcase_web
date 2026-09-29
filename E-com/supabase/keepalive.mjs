#!/usr/bin/env node
/**
 * keepalive.mjs — ping every free-tier service so none idle out.
 *
 *   Supabase (free):   paused after 7 days with no database activity
 *                      → real `SELECT 1` over the Postgres wire always counts.
 *   Worker (free):     Cloudflare Workers never sleep — the ping doubles as uptime monitoring.
 *   Storefront:        GET <STORE_URL>/ keeps it warm too (optional).
 *
 * Env:
 *   SUPABASE_DB_URL   supabase pooler/direct postgres URL (@ and # percent-encoded)
 *   WORKER_URL        e.g. https://flowcase-api.<sub>.workers.dev
 *   STORE_URL         e.g. https://flowcase.in
 *
 * Usage:  node scripts/keepalive.mjs        (exit 1 if any pinged service fails)
 * CI:     .github/workflows/keepalive.yml   (daily cron, values from repo secrets)
 */

import pg from "pg"

// Local runs read backend/.env; CI passes everything via the environment.
try {
  process.loadEnvFile(".env")
} catch {
  /* no .env (CI) */
}

const attempts = []

async function check(name, fn) {
  try {
    const note = await fn()
    attempts.push({ name, ok: true, note: note ?? "ok" })
  } catch (e) {
    attempts.push({ name, ok: false, note: String(e?.message ?? e).slice(0, 140) })
  }
}

async function pingSupabase() {
  const url = process.env.SUPABASE_DB_URL
  if (!url) return "skipped (SUPABASE_DB_URL not set)"
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 20000,
    // Supabase pooler certs are not always in Node's default CA store
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query("select 1")
  await client.end()
  return "select 1 ok"
}

async function pingHttp(name, envName, path = "/") {
  const base = process.env[envName]
  if (!base) return `skipped (${envName} not set)`
  const res = await fetch(base.replace(/\/$/, "") + path, {
    signal: AbortSignal.timeout(30000),
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return `HTTP ${res.status}`
}

await check("supabase-db", pingSupabase)
await check("worker", () => pingHttp("worker", "WORKER_URL", "/health"))
await check("storefront", () => pingHttp("storefront", "STORE_URL", "/"))

for (const a of attempts) {
  const tag = a.ok ? (a.note.startsWith("skipped") ? "SKIP" : "PASS") : "FAIL"
  console.log(`${tag}  ${a.name} — ${a.note}`)
}

process.exit(attempts.some((a) => !a.ok) ? 1 : 0)

/**
 * Apply schema .sql files to the live Supabase DB (via the pooler URL).
 * Files are idempotent; each file runs as one transaction (rolls back on error).
 *
 * Usage (from anywhere):  node supabase/runsql.mjs schema-08.sql [more.sql ...]
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { Client } = require("pg")

const HERE = dirname(fileURLToPath(import.meta.url))
const envFile = (p) =>
  Object.fromEntries(
    readFileSync(p, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)] })
  )
const env = envFile(resolve(HERE, "../apps/storefront/.env"))

const files = process.argv.slice(2)
if (!files.length) { console.error("usage: node runsql.mjs schema-08.sql ..."); process.exit(1) }

const db = new Client({ connectionString: env.SUPABASE_DB_POOLER_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
for (const f of files) {
  const sql = readFileSync(resolve(HERE, f), "utf8")
  const t = Date.now()
  try {
    await db.query(sql)
    console.log(`OK   ${f} (${Date.now() - t}ms)`)
  } catch (e) {
    console.error(`FAIL ${f}: ${e.message}`)
    await db.end()
    process.exit(1)
  }
}
await db.end()

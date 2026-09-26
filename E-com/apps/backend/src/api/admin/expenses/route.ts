import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

/**
 * Business expenses for the Reports page. Lives in Postgres (the same
 * DATABASE_URL Medusa uses) so it survives redeploys — no fs-JSON here.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL ?? "").includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
  max: 4,
})

let ready: Promise<void> | null = null
function ensureTable(): Promise<void> {
  ready ??= pool.query(`
    CREATE TABLE IF NOT EXISTS app_expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      spent_on date NOT NULL DEFAULT CURRENT_DATE,
      category text NOT NULL DEFAULT 'other',
      note text NOT NULL DEFAULT '',
      amount integer NOT NULL CHECK (amount > 0),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `).then(() => {})
  return ready
}

const SELECT = `
  SELECT id, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, category, note,
         amount, created_at
  FROM app_expenses
`

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  await ensureTable()
  const { rows } = await pool.query(
    `${SELECT} ORDER BY spent_on DESC, created_at DESC LIMIT 500`
  )
  res.setHeader("Cache-Control", "no-store")
  res.json({ expenses: rows })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const amount = Number(body.amount)
  const category = String(body.category ?? "other").trim().slice(0, 40) || "other"
  const note = String(body.note ?? "").trim().slice(0, 200)
  const spentOn = String(body.spent_on ?? "").trim() || todayISO()

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ message: "amount must be a positive whole number" })
    return
  }
  if (!DATE_RE.test(spentOn) || Number.isNaN(Date.parse(spentOn))) {
    res.status(400).json({ message: "spent_on must be YYYY-MM-DD" })
    return
  }

  await ensureTable()
  const { rows } = await pool.query(
    `INSERT INTO app_expenses (spent_on, category, note, amount)
     VALUES ($1, $2, $3, $4)
     RETURNING id, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, category, note, amount, created_at`,
    [spentOn, category, note, amount]
  )
  res.status(201).json({ expense: rows[0] })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = String((req.query as Record<string, unknown>).id ?? "")
  if (!UUID_RE.test(id)) {
    res.status(400).json({ message: "id must be a uuid" })
    return
  }
  await ensureTable()
  const { rowCount } = await pool.query(`DELETE FROM app_expenses WHERE id = $1`, [id])
  res.json({ deleted: rowCount ?? 0 })
}

function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

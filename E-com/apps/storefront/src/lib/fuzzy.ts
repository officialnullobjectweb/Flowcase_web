/**
 * Tiny fuzzy scorer — good enough for product titles, zero deps.
 * Score: substring bonus + subsequence match with gap penalty + token hits.
 * Brand words are aliased so "apple 15" finds iPhone 15 and "samsung"
 * finds Galaxy; `tolerant` adds nearest-number matching ("35" → "36").
 */
const ALIASES: Record<string, string> = { apple: "iphone", samsung: "galaxy" }

const normalize = (q: string) =>
  q
    .toLowerCase()
    .trim()
    .replace(/\b(apple|samsung)\b/g, (w) => ALIASES[w] ?? w)

export function fuzzyScore(query: string, text: string, tolerant = false): number {
  const q = normalize(query)
  const t = text.toLowerCase()
  if (!q || !t) return 0

  if (t.includes(q)) return 100 - Math.max(0, t.indexOf(q))

  // token: every query word should appear (fuzzily) in the title
  const tokens = q.split(/\s+/)
  if (tokens.length > 1) {
    let tokenScore = 0
    for (const token of tokens) {
      if (t.includes(token)) tokenScore += 14
      else if (close(token, t, tolerant)) tokenScore += 8
      else if (!/^\d+$/.test(token) && subsequence(token, t)) tokenScore += 6
      else return 0
    }
    return tokenScore
  }

  // digits match number runs exactly (nearest-number only via `tolerant`)
  if (/^\d+$/.test(q)) return close(q, t, tolerant) ? 36 : 0
  if (subsequence(q, t)) return 40
  if (close(q, t, tolerant)) return 36
  return 0
}

/** typo tolerance: within-1 edit against any word (covers "galaxi" → "galaxy") */
function close(q: string, t: string, tolerant = false): boolean {
  if (t.includes(q)) return true
  if (/^\d+$/.test(q)) {
    const nums: string[] = t.match(/\d+/g) ?? []
    if (nums.includes(q)) return true
    // nearest-number ("35" → "36"/"25") only in the tolerant pass, so
    // "iphone 15" stays precise instead of dragging in 16/17
    if (tolerant)
      for (const n of nums)
        if (Math.abs(n.length - q.length) <= 1 && levenshtein(q, n) <= 1)
          return true
    return false
  }
  const stem = q.slice(0, Math.max(1, q.length - 1))
  for (const w of t.split(/[^a-z0-9]+/)) {
    if (!w) continue
    if (w.startsWith(stem)) return true
    if (Math.abs(w.length - q.length) <= 1 && levenshtein(q, w) <= 1) return true
  }
  return false
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
    prev = cur
  }
  return prev[b.length]
}

/** loose per-token: allows 1 edit (prefix of edit distance) via band scan */
function subsequence(q: string, t: string): boolean {
  let i = 0
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (q[i] === t[j]) i++
  }
  return i === q.length
}

export interface FuzzyItem {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
}

export function fuzzyRank<T extends FuzzyItem>(
  query: string,
  items: T[],
  limit = 5
): T[] {
  const rank = (tolerant: boolean) =>
    items
      .map((item) => ({ item, score: fuzzyScore(query, item.title, tolerant) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.item)
  // strict first; only fall back to nearest-number when nothing exact-ish hits
  const strict = rank(false)
  return strict.length ? strict : rank(true)
}

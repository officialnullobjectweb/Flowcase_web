export function formatPrice(
  amount: number | null | undefined,
  currencyCode = "usd"
): string {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "—"
  }
  const code = (currencyCode || "usd").toUpperCase()
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(Number(amount))
  } catch {
    return `${code} ${Number(amount).toFixed(2)}`
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

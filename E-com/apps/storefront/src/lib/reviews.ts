export interface MetadataReview {
  name: string
  title: string
  body: string
  rating: number
  avatar: string
  image: string
}

/**
 * Reviews stored on the product in Medusa admin (Products → Metadata):
 * r1_name / r1_title / r1_body / r1_rating / r1_avatar … through r3.
 * Falls back to an empty array when nothing is stamped.
 */
export function metadataReviews(
  meta: Record<string, string | number | null> | null | undefined
): MetadataReview[] {
  const m = meta ?? {}
  const out: MetadataReview[] = []
  for (const i of ["1", "2", "3"]) {
    const name = m[`r${i}_name`]
    const body = m[`r${i}_body`]
    if (!name || !body) continue
    out.push({
      name: String(name),
      title: String(m[`r${i}_title`] ?? ""),
      body: String(body),
      rating: Number(m[`r${i}_rating`] ?? 0) || Number(m.rating ?? 5) || 5,
      avatar: m[`r${i}_avatar`] ? String(m[`r${i}_avatar`]) : "",
      image: m[`r${i}_image`] ? String(m[`r${i}_image`]) : "",
    })
  }
  return out
}

import { Star } from "lucide-react"

/** Monochrome rating stars — supports half steps via clipped overlay. */
export function Stars({
  rating,
  size = 14,
  className = "",
}: {
  rating: number
  size?: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(5, rating))
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i))
        return (
          <span key={i} className="relative inline-block" aria-hidden="true">
            <Star
              width={size}
              height={size}
              className="text-border"
              strokeWidth={1.5}
            />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                width={size}
                height={size}
                className="fill-foreground text-foreground"
                strokeWidth={1.5}
              />
            </span>
          </span>
        )
      })}
    </span>
  )
}

import { cn } from "@/lib/utils"

/**
 * Compact editorial page header: mono eyebrow + display title + description.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  align?: "left" | "center"
  className?: string
}) {
  return (
    <header
      className={cn(
        "border-b border-border px-4 py-14 sm:px-6 sm:py-20",
        align === "center" ? "text-center" : "text-center lg:text-left",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-3xl",
          align === "center" && "mx-auto"
        )}
      >
        {eyebrow && <p className="label text-muted-foreground">{eyebrow}</p>}
        <h1 className="display-tight mt-4 font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg",
              align === "left" && "lg:mx-0"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </header>
  )
}

import Link from "next/link"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  index?: string
  label: string
  title: React.ReactNode
  description?: string
  link?: { href: string; label: string }
  className?: string
}

/**
 * Editorial section header: mono index + label, display title, hairline rule.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  link,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("border-t border-border pt-6", className)}>
      <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-end lg:justify-between lg:text-left">
        <div className="max-w-2xl">
          <p className="label text-muted-foreground">
            {index && <span className="text-foreground">{index} — </span>}
            {label}
          </p>
          <h2 className="display-tight mt-3 font-display text-3xl font-bold leading-[1.05] sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
              {description}
            </p>
          )}
        </div>
        {link && (
          <Link
            href={link.href}
            className="label shrink-0 border-b border-foreground pb-1 text-foreground transition hover:border-muted-foreground hover:text-muted-foreground"
          >
            {link.label} →
          </Link>
        )}
      </div>
    </div>
  )
}

import Link from "next/link"
import { cn } from "@/lib/utils"

export interface Crumb {
  href?: string
  label: string
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[]
  className?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("label text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="transition hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

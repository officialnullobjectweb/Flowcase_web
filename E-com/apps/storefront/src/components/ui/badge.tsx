import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "label inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

export function SaleBadge({ percent }: { percent: number }) {
  return (
    <span className="label bg-foreground px-2 py-1 text-white">
      −{percent}%
    </span>
  )
}

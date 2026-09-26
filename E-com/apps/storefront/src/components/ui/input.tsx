import { cn } from "@/lib/utils"
import type { InputHTMLAttributes } from "react"

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "mt-2 h-11 w-full border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
      {...props}
    />
  )
}

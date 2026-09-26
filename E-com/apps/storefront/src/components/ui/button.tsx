import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "label inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline: "border border-border text-foreground hover:border-foreground",
        ghost: "text-foreground hover:bg-muted",
        signal: "bg-signal text-white hover:bg-signal/90",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-12 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

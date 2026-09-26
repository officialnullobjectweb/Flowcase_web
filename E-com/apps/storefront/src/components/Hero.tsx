import Link from "next/link"
import { cn } from "@/lib/utils"

type HeroVariant = "ink" | "paper" | "split"

interface HeroCta {
  href: string
  label: string
  variant?: "solid" | "outline"
}

interface HeroProps {
  index?: string
  eyebrow?: string
  title: React.ReactNode
  description?: string
  primaryCta?: HeroCta
  secondaryCta?: HeroCta
  variant?: HeroVariant
  full?: boolean
  /** Extra top padding on fixed-header (home) heroes. */
  headerOffset?: boolean
  media?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

const base = "relative isolate flex w-full items-center border-b border-border"

const fullClass = "min-h-svh py-20 sm:py-24 lg:py-28"
const fullOffsetClass = "min-h-svh pb-20 pt-32 sm:pb-24 sm:pt-36"
const sectionClass = "py-16 sm:py-20"

const variants: Record<
  HeroVariant,
  {
    wrap: string
    eyebrow: string
    title: string
    desc: string
  }
> = {
  ink: {
    wrap: "bg-hero-ink text-white",
    eyebrow: "text-white/55",
    title: "text-white",
    desc: "text-white/65",
  },
  paper: {
    wrap: "bg-background text-foreground",
    eyebrow: "text-muted-foreground",
    title: "text-foreground",
    desc: "text-muted-foreground",
  },
  split: {
    wrap: "bg-muted text-foreground",
    eyebrow: "text-muted-foreground",
    title: "text-foreground",
    desc: "text-muted-foreground",
  },
}

export function Hero({
  index,
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  variant = "paper",
  full = false,
  headerOffset = false,
  media,
  className,
  children,
}: HeroProps) {
  const v = variants[variant]
  const ctas = [primaryCta, secondaryCta].filter(Boolean) as HeroCta[]
  const filled =
    variant === "ink"
      ? "bg-white text-foreground hover:bg-white/85"
      : "bg-primary text-primary-foreground hover:bg-primary/85"
  const outline =
    variant === "ink"
      ? "border border-white/30 text-white hover:border-white/70"
      : "border border-border text-foreground hover:border-foreground"

  return (
    <section
      className={cn(
        base,
        full ? (headerOffset ? fullOffsetClass : fullClass) : sectionClass,
        v.wrap,
        className
      )}
    >
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className={cn("space-y-6 text-center lg:text-left", media ? "lg:col-span-7" : "lg:col-span-10")}>
          {(index || eyebrow) && (
            <p className={cn("label", v.eyebrow)}>
              {index && <span className={variant === "ink" ? "text-white" : "text-foreground"}>{index} — </span>}
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "display-tight font-display text-4xl font-bold leading-[1.03] sm:text-5xl lg:text-6xl",
              v.title
            )}
          >
            {title}
          </h1>
          {description && (
            <p className={cn("mx-auto max-w-xl text-base leading-relaxed sm:text-lg lg:mx-0", v.desc)}>
              {description}
            </p>
          )}
          {ctas.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-2 lg:justify-start">
              {ctas.map((cta, i) => {
                // primary defaults to filled, secondary to outline
                const isFilled = i === 0 ? cta.variant !== "outline" : cta.variant === "solid"
                return (
                  <Link
                    key={cta.href + cta.label}
                    href={cta.href}
                    className={cn(
                      "label inline-flex h-11 items-center rounded-full px-7 transition",
                      isFilled ? filled : outline
                    )}
                  >
                    {cta.label}
                  </Link>
                )
              })}
            </div>
          )}
          {children}
        </div>
        {media && <div className="lg:col-span-5">{media}</div>}
      </div>
    </section>
  )
}

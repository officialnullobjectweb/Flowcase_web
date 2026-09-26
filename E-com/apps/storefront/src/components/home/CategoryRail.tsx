import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Rail } from "@/components/ui/rail"
import { type NavModel } from "@/lib/nav-models"

/**
 * Horizontal model carousel — every iPhone / Galaxy case as a tappable card.
 */
export function CategoryRail({ models }: { models: NavModel[] }) {
  return (
    <Rail
      itemClass="w-[64%] sm:w-[44%] lg:w-[calc((100%-3rem)/4.3)]"
      ariaLabel="Shop by model"
    >
      {models.map((model) => (
        <Link key={model.handle} href={`/products/${model.handle}`} className="group block">
          <div className="relative aspect-[4/5] overflow-hidden border border-border bg-muted">
            {model.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={model.image}
                alt={model.label}
                loading="lazy"
                className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
              />
            ) : (
              <span className="label flex h-full items-center justify-center text-muted-foreground">
                {model.label}
              </span>
            )}
            <span className="label absolute left-0 top-0 bg-background/90 px-2 py-1.5 text-foreground backdrop-blur">
              {model.brand === "apple" ? "iPhone" : "Galaxy"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold leading-snug group-hover:underline">
              {model.label}
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden="true"
            />
          </div>
          <p className="label mt-1 text-muted-foreground">Case</p>
        </Link>
      ))}
    </Rail>
  )
}

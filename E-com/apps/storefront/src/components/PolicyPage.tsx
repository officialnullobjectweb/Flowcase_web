import Link from "next/link"
import { Hero } from "@/components/Hero"

export function PolicyPage({
  eyebrow = "Legal",
  title,
  description,
  updated,
  sections,
}: {
  eyebrow?: string
  title: string
  description: string
  updated: string
  sections: { title: string; items: string[] }[]
}) {
  return (
    <>
      <Hero
        variant="ink"
        eyebrow={eyebrow}
        title={title}
        description={description}
        primaryCta={{ href: "/contact", label: "Contact us", variant: "solid" }}
        secondaryCta={{ href: "/faq", label: "Read the FAQ" }}
      />
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="label text-muted-foreground">Last updated — {updated}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s.title} className="border border-border p-6">
              <h2 className="display-tight font-display text-lg font-semibold">{s.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border border-border p-5 text-center">
          {[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/returns", label: "Returns" },
            { href: "/refunds", label: "Refunds" },
            { href: "/data-collection", label: "Data collection" },
            { href: "/shipping-returns", label: "Shipping" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="label border-b border-foreground pb-0.5 transition hover:border-muted-foreground hover:text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

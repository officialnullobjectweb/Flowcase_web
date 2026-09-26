import type { Metadata } from "next"
import { Hero } from "@/components/Hero"

export const metadata: Metadata = {
  title: "About",
  description:
    "Flowcase builds slim, drop-tested phone cases for iPhone 15–17 and Samsung Galaxy A & S series. Go With Flow.",
}

const PILLARS = [
  {
    title: "Fit first",
    body: "Every case is cut to the exact camera bar, button, and MagSafe layout of your model — no generic shells.",
  },
  {
    title: "Thin, not fragile",
    body: "Military-grade impact frames without the brick. Cases that disappear in your pocket until you need them.",
  },
  {
    title: "Two ecosystems, one standard",
    body: "iPhone 15–17 and Galaxy A & S share the same finish quality, packaging, and checkout.",
  },
]

export default function AboutPage() {
  return (
    <>
      <Hero
        variant="ink"
        eyebrow="About Flowcase"
        title="Cases that move at your pace."
        description="We design protective cases for people who live on their phones. Slim profiles, drop-tested corners, zero bulk — from box to pocket."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-center gap-3">          <p className="display-tight font-display text-xl font-bold">Go With Flow</p>
        </div>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Flowcase started with a simple complaint: protective cases had become
          bricks. We wanted something that passed a drop test and still slid
          into a jeans pocket. So we built cases around real device geometry —
          camera islands, button travel, wireless charging — not around a
          one-size shell.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Today the catalogue covers iPhone 15 through 17 and Samsung Galaxy A
          and S series. Same materials, same quality control, same promise:
          protection you stop noticing.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="border border-border p-6"
            >
              <h2 className="display-tight font-display text-base font-semibold">
                {pillar.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 border border-border p-8 text-center sm:p-10">
          <p className="label text-muted-foreground">Ready to pick a finish?</p>
          <a
            href="/shop"
            className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
          >
            Shop all cases
          </a>
        </div>
      </section>
    </>
  )
}

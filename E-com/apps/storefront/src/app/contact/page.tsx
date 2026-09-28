import type { Metadata } from "next"
import { Hero } from "@/components/Hero"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Flowcase for order help, returns, or product questions.",
}

const CHANNELS = [
  {
    label: "Email",
    value: "support@flowcase.in",
    href: "mailto:support@flowcase.in",
    note: "We reply within one business day.",
  },
  {
    label: "Order help",
    value: "orders@flowcase.example",
    href: "mailto:orders@flowcase.example",
    note: "Include your order number (#1234).",
  },
  {
    label: "Hours",
    value: "Mon–Fri, 10:00–18:00 IST",
    href: null,
    note: "Weekend messages answered Monday.",
  },
]

export default function ContactPage() {
  return (
    <>
      <Hero
        variant="split"
        eyebrow="Contact"
        title="We’re here to help."
        description="Questions about fit, shipping, or a return? Reach out — a real person will get back to you."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.label}
              className="border border-border p-6"
            >
              <p className="label text-muted-foreground">
                {channel.label}
              </p>
              {channel.href ? (
                <a
                  href={channel.href}
                  className="mt-2 block break-words text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {channel.value}
                </a>
              ) : (
                <p className="mt-2 text-sm font-medium text-foreground">
                  {channel.value}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {channel.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-border p-6">
          <h2 className="display-tight font-display text-lg font-semibold">
            Before you write
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Shipping timelines live on{" "}
              <a
                href="/shipping-returns"
                className="underline underline-offset-4"
              >
                Shipping &amp; returns
              </a>
              .
            </li>
            <li>
              Common questions are answered in the{" "}
              <a href="/faq" className="underline underline-offset-4">
                FAQ
              </a>
              .
            </li>
            <li>
              For a return, include your order number and which item you’re
              sending back.
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}

import type { Metadata } from "next"
import { Hero } from "@/components/Hero"

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description:
    "Flowcase shipping timelines, return window, refunds, and warranty terms.",
}

const SECTIONS = [
  {
    title: "Shipping",
    items: [
      "Orders process in 1–2 business days (excluding holidays).",
      "Metro India: typically 2–4 business days after dispatch.",
      "Rest of India / international where available: 4–7 business days.",
      "Tracking is emailed when the carrier label is created.",
      "Shipping cost is shown at checkout after you choose a method.",
    ],
  },
  {
    title: "Returns",
    items: [
      "Return window: 7 days from delivery.",
      "Item must be unused, in original packaging, with tags attached.",
      "Email orders@flowcase.example with your order number to start a return.",
      "Return shipping is paid by the customer unless the item was defective or wrong.",
      "Once we receive and inspect the return, refunds issue to the original payment method.",
    ],
  },
  {
    title: "Refunds",
    items: [
      "Approved refunds are processed within 5–7 business days of inspection.",
      "UPI/card refunds appear per your bank’s timelines.",
      "Cash-on-delivery orders are refunded via bank transfer — send account details with your return request.",
      "Original shipping fees are non-refundable unless the order was faulty.",
    ],
  },
  {
    title: "Warranty",
    items: [
      "6-month warranty against manufacturing defects from delivery.",
      "Does not cover cosmetic wear, accidental damage beyond rated drop protection, or misuse.",
      "Warranty claims: email support@flowcase.example with photos and your order number.",
    ],
  },
]

export default function ShippingReturnsPage() {
  return (
    <>
      <Hero
        variant="ink"
        eyebrow="Policies"
        title="Shipping & returns."
        description="Timelines, the return window, and how refunds work — no footnotes."
        primaryCta={{ href: "/faq", label: "Read the FAQ", variant: "solid" }}
        secondaryCta={{ href: "/contact", label: "Contact us" }}
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="border border-border p-6"
            >
              <h2 className="display-tight font-display text-lg font-semibold">
                {section.title}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-border p-8 text-center">
          <p className="label text-muted-foreground">
            Questions about a specific order?
          </p>
          <a
            href="/contact"
            className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
          >
            Contact support
          </a>
        </div>
      </section>
    </>
  )
}

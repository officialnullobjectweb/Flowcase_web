import type { Metadata } from "next"
import { Hero } from "@/components/Hero"
import { JsonLd } from "@/components/JsonLd"
import { Accordion } from "@/components/ui/accordion"

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Flowcase fit, shipping, returns, payments, and warranty.",
}

const FAQS = [
  {
    q: "Which phones do Flowcase cases fit?",
    a: "iPhone 15, 16, and 17 series, plus Samsung Galaxy A and S series. Each product page lists the exact models — always match your model name before adding to cart.",
  },
  {
    q: "How fast do you ship?",
    a: "Orders typically leave our warehouse in 1–2 business days. Metro delivery in India is usually 2–4 days; other regions 4–7. You’ll get tracking once the label is created.",
  },
  {
    q: "What is your return policy?",
    a: "Unused items in original packaging can be returned within 7 days of delivery. Start by emailing orders@flowcase.example with your order number. See Shipping & returns for full details.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "Razorpay — UPI, cards, netbanking — and manual / cash on delivery where available. Card and UPI payments are verified before the order is confirmed.",
  },
  {
    q: "Are the cases MagSafe compatible?",
    a: "Compatible models call out MagSafe support on the product page. Cutouts and magnet rings are aligned to the exact device geometry for that model year.",
  },
  {
    q: "Do you offer a warranty?",
    a: "Manufacturing defects are covered for 6 months from delivery. Normal wear, drops beyond rated drop protection, and cosmetic damage from misuse are not covered.",
  },
  {
    q: "How do I track my order?",
    a: "We email tracking when the shipment is fulfilled. You can also reply to your order email with the order number and we’ll send the latest status.",
  },
]

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <Hero
        variant="paper"
        eyebrow="Help"
        title="Frequently asked questions."
        description="Fit, shipping, returns, payments — the short answers first."
        primaryCta={{ href: "/contact", label: "Still stuck? Contact us" }}
      />

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <Accordion items={FAQS.map((item) => ({ title: item.q, content: item.a }))} />

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="/contact"
            className="label inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
          >
            Contact support
          </a>
          <a
            href="/shipping-returns"
            className="label inline-flex rounded-full border border-border px-7 py-3 transition hover:border-foreground"
          >
            Shipping &amp; returns
          </a>
        </div>
      </section>
    </>
  )
}

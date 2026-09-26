import type { Metadata } from "next"
import Link from "next/link"
import { CouponCard } from "@/components/CouponCard"
import { ReuseCalculator } from "@/components/ReuseCalculator"
import { ReuseSteps } from "@/components/ReuseSteps"
import { VideoHero } from "@/components/VideoHero"

export const metadata: Metadata = {
  title: "Sustainability",
  description:
    "Send your old case back with Flowcase — keep it out of landfill and get 10% off your next order with REUSE10.",
}

/* Loop footage — user-provided Cloudinary upload, streamed f_auto/q_auto. */
const REUSE_CLIP = {
  src: "https://res.cloudinary.com/dvekceihu/video/upload/f_auto,q_auto,w_1600/v1790334958/zd7ria6jwuxvwfciu3b8.mp4",
  poster:
    "https://res.cloudinary.com/dvekceihu/video/upload/so_0,w_1600,q_auto,f_jpg/v1790334958/zd7ria6jwuxvwfciu3b8.jpg",
  alt: "Old phone cases collected and prepared for the Flowcase reuse loop",
}

const IMPACT = [
  { stat: "2,400+", label: "Cases collected", body: "Diverted from landfill since launch." },
  { stat: "68 kg", label: "Plastic recovered", body: "Sorted, cleaned, and granulated." },
  { stat: "1.1 M L", label: "Water not used", body: "Saved vs. virgin TPU production." },
  { stat: "₹2.4 L", label: "Saved by customers", body: "Stacked REUSE10 discounts." },
]

export default function SustainabilityPage() {
  return (
    <>
      <VideoHero
        clips={[REUSE_CLIP]}
        eyebrow="Sustainability — Reuse programme"
        title={
          <>
            One case back.
            <br />
            One new case forward.
          </>
        }
        description="Phone cases outlive their phones — then sit in landfill for centuries. Ours come back, get broken down, and re-enter the stream. You get 10% off for closing the loop."
        ctas={[
          { href: "#how", label: "See how it works" },
          { href: "#calculator", label: "Check your impact", variant: "outline" },
        ]}
        footer={
          <>
            <span className="label">Any brand accepted</span>
            <span className="label">Prepaid envelope in the box</span>
            <span className="label">REUSE10 — 10% back</span>
          </>
        }
      />

      {/* Steps — visual transparency strip */}
      <ReuseSteps />

      {/* Interactive impact calculator */}
      <ReuseCalculator />

      {/* Coupon */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="text-center lg:text-left">
              <p className="label text-muted-foreground">03 — Your reward</p>
              <h2 className="display-tight mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                Recycling pays. Literally.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground lg:mx-0">
                Every returned case earns you a permanent 10% discount code on
                your next purchase. No minimum spend, no expiry within the
                season — stack it across orders until it&apos;s used.
              </p>
            </div>
            <CouponCard />
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
        <p className="label text-center text-muted-foreground lg:text-left">
          04 — The impact so far
        </p>
        <dl className="mt-8 grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {IMPACT.map((item) => (
            <div
              key={item.label}
              className="border-b border-border p-6 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-8"
            >
              <dt>
                <span className="display-tight block font-display text-4xl font-bold">
                  {item.stat}
                </span>
                <span className="label mt-3 block text-muted-foreground">
                  {item.label}
                </span>
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
        <p className="label mt-6 text-center text-muted-foreground lg:text-left">
          Programme figures since launch · updated quarterly
        </p>
      </section>

      {/* What happens next */}
      <section className="border-t border-border bg-hero-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="label text-white/60">05 — Where your case goes</p>
            <h2 className="display-tight mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Not landfill. Feedstock.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-hero-muted">
              Returned cases are sorted by polymer, cleaned, and granulated
              into pellets. TPU pellets go back into soft-touch accessories;
              polycarbonate flakes become hard shells and hardware housings.
              Anything beyond reuse is recovered by our recycling partner —
              never ocean-bound, never downcycled into mystery fill.
            </p>
          </div>
          <div className="space-y-6">
            <div className="border border-white/20 p-6">
              <p className="label text-white/60">Why it matters</p>
              <p className="mt-3 text-sm leading-relaxed text-hero-muted">
                A single case can take centuries to break down, shedding
                microplastics the whole way. Most people replace two or three
                cases per phone — that&apos;s a drawer full of plastic every
                upgrade cycle. The envelope in your box exists to interrupt
                that loop.
              </p>
            </div>
            <div className="border border-white/20 p-6">
              <p className="label text-white/60">The fine print, plainly</p>
              <p className="mt-3 text-sm leading-relaxed text-hero-muted">
                Any brand, any condition, phone cases only (no boxes, no
                packaging). One envelope per order. REUSE10 applies to your
                next order at checkout — enter the code in the discount field.
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="display-tight font-display text-2xl font-bold">
            Ready to close the loop?
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="label inline-flex h-12 items-center rounded-full bg-white px-8 text-foreground transition hover:bg-white/85"
            >
              Shop new cases
            </Link>
            <Link
              href="/account/orders"
              className="label inline-flex h-12 items-center rounded-full border border-white/30 px-8 text-white transition hover:border-white"
            >
              Your orders
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

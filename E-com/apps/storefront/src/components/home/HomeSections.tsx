"use client"

import Link from "next/link"
import { useMemo, useState, type FormEvent } from "react"
import { ArrowRight, Check, Leaf, Recycle, RotateCcw, ShieldCheck, Truck } from "lucide-react"
import { ProductCard } from "@/components/ProductCard"
import { SectionHeader } from "@/components/SectionHeader"
import { CategoryRail } from "@/components/home/CategoryRail"
import { CollectionsPicker } from "@/components/home/CollectionsPicker"
import { OfferBanners } from "@/components/home/OfferBanners"
import { ReviewsMarquee } from "@/components/home/ReviewsMarquee"
import { Rail } from "@/components/ui/rail"
import { DiscountScene, PackScene, StampScene } from "@/components/ReuseSteps"
import type { NavModel } from "@/lib/nav-models"
import type { Collection, Product } from "@/lib/types"

export type Brand = "all" | "apple" | "samsung"

/** Phone cases only — accessories (speakers, banks, cables…) never qualify. */
export function isPhoneCase(p: Product): boolean {
  return /^Flowcase for (iPhone|Galaxy)/i.test(p.title)
}

export function brandOf(p: Product): "apple" | "samsung" | "accessory" {
  const tags = (p.tags ?? []).map((t) => t.value.toLowerCase())
  if (tags.includes("samsung")) return "samsung"
  if (tags.includes("apple")) return "apple"
  if (/galaxy|samsung/i.test(p.title)) return "samsung"
  if (/iphone/i.test(p.title)) return "apple"
  // speakers / power banks / cables are universal — visible under All only,
  // so a brand tab shows strictly that brand (MagSafe + AirPods carry the
  // apple tag and ride along with Apple).
  return "accessory"
}

const STANDARD = [
  { stat: "2.5 m", title: "Drop-tested", body: "Corners rated for everyday falls — pocket height, desk height, pavement.", icon: ShieldCheck },
  { stat: "7 days", title: "Easy returns", body: "Changed your mind? Send it back within a week, no interrogation.", icon: RotateCcw },
  { stat: "48 hrs", title: "Fast dispatch", body: "Orders leave our warehouse within two working days, pan-India.", icon: Truck },
]

const CATEGORY_TILES = [
  {
    name: "Phone Cases",
    blurb: "iPhone 15–17 & Galaxy A/S",
    href: "/shop",
    img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => /^Flowcase for (iPhone|Galaxy)/i.test(p.title),
  },
  {
    name: "Speakers",
    blurb: "Bluetooth, 12–24 hr playtime",
    href: "/shop?tag=speaker",
    img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => (p.tags ?? []).some((t) => t.value.toLowerCase() === "speaker"),
  },
  {
    name: "Power Banks",
    blurb: "5000–27000mAh fast charge",
    href: "/shop?tag=powerbank",
    img: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => (p.tags ?? []).some((t) => t.value.toLowerCase() === "powerbank"),
  },
  {
    name: "Cables",
    blurb: "Braided USB-C up to 240W",
    href: "/shop?tag=cable",
    img: "https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => (p.tags ?? []).some((t) => t.value.toLowerCase() === "cable"),
  },
  {
    name: "MagSafe Cases",
    blurb: "Magnetic snap-on armor",
    href: "/shop?tag=magsafe",
    img: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => (p.tags ?? []).some((t) => t.value.toLowerCase() === "magsafe"),
  },
  {
    name: "AirPods Cases",
    blurb: "Pro, 4, 3, 2 & Max",
    href: "/shop?tag=airpods",
    img: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&q=80&auto=format&fit=crop",
    match: (p: Product) => (p.tags ?? []).some((t) => t.value.toLowerCase() === "airpods"),
  },
]

const REUSE = [
  { n: "01", t: "Order your case", b: "A prepaid envelope rides along in the box — for the case you're done with.", Scene: StampScene },
  { n: "02", t: "Pack the old one", b: "The cracked one, the faded one, any brand. Back in the loop instead of a drawer.", Scene: PackScene },
  { n: "03", t: "Get 10% off", b: "We scan the envelope and email REUSE10. Your next case just costs less.", Scene: DiscountScene },
]

const railItem = "w-[64%] sm:w-[44%] lg:w-[calc((100%-4.5rem)/4)]"

function BrandTabs({ brand, setBrand }: { brand: Brand; setBrand: (b: Brand) => void }) {
  const tabs: { key: Brand; label: string }[] = [
    { key: "all", label: "All" },
    { key: "apple", label: "Apple" },
    { key: "samsung", label: "Samsung" },
  ]
  return (
    <div role="tablist" aria-label="Filter by brand" className="flex shrink-0 items-center gap-1 border border-border p-1">
      {tabs.map((t) => {
        const active = brand === t.key
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => setBrand(t.key)}
            className={`label px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function RailSection({ items, label }: { items: Product[]; label: string }) {
  if (!items.length)
    return (
      <div className="mt-8 border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">No cases for this brand yet — try All.</p>
      </div>
    )
  return (
    <div className="mt-8">
      <Rail itemClass={railItem} ariaLabel={label}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </Rail>
    </div>
  )
}

export function HomeSections({
  products,
  collections,
  models,
}: {
  products: Product[]
  collections: Collection[]
  models: NavModel[]
}) {
  const [brand, setBrand] = useState<Brand>("all")
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)

  const filtered = useMemo(
    () => (brand === "all" ? products : products.filter((p) => brandOf(p) === brand)),
    [products, brand]
  )
  const filteredModels = useMemo(
    () => (brand === "all" ? models : models.filter((m) => m.brand === brand)),
    [models, brand]
  )
  const bestSellers = useMemo(() => {
    // best sellers are phone cases only — both brands under All,
    // strictly the tab's brand once Apple/Samsung is picked
    const cases = filtered.filter(isPhoneCase)
    const tagged = cases.filter((p) =>
      String(p.metadata?.badges ?? "").toLowerCase().includes("bestseller")
    )
    const pool = tagged.length ? tagged : [...cases].sort(
      (a, b) => Number(b.metadata?.rating ?? 0) - Number(a.metadata?.rating ?? 0)
    )
    return pool.slice(0, 8)
  }, [filtered])
  const latest = useMemo(() => filtered.slice(0, 8), [filtered])
  const bestRated = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => Number(b.metadata?.rating ?? 0) - Number(a.metadata?.rating ?? 0))
        .slice(0, 8),
    [filtered]
  )

  const iphone = collections.find((c) => /iphone/i.test(c.title))
  const samsung = collections.find((c) => /samsung|galaxy/i.test(c.title))

  const onSubscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    setSubscribed(true)
  }

  const ActiveScene = REUSE[step].Scene

  return (
    <>
      {/* 02 — best sellers + brand tabs (filters every rail on this page) */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            index="02"
            label="Best sellers"
            title="Most re-ordered cases."
            className="flex-1 border-t-0 pt-0"
          />
          <BrandTabs brand={brand} setBrand={setBrand} />
        </div>
        <RailSection items={bestSellers} label="Best sellers" />
      </section>

      {/* 03 — shop by category */}
      <section className="border-y border-border bg-muted py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeader
            index="03"
            label="Shop by category"
            title="Cases, audio, and charging."
            description="Six shelves, one standard — drop-tested, pocket-friendly, and shipped plastic-free."
            link={{ href: "/shop", label: "Shop everything" }}
          />
        </div>
        {/* edge-to-edge snap carousel: first card aligns with the container,
            the row bleeds off the right so the cut-off card invites a swipe */}
        <div
          role="region"
          aria-label="Shop by category"
          tabIndex={0}
          className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-4 pr-0 [scrollbar-width:none] sm:gap-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORY_TILES.map((tile) => {
            const count = products.filter(tile.match).length
            return (
              <Link
                key={tile.name}
                href={tile.href}
                className="group w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-background transition-transform duration-300 ease-out hover:-translate-y-1 sm:w-52 lg:w-60"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tile.img}
                    alt={`${tile.name} — Flowcase`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                    <p className="display-tight font-display text-base font-bold leading-tight text-white sm:text-lg">
                      {tile.name}
                    </p>
                    <p className="label mt-1 text-white/70">
                      {count} {count === 1 ? "product" : "products"}
                    </p>
                  </div>
                </div>
                <p className="label truncate px-3 py-2.5 text-muted-foreground">
                  {tile.blurb}
                </p>
              </Link>
            )
          })}
          {/* end spacer so the last card can snap fully into view */}
          <div aria-hidden="true" className="w-1 shrink-0 sm:w-2" />
        </div>
      </section>

      {/* 04 — shop by model */}
      {filteredModels.length > 0 && (
        <section className="border-y border-border bg-muted">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <SectionHeader
              index="04"
              label="Shop by model"
              title="Find your exact fit."
              description="Every case is moulded to one phone — no shared shells, no loose buttons."
              link={{ href: "/shop", label: "View all" }}
            />
            <div className="mt-8">
              <CategoryRail models={filteredModels} />
            </div>
          </div>
        </section>
      )}

      {/* 05 — just landed */}
      <section className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeader
          index="05"
          label="Just landed"
          title="Latest drops"
          link={{ href: "/shop", label: "View all" }}
        />
        <RailSection items={latest} label="Latest products" />
      </section>

      {/* offers */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <SectionHeader
          index="06"
          label="This month"
          title="Offers worth opening."
          description="Stackable with free shipping — codes land in your inbox, not in fine print."
        />
        <div className="mt-8">
          <OfferBanners />
        </div>
      </section>

      {/* 05b — sustainability teaser */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center border border-border bg-background">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="label text-muted-foreground">07 — Sustainability</p>
              <h2 className="display-tight mt-2 font-display text-2xl font-bold sm:text-3xl">
                Plastic-free box. Reused cases.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Every order ships plastic-free, and every old case you send back stays out of landfill.
              </p>
            </div>
          </div>
          <Link
            href="/sustainability"
            className="label inline-flex shrink-0 items-center gap-1.5 border-b border-foreground pb-1 transition hover:border-muted-foreground hover:text-muted-foreground"
          >
            Our mission <Recycle className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 08 — collections */}
      {(iphone || samsung) && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <SectionHeader
            index="08"
            label="Collections"
            title="Two ecosystems. One standard."
            description="Exact cutouts for camera bars, buttons, and MagSafe — from the iPhone line to Galaxy A and S."
          />
          <CollectionsPicker
            products={filtered}
            models={models}
            apple={iphone ? { title: iphone.title, href: `/collections/${iphone.handle ?? iphone.id}` } : undefined}
            samsung={samsung ? { title: samsung.title, href: `/collections/${samsung.handle ?? samsung.id}` } : undefined}
          />
        </section>
      )}

      {/* 09 — reviews */}
      <section className="border-y border-border bg-muted py-12 sm:py-16">
        <ReviewsMarquee products={filtered} />
      </section>

      {/* 10 — best rated */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeader
          index="10"
          label="Best rated"
          title="What everyone keeps re-ordering."
          description="Ranked by verified buyer ratings — the same stars you see on each product page."
          link={{ href: "/shop", label: "All cases" }}
        />
        <RailSection items={bestRated} label="Best rated products" />
      </section>

      {/* 11 — the standard: icon-first, desc desktop-only, minimal on mobile/tablet */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <SectionHeader index="11" label="The standard" title="Built to disappear. Tested to survive." />
        {/* desktop + full grid (hidden on small, compact on tablet) */}
        <dl className="mt-8 hidden grid-cols-3 border-t border-border md:grid">
          {STANDARD.map((item) => (
            <div key={item.title} className="border-b border-border p-6 text-center md:p-6 lg:p-8 lg:text-left">
              <dt>
                <item.icon className="mx-auto h-7 w-7 lg:mx-0 lg:h-8 lg:w-8" aria-hidden="true" />
                <span className="display-tight mt-3 block font-display text-3xl font-bold lg:text-4xl">
                  {item.stat}
                </span>
                <span className="label mt-2 block text-muted-foreground">{item.title}</span>
              </dt>
              <dd className="mt-3 hidden text-sm leading-relaxed text-muted-foreground lg:block">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
        {/* mobile: super-minimal 3-up icon row */}
        <dl className="mt-6 grid grid-cols-3 gap-2 md:hidden">
          {STANDARD.map((item) => (
            <div key={item.title} className="border border-border px-2 py-4 text-center">
              <dt>
                <item.icon className="mx-auto h-5 w-5" aria-hidden="true" />
                <span className="display-tight mt-2 block font-display text-lg font-bold leading-none">
                  {item.stat}
                </span>
                <span className="label mt-1.5 block text-muted-foreground">{item.title}</span>
              </dt>
            </div>
          ))}
        </dl>
        {/* mobile + tablet only: minimal marquee highlight */}
        <div className="mt-4 overflow-hidden border-y border-border py-2.5 lg:hidden" aria-hidden="true">
          <div className="marquee-track flex w-max items-center gap-8">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-8">
                {STANDARD.map((item) => (
                  <span key={`${dup}-${item.title}`} className="label flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5 text-foreground" />
                    {item.stat} · {item.title}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12 — reuse programme: desktop cards, mobile step buttons */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <SectionHeader
            index="12"
            label="Reuse programme"
            title="Send your old case back. Keep 10% forever."
            description="Your old case took every drop with you — it shouldn't end up in a drawer. Send it back, we break it down and start again, and 10% off lands in your inbox for the next one."
          />
          {/* desktop / tablet cards */}
          <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-3">
            {REUSE.map((s) => {
              const Scene = s.Scene
              return (
                <div key={s.n} className="group border border-border bg-background">
                  <div className="scene-bg relative overflow-hidden border-b border-border bg-muted/60">
                    <Scene />
                    <span className="label absolute left-3 top-3 text-muted-foreground">{s.n}</span>
                  </div>
                  <div className="p-5">
                    <p className="display-tight font-display text-lg font-semibold">{s.t}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
                  </div>
                </div>
              )
            })}
          </div>
          {/* mobile only: step-button process */}
          <div className="mt-8 sm:hidden">
            <div role="tablist" aria-label="Reuse steps" className="grid grid-cols-3 gap-2">
              {REUSE.map((s, i) => (
                <button
                  key={s.n}
                  role="tab"
                  aria-selected={step === i}
                  onClick={() => setStep(i)}
                  className={`border px-2 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                    step === i ? "border-foreground bg-background" : "border-border bg-background/60"
                  }`}
                >
                  <span className={`label block ${step === i ? "text-foreground" : "text-muted-foreground"}`}>
                    Step {i + 1}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-tight">{s.t}</span>
                </button>
              ))}
            </div>
            <div className="scene-bg relative mt-3 overflow-hidden border border-border bg-background">
              <ActiveScene />
              <span className="label absolute left-3 top-3 text-muted-foreground">{REUSE[step].n}</span>
            </div>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">{REUSE[step].b}</p>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => (s + REUSE.length - 1) % REUSE.length)}
                className="label border border-border px-4 py-2.5"
                aria-label="Previous step"
              >
                ← Back
              </button>
              <p className="label text-muted-foreground">{step + 1} / {REUSE.length}</p>
              <button
                onClick={() => setStep((s) => (s + 1) % REUSE.length)}
                className="label bg-foreground px-4 py-2.5 text-background"
                aria-label="Next step"
              >
                Next →
              </button>
            </div>
          </div>
          <Link
            href="/sustainability"
            className="label mt-8 inline-flex items-center gap-1.5 border-b border-foreground pb-1 transition hover:border-muted-foreground hover:text-muted-foreground"
          >
            See the full mission →
          </Link>
        </div>
      </section>

      {/* 13 — merged: ready when you are + go with flow + newsletter */}
      <section className="bg-foreground text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 text-center sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-8 lg:text-left">
          <div>
            <p className="label text-white/60">13 — Ready when you are · Go with flow</p>
            <h2 className="display-tight mt-4 font-display text-4xl font-bold leading-[1.03] sm:text-5xl">
              Protection you stop thinking about.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70 lg:mx-0">
              Slim, drop-tested cases for iPhone 15–17 and Samsung Galaxy A &amp; S — plus a reuse
              programme that keeps old cases out of landfill.
            </p>
            <Link
              href="/shop"
              className="label mt-6 inline-flex h-12 items-center rounded-full bg-white px-8 text-foreground transition hover:bg-white/85"
            >
              Shop all cases →
            </Link>
          </div>
          <div className="lg:justify-self-end lg:pl-8 lg:text-left">
            <p className="label text-white/60">Newsletter</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70 lg:mx-0">
              New drops, restocks, and reuse discounts. No spam.
            </p>
            {subscribed ? (
              <p className="label mt-4 flex items-center justify-center gap-2 text-white lg:justify-start">
                <Check className="h-4 w-4" aria-hidden="true" /> You&apos;re on the list.
              </p>
            ) : (
              <form onSubmit={onSubscribe} className="mx-auto mt-4 flex max-w-md gap-0 lg:mx-0">
                <label className="sr-only" htmlFor="home-newsletter-email">Email address</label>
                <input
                  id="home-newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOU@EMAIL.COM"
                  className="label w-full min-w-0 border border-white/25 bg-transparent px-4 py-3 text-white placeholder:text-white/50 focus:border-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="label shrink-0 border border-white bg-white px-5 py-3 text-black transition hover:bg-black hover:text-white"
                >
                  Join
                </button>
              </form>
            )}
            <Link
              href="/sustainability"
              className="label mt-5 inline-flex items-center gap-1.5 text-white underline-offset-4 transition hover:underline"
            >
              Our sustainability mission <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

import Link from "next/link"
import { RotateCcw, ShieldCheck, Truck } from "lucide-react"
import { ProductCard } from "@/components/ProductCard"
import { SectionHeader } from "@/components/SectionHeader"
import { VideoHero } from "@/components/VideoHero"
import { CategoryRail } from "@/components/home/CategoryRail"
import { CollectionsPicker } from "@/components/home/CollectionsPicker"
import { OfferBanners } from "@/components/home/OfferBanners"
import { ReviewsMarquee } from "@/components/home/ReviewsMarquee"
import { DiscountScene, PackScene, StampScene } from "@/components/ReuseSteps"
import { Rail } from "@/components/ui/rail"
import { getNavModels, listProducts, listCollections } from "@/lib/api"
import { getCms } from "@/lib/cms"
import type { Product } from "@/lib/types"

export const revalidate = 3600

const STANDARD = [
  {
    stat: "2.5 m",
    title: "Drop-tested",
    body: "Corners rated for everyday falls — pocket height, desk height, pavement.",
    icon: ShieldCheck,
  },
  {
    stat: "7 days",
    title: "Easy returns",
    body: "Changed your mind? Send it back within a week, no interrogation.",
    icon: RotateCcw,
  },
  {
    stat: "48 hrs",
    title: "Fast dispatch",
    body: "Orders leave our warehouse within two working days, pan-India.",
    icon: Truck,
  },
]

const REUSE = [
  {
    n: "01",
    t: "Order your case",
    b: "A prepaid envelope rides along in the box — for the case you're done with.",
    scene: StampScene,
  },
  {
    n: "02",
    t: "Pack the old one",
    b: "The cracked one, the faded one, any brand. Back in the loop instead of a drawer.",
    scene: PackScene,
  },
  {
    n: "03",
    t: "Get 10% off",
    b: "We scan the envelope and email REUSE10. Your next case just costs less.",
    scene: DiscountScene,
  },
]

const railItem = "w-[64%] sm:w-[44%] lg:w-[calc((100%-4.5rem)/4)]"

export default async function HomePage() {
  let products: Product[] = []
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = []
  let models: Awaited<ReturnType<typeof getNavModels>> = []

  try {
    const [productRes, collectionRes, navModels] = await Promise.all([
      listProducts({ limit: 15, order: "-created_at" }),
      listCollections(),
      getNavModels(),
    ])
    products = productRes.products
    collections = collectionRes.collections
    models = navModels
  } catch {
    // offline / empty seed — render heroes only
  }

  const iphone = collections.find((c) => /iphone/i.test(c.title))
  const samsung = collections.find((c) => /samsung|galaxy/i.test(c.title))

  const latest = products.slice(0, 8)
  const bestRated = [...products]
    .sort(
      (a, b) => Number(b.metadata?.rating ?? 0) - Number(a.metadata?.rating ?? 0)
    )
    .slice(0, 8)

  const railSection = (items: Product[], emptyLabel: string) =>
    items.length === 0 ? (
      <div className="mt-8 border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No products yet. Run the Flowcase seed script on the backend, then
          reload.
        </p>
      </div>
    ) : (
      <div className="mt-10">
        <Rail itemClass={railItem} ariaLabel={emptyLabel}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Rail>
      </div>
    )

  const cms = await getCms()

  return (
    <>
      {/* 01 — fullscreen video hero */}
      <VideoHero
        full
        clips={cms.heroes.home}
        eyebrow="Go With Flow"
        title={
          <>
            Cases that move
            <br />
            at your pace.
          </>
        }
        description="Premium protection for iPhone 15 through 17 and Samsung Galaxy A & S series. Slim profiles, drop-tested corners, zero bulk."
        ctas={[
          { href: "/shop", label: "Shop all cases" },
          {
            href: iphone ? `/collections/${iphone.handle ?? "iphone"}` : "/shop",
            label: iphone ? "iPhone cases" : "Browse catalogue",
            variant: "outline",
          },
        ]}
        footer={
          <>
            <span className="label">2.5 m drop-tested</span>
            <span className="label">Free shipping over ₹999</span>
            <span className="label">REUSE10 — 10% back</span>
          </>
        }
      />

      {/* 02 — offers */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeader
          index="02"
          label="This month"
          title="Offers worth opening."
          description="Stackable with free shipping — codes land in your inbox, not in fine print."
        />
        <div className="mt-10">
          <OfferBanners />
        </div>
      </section>

      {/* 03 — category carousel */}
      {models.length > 0 && (
        <section className="border-y border-border bg-muted">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <SectionHeader
              index="03"
              label="Shop by model"
              title="Find your exact fit."
              description="Every case is moulded to one phone — no shared shells, no loose buttons."
              link={{ href: "/shop", label: "View all" }}
            />
            <div className="mt-10">
              <CategoryRail models={models} />
            </div>
          </div>
        </section>
      )}

      {/* 04 — latest drops */}
      <section id="shop" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeader
          index="04"
          label="Just landed"
          title="Latest drops"
          link={{ href: "/shop", label: "View all" }}
        />
        {railSection(latest, "Latest products")}
      </section>

      {/* 05 — collections */}
      {(iphone || samsung) && (
        <section className="border-y border-border bg-muted">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <SectionHeader
              index="05"
              label="Collections"
              title="Two ecosystems. One standard."
              description="Exact cutouts for camera bars, buttons, and MagSafe — from the iPhone line to Galaxy A and S."
            />
            <CollectionsPicker
              products={products}
              models={models}
              apple={
                iphone
                  ? {
                      title: iphone.title,
                      href: `/collections/${iphone.handle ?? iphone.id}`,
                    }
                  : undefined
              }
              samsung={
                samsung
                  ? {
                      title: samsung.title,
                      href: `/collections/${samsung.handle ?? samsung.id}`,
                    }
                  : undefined
              }
            />
          </div>
        </section>
      )}

      {/* 06 — best rated */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeader
          index="06"
          label="Best rated"
          title="What everyone keeps re-ordering."
          description="Ranked by verified buyer ratings — the same stars you see on each product page."
          link={{ href: "/shop", label: "All cases" }}
        />
        {railSection(bestRated, "Best rated products")}
      </section>

      {/* 07 — reviews marquee */}
      <section className="border-y border-border bg-muted py-16 sm:py-20 lg:py-24">
        <ReviewsMarquee products={products} />
      </section>

      {/* 08 — the standard */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <SectionHeader
          index="08"
          label="The standard"
          title="Built to disappear. Tested to survive."
        />
        <dl className="mt-10 grid border-t border-border sm:grid-cols-3">
          {STANDARD.map((item) => (
            <div
              key={item.title}
              className="border-b border-border p-6 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-8"
            >
              <dt>
                <item.icon
                  className="h-8 w-8 text-foreground"
                  aria-hidden="true"
                />
                <span className="display-tight mt-4 block font-display text-4xl font-bold">
                  {item.stat}
                </span>
                <span className="label mt-3 block text-muted-foreground">
                  {item.title}
                </span>
              </dt>
              <dd className="mt-3 hidden text-sm leading-relaxed text-muted-foreground lg:block">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 09 — reuse programme */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <SectionHeader
            index="09"
            label="Reuse programme"
            title="Send your old case back. Keep 10% forever."
            description="Your old case took every drop with you — it shouldn't end up in a drawer. Send it back, we break it down and start again, and 10% off lands in your inbox for the next one."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {REUSE.map((step) => {
              const Scene = step.scene
              return (
                <div key={step.n} className="group border border-border bg-background">
                  <div className="relative overflow-hidden border-b border-border bg-muted/60 scene-bg">
                    <Scene />
                    <span className="label absolute left-3 top-3 text-muted-foreground">
                      {step.n}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="display-tight font-display text-lg font-semibold">
                      {step.t}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.b}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            href="/sustainability"
            className="label mt-8 inline-flex items-center gap-1.5 border-b border-foreground pb-1 transition hover:border-muted-foreground hover:text-muted-foreground"
          >
            See the full mission →
          </Link>
        </div>
      </section>

      {/* 10 — CTA */}
      <section className="bg-foreground text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:px-6 lg:py-24 lg:text-left">
          <div>
            <p className="label text-white/80">10 — Ready when you are</p>
            <h2 className="display-tight mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.03] sm:text-5xl">
              Protection you stop thinking about.
            </h2>
          </div>
          <Link
            href="/shop"
            className="label inline-flex h-12 items-center rounded-full bg-white px-8 text-foreground transition hover:bg-white/85"
          >
            Shop all cases →
          </Link>
        </div>
      </section>
    </>
  )
}

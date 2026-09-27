import { VideoHero } from "@/components/VideoHero"
import { HomeSections } from "@/components/home/HomeSections"
import { getNavModels, listProducts, listCollections } from "@/lib/api"
import { getCms } from "@/lib/cms"
import type { Product } from "@/lib/types"

  // Short window on purpose: free-tier backends sleep through builds, and a
// fast revalidate refills real products minutes after a cold deploy.
export const revalidate = 600

export default async function HomePage() {
  let products: Product[] = []
  let collections: Awaited<ReturnType<typeof listCollections>>["collections"] = []
  let models: Awaited<ReturnType<typeof getNavModels>> = []

  try {
    const [productRes, collectionRes, navModels] = await Promise.all([
      // full catalog pool: brand tabs + phone-only best sellers need every
      // product (limit 15 would return only the newest — all accessories)
      listProducts({ limit: 100, order: "-created_at" }),
      listCollections(),
      getNavModels(),
    ])
    products = productRes.products
    collections = collectionRes.collections
    models = navModels
  } catch {
    // offline / empty seed — render hero only
  }

  const iphone = collections.find((c) => /iphone/i.test(c.title))
  const cms = await getCms()

  return (
    <>
      {/* 01 — fullscreen video hero (unchanged) */}
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

      <HomeSections products={products} collections={collections} models={models} />
    </>
  )
}

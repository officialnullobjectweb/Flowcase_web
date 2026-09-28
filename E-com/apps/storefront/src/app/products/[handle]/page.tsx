import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { ImageGallery } from "@/components/ImageGallery"
import { JsonLd, siteUrl } from "@/components/JsonLd"
import { ProductCard } from "@/components/ProductCard"
import { ProductInfo } from "@/components/ProductInfo"
import { SelectionProvider } from "@/context/SelectionContext"
import { DetailsTabs, FeatureBanners, PdpFaq } from "@/components/ProductExtras"
import { ReviewsSection } from "@/components/ReviewsSection"
import { SectionHeader } from "@/components/SectionHeader"
import { Rail } from "@/components/ui/rail"
import { getCms } from "@/lib/cms"
import { getProductByHandle, listProducts } from "@/lib/api"

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  try {
    const product = await getProductByHandle(handle)
    if (!product) return { title: "Product not found" }
    const desc = product.description?.slice(0, 160) ?? product.title
    return {
      title: product.title,
      description: desc,
      alternates: { canonical: `/products/${product.handle}` },
      openGraph: {
        title: product.title,
        description: desc,
        url: `/products/${product.handle}`,
        images: product.thumbnail ? [{ url: product.thumbnail, alt: product.title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: product.title,
        description: desc,
        images: product.thumbnail ? [product.thumbnail] : undefined,
      },
    }
  } catch {
    return { title: "Product" }
  }
}

import type { Product } from "@/lib/types"

/** Product + rating + breadcrumb rich results for the PDP. */
function ProductJsonLd({ product }: { product: Product }) {
  const base = siteUrl()
  const variant = product.variants?.[0]
  const price = variant?.calculated_price?.calculated_amount ?? null
  const currency = (variant?.calculated_price?.currency_code ?? "inr").toUpperCase()
  const rating = Number(product.metadata?.rating ?? 0)
  const reviewCount = Number(product.metadata?.review_count ?? 0)
  const inStock =
    !variant?.manage_inventory ||
    variant?.allow_backorder ||
    (variant?.inventory_quantity ?? 0) > 0
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description ?? product.title,
          image: (product.images ?? []).map((i) => i.url).slice(0, 8),
          brand: { "@type": "Brand", name: "Flowcase" },
          ...(rating > 0 && reviewCount > 0
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount } }
            : {}),
          offers: {
            "@type": "Offer",
            url: `${base}/products/${product.handle}`,
            priceCurrency: currency,
            ...(price != null ? { price } : {}),
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: base },
            { "@type": "ListItem", position: 2, name: "Shop", item: `${base}/shop` },
            {
              "@type": "ListItem",
              position: 3,
              name: product.title,
              item: `${base}/products/${product.handle}`,
            },
          ],
        },
      ]}
    />
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  let product = null
  try {
    product = await getProductByHandle(handle)
  } catch {
    // fall through to notFound
  }

  if (!product) notFound()

  const cms = await getCms()

  let related: Awaited<ReturnType<typeof listProducts>>["products"] = []
  if (product.collection_id) {
    try {
      const res = await listProducts({ collection_id: product.collection_id, limit: 9 })
      related = res.products.filter((p) => p.id !== product!.id).slice(0, 8)
    } catch {
      // related rail is best-effort
    }
  }

  return (
    <SelectionProvider product={product}>
      <ProductJsonLd product={product} />
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:pb-12">
        <Breadcrumbs
          items={[{ href: "/shop", label: "Shop" }, { label: product.title }]}
          className="mb-8"
        />
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ImageGallery
            images={product.images ?? []}
            thumbnail={product.thumbnail}
            alt={product.title}
            product={product}
          />
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductInfo product={product} />
          </div>
        </div>

        <FeatureBanners product={product} />
        <DetailsTabs product={product} pdp={cms.pdp} />

        <ReviewsSection product={product} pdp={cms.pdp} />

        <PdpFaq product={product} />

        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeader
              index="More"
              label="Same collection"
              title="You may also like"
              link={{ href: "/shop", label: "All cases" }}
            />
            <Rail
              ariaLabel="More from same collection"
              itemClass="w-[62%] sm:w-[46%] lg:w-[calc((100%-3rem)/4)]"
              className="mt-10"
            >
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </Rail>
          </section>
        )}
      </div>
    </SelectionProvider>
  )
}

/**
 * Flowcase seed — 15 phone cases (9 iPhone + 6 Samsung), 2 color variants each.
 *
 * Run from apps/backend:
 *   npx medusa exec ./src/scripts/seed-flowcase.ts
 *
 * Requires a reachable DATABASE_URL (local or Neon).
 * Modeled on medusa-starter-default seed.
 */
import type { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchLinkProductsToCollectionWorkflow,
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const IMG = [
  "photo-1511707171634-5f897ff02aa9",
  "photo-1592750475338-74b7b21085ab",
  "photo-1601784551446-20c9e07cdbdb",
  "photo-1580910051074-3eb694886505",
  "photo-1565849904461-04a58ad377e0",
  "photo-1601593346740-925612772716",
  "photo-1574944985070-8f3ebc6b79d2",
  "photo-1556656793-08538906a9f8",
  "photo-1510557880182-3d4d3cba35a5",
  "photo-1591337676887-a217a6970a8a",
  "photo-1541877944-ac82a091518a",
  "photo-1585060544812-6b45742d762f",
  "photo-1523206489230-c012c64b2b48",
  "photo-1616348436168-de43ad0db179",
  "photo-1598327105666-5b89351aff97",
] as const

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`

const imagesFor = (offset: number) =>
  [0, 1, 2, 3].map((k) => ({ url: unsplash(IMG[(offset * 3 + k) % IMG.length]) }))

/** Color palette — storefront swatch filters map these names to hex. */
const ACCENTS = ["Glacier", "Sand", "Sage", "Blush", "Ocean"] as const

// Explicit card badges by handle (CSV); keep in sync with scripts/stamp-badges.mjs
const BADGES_BY_HANDLE: Record<string, string> = {
  "flowcase-iphone-15-pro": "limited",
  "flowcase-iphone-15-pro-max": "bestseller",
  "flowcase-iphone-16": "trending",
  "flowcase-iphone-16-pro": "sale",
  "flowcase-iphone-17": "new",
  "flowcase-iphone-17-pro": "new",
  "flowcase-iphone-17-pro-max": "trending",
  "flowcase-galaxy-a56": "budget",
  "flowcase-galaxy-a36": "budget",
  "flowcase-galaxy-s25": "bestseller",
  "flowcase-galaxy-s25-plus": "trending",
  "flowcase-galaxy-s25-ultra": "limited",
}

/** Deterministic demo rating/review counts (seeded, not random per run). */
const ratingFor = (index: number) =>
  Math.round((4.2 + ((index * 7) % 8) / 10) * 10) / 10
const reviewsFor = (index: number) => 48 + ((index * 97) % 430)

type CatalogEntry = {
  title: string
  handle: string
  brand: "apple" | "samsung"
  tags: string[]
  priceInr: number
  priceUsd: number
  description: string
}

const CATALOG: CatalogEntry[] = [
  { title: "Flowcase for iPhone 15", handle: "flowcase-iphone-15", brand: "apple", tags: ["apple", "iphone"], priceInr: 1299, priceUsd: 19, description: "Slim dual-layer protection for iPhone 15. Raised camera lip, MagSafe-ready ring, and Flowcase grip edges." },
  { title: "Flowcase for iPhone 15 Pro", handle: "flowcase-iphone-15-pro", brand: "apple", tags: ["apple", "iphone", "pro"], priceInr: 1499, priceUsd: 22, description: "Precision-milled for iPhone 15 Pro titanium frame. Ultra-thin shell with shock-absorbing corners." },
  { title: "Flowcase for iPhone 15 Pro Max", handle: "flowcase-iphone-15-pro-max", brand: "apple", tags: ["apple", "iphone", "pro", "max"], priceInr: 1599, priceUsd: 24, description: "Full-coverage armor for iPhone 15 Pro Max. Matte finish resists fingerprints and scratches." },
  { title: "Flowcase for iPhone 16", handle: "flowcase-iphone-16", brand: "apple", tags: ["apple", "iphone", "new"], priceInr: 1499, priceUsd: 22, description: "Built for iPhone 16. Camera Control cutout, 2m drop protection, and a soft-touch back panel." },
  { title: "Flowcase for iPhone 16 Pro", handle: "flowcase-iphone-16-pro", brand: "apple", tags: ["apple", "iphone", "pro", "new"], priceInr: 1699, priceUsd: 25, description: "iPhone 16 Pro case with reinforced bumper rails and seamless button covers." },
  { title: "Flowcase for iPhone 16 Pro Max", handle: "flowcase-iphone-16-pro-max", brand: "apple", tags: ["apple", "iphone", "pro", "max", "new"], priceInr: 1799, priceUsd: 26, description: "Maximum drop protection for iPhone 16 Pro Max without the bulk. Flowcase signature grip." },
  { title: "Flowcase for iPhone 17", handle: "flowcase-iphone-17", brand: "apple", tags: ["apple", "iphone", "new"], priceInr: 1699, priceUsd: 25, description: "Early-fit case for iPhone 17. Slim profile, raised edges, and Flowcase wave texture." },
  { title: "Flowcase for iPhone 17 Pro", handle: "flowcase-iphone-17-pro", brand: "apple", tags: ["apple", "iphone", "pro", "new"], priceInr: 1899, priceUsd: 27, description: "iPhone 17 Pro armor with titanium-inspired finish and precision camera cutouts." },
  { title: "Flowcase for iPhone 17 Pro Max", handle: "flowcase-iphone-17-pro-max", brand: "apple", tags: ["apple", "iphone", "pro", "max", "new"], priceInr: 1999, priceUsd: 29, description: "Flagship protection for iPhone 17 Pro Max. Dual-layer shell, MagSafe stack, zero compromise." },
  { title: "Flowcase for Galaxy A56", handle: "flowcase-galaxy-a56", brand: "samsung", tags: ["samsung", "galaxy", "a-series"], priceInr: 1099, priceUsd: 16, description: "Everyday shield for Galaxy A56. Flexible TPU with camera ring protection." },
  { title: "Flowcase for Galaxy A36", handle: "flowcase-galaxy-a36", brand: "samsung", tags: ["samsung", "galaxy", "a-series"], priceInr: 999, priceUsd: 15, description: "Lightweight case for Galaxy A36. Easy grip, clear-precise cutouts, Flowcase durability." },
  { title: "Flowcase for Galaxy A26", handle: "flowcase-galaxy-a26", brand: "samsung", tags: ["samsung", "galaxy", "a-series"], priceInr: 899, priceUsd: 13, description: "Budget-tough protection for Galaxy A26. Matte shell that shrugs off daily drops." },
  { title: "Flowcase for Galaxy S25", handle: "flowcase-galaxy-s25", brand: "samsung", tags: ["samsung", "galaxy", "s-series", "new"], priceInr: 1599, priceUsd: 24, description: "Slim precision fit for Galaxy S25. Raised bezels and Flowcase edge texture." },
  { title: "Flowcase for Galaxy S25+", handle: "flowcase-galaxy-s25-plus", brand: "samsung", tags: ["samsung", "galaxy", "s-series", "new"], priceInr: 1699, priceUsd: 25, description: "Galaxy S25+ case with shock-dispersing corners and anti-yellow coating." },
  { title: "Flowcase for Galaxy S25 Ultra", handle: "flowcase-galaxy-s25-ultra", brand: "samsung", tags: ["samsung", "galaxy", "s-series", "ultra", "new"], priceInr: 1899, priceUsd: 27, description: "Full-armor case for Galaxy S25 Ultra. S-Pen friendly, camera-guard lips, and Flowcase grip." },
]

export default async function seedFlowcase({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)
  const productModuleService = container.resolve(Modules.PRODUCT)

  const indiaCountries = ["in"]
  const usCountries = ["us"]

  logger.info("Seeding store data...")
  const [store] = await storeModuleService.listStores()

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Storefront",
  })
  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [{ name: "Default Storefront" }],
      },
    })
    defaultSalesChannel = salesChannelResult
  }
  const salesChannel = defaultSalesChannel[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: salesChannel.id,
        supported_currencies: [
          { currency_code: "inr", is_default: true },
          { currency_code: "usd", is_default: false },
        ],
      },
    },
  })

  logger.info("Seeding regions...")
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: "inr",
          countries: indiaCountries,
          payment_providers: ["pp_system_default", "pp_razorpay_default"],
        },
        {
          name: "United States",
          currency_code: "usd",
          countries: usCountries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  const indiaRegion = regionResult.find((r) => r.currency_code === "inr")
  if (!indiaRegion) throw new Error("India region missing after createRegionsWorkflow")

  logger.info("Seeding tax regions...")
  await createTaxRegionsWorkflow(container)
    .run({
      input: [
        ...indiaCountries.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
        ...usCountries.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
      ],
    })
    .catch((err: Error) => logger.warn(`Tax regions note: ${err.message}`))

  logger.info("Seeding stock location...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Flowcase Warehouse",
          address: {
            city: "Mumbai",
            country_code: "in",
            address_1: "1 Flow Way",
            postal_code: "400001",
          },
        },
      ],
    },
  })
  const stockLocation = stockLocationResult[0]

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: stockLocation.id },
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  logger.info("Seeding fulfillment data...")
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null
  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Default Shipping Profile", type: "default" }],
        },
      })
    shippingProfile = shippingProfileResult[0]
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Flowcase Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: indiaCountries.map((country_code) => ({
          country_code,
          type: "country" as const,
        })),
      },
      {
        name: "United States",
        geo_zones: usCountries.map((country_code) => ({
          country_code,
          type: "country" as const,
        })),
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const zoneId = fulfillmentSet.service_zones[0].id
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "3-5 business days",
          code: "standard",
        },
        prices: [
          { currency_code: "inr", amount: 99 },
          { currency_code: "usd", amount: 4 },
          { region_id: indiaRegion.id, amount: 99 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "1-2 business days",
          code: "express",
        },
        prices: [
          { currency_code: "inr", amount: 299 },
          { currency_code: "usd", amount: 12 },
          { region_id: indiaRegion.id, amount: 299 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  logger.info("Finished seeding fulfillment data.")

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })

  logger.info("Seeding publishable API key...")
  const { data: apiKeyRows } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: { type: "publishable" },
  })
  let publishableKey = apiKeyRows?.[0]
  if (!publishableKey) {
    const {
      result: [createdKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: "Storefront", type: "publishable", created_by: "" },
        ],
      },
    })
    publishableKey = createdKey as { id: string; token?: string }
  }
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableKey.id, add: [salesChannel.id] },
  })
  if (publishableKey.token) {
    logger.info(`Publishable key: ${publishableKey.token}`)
  }

  logger.info("Creating product tags...")
  const tagValues = [
    ...new Set(CATALOG.flatMap((e) => e.tags)),
  ]
  const tagsByValue = new Map<string, string>()
  const existingTags = await productModuleService.listProductTags({})
  for (const tag of existingTags) {
    tagsByValue.set(tag.value, tag.id)
  }
  const missing = tagValues.filter((v) => !tagsByValue.has(v))
  if (missing.length) {
    const created = await productModuleService.createProductTags(
      missing.map((value) => ({ value }))
    )
    for (const tag of created) tagsByValue.set(tag.value, tag.id)
  }

  logger.info("Creating collections...")
  const existingCollections =
    await productModuleService.listProductCollections({})
  let iphoneCol = existingCollections.find((c) => c.handle === "iphone")
  let samsungCol = existingCollections.find((c) => c.handle === "samsung-galaxy")
  if (!iphoneCol) {
    iphoneCol = await productModuleService.createProductCollections({
      title: "iPhone",
      handle: "iphone",
    })
  }
  if (!samsungCol) {
    samsungCol = await productModuleService.createProductCollections({
      title: "Samsung Galaxy",
      handle: "samsung-galaxy",
    })
  }
  if (!iphoneCol || !samsungCol) throw new Error("Failed to create collections")

  logger.info("Seeding products...")
  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: CATALOG.map((entry, index) => {
        const colors = ["Onyx", ACCENTS[index % ACCENTS.length]]
        return {
          title: entry.title,
          handle: entry.handle,
          description: entry.description,
          thumbnail: imagesFor(index)[0].url,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          collection_id:
            entry.brand === "apple" ? iphoneCol.id : samsungCol.id,
          tag_ids: entry.tags.map((t) => tagsByValue.get(t)!).filter(Boolean),
          images: imagesFor(index),
          metadata: {
            rating: String(ratingFor(index)),
            review_count: String(reviewsFor(index)),
            colors: colors.join(","),
            ...(BADGES_BY_HANDLE[entry.handle]
              ? { badges: BADGES_BY_HANDLE[entry.handle] }
              : {}),
          },
          options: [{ title: "Color", values: colors }],
          variants: colors.map((color) => ({
            title: color,
            manage_inventory: true,
            allow_backorder: false,
            options: { Color: color },
            prices: [
              { amount: entry.priceInr, currency_code: "inr" },
              { amount: entry.priceUsd, currency_code: "usd" },
            ],
          })),
          sales_channels: [{ id: salesChannel.id }],
        }
      }),
    },
  })
  logger.info(`Created ${products.length} products`)

  // Ensure collection links (collection_id on product should suffice; batch-link is belt-and-suspenders)
  const iphoneIds = products
    .filter((p) => p.handle.startsWith("flowcase-iphone"))
    .map((p) => p.id)
  const samsungIds = products
    .filter((p) => p.handle.startsWith("flowcase-galaxy"))
    .map((p) => p.id)
  if (iphoneIds.length) {
    await batchLinkProductsToCollectionWorkflow(container)
      .run({ input: { id: iphoneCol.id, add: iphoneIds } })
      .catch((err: Error) => logger.warn(`iPhone collection link: ${err.message}`))
  }
  if (samsungIds.length) {
    await batchLinkProductsToCollectionWorkflow(container)
      .run({ input: { id: samsungCol.id, add: samsungIds } })
      .catch((err: Error) =>
        logger.warn(`Samsung collection link: ${err.message}`)
      )
  }

  logger.info("Seeding inventory levels...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
    (inventoryItem: { id: string }) => ({
      location_id: stockLocation.id,
      stocked_quantity: 100,
      inventory_item_id: inventoryItem.id,
    })
  )
  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    })
  }
  logger.info("Finished seeding inventory levels.")

  logger.info("Flowcase seed complete.")
}

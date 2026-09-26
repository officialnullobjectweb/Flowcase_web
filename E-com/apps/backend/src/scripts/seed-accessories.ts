/**
 * Flowcase accessories seed — 50 products across 5 categories:
 * Speakers, Powerbank, Cables, MagSafe Cases, AirPods Cases.
 * 10 products per category, each with a unique lead colour + Onyx.
 *
 * Run from apps/backend:
 *   npx medusa exec ./src/scripts/seed-accessories.ts
 *
 * Idempotent: existing handles are skipped; categories/tags/collections
 * are found-or-created. Also backfills the "Phone case" category onto the
 * original 15 phone-case products.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  batchLinkProductsToCollectionWorkflow,
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
  createShippingProfilesWorkflow,
  updateProductsWorkflow,
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
  "photo-1505740420928-5e560c06d30e",
  "photo-1583394838336-acd977736f90",
] as const

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`

const imagesFor = (offset: number) =>
  [0, 1, 2, 3].map((k) => ({ url: unsplash(IMG[(offset * 3 + k) % IMG.length]) }))

/** 10 distinct lead colours — one per product in each category. */
const COLORS = [
  "Onyx",
  "Glacier",
  "Sand",
  "Sage",
  "Blush",
  "Ocean",
  "Crimson",
  "Amber",
  "Forest",
  "Lavender",
] as const

const ratingFor = (index: number) =>
  Math.round((4.2 + ((index * 7) % 8) / 10) * 10) / 10
const reviewsFor = (index: number) => 48 + ((index * 97) % 430)

type Item = {
  name: string
  handle: string
  priceInr: number
  priceUsd: number
  blurb: string
}

type CategorySeed = {
  categoryHandle: string
  titlePrefix: string
  titleSuffix: string
  tags: string[]
  items: Item[]
}

const CATEGORIES: CategorySeed[] = [
  {
    categoryHandle: "speakers",
    titlePrefix: "Flowcase",
    titleSuffix: "Speaker",
    tags: ["accessories", "speaker", "speakers"],
    items: [
      { name: "Alto Mini", handle: "flowcase-speaker-alto-mini", priceInr: 2499, priceUsd: 35, blurb: "Pocket Bluetooth speaker with 12-hour battery and Flowcase drop-safe shell." },
      { name: "Pulse Go", handle: "flowcase-speaker-pulse-go", priceInr: 2999, priceUsd: 42, blurb: "Clip-on travel speaker — hooks to your bag, fills the room." },
      { name: "Boombox Street", handle: "flowcase-speaker-boombox-street", priceInr: 4999, priceUsd: 69, blurb: "Party speaker with dual drivers, deep bass, and 24-hour playtime." },
      { name: "Echo Pod", handle: "flowcase-speaker-echo-pod", priceInr: 1999, priceUsd: 29, blurb: "Bedside Bluetooth speaker with soft-touch finish and alarm fade-in." },
      { name: "Thunder Bar", handle: "flowcase-speaker-thunder-bar", priceInr: 3999, priceUsd: 55, blurb: "Compact soundbar-style speaker for desk setups and movie nights." },
      { name: "Drift Clip", handle: "flowcase-speaker-drift-clip", priceInr: 2799, priceUsd: 39, blurb: "Handlebar-clip speaker for cycles and scooters. Splash-proof." },
      { name: "Halo Orb", handle: "flowcase-speaker-halo-orb", priceInr: 3499, priceUsd: 49, blurb: "Ambient-glow orb speaker — 360° sound with a warm night light." },
      { name: "Bassline Max", handle: "flowcase-speaker-bassline-max", priceInr: 4499, priceUsd: 62, blurb: "Bass-forward speaker with passive radiators and TWS stereo pairing." },
      { name: "Roam Pocket", handle: "flowcase-speaker-roam-pocket", priceInr: 2299, priceUsd: 32, blurb: "Ultra-compact everyday speaker. Jeans-pocket size, full-size voice." },
      { name: "Sonic Cube", handle: "flowcase-speaker-sonic-cube", priceInr: 3299, priceUsd: 46, blurb: "Desktop cube speaker with USB-C audio and mic for calls." },
    ],
  },
  {
    categoryHandle: "powerbank",
    titlePrefix: "Flowcase",
    titleSuffix: "Power Bank",
    tags: ["accessories", "powerbank", "power-bank"],
    items: [
      { name: "Volt 5000 Mini", handle: "flowcase-power-volt-5000-mini", priceInr: 1499, priceUsd: 22, blurb: "Lipstick-size 5000mAh power bank — one full phone charge, zero bulk." },
      { name: "Volt 10000 Slim", handle: "flowcase-power-volt-10000-slim", priceInr: 1999, priceUsd: 29, blurb: "Slim 10000mAh power bank with 22.5W fast charging and LED meter." },
      { name: "Volt 20000 Core", handle: "flowcase-power-volt-20000-core", priceInr: 2499, priceUsd: 35, blurb: "20000mAh workhorse — charges a phone 4 times, a tablet twice." },
      { name: "Volt 10000 MagSnap", handle: "flowcase-power-volt-10000-magsnap", priceInr: 2299, priceUsd: 32, blurb: "Magnetic snap-on 10000mAh bank for MagSafe iPhones. 15W wireless." },
      { name: "Volt 20000 Rugged", handle: "flowcase-power-volt-20000-rugged", priceInr: 2999, priceUsd: 42, blurb: "Drop-proof rugged 20000mAh bank for travel and field days." },
      { name: "Volt 5000 Card", handle: "flowcase-power-volt-5000-card", priceInr: 1699, priceUsd: 25, blurb: "Card-thin 5000mAh bank that lives in your wallet pocket." },
      { name: "Volt 15000 Travel", handle: "flowcase-power-volt-15000-travel", priceInr: 2399, priceUsd: 34, blurb: "Flight-friendly 15000mAh bank with built-in USB-C cable." },
      { name: "Volt 10000 Clear", handle: "flowcase-power-volt-10000-clear", priceInr: 2199, priceUsd: 31, blurb: "Transparent-shell 10000mAh bank — see the cells, trust the charge." },
      { name: "Volt 27000 Laptop", handle: "flowcase-power-volt-27000-laptop", priceInr: 2999, priceUsd: 42, blurb: "Laptop-grade 27000mAh bank with 65W USB-C PD output." },
      { name: "Volt 10000 Mini Cable", handle: "flowcase-power-volt-10000-cable", priceInr: 2099, priceUsd: 30, blurb: "10000mAh bank with a pop-out USB-C cable — nothing extra to carry." },
    ],
  },
  {
    categoryHandle: "cables",
    titlePrefix: "Flowcase",
    titleSuffix: "Cable",
    tags: ["accessories", "cable", "cables"],
    items: [
      { name: "Braid USB-C 1m 60W", handle: "flowcase-cable-braid-c-1m", priceInr: 499, priceUsd: 8, blurb: "Braided USB-C to C cable, 1 metre, 60W fast charge." },
      { name: "Braid USB-C 2m 60W", handle: "flowcase-cable-braid-c-2m", priceInr: 599, priceUsd: 9, blurb: "Extra-long 2-metre braided USB-C cable for couch and bed." },
      { name: "Braid Lightning 1m", handle: "flowcase-cable-braid-lightning-1m", priceInr: 599, priceUsd: 9, blurb: "Braided Lightning cable for older iPhones and AirPods cases." },
      { name: "Braid USB-C 100W 1.5m", handle: "flowcase-cable-braid-c-100w", priceInr: 799, priceUsd: 12, blurb: "100W braided USB-C cable — phones, tablets, and laptops." },
      { name: "Braid USB-A to C 1m", handle: "flowcase-cable-braid-a-to-c", priceInr: 399, priceUsd: 6, blurb: "Classic USB-A to C braided cable for chargers and cars." },
      { name: "Coil Car USB-C", handle: "flowcase-cable-coil-car", priceInr: 649, priceUsd: 10, blurb: "Coiled car USB-C cable — stretches to 1.2m, never tangles." },
      { name: "Braid 3-in-1", handle: "flowcase-cable-braid-3-in-1", priceInr: 899, priceUsd: 13, blurb: "One cable, three tips — USB-C, Lightning, and Micro for every device." },
      { name: "Right-Angle Gaming USB-C 2m", handle: "flowcase-cable-right-angle", priceInr: 749, priceUsd: 11, blurb: "Right-angle USB-C cable for gaming marathons — 2 metres, 60W." },
      { name: "Braid USB-C 240W 1m", handle: "flowcase-cable-braid-c-240w", priceInr: 899, priceUsd: 13, blurb: "240W flagship braided cable with a live power display." },
      { name: "Braid USB-C 0.3m Mini", handle: "flowcase-cable-braid-c-mini", priceInr: 449, priceUsd: 7, blurb: "Short 30cm braided cable — perfect for power banks." },
    ],
  },
  {
    categoryHandle: "magsafe-cases",
    titlePrefix: "Flowcase MagSafe for",
    titleSuffix: "",
    tags: ["accessories", "magsafe", "case", "apple"],
    items: [
      { name: "iPhone 15", handle: "flowcase-magsafe-iphone-15", priceInr: 1499, priceUsd: 22, blurb: "MagSafe-compatible case for iPhone 15 with N52 magnet ring and 2.5m drop rating." },
      { name: "iPhone 15 Pro", handle: "flowcase-magsafe-iphone-15-pro", priceInr: 1599, priceUsd: 24, blurb: "MagSafe case for iPhone 15 Pro — snap-on charging, titanium-frame fit." },
      { name: "iPhone 15 Pro Max", handle: "flowcase-magsafe-iphone-15-pro-max", priceInr: 1699, priceUsd: 25, blurb: "Full-armor MagSafe case for iPhone 15 Pro Max with camera guard lip." },
      { name: "iPhone 16", handle: "flowcase-magsafe-iphone-16", priceInr: 1599, priceUsd: 24, blurb: "MagSafe case for iPhone 16 with Camera Control cutout and grip edges." },
      { name: "iPhone 16 Pro", handle: "flowcase-magsafe-iphone-16-pro", priceInr: 1699, priceUsd: 25, blurb: "Precision MagSafe case for iPhone 16 Pro with bumper rails." },
      { name: "iPhone 16 Pro Max", handle: "flowcase-magsafe-iphone-16-pro-max", priceInr: 1799, priceUsd: 26, blurb: "Maximum-protection MagSafe case for iPhone 16 Pro Max." },
      { name: "iPhone 17", handle: "flowcase-magsafe-iphone-17", priceInr: 1799, priceUsd: 26, blurb: "Early-fit MagSafe case for iPhone 17 with wave texture back." },
      { name: "iPhone 17 Pro", handle: "flowcase-magsafe-iphone-17-pro", priceInr: 1899, priceUsd: 27, blurb: "Flagship MagSafe case for iPhone 17 Pro — strongest magnet stack." },
      { name: "iPhone 17 Pro Max", handle: "flowcase-magsafe-iphone-17-pro-max", priceInr: 1999, priceUsd: 29, blurb: "Top-tier MagSafe armor for iPhone 17 Pro Max. Zero compromise." },
      { name: "Galaxy S25 Ultra", handle: "flowcase-magsafe-galaxy-s25-ultra", priceInr: 1799, priceUsd: 26, blurb: "Qi2 magnetic case for Galaxy S25 Ultra — MagSafe accessories snap right on." },
    ],
  },
  {
    categoryHandle: "airpods-cases",
    titlePrefix: "Flowcase for",
    titleSuffix: "Case",
    tags: ["accessories", "airpods", "case", "apple"],
    items: [
      { name: "AirPods Pro 2", handle: "flowcase-airpods-pro-2", priceInr: 1099, priceUsd: 16, blurb: "Shock-proof case for AirPods Pro 2 with carabiner and wireless-charge passthrough." },
      { name: "AirPods Pro", handle: "flowcase-airpods-pro", priceInr: 999, priceUsd: 15, blurb: "Slim protective case for AirPods Pro (1st gen) with dust-proof hinge." },
      { name: "AirPods 4", handle: "flowcase-airpods-4", priceInr: 999, priceUsd: 15, blurb: "Featherlight case for AirPods 4 — precise speaker-hole cutouts." },
      { name: "AirPods 4 ANC", handle: "flowcase-airpods-4-anc", priceInr: 1099, priceUsd: 16, blurb: "Protective case for AirPods 4 with ANC — fit checked on both variants." },
      { name: "AirPods 3", handle: "flowcase-airpods-3", priceInr: 899, priceUsd: 13, blurb: "Everyday armor for AirPods 3 with anti-scratch matte shell." },
      { name: "AirPods 2", handle: "flowcase-airpods-2", priceInr: 899, priceUsd: 13, blurb: "Classic-fit case for AirPods 2 and 1 with wired-charge opening." },
      { name: "AirPods Max Shield", handle: "flowcase-airpods-max-shield", priceInr: 1499, priceUsd: 22, blurb: "Knit shield covers for AirPods Max earcups — sweat-proof and washable." },
      { name: "AirPods Pro 2 Rugged", handle: "flowcase-airpods-pro-2-rugged", priceInr: 1299, priceUsd: 19, blurb: "Rugged lock-lid case for AirPods Pro 2 — survives gym bags and treks." },
      { name: "AirPods 4 Rugged", handle: "flowcase-airpods-4-rugged", priceInr: 1199, priceUsd: 18, blurb: "Rugged edition case for AirPods 4 with lock clasp and strap loop." },
      { name: "AirPods Max Cover", handle: "flowcase-airpods-max-cover", priceInr: 1399, priceUsd: 21, blurb: "Full silicone cover set for AirPods Max headband and cups." },
    ],
  },
]

const NEW_CATEGORY_DEFS = [
  { name: "Phone case", handle: "phone-case" },
  { name: "Speakers", handle: "speakers" },
  { name: "Powerbank", handle: "powerbank" },
  { name: "Cables", handle: "cables" },
  { name: "MagSafe Cases", handle: "magsafe-cases" },
  { name: "AirPods Cases", handle: "airpods-cases" },
]

const BADGES_BY_HANDLE: Record<string, string> = {
  "flowcase-speaker-boombox-street": "trending",
  "flowcase-speaker-halo-orb": "limited",
  "flowcase-speaker-roam-pocket": "budget",
  "flowcase-power-volt-10000-slim": "bestseller",
  "flowcase-power-volt-20000-rugged": "limited",
  "flowcase-cable-braid-3-in-1": "budget",
  "flowcase-cable-braid-c-240w": "new",
  "flowcase-magsafe-iphone-17": "new",
  "flowcase-magsafe-iphone-17-pro-max": "trending",
  "flowcase-airpods-pro-2": "bestseller",
  "flowcase-airpods-4": "new",
}

export default async function seedAccessories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)
  const productModuleService = container.resolve(Modules.PRODUCT)

  // ── channels / location / shipping profile ──
  let channels = await salesChannelModuleService.listSalesChannels({
    name: "Default Storefront",
  })
  if (!channels.length) {
    channels = await salesChannelModuleService.listSalesChannels({}, { take: 1 })
  }
  if (!channels.length) throw new Error("No sales channel found — run seed-flowcase first")
  const salesChannel = channels[0]

  let locations = await stockLocationModuleService.listStockLocations({
    name: "Flowcase Warehouse",
  })
  if (!locations.length) {
    locations = await stockLocationModuleService.listStockLocations({}, { take: 1 })
  }
  if (!locations.length) throw new Error("No stock location found — run seed-flowcase first")
  const stockLocation = locations[0]

  let shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = result[0]
  }

  // ── categories (find-or-create; keep the user's own) ──
  logger.info("Syncing categories...")
  const existingCats = await productModuleService.listProductCategories({}, { take: 100 })
  const catsByHandle = new Map(existingCats.map((c) => [c.handle, c]))
  for (const def of NEW_CATEGORY_DEFS) {
    if (catsByHandle.has(def.handle)) continue
    const created = await productModuleService.createProductCategories({
      name: def.name,
      handle: def.handle,
      is_active: true,
    })
    catsByHandle.set(def.handle, created)
    logger.info(`Created category: ${def.name}`)
  }
  const phoneCat = catsByHandle.get("phone-case")

  // ── tags ──
  logger.info("Syncing tags...")
  const tagValues = [...new Set(CATEGORIES.flatMap((c) => c.tags))]
  const tagsByValue = new Map<string, string>()
  for (const t of await productModuleService.listProductTags({})) {
    tagsByValue.set(t.value, t.id)
  }
  const missingTags = tagValues.filter((v) => !tagsByValue.has(v))
  if (missingTags.length) {
    const created = await productModuleService.createProductTags(
      missingTags.map((value) => ({ value }))
    )
    for (const t of created) tagsByValue.set(t.value, t.id)
  }
  // MagSafe Galaxy entry needs the samsung tag instead of apple
  if (!tagsByValue.has("samsung")) {
    const [t] = await productModuleService.createProductTags([{ value: "samsung" }])
    tagsByValue.set("samsung", t.id)
  }
  if (!tagsByValue.has("galaxy")) {
    const [t] = await productModuleService.createProductTags([{ value: "galaxy" }])
    tagsByValue.set("galaxy", t.id)
  }

  // ── accessories collection ──
  const existingCols = await productModuleService.listProductCollections({})
  let accessoriesCol = existingCols.find((c) => c.handle === "accessories")
  if (!accessoriesCol) {
    accessoriesCol = await productModuleService.createProductCollections({
      title: "Accessories",
      handle: "accessories",
    })
    logger.info("Created collection: Accessories")
  }

  // ── skip handles that already exist ──
  const allHandles = CATEGORIES.flatMap((c) => c.items.map((i) => i.handle))
  const existing = await productModuleService.listProducts(
    { handle: allHandles },
    { take: 100, select: ["id", "handle"] }
  )
  const existingHandles = new Set(existing.map((p) => p.handle))
  const skipped = allHandles.filter((h) => existingHandles.has(h))
  if (skipped.length) logger.info(`Skipping ${skipped.length} existing: ${skipped.join(", ")}`)

  // ── create products ──
  type BuiltEntry = {
    title: string
    handle: string
    description: string
    categoryId: string
    tagIds: string[]
    priceInr: number
    priceUsd: number
    colors: string[]
    globalIndex: number
  }
  const toCreate: BuiltEntry[] = []
  let gi = 0
  for (const cat of CATEGORIES) {
    const catId = catsByHandle.get(cat.categoryHandle)?.id
    if (!catId) throw new Error(`Category missing: ${cat.categoryHandle}`)
    cat.items.forEach((item, i) => {
      if (existingHandles.has(item.handle)) return
      const lead = COLORS[i % COLORS.length]
      const colors = lead === "Onyx" ? ["Onyx", "Glacier"] : [lead, "Onyx"]
      const title = [cat.titlePrefix, item.name, cat.titleSuffix]
        .filter(Boolean)
        .join(" ")
      // Galaxy MagSafe entry rides on samsung tags, not apple
      const finalTags =
        item.handle === "flowcase-magsafe-galaxy-s25-ultra"
          ? ["accessories", "magsafe", "case", "samsung", "galaxy"]
          : cat.tags
      toCreate.push({
        title,
        handle: item.handle,
        description: item.blurb,
        categoryId: catId,
        tagIds: finalTags
          .map((t) => tagsByValue.get(t)!)
          .filter(Boolean),
        priceInr: item.priceInr,
        priceUsd: item.priceUsd,
        colors,
        globalIndex: 100 + gi++,
      })
    })
  }

  let createdIds: string[] = []
  if (toCreate.length) {
    logger.info(`Creating ${toCreate.length} accessory products...`)
    const { result: products } = await createProductsWorkflow(container).run({
      input: {
        products: toCreate.map((entry, n) => ({
          title: entry.title,
          handle: entry.handle,
          description: entry.description,
          thumbnail: imagesFor(entry.globalIndex)[0].url,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          collection_id: accessoriesCol.id,
          category_ids: [entry.categoryId],
          tag_ids: entry.tagIds,
          images: imagesFor(entry.globalIndex),
          metadata: {
            rating: String(ratingFor(entry.globalIndex)),
            review_count: String(reviewsFor(entry.globalIndex)),
            colors: entry.colors.join(","),
            ...(BADGES_BY_HANDLE[entry.handle]
              ? { badges: BADGES_BY_HANDLE[entry.handle] }
              : {}),
          },
          options: [{ title: "Color", values: entry.colors }],
          variants: entry.colors.map((color) => ({
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
        })),
      },
    })
    createdIds = products.map((p) => p.id)
    logger.info(`Created ${products.length} products`)

    await batchLinkProductsToCollectionWorkflow(container)
      .run({ input: { id: accessoriesCol.id, add: createdIds } })
      .catch((err: Error) => logger.warn(`Accessories collection link: ${err.message}`))
  } else {
    logger.info("Nothing new to create.")
  }

  // ── backfill "Phone case" category onto the original 15 ──
  if (phoneCat) {
    try {
      const phoneProducts = await productModuleService.listProducts(
        {},
        { take: 200, select: ["id", "handle"] }
      )
      const ids = phoneProducts
        .filter(
          (p) =>
            p.handle.startsWith("flowcase-iphone") ||
            p.handle.startsWith("flowcase-galaxy")
        )
        .map((p) => p.id)
      if (ids.length) {
        await updateProductsWorkflow(container).run({
          input: {
            selector: { id: ids },
            update: { category_ids: [phoneCat.id] } as Record<string, unknown>,
          },
        })
        logger.info(`Backfilled phone-case category on ${ids.length} products`)
      }
    } catch (err) {
      logger.warn(`Phone-case backfill note: ${(err as Error).message}`)
    }
  }

  // ── inventory levels for items missing one at this location ──
  try {
    const { data: levels } = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id"],
      filters: { location_id: stockLocation.id },
    })
    const stocked = new Set((levels ?? []).map((l) => l.inventory_item_id))
    const { data: items } = await query.graph({
      entity: "inventory_item",
      fields: ["id"],
    })
    const missing = (items ?? []).filter((i) => !stocked.has(i.id))
    if (missing.length) {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: missing.map((i) => ({
            location_id: stockLocation.id,
            stocked_quantity: 100,
            inventory_item_id: i.id,
          })),
        },
      })
      logger.info(`Stocked ${missing.length} new inventory items`)
    }
  } catch (err) {
    logger.warn(`Inventory note: ${(err as Error).message}`)
  }

  logger.info("Accessories seed complete.")
}

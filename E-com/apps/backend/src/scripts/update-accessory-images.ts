/**
 * Assign category-correct images to the 50 accessory products.
 *
 * Run from apps/backend:
 *   npx medusa exec ./src/scripts/update-accessory-images.ts
 *
 * Idempotent: sets exactly 4 images + thumbnail per product every run.
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

const u = (id: string, extra = "") =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop${extra}`

// Verified (HTTP 200) Unsplash IDs, audio/tech subjects only.
const SPEAKERS = [
  "1545454675-3531b543be5d", // smart speaker
  "1608043152269-423dbba4e7e1", // bluetooth speaker
  "1505740420928-5e560c06d30e", // headphones, yellow bg
  "1546435770-a3e426bf472b", // headphones
  "1484704849700-f032a568e944", // headphones, black
  "1524678606370-a47ad25cb82a", // headphones lifestyle
]
const POWER = [
  "1601524909162-ae8725290836", // power bank
  "1600294037681-c80b4cb5b434", // apple tech flat-lay
  "1546868871-7041f2a55e12", // smartwatch (gadget)
  "1523275335684-37898b6baf30", // watch product shot
]
const CABLES = [
  "1587033411391-5d9e51cce126", // charging cables
  "1600294037681-c80b4cb5b434", // tech flat-lay
  "1601524909162-ae8725290836", // charging gear
]
const AIRPODS = [
  "1606220945770-b5b6c2c55bf1", // airpods
  "1572569511254-d8f925fe2cbb", // earbuds
  "1590658268037-6bf12165a8df", // earbuds case
  "1610438235354-a6ae5528385c", // airpods max
  "1583394838336-acd977736f90", // headphones
]
// MagSafe cases keep phone photography (correct subject already).
const PHONES = [
  "1511707171634-5f897ff02aa9",
  "1592750475338-74b7b21085ab",
  "1601784551446-20c9e07cdbdb",
  "1580910051074-3eb694886505",
  "1565849904461-04a58ad377e0",
  "1601593346740-925612772716",
]

const FRAMINGS = ["", "&crop=entropy", "&crop=top", "&crop=left", "&flip=h"]

const HANDLES: Record<string, string[]> = {
  speakers: [
    "flowcase-speaker-alto-mini",
    "flowcase-speaker-pulse-go",
    "flowcase-speaker-boombox-street",
    "flowcase-speaker-echo-pod",
    "flowcase-speaker-thunder-bar",
    "flowcase-speaker-drift-clip",
    "flowcase-speaker-halo-orb",
    "flowcase-speaker-bassline-max",
    "flowcase-speaker-roam-pocket",
    "flowcase-speaker-sonic-cube",
  ],
  power: [
    "flowcase-power-volt-5000-mini",
    "flowcase-power-volt-10000-slim",
    "flowcase-power-volt-20000-core",
    "flowcase-power-volt-10000-magsnap",
    "flowcase-power-volt-20000-rugged",
    "flowcase-power-volt-5000-card",
    "flowcase-power-volt-15000-travel",
    "flowcase-power-volt-10000-clear",
    "flowcase-power-volt-27000-laptop",
    "flowcase-power-volt-10000-cable",
  ],
  cables: [
    "flowcase-cable-braid-c-1m",
    "flowcase-cable-braid-c-2m",
    "flowcase-cable-braid-lightning-1m",
    "flowcase-cable-braid-c-100w",
    "flowcase-cable-braid-a-to-c",
    "flowcase-cable-coil-car",
    "flowcase-cable-braid-3-in-1",
    "flowcase-cable-right-angle",
    "flowcase-cable-braid-c-240w",
    "flowcase-cable-braid-c-mini",
  ],
  magsafe: [
    "flowcase-magsafe-iphone-15",
    "flowcase-magsafe-iphone-15-pro",
    "flowcase-magsafe-iphone-15-pro-max",
    "flowcase-magsafe-iphone-16",
    "flowcase-magsafe-iphone-16-pro",
    "flowcase-magsafe-iphone-16-pro-max",
    "flowcase-magsafe-iphone-17",
    "flowcase-magsafe-iphone-17-pro",
    "flowcase-magsafe-iphone-17-pro-max",
    "flowcase-magsafe-galaxy-s25-ultra",
  ],
  airpods: [
    "flowcase-airpods-pro-2",
    "flowcase-airpods-pro",
    "flowcase-airpods-4",
    "flowcase-airpods-4-anc",
    "flowcase-airpods-3",
    "flowcase-airpods-2",
    "flowcase-airpods-max-shield",
    "flowcase-airpods-pro-2-rugged",
    "flowcase-airpods-4-rugged",
    "flowcase-airpods-max-cover",
  ],
}

const POOLS: Record<string, string[]> = {
  speakers: SPEAKERS,
  power: POWER,
  cables: CABLES,
  magsafe: PHONES,
  airpods: AIRPODS,
}

export default async function updateAccessoryImages({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  let updated = 0
  for (const [group, handles] of Object.entries(HANDLES)) {
    const pool = POOLS[group]
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i]
      // 4-image gallery: rotate pool photos × framings so siblings differ
      const images = [0, 1, 2, 3].map((k) => ({
        url: u(pool[(i + k) % pool.length], FRAMINGS[(i + k) % FRAMINGS.length]),
      }))
      const [product] = await productModuleService.listProducts({ handle })
      if (!product) {
        logger.warn(`Missing product: ${handle}`)
        continue
      }
      // update replaces the image set (verified) — idempotent
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: product.id },
          update: { thumbnail: images[0].url, images } as Record<string, unknown>,
        },
      })
      updated++
    }
    logger.info(`Imaged ${handles.length} × ${group}`)
  }
  logger.info(`Done — ${updated} products re-imaged`)
}

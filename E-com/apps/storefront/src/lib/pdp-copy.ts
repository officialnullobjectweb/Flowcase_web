import type { Product } from "./types"

export type PdpKind =
  | "phone-case"
  | "magsafe-cases"
  | "airpods-cases"
  | "cables"
  | "powerbank"
  | "speakers"

/** Same tag → kind mapping the DB category script uses, so copy matches admin. */
export function pdpKind(p: Product): PdpKind {
  const t = new Set((p.tags ?? []).map((x) => x.value.toLowerCase()))
  if (t.has("magsafe")) return "magsafe-cases"
  if (t.has("airpods")) return "airpods-cases"
  if (t.has("cable") || t.has("cables")) return "cables"
  if (t.has("powerbank") || t.has("power-bank")) return "powerbank"
  if (t.has("speaker") || t.has("speakers")) return "speakers"
  return "phone-case"
}

export interface PdpCopy {
  highlights: { term: string; detail: string }[]
  banners: { eyebrow: string; title: string; copy: string; image: string; alt: string }[]
  snippets: { name: string; title: string; body: string }[]
  ringLabels: [string, string, string, string]
  faq: { title: string; content: string }[]
  detailsFallback: string
}

const modelOf = (p: Product) => p.title.replace(/^Flowcase for\s+/i, "")
const mAhOf = (p: Product) => p.title.match(/(\d{4,6})\s?mAh/i)?.[1] ?? "10000"

const CASE_BANNERS = [
  {
    eyebrow: "Protection",
    title: "Armour where it counts",
    copy: "Air-cushioned corners absorb a 3m drop, and a raised lip keeps the camera glass off the table.",
    image:
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200&q=80&auto=format&fit=crop",
    alt: "Close-up of a protective phone case corner",
  },
  {
    eyebrow: "Everyday carry",
    title: "Slim by design",
    copy: "A 1.2mm profile that disappears in your pocket — wireless and MagSafe charging pass straight through.",
    image:
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&q=80&auto=format&fit=crop",
    alt: "Slim phone case held in hand",
  },
]

const REVIEWERS = [
  "Ananya G.",
  "Vikram T.",
  "Sara L.",
  "Imran H.",
  "Priyanka D.",
  "Joseph M.",
  "Lena K.",
  "Harsh V.",
]

function pick<T>(pool: T[], count: number): T[] {
  return Array.from({ length: count }, (_, i) => pool[i % pool.length])
}

export function pdpCopy(p: Product): PdpCopy {
  const model = modelOf(p)
  switch (pdpKind(p)) {
    case "magsafe-cases":
      return {
        highlights: [
          { term: "Compatibility", detail: model },
          { term: "Magnet", detail: "N52 ring · locks to chargers, wallets, mounts" },
          { term: "Material", detail: "Polycarbonate shell + TPU core" },
          { term: "Protection", detail: "3m drop-tested · raised camera lip" },
          { term: "In the box", detail: "1 × Flowcase MagSafe case" },
        ],
        banners: [
          {
            eyebrow: "Magnet first",
            title: "Clicks on, holds on",
            copy: "The N52 ring lines up with your charger, wallet or car mount every time — and holds like it means it.",
            image: CASE_BANNERS[0].image,
            alt: "Close-up of a MagSafe phone case corner",
          },
          {
            eyebrow: "Charge through",
            title: "Never take it off",
            copy: "Qi and MagSafe charge at full speed through the shell — the ring sits flush, the case stays on.",
            image: CASE_BANNERS[1].image,
            alt: "Slim MagSafe case charged wirelessly",
          },
        ],
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "The magnet is the real thing", body: "Wallet snaps on and stays on over speed breakers. No creep, no sag, no sliding around." },
            { name: REVIEWERS[1], title: "Charges without removing", body: "Drop it on the car mount or the desk pad and it just aligns. I stopped taking the case off entirely." },
            { name: REVIEWERS[3], title: "Slim despite the ring", body: "You can't feel the magnet ring inside — profile is the same as my old non-MagSafe case." },
            { name: REVIEWERS[4], title: "Arrived in 48 hours", body: "Packed in cardboard with the REUSE10 return envelope. Exchanged my old case the same week." },
            { name: REVIEWERS[6], title: "Holds the heavy wallet", body: "Three cards in the folio and it still doesn't budge on the mount. That's the N52 ring doing its job." },
            { name: REVIEWERS[7], title: "Drop-tested for real", body: "Phone slipped off the mount onto tarmac — case scuffed, glass perfect. Exactly the trade I wanted." },
          ],
          6
        ),
        ringLabels: ["Magnet", "Quality", "Grip", "Protection"],
        faq: [
          {
            title: "How strong is the magnet?",
            content:
              "An N52 ring rated to hold a mounted phone over rough roads — strong enough for car mounts and wallets, still easy to peel off by hand.",
          },
          {
            title: "Does it charge through the case?",
            content:
              "Yes. Qi and MagSafe charging pass straight through the shell — no need to remove it, full charging speed.",
          },
          {
            title: "How fast will my order arrive?",
            content:
              "Orders dispatch within 48 hours and deliver in 3–5 days across India. Shipping is free on orders over ₹999 — COD is available at checkout.",
          },
          {
            title: "What if it doesn't fit my phone?",
            content:
              "Every case is precision-cut for its exact model. If anything is off, return it within 7 days for a free replacement or full refund — prepaid returns included.",
          },
        ],
        detailsFallback:
          "A polycarbonate shell with a shock-absorbing TPU core and a built-in N52 magnet ring. Precision-cut for your exact model with reinforced camera rings, raised screen lips, and full wireless / MagSafe charging pass-through.",
      }

    case "airpods-cases":
      return {
        highlights: [
          { term: "Compatibility", detail: model },
          { term: "Material", detail: "Silicone shell + aluminium carabiner" },
          { term: "Protection", detail: "1.5 m drop-tested · soft-touch grip" },
          { term: "Access", detail: "Pairs and charges without removing the cover" },
          { term: "In the box", detail: "1 × cover + 1 × carabiner" },
        ],
        banners: [
          {
            eyebrow: "Drop protection",
            title: "The case that survives the fall",
            copy: "The charging case is the fragile part — a silicone shell with a shock-proof lip keeps it that way.",
            image: "https://cdn.stocksnap.io/img-thumbs/960w/DTPML21WLD.jpg",
            alt: "Wireless earbuds with protective cover",
          },
          {
            eyebrow: "Clip and go",
            title: "Never dig for it again",
            copy: "The carabiner clips to a bag strap or belt loop — your buds are one hand away, not buried under receipts.",
            image: "https://cdn.stocksnap.io/img-thumbs/960w/PQ1UK3LGOA.jpg",
            alt: "Earbuds ready to clip onto a bag",
          },
        ],
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "Snug, no bulk", body: "Cover slides on and stays on — the lid still clicks shut like nothing's there." },
            { name: REVIEWERS[1], title: "Survived the metro floor", body: "Case took a full drop onto platform tiles. Not a mark on it, buds unharmed." },
            { name: REVIEWERS[2], title: "Carabiner is the hero", body: "Clipped inside my bag strap. First week I stopped losing the case for good." },
            { name: REVIEWERS[3], title: "Pairs without removing", body: "Bluetooth connects and it charges on the pad with the cover on. Never take it off." },
            { name: REVIEWERS[5], title: "Grip that actually grips", body: "The silicone isn't slick — pulling it out of a pocket one-handed finally works." },
            { name: REVIEWERS[7], title: "Worth ₹500", body: "Cheaper than replacing a charging case. Fits the Pro 2 exactly, cutouts dead-centre." },
          ],
          6
        ),
        ringLabels: ["Fit", "Protection", "Value", "Quality"],
        faq: [
          {
            title: "Which AirPods does it fit?",
            content:
              "Every cover is moulded to one model — check the model name on this page and order the exact match. In-between fits are never right.",
          },
          {
            title: "Do I have to remove it to charge or pair?",
            content:
              "No — pairing, wireless charging and the case LED all work with the cover on.",
          },
          {
            title: "Is the carabiner included?",
            content:
              "Yes, one aluminium carabiner ships in the box. Clip it to a bag, belt loop, or key ring.",
          },
          {
            title: "What if it doesn't fit?",
            content:
              "Return it within 7 days for a free replacement or full refund — prepaid returns included.",
          },
        ],
        detailsFallback:
          "A soft-touch silicone shell moulded to your exact AirPods model, with a reinforced lip around the lid hinge, precise cutouts for the LED and pairing button, and an aluminium carabiner in the box.",
      }

    case "cables":
      return {
        highlights: [
          { term: "Connector", detail: /lightning/i.test(p.title) ? "USB-C → Lightning" : "USB-C → USB-C" },
          { term: "Output", detail: "Up to 240W PD fast charge" },
          { term: "Material", detail: "Double-braided nylon · 10,000-bend tested" },
          { term: "Length", detail: p.title.match(/(\d+(?:\.\d+)?)\s?m\b/i)?.[1] ? `${p.title.match(/(\d+(?:\.\d+)?)\s?m\b/i)![1]} m` : "1.5 m" },
          { term: "In the box", detail: "1 × Flowcase braided cable" },
        ],
        banners: [
          {
            eyebrow: "Built to bend",
            title: "Braided to survive the bag",
            copy: "Double-braided nylon over a tinned copper core — rated for 10,000 bends, not a single careful year.",
            image:
              "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzNTEtaW1hZ2UuanBn.jpg",
            alt: "Braided charging cable close-up",
          },
          {
            eyebrow: "Fast charge",
            title: "240W in a hurry",
            copy: "Full PD throughput for laptops, phones and buds — one cable on the desk replaces the drawer of others.",
            image:
              "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTMzMDYxMC1pbWFnZS1rd3Z3MjZtdS5qcGc.jpg",
            alt: "USB charging cable coiled on a desk",
          },
        ],
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "The braid feels serious", body: "Thick weave, no kinks when it lives coiled in a bag. The old rubber ones always frayed at the ends." },
            { name: REVIEWERS[1], title: "Actually charges the laptop", body: "MacBook goes from dead to full on this alone — no charger-brick drama." },
            { name: REVIEWERS[2], title: "Perfect length", body: "1.5 m reaches the bed socket without a metre of slack on the floor." },
            { name: REVIEWERS[4], title: "Bends without dying", body: "Folded it in the same spot for months — no split jacket, no intermittent charge." },
            { name: REVIEWERS[6], title: "Replaced the whole drawer", body: "One of these per desk now. Fast enough for everything I own, and it doesn't tangle." },
            { name: REVIEWERS[7], title: "Connector seats tight", body: "Clicks in and stays — no wobble, no waking up to 8% battery." },
          ],
          6
        ),
        ringLabels: ["Durability", "Speed", "Value", "Quality"],
        faq: [
          {
            title: "Does it really support fast charging?",
            content:
              "Yes — up to 240W Power Delivery with compatible chargers and devices, and full speed for phones at 20W+.",
          },
          {
            title: "Will it fit through a case cutout?",
            content:
              "The connector head is slim enough for cases up to 3mm — no need to strip the case off to charge.",
          },
          {
            title: "How long is it?",
            content:
              "Each listing shows its length in the title — 1.5 m suits desks and bedsides; pick longer for sofas.",
          },
          {
            title: "What if it fails?",
            content:
              "Cables are covered by the same 7-day return window — prepaid return, replacement or full refund.",
          },
        ],
        detailsFallback:
          "Double-braided nylon over a tinned copper core, with moulded strain relief at both ends. Rated for 10,000 bend cycles and up to 240W Power Delivery.",
      }

    case "powerbank":
      return {
        highlights: [
          { term: "Capacity", detail: `${mAhOf(p)} mAh` },
          { term: "Output", detail: "22.5W fast charge · USB-C PD" },
          { term: "Ports", detail: "USB-C in/out + USB-A" },
          { term: "Safety", detail: "Over-charge, over-discharge & short-circuit protection" },
          { term: "In the box", detail: "1 × power bank + USB-C cable" },
        ],
        banners: [
          {
            eyebrow: "Real capacity",
            title: "Rated in charges, not slides",
            copy: `${mAhOf(p)}mAh you can count — enough to take a phone from empty to full, again and again, away from a socket.`,
            image:
              "https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHgxNTk1NjIwLWltYWdlLWt3dnZyZmdjLmpwZw.jpg",
            alt: "Portable power bank charging a phone",
          },
          {
            eyebrow: "Fast top-up",
            title: "22.5W and moving",
            copy: "USB-C PD refills the bank and your phone at the same time — half a charge in the time it takes to coffee.",
            image:
              "https://live.staticflickr.com/3868/14990708065_b62dbab933_b.jpg",
            alt: "Power bank with charging cable",
          },
        ],
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "Survives a full travel day", body: "Phone, buds, and a top-up for my friend's — still had a bar left at the hotel." },
            { name: REVIEWERS[1], title: "Fast charge is real", body: "Screen shows the fast-charge icon on both ends. Laptop-class speed for the phone." },
            { name: REVIEWERS[3], title: "Light for the capacity", body: "Fits the jacket pocket and doesn't drag it down. The mAh actually feels usable." },
            { name: REVIEWERS[4], title: "Came with the cable", body: "USB-C cable in the box — I didn't have to hunt the drawer for one." },
            { name: REVIEWERS[6], title: "Airline-approved size", body: "Security didn't blink at it — under 100Wh, straight through the scanner." },
            { name: REVIEWERS[7], title: "Still strong after months", body: "No swelling, no heat panic, no mystery drain sitting in the bag." },
          ],
          6
        ),
        ringLabels: ["Capacity", "Speed", "Value", "Build"],
        faq: [
          {
            title: "How many charges will I get?",
            content:
              `About ${Math.max(1, Math.round(Number(mAhOf(p)) / 4500))} full phone charges — real-world efficiency runs ~70% after conversion loss.`,
          },
          {
            title: "Can I take it on a flight?",
            content:
              "Yes. Under 100Wh it goes in carry-on luggage with security screening — never in checked bags.",
          },
          {
            title: "Does it charge while it charges?",
            content:
              "Yes — pass-through charging lets the bank refill overnight while topping up your phone.",
          },
          {
            title: "What if it fails?",
            content:
              "Return it within 7 days for a free replacement or full refund — prepaid returns included.",
          },
        ],
        detailsFallback:
          `A ${mAhOf(p)}mAh cell with 22.5W USB-C Power Delivery, dual USB-A output, and layered protection against over-charge, over-discharge, overheating and short circuits.`,
      }

    case "speakers":
      return {
        highlights: [
          { term: "Playtime", detail: "12–24 hours per charge" },
          { term: "Connection", detail: "Bluetooth 5.3 · 10 m range" },
          { term: "Audio", detail: "Dual drivers · passive bass radiator" },
          { term: "Durability", detail: "IPX6 splash-proof shell" },
          { term: "In the box", detail: "1 × speaker + USB-C cable" },
        ],
        banners: [
          {
            eyebrow: "Room-filling",
            title: "Small box, big air",
            copy: "Dual drivers and a passive radiator push sound past the size — kitchen counter to courtyard, no strain.",
            image: "https://cdn.stocksnap.io/img-thumbs/960w/95WAF830WN.jpg",
            alt: "Portable Bluetooth speaker close-up",
          },
          {
            eyebrow: "All day",
            title: "12 hours, no plug",
            copy: "One charge covers the playlist — and IPX6 shrugs off the sink, the rain, and the poolside splash.",
            image:
              "https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjY4LWltYWdlLmpwZw.jpg",
            alt: "Portable speakers in different colours",
          },
        ],
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "Punches way above size", body: "Filled the living room without buzzing. Bass stays clean at volumes that should rattle it." },
            { name: REVIEWERS[1], title: "Pairs instantly", body: "Open the lid, it's connected. Switching between phone and tablet just works." },
            { name: REVIEWERS[2], title: "Battery matches the claim", body: "Beach afternoon into the night and it still had charge — no charger anxiety." },
            { name: REVIEWERS[4], title: "Survived the splash", body: "Rained on during the trek, wiped it dry, kept playing. IPX6 earned its keep." },
            { name: REVIEWERS[6], title: "Goes in the backpack", body: "Roughly a can of cola, lighter than one. It's been in the bag for every trip since." },
            { name: REVIEWERS[7], title: "Worth it over no-name", body: "Clear calls on speaker too — the mic actually picks me up in a noisy room." },
          ],
          6
        ),
        ringLabels: ["Sound", "Battery", "Value", "Build"],
        faq: [
          {
            title: "How far does Bluetooth reach?",
            content:
              "Bluetooth 5.3 holds a steady connection up to about 10 m through a wall — across a room, it never drops.",
          },
          {
            title: "How long does a charge last?",
            content:
              "12–24 hours depending on volume — at moderate levels it outlasts a full day out.",
          },
          {
            title: "Can it get wet?",
            content:
              "IPX6 handles splashes, rain and shower singalongs. It floats, but it isn't for submersion.",
          },
          {
            title: "What if it doesn't impress me?",
            content:
              "Return it within 7 days for a free replacement or full refund — prepaid returns included.",
          },
        ],
        detailsFallback:
          "Dual full-range drivers behind a passive bass radiator, Bluetooth 5.3 with multipoint pairing, a 12–24 hour cell, and an IPX6 shell built for parks, pools and monsoon balconies.",
      }

    default:
      return {
        highlights: [
          { term: "Compatibility", detail: model },
          { term: "Material", detail: "Polycarbonate shell + TPU core" },
          { term: "Protection", detail: "3m drop-tested · raised camera lip" },
          { term: "Charging", detail: "Wireless & MagSafe compatible" },
          { term: "In the box", detail: "1 × Flowcase case" },
        ],
        banners: CASE_BANNERS,
        snippets: pick(
          [
            { name: REVIEWERS[0], title: "Snug fit, zero rattle", body: "The lip sits flush over the screen and the buttons don't mush. Feels like it shipped with the phone." },
            { name: REVIEWERS[1], title: "Dropped it twice already", body: "Corner-first onto tile both times — no cracks, just a small scuff. That's exactly what I paid for." },
            { name: REVIEWERS[2], title: "Matte back beats glossy", body: "No fingerprint smear after a full day of messaging, and it doesn't slide off the gym bench." },
            { name: REVIEWERS[3], title: "Camera ring is the detail", body: "Raised enough to protect the lens on a flat table, thin enough not to catch on pockets." },
            { name: REVIEWERS[5], title: "Grip ribs actually grip", body: "One-hand scroll on the metro without the death grip. Slight texture, not sticky." },
            { name: REVIEWERS[7], title: "Worth the premium", body: "Had a cheap TPU before this — buttons wore out in months. This still feels new after a year." },
          ],
          6
        ),
        ringLabels: ["Quality", "Pricing", "Grip", "Protection"],
        faq: [
          {
            title: "Does it work with wireless charging?",
            content:
              "Yes. The case is under 1.3mm thick with no metal in the shell, so Qi and MagSafe charging pass through without removing it.",
          },
          {
            title: "How fast will my order arrive?",
            content:
              "Orders dispatch within 48 hours and deliver in 3–5 days across India. Shipping is free on orders over ₹999 — COD is available at checkout.",
          },
          {
            title: "What if the case doesn't fit my phone?",
            content:
              "Every case is precision-cut for its exact model. If anything is off, return it within 7 days for a free replacement or full refund — prepaid returns included.",
          },
          {
            title: "Will the case yellow over time?",
            content:
              "Clear shells use a UV-resistant coating that slows yellowing dramatically. If yours yellows within a year, we replace it free.",
          },
        ],
        detailsFallback:
          "Built from a polycarbonate shell with a shock-absorbing TPU core. Precision-cut for your exact model with reinforced camera rings, raised screen lips, and full wireless / MagSafe charging pass-through.",
      }
  }
}

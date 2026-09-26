# Flowcase build checklist

## ✅ Applied

- Playwright UI/UX loop on all pages and devices (QA 33/33 · audit 18 pages × 4 viewports: 0 overflow / 0 HTTP / 0 axe)
- All products and images added (15 products, seeded with imagery + assignable badges)
- World-class responsive navbar and footer
- Header: transparent at top with white text → solid white with black text on scroll; announcement bar collapses smoothly; header holds only essentials
- Home hero: full-screen, 2 lazy-loaded speed-optimised videos, content + CTAs anchored at the bottom
- Main menu hover: 50/50 Apple/Samsung mega — left image column, right model list, hovering a model swaps the image (contained overlay, no page push)
- Mobile main menu: full-page (not collapsible) → links to shop with brand filter auto-applied (apple/samsung) + model selector
- Filters: custom on all devices — mobile bottom sheet with colour swatches, ratings, review count, price slider, clear-all; desktop anchored panel + sort dropdown
- Custom UI components used instead of browser defaults: dropdown, calendar, dialog, accordion, slider, toast (native `<select>` in checkout replaced this batch)
- Sustainability section/page: premium, visual-first, reuse process, savings + REUSE10 10% coupon flow
- Horizontal scrolling fixed (0 issues across audit)
- Hero content/CTA bottom-aligned
- Footer: collapsible category columns on mobile (static from sm up), single social platform = Instagram
- Pricing: all Indian (INR ₹) — catalog, filters, Razorpay paise conversion, coupons
- Marketplace-grade sections (research: Amazon/Flipkart/Myntra patterns):
  - PDP: delivery estimate + returns near CTA, 4-item trust row, sticky mobile add-to-cart bar (thumb zone), visual feature banners, highlights spec list, objection-led FAQ accordion, product OG image
  - Shop: editorial visual banner pair mid-grid (reuse programme + new drops)
  - Cart: trust/payment strip (free shipping, returns, COD, UPI)
  - Checkout: state picker via custom Dropdown, secure-payment line
- SEO/OpenGraph: metadataBase, OpenGraph + Twitter cards, keywords, per-product OG images
- Vercel free-tier config: `vercel.json` (framework, video caching, security headers)
- Medusa: storefront connected (`MEDUSA_BACKEND_URL`, publishable key), admin panel running at http://localhost:9000/app
- Mobile & tablet first for everything built from now on; desktop is the refinement pass

## 🔄 Ongoing rules

- Every new screen/section: mobile → tablet → desktop, minimal + premium, UX rules, visual alignment, accessibility (axe-green)
- Content & SEO via available opencode skills whenever new pages/copy are added
- Use `@dietrichgebert/ponytail` plugin conventions for all code (minimal, no over-engineering)

## 📦 Deploy notes (Vercel free tier)

- Set env vars on Vercel: `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (deployed Medusa URL), `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_SITE_URL`, optional `CLOUDINARY_*`
- Medusa admin: run backend (`npm run start` in `apps/backend`) → http://localhost:9000/app






## changes on the desktop view only
1. navbar: 
- provide only hover to the layout to this main menu: "samasung", "apple" also improve the layout design and make it more premium
- when i click on the search icon button then please make sure that the input box of search must be autofoucs insted i have to clikc on it







## in mobile and tablet view changes
1. the hamber must has remove this "more" entire category and provide a card of account with icon so that it feels premium.

## changes across device
1. hero section of the home page
- the paganation must be a 3 px lengh horizontal line and make it super minimal and opacity must be list be loweer and when i hover then show it perfect

2. home page all section is not perfectly sequancies which doesn't commmunicate or feel premium and minimal

3. "05 — Collections" in this section i want you to provide a dropdown for mobile phone model selector based on the apple and samsung so please provide it so that user directly select the model of phone and they will directly see all the cases available

eg. if i select the model from the card of brand name of mobile (samsung, apple) then show me all product of that model only.

4. "07 — Reviews" reduce the speed of this marquee to feel premium and minimal and provide a image of the product as well and all the review (write review) must have upload images of product as well

5. "10 — Ready when you are" this has a same colour and foooter also has the same thing so user might feel the black colour more used to abuse the brand colour so please make you provide a fix 

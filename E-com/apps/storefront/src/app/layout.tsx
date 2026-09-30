import type { Metadata } from "next"
import { Archivo, IBM_Plex_Mono, Nunito_Sans } from "next/font/google"
import { CartDrawer } from "@/components/CartDrawer"
import { Footer } from "@/components/Footer"
import { SiteHeader } from "@/components/SiteHeader"
import { JsonLd } from "@/components/JsonLd"
import { Clarity } from "@/components/Clarity"
import { getNavModels } from "@/lib/api"
import { getCms } from "@/lib/cms"
import { CartProvider } from "@/context/CartContext"
import { WishlistProvider } from "@/context/WishlistContext"
import { AuthProvider } from "@/context/AuthContext"
import { ToastProvider } from "@/components/ui/toast"
import { PromoModal } from "@/components/PromoModal"
import "./globals.css"

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["500", "600", "700"],
})

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: ["400", "500", "600", "700"],
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

const SITE_TITLE = "Flowcase — Phone Cases, Speakers, Power Banks & Accessories"
const SITE_DESCRIPTION =
  "Shop drop-tested iPhone & Samsung cases, Bluetooth speakers, power banks, braided cables, MagSafe & AirPods cases. Free shipping over ₹999 · COD available."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Flowcase",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "phone cases",
    "iPhone 17 case",
    "iPhone 16 case",
    "Samsung Galaxy S25 case",
    "drop-tested cases",
    "India",
  ],
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: [
      { url: "/fevicon.png", sizes: "any" },
      { url: "/fevicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/fevicon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Flowcase",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Flowcase — Go With Flow" }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
}

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Flowcase",
      url: SITE_URL,
      slogan: "Go With Flow",
      logo: `${SITE_URL}/fevicon.png`,
      sameAs: ["https://instagram.com"],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@flowcase.in",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: "en",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#site`,
      url: SITE_URL,
      name: "Flowcase",
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={query}` },
        "query-input": "required name=query",
      },
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [navModels, cms] = await Promise.all([getNavModels(), getCms()])
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${nunito.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Hero posters/videos load from Cloudinary — warm the connection early */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <JsonLd data={ORG_JSONLD} />
        <CartProvider>
          <WishlistProvider>
            <AuthProvider>
              <ToastProvider>
                <SiteHeader models={navModels} announcement={cms.announcement} />
                <main>{children}</main>
                <Footer />
                <CartDrawer />
                <PromoModal promo={cms.promo} />
              </ToastProvider>
            </AuthProvider>
          </WishlistProvider>
        </CartProvider>
        <Clarity />
      </body>
    </html>
  )
}

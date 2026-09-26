import type { Metadata } from "next"
import { Archivo, IBM_Plex_Mono, Nunito_Sans } from "next/font/google"
import { CartDrawer } from "@/components/CartDrawer"
import { Footer } from "@/components/Footer"
import { SiteHeader } from "@/components/SiteHeader"
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

const SITE_TITLE = "Flowcase — Cases that move at your pace"
const SITE_DESCRIPTION =
  "Premium protective cases for iPhone 15–17 and Samsung Galaxy A & S series. Slim profiles, drop-tested corners, zero bulk. Go With Flow."

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
  openGraph: {
    type: "website",
    siteName: "Flowcase",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/fevicon%20to%20be%20made.png", width: 4096, height: 4096, alt: "Flowcase" }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/fevicon%20to%20be%20made.png"],
  },
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
      </body>
    </html>
  )
}

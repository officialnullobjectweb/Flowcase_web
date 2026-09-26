import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flowcase — Cases that move at your pace",
    short_name: "Flowcase",
    description:
      "Premium protective cases for iPhone 15–17 and Samsung Galaxy A & S series. Go With Flow.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/fevicon.png", sizes: "192x192", type: "image/png" },
      { src: "/fevicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}

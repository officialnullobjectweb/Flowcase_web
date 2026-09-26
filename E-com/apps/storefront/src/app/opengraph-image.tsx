import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Branded social share card — Flowcase wordmark + tagline + proof points.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fff",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
          Flowcase.
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 2, color: "rgba(255,255,255,0.6)" }}>
            GO WITH FLOW
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              marginTop: 12,
            }}
          >
            Cases that move at your pace.
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 28, fontSize: 26, color: "rgba(255,255,255,0.75)" }}>
            <span>2.5 m drop-tested</span>
            <span>Free shipping over ₹999</span>
            <span>REUSE10 — 10% back</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

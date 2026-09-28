"use client"

import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { useState } from "react"
import { Accordion } from "./ui/accordion"
import { SectionHeader } from "./SectionHeader"
import type { CmsPdp } from "@/lib/cms"
import { pdpCopy } from "@/lib/pdp-copy"
import type { Product } from "@/lib/types"

export function FeatureBanners({ product }: { product: Product }) {
  const BANNERS = pdpCopy(product).banners
  return (
    <section aria-label="Product features" className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6">
      {BANNERS.map((b, i) => (
        <motion.article
          key={b.title}
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25, margin: "0px 0px -60px 0px" }}
          transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="group relative isolate flex min-h-72 items-end overflow-hidden bg-hero-ink sm:min-h-96"
        >
          <motion.div
            initial={{ scale: 1.12 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.25, margin: "0px 0px -60px 0px" }}
            transition={{ duration: 1.2, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            aria-hidden="true"
          >
            <Image
              src={b.image}
              alt={b.alt}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
            />
          </motion.div>
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25, margin: "0px 0px -60px 0px" }}
            transition={{ duration: 0.7, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 p-6 sm:p-8"
          >
            <p className="label flex items-center gap-3 text-white/70">
              <span className="h-1.5 w-1.5 bg-foreground" aria-hidden="true" />
              {b.eyebrow}
            </p>
            <h2 className="display-tight mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
              {b.title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">{b.copy}</p>
          </motion.div>
        </motion.article>
      ))}
    </section>
  )
}

/**
 * Tabbed details block: "Highlights" (spec rows) and "Full details"
 * (long-form copy). Content comes from the admin panel's Site CMS page
 * when set, otherwise falls back to the product itself.
 */
export function DetailsTabs({ product, pdp }: { product: Product; pdp?: CmsPdp }) {
  const [tab, setTab] = useState<"highlights" | "details">("highlights")
  const copy = pdpCopy(product)
  const rows = pdp?.highlights?.length
    ? pdp.highlights.filter((r) => r.term?.trim() || r.detail?.trim())
    : copy.highlights
  const full = pdp?.details?.trim() || product.description?.trim() || ""
  const fallback = copy.detailsFallback

  const tabs = [
    { key: "highlights" as const, label: "Highlights" },
    { key: "details" as const, label: "Full details" },
  ]

  return (
    <section aria-label="Product details" className="mt-16">
      <SectionHeader label="Details" title="The specifics" />
      <div role="tablist" aria-label="Product details tabs" className="mt-6 flex gap-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`pdp-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`pdp-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`label -mb-px border-b-2 pb-3 transition ${
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          id={`pdp-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`pdp-tab-${tab}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {tab === "highlights" ? (
            <dl className="mt-6 border-t border-border">
              {rows.map((row) => (
                <div
                  key={`${row.term}-${row.detail}`}
                  className="grid gap-1 border-b border-border py-4 sm:grid-cols-3 sm:gap-6"
                >
                  <dt className="label text-muted-foreground">{row.term}</dt>
                  <dd className="text-sm text-foreground sm:col-span-2">{row.detail}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="border-b border-border py-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {full || fallback}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

export function PdpFaq({ product }: { product: Product }) {
  const FAQ = pdpCopy(product).faq
  return (
    <section aria-label="Frequently asked questions" className="mt-16">
      <SectionHeader label="Before you buy" title="Good questions" />
      <div className="mt-6">
        <Accordion items={FAQ} />
      </div>
    </section>
  )
}

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"
import type { CmsConfig, CmsSlide } from "../../../lib/cms"
import { sdk } from "../../lib/sdk"

const PAGES: { key: string; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "shop", label: "Shop" },
  { key: "cart", label: "Cart" },
  { key: "product", label: "Product page" },
]

const TABS = ["announcement", "promo", "heroes", "pdp", "payments"] as const
type Tab = (typeof TABS)[number]
const TAB_LABELS: Record<Tab, string> = {
  announcement: "Announcement bar",
  promo: "Popup offer",
  heroes: "Hero videos",
  pdp: "Product page",
  payments: "Payments",
}

function fetchCms(): Promise<CmsConfig> {
  return sdk.client.fetch<CmsConfig>("/admin/cms", {
    headers: { accept: "application/json" },
  })
}

function Row({
  label,
  children,
}: {
  label: string
  children?: ReactNode
  key?: string
}) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[220px_1fr] sm:items-center">
      <Label className="text-ui-fg-subtle">{label}</Label>
      <div>{children}</div>
    </div>
  )
}

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children?: ReactNode
  key?: string
}) {
  return (
    <label className="mr-4 inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-black"
      />
      {children}
    </label>
  )
}

/** announcement bar mock — same look as the storefront strip */
function AnnouncementPreview({ a }: { a: CmsConfig["announcement"] }) {
  const items = a.messages.filter((m) => m.text.trim())
  const segment = items.map((m) => m.text).join("   ·   ")
  const show = a.enabled && items.length > 0
  return (
    <div className="overflow-hidden rounded-md bg-hero-ink px-4 py-2 text-center">
      {!show ? (
        <span className="text-xs text-white/40">Bar disabled — nothing renders</span>
      ) : a.marquee && items.length > 0 ? (
        <div className="relative flex overflow-hidden whitespace-nowrap">
          <style>{`@keyframes fc-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
          <div
            className="flex shrink-0 gap-10 pr-10"
            style={{ animation: `fc-marquee ${a.speed || 24}s linear infinite` }}
          >
            {[0, 1].map((dup) => (
              <span
                key={dup}
                className="text-xs uppercase tracking-widest text-white/90"
              >
                {segment}
                {dup === 0 ? "   ·   " : ""}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs uppercase tracking-widest text-white/90">{segment}</p>
      )}
    </div>
  )
}

function PromoPreview({ p }: { p: CmsConfig["promo"] }) {
  if (!p.enabled) {
    return (
      <div className="rounded-md border border-dashed border-ui-border-strong p-8 text-center">
        <Text className="text-ui-fg-subtle">Popup disabled — nothing renders</Text>
      </div>
    )
  }
  return (
    <div className="flex min-h-[260px] items-center justify-center bg-ui-bg-subtle p-6">
      <div className="relative w-full max-w-sm rounded-xl border border-ui-border-base bg-white p-5 shadow-lg">
        <span className="absolute right-3 top-3 text-ui-fg-muted">✕</span>
        {p.image ? (
          <img
            src={p.image}
            alt=""
            className="mb-4 h-36 w-full rounded-lg object-cover"
          />
        ) : null}
        <p className="text-lg font-semibold text-black">{p.title || "Offer title"}</p>
        <p className="mt-1 text-sm text-black/60">{p.body}</p>
        {p.cta_label ? (
          <span className="mt-4 inline-flex h-9 items-center rounded-full bg-black px-5 text-xs uppercase tracking-widest text-white">
            {p.cta_label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PdpPreview({ p }: { p: CmsConfig["pdp"] }) {
  const rows = p.highlights.filter(
    (row) => row.term.trim() || row.detail.trim()
  )
  const cats = p.categories.filter((c) => c.trim())
  return (
    <div className="rounded-md border border-ui-border-base bg-white p-5 text-black">
      <div className="flex gap-5 border-b border-black/10 pb-2 text-xs uppercase tracking-widest">
        <span className="border-b-2 border-black pb-1 font-semibold">
          Highlights
        </span>
        <span className="text-black/40">Full details</span>
        <span className="text-black/40">Reviews</span>
      </div>
      {rows.length ? (
        <dl className="mt-3 space-y-2 text-sm">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex justify-between gap-6 border-b border-dashed border-black/10 pb-1.5"
            >
              <dt className="font-medium">{row.term || "Term"}</dt>
              <dd className="text-right text-black/60">{row.detail || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-black/40">
          No rows — each product derives its own highlights.
        </p>
      )}
      <p className="mt-4 line-clamp-3 text-sm text-black/60">
        {p.details ||
          "(empty — every product falls back to its own description)"}
      </p>
      {cats.length > 0 && (
        <div
          className={
            p.carousel
              ? "mt-4 flex gap-3 overflow-x-auto pb-1"
              : "mt-4 flex flex-wrap gap-3"
          }
        >
          {cats.map((cat, i) => (
            <div
              key={i}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2 border-black/15 text-center"
            >
              <span className="text-sm font-bold">
                {(4.9 - i * 0.2).toFixed(1)}
              </span>
              <span className="px-1 text-[9px] leading-tight text-black/50">
                {cat}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-black/30">
        preview · sample scores
      </p>
    </div>
  )
}

function SlideEditor({
  slides,
  onChange,
}: {
  slides: CmsSlide[]
  onChange: (s: CmsSlide[]) => void
}) {
  const patch = (i: number, p: Partial<CmsSlide>) =>
    onChange(slides.map((s, idx) => (idx === i ? { ...s, ...p } : s)))
  return (
    <div className="space-y-4">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-md border border-ui-border-base p-4">
          <div className="mb-2 flex items-center justify-between">
            <Text className="font-medium">Slide {i + 1}</Text>
            {slides.length > 1 ? (
              <Button
                variant="transparent"
                size="small"
                onClick={() => onChange(slides.filter((_, idx) => idx !== i))}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Input
              size="small"
              placeholder="Video URL (mp4)"
              value={slide.src}
              onChange={(e) => patch(i, { src: e.target.value })}
            />
            <Input
              size="small"
              placeholder="Poster image URL"
              value={slide.poster}
              onChange={(e) => patch(i, { poster: e.target.value })}
            />
            <Input
              size="small"
              placeholder="Alt text"
              value={slide.alt}
              onChange={(e) => patch(i, { alt: e.target.value })}
            />
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        size="small"
        onClick={() =>
          onChange([...slides, { src: "", poster: "", alt: "" } as CmsSlide])
        }
      >
        Add slide
      </Button>
    </div>
  )
}

export default function CmsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["cms-config"], queryFn: fetchCms })
  const [cfg, setCfg] = useState<CmsConfig | null>(null)
  const [tab, setTab] = useState<Tab>("announcement")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (query.data) setCfg(structuredClone(query.data))
  }, [query.data])

  const set = (fn: (draft: CmsConfig) => void) =>
    setCfg((cur) => {
      if (!cur) return cur
      const next = structuredClone(cur)
      fn(next)
      return next
    })

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      await sdk.client.fetch("/admin/cms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: {
          announcement: cfg.announcement,
          promo: cfg.promo,
          heroes: cfg.heroes,
          pdp: cfg.pdp,
        } as never,
      })
      await queryClient.invalidateQueries({ queryKey: ["cms-config"] })
      toast.success("Saved — storefront refreshes within a few seconds")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (!cfg) {
    return (
      <Container>
        <Heading>Site CMS</Heading>
        <Text className="text-ui-fg-subtle">Loading configuration…</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading>Site CMS</Heading>
            <Text className="text-ui-fg-subtle">
            Announcement bar, popup offers, hero videos, product-page content and
            payment events — live on the storefront moments after you save.
            </Text>
          </div>
          <Button variant="primary" onClick={save} isLoading={saving}>
            Save changes
          </Button>
        </div>
        <div className="flex gap-1 border-b border-ui-border-base">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize transition ${
                tab === t
                  ? "border-b-2 border-ui-fg-base font-medium text-ui-fg-base"
                  : "text-ui-fg-muted hover:text-ui-fg-base"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === "announcement" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Row label="Bar">
                <Check
                  checked={cfg.announcement.enabled}
                  onChange={(v) => set((d) => void (d.announcement.enabled = v))}
                >
                  Show announcement bar
                </Check>
                <Check
                  checked={cfg.announcement.marquee}
                  onChange={(v) => set((d) => void (d.announcement.marquee = v))}
                >
                  Scrolling marquee
                </Check>
              </Row>
              <Row label="Pages">
                <div>
                  {PAGES.map((p) => (
                    <Check
                      key={p.key}
                      checked={cfg.announcement.pages.includes(p.key)}
                      onChange={(v) =>
                        set((d) => {
                          const pages = d.announcement.pages
                          d.announcement.pages = v
                            ? [...pages, p.key]
                            : pages.filter((x) => x !== p.key)
                        })
                      }
                    >
                      {p.label}
                    </Check>
                  ))}
                </div>
              </Row>
              <Row label="Marquee speed (s / loop)">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={6}
                    max={60}
                    value={cfg.announcement.speed}
                    onChange={(e) =>
                      set((d) => void (d.announcement.speed = Number(e.target.value)))
                    }
                    className="w-48 accent-black"
                  />
                  <span className="text-sm tabular-nums">
                    {cfg.announcement.speed}s
                  </span>
                </div>
              </Row>
              <Row label="Bar link">
                <Input
                  size="small"
                  placeholder="/shop — empty for no link"
                  value={cfg.announcement.link}
                  onChange={(e) =>
                    set((d) => void (d.announcement.link = e.target.value))
                  }
                />
              </Row>
              <Row label="Messages">
                <div className="space-y-2">
                  {cfg.announcement.messages.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        size="small"
                        placeholder="Bar text"
                        value={m.text}
                        onChange={(e) =>
                          set((d) => void (d.announcement.messages[i].text = e.target.value))
                        }
                      />
                      <Input
                        size="small"
                        placeholder="Link (optional)"
                        value={m.link ?? ""}
                        onChange={(e) =>
                          set((d) => void (d.announcement.messages[i].link = e.target.value))
                        }
                      />
                      {cfg.announcement.messages.length > 1 ? (
                        <Button
                          variant="transparent"
                          size="small"
                          onClick={() =>
                            set((d) =>
                              void (d.announcement.messages = d.announcement.messages.filter(
                                (_, idx) => idx !== i
                              ))
                            )
                          }
                        >
                          ✕
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      set((d) => void d.announcement.messages.push({ text: "", link: "" }))
                    }
                  >
                    Add message
                  </Button>
                </div>
              </Row>
            </div>
            <div>
              <Text className="mb-2 font-medium">Live preview</Text>
              <AnnouncementPreview a={cfg.announcement} />
              <Text className="mt-2 text-ui-fg-subtle">
                Rendered on:{" "}
                {cfg.announcement.pages.length
                  ? cfg.announcement.pages.join(", ")
                  : "nowhere (no pages selected)"}
              </Text>
            </div>
          </div>
        )}

        {tab === "promo" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Row label="Popup">
                <Check
                  checked={cfg.promo.enabled}
                  onChange={(v) => set((d) => void (d.promo.enabled = v))}
                >
                  Show offer popup
                </Check>
              </Row>
              <Row label="Image URL">
                <Input
                  size="small"
                  placeholder="https://… (optional)"
                  value={cfg.promo.image}
                  onChange={(e) => set((d) => void (d.promo.image = e.target.value))}
                />
              </Row>
              <Row label="Title">
                <Input
                  size="small"
                  value={cfg.promo.title}
                  onChange={(e) => set((d) => void (d.promo.title = e.target.value))}
                />
              </Row>
              <Row label="Body">
                <textarea
                  value={cfg.promo.body}
                  onChange={(e) => set((d) => void (d.promo.body = e.target.value))}
                  rows={3}
                  className="w-full rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2 text-sm"
                />
              </Row>
              <Row label="CTA">
                <div className="flex gap-2">
                  <Input
                    size="small"
                    placeholder="Button label"
                    value={cfg.promo.cta_label}
                    onChange={(e) => set((d) => void (d.promo.cta_label = e.target.value))}
                  />
                  <Input
                    size="small"
                    placeholder="/shop"
                    value={cfg.promo.cta_link}
                    onChange={(e) => set((d) => void (d.promo.cta_link = e.target.value))}
                  />
                </div>
              </Row>
              <Row label="Delay (seconds)">
                <Input
                  size="small"
                  type="number"
                  min={0}
                  max={60}
                  className="max-w-24"
                  value={cfg.promo.delay}
                  onChange={(e) =>
                    set((d) => void (d.promo.delay = Number(e.target.value) || 0))
                  }
                />
              </Row>
            </div>
            <div>
              <Text className="mb-2 font-medium">Live preview</Text>
              <PromoPreview p={cfg.promo} />
              <Text className="mt-2 text-ui-fg-subtle">
                Shows once per session, {cfg.promo.delay}s after landing. Visitors can
                dismiss it.
              </Text>
            </div>
          </div>
        )}

        {tab === "heroes" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <Text className="mb-2 font-medium">Home hero — rotating slides</Text>
                <SlideEditor
                  slides={cfg.heroes.home}
                  onChange={(s) => set((d) => void (d.heroes.home = s))}
                />
              </div>
              <div>
                <Text className="mb-2 font-medium">Shop hero — video</Text>
                <SlideEditor
                  slides={[cfg.heroes.shop]}
                onChange={(s) => set((d) => void (d.heroes.shop = s[0] ?? d.heroes.shop))}
                />
              </div>
            </div>
            <div>
              <Text className="mb-2 font-medium">Live preview</Text>
              <div className="grid aspect-video place-items-center gap-3 rounded-md bg-hero-ink p-6">
                <div className="flex w-full max-w-md gap-2 overflow-hidden rounded-md">
                  {(tab === "heroes" ? cfg.heroes.home : []).slice(0, 3).map((s, i) => (
                    <img
                      key={i}
                      src={s.poster || s.src}
                      alt={s.alt}
                      className="h-24 flex-1 rounded object-cover opacity-90"
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {[0, 1].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                    />
                  ))}
                </div>
                <span className="text-xs uppercase tracking-widest text-white/60">
                  Auto-rotates every 6s · tap dots to switch
                </span>
              </div>
            </div>
          </div>
        )}

        {tab === "pdp" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Row label="Highlights tab">
                <Text className="mb-2 text-ui-fg-subtle">
                  Term / detail rows. Leave empty to derive them from each product
                  automatically.
                </Text>
                <div className="space-y-2">
                  {cfg.pdp.highlights.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        size="small"
                        placeholder="Term (e.g. Material)"
                        value={row.term}
                        onChange={(e) =>
                          set((d) => void (d.pdp.highlights[i].term = e.target.value))
                        }
                      />
                      <Input
                        size="small"
                        placeholder="Detail"
                        value={row.detail}
                        onChange={(e) =>
                          set((d) => void (d.pdp.highlights[i].detail = e.target.value))
                        }
                      />
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() =>
                          set(
                            (d) =>
                              void (d.pdp.highlights = d.pdp.highlights.filter(
                                (_, idx) => idx !== i
                              ))
                          )
                        }
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      set((d) => void d.pdp.highlights.push({ term: "", detail: "" }))
                    }
                  >
                    Add row
                  </Button>
                </div>
              </Row>
              <Row label="Full details tab">
                <textarea
                  value={cfg.pdp.details}
                  onChange={(e) => set((d) => void (d.pdp.details = e.target.value))}
                  rows={6}
                  placeholder="Long-form copy for the Full details tab — leave empty to use each product's description."
                  className="w-full rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2 text-sm"
                />
              </Row>
              <Row label="Rating categories">
                <div className="space-y-2">
                  {cfg.pdp.categories.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        size="small"
                        placeholder="Category (e.g. Quality)"
                        value={c}
                        onChange={(e) =>
                          set((d) => void (d.pdp.categories[i] = e.target.value))
                        }
                      />
                      {cfg.pdp.categories.length > 1 ? (
                        <Button
                          variant="transparent"
                          size="small"
                          onClick={() =>
                            set(
                              (d) =>
                                void (d.pdp.categories = d.pdp.categories.filter(
                                  (_, idx) => idx !== i
                                ))
                            )
                          }
                        >
                          ✕
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => set((d) => void d.pdp.categories.push(""))}
                  >
                    Add category
                  </Button>
                </div>
              </Row>
              <Row label="Layout">
                <Check
                  checked={cfg.pdp.carousel}
                  onChange={(v) => set((d) => void (d.pdp.carousel = v))}
                >
                  Rating rings in a one-line horizontal carousel (all devices)
                </Check>
              </Row>
            </div>
            <div>
              <Text className="mb-2 font-medium">Live preview</Text>
              <PdpPreview p={cfg.pdp} />
              <Text className="mb-2 mt-6 font-medium">Where this shows</Text>
              <div className="space-y-3 text-sm text-ui-fg-subtle">
                <p>
                  <span className="text-ui-fg-base">Highlights / Full details</span> —
                  tabbed details section on every product page.
                </p>
                <p>
                  <span className="text-ui-fg-base">Rating categories</span> — the ring
                  meters in the reviews block, plus the review-card carousel.
                </p>
                <p>
                  <span className="text-ui-fg-base">Carousel option</span> — keeps the
                  rings on one horizontal line on phones and desktops instead of a
                  grid.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "payments" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Text className="text-ui-fg-subtle">
                Payment events from the Razorpay webhook — success &amp; failure, live.
              </Text>
              <Button
                variant="secondary"
                size="small"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["cms-config"] })}
              >
                Refresh
              </Button>
            </div>
            {query.data?.payments.length ? (
              <Table>
                <Table.Header>
                  <Table.HeaderCell>Time</Table.HeaderCell>
                  <Table.HeaderCell>Event</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Payment</Table.HeaderCell>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>Method</Table.HeaderCell>
                </Table.Header>
                <Table.Body>
                  {query.data.payments.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell>
                        {new Date(p.at).toLocaleString("en-IN")}
                      </Table.Cell>
                      <Table.Cell>{p.event}</Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={p.status === "success" ? "green" : "red"}
                          size="small"
                          rounded="full"
                        >
                          {p.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs">
                        {p.payment_id ?? "—"}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs">
                        {p.order_id ?? "—"}
                      </Table.Cell>
                      <Table.Cell>
                        {p.amount != null ? `₹${p.amount}` : "—"}
                      </Table.Cell>
                      <Table.Cell>{p.method ?? "—"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            ) : (
              <div className="rounded-md border border-dashed border-ui-border-strong p-10 text-center">
                <Text className="text-ui-fg-subtle">
                  No payment events yet — they appear here the moment Razorpay hits the
                  webhook.
                </Text>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Site CMS",
  icon: Sparkles,
  rank: 2,
})

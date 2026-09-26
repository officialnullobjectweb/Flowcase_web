import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

// Same palette the storefront uses for swatches (FilterSortBar).
const SWATCHES: Record<string, string> = {
  Onyx: "#141414",
  Glacier: "#dbe7e9",
  Sand: "#d9c9a8",
  Sage: "#a9b8a0",
  Blush: "#e6c9c9",
  Ocean: "#aec6d8",
}

interface Draft {
  images: string[]
  thumbnail: string | null
  colors: string[]
}

export default function ProductMediaWidget({
  data,
}: DetailWidgetProps<AdminProduct>) {
  const queryClient = useQueryClient()

  const productQuery = useQuery({
    queryKey: ["flowcase:product-media", data.id],
    queryFn: () =>
      sdk.admin.product.retrieve(data.id, {
        fields: "id,updated_at,images.id,images.url,thumbnail,metadata",
      }),
  })
  const product = productQuery.data?.product

  const [draft, setDraft] = useState<Draft | null>(null)
  const [url, setUrl] = useState("")
  const [color, setColor] = useState("")

  useEffect(() => {
    if (!product) return
    setDraft({
      images: (product.images ?? []).map((img) => img.url),
      thumbnail: product.thumbnail ?? null,
      colors: String(product.metadata?.colors ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    })
  }, [product?.id, product?.updated_at])

  const save = useMutation({
    mutationFn: async (next: Draft) => {
      await sdk.admin.product.update(data.id, {
        images: next.images.map((imageUrl) => ({ url: imageUrl })),
        thumbnail: next.thumbnail,
        // full metadata object — a partial update overwrites the column
        metadata: { ...(product?.metadata ?? {}), colors: next.colors.join(",") },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["flowcase:product-media"] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Saved", {
        description: "Images and colours live on the storefront right away.",
      })
    },
    onError: (error) =>
      toast.error("Save failed", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      }),
  })

  if (!draft) {
    return (
      <Container className="p-6">
        <span className="block h-5 w-64 animate-pulse rounded bg-ui-bg-subtle" />
      </Container>
    )
  }

  const patch = (p: Partial<Draft>) => setDraft({ ...draft, ...p })
  const move = (i: number, dir: -1 | 1) => {
    const images = [...draft.images]
    const j = i + dir
    if (j < 0 || j >= images.length) return
    ;[images[i], images[j]] = [images[j], images[i]]
    patch({ images })
  }

  const dirty = JSON.stringify(draft) !==
    JSON.stringify({
      images: (product?.images ?? []).map((img) => img.url),
      thumbnail: product?.thumbnail ?? null,
      colors: String(product?.metadata?.colors ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="space-y-1">
          <Heading level="h2">Storefront media</Heading>
          <Text size="small" className="text-ui-fg-muted">
            Paste image URLs (external CDN links), reorder, pick the cover.
            Changes apply when you save.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => product && productQuery.refetch()}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="small"
            type="button"
            isLoading={save.isPending}
            disabled={!dirty}
            onClick={() => save.mutate(draft)}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
        <div>
          <Text className="mb-3 font-medium">Images</Text>
          {draft.images.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-ui-border-strong">
              <Text size="small" className="text-ui-fg-muted">
                No images — paste a URL below.
              </Text>
            </div>
          ) : (
            <ul className="space-y-2">
              {draft.images.map((imageUrl, i) => (
                <li
                  key={`${imageUrl}-${i}`}
                  className="flex items-center gap-3 rounded-md border border-ui-border-base p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded object-cover bg-ui-bg-subtle"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ui-fg-subtle">
                    {imageUrl}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant={
                        draft.thumbnail === imageUrl ? "primary" : "secondary"
                      }
                      size="small"
                      type="button"
                      onClick={() => patch({ thumbnail: imageUrl })}
                    >
                      {draft.thumbnail === imageUrl ? "Cover" : "Set cover"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      type="button"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      type="button"
                      disabled={i === draft.images.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      type="button"
                      onClick={() => {
                        const images = draft.images.filter(
                          (_, idx) => idx !== i
                        )
                        patch({
                          images,
                          thumbnail:
                            draft.thumbnail === imageUrl
                              ? (images[0] ?? null)
                              : draft.thumbnail,
                        })
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              size="small"
              placeholder="https://…/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) {
                  patch({ images: [...draft.images, url.trim()] })
                  setUrl("")
                }
              }}
            />
            <Button
              variant="secondary"
              size="small"
              type="button"
              disabled={!url.trim()}
              onClick={() => {
                patch({ images: [...draft.images, url.trim()] })
                setUrl("")
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <div>
          <Text className="mb-3 font-medium">Colours</Text>
          <ul className="flex flex-wrap gap-2">
            {draft.colors.map((c) => (
              <li
                key={c}
                className="flex items-center gap-2 rounded-full border border-ui-border-base py-1 pl-1.5 pr-2 text-sm"
              >
                <span
                  className="h-5 w-5 rounded-full border border-ui-border-base"
                  style={{ background: SWATCHES[c] ?? "#e5e5e5" }}
                />
                {c}
                <button
                  type="button"
                  aria-label={`Remove ${c}`}
                  className="text-ui-fg-muted hover:text-ui-fg-base"
                  onClick={() =>
                    patch({ colors: draft.colors.filter((x) => x !== c) })
                  }
                >
                  ✕
                </button>
              </li>
            ))}
            {draft.colors.length === 0 && (
              <li>
                <Text size="small" className="text-ui-fg-muted">
                  No colours yet — the PDP shows these as swatches and the shop
                  filter uses them.
                </Text>
              </li>
            )}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              size="small"
              placeholder="e.g. Onyx"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onKeyDown={(e) => {
                const name = color.trim()
                if (e.key === "Enter" && name && !draft.colors.includes(name)) {
                  patch({ colors: [...draft.colors, name] })
                  setColor("")
                }
              }}
            />
            <Button
              variant="secondary"
              size="small"
              type="button"
              disabled={!color.trim() || draft.colors.includes(color.trim())}
              onClick={() => {
                patch({ colors: [...draft.colors, color.trim()] })
                setColor("")
              }}
            >
              Add
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(SWATCHES).map((name) =>
              draft.colors.includes(name) ? null : (
                <button
                  key={name}
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-ui-border-base px-2.5 py-1 text-xs text-ui-fg-muted hover:text-ui-fg-base"
                  onClick={() => patch({ colors: [...draft.colors, name] })}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: SWATCHES[name] }}
                  />
                  + {name}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
  id: "flowcase:product-media",
})

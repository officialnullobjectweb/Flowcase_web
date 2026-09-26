"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Product } from "@/lib/types"

interface SelectionValue {
  /** option id → chosen option-value id */
  selection: Record<string, string>
  select: (optionId: string, valueId: string) => void
  /** name of the chosen colour ("Onyx"), null outside a provider */
  colorName: string | null
  /** index of the chosen colour in the product's option list, null if none */
  colorIndex: number | null
  /** number of colour options on the product (0 when it has none) */
  colorCount: number
}

const FALLBACK: SelectionValue = {
  selection: {},
  select: () => {},
  colorName: null,
  colorIndex: null,
  colorCount: 0,
}

const SelectionCtx = createContext<SelectionValue | null>(null)

/**
 * Shared option-selection state for the PDP: the info column picks the
 * variant, the gallery swaps to that colour's images, and the review form
 * stamps the colour onto new reviews. Reading it outside a provider is safe.
 */
export function useSelection(): SelectionValue {
  return useContext(SelectionCtx) ?? FALLBACK
}

export function SelectionProvider({
  product,
  children,
}: {
  product: Product
  children: ReactNode
}) {
  const options = product.options ?? []
  const colorOption = useMemo(
    () => options.find((o) => /colou?r/i.test(o.title)) ?? options[0],
    [options]
  )

  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const option of options) {
      if (option.values.length) init[option.id] = option.values[0].id
    }
    return init
  })

  const select = useCallback((optionId: string, valueId: string) => {
    setSelection((prev) => ({ ...prev, [optionId]: valueId }))
  }, [])

  const colorName = useMemo(() => {
    if (!colorOption) return null
    const chosen = colorOption.values.find((v) => v.id === selection[colorOption.id])
    return chosen?.value ?? null
  }, [colorOption, selection])

  const colorIndex = useMemo(() => {
    if (!colorOption) return null
    const idx = colorOption.values.findIndex((v) => v.id === selection[colorOption.id])
    return idx >= 0 ? idx : null
  }, [colorOption, selection])

  const value = useMemo(
    () => ({
      selection,
      select,
      colorName,
      colorIndex,
      colorCount: colorOption?.values.length ?? 0,
    }),
    [selection, select, colorName, colorIndex, colorOption]
  )

  return <SelectionCtx.Provider value={value}>{children}</SelectionCtx.Provider>
}

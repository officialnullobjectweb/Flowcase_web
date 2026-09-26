"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { LocalCartItem } from "@/lib/types"

const CART_KEY = "flowcase_cart"

export interface AddToCartInput {
  variantId: string
  productId: string
  title: string
  variantTitle?: string | null
  handle: string
  thumbnail?: string | null
  unitPrice: number
  currency: string
  quantity?: number
}

interface CartContextValue {
  items: LocalCartItem[]
  ready: boolean
  isOpen: boolean
  itemCount: number
  subtotal: number
  currency: string
  openCart: () => void
  closeCart: () => void
  addItem: (input: AddToCartInput) => void
  setQuantity: (variantId: string, quantity: number) => void
  removeItem: (variantId: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}

function readCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LocalCartItem[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>([])
  const [ready, setReady] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setItems(readCart())
    setReady(true)
  }, [])

  const persist = useCallback((next: LocalCartItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next))
    } catch {
      // ponytail: private-mode localStorage failures fail silently
    }
  }, [])

  const addItem = useCallback(
    (input: AddToCartInput) => {
      const quantity = Math.max(1, input.quantity ?? 1)
      const current = readCart()
      const existing = current.find((item) => item.id === input.variantId)
      const next = existing
        ? current.map((item) =>
            item.id === input.variantId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [
            ...current,
            {
              id: input.variantId,
              productId: input.productId,
              title: input.title,
              variantTitle: input.variantTitle ?? null,
              handle: input.handle,
              thumbnail: input.thumbnail ?? null,
              unitPrice: input.unitPrice,
              currency: input.currency,
              quantity,
            },
          ]
      persist(next)
      setIsOpen(true)
    },
    [persist]
  )

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => {
      const current = readCart()
      if (quantity <= 0) {
        persist(current.filter((item) => item.id !== variantId))
        return
      }
      persist(
        current.map((item) =>
          item.id === variantId ? { ...item, quantity } : item
        )
      )
    },
    [persist]
  )

  const removeItem = useCallback(
    (variantId: string) => {
      persist(readCart().filter((item) => item.id !== variantId))
    },
    [persist]
  )

  const clearCart = useCallback(() => {
    persist([])
  }, [persist])

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  )

  const currency = items[0]?.currency ?? "inr"

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      isOpen,
      itemCount,
      subtotal,
      currency,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      ready,
      isOpen,
      itemCount,
      subtotal,
      currency,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

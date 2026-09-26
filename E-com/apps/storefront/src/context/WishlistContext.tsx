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

const WISHLIST_KEY = "flowcase_wishlist"

export interface WishlistItem {
  id: string
  variantId: string
  title: string
  handle: string
  thumbnail: string | null
  unitPrice: number
  currency: string
}

interface WishlistContextValue {
  items: WishlistItem[]
  ready: boolean
  has: (productId: string) => boolean
  toggle: (item: WishlistItem) => void
  remove: (productId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return ctx
}

function readWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WishlistItem[]) : []
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(readWishlist())
    setReady(true)
  }, [])

  const persist = useCallback((next: WishlistItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next))
    } catch {
      // ponytail: private-mode localStorage failures fail silently
    }
  }, [])

  const toggle = useCallback(
    (item: WishlistItem) => {
      const current = readWishlist()
      const exists = current.some((entry) => entry.id === item.id)
      persist(
        exists
          ? current.filter((entry) => entry.id !== item.id)
          : [...current, item]
      )
    },
    [persist]
  )

  const remove = useCallback(
    (productId: string) => {
      persist(readWishlist().filter((entry) => entry.id !== productId))
    },
    [persist]
  )

  const has = useCallback(
    (productId: string) => items.some((entry) => entry.id === productId),
    [items]
  )

  const value = useMemo<WishlistContextValue>(
    () => ({ items, ready, has, toggle, remove }),
    [items, ready, has, toggle, remove]
  )

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  )
}

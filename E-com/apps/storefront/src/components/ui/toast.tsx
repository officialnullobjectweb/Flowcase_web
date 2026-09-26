"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Heart, ShoppingBag } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

interface ToastItem {
  id: number
  title: string
  detail?: string
  icon: "check" | "heart" | "bag"
}

const ToastContext = createContext<{
  toast: (t: { title: string; detail?: string; icon?: ToastItem["icon"] }) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const ICONS = {
  check: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
  heart: <Heart className="h-3.5 w-3.5" aria-hidden="true" />,
  bag: <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)
  const seq = useRef(0)

  useEffect(() => setMounted(true), [])

  const toast = useCallback(
    ({ title, detail, icon = "check" }: { title: string; detail?: string; icon?: ToastItem["icon"] }) => {
      const id = ++seq.current
      setItems((prev) => [...prev.slice(-2), { id, title, detail, icon }])
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200)
    },
    []
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 left-1/2 z-[80] flex w-[min(100%-2rem,22rem)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0"
          >
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="pointer-events-auto flex items-start gap-3 border border-white/10 bg-foreground px-4 py-3 text-background"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-white">
                    {ICONS[t.icon]}
                  </span>
                  <div className="min-w-0">
                    <p className="label">{t.title}</p>
                    {t.detail && (
                      <p className="mt-1 truncate text-xs text-white/60">{t.detail}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

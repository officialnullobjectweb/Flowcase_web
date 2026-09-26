"use client"

import {
  Check,
  Heart,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { AuthForm } from "@/components/account/AuthForms"
import { OrderStatusRow } from "@/components/account/AccountViews"
import { PhoneVerify } from "@/components/PhoneVerify"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { WishlistView } from "@/components/WishlistView"
import { useAuth } from "@/context/AuthContext"
import { useWishlist } from "@/context/WishlistContext"
import {
  INDIA_STATES,
  loadSavedAddresses,
  lookupPin,
  newAddressId,
  saveSavedAddresses,
  type SavedAddress,
} from "@/lib/addresses"
import { formatDate, formatPrice } from "@/lib/format"
import { listMyOrders, type OrderListItem } from "@/lib/orders"
import { supabase } from "@/lib/supabase"

type Tab = "overview" | "orders" | "wishlist" | "addresses"

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "orders", label: "Orders", icon: Package },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "addresses", label: "Addresses", icon: MapPin },
]

interface ProfileMeta {
  first_name?: string
  last_name?: string
  mobile?: string
  avatar_url?: string
}

function isActiveOrder(o: OrderListItem): boolean {
  const f = (o.fulfillment_status ?? "").toLowerCase()
  const p = (o.payment_status ?? "").toLowerCase()
  if (["canceled", "cancelled", "refunded", "returned"].includes(p)) return false
  if (o.status === "canceled" || f === "delivered") return false
  return true
}

function squareCropDataUrl(file: File, size = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      URL.revokeObjectURL(url)
      if (!ctx) return reject(new Error("Could not read that image"))
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size
      )
      resolve(canvas.toDataURL("image/jpeg", 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read that image"))
    }
    img.src = url
  })
}

function blankAddress(): SavedAddress {
  return {
    id: newAddressId(),
    label: "Home",
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    city: "",
    province: "",
    postal_code: "",
    country_code: "in",
    phone: "",
    is_default: false,
  }
}

function validateAddressForm(a: SavedAddress): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!a.first_name?.trim()) errs.first_name = "Required"
  if (!a.last_name?.trim()) errs.last_name = "Required"
  if (!a.address_1?.trim()) errs.address_1 = "Required"
  if (!a.city?.trim()) errs.city = "Required"
  if (!a.province) errs.province = "Select state"
  if (!/^\d{6}$/.test(a.postal_code ?? "")) errs.postal_code = "6-digit PIN"
  const digits = (a.phone ?? "").replace(/\D/g, "")
  if (!/^[6-9]\d{9}$/.test(digits)) errs.phone = "10-digit mobile"
  return errs
}

export function AccountDashboard() {
  const { user, loading, logout, refreshUser } = useAuth()
  const { items: wishlistItems } = useWishlist()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>("overview")
  const [orders, setOrders] = useState<OrderListItem[] | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [orderScope, setOrderScope] = useState<"active" | "past">("active")

  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [addrDialog, setAddrDialog] = useState(false)
  const [addrForm, setAddrForm] = useState<SavedAddress>(blankAddress)
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({})
  const [addrSaving, setAddrSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // PIN geo-lookup for the address form (India Post API), last write wins.
  const geoSeq = useRef(0)
  const geoLookup = async (pin: string) => {
    const seq = ++geoSeq.current
    const hit = await lookupPin(pin)
    if (!hit || seq !== geoSeq.current) return
    setAddrForm((a) =>
      a.postal_code === pin
        ? { ...a, city: hit.city || a.city, province: hit.province || a.province }
        : a
    )
  }

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", mobile: "" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    listMyOrders()
      .then((result) => !cancelled && setOrders(result))
      .catch((err) => {
        if (!cancelled)
          setOrdersError(err instanceof Error ? err.message : "Could not load orders")
      })
    loadSavedAddresses()
      .then((list) => !cancelled && setAddresses(list))
      .catch(() => !cancelled && setAddressesError("Could not load saved addresses"))
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <p className="label text-muted-foreground">Loading account…</p>
  }

  if (!user) {
    return (
      <div className="border border-border p-6">
        <p className="display-tight font-display text-xl font-semibold">
          You&apos;re browsing as a guest.
        </p>
        <div className="mt-7 max-w-md">
          <AuthForm />
        </div>
      </div>
    )
  }

  const meta = (user.user_metadata ?? {}) as ProfileMeta
  const name =
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "Your account"
  const mobile = user.phone || meta.mobile || ""
  const initials = (meta.first_name?.[0] ?? user.email?.[0] ?? "F").toUpperCase()

  const activeOrders = orders?.filter(isActiveOrder) ?? []
  const pastOrders = orders?.filter((o) => !isActiveOrder(o)) ?? []
  const currencyCode = orders?.[0]?.currency_code ?? "inr"
  const spent = (orders ?? [])
    .filter((o) => o.payment_status !== "refunded" && o.payment_status !== "canceled")
    .reduce((sum, o) => sum + (o.total ?? 0), 0)

  const persistAddresses = async (next: SavedAddress[]) => {
    setAddressesError(null)
    try {
      await saveSavedAddresses(next)
      setAddresses(next)
    } catch (err) {
      setAddressesError(err instanceof Error ? err.message : "Could not save addresses")
      throw err
    }
  }

  const openAddressDialog = (existing?: SavedAddress) => {
    setAddrForm(existing ? { ...existing } : blankAddress())
    setAddrErrors({})
    setAddrDialog(true)
  }

  const submitAddress = async (event: FormEvent) => {
    event.preventDefault()
    const errs = validateAddressForm(addrForm)
    setAddrErrors(errs)
    if (Object.keys(errs).length) return
    setAddrSaving(true)
    try {
      const list = addresses ?? []
      let next = list.some((a) => a.id === addrForm.id)
        ? list.map((a) => (a.id === addrForm.id ? addrForm : a))
        : [...list, addrForm]
      if (addrForm.is_default) {
        next = next.map((a) => ({ ...a, is_default: a.id === addrForm.id }))
      }
      if (next.length === 1) next = next.map((a) => ({ ...a, is_default: true }))
      await persistAddresses(next)
      setAddrDialog(false)
    } catch {
      /* surfaced via addressesError */
    } finally {
      setAddrSaving(false)
    }
  }

  const setDefaultAddress = async (id: string) => {
    const next = (addresses ?? []).map((a) => ({
      ...a,
      is_default: a.id === id,
    }))
    try {
      await persistAddresses(next)
    } catch {
      /* surfaced via addressesError */
    }
  }

  const removeAddress = async (id: string) => {
    setConfirmDeleteId(null)
    let next = (addresses ?? []).filter((a) => a.id !== id)
    if (next.length && !next.some((a) => a.is_default)) {
      next = next.map((a, i) => ({ ...a, is_default: i === 0 }))
    }
    try {
      await persistAddresses(next)
    } catch {
      /* surfaced via addressesError */
    }
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...meta,
          first_name: profileForm.first_name.trim(),
          last_name: profileForm.last_name.trim(),
          mobile: profileForm.mobile.trim(),
        },
      })
      if (error) throw new Error(error.message)
      await refreshUser()
      setProfileMsg("Profile saved")
      setProfileOpen(false)
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Could not save profile")
    } finally {
      setProfileSaving(false)
    }
  }

  const applyAvatar = async (file: File) => {
    setAvatarBusy(true)
    setProfileMsg(null)
    try {
      const avatarUrl = await squareCropDataUrl(file)
      const { error } = await supabase.auth.updateUser({
        data: { ...meta, avatar_url: avatarUrl },
      })
      if (error) throw new Error(error.message)
      await refreshUser()
      setProfileMsg("Profile photo updated")
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Could not update photo")
    } finally {
      setAvatarBusy(false)
      if (avatarInput.current) avatarInput.current.value = ""
    }
  }

  const removeAvatar = async () => {
    setAvatarBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { ...meta, avatar_url: "" },
      })
      if (error) throw new Error(error.message)
      await refreshUser()
      setProfileMsg("Profile photo removed")
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Could not remove photo")
    } finally {
      setAvatarBusy(false)
    }
  }

  const fieldCls = (key: string) =>
    `label mt-1 block ${addrErrors[key] ? "text-red-600" : "text-muted-foreground"}`

  return (
    <div className="space-y-8">
      {/* Identity card */}
      <div className="flex flex-col gap-6 border border-border p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-foreground bg-muted">
            {meta.avatar_url ? (
              <Image
                src={meta.avatar_url}
                alt=""
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <span className="display-tight flex h-full w-full items-center justify-center font-display text-2xl font-bold">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="display-tight font-display text-2xl font-bold">{name}</p>
            <p className="label mt-2 flex items-start gap-1.5 break-all text-muted-foreground">
              <Mail className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {user.email}
            </p>
            {mobile && (
              <p className="label mt-1 flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {mobile}
              </p>
            )}
            <p className="label mt-1 flex items-center gap-1.5 text-muted-foreground">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Member since {formatDate(user.created_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setProfileForm({
                first_name: meta.first_name ?? "",
                last_name: meta.last_name ?? "",
                mobile: mobile.replace(/^\+91-?/, ""),
              })
              setProfileMsg(null)
              setProfileOpen((v) => !v)
            }}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {profileOpen ? "Close" : "Edit profile"}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await logout()
              router.refresh()
            }}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Profile saved / avatar feedback — stays visible after the editor closes */}
      {profileMsg && (
        <p
          className="label -mt-4 flex items-center gap-1.5 text-success"
          role="status"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {profileMsg}
        </p>
      )}

      {/* Profile editor */}
      {profileOpen && (
        <form
          onSubmit={saveProfile}
          className="space-y-5 border border-border bg-muted/40 p-6"
          aria-label="Edit profile"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="label text-muted-foreground">Profile photo</p>
              <div className="mt-3 flex items-center gap-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                  {meta.avatar_url ? (
                    <Image
                      src={meta.avatar_url}
                      alt=""
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="display-tight flex h-full w-full items-center justify-center font-display text-lg font-bold">
                      {initials}
                    </span>
                  )}
                </span>
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Choose profile photo"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void applyAvatar(file)
                  }}
                />
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => avatarInput.current?.click()}
                  className="label rounded-full border border-border px-4 py-2 transition hover:border-foreground disabled:opacity-40"
                >
                  {avatarBusy ? "Uploading…" : meta.avatar_url ? "Change photo" : "Upload photo"}
                </button>
                {meta.avatar_url && (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void removeAvatar()}
                    className="label text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label text-muted-foreground" htmlFor="pf-first">
                First name
              </label>
              <Input
                id="pf-first"
                autoComplete="given-name"
                value={profileForm.first_name}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, first_name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label text-muted-foreground" htmlFor="pf-last">
                Last name
              </label>
              <Input
                id="pf-last"
                autoComplete="family-name"
                value={profileForm.last_name}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, last_name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="label text-muted-foreground" htmlFor="pf-mobile">
                Mobile
              </label>
              <Input
                id="pf-mobile"
                type="tel"
                autoComplete="tel"
                placeholder="9876543210"
                value={profileForm.mobile}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, mobile: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            icon: Package,
            label: "Orders",
            value: orders === null ? "…" : String(orders.length),
          },
          {
            icon: Wallet,
            label: "Total spent",
            value: orders === null ? "…" : formatPrice(spent, currencyCode),
          },
          {
            icon: Heart,
            label: "Wishlist",
            value: String(wishlistItems.length),
          },
          {
            icon: MapPin,
            label: "Saved addresses",
            value: addresses === null ? "…" : String(addresses.length),
          },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="border border-border p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="display-tight min-w-0 truncate font-display text-2xl font-bold">
                {value}
              </span>
            </div>
            <p className="label mt-3 text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Active order strip */}
      {activeOrders[0] && (
        <Link
          href={`/account/orders/${activeOrders[0].id}`}
          className="group flex flex-wrap items-center justify-between gap-3 border border-border p-5 transition hover:border-foreground"
        >
          <span className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-muted">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="label block text-muted-foreground">
                Latest order #{activeOrders[0].display_id ?? "—"} ·{" "}
                {formatDate(activeOrders[0].created_at)}
              </span>
              <span className="mt-1.5 block">
                <OrderStatusRow order={activeOrders[0]} />
              </span>
            </span>
          </span>
          <span className="display-tight font-display font-bold">
            {formatPrice(activeOrders[0].total, activeOrders[0].currency_code)}{" "}
            <span className="label font-normal text-muted-foreground">
              Track →
            </span>
          </span>
        </Link>
      )}

      {/* Tabs */}
      <div>
        <div
          role="tablist"
          aria-label="Account sections"
          className="flex gap-1 overflow-x-auto border-b border-border"
        >
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`label -mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 transition ${
                  tab === t.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t.label}
                {t.key === "wishlist" && wishlistItems.length > 0
                  ? ` (${wishlistItems.length})`
                  : ""}
                {t.key === "addresses" && (addresses?.length ?? 0) > 0
                  ? ` (${addresses?.length})`
                  : ""}
              </button>
            )
          })}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            className="pt-6"
          >
            <nav aria-label="Account shortcuts" className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setTab("orders")}
                className="group border border-border p-5 text-left transition hover:border-foreground"
              >
                <Package className="h-6 w-6" aria-hidden="true" />
                <span className="display-tight mt-4 block font-display text-lg font-semibold">
                  {orders === null
                    ? "Loading…"
                    : `${activeOrders.length} active · ${pastOrders.length} past`}
                </span>
                <span className="label mt-1 block text-muted-foreground">Orders</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("addresses")}
                className="group border border-border p-5 text-left transition hover:border-foreground"
              >
                <MapPin className="h-6 w-6" aria-hidden="true" />
                <span className="display-tight mt-4 block font-display text-lg font-semibold">
                  {addresses === null
                    ? "Loading…"
                    : addresses.length > 0
                      ? `${addresses.length} saved`
                      : "Add one →"}
                </span>
                <span className="label mt-1 block text-muted-foreground">Addresses</span>
              </button>
              <Link
                href="/shipping-returns"
                className="group border border-border p-5 transition hover:border-foreground"
              >
                <Truck className="h-6 w-6" aria-hidden="true" />
                <span className="display-tight mt-4 block font-display text-lg font-semibold">
                  Shipping &amp; returns →
                </span>
                <span className="label mt-1 block text-muted-foreground">Help</span>
              </Link>
            </nav>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div
            role="tabpanel"
            id="panel-orders"
            aria-labelledby="tab-orders"
            className="pt-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div
                className="inline-flex border border-border"
                role="group"
                aria-label="Filter orders"
              >
                {(["active", "past"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    aria-pressed={orderScope === scope}
                    onClick={() => setOrderScope(scope)}
                    className={`label px-5 py-2.5 transition ${
                      orderScope === scope
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {scope === "active"
                      ? `Active (${activeOrders.length})`
                      : `Past (${pastOrders.length})`}
                  </button>
                ))}
              </div>
              <Link
                href="/account/orders"
                className="label text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Open full order page →
              </Link>
            </div>

            {ordersError && (
              <p role="alert" className="label mt-5 border border-red-600 px-4 py-3 text-red-600">
                {ordersError}
              </p>
            )}
            {orders === null && !ordersError && (
              <p className="label mt-5 text-muted-foreground">Loading orders…</p>
            )}

            {orders !== null && (
              <ul className="mt-5 border-t border-border">
                {(orderScope === "active" ? activeOrders : pastOrders).map((order) => (
                  <li key={order.id} className="border-b border-border">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="flex flex-col gap-2 py-5 transition hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:px-3"
                    >
                      <div>
                        <p className="label text-muted-foreground">
                          Order #{order.display_id ?? "—"} · {formatDate(order.created_at)}
                          {order.summary?.item_count
                            ? ` · ${order.summary.item_count} item${order.summary.item_count === 1 ? "" : "s"}`
                            : ""}
                        </p>
                        <div className="mt-1.5">
                          <OrderStatusRow order={order} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="display-tight font-display font-bold">
                          {formatPrice(order.total, order.currency_code)}
                        </span>
                        <span className="label text-muted-foreground">Details →</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {orders !== null && (orderScope === "active" ? activeOrders : pastOrders).length === 0 && (
              <div className="mt-5 border border-dashed border-border p-10 text-center">
                <Package
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="display-tight mt-4 font-display text-lg font-semibold">
                  {orderScope === "active" ? "No active orders." : "No past orders yet."}
                </p>
                <Link
                  href="/shop"
                  className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
                >
                  Browse cases
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Wishlist */}
        {tab === "wishlist" && (
          <div
            role="tabpanel"
            id="panel-wishlist"
            aria-labelledby="tab-wishlist"
            className="pt-6"
          >
            <WishlistView />
          </div>
        )}

        {/* Addresses */}
        {tab === "addresses" && (
          <div
            role="tabpanel"
            id="panel-addresses"
            aria-labelledby="tab-addresses"
            className="pt-6"
          >
            <div className="flex flex-wrap items-center justify-end gap-4">
              <Button onClick={() => openAddressDialog()} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add address
              </Button>
            </div>

            {addressesError && (
              <p role="alert" className="label mt-5 border border-red-600 px-4 py-3 text-red-600">
                {addressesError}
              </p>
            )}
            {addresses === null && !addressesError && (
              <p className="label mt-5 text-muted-foreground">Loading addresses…</p>
            )}

            {addresses !== null && addresses.length === 0 && (
              <div className="mt-5 border border-dashed border-border p-10 text-center">
                <MapPin
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="display-tight mt-4 font-display text-lg font-semibold">
                  No saved addresses yet.
                </p>
                <p className="label mt-2 text-muted-foreground">
                  Use Add address above to save one.
                </p>
              </div>
            )}

            {addresses !== null && addresses.length > 0 && (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => (
                  <li key={a.id} className="border border-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted">
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <p className="text-sm font-semibold">{a.label || "Address"}</p>
                        {a.is_default && (
                          <span className="label border border-border px-2 py-0.5 text-muted-foreground">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openAddressDialog(a)}
                          aria-label={`Edit ${a.label || "address"}`}
                          className="text-muted-foreground transition hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmDeleteId === a.id
                              ? void removeAddress(a.id)
                              : setConfirmDeleteId(a.id)
                          }
                          aria-label={
                            confirmDeleteId === a.id
                              ? `Confirm delete ${a.label || "address"}`
                              : `Delete ${a.label || "address"}`
                          }
                          className={`transition ${
                            confirmDeleteId === a.id
                              ? "text-red-600"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <address className="mt-3 space-y-1 text-sm not-italic">
                      <p className="font-semibold">
                        {a.first_name} {a.last_name}
                      </p>
                      <p>{a.address_1}</p>
                      {a.address_2 && <p>{a.address_2}</p>}
                      <p>
                        {a.city}
                        {a.province ? `, ${a.province}` : ""} {a.postal_code}
                      </p>
                      {a.phone && <p>{a.phone}</p>}
                    </address>
                    {confirmDeleteId === a.id ? (
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void removeAddress(a.id)}
                          className="label rounded-full bg-danger px-4 py-2 text-white transition hover:opacity-90"
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="label text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      !a.is_default && (
                        <button
                          type="button"
                          onClick={() => void setDefaultAddress(a.id)}
                          className="label mt-4 text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        >
                          Make default
                        </button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Address form */}
            <Dialog
              open={addrDialog}
              onClose={() => setAddrDialog(false)}
              title={
                addresses?.some((a) => a.id === addrForm.id)
                  ? "Edit address"
                  : "Add address"
              }
              footer={
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddrDialog(false)}
                    className="label rounded-full border border-border px-5 py-2.5 transition hover:border-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="address-form"
                    disabled={addrSaving}
                    className="label rounded-full bg-primary px-5 py-2.5 text-primary-foreground transition hover:bg-primary/85 disabled:opacity-40"
                  >
                    {addrSaving ? "Saving…" : "Save address"}
                  </button>
                </div>
              }
            >
              <form id="address-form" onSubmit={submitAddress} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-label">
                      Label
                    </label>
                    <Input
                      id="ad-label"
                      placeholder="Home"
                      value={addrForm.label ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, label: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-phone">
                      Mobile
                    </label>
                    <Input
                      id="ad-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="9876543210"
                      value={addrForm.phone ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, phone: e.target.value }))
                      }
                    />
                    <span className={fieldCls("phone")}>{addrErrors.phone}</span>
                    <PhoneVerify phone={addrForm.phone ?? ""} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-first">
                      First name
                    </label>
                    <Input
                      id="ad-first"
                      autoComplete="given-name"
                      value={addrForm.first_name ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, first_name: e.target.value }))
                      }
                    />
                    <span className={fieldCls("first_name")}>
                      {addrErrors.first_name}
                    </span>
                  </div>
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-last">
                      Last name
                    </label>
                    <Input
                      id="ad-last"
                      autoComplete="family-name"
                      value={addrForm.last_name ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, last_name: e.target.value }))
                      }
                    />
                    <span className={fieldCls("last_name")}>
                      {addrErrors.last_name}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label text-muted-foreground" htmlFor="ad-line1">
                    Address
                  </label>
                  <Input
                    id="ad-line1"
                    autoComplete="address-line1"
                    placeholder="221 Residency Road"
                    value={addrForm.address_1 ?? ""}
                    onChange={(e) =>
                      setAddrForm((a) => ({ ...a, address_1: e.target.value }))
                    }
                  />
                  <span className={fieldCls("address_1")}>{addrErrors.address_1}</span>
                </div>
                <div>
                  <label className="label text-muted-foreground" htmlFor="ad-line2">
                    Landmark <span className="text-muted-foreground/70">(optional)</span>
                  </label>
                  <Input
                    id="ad-line2"
                    autoComplete="address-line2"
                    value={addrForm.address_2 ?? ""}
                    onChange={(e) =>
                      setAddrForm((a) => ({ ...a, address_2: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-city">
                      City
                    </label>
                    <Input
                      id="ad-city"
                      autoComplete="address-level2"
                      value={addrForm.city ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, city: e.target.value }))
                      }
                    />
                    <span className={fieldCls("city")}>{addrErrors.city}</span>
                  </div>
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-state">
                      State
                    </label>
                    <select
                      id="ad-state"
                      autoComplete="address-level1"
                      value={addrForm.province ?? ""}
                      onChange={(e) =>
                        setAddrForm((a) => ({ ...a, province: e.target.value }))
                      }
                      className="mt-2 h-11 w-full border border-border bg-background px-3 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <span className={fieldCls("province")}>{addrErrors.province}</span>
                  </div>
                  <div>
                    <label className="label text-muted-foreground" htmlFor="ad-pin">
                      PIN code
                    </label>
                    <Input
                      id="ad-pin"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      value={addrForm.postal_code ?? ""}
                      onChange={(e) => {
                        const pin = e.target.value.replace(/\D/g, "").slice(0, 6)
                        setAddrForm((a) => ({ ...a, postal_code: pin }))
                        if (pin.length === 6) void geoLookup(pin)
                      }}
                    />
                    <span className={fieldCls("postal_code")}>
                      {addrErrors.postal_code}
                    </span>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!addrForm.is_default}
                    onChange={(e) =>
                      setAddrForm((a) => ({ ...a, is_default: e.target.checked }))
                    }
                  />
                  <span className="text-sm">Set as default address</span>
                </label>
              </form>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}

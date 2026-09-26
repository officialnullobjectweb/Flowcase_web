"use client"

import {
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  Leaf,
  Lock,
  MapPin,
  Smartphone,
  Tag,
  Wallet,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCart } from "@/context/CartContext"
import { formatPrice } from "@/lib/format"
import { Calendar } from "./ui/calendar"
import { Dropdown, DropdownItem } from "./ui/dropdown"
import { getDefaultRegion } from "@/lib/api"
import { sdk } from "@/lib/sdk"
import { supabase } from "@/lib/supabase"
import {
  isRazorpayConfigured,
  openRazorpay,
} from "@/lib/razorpay"
import type { Address, Cart, ShippingOption } from "@/lib/types"
import { INDIA_STATES, lookupPin, type SavedAddress } from "@/lib/addresses"
import { PhoneVerify } from "./PhoneVerify"

interface Step {
  key: "address" | "shipping" | "payment"
  label: string
}

const STEPS: Step[] = [
  { key: "address", label: "Address" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
]

const EMPTY_ADDRESS: Address = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  postal_code: "",
  country_code: "in",
  province: "",
  phone: "",
}

function validateAddress(address: Address, email: string): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email"
  if (!address.first_name?.trim()) errs.first_name = "Required"
  if (!address.last_name?.trim()) errs.last_name = "Required"
  if (!address.address_1?.trim()) errs.address_1 = "Required"
  if (!address.city?.trim()) errs.city = "Required"
  if (!/^\d{6}$/.test(address.postal_code ?? "")) errs.postal_code = "6-digit PIN"
  const digits = (address.phone ?? "").replace(/\D/g, "")
  if (!/^[6-9]\d{9}$/.test(digits)) errs.phone = "10-digit mobile"
  if (!address.province) errs.province = "Select state"
  return errs
}

export function CheckoutFlow() {
  const router = useRouter()
  const { items, subtotal, currency, clearCart, ready } = useCart()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [medusaCart, setMedusaCart] = useState<Cart | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingOptionId, setShippingOptionId] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "manual">(
    isRazorpayConfigured() ? "razorpay" : "manual"
  )
  const [onlineMethod, setOnlineMethod] = useState("upi")

  const [address, setAddress] = useState<Address>({
    first_name: "",
    last_name: "",
    address_1: "",
    address_2: "",
    city: "",
    postal_code: "",
    country_code: "in",
    province: "",
    phone: "",
  })
  const [email, setEmail] = useState("")

  // Saved-address picker: last checkout (localStorage) + signed-in identity.
  const [saved, setSaved] = useState<SavedAddress[]>([])
  const [addrChoice, setAddrChoice] = useState<string>("new")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const recents: SavedAddress[] = []
    try {
      const raw = localStorage.getItem("flowcase_last_address")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.address_1) recents.push({ ...EMPTY_ADDRESS, ...parsed, id: "recent" })
      }
    } catch {
      /* ignore corrupt storage */
    }
    setSaved(recents)
    if (recents[0]) {
      setAddrChoice(recents[0].id)
      setAddress(recents[0])
      setEmail((e) => e || "")
    }

    // Signed-in Supabase user: prefill identity + saved addresses from the
    // account dashboard (user_metadata.addresses). Last checkout stays in
    // localStorage — the Medusa customer session is gone.
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const u = data.user
        if (!u) return
        const meta = (u.user_metadata ?? {}) as {
          first_name?: string
          last_name?: string
          addresses?: SavedAddress[]
        }
        setEmail((e) => e || u.email || "")
        setAddress((prev) => ({
          ...prev,
          first_name: prev.first_name || meta.first_name || "",
          last_name: prev.last_name || meta.last_name || "",
          phone: prev.phone || u.phone || "",
        }))
        const mine = (meta.addresses ?? []).filter((a) => a?.address_1)
        if (mine.length) {
          setSaved((prev) => [
            ...mine,
            ...prev.filter((p) => !mine.some((m) => m.id === p.id)),
          ])
          setAddrChoice((cur) => {
            if (cur !== "new") return cur
            const pick = mine.find((a) => a.is_default) ?? mine[0]
            setAddress((addr) =>
              addr.address_1 ? addr : { ...EMPTY_ADDRESS, ...pick, country_code: pick.country_code || "in" }
            )
            return pick.id
          })
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [couponInput, setCouponInput] = useState("")
  const [coupon, setCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  const shippingCost =
    shippingOptions.find((o) => o.id === shippingOptionId)?.amount ?? 0
  const tax = medusaCart?.tax_total ?? 0
  const total = subtotal + shippingCost + tax
  // REUSE10 = 10% off. Shown client-side; also applied to the Medusa cart
  // (see applyCoupon/syncToMedusa) when the promotion exists in admin.
  const discount = coupon === "REUSE10" ? Math.round(total * 10) / 100 : 0
  const payTotal = total - discount
  const currencyCode = medusaCart?.currency_code ?? currency

  const dateMin = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  })()
  const dateMax = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d
  })()
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })

  const updateField = (key: keyof Address, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }

  // PIN geo-lookup: 6 digits → district + state (India Post API), last write wins.
  const geoSeq = useRef(0)
  const geoLookup = async (pin: string) => {
    const seq = ++geoSeq.current
    const hit = await lookupPin(pin)
    if (!hit || seq !== geoSeq.current) return
    setAddress((prev) =>
      prev.postal_code === pin
        ? {
            ...prev,
            city: hit.city || prev.city,
            province: hit.province || prev.province,
          }
        : prev
    )
  }

  const selectSaved = (s: SavedAddress) => {
    setAddrChoice(s.id)
    if (s.id !== "new") {
      setAddress({ ...EMPTY_ADDRESS, ...s, country_code: s.country_code || "in" })
      setFieldErrors({})
    }
  }

  const err = (name: string) => (touched ? fieldErrors[name] : undefined)
  const inputCls = (name: string) =>
    `w-full border px-3 py-2.5 outline-none focus:border-primary ${
      err(name) ? "border-red-600" : "border-border"
    }`

  const handleAddressSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const errs = validateAddress(address, email)
    setTouched(true)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      setError("Please fix the highlighted fields")
      return
    }
    setFieldErrors({})
    setBusy(true)
    setError(null)
    try {
      // Remember for the next checkout — the saved-address picker preloads it.
      localStorage.setItem("flowcase_last_address", JSON.stringify(address))
      const cart = await syncToMedusa()
      const withAddress = await applyAddressAndEmail(cart)
      setMedusaCart(withAddress)
      await loadShipping(withAddress)
      setStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address")
    } finally {
      setBusy(false)
    }
  }

  // One-tap apply for the offers list in the order summary.
  const applyReuse = () => {
    setCoupon("REUSE10")
    setCouponInput("REUSE10")
    setCouponError(null)
    if (medusaCart) {
      sdk.store.cart
        .addPromotions(medusaCart.id, { promo_codes: ["REUSE10"] })
        .catch(() => {})
    }
  }

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const code = couponInput.trim().toUpperCase()
    if (code === "REUSE10") {
      setCoupon(code)
      setCouponError(null)
      setCouponInput(code)
      // Also register the code on the Medusa cart so admin sees the promotion.
      if (medusaCart) {
        sdk.store.cart
          .addPromotions(medusaCart.id, { promo_codes: ["REUSE10"] })
          .catch(() => {})
      }
    } else {
      setCouponError(code ? `“${code}” is not a valid code` : "Enter a code")
    }
  }

  const syncToMedusa = async (): Promise<Cart> => {
    const region = await getDefaultRegion()
    localStorage.removeItem("flowcase_medusa_cart")
    const { cart } = await sdk.store.cart.create({ region_id: region.id })
    for (const item of items) {
      await sdk.store.cart.createLineItem(cart.id, {
        variant_id: item.id,
        quantity: item.quantity,
      })
    }
    if (coupon) {
      // Best effort: when REUSE10 exists as a promotion in admin, the order
      // records it server-side. Display discount stays client-side either way.
      await sdk.store.cart
        .addPromotions(cart.id, { promo_codes: [coupon] })
        .catch(() => {})
    }
    localStorage.setItem("flowcase_medusa_cart", cart.id)
    const { cart: withItems } = await sdk.store.cart.retrieve(cart.id)
    return withItems
  }

  const applyAddressAndEmail = async (cart: Cart): Promise<Cart> => {
    // Strip the picker's synthetic ids ("recent"/"c0") — sending one makes
    // Medusa look up a nonexistent address row and 404 the whole update.
    const { id: _pickerId, ...shipping } = address as Address & { id?: string }
    const { cart: updated } = await sdk.store.cart.update(cart.id, {
      email,
      shipping_address: shipping as Address,
    })
    return updated
  }

  const loadShipping = async (cart: Cart): Promise<ShippingOption[]> => {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cart.id,
    })
    setShippingOptions(shipping_options)
    if (shipping_options[0]) setShippingOptionId(shipping_options[0].id)
    return shipping_options
  }

  const selectShipping = async (cart: Cart, optionId: string) => {
    await sdk.store.cart.addShippingMethod(cart.id, {
      option_id: optionId,
    })
  }

  const handleShippingNext = async () => {
    if (!medusaCart || !shippingOptionId) return
    setBusy(true)
    setError(null)
    try {
      await selectShipping(medusaCart, shippingOptionId)
      const { cart: refreshed } = await sdk.store.cart.retrieve(medusaCart.id)
      setMedusaCart(refreshed)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set shipping")
    } finally {
      setBusy(false)
    }
  }

  const placeOrder = async () => {
    if (!medusaCart) return
    setBusy(true)
    setError(null)
    try {
      if (paymentMethod === "razorpay" && isRazorpayConfigured()) {
        const orderRes = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: payTotal,
            currency: currencyCode,
            receipt: medusaCart.id,
          }),
        })
        if (!orderRes.ok) {
          const body = (await orderRes.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(body?.error || "Could not create payment order")
        }
        const { orderId, amount, currency: rzpCurrency } = (await orderRes.json()) as {
          orderId: string
          amount: number
          currency: string
        }

        const pay = await openRazorpay({
          amount,
          currency: rzpCurrency,
          orderId,
          name: "Flowcase",
          description: `Order for ${items.length} item(s)`,
          email: email || undefined,
          contact: address.phone || undefined,
        })

        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pay),
        })
        if (!verifyRes.ok) {
          throw new Error("Payment verification failed")
        }

        await sdk.store.payment.initiatePaymentSession(medusaCart, {
          provider_id: "pp_razorpay_default",
          data: {
            ...pay,
            id: pay.razorpay_payment_id,
          },
        } as never)
      } else {
        // COD: no online payment — open an empty session the provider
        // authorizes as-is (see RazorpayProviderService.authorizePayment)
        await sdk.store.payment.initiatePaymentSession(medusaCart, {
          provider_id: "pp_razorpay_default",
          data: {},
        } as never)
      }

      const result = await sdk.store.cart.complete(medusaCart.id)
      const order = (result as { order?: { display_id?: number } }).order
      try {
        sessionStorage.setItem(
          "flowcase_last_order",
          JSON.stringify({
            display_id: order?.display_id ?? null,
            email,
            items,
            total: payTotal,
            discount,
            deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
            currency: currencyCode,
            payment: paymentMethod,
            placedAt: new Date().toISOString(),
          })
        )
      } catch {
        // private-mode sessionStorage — confirmation falls back to query params
      }
      clearCart()
      localStorage.removeItem("flowcase_medusa_cart")
      router.push(
        `/order/confirmation${order?.display_id ? `?display_id=${order.display_id}` : ""}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order")
    } finally {
      setBusy(false)
    }
  }

  if (!ready) {
    return <p className="label text-muted-foreground">Loading checkout…</p>
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <p className="display-tight font-display text-lg font-semibold">
          Your bag is empty.
        </p>
        <a
          href="/shop"
          className="label mt-5 inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
        >
          Browse cases
        </a>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <ol className="mb-8 flex items-center gap-4" aria-label="Checkout steps">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= step
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-sm ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 h-px w-6 bg-border sm:w-10" />
              )}
            </li>
          ))}
        </ol>

        {error && (
          <p
            role="alert"
            className="label mb-4 border border-danger px-4 py-3 text-danger"
          >
            {error}
          </p>
        )}

        {step === 0 && (
          <form onSubmit={handleAddressSubmit} noValidate className="space-y-4">
            {saved.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="label text-muted-foreground">Saved addresses</legend>
                {saved.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition ${
                      addrChoice === s.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved-addr"
                      className="mt-1"
                      checked={addrChoice === s.id}
                      onChange={() => selectSaved(s)}
                    />
                    <span className="text-sm">
                      <span className="block font-medium">
                        {s.first_name} {s.last_name}
                        {s.city ? ` · ${s.city}` : ""}
                      </span>
                      <span className="block text-muted-foreground">
                        {[s.address_1, s.address_2].filter(Boolean).join(", ")}
                        {s.postal_code ? ` — ${s.postal_code}` : ""}
                        {s.province ? `, ${s.province}` : ""}
                      </span>
                      {s.phone && (
                        <span className="block text-muted-foreground">{s.phone}</span>
                      )}
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 border px-4 py-3 transition ${
                    addrChoice === "new"
                      ? "border-primary bg-accent"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved-addr"
                    className="mt-0"
                    checked={addrChoice === "new"}
                    onChange={() => setAddrChoice("new")}
                  />
                  <span className="text-sm font-medium">Enter a new address</span>
                </label>
              </fieldset>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">Email</span>
              <input
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    const next = { ...fieldErrors }
                    delete next.email
                    setFieldErrors(next)
                  }
                }}
                aria-invalid={!!err("email")}
                aria-describedby={err("email") ? "email-error" : undefined}
                className={inputCls("email")}
              />
              {err("email") && (
                <span id="email-error" className="label mt-1 block text-red-600">
                  {fieldErrors.email}
                </span>
              )}
            </label>

            {addrChoice === "new" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">
                      First name
                    </span>
                    <input
                      required
                      autoComplete="given-name"
                      value={address.first_name ?? ""}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      aria-invalid={!!err("first_name")}
                      aria-describedby={err("first_name") ? "first_name-error" : undefined}
                      className={inputCls("first_name")}
                    />
                    {err("first_name") && (
                      <span id="first_name-error" className="label mt-1 block text-red-600">
                        {fieldErrors.first_name}
                      </span>
                    )}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">
                      Last name
                    </span>
                    <input
                      required
                      autoComplete="family-name"
                      value={address.last_name ?? ""}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      aria-invalid={!!err("last_name")}
                      aria-describedby={err("last_name") ? "last_name-error" : undefined}
                      className={inputCls("last_name")}
                    />
                    {err("last_name") && (
                      <span id="last_name-error" className="label mt-1 block text-red-600">
                        {fieldErrors.last_name}
                      </span>
                    )}
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">
                    Address line 1
                  </span>
                  <input
                    required
                    autoComplete="address-line1"
                    value={address.address_1 ?? ""}
                    onChange={(e) => updateField("address_1", e.target.value)}
                    aria-invalid={!!err("address_1")}
                    aria-describedby={err("address_1") ? "address_1-error" : undefined}
                    className={inputCls("address_1")}
                  />
                  {err("address_1") && (
                    <span id="address_1-error" className="label mt-1 block text-red-600">
                      {fieldErrors.address_1}
                    </span>
                  )}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">
                    Address line 2 (optional)
                  </span>
                  <input
                    autoComplete="address-line2"
                    value={address.address_2 ?? ""}
                    onChange={(e) => updateField("address_2", e.target.value)}
                    className={inputCls("address_2")}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">City</span>
                    <input
                      required
                      autoComplete="address-level2"
                      value={address.city ?? ""}
                      onChange={(e) => updateField("city", e.target.value)}
                      aria-invalid={!!err("city")}
                      aria-describedby={err("city") ? "city-error" : undefined}
                      className={inputCls("city")}
                    />
                    {err("city") && (
                      <span id="city-error" className="label mt-1 block text-red-600">
                        {fieldErrors.city}
                      </span>
                    )}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">
                      PIN code
                    </span>
                    <input
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      value={address.postal_code ?? ""}
                      onChange={(e) => {
                        const pin = e.target.value.replace(/\D/g, "").slice(0, 6)
                        updateField("postal_code", pin)
                        if (pin.length === 6) void geoLookup(pin)
                      }}
                      aria-invalid={!!err("postal_code")}
                      aria-describedby={err("postal_code") ? "postal_code-error" : undefined}
                      className={inputCls("postal_code")}
                    />
                    {err("postal_code") && (
                      <span id="postal_code-error" className="label mt-1 block text-red-600">
                        {fieldErrors.postal_code}
                      </span>
                    )}
                  </label>
                  <div className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">
                      State
                    </span>
                    <Dropdown
                      ariaLabel="Select state"
                      panelClass="w-full max-h-60 overflow-y-auto"
                      trigger={
                        <span
                          className={`flex w-full items-center justify-between border px-3 py-2.5 text-left text-sm transition hover:border-foreground ${
                            err("state") || err("province") ? "border-red-600" : "border-border"
                          } ${address.province ? "" : "text-muted-foreground"}`}
                        >
                          {address.province || "Select state"}
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </span>
                      }
                    >
                      {(close) =>
                        INDIA_STATES.map((code) => (
                          <DropdownItem
                            key={code}
                            selected={code === address.province}
                            onClick={() => {
                              close()
                              updateField("province", code)
                            }}
                          >
                            {code}
                          </DropdownItem>
                        ))
                      }
                    </Dropdown>
                    {err("province") && (
                      <span className="label mt-1 block text-red-600">
                        {fieldErrors.province}
                      </span>
                    )}
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">
                    Phone
                  </span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={10}
                    value={address.phone ?? ""}
                    onChange={(e) =>
                      updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    aria-invalid={!!err("phone")}
                    aria-describedby={err("phone") ? "phone-error" : undefined}
                    className={inputCls("phone")}
                  />
                  {err("phone") && (
                    <span id="phone-error" className="label mt-1 block text-red-600">
                      {fieldErrors.phone}
                    </span>
                  )}
                </label>
                <PhoneVerify phone={address.phone ?? ""} />
              </>
            ) : (
              <div className="border border-dashed border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Your details will be filled from the saved address above — pick a
                  different one or enter a new address anytime.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="label rounded-full bg-primary px-8 py-3 text-primary-foreground transition hover:bg-primary/85 disabled:opacity-40"
            >
              {busy
                ? "Saving…"
                : addrChoice === "new"
                  ? "Continue to shipping"
                  : "Deliver to this address"}
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              Choose a shipping method
            </p>
            {shippingOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shipping options available for this address.
              </p>
            ) : (
              <ul className="space-y-2">
                {shippingOptions.map((option) => (
                  <li key={option.id}>
                    <label className="flex cursor-pointer items-center justify-between border border-border px-4 py-3 transition hover:border-foreground has-[:checked]:border-primary has-[:checked]:bg-accent">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={option.id}
                          checked={shippingOptionId === option.id}
                          onChange={() => setShippingOptionId(option.id)}
                        />
                        <span className="text-sm font-medium">{option.name}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatPrice(option.amount, currencyCode)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground">
                Preferred delivery date{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCalendar((v) => !v)}
                  aria-expanded={showCalendar}
                  className="label border border-border px-4 py-2.5 transition hover:border-foreground"
                >
                  {deliveryDate ? formatDate(deliveryDate) : "Pick a date"}
                </button>
                {deliveryDate && (
                  <button
                    type="button"
                    onClick={() => setDeliveryDate(null)}
                    className="label text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              {showCalendar && (
                <div className="mt-3 max-w-sm">
                  <Calendar
                    selected={deliveryDate}
                    min={dateMin}
                    max={dateMax}
                    onSelect={(d) => {
                      setDeliveryDate(d)
                      setShowCalendar(false)
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="label rounded-full border border-border px-6 py-3 transition hover:border-foreground"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy || !shippingOptionId}
                onClick={handleShippingNext}
                className="label rounded-full bg-primary px-8 py-3 text-primary-foreground transition hover:bg-primary/85 disabled:opacity-40"
              >
                {busy ? "Saving…" : "Continue to payment"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              How would you like to pay?
            </p>
            <div
              role="radiogroup"
              aria-label="Payment method"
              className="grid gap-2 sm:grid-cols-2"
            >
              {(
                [
                  { id: "upi", icon: Smartphone, label: "UPI", note: "GPay · PhonePe · Paytm" },
                  { id: "card", icon: CreditCard, label: "Credit & debit cards", note: "Visa · Mastercard · RuPay" },
                  { id: "netbanking", icon: Landmark, label: "Netbanking", note: "All major Indian banks" },
                  { id: "wallet", icon: Wallet, label: "Wallets", note: "Paytm · PhonePe wallets" },
                ] as const
              ).map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition ${
                    paymentMethod === "razorpay" && onlineMethod === method.id
                      ? "border-primary bg-accent"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="mt-1"
                    checked={paymentMethod === "razorpay" && onlineMethod === method.id}
                    onChange={() => {
                      setPaymentMethod("razorpay")
                      setOnlineMethod(method.id)
                    }}
                  />
                  <span className="text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <method.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {method.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {method.note}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-start gap-3 border px-4 py-3 transition sm:col-span-2 ${
                  paymentMethod === "manual"
                    ? "border-primary bg-accent"
                    : "border-border hover:border-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="mt-1"
                  checked={paymentMethod === "manual"}
                  onChange={() => setPaymentMethod("manual")}
                />
                <span className="text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Cash on delivery
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Pay the courier when your order arrives
                  </span>
                </span>
              </label>
            </div>
            <p className="label flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {paymentMethod === "razorpay"
                ? "You’ll continue to Razorpay’s secure checkout — 256-bit encrypted"
                : "No payment needed now · 7-day easy returns on every order"}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="label rounded-full border border-border px-6 py-3 transition hover:border-foreground"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={placeOrder}
                className="label rounded-full bg-primary px-8 py-3 text-primary-foreground transition hover:bg-primary/85 disabled:opacity-40"
              >
                {busy
                  ? "Placing order…"
                  : paymentMethod === "manual"
                    ? `Place order · ${formatPrice(payTotal, currencyCode)}`
                    : `Pay ${formatPrice(payTotal, currencyCode)}`}
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:col-span-5">
        <div className="sticky top-24 border border-border bg-muted p-6">
          <h2 className="label text-muted-foreground">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.title}{" "}
                  {item.variantTitle ? `(${item.variantTitle})` : ""} ×{" "}
                  {item.quantity}
                </span>
                <span className="font-medium">
                  {formatPrice(item.unitPrice * item.quantity, currencyCode)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatPrice(subtotal, currencyCode)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="font-medium">
                {step >= 1 && shippingOptionId
                  ? formatPrice(shippingCost, currencyCode)
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="font-medium">{formatPrice(tax, currencyCode)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground">Discount (REUSE10)</dt>
                <dd className="font-medium text-foreground">
                  −{formatPrice(discount, currencyCode)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold">{formatPrice(payTotal, currencyCode)}</dd>
            </div>
          </dl>

          {/* Offers */}
          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            <li className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
                REUSE10 — 10% off (reuse program)
              </span>
              {coupon === "REUSE10" ? (
                <span className="label text-success">Applied ✓</span>
              ) : (
                <button
                  type="button"
                  onClick={applyReuse}
                  className="label underline underline-offset-2 transition hover:opacity-70"
                >
                  Apply
                </button>
              )}
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Free shipping over ₹999
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Cash on delivery available · 7-day easy returns
            </li>
          </ul>

          {coupon === "REUSE10" && (
            <div className="mt-4 border border-foreground/30 p-4">
              <p className="label flex items-center gap-2 text-foreground">
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                Sustainability unlocked
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                REUSE10 refunds 10% when you send back your old case in the prepaid
                reuse envelope. Every order ships plastic-free in recycled board —
                this one keeps another case out of landfill.
              </p>
            </div>
          )}

          <form onSubmit={applyCoupon} className="mt-4 border-t border-border pt-4">
            <label htmlFor="coupon-code" className="label text-muted-foreground">
              Discount code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="coupon-code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="E.G. REUSE10"
                autoComplete="off"
                className="label h-10 w-full min-w-0 border border-border bg-background px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                className="label h-10 shrink-0 border border-border px-4 transition hover:border-foreground"
              >
                Apply
              </button>
            </div>
            {coupon === "REUSE10" && (
              <p className="label mt-2 text-success">
                REUSE10 applied — 10% off
              </p>
            )}
            {couponError && (
              <p className="label mt-2 text-red-600" role="alert">
                {couponError}
              </p>
            )}
          </form>
        </div>
      </aside>
    </div>
  )
}

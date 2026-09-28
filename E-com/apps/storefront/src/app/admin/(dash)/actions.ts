"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin, worker } from "@/lib/admin-api"

/** All admin mutations verify the session server-side, then call the Worker
 *  with a token the browser never sees. */

export async function updateVariant(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  const price_inr = Number(form.get("price_inr"))
  const inventory_qty = Number(form.get("inventory_qty"))
  if (!id) throw new Error("bad_request")
  const patch: Record<string, number> = {}
  if (Number.isFinite(price_inr) && price_inr >= 0) patch.price_inr = Math.floor(price_inr)
  if (Number.isFinite(inventory_qty) && inventory_qty >= 0) patch.inventory_qty = Math.floor(inventory_qty)
  if (!Object.keys(patch).length) throw new Error("bad_request")
  await worker(`/v1/variants/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
  revalidatePath("/admin/products")
}

export async function setOrderStatus(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  const status = String(form.get("status") ?? "")
  if (!id || !["pending", "paid", "failed", "refunded", "cancelled"].includes(status)) {
    throw new Error("bad_request")
  }
  await worker(`/v1/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
  revalidatePath("/admin/orders")
}

export async function deleteReview(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  if (!id) throw new Error("bad_request")
  await worker(`/v1/reviews/${id}`, { method: "DELETE" })
  revalidatePath("/admin/reviews")
}

export async function updateProduct(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  if (!id) throw new Error("bad_request")
  const patch: Record<string, string> = {}
  for (const k of ["title", "description", "badges"]) {
    const v = String(form.get(k) ?? "")
    if (v) patch[k] = v.slice(0, k === "title" ? 160 : 2000)
  }
  if (!Object.keys(patch).length) throw new Error("bad_request")
  await worker(`/v1/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
  revalidatePath("/admin/products")
}

export async function createProduct(form: FormData): Promise<void> {
  await requireAdmin()
  const title = String(form.get("title") ?? "").trim()
  const price = Number(form.get("price_inr"))
  if (!title || !Number.isFinite(price) || price < 0) throw new Error("bad_request")
  const created = await worker<{ product: { id: string; handle: string } }>("/v1/products", {
    method: "POST",
    body: JSON.stringify({
      title,
      handle: String(form.get("handle") ?? ""),
      description: String(form.get("description") ?? ""),
      collection: String(form.get("collection") ?? "accessories"),
      brand: String(form.get("brand") ?? "accessory"),
      category_id: String(form.get("category_id") ?? "") || null,
      tags: String(form.get("tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      colors: String(form.get("colors") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    }),
  })
  await worker("/v1/variants", {
    method: "POST",
    body: JSON.stringify({
      product_id: created.product.id,
      title: String(form.get("color") ?? "Onyx") || "Onyx",
      price_inr: Math.floor(price),
      price_usd: Math.max(1, Math.round(price / 83)),
    }),
  })
  revalidatePath("/admin/products")
  redirect(`/admin/products/${created.product.id}`)
}

export async function deleteProduct(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  if (!id) throw new Error("bad_request")
  await worker(`/v1/products/${id}`, { method: "DELETE" })
  revalidatePath("/admin/products")
  redirect("/admin/products")
}

export async function createVariant(form: FormData): Promise<void> {
  await requireAdmin()
  const product_id = String(form.get("product_id") ?? "")
  const title = String(form.get("title") ?? "").trim()
  const price_inr = Number(form.get("price_inr"))
  if (!product_id || !title || !Number.isFinite(price_inr) || price_inr < 0) throw new Error("bad_request")
  await worker("/v1/variants", {
    method: "POST",
    body: JSON.stringify({ product_id, title, price_inr: Math.floor(price_inr), inventory_qty: 100 }),
  })
  revalidatePath(`/admin/products/${product_id}`)
}

export async function deleteVariant(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  const product_id = String(form.get("product_id") ?? "")
  if (!id) throw new Error("bad_request")
  await worker(`/v1/variants/${id}`, { method: "DELETE" })
  if (product_id) revalidatePath(`/admin/products/${product_id}`)
}

export async function addImageUrl(form: FormData): Promise<void> {
  await requireAdmin()
  const product_id = String(form.get("product_id") ?? "")
  const url = String(form.get("url") ?? "").trim()
  if (!product_id || !/^https:\/\//.test(url)) throw new Error("bad_request")
  await worker("/v1/images", { method: "POST", body: JSON.stringify({ product_id, url }) })
  revalidatePath(`/admin/products/${product_id}`)
}

export async function uploadImage(form: FormData): Promise<void> {
  await requireAdmin()
  const product_id = String(form.get("product_id") ?? "")
  const file = form.get("file")
  if (!product_id || !(file instanceof File) || file.size === 0) throw new Error("bad_request")
  const fd = new FormData()
  fd.set("file", file)
  const token = process.env.ADMIN_API_TOKEN
  const base = (process.env.WORKER_URL ?? "").replace(/\/$/, "")
  const up = await fetch(`${base}/v1/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!up.ok) throw new Error("upload_failed")
  const { url } = (await up.json()) as { url: string }
  await worker("/v1/images", { method: "POST", body: JSON.stringify({ product_id, url }) })
  revalidatePath(`/admin/products/${product_id}`)
}

export async function deleteImage(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  const product_id = String(form.get("product_id") ?? "")
  if (!id) throw new Error("bad_request")
  await worker(`/v1/images/${id}`, { method: "DELETE" })
  if (product_id) revalidatePath(`/admin/products/${product_id}`)
}

export async function updateCategory(form: FormData): Promise<void> {
  await requireAdmin()
  const id = String(form.get("id") ?? "")
  if (!id) throw new Error("bad_request")
  await worker(`/v1/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") }),
  })
  revalidatePath("/admin/categories")
}

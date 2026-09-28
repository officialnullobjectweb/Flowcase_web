import Link from "next/link"
import { requireAdmin, worker } from "@/lib/admin-api"
import { DeleteButton } from "../../DeleteButton"
import {
  addImageUrl,
  createVariant,
  deleteImage,
  deleteVariant,
  updateProduct,
  uploadImage,
} from "../../actions"

export const dynamic = "force-dynamic"

interface Full {
  id: string
  title: string
  handle: string
  description: string
  badges: string
  product_images: { id: string; url: string; position: number }[]
  variants: { id: string; title: string; price_inr: number; inventory_qty: number }[]
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const product = await worker<Full>(`/v1/products/${id}`).catch(() => null)
  if (!product) {
    return (
      <>
        <Link href="/admin/products" className="label text-muted-foreground transition hover:text-foreground">← Products</Link>
        <p className="mt-8 border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Product not found.</p>
      </>
    )
  }
  return (
    <>
      <Link href="/admin/products" className="label text-muted-foreground transition hover:text-foreground">← Products</Link>
      <h1 className="display-tight mt-3 font-display text-3xl font-bold">{product.title}</h1>

      <form action={updateProduct} className="mt-8 border border-border p-5">
        <input type="hidden" name="id" value={product.id} />
        <p className="label text-muted-foreground">Details</p>
        <label className="label mt-3 block">Title
          <input name="title" defaultValue={product.title} maxLength={160} className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <label className="label mt-3 block">Description
          <textarea name="description" defaultValue={product.description} rows={3} maxLength={2000} className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <label className="label mt-3 block">Badges (csv)
          <input name="badges" defaultValue={product.badges} maxLength={120} className="mt-1 w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <button type="submit" className="label mt-4 bg-foreground px-5 py-2 text-background transition hover:opacity-85">Save details</button>
      </form>

      <div className="mt-6 border border-border p-5">
        <p className="label text-muted-foreground">Variants</p>
        <ul className="mt-3 divide-y divide-border">
          {product.variants.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm"><span className="font-semibold">{v.title}</span> <span className="label text-muted-foreground">· ₹{v.price_inr} · stock {v.inventory_qty}</span></span>
              <DeleteButton id={v.id} label="Remove" extra={{ product_id: product.id }} action={deleteVariant} />
            </li>
          ))}
        </ul>
        <form action={createVariant} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <input type="hidden" name="product_id" value={product.id} />
          <label className="label">Color <input name="title" required maxLength={60} placeholder="Crimson" className="mt-1 block w-32 border border-border bg-transparent px-2 py-1.5 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" /></label>
          <label className="label">Price ₹ <input name="price_inr" type="number" required min={0} className="mt-1 block w-28 border border-border bg-transparent px-2 py-1.5 text-sm focus:border-foreground focus:outline-none" /></label>
          <button type="submit" className="label bg-foreground px-4 py-2 text-background transition hover:opacity-85">Add</button>
        </form>
      </div>

      <div className="mt-6 border border-border p-5">
        <p className="label text-muted-foreground">Images</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.product_images.map((im) => (
            <div key={im.id} className="relative h-20 w-20 overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              <form action={deleteImage} className="absolute right-1 top-1">
                <input type="hidden" name="id" value={im.id} />
                <input type="hidden" name="product_id" value={product.id} />
                <button type="submit" aria-label="Delete image" className="label bg-background/90 px-1.5 py-0.5 text-danger">×</button>
              </form>
            </div>
          ))}
        </div>
        <form action={addImageUrl} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="product_id" value={product.id} />
          <label className="label flex-1">Image URL (https)
            <input name="url" type="url" required placeholder="https://…" className="mt-1 block w-full min-w-52 border border-border bg-transparent px-2 py-1.5 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
          </label>
          <button type="submit" className="label bg-foreground px-4 py-2 text-background transition hover:opacity-85">Add</button>
        </form>
        <form action={uploadImage} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="product_id" value={product.id} />
          <label className="label">Upload (≤5MB)
            <input name="file" type="file" accept="image/*" required className="mt-1 block text-sm font-normal normal-case tracking-normal" />
          </label>
          <button type="submit" className="label border border-border px-4 py-2 transition hover:border-foreground">Upload</button>
        </form>
      </div>
    </>
  )
}

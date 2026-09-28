import Link from "next/link"
import { requireAdmin, worker } from "@/lib/admin-api"
import { createProduct } from "../../actions"

export const dynamic = "force-dynamic"

interface Category {
  id: string
  name: string
  handle: string
}

export default async function NewProductPage() {
  await requireAdmin()
  const categories = await worker<Category[]>("/v1/categories").catch(() => [] as Category[])
  return (
    <>
      <Link href="/admin/products" className="label text-muted-foreground transition hover:text-foreground">← Products</Link>
      <h1 className="display-tight mt-3 font-display text-3xl font-bold">New product</h1>
      <form action={createProduct} className="mt-8 max-w-xl space-y-4 border border-border p-5">
        <label className="label block">Title *
          <input name="title" required maxLength={160} placeholder="Flowcase Volt 5000 Mini Power Bank" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <label className="label block">Handle (auto from title if blank)
          <input name="handle" maxLength={120} placeholder="flowcase-volt-5000-mini" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="label block">Collection
            <select name="collection" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground focus:outline-none">
              <option value="accessories">Accessories</option>
              <option value="iphone">iPhone</option>
              <option value="samsung">Samsung</option>
            </select>
          </label>
          <label className="label block">Brand
            <select name="brand" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground focus:outline-none">
              <option value="accessory">Universal</option>
              <option value="apple">Apple</option>
              <option value="samsung">Samsung</option>
            </select>
          </label>
        </div>
        <label className="label block">Category
          <select name="category_id" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground focus:outline-none">
            <option value="">— none —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="label block">Description
          <textarea name="description" rows={3} maxLength={2000} className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="label block">Tags (csv)
            <input name="tags" maxLength={200} placeholder="accessories, powerbank" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
          </label>
          <label className="label block">Colors (csv)
            <input name="colors" maxLength={200} placeholder="Onyx, Ocean" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="label block">First color *
            <input name="color" required maxLength={60} defaultValue="Onyx" className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
          </label>
          <label className="label block">Price ₹ *
            <input name="price_inr" type="number" required min={0} className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground focus:outline-none" />
          </label>
        </div>
        <button type="submit" className="label bg-foreground px-6 py-2.5 text-background transition hover:opacity-85">Create product</button>
      </form>
    </>
  )
}

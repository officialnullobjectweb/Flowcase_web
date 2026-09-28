import { requireAdmin, worker } from "@/lib/admin-api"
import { updateCategory } from "../actions"

export const dynamic = "force-dynamic"

interface Category {
  id: string
  name: string
  handle: string
  description: string
}

export default async function AdminCategoriesPage() {
  await requireAdmin()
  const categories = await worker<Category[]>("/v1/categories").catch(() => [] as Category[])
  return (
    <>
      <h1 className="display-tight font-display text-3xl font-bold">Categories</h1>
      <p className="label mt-2 text-muted-foreground">{categories.length} categories · names show across the store</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <form key={c.id} action={updateCategory} className="border border-border p-5">
            <input type="hidden" name="id" value={c.id} />
            <p className="label text-muted-foreground">{c.handle}</p>
            <label className="label mt-3 block">Name
              <input name="name" defaultValue={c.name} required maxLength={120} className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
            </label>
            <label className="label mt-3 block">Description
              <textarea name="description" defaultValue={c.description} rows={2} maxLength={2000} className="mt-1 block w-full border border-border bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-foreground focus:outline-none" />
            </label>
            <button type="submit" className="label mt-4 bg-foreground px-5 py-2 text-background transition hover:opacity-85">
              Save
            </button>
          </form>
        ))}
      </div>
    </>
  )
}

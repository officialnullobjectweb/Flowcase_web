import Link from "next/link"
import { SignOutButton } from "../SignOutButton"

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/categories", label: "Categories" },
]

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <nav aria-label="Admin" className="flex flex-wrap gap-1">
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="label px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </div>
      <div className="py-8">{children}</div>
    </div>
  )
}

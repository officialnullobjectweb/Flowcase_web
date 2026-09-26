import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">      <p className="label mt-6 text-muted-foreground">
        404
      </p>
      <h1 className="display-tight mt-3 font-display text-3xl font-bold sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        That link has flowed elsewhere. Head back to the catalogue and pick a
        case.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="label inline-flex rounded-full bg-primary px-7 py-3 text-primary-foreground transition hover:bg-primary/85"
        >
          Home
        </Link>
        <Link
          href="/shop"
          className="label inline-flex rounded-full border border-border px-7 py-3 transition hover:border-foreground"
        >
          Shop all cases
        </Link>
      </div>
    </div>
  )
}

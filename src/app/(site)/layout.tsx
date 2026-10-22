import Link from "next/link";
import { SITE } from "@/lib/present";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-5 pb-2 flex items-baseline justify-between gap-4">
        <Link href="/" className="font-display text-xl no-underline">
          Alive At Once
        </Link>
        <nav className="flex gap-5 text-sm text-muted">
          <Link href="/search" className="hover:text-ink">Find a person</Link>
          <Link href="/collections" className="hover:text-ink">Collections</Link>
          <Link href="/about" className="hover:text-ink">About</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 sm:px-6 mt-16">
        <div className="py-10 border-t border-rule text-sm text-muted flex flex-wrap gap-x-6 gap-y-2">
          <span>{SITE}</span>
          <span>Dates from Wikidata (CC0). Portraits from Wikimedia Commons.</span>
          <Link href="/about#credits" className="hover:text-ink">Photo credits</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Search } from "../Search";
import { CloseIcon } from "./icons";
import { useDialog } from "./useDialog";

/** Everything beyond the card: full-screen sheet on phones, a dropdown on desktop. */
export function Menu({ onClose }: { onClose: () => void }) {
  const box = useDialog<HTMLDivElement>(onClose);

  const item = "block rounded-2xl px-4 py-3 hover:bg-paper-2";
  return (
    <div ref={box} className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" tabIndex={-1} aria-label="Close menu" className="absolute inset-0 hidden bg-black/40 sm:block" onClick={onClose} />
      <div className="fade-up absolute inset-0 flex flex-col bg-paper px-4 pb-8 pt-3 sm:inset-auto sm:right-4 sm:top-14 sm:w-96 sm:rounded-3xl sm:border sm:border-rule sm:p-3 sm:shadow-2xl">
        <div className="flex items-center justify-between sm:hidden">
          <span className="font-display text-xl">Alive At Once</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <nav className="mt-6 sm:mt-0">
          <div className="px-4 pb-4 pt-2">
            <p className="mb-2 font-display text-2xl">Find a person</p>
            <Search placeholder="Einstein, Cleopatra, Beyoncé…" />
          </div>
          <Link href="/collections" className={item} onClick={onClose}>
            <span className="block font-display text-2xl">Collections</span>
            <span className="block text-sm text-muted">Science to pop culture, same birthday, just in time</span>
          </Link>
          <Link href="/about" className={item} onClick={onClose}>
            <span className="block font-display text-2xl">About</span>
            <span className="block text-sm text-muted">What this is, where the dates and photos come from</span>
          </Link>
        </nav>
        <p className="mt-auto px-4 pt-6 text-sm text-muted sm:mt-2">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link> · <Link href="/terms" className="hover:text-ink">Terms</Link> ·{" "}
          <Link href="/credits" className="hover:text-ink">Photo credits</Link>
        </p>
      </div>
    </div>
  );
}

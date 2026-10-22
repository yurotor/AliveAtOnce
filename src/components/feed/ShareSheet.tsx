"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import type { Fact } from "@/lib/db";
import { factPath, plainHeadline, SITE_URL } from "@/lib/present";
import { CloseIcon, InstagramIcon, LinkIcon, TikTokIcon, WhatsAppIcon } from "./icons";

type Target = "whatsapp" | "tiktok" | "instagram" | "copy";

/**
 * WhatsApp gets a link; TikTok and Instagram can't be posted to from the web, so
 * they get the 9:16 card through the phone's share sheet, or a download where
 * files can't be shared (desktop).
 */
export function ShareSheet({ fact, onClose, onToast }: { fact: Fact; onClose: () => void; onToast: (msg: string) => void }) {
  const url = `${SITE_URL}${factPath(fact)}`;
  const text = plainHeadline(fact);
  const [file, setFile] = useState<File | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const first = useRef<HTMLAnchorElement>(null);

  // Fetch the story image as soon as the sheet opens, so tapping TikTok/Instagram
  // can call navigator.share() straight away (iOS requires a fresh tap).
  useEffect(() => {
    let live = true;
    fetch(`${factPath(fact)}/story`)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        if (!live) return;
        const f = new File([blob], `alive-at-once-${fact.slug}.png`, { type: "image/png" });
        setFile(f);
        setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [fact]);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const log = (target: Target) => track("share", { target, bridge: fact.slug });

  async function shareImage(target: "tiktok" | "instagram") {
    log(target);
    const f: File = file ?? new File([await (await fetch(`${factPath(fact)}/story`)).blob()], `alive-at-once-${fact.slug}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f] });
        onClose();
      } catch {
        // dismissed
      }
      return;
    }
    const href = URL.createObjectURL(f);
    const a = Object.assign(document.createElement("a"), { href, download: f.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    onToast("Card downloaded");
    onClose();
  }

  async function copy() {
    log("copy");
    try {
      await navigator.clipboard.writeText(url);
      onToast("Link copied");
    } catch {
      onToast(url);
    }
    onClose();
  }

  const row = "flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left hover:bg-paper-2 focus-visible:bg-paper-2";
  const hint = canShareFiles ? "Share the card" : "Download the card";
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Share">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-up relative w-full max-w-sm rounded-t-3xl border border-rule bg-paper p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <h2 className="font-display text-2xl">Share</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <a
          ref={first}
          className={row}
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { log("whatsapp"); onClose(); }}
        >
          <WhatsAppIcon className="text-[#25d366]" />
          <span><span className="block font-medium">WhatsApp</span><span className="block text-sm text-muted">Send the link</span></span>
        </a>
        <button type="button" className={row} onClick={() => shareImage("tiktok")}>
          <TikTokIcon />
          <span><span className="block font-medium">TikTok</span><span className="block text-sm text-muted">{hint}</span></span>
        </button>
        <button type="button" className={row} onClick={() => shareImage("instagram")}>
          <InstagramIcon className="text-[#e1306c]" />
          <span><span className="block font-medium">Instagram</span><span className="block text-sm text-muted">{hint}</span></span>
        </button>
        <button type="button" className={row} onClick={copy}>
          <LinkIcon />
          <span><span className="block font-medium">Copy link</span><span className="block text-sm text-muted">{url.replace(/^https?:\/\//, "")}</span></span>
        </button>
      </div>
    </div>
  );
}

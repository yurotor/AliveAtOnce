"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/present";

/** Share the page natively where supported, or copy its link. */
export function Share({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}${path}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // dismissed — fall through to copy
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={share}
        className="rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:opacity-90"
      >
        {copied ? "Link copied" : "Share this"}
      </button>
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-rule px-5 py-2.5 text-sm hover:border-ink"
      >
        Post on X
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-rule px-5 py-2.5 text-sm hover:border-ink"
      >
        Send on WhatsApp
      </a>
    </div>
  );
}

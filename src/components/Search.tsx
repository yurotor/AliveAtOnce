"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { slug: string; name: string; years: string; description: string };

export function Search({ autoFocus = false, placeholder = "Search anyone — Einstein, Cleopatra, Beyoncé…" }: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const req = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const id = ++req.current;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok && id === req.current) {
        setHits(await res.json());
        setActive(0);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const shown = q.trim().length < 2 ? [] : hits;

  return (
    <div className="relative">
      <label htmlFor="person-search" className="sr-only">Find a person</label>
      <input
        id="person-search"
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && shown[active]) router.push(`/p/${shown[active].slug}`);
        }}
        role="combobox"
        aria-expanded={shown.length > 0}
        aria-controls="person-search-results"
        aria-activedescendant={shown[active] ? `hit-${shown[active].slug}` : undefined}
        className="w-full rounded-full border border-rule bg-paper-2 px-5 py-3 text-base placeholder:text-muted focus:border-bridge focus:outline-none"
      />
      {shown.length > 0 && (
        <ul
          id="person-search-results"
          role="listbox"
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-rule bg-paper shadow-lg"
        >
          {shown.map((h, i) => (
            <li key={h.slug} id={`hit-${h.slug}`} role="option" aria-selected={i === active}>
              <a
                href={`/p/${h.slug}`}
                onMouseEnter={() => setActive(i)}
                className={`block px-5 py-2.5 ${i === active ? "bg-paper-2" : ""}`}
              >
                <span className="font-medium">{h.name}</span>{" "}
                <span className="text-muted text-sm">{h.years}</span>
                <span className="block text-sm text-muted truncate">{h.description}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

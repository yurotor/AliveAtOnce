"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Fact } from "@/lib/db";
import { portraitSources } from "@/lib/photo";
import { spaceOut, type FeedItem } from "@/lib/feed-order";
import { factPath, plainHeadline } from "@/lib/present";
import { CardArt, cssUnit, PORTRAIT_SIZES } from "../CardArt";
import { CardBack } from "./CardBack";
import { Menu } from "./Menu";
import { ShareSheet } from "./ShareSheet";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MenuIcon, ShareIcon } from "./icons";

const FONTS = { display: "var(--font-gloock), Georgia, serif", body: "var(--font-hanken), system-ui, sans-serif" };
const HINT_KEY = "aao:swiped";
/** i mod n, always in [0, n). */
const wrap = (i: number, n: number) => ((i % n) + n) % n;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shuffle within windows of 6, so the order stays roughly best-first but return visits feel fresh. */
function lightShuffle<T>(xs: T[], window = 6) {
  const out = [...xs];
  for (let start = 0; start < out.length; start += window) {
    const end = Math.min(start + window, out.length);
    for (let i = end - 1; i > start; i--) {
      const j = start + Math.floor(Math.random() * (i - start + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out;
}

function preloadPortraits(f: Fact) {
  for (const p of [f.early, f.bridge, f.late]) {
    if (!p.photo) continue;
    const img = new Image();
    const { src, srcSet } = portraitSources(p.photo);
    img.sizes = PORTRAIT_SIZES;
    img.srcset = srcSet;
    img.src = src;
  }
}

/**
 * The homepage: one full-screen bridge card at a time. Swipe up/down (phones),
 * arrows, keys or the wheel (desktop) move through the ranked feed; each card
 * has its own /b/{slug} URL, kept in sync with history.pushState.
 */
export function BridgeFeed({ initial, feed, home = false }: { initial: Fact; feed: FeedItem[]; home?: boolean }) {
  const [fact, setFact] = useState(initial);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sheet, setSheet] = useState<null | "share" | "menu">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(false);

  const order = useRef([initial.slug, ...feed.filter((f) => f.slug !== initial.slug).map((f) => f.slug)]);
  // The feed loops both ways: index is any integer, wrapped onto the order.
  const at = useCallback((i: number) => order.current[wrap(i, order.current.length)], []);
  const cache = useRef(new Map<string, Promise<Fact>>([[initial.slug, Promise.resolve(initial)]]));
  const stage = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const entering = useRef<0 | 1 | -1>(0);
  const live = useRef({ index, flipped, sheet });
  useEffect(() => { live.current = { index, flipped, sheet }; });

  const load = useCallback((slug: string) => {
    let p = cache.current.get(slug);
    if (!p) {
      p = fetch(`/api/b/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))));
      p.catch(() => cache.current.delete(slug));
      cache.current.set(slug, p);
    }
    return p;
  }, []);

  // Fresh order per visit (the first card stays put), spaced so the same faces don't keep coming back.
  useEffect(() => {
    const rest = lightShuffle(feed.filter((f) => f.slug !== initial.slug));
    const seen = [initial.early.id, initial.bridge.id, initial.late.id];
    order.current = [initial.slug, ...spaceOut(rest, seen).map((f) => f.slug)];
  }, [feed, initial]);

  // Preload the next two bridges (and the previous one) so a swipe never shows an empty circle.
  useEffect(() => {
    for (const i of [index + 1, index + 2, index - 1]) load(at(i)).then(preloadPortraits, () => {});
  }, [index, at, load]);

  // First visit only: a "swipe for more" hint.
  useEffect(() => {
    let seen = true;
    try { seen = !!localStorage.getItem(HINT_KEY); } catch {}
    if (seen) return;
    const t = setTimeout(() => setHint(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const show = useCallback((f: Fact, i: number) => {
    setFact(f);
    setIndex(i);
    setFlipped(false);
    document.title = `${plainHeadline(f)} · Alive At Once`;
  }, []);

  const go = useCallback(async (delta: 1 | -1) => {
    const el = stage.current;
    if (busy.current || !el || order.current.length < 2) return;
    busy.current = true;
    setHint(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch {}
    try {
      // A card that won't load (e.g. a slug gone since the feed list was cached) is dropped, not a dead end.
      let i = live.current.index;
      let next: Fact | null = null;
      while (!next && order.current.length > 1) {
        const k = wrap(i + delta, order.current.length);
        next = await load(order.current[k]).catch(() => null);
        if (!next) {
          if (k < wrap(i, order.current.length)) i--; // keep i pointing at the current card
          order.current.splice(k, 1);
        }
      }
      if (!next) throw new Error("feed is empty");
      if (!reducedMotion()) {
        const from = el.style.transform || "none";
        await el.animate(
          [{ transform: from, opacity: el.style.opacity || 1 }, { transform: `translateY(${-delta * 28}%)`, opacity: 0 }],
          { duration: 150, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
        ).finished;
        entering.current = delta;
      }
      el.style.transform = "";
      el.style.opacity = "";
      history.pushState({ aao: next.slug }, "", factPath(next));
      show(next, i + delta);
    } catch {
      el.style.transform = "";
      el.style.opacity = "";
      el.getAnimations().forEach((a) => a.cancel());
    } finally {
      busy.current = false;
    }
  }, [load, show]);

  // Slide the new card in from the side it came from.
  useLayoutEffect(() => {
    const el = stage.current;
    const d = entering.current;
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel());
    if (!d) return;
    entering.current = 0;
    el.animate(
      [{ transform: `translateY(${d * 28}%)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 240, easing: "cubic-bezier(0, 0, 0.2, 1)" },
    );
  }, [fact.slug]);

  // Back/forward buttons.
  useEffect(() => {
    const onPop = () => {
      const m = location.pathname.match(/^\/b\/([^/]+)/);
      const slug = m ? decodeURIComponent(m[1]) : home ? order.current[0] : null;
      if (!slug) return;
      const cur = live.current.index;
      let k = order.current.indexOf(slug);
      if (k < 0) {
        k = wrap(cur, order.current.length) + 1;
        order.current.splice(k, 0, slug);
      }
      // Step to the copy of that card nearest the current one on the loop.
      let d = wrap(k - cur, order.current.length);
      if (d > order.current.length / 2) d -= order.current.length;
      const i = cur + d;
      load(slug).then((f) => show(f, i), () => location.reload());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [home, load, show]);

  // Keyboard and mouse wheel (one card per wheel gesture).
  useEffect(() => {
    let acc = 0, last = 0, used = false;
    const blocked = () => !!live.current.sheet;
    const onWheel = (e: WheelEvent) => {
      if (blocked() || live.current.flipped || e.ctrlKey) return;
      const now = performance.now();
      if (now - last > 200) { acc = 0; used = false; }
      last = now;
      if (used) return;
      acc += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(acc) > 40) {
        used = true;
        go(acc > 0 ? 1 : -1);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (blocked() || e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
      else if (e.key === "Escape" && live.current.flipped) setFlipped(false);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [go]);

  // Vertical swipe on touch: drag follows the finger, release past a threshold moves on.
  const drag = useRef<{ y: number; t: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || flipped || busy.current) return;
    drag.current = { y: e.clientY, t: e.timeStamp, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = stage.current;
    if (!d || !el) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) > 8) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) {
      el.style.transform = `translateY(${dy * 0.55}px)`;
      el.style.opacity = String(1 - Math.min(Math.abs(dy) / 700, 0.35));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = stage.current;
    drag.current = null;
    if (!d || !el || !d.moved) return;
    suppressClick.current = true;
    const dy = e.clientY - d.y;
    const v = dy / Math.max(e.timeStamp - d.t, 1);
    if (Math.abs(dy) > 70 || (Math.abs(dy) > 24 && Math.abs(v) > 0.5)) {
      go(dy < 0 ? 1 : -1);
    } else {
      const from = el.style.transform;
      el.style.transform = "";
      el.style.opacity = "";
      if (!reducedMotion()) el.animate([{ transform: from }, { transform: "none" }], { duration: 180, easing: "ease-out" });
    }
  };

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const round = "flex h-11 w-11 items-center justify-center rounded-full border border-rule text-ink transition hover:border-ink disabled:opacity-30 disabled:hover:border-rule";
  const pill = "flex h-11 items-center gap-2 rounded-full border border-rule px-5 text-sm font-medium transition hover:border-ink";

  return (
    <div
      className="theme-dark fixed inset-0 overflow-hidden bg-paper text-ink"
      style={{
        "--cw": "min(calc(100vw - 32px), 720px, calc((100dvh - 170px) * 0.92))",
        "--u": "calc(var(--cw) / 1000)",
        // Words grow up to 1.3x when the card is width-bound (phones), never past the height-bound size.
        "--ut": "max(var(--u), min(calc(var(--u) * 1.3), calc((100dvh - 170px) * 0.92 / 1000)))",
      } as CSSProperties}
    >
      <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-rule/40 bg-paper/70 px-4 backdrop-blur-md">
        <Link href="/" className="font-display text-xl" aria-label="Alive At Once, today’s bridge">
          Alive At Once
        </Link>
        <button type="button" onClick={() => setSheet("menu")} aria-label="Menu" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-paper-2">
          <MenuIcon />
        </button>
      </header>

      <main className="absolute inset-0 flex flex-col items-center pb-[env(safe-area-inset-bottom)] pt-14">
        <div
          ref={stage}
          className="flip relative min-h-0 w-[var(--cw)] flex-1 py-4"
          style={{ touchAction: flipped ? "pan-y" : "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => {
            if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
          }}
        >
          <div className="flip-inner h-full w-full" data-flipped={flipped}>
            <div className="flip-face absolute inset-0 flex" aria-hidden={flipped} inert={flipped}>
              <CardArt key={fact.slug} fact={fact} u={cssUnit} fonts={FONTS} live fill headingTag="h1" />
            </div>
            <div className="flip-face flip-back absolute inset-0" aria-hidden={!flipped} inert={!flipped}>
              {flipped && <CardBack fact={fact} />}
            </div>
          </div>
        </div>

        <nav aria-label="Bridge controls" className="flex items-center gap-3 pb-5 pt-2">
          <button type="button" className={round} onClick={() => go(-1)} aria-label="Previous bridge">
            <ChevronUp className="sm:hidden" />
            <ChevronLeft className="hidden sm:block" />
          </button>
          <button type="button" className={pill} onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
            {flipped ? "back" : "how?"}
          </button>
          <button type="button" className={pill} onClick={() => setSheet("share")}>
            <ShareIcon className="h-5 w-5" /> Share
          </button>
          <button type="button" className={round} onClick={() => go(1)} aria-label="Next bridge">
            <ChevronDown className="sm:hidden" />
            <ChevronRight className="hidden sm:block" />
          </button>
        </nav>
      </main>

      {/* Desktop: big arrows at the screen edges. */}
      <button
        type="button"
        onClick={() => go(-1)}
       
        aria-label="Previous bridge"
        className="absolute left-5 top-1/2 z-20 hidden h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink disabled:invisible sm:flex"
      >
        <ChevronLeft className="h-9 w-9" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
       
        aria-label="Next bridge"
        className="absolute right-5 top-1/2 z-20 hidden h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink disabled:invisible sm:flex"
      >
        <ChevronRight className="h-9 w-9" />
      </button>

      {hint && !flipped && (
        // Portrait: in the space above the faces. Landscape: under the right-hand arrow, clear of the card.
        <p
          className="fade-up pointer-events-none absolute inset-x-0 top-[4.5rem] z-20 flex justify-center [@media(min-aspect-ratio:3/2)]:left-auto [@media(min-aspect-ratio:3/2)]:right-5 [@media(min-aspect-ratio:3/2)]:top-[calc(50%+2.75rem)]"
          aria-live="polite"
        >
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg">
            <span className="pointer-coarse:inline hidden">Swipe up for more</span>
            <span className="pointer-coarse:hidden">Scroll or press → for more</span>
          </span>
        </p>
      )}
      {toast && (
        <p role="status" className="fade-up absolute inset-x-0 top-20 z-50 flex justify-center">
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper shadow-lg">{toast}</span>
        </p>
      )}
      {sheet === "share" && <ShareSheet fact={fact} onClose={closeSheet} onToast={flash} />}
      {sheet === "menu" && <Menu onClose={closeSheet} />}
    </div>
  );
}

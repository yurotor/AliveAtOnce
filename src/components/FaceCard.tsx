import type { CSSProperties } from "react";
import Link from "next/link";
import type { Fact, Person } from "@/lib/db";
import { shortName, visible } from "@/lib/headline";
import { factPath, personPath } from "@/lib/present";
import { cssUnit, Faces, Portrait } from "./CardArt";

const FONTS = { display: "var(--font-gloock), Georgia, serif", body: "var(--font-hanken), system-ui, sans-serif" };
// Faces are laid out in units of the card's width (container query).
const sized = { containerType: "inline-size" } as CSSProperties;
const unit = { "--u": "calc(100cqw / 1000)" } as CSSProperties;

/** A bridge as a small card: the three overlapping faces and the headline. */
export function FaceCard({ fact }: { fact: Fact }) {
  return (
    <Link href={factPath(fact)} className="theme-dark group block rounded-3xl bg-paper p-4 text-ink no-underline" style={sized}>
      <div style={unit}>
        <Faces fact={fact} u={cssUnit} fonts={FONTS} live labels={false} lifeline={false} />
      </div>
      <p className="mt-3 text-center font-display text-xl leading-tight text-balance group-hover:underline decoration-1">
        {visible(fact.headline)}
      </p>
    </Link>
  );
}

/** Two people side by side, for "same birthday". */
export function PairCard({ a, b, caption }: { a: Person; b: Person; caption: string }) {
  return (
    <div className="theme-dark rounded-3xl bg-paper p-4 text-ink" style={sized}>
      <div className="flex justify-center" style={unit}>
        {[a, b].map((p, i) => (
          <Link key={p.id} href={personPath(p)} className="flex flex-col items-center" style={i ? { marginLeft: "calc(-60 * var(--u))" } : { zIndex: 1 }}>
            <Portrait person={p} size={420} u={cssUnit} live ring={i ? "rgba(233,234,243,0.28)" : "#7d89ff"} />
          </Link>
        ))}
      </div>
      <p className="mt-3 text-center font-display text-xl leading-tight">
        <Link href={personPath(a)} className="hover:underline">{shortName(a)}</Link> <em className="text-bridge">and</em>{" "}
        <Link href={personPath(b)} className="hover:underline">{shortName(b)}</Link>
      </p>
      <p className="mt-1 text-center text-sm text-muted">{caption}</p>
    </div>
  );
}

export function FaceGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

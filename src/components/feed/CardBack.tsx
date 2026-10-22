import Link from "next/link";
import type { Fact } from "@/lib/db";
import { emphasis, shortName } from "@/lib/headline";
import { currentYear } from "@/lib/life";
import { moments, personPath, trio } from "@/lib/present";
import { Timeline } from "../Timeline";

/** The back of the card: proof for skeptics. Not part of any share image. */
export function CardBack({ fact }: { fact: Fact }) {
  const m = moments(fact);
  const people = trio(fact);
  return (
    <div className="h-full overflow-y-auto overscroll-contain px-1 py-2 text-sm">
      {/* The claim being proved, so nobody has to flip back to remember it. */}
      <p className="mb-6 text-balance font-display text-xl leading-snug">
        {emphasis(fact.headline).map((s, i) => (s.em ? <em key={i} className="pr-[0.08em] text-bridge">{s.text}</em> : s.text))}
      </p>
      <Timeline
        rows={[
          { person: fact.early, tone: "past" },
          { person: fact.bridge, tone: "bridge" },
          { person: fact.late, tone: "future" },
        ]}
        markers={[
          { at: m.earlyDied.at, label: m.earlyDied.fact },
          { at: m.lateBorn.at, label: m.lateBorn.fact },
        ]}
        now={currentYear()}
      />

      <dl className="mt-6 grid gap-3">
        <div className="border-l-2 border-past pl-3">
          <dt className="text-xs text-muted">{m.earlyDied.year}</dt>
          <dd className="text-base">{m.earlyDied.fact}</dd>
        </div>
        <div className="border-l-2 border-future pl-3">
          <dt className="text-xs text-muted">{m.lateBorn.year}</dt>
          <dd className="text-base">{m.lateBorn.fact}</dd>
        </div>
      </dl>

      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
        {people.map((p) => (
          <Link key={p.id} href={personPath(p)} className="underline hover:text-bridge">
            Explore {shortName(p)}
          </Link>
        ))}
      </p>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Dates from Wikidata:{" "}
        {people.map((p, i) => (
          <span key={p.id}>
            <a href={`https://www.wikidata.org/wiki/${p.id}`} className="underline hover:text-ink">{shortName(p)}</a>
            {i < 2 ? ", " : ". "}
          </span>
        ))}
        An overlap is only claimed when it holds for every reading of the dates.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Photos:{" "}
        {people.map((p, i) =>
          p.photo ? (
            <span key={p.id}>
              {shortName(p)} by{" "}
              <a href={p.photo.source} className="underline hover:text-ink">{p.photo.author}</a>, {p.photo.license}
              {i < 2 ? "; " : "."}
            </span>
          ) : null,
        )}{" "}
        <Link href="/credits" className="underline hover:text-ink">All credits</Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Fact } from "@/lib/db";
import { factLine, factPath, moments, personPath } from "@/lib/present";
import { MiniTimeline, Timeline, type TimelineRow } from "./Timeline";
import { Share } from "./Share";

const rowsFor = (f: Fact): TimelineRow[] => [
  { person: f.early, tone: "past" },
  { person: f.bridge, tone: "bridge" },
  { person: f.late, tone: "future" },
];

/** A bridge at full size: the line, the three lives, and the two moments that make it work. */
export function FactView({ fact, now, heading = "h1" }: { fact: Fact; now: number; heading?: "h1" | "h2" }) {
  const m = moments(fact);
  const H = heading;
  return (
    <article>
      <H className="font-display text-[2.1rem] leading-[1.08] sm:text-5xl sm:leading-[1.05] max-w-[22ch] text-balance">
        {factLine(fact)}
      </H>
      <div className="mt-10 sm:mt-12">
        <Timeline
          rows={rowsFor(fact)}
          now={now}
          animate
          markers={[
            { at: m.earlyDied.at, label: m.earlyDied.text },
            { at: m.lateBorn.at, label: m.lateBorn.text },
          ]}
        />
      </div>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 max-w-3xl">
        <div className="border-l-2 border-past pl-3">
          <dt className="text-sm text-muted">{m.earlyDied.year}</dt>
          <dd>{m.earlyDied.text}.</dd>
        </div>
        <div className="border-l-2 border-future pl-3">
          <dt className="text-sm text-muted">{m.lateBorn.year}</dt>
          <dd>{m.lateBorn.text}.</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-muted">
        Explore{" "}
        <Link href={personPath(fact.bridge)} className="underline hover:text-ink">{fact.bridge.name}</Link>,{" "}
        <Link href={personPath(fact.early)} className="underline hover:text-ink">{fact.early.name}</Link> or{" "}
        <Link href={personPath(fact.late)} className="underline hover:text-ink">{fact.late.name}</Link>.
      </p>
      <Share path={factPath(fact)} text={factLine(fact)} />
    </article>
  );
}

/** Compact list of bridges: mini timeline + line. */
export function FactList({ facts, now }: { facts: Fact[]; now: number }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {facts.map((f) => (
        <li key={f.id}>
          <Link
            href={factPath(f)}
            className="group grid gap-3 py-5 sm:grid-cols-[1fr_11rem] sm:gap-8 sm:items-center"
          >
            <span className="font-display text-xl leading-snug group-hover:underline decoration-1">
              {factLine(f)}
            </span>
            <MiniTimeline rows={rowsFor(f)} now={now} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { displayYear, type Life } from "@/lib/life";
import { lifeYears } from "@/lib/present";

export type Tone = "past" | "bridge" | "future" | "neutral";

export type TimelineRow = {
  person: Life & { slug?: string };
  tone: Tone;
};

export type Marker = { at: number; label: string };

const TONE_BG: Record<Tone, string> = {
  past: "bg-past",
  bridge: "bg-bridge",
  future: "bg-future",
  neutral: "bg-muted/45",
};

function niceStep(span: number, target = 6) {
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
}

function scaleFor(rows: TimelineRow[], now: number) {
  const lo = Math.min(...rows.map((r) => r.person.bLo));
  const hi = Math.max(...rows.map((r) => r.person.dHi ?? now));
  const pad = (hi - lo) * 0.03;
  const min = lo - pad;
  const max = hi + pad;
  const x = (y: number) => ((y - min) / (max - min)) * 100;
  const step = niceStep(max - min);
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
  return { x, ticks };
}

function Bar({ p, tone, x, now, grow, delay, thin }: {
  p: Life; tone: Tone; x: (y: number) => number; now: number; grow?: boolean; delay?: number; thin?: boolean;
}) {
  const start = x((p.bLo + p.bHi) / 2);
  const end = x(p.dLo === null ? now : (p.dLo + p.dHi!) / 2);
  const living = p.dLo === null;
  return (
    <div
      className={`absolute ${thin ? "h-1.5" : "h-3"} rounded-full ${TONE_BG[tone]} ${grow ? "bar-grow" : ""}`}
      style={{
        left: `${start}%`,
        width: `${Math.max(end - start, 0.6)}%`,
        animationDelay: delay ? `${delay}ms` : undefined,
        // A living person's bar fades out rather than ending.
        maskImage: living ? "linear-gradient(to right, black 80%, transparent)" : undefined,
      }}
    />
  );
}

/** The hero diagram: a few named lifetimes on one year axis, with marked moments. */
export function Timeline({ rows, markers = [], now, animate = false }: {
  rows: TimelineRow[]; markers?: Marker[]; now: number; animate?: boolean;
}) {
  const { x, ticks } = scaleFor(rows, now);
  return (
    <figure className="relative" aria-label="Timeline of lifetimes">
      <div className="relative">
        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute -top-1 bottom-0 border-l border-dashed border-ink/40"
            style={{ left: `${x(m.at)}%` }}
            aria-hidden
          >
            <span className="absolute -top-5 -translate-x-1/2 text-xs text-muted whitespace-nowrap">
              {displayYear(m.at)}
            </span>
          </div>
        ))}
        <ol className="relative space-y-5 pt-6">
          {rows.map((r, i) => {
            const start = x((r.person.bLo + r.person.bHi) / 2);
            const alignRight = start > 55;
            const end = x(r.person.dLo === null ? now : (r.person.dLo + r.person.dHi!) / 2);
            const name = r.person.slug ? (
              <Link href={`/p/${r.person.slug}`} className="font-medium hover:underline">
                {r.person.name}
              </Link>
            ) : (
              <span className="font-medium">{r.person.name}</span>
            );
            return (
              <li key={r.person.name} className="relative h-10">
                <div
                  className="absolute top-0 text-sm whitespace-nowrap"
                  style={alignRight ? { right: `${100 - end}%` } : { left: `${start}%` }}
                >
                  {name} <span className="text-muted">{lifeYears(r.person)}</span>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-3">
                  <Bar p={r.person} tone={r.tone} x={x} now={now} grow={animate} delay={i * 180} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="relative mt-4 h-5 border-t border-rule" aria-hidden>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-1 -translate-x-1/2 text-xs text-muted"
            style={{ left: `${x(t)}%` }}
          >
            {displayYear(t)}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Three thin bars, no labels — the thumbnail for a bridge in a list. */
export function MiniTimeline({ rows, now }: { rows: TimelineRow[]; now: number }) {
  const { x } = scaleFor(rows, now);
  return (
    <div className="relative w-full space-y-1" aria-hidden>
      {rows.map((r) => (
        <div key={r.person.name} className="relative h-1.5">
          <Bar p={r.person} tone={r.tone} x={x} now={now} thin />
        </div>
      ))}
    </div>
  );
}

/**
 * A person's lifetime against the famous people who overlapped it, as a
 * Gantt chart with their lifespan shaded as a band.
 */
export function LifeChart({ subject, others, now }: {
  subject: Life & { slug?: string };
  others: TimelineRow[];
  now: number;
}) {
  const rows: TimelineRow[] = [{ person: subject, tone: "bridge" }, ...others];
  const { x, ticks } = scaleFor(rows, now);
  const bandL = x(subject.bHi);
  const bandR = x(subject.dLo ?? now);
  return (
    <figure aria-label={`${subject.name}'s lifetime alongside famous contemporaries`}>
      <div className="relative">
        <div
          className="absolute inset-y-0 bg-bridge/8 border-x border-bridge/30"
          style={{ left: `${bandL}%`, width: `${bandR - bandL}%` }}
          aria-hidden
        />
        <ol className="relative">
          {rows.map((r, i) => {
            const start = x((r.person.bLo + r.person.bHi) / 2);
            const end = x(r.person.dLo === null ? now : (r.person.dLo + r.person.dHi!) / 2);
            const alignRight = start > 60;
            return (
              <li key={r.person.name + i} className={`relative h-9 ${i === 0 ? "mb-2" : ""}`}>
                <div
                  className="absolute top-0.5 text-[13px] leading-tight whitespace-nowrap"
                  style={alignRight ? { right: `${100 - end}%` } : { left: `${start}%` }}
                >
                  {r.person.slug && i > 0 ? (
                    <Link href={`/p/${r.person.slug}`} className="hover:underline">{r.person.name}</Link>
                  ) : (
                    <span className="font-semibold">{r.person.name}</span>
                  )}{" "}
                  <span className="text-muted">{lifeYears(r.person)}</span>
                </div>
                <div className="absolute inset-x-0 bottom-1.5 h-1.5">
                  <Bar p={r.person} tone={r.tone} x={x} now={now} thin />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="relative mt-2 h-5 border-t border-rule" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute top-1 -translate-x-1/2 text-xs text-muted" style={{ left: `${x(t)}%` }}>
            {displayYear(t)}
          </span>
        ))}
      </div>
    </figure>
  );
}

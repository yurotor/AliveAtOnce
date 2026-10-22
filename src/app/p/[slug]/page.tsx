import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { getFactsFor, getOverlaps, getPerson, getTopSlugs, type Person } from "@/lib/db";
import { ageAt, currentYear } from "@/lib/life";
import { lifeNote, lifeYears, personPath, thumb } from "@/lib/present";
import { LifeChart, type TimelineRow } from "@/components/Timeline";
import { FactList } from "@/components/FactView";

// Pages beyond the prerendered sample render fully on first visit (then cache) —
// we want complete HTML for crawlers rather than a streamed skeleton.
export const instant = false;

export async function generateStaticParams() {
  return (await getTopSlugs(100)).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const p = await getPerson((await params).slug);
  if (!p) return {};
  return {
    title: `Who was alive at the same time as ${p.name}?`,
    description: `${p.name} (${lifeYears(p)}), ${p.description}. See the famous people whose lifetimes overlapped with ${p.name}'s.`,
    alternates: { canonical: personPath(p) },
  };
}

export default async function PersonPage({ params }: PageProps<"/p/[slug]">) {
  "use cache";
  cacheLife("days");
  const p = await getPerson((await params).slug);
  if (!p) notFound();
  const [{ before, after }, facts] = await Promise.all([getOverlaps(p), getFactsFor(p.id)]);
  const now = currentYear();

  // Chart: the most famous few on each side, in birth order.
  const chartRows: TimelineRow[] = [
    ...before.slice(0, 6).map((o) => ({ person: o, tone: "past" as const })),
    ...after.slice(0, 6).map((o) => ({ person: o, tone: "future" as const })),
  ].sort((a, b) => a.person.bLo - b.person.bLo);
  const note = lifeNote(p);
  const portrait = thumb(p.image, 360);

  return (
    <>
      <section className="pt-10 sm:pt-16 pb-10 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl leading-none">{p.name}</h1>
          <p className="mt-4 text-lg">
            {p.bornLabel} – {p.diedLabel ?? "present"}
            {note && <span className="text-muted"> ({note})</span>}
          </p>
          {p.description && <p className="mt-1 text-muted first-letter:uppercase">{p.description}</p>}
        </div>
        {portrait && (
          // Wikimedia serves its own thumbnails; no need for Next's image optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portrait}
            alt={`Portrait of ${p.name}`}
            width={144}
            height={180}
            className="h-44 w-36 rounded-lg object-cover object-top bg-paper-2 grayscale-[35%]"
          />
        )}
      </section>

      <section className="pb-12">
        <h2 className="font-display text-3xl mb-8">Who was alive at the same time as {p.name}?</h2>
        {chartRows.length > 0 ? (
          <LifeChart subject={p} others={chartRows} now={now} />
        ) : (
          <p className="text-muted">No famous contemporaries found in our data.</p>
        )}
      </section>

      {facts.length > 0 && (
        <section className="py-10 border-t border-rule">
          <h2 className="font-display text-3xl mb-6">Surprising overlaps</h2>
          <FactList facts={facts} now={now} />
        </section>
      )}

      <section className="py-10 border-t border-rule grid gap-10 sm:grid-cols-2">
        <OverlapList
          title={`Already alive when ${p.name} was born`}
          people={before}
          note={(o) => {
            const a = ageAt(o, p.bLo, p.bHi);
            return a ? `was ${a.phrase}` : null;
          }}
        />
        <OverlapList
          title={`Born during ${p.name}’s life`}
          people={after}
          note={(o) => {
            const a = ageAt(p, o.bLo, o.bHi);
            return a ? `${p.name} was ${a.phrase}` : null;
          }}
        />
      </section>

      {p.wiki && (
        <p className="text-sm text-muted">
          Read more about {p.name} on{" "}
          <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(p.wiki)}`} className="underline hover:text-ink">
            Wikipedia
          </a>
          .
        </p>
      )}
    </>
  );
}

function OverlapList({ title, people, note }: { title: string; people: Person[]; note: (o: Person) => string | null }) {
  if (!people.length) return null;
  return (
    <div>
      <h3 className="font-display text-2xl mb-4">{title}</h3>
      <ul className="space-y-2.5">
        {people.map((o) => {
          const n = note(o);
          return (
            <li key={o.id}>
              <Link href={personPath(o)} className="font-medium hover:underline">{o.name}</Link>{" "}
              <span className="text-muted text-sm">
                {lifeYears(o)}
                {n && ` (${n})`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

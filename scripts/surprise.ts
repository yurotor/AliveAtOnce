/**
 * Hard surprise filters, applied before Jev ever sees a candidate (see the
 * homepage spec, "Content quality"). Jev then ranks whatever survives.
 */
import { fieldOf, midpoint, readJSON, type Person } from "./lib";

/** Endpoints' life midpoints must be this far apart. Spec says ~100; 120 also drops Newton–Beethoven (113). */
export const MIN_MIDPOINT_GAP = Number(process.env.MIN_MIDPOINT_GAP ?? 120);
/** Endpoints must be in the top N by English Wikipedia pageviews. */
export const ENDPOINT_TOP = Number(process.env.ENDPOINT_TOP ?? 5000);
/**
 * Two heads of state far apart in time is the canonical "different eras" bridge
 * (Lincoln → Trump), so "same field" doesn't count against them.
 */
const SAME_FIELD_OK = new Set(["power"]);

export type Filter = (x: Person, e: Person, l: Person) => string | null;

export function surpriseFilter(people: Person[]): Filter {
  const pvRank = new Map([...people].sort((a, b) => b.pageviews - a.pageviews).map((p, i) => [p.id, i + 1]));
  const related = new Set(readJSON<string[]>("relations.json", []));
  const linked = (a: Person, b: Person) => related.has([a.id, b.id].sort().join("|"));
  const field = new Map<string, string | null>();
  const fieldFor = (p: Person) => {
    if (!field.has(p.id)) field.set(p.id, fieldOf(p.description));
    return field.get(p.id)!;
  };

  return (x, e, l) => {
    if (!x.image || !e.image || !l.image) return "missing photo";
    for (const end of [e, l]) if ((pvRank.get(end.id) ?? Infinity) > ENDPOINT_TOP) return `${end.name} not top ${ENDPOINT_TOP}`;
    const gap = midpoint(l) - midpoint(e);
    if (gap < MIN_MIDPOINT_GAP) return `midpoints ${Math.round(gap)}y apart`;
    const [fe, fl] = [fieldFor(e), fieldFor(l)];
    if (fe && fe === fl && !SAME_FIELD_OK.has(fe)) return `same field (${fe})`;
    if (linked(x, e) || linked(x, l) || linked(e, l)) return "same circle";
    return null;
  };
}

/** [bridge, early, late] by English Wikipedia title. */
export const BENCHMARKS = {
  pass: [
    ["Pablo_Picasso", "Charles_Darwin", "Eminem"],
    ["Albert_Einstein", "Karl_Marx", "Steve_Jobs"],
    ["Henry_Ford", "Abraham_Lincoln", "Donald_Trump"],
  ],
  reject: [
    ["Plato", "Socrates", "Alexander_the_Great"],
    ["Benjamin_Franklin", "Isaac_Newton", "Ludwig_van_Beethoven"],
  ],
};

export function benchmarkPeople(people: Person[]) {
  const byWiki = new Map(people.map((p) => [p.wiki, p]));
  const resolve = (ts: string[]) => ts.map((t) => byWiki.get(t)!) as [Person, Person, Person];
  return { pass: BENCHMARKS.pass.map(resolve), reject: BENCHMARKS.reject.map(resolve) };
}

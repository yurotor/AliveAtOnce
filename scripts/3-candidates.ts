/**
 * Step 2a — generate candidate "bridges": a person X whose lifetime overlapped
 * both an EARLY figure E and a LATE figure L, where E and L never overlapped each
 * other. ("Picasso was alive at the same time as Darwin… and Eminem.")
 *
 * All overlaps are uncertainty-safe (see lib.overlaps). Hard surprise filters
 * (scripts/surprise.ts: eras far apart, different fields, famous endpoints,
 * photos, no teacher/student or family links) drop the predictable ones, then a
 * cheap heuristic (fame of all three × how far apart E and L feel) picks the
 * best candidates; Jev does the real surprise scoring in step 4.
 *
 * Output: data/candidates.json
 */
import { readJSON, writeJSON, overlaps, type Person } from "./lib";
import { benchmarkPeople, surpriseFilter } from "./surprise";

const BRIDGE_POOL = Number(process.env.BRIDGE_POOL ?? 25_000); // who can be the middle person
const END_POOL = Number(process.env.END_POOL ?? 8_000); // who can be E or L (must be very recognisable)
const PER_BRIDGE = 3; // keep a few E/L combos per bridge person
const PER_SIDE = 25; // earlier/later figures considered per bridge person
const SHORTLIST = 30; // combos per bridge person that go into the global pick
const MAX_CANDIDATES = Number(process.env.MAX_CANDIDATES ?? 20_000);
// Stop Queen Victoria and Messi from ending every candidate: Jev only scores the
// top few thousand, so this decides how many different faces the feed can have.
const MAX_APPEARANCES = Number(process.env.MAX_APPEARANCES ?? 40);

export type Candidate = {
  key: string; // `${bridge}|${early}|${late}`
  bridge: string;
  early: string;
  late: string;
  gap: number; // years between E's death and L's birth
  heuristic: number;
};

const famous = (p: Person) => p.fame ** 3;

function main() {
  const people = readJSON<Person[]>("people.json");
  const byRank = [...people].sort((a, b) => a.rank - b.rank);
  const bridges = byRank.slice(0, BRIDGE_POOL);
  const ends = byRank.slice(0, END_POOL).filter((p) => p.image);
  const reject = surpriseFilter(people);
  const rejected = new Map<string, number>();

  const out: Candidate[] = [];
  for (const x of bridges) {
    // Earlier figures alive when X was born, scored by fame × how far back they were born.
    const earlies = ends
      .filter((e) => e.bHi < x.bLo && e.dLo !== null && overlaps(e, x))
      .map((e) => ({ p: e, s: famous(e) * (1 + (x.bLo - e.bHi) / 40) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_SIDE);
    // Later figures born while X was alive, scored by fame × how late they were born.
    const lates = ends
      .filter((l) => l.bLo > x.bHi && overlaps(l, x))
      .map((l) => ({ p: l, s: famous(l) * (1 + (l.bLo - x.bHi) / 40) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, PER_SIDE);

    const combos: Candidate[] = [];
    for (const { p: e } of earlies) {
      for (const { p: l } of lates) {
        const gap = l.bLo - e.dHi!;
        if (gap < 25) continue; // E and L must feel like different eras, not just miss each other
        const why = reject(x, e, l);
        if (why) {
          const k = why.replace(/^.* not top/, "not top").replace(/\d+y apart/, "too close");
          rejected.set(k, (rejected.get(k) ?? 0) + 1);
          continue;
        }
        // Surprise grows with the gap (diminishing past ~150y); fame of all three matters.
        const heuristic = famous(x) * famous(e) * famous(l) * Math.min(gap, 150) ** 0.7;
        combos.push({ key: `${x.id}|${e.id}|${l.id}`, bridge: x.id, early: e.id, late: l.id, gap, heuristic });
      }
    }
    // Shortlist the best combos, each end at most twice, so it spans many people.
    combos.sort((a, b) => b.heuristic - a.heuristic);
    const uses = new Map<string, number>();
    let listed = 0;
    for (const c of combos) {
      if (listed >= SHORTLIST) break;
      if ([c.early, c.late].some((id) => (uses.get(id) ?? 0) >= 2)) continue;
      for (const id of [c.early, c.late]) uses.set(id, (uses.get(id) ?? 0) + 1);
      out.push(c);
      listed++;
    }
  }

  // The spec's benchmark bridges must reach Jev if they pass the filters, whatever the heuristic says.
  const bench = benchmarkPeople(people);
  const keys = new Set(out.map((c) => c.key));
  for (const [x, e, l] of bench.pass) {
    const key = `${x.id}|${e.id}|${l.id}`;
    if (!reject(x, e, l) && !keys.has(key)) out.push({ key, bridge: x.id, early: e.id, late: l.id, gap: l.bLo - e.dHi!, heuristic: Infinity });
  }

  // Global pick, best first: up to PER_BRIDGE per bridge person, MAX_APPEARANCES per end.
  // Done here rather than per bridge so a capped end makes room for the next-best one.
  out.sort((a, b) => b.heuristic - a.heuristic);
  const seen = new Map<string, number>();
  const perBridge = new Map<string, number>();
  const kept: Candidate[] = [];
  for (const c of out) {
    if (kept.length >= MAX_CANDIDATES) break;
    if ((perBridge.get(c.bridge) ?? 0) >= PER_BRIDGE && c.heuristic !== Infinity) continue;
    if ([c.early, c.late].some((id) => (seen.get(id) ?? 0) >= MAX_APPEARANCES)) continue;
    for (const id of [c.early, c.late]) seen.set(id, (seen.get(id) ?? 0) + 1);
    perBridge.set(c.bridge, (perBridge.get(c.bridge) ?? 0) + 1);
    kept.push(c);
  }

  writeJSON("candidates.json", kept);
  const byId = new Map(people.map((p) => [p.id, p]));
  console.log(`Filtered out: ${[...rejected].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  for (const [kind, list] of Object.entries(bench)) {
    for (const [x, e, l] of list) console.log(`  benchmark (should ${kind}) ${e.name} → ${x.name} → ${l.name}: ${reject(x, e, l) ?? "passes"}`);
  }
  console.log(`${out.length} raw combos → kept ${kept.length} candidates. Sample:`);
  for (const c of kept.filter((_, i) => i % Math.ceil(kept.length / 15) === 0)) {
    const [x, e, l] = [c.bridge, c.early, c.late].map((id) => byId.get(id)!);
    console.log(`  ${x.name} (${x.bornLabel}–${x.diedLabel ?? ""}) ↔ ${e.name} (d. ${e.diedLabel}) & ${l.name} (b. ${l.bornLabel}) gap ${c.gap.toFixed(0)}y`);
  }
}

main();

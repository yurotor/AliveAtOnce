import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Life } from "../src/lib/life";
export { overlaps, ageAt } from "../src/lib/life";

export const DATA_DIR = join(import.meta.dirname, "..", "data");
export const dataPath = (name: string) => join(DATA_DIR, name);

export function readJSON<T>(name: string, fallback?: T): T {
  const p = dataPath(name);
  if (!existsSync(p)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${p} — run the earlier pipeline step first.`);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

export function writeJSON(name: string, value: unknown) {
  writeFileSync(dataPath(name), JSON.stringify(value));
}

/** A person as produced by the pipeline; see src/lib/life.ts for the date model. */
export type Person = Life & {
  id: string; // Wikidata QID
  slug: string;
  description: string;
  image: string | null;
  wiki: string | null; // English Wikipedia title
  sitelinks: number;
  pageviews: number;
  fame: number; // 0..1, higher = more famous
  rank: number; // 1 = most famous
};

/** Run `fn` over items with bounded concurrency. */
export async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fact = { key: string; bridge: string; early: string; late: string };

/**
 * Pick the top `n` facts from an already-ranked list, with a diversity cap:
 * each bridge person once, and nobody as the early/late figure more than `maxPerEnd` times.
 */
export function selectFacts<T extends Fact>(ranked: T[], n: number, maxPerEnd = 25): T[] {
  const uses = new Map<string, number>();
  const bridges = new Set<string>();
  const chosen: T[] = [];
  for (const c of ranked) {
    if (chosen.length >= n) break;
    if (bridges.has(c.bridge)) continue;
    if ([c.early, c.late].some((id) => (uses.get(id) ?? 0) >= maxPerEnd)) continue;
    bridges.add(c.bridge);
    for (const id of [c.early, c.late]) uses.set(id, (uses.get(id) ?? 0) + 1);
    chosen.push(c);
  }
  return chosen;
}

/** A Wikimedia Commons portrait, as resolved by step 3b. See src/lib/photo.ts. */
export type { Photo } from "../src/lib/photo";

/**
 * Broad field from the Wikidata description: the keyword that appears first wins
 * ("American businessman and inventor" → business). null = can't tell.
 */
const FIELDS: [string, RegExp][] = [
  ["science", /\b(physicist|chemist|biologist|naturalist|mathematician|astronomer|scientist|geologist|physiologist|botanist|zoologist|geneticist|engineer|inventor|psychologist|psychoanalyst|neurologist|physician|astrophysicist|computer scientist)/],
  ["thought", /\b(philosopher|theologian|pope|saint|prophet|religious|bishop|priest|monk|nun|reformer|cleric|economist|sociologist|historian)/],
  ["power", /\b(politician|president|prime minister|statesman|king|queen|emperor|empress|monarch|ruler|sultan|pharaoh|tsar|czar|shah|caliph|revolutionary|dictator|general|admiral|military|marshal|first lady|prince|princess|duke|chancellor|senator|governor|consort|dynasty|leader)/],
  ["literature", /\b(writer|poet|novelist|playwright|author|dramatist|essayist|journalist|lyricist)/],
  ["art", /\b(painter|sculptor|artist|architect|photographer|illustrator|designer|cartoonist)/],
  ["music", /\b(composer|singer|rapper|musician|pianist|songwriter|guitarist|band|conductor|violinist|drummer|dj|record producer)/],
  ["screen", /\b(actor|actress|film|director|comedian|television|youtuber|model|presenter|entertainer|dancer|magician)/],
  ["sport", /\b(footballer|football|basketball|tennis|boxer|athlete|cricketer|racing|golfer|swimmer|wrestler|cyclist|chess|skater|sprinter|baseball|hockey|martial art)/],
  ["business", /\b(businessman|businesswoman|business|entrepreneur|industrialist|investor|banker|magnate|ceo|founder|executive)/],
  ["exploration", /\b(explorer|navigator|astronaut|cosmonaut|aviator|pilot|mountaineer)/],
];

export function fieldOf(description: string): string | null {
  const d = description.toLowerCase();
  let best: string | null = null;
  let at = Infinity;
  for (const [field, re] of FIELDS) {
    const i = d.search(re);
    if (i >= 0 && i < at) { at = i; best = field; }
  }
  return best;
}

/** Middle of a life in decimal years (living people run to today). */
export const midpoint = (p: Life) => (p.bLo + (p.dHi ?? new Date().getUTCFullYear())) / 2;

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

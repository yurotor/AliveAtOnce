import { neon } from "@neondatabase/serverless";
import { cacheLife } from "next/cache";
import type { Life } from "./life";
import type { FeedItem } from "./feed-order";
import type { Photo } from "./photo";
import { templateHeadline } from "./headline";

const sql = neon(process.env.DATABASE_URL!);

export type Person = Life & {
  id: string;
  slug: string;
  description: string;
  image: string | null;
  wiki: string | null;
  rank: number;
  shortName: string | null;
  field: string | null;
  photo: Photo | null;
};

export type Fact = {
  id: number;
  slug: string;
  /** Claude's headline or the template; *and* marks italics. */
  headline: string;
  oneLiner: string | null;
  surprise: number | null;
  score: number;
  gap: number;
  bridge: Person;
  early: Person;
  late: Person;
};

const PERSON_COLS = `id, slug, name, description, born_label, died_label, b_lo, b_hi, d_lo, d_hi, image, wiki, rank, short_name, field, photo`;

type PersonRow = {
  id: string; slug: string; name: string; description: string; born_label: string; died_label: string | null;
  b_lo: number; b_hi: number; d_lo: number | null; d_hi: number | null; image: string | null; wiki: string | null; rank: number;
  short_name: string | null; field: string | null; photo: Photo | null;
};

const toPerson = (r: PersonRow): Person => ({
  id: r.id, slug: r.slug, name: r.name, description: r.description,
  bornLabel: r.born_label, diedLabel: r.died_label,
  bLo: r.b_lo, bHi: r.b_hi, dLo: r.d_lo, dHi: r.d_hi,
  image: r.image, wiki: r.wiki, rank: r.rank,
  shortName: r.short_name, field: r.field, photo: r.photo,
});

/** Facts with all three people joined, as one JSON row each. */
const FACT_SELECT = `
  SELECT f.id, f.slug, f.headline, f.one_liner, f.surprise, f.score, f.gap,
    row_to_json(b) AS bridge, row_to_json(e) AS early, row_to_json(l) AS late
  FROM facts f
  JOIN (SELECT ${PERSON_COLS} FROM people) b ON b.id = f.bridge_id
  JOIN (SELECT ${PERSON_COLS} FROM people) e ON e.id = f.early_id
  JOIN (SELECT ${PERSON_COLS} FROM people) l ON l.id = f.late_id`;

type FactRow = {
  id: number; slug: string; headline: string | null; one_liner: string | null; surprise: number | null; score: number; gap: number;
  bridge: PersonRow; early: PersonRow; late: PersonRow;
};
const toFact = (r: FactRow): Fact => {
  const [bridge, early, late] = [r.bridge, r.early, r.late].map(toPerson);
  return {
    id: r.id, slug: r.slug, headline: r.headline ?? templateHeadline(bridge, early, late), oneLiner: r.one_liner,
    surprise: r.surprise, score: r.score, gap: r.gap, bridge, early, late,
  };
};

const LAUNCH = Date.UTC(2026, 9, 22); // day 0 of the daily rotation

/** Today's bridge (UTC day) plus the date it's for. Rotates through the homepage feed. */
export async function getDailyFact() {
  "use cache";
  cacheLife("hours");
  const day = Math.floor((Date.now() - LAUNCH) / 86_400_000);
  const [{ n }] = (await sql.query(`SELECT count(*)::int AS n FROM facts WHERE active AND daily_order IS NOT NULL`)) as { n: number }[];
  if (!n) return null;
  const pos = ((day % n) + n) % n;
  const rows = (await sql.query(`${FACT_SELECT} WHERE f.daily_order = $1`, [pos])) as FactRow[];
  return rows[0] ? { fact: toFact(rows[0]), date: new Date(LAUNCH + day * 86_400_000).toISOString() } : null;
}

/** Every homepage-feed bridge with its people, best first. The client shuffles and spaces it. */
export async function getFeed(): Promise<FeedItem[]> {
  "use cache";
  cacheLife("hours");
  const rows = (await sql.query(
    `SELECT slug, early_id, bridge_id, late_id FROM facts WHERE active AND feed ORDER BY score DESC, id`,
  )) as { slug: string; early_id: string; bridge_id: string; late_id: string }[];
  return rows.map((r) => ({ slug: r.slug, people: [r.early_id, r.bridge_id, r.late_id] }));
}

/** Every homepage-feed bridge's slug, best first. */
export async function getFeedSlugs() {
  "use cache";
  cacheLife("hours");
  const rows = (await sql.query(`SELECT slug FROM facts WHERE active AND feed ORDER BY score DESC, id`)) as { slug: string }[];
  return rows.map((r) => r.slug);
}

export async function getFact(id: number) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(`${FACT_SELECT} WHERE f.id = $1`, [id])) as FactRow[];
  return rows[0] ? toFact(rows[0]) : null;
}

export async function getFactBySlug(slug: string) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(`${FACT_SELECT} WHERE f.slug = $1`, [slug])) as FactRow[];
  return rows[0] ? toFact(rows[0]) : null;
}

export type Collection = { slug: string; title: string; blurb: string };

export const COLLECTIONS: Collection[] = [
  { slug: "science-to-pop-culture", title: "Science to pop culture", blurb: "A scientist at one end, a pop star or athlete at the other." },
  { slug: "just-in-time", title: "Just in time", blurb: "Lives that overlapped by less than a year." },
  { slug: "same-birthday", title: "Same birthday", blurb: "Famous people born on the very same day." },
];

/** Bridges for a collection, best first. */
export async function getCollectionFacts(slug: string, limit = 24) {
  "use cache";
  cacheLife("days");
  const where: Record<string, string> = {
    "science-to-pop-culture": `e.field = 'science' AND l.field IN ('music', 'screen', 'sport')`,
    // Under a year between the bridge's birth and the early figure's death, or the late figure's birth and the bridge's death.
    "just-in-time": `(e.d_lo - b.b_hi < 1 OR (b.d_lo IS NOT NULL AND b.d_lo - l.b_hi < 1))`,
  };
  if (!where[slug]) return [];
  const rows = (await sql.query(
    `${FACT_SELECT} WHERE f.active AND b.photo IS NOT NULL AND e.photo IS NOT NULL AND l.photo IS NOT NULL AND ${where[slug]}
     ORDER BY f.feed DESC, f.score DESC LIMIT $1`,
    [limit * 4],
  )) as FactRow[];
  return diverse(rows.map(toFact), limit);
}

/** Pairs of famous people born on the same day (both dates known to the day). */
export async function getSameBirthdays(limit = 24) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(
    `SELECT row_to_json(a) AS a, row_to_json(b) AS b FROM
       (SELECT ${PERSON_COLS} FROM people WHERE rank <= 6000 AND born_label ~ '^\d+ ') a
     JOIN (SELECT ${PERSON_COLS} FROM people WHERE rank <= 6000) b
       ON b.born_label = a.born_label AND b.rank > a.rank
     ORDER BY greatest(a.rank, b.rank) LIMIT $1`,
    [limit],
  )) as { a: PersonRow; b: PersonRow }[];
  return rows.map((r) => [toPerson(r.a), toPerson(r.b)] as const);
}

/** Keep the first bridge per person, so a grid isn't ten Eminems. */
function diverse(facts: Fact[], limit: number) {
  const seen = new Set<string>();
  const out: Fact[] = [];
  for (const f of facts) {
    const ids = [f.bridge.id, f.early.id, f.late.id];
    if (ids.some((id) => seen.has(id))) continue;
    ids.forEach((id) => seen.add(id));
    out.push(f);
    if (out.length === limit) break;
  }
  return out;
}

export async function getPerson(slug: string) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(`SELECT ${PERSON_COLS} FROM people WHERE slug = $1`, [slug])) as PersonRow[];
  return rows[0] ? toPerson(rows[0]) : null;
}

export async function getFactsFor(personId: string) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(
    `${FACT_SELECT} WHERE f.active AND $1 IN (f.bridge_id, f.early_id, f.late_id) ORDER BY f.feed DESC, f.score DESC LIMIT 8`,
    [personId],
  )) as FactRow[];
  return rows.map(toFact);
}

/**
 * Famous people whose lives certainly overlapped with `p`:
 * those already alive when p was born, and those born during p's life.
 */
export async function getOverlaps(p: Person, limit = 14) {
  "use cache";
  cacheLife("days");
  const end = p.dLo ?? 1e9;
  const [before, after] = await Promise.all([
    sql.query(
      `SELECT ${PERSON_COLS} FROM people
       WHERE id <> $1 AND b_hi < $2 AND d_lo IS NOT NULL AND d_lo > $2
       ORDER BY rank LIMIT $3`,
      [p.id, p.bHi, limit],
    ),
    sql.query(
      `SELECT ${PERSON_COLS} FROM people
       WHERE id <> $1 AND b_lo > $2 AND b_hi < $3
       ORDER BY rank LIMIT $4`,
      [p.id, p.bHi, end, limit],
    ),
  ]);
  return {
    before: (before as PersonRow[]).map(toPerson),
    after: (after as PersonRow[]).map(toPerson),
  };
}

export async function searchPeople(q: string, limit = 8) {
  "use cache";
  cacheLife("days");
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = (await sql.query(
    `SELECT ${PERSON_COLS} FROM people
     WHERE name ILIKE $1 OR name % $2
     ORDER BY (name ILIKE $3) DESC, (name ILIKE $1) DESC, rank
     LIMIT $4`,
    [`%${term}%`, term, `${term}%`, limit],
  )) as PersonRow[];
  return rows.map(toPerson);
}

export async function getTopSlugs(limit: number) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(`SELECT slug FROM people ORDER BY rank LIMIT $1`, [limit])) as { slug: string }[];
  return rows.map((r) => r.slug);
}

export async function getSitemapPage(page: number, size: number) {
  "use cache";
  cacheLife("days");
  return (await sql.query(
    `SELECT slug FROM people ORDER BY rank OFFSET $1 LIMIT $2`,
    [page * size, size],
  )) as { slug: string }[];
}

export async function getFactSlugs() {
  "use cache";
  cacheLife("days");
  return ((await sql.query(`SELECT slug FROM facts WHERE active ORDER BY feed DESC, score DESC`)) as { slug: string }[]).map((r) => r.slug);
}

/** Everyone whose Commons portrait appears on a card, A–Z. */
export async function getPhotoCredits() {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(
    `SELECT ${PERSON_COLS} FROM people p
     WHERE photo IS NOT NULL AND EXISTS (SELECT 1 FROM facts f WHERE f.active AND p.id IN (f.bridge_id, f.early_id, f.late_id))
     ORDER BY name`,
  )) as PersonRow[];
  return rows.map(toPerson);
}

export type QuizQuestion = { fact: Fact; options: Person[] };

function shuffle<T>(xs: T[]) {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * `n` random feed bridges, each with its bridge hidden among three near misses:
 * famous people born just after the earlier figure died ("young") or who died
 * just before the later one was born ("old"). They look right, and certainly
 * aren't. Same field as the bridge ranks higher. Nobody appears twice in a quiz.
 */
export async function getQuiz(n = 5): Promise<QuizQuestion[]> {
  const facts = ((await sql.query(
    `${FACT_SELECT} WHERE f.active AND f.feed AND b.photo IS NOT NULL AND e.photo IS NOT NULL AND l.photo IS NOT NULL
     ORDER BY random() LIMIT $1`,
    [n * 3],
  )) as FactRow[]).map(toFact);
  const near = (kind: string, where: string) => `
    (SELECT '${kind}' AS kind, ${PERSON_COLS} FROM people p
     WHERE p.photo IS NOT NULL AND p.rank <= 5000 AND p.id NOT IN (f.bridge_id, f.early_id, f.late_id) AND ${where}
     ORDER BY p.rank * (CASE WHEN p.field = b.field THEN 0.4 ELSE 1 END) LIMIT 6)`;
  const rows = (await sql.query(
    `SELECT f.id AS fact_id, row_to_json(x) AS person
     FROM facts f JOIN people b ON b.id = f.bridge_id JOIN people e ON e.id = f.early_id JOIN people l ON l.id = f.late_id
     CROSS JOIN LATERAL (
       ${near("young", "p.b_lo > e.d_hi AND p.b_lo < e.d_hi + 30 AND (p.d_lo IS NULL OR p.d_lo > l.b_hi)")}
       UNION ALL
       ${near("old", "p.d_hi < l.b_lo AND p.d_hi > l.b_lo - 30 AND p.b_hi < e.d_lo")}
     ) x
     WHERE f.id = ANY($1)`,
    [facts.map((f) => f.id)],
  )) as { fact_id: number; person: PersonRow & { kind: "young" | "old" } }[];

  const used = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const fact of facts) {
    const ids = [fact.early.id, fact.bridge.id, fact.late.id];
    if (ids.some((id) => used.has(id))) continue;
    const pool = rows.filter((r) => r.fact_id === fact.id && !used.has(r.person.id));
    // Alternate the two kinds of near miss, so a question can't be solved by era alone.
    const [a, b] = shuffle(["young", "old"]).map((k) => shuffle(pool.filter((r) => r.person.kind === k)));
    const picks = [a[0], b[0], a[1], b[1], ...a.slice(2), ...b.slice(2)].filter(Boolean).slice(0, 3).map((r) => toPerson(r.person));
    if (picks.length < 3) continue;
    [...ids, ...picks.map((p) => p.id)].forEach((id) => used.add(id));
    out.push({ fact, options: shuffle([fact.bridge, ...picks]) });
    if (out.length === n) break;
  }
  return out;
}

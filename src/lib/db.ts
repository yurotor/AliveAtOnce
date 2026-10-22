import { neon } from "@neondatabase/serverless";
import { cacheLife } from "next/cache";
import type { Life } from "./life";

const sql = neon(process.env.DATABASE_URL!);

export type Person = Life & {
  id: string;
  slug: string;
  description: string;
  image: string | null;
  wiki: string | null;
  rank: number;
};

export type Fact = {
  id: number;
  line: string | null;
  score: number;
  gap: number;
  bridge: Person;
  early: Person;
  late: Person;
};

const PERSON_COLS = `id, slug, name, description, born_label, died_label, b_lo, b_hi, d_lo, d_hi, image, wiki, rank`;

type PersonRow = {
  id: string; slug: string; name: string; description: string; born_label: string; died_label: string | null;
  b_lo: number; b_hi: number; d_lo: number | null; d_hi: number | null; image: string | null; wiki: string | null; rank: number;
};

const toPerson = (r: PersonRow): Person => ({
  id: r.id, slug: r.slug, name: r.name, description: r.description,
  bornLabel: r.born_label, diedLabel: r.died_label,
  bLo: r.b_lo, bHi: r.b_hi, dLo: r.d_lo, dHi: r.d_hi,
  image: r.image, wiki: r.wiki, rank: r.rank,
});

/** Facts with all three people joined, as one JSON row each. */
const FACT_SELECT = `
  SELECT f.id, f.line, f.score, f.gap,
    row_to_json(b) AS bridge, row_to_json(e) AS early, row_to_json(l) AS late
  FROM facts f
  JOIN (SELECT ${PERSON_COLS} FROM people) b ON b.id = f.bridge_id
  JOIN (SELECT ${PERSON_COLS} FROM people) e ON e.id = f.early_id
  JOIN (SELECT ${PERSON_COLS} FROM people) l ON l.id = f.late_id`;

type FactRow = { id: number; line: string | null; score: number; gap: number; bridge: PersonRow; early: PersonRow; late: PersonRow };
const toFact = (r: FactRow): Fact => ({
  id: r.id, line: r.line, score: r.score, gap: r.gap,
  bridge: toPerson(r.bridge), early: toPerson(r.early), late: toPerson(r.late),
});

const LAUNCH = Date.UTC(2026, 9, 22); // day 0 of the daily rotation

/** Today's bridge (UTC day) plus the date it's for. */
export async function getDailyFact() {
  "use cache";
  cacheLife("hours");
  const day = Math.floor((Date.now() - LAUNCH) / 86_400_000);
  const [{ n }] = (await sql.query(`SELECT count(*)::int AS n FROM facts WHERE active`)) as { n: number }[];
  if (!n) return null;
  const pos = ((day % n) + n) % n;
  const rows = (await sql.query(`${FACT_SELECT} WHERE f.daily_order = $1`, [pos])) as FactRow[];
  return rows[0] ? { fact: toFact(rows[0]), date: new Date(LAUNCH + day * 86_400_000).toISOString() } : null;
}

/** The best bridges overall, skipping one (today's), with no early/late figure repeated. */
export async function getTopFacts(excludeId: number | null, limit = 12) {
  "use cache";
  cacheLife("hours");
  const rows = (await sql.query(
    `${FACT_SELECT} WHERE f.active AND f.id <> $1 ORDER BY f.score DESC LIMIT $2`,
    [excludeId ?? -1, limit * 8],
  )) as FactRow[];
  const seen = new Set<string>();
  const out: Fact[] = [];
  for (const f of rows.map(toFact)) {
    const ids = [f.bridge.id, f.early.id, f.late.id];
    if (ids.some((id) => seen.has(id))) continue;
    ids.forEach((id) => seen.add(id));
    out.push(f);
    if (out.length === limit) break;
  }
  return out;
}

export async function getFact(id: number) {
  "use cache";
  cacheLife("days");
  const rows = (await sql.query(`${FACT_SELECT} WHERE f.id = $1`, [id])) as FactRow[];
  return rows[0] ? toFact(rows[0]) : null;
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
    `${FACT_SELECT} WHERE f.active AND $1 IN (f.bridge_id, f.early_id, f.late_id) ORDER BY f.score DESC LIMIT 8`,
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

export async function getFactIds() {
  "use cache";
  cacheLife("days");
  return ((await sql.query(`SELECT id FROM facts WHERE active ORDER BY score DESC`)) as { id: number }[]).map((r) => r.id);
}

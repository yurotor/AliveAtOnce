/**
 * Step 4 — load people + facts into Postgres (DATABASE_URL).
 *
 * Uses Jev scores and Claude lines when present; otherwise falls back to the
 * step-2a heuristic ranking with template lines, so the site works before any
 * AI keys exist. Re-running upserts: fact ids stay stable so shared /bridge/<id>
 * links never break; facts that drop out are marked inactive, not deleted.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { readJSON, dataPath, selectFacts, type Person } from "./lib";
import type { Candidate } from "./3-candidates";
import type { Score } from "./4-score-jev";

const TOP_FACTS = Number(process.env.TOP_FACTS ?? 3000);
const DAILY_POOL = 365; // the best N rotate first on the homepage

// Small seeded RNG so the daily order is stable between loads.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local");
  const people = readJSON<Person[]>("people.json");
  const candidates = readJSON<Candidate[]>("candidates.json");
  const scores = readJSON<Record<string, Score>>("scores.json", {});
  const lines = readJSON<Record<string, string>>("lines.json", {});

  const scored = candidates.filter((c) => scores[c.key]);
  const useJev = scored.length > 0;
  const maxH = Math.max(...candidates.map((c) => c.heuristic));
  const scoreOf = (c: Candidate) => (useJev ? scores[c.key].score : c.heuristic / maxH);
  let chosen: Candidate[];
  if (useJev && existsSync(dataPath("chosen.json"))) {
    const byKey = new Map(candidates.map((c) => [c.key, c]));
    chosen = readJSON<string[]>("chosen.json").map((k) => byKey.get(k)!).filter(Boolean);
  } else {
    chosen = selectFacts([...(useJev ? scored : candidates)].sort((a, b) => scoreOf(b) - scoreOf(a)), TOP_FACTS);
  }
  console.log(`${people.length} people, ${chosen.length} facts (${useJev ? "Jev-scored" : "heuristic — no Jev scores yet"}, ${chosen.filter((c) => lines[c.key]).length} with Claude lines)`);

  // Daily rotation: shuffle the best DAILY_POOL, then the rest by score.
  const order = chosen.map((_, i) => i);
  const head = order.slice(0, DAILY_POOL);
  const rand = rng(20261022);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  const dailyOrder = new Map<number, number>();
  [...head, ...order.slice(DAILY_POOL)].forEach((idx, pos) => dailyOrder.set(idx, pos));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(readFileSync(join(import.meta.dirname, "schema.sql"), "utf8"));
    await client.query("BEGIN");

    // A dropped person must give up a slug that a newcomer now needs.
    await client.query(
      `UPDATE people SET slug = slug || '-' || lower(id) WHERE id <> ALL($1::text[]) AND slug = ANY($2::text[])`,
      [people.map((p) => p.id), people.map((p) => p.slug)],
    );
    const CHUNK = 5000;
    for (let i = 0; i < people.length; i += CHUNK) {
      const ch = people.slice(i, i + CHUNK);
      const col = <K extends keyof Person>(k: K) => ch.map((p) => p[k]);
      await client.query(
        `INSERT INTO people (id, slug, name, description, born_label, died_label, b_lo, b_hi, d_lo, d_hi, image, wiki, sitelinks, pageviews, fame, rank)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
           $7::float8[], $8::float8[], $9::float8[], $10::float8[], $11::text[], $12::text[],
           $13::int[], $14::bigint[], $15::float8[], $16::int[])
         ON CONFLICT (id) DO UPDATE SET
           slug = excluded.slug, name = excluded.name, description = excluded.description,
           born_label = excluded.born_label, died_label = excluded.died_label,
           b_lo = excluded.b_lo, b_hi = excluded.b_hi, d_lo = excluded.d_lo, d_hi = excluded.d_hi,
           image = excluded.image, wiki = excluded.wiki, sitelinks = excluded.sitelinks,
           pageviews = excluded.pageviews, fame = excluded.fame, rank = excluded.rank`,
        [col("id"), col("slug"), col("name"), col("description"), col("bornLabel"), col("diedLabel"),
         col("bLo"), col("bHi"), col("dLo"), col("dHi"), col("image"), col("wiki"),
         col("sitelinks"), col("pageviews"), col("fame"), col("rank")],
      );
      process.stdout.write(`\rpeople ${Math.min(i + CHUNK, people.length)}/${people.length}`);
    }
    console.log();

    // People who fell out of the top N keep their row (old facts may reference them)
    // but sink to the bottom of the ranking.
    await client.query(`UPDATE people SET rank = 1000000 + rank WHERE id <> ALL($1::text[]) AND rank < 1000000`, [people.map((p) => p.id)]);
    await client.query(`UPDATE facts SET active = false, daily_order = NULL`);
    await client.query(
      `INSERT INTO facts (bridge_id, early_id, late_id, gap, surprise, recognizable, score, line, daily_order)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::float8[], $5::float8[], $6::float8[], $7::float8[], $8::text[], $9::int[])
       ON CONFLICT (bridge_id, early_id, late_id) DO UPDATE SET
         gap = excluded.gap, surprise = excluded.surprise, recognizable = excluded.recognizable,
         score = excluded.score, line = COALESCE(excluded.line, facts.line),
         daily_order = excluded.daily_order, active = true`,
      [
        chosen.map((c) => c.bridge), chosen.map((c) => c.early), chosen.map((c) => c.late),
        chosen.map((c) => c.gap),
        chosen.map((c) => scores[c.key]?.surprise ?? null),
        chosen.map((c) => scores[c.key]?.recognizable ?? null),
        chosen.map(scoreOf),
        chosen.map((c) => lines[c.key] ?? null),
        chosen.map((_, i) => dailyOrder.get(i)!),
      ],
    );
    await client.query("COMMIT");
    await client.query("ANALYZE people; ANALYZE facts;");
    console.log("Loaded.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Step 6 — load people + facts into Postgres (DATABASE_URL).
 *
 * Uses Jev scores and Claude copy when present; otherwise falls back to the
 * step-3 heuristic ranking with template headlines, so the site works before any
 * AI keys exist. A bridge joins the homepage feed when Jev rated it 8+, all three
 * people have a usable photo, and its headline fits (≤ 40 chars).
 *
 * Re-running upserts: fact ids and /b/{slug} slugs never change once assigned,
 * so shared links never break; facts that drop out are marked inactive, not deleted.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { readJSON, dataPath, selectFacts, slugify, fieldOf, type Person, type Photo } from "./lib";
import { FEED_MIN_SURPRISE, HEADLINE_MAX, shortName, templateHeadline, visible } from "../src/lib/headline";
import type { Candidate } from "./3-candidates";
import type { Score } from "./4-score-jev";
import type { Writing } from "./5-write-claude";

const TOP_FACTS = Number(process.env.TOP_FACTS ?? 3000);

// Small seeded RNG so the daily order is stable between loads.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local");
  const people = readJSON<Person[]>("people.json");
  const candidates = readJSON<Candidate[]>("candidates.json");
  const scores = readJSON<Record<string, Score>>("scores.json", {});
  const writing = readJSON<Record<string, Writing>>("writing.json", {});
  const photos = readJSON<Record<string, Photo | null>>("photos.json", {});
  const shortNames = readJSON<Record<string, string>>("short-names.json", {});
  const byId = new Map(people.map((p) => [p.id, { ...p, shortName: shortNames[p.id] ?? null }]));

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
  chosen.sort((a, b) => scoreOf(b) - scoreOf(a));

  const trio = (c: Candidate) => [c.early, c.bridge, c.late].map((id) => byId.get(id)!);
  const headlineOf = (c: Candidate) => {
    const [e, x, l] = trio(c);
    return writing[c.key]?.headline ?? templateHeadline(x, e, l);
  };
  const inFeed = chosen.map((c) =>
    (scores[c.key]?.surprise ?? 0) >= FEED_MIN_SURPRISE &&
    [c.bridge, c.early, c.late].every((id) => photos[id]) &&
    visible(headlineOf(c)).length <= HEADLINE_MAX,
  );
  console.log(`${people.length} people, ${chosen.length} facts (${useJev ? "Jev-scored" : "heuristic — no Jev scores yet"}, ${chosen.filter((c) => writing[c.key]?.headline).length} with Claude headlines), ${inFeed.filter(Boolean).length} in the homepage feed`);

  // Daily rotation: a seeded shuffle of the feed, so the order is stable between loads.
  const head = chosen.map((_, i) => i).filter((i) => inFeed[i]);
  const rand = rng(20261022);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  const dailyOrder = new Map<number, number>();
  head.forEach((idx, pos) => dailyOrder.set(idx, pos));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query(readFileSync(join(import.meta.dirname, "schema.sql"), "utf8"));
    await client.query("BEGIN");

    // Slugs: keep any slug a bridge already has; new ones are early-bridge-late
    // by short name ("darwin-picasso-eminem"), suffixed if taken.
    const existing = (await client.query(`SELECT bridge_id, early_id, late_id, slug FROM facts WHERE slug IS NOT NULL`)).rows as
      { bridge_id: string; early_id: string; late_id: string; slug: string }[];
    const slugOf = new Map(existing.map((r) => [`${r.bridge_id}|${r.early_id}|${r.late_id}`, r.slug]));
    const taken = new Set(existing.map((r) => r.slug));
    const slugs = chosen.map((c) => {
      const kept = slugOf.get(c.key);
      if (kept) return kept;
      const base = trio(c).map((p) => slugify(shortName(p))).join("-");
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      taken.add(slug);
      return slug;
    });

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
        `INSERT INTO people (id, slug, name, description, born_label, died_label, b_lo, b_hi, d_lo, d_hi, image, wiki, sitelinks, pageviews, fame, rank, short_name, field, photo)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
           $7::float8[], $8::float8[], $9::float8[], $10::float8[], $11::text[], $12::text[],
           $13::int[], $14::bigint[], $15::float8[], $16::int[], $17::text[], $18::text[], $19::jsonb[])
         ON CONFLICT (id) DO UPDATE SET
           slug = excluded.slug, name = excluded.name, description = excluded.description,
           born_label = excluded.born_label, died_label = excluded.died_label,
           b_lo = excluded.b_lo, b_hi = excluded.b_hi, d_lo = excluded.d_lo, d_hi = excluded.d_hi,
           image = excluded.image, wiki = excluded.wiki, sitelinks = excluded.sitelinks,
           pageviews = excluded.pageviews, fame = excluded.fame, rank = excluded.rank,
           short_name = COALESCE(excluded.short_name, people.short_name), field = excluded.field,
           photo = COALESCE(excluded.photo, people.photo)`,
        [col("id"), col("slug"), col("name"), col("description"), col("bornLabel"), col("diedLabel"),
         col("bLo"), col("bHi"), col("dLo"), col("dHi"), col("image"), col("wiki"),
         col("sitelinks"), col("pageviews"), col("fame"), col("rank"),
         ch.map((p) => shortNames[p.id] ?? null), ch.map((p) => fieldOf(p.description)),
         ch.map((p) => (photos[p.id] ? JSON.stringify(photos[p.id]) : null))],
      );
      process.stdout.write(`\rpeople ${Math.min(i + CHUNK, people.length)}/${people.length}`);
    }
    console.log();

    // People who fell out of the top N keep their row (old facts may reference them)
    // but sink to the bottom of the ranking.
    await client.query(`UPDATE people SET rank = 1000000 + rank WHERE id <> ALL($1::text[]) AND rank < 1000000`, [people.map((p) => p.id)]);
    await client.query(`UPDATE facts SET active = false, feed = false, daily_order = NULL`);
    await client.query(
      `INSERT INTO facts (bridge_id, early_id, late_id, gap, surprise, recognizable, score, slug, headline, one_liner, feed, daily_order)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::float8[], $5::float8[], $6::float8[], $7::float8[],
         $8::text[], $9::text[], $10::text[], $11::bool[], $12::int[])
       ON CONFLICT (bridge_id, early_id, late_id) DO UPDATE SET
         gap = excluded.gap, surprise = excluded.surprise, recognizable = excluded.recognizable,
         score = excluded.score, slug = COALESCE(facts.slug, excluded.slug),
         headline = COALESCE(excluded.headline, facts.headline), one_liner = COALESCE(excluded.one_liner, facts.one_liner),
         feed = excluded.feed, daily_order = excluded.daily_order, active = true`,
      [
        chosen.map((c) => c.bridge), chosen.map((c) => c.early), chosen.map((c) => c.late),
        chosen.map((c) => c.gap),
        chosen.map((c) => scores[c.key]?.surprise ?? null),
        chosen.map((c) => scores[c.key]?.recognizable ?? null),
        chosen.map(scoreOf),
        slugs,
        chosen.map((c) => writing[c.key]?.headline ?? null),
        chosen.map((c) => writing[c.key]?.oneLiner ?? null),
        inFeed,
        chosen.map((_, i) => dailyOrder.get(i) ?? null),
      ],
    );
    // Bridges from before slugs existed keep working links too.
    await client.query(`UPDATE facts SET slug = 'bridge-' || id WHERE slug IS NULL`);
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

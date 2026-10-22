/**
 * Step 4 — Jev (TypeSafe AI's decision model, via Vercel AI Gateway as
 * typesafe-ai/jev) scores how surprising each candidate bridge is on a 1–10
 * scale (the homepage feed takes 8+), and how recognisable the three names are.
 *
 * Only candidates whose three people all have a usable photo (step 3b) are
 * scored, best heuristic first, up to SCORE_LIMIT.
 *
 * Resumable: results cached in data/scores.json.
 * Needs TYPESAFE_API_KEY (direct to TypeSafe), or AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN
 * to go through Vercel AI Gateway.
 */
import { experimental_decide as decide } from "ai";
import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";
import { readJSON, writeJSON, pool, type Person, type Photo } from "./lib";
import type { Candidate } from "./3-candidates";
import { benchmarkPeople } from "./surprise";

const TYPESAFE_KEY = process.env.TYPESAFE_API_KEY ?? process.env.TYPESAFE_AI_API_KEY;
const MODEL_ID = process.env.JEV_MODEL ?? (TYPESAFE_KEY ? "jev-latest" : "typesafe-ai/jev");
const MODEL = TYPESAFE_KEY ? createTypeSafeAi({ apiKey: TYPESAFE_KEY }).decisionModel(MODEL_ID) : MODEL_ID;
const LIMIT = Number(process.env.SCORE_LIMIT ?? 3000);

/** surprise: 1–10 (Jev). score: ranking key, surprise nudged by recognisability. */
export type Score = { surprise: number; recognizable: number; score: number };

const LEVELS = [
  "1 — obvious: of course these overlapped (same era, same circle)",
  "2 — expected: anyone would guess it",
  "3 — mildly interesting",
  "4 — a little interesting, but the eras feel close",
  "5 — interesting: worth a raised eyebrow",
  "6 — surprising to many people",
  "7 — surprising: most people would guess wrong",
  "8 — very surprising: makes you do a double take",
  "9 — startling: the earlier and later figures feel like different worlds",
  "10 — mind-blowing: you'd stop a friend to tell them",
];

const describe = (p: Person) => ({
  name: p.name,
  lived: `${p.bornLabel} – ${p.diedLabel ?? "living"}`,
  knownFor: p.description,
});

async function main() {
  if (!TYPESAFE_KEY && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Set TYPESAFE_API_KEY (or AI_GATEWAY_API_KEY) in .env.local.");
  }
  const people = new Map(readJSON<Person[]>("people.json").map((p) => [p.id, p]));
  const photos = readJSON<Record<string, Photo | null>>("photos.json");
  const candidates = readJSON<Candidate[]>("candidates.json")
    .filter((c) => photos[c.bridge] && photos[c.early] && photos[c.late])
    .slice(0, LIMIT);
  const scores = readJSON<Record<string, Score>>("scores.json", {});
  const todo = candidates.filter((c) => !scores[c.key]);
  console.log(`${candidates.length} candidates, ${todo.length} to score with ${MODEL_ID}`);

  let done = 0, failed = 0;
  await pool(todo, 16, async (c) => {
    const [x, e, l] = [c.bridge, c.early, c.late].map((id) => people.get(id)!);
    try {
      const { answers } = await decide({
        model: MODEL,
        state: {
          fact: `${x.name}'s lifetime overlapped with both ${e.name} and ${l.name}, even though ${e.name} died about ${Math.round(c.gap)} years before ${l.name} was born.`,
          bridge: describe(x),
          earlier: describe(e),
          later: describe(l),
        },
        questions: {
          surprise: {
            type: "score",
            instructions:
              "How surprising would a typical person find this fact? Surprise comes from the earlier and later figures feeling like they belong to completely different worlds or eras (and fields), while one human lifetime touched both. Pairs from the same era, the same field or the same circle (teacher and student, rivals, family) are not surprising.",
            criteria: LEVELS,
          },
          recognizable: {
            type: "boolean",
            instructions: "Would a typical adult in the US or UK recognise all three names?",
            criteria: { true: "all three are household names", false: "at least one name would draw a blank" },
          },
        },
      });
      const surprise = answers.surprise.score + 1;
      const recognizable = answers.recognizable.probability;
      scores[c.key] = { surprise, recognizable, score: surprise + recognizable };
    } catch (err) {
      if (++failed <= 5) console.warn(`  ${x.name}/${e.name}/${l.name}: ${(err as Error).message}`);
      if (failed === 50) throw new Error("Too many Jev failures — check the gateway key/credits.");
    }
    if (++done % 250 === 0) {
      writeJSON("scores.json", scores);
      console.log(`${done}/${todo.length}`);
    }
  });
  writeJSON("scores.json", scores);

  const ranked = candidates.filter((c) => scores[c.key]).sort((a, b) => scores[b.key].score - scores[a.key].score);
  const feed = ranked.filter((c) => scores[c.key].surprise >= 8).length;
  console.log(`Scored ${ranked.length} (${failed} failed), ${feed} at 8+. Top 10:`);
  for (const c of ranked.slice(0, 10)) {
    const [x, e, l] = [c.bridge, c.early, c.late].map((id) => people.get(id)!.name);
    const s = scores[c.key];
    console.log(`  ${s.surprise.toFixed(1)}  ${x}: ${e} → ${l}  (known ${s.recognizable.toFixed(2)})`);
  }
  const bench = benchmarkPeople([...people.values()]);
  for (const [x, e, l] of bench.pass) {
    const s = scores[`${x.id}|${e.id}|${l.id}`];
    console.log(`  benchmark ${e.name} → ${x.name} → ${l.name}: ${s ? s.surprise.toFixed(1) : "not scored"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

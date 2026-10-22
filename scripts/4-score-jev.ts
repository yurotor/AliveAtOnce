/**
 * Step 2b — Jev (TypeSafe AI's decision model, via Vercel AI Gateway as
 * typesafe-ai/jev) scores how surprising each candidate bridge is, and how
 * recognisable the three names are.
 *
 * Resumable: results cached in data/scores.json.
 * Needs AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN from `vercel env pull`).
 */
import { experimental_decide as decide } from "ai";
import { readJSON, writeJSON, pool, type Person } from "./lib";
import type { Candidate } from "./3-candidates";

const MODEL = process.env.JEV_MODEL ?? "typesafe-ai/jev";
const LIMIT = Number(process.env.SCORE_LIMIT ?? Infinity);

export type Score = { surprise: number; recognizable: number; score: number };

const describe = (p: Person) => ({
  name: p.name,
  lived: `${p.bornLabel} – ${p.diedLabel ?? "living"}`,
  knownFor: p.description,
});

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Set AI_GATEWAY_API_KEY in .env.local (Vercel dashboard → AI Gateway → API Keys).");
  }
  const people = new Map(readJSON<Person[]>("people.json").map((p) => [p.id, p]));
  const candidates = readJSON<Candidate[]>("candidates.json").slice(0, LIMIT);
  const scores = readJSON<Record<string, Score>>("scores.json", {});
  const todo = candidates.filter((c) => !scores[c.key]);
  console.log(`${candidates.length} candidates, ${todo.length} to score with ${MODEL}`);

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
              "How surprising would a typical person find this fact? Surprise comes from the earlier and later figures feeling like they belong to completely different worlds or eras, while one human lifetime touched both.",
            criteria: [
              "obvious: of course these overlapped",
              "mildly interesting",
              "surprising: makes you do a double take",
              "mind-blowing: feels like different worlds, you'd tell a friend",
            ],
          },
          recognizable: {
            type: "boolean",
            instructions: "Would a typical adult in the US or UK recognise all three names?",
            criteria: { true: "all three are household names", false: "at least one name would draw a blank" },
          },
        },
      });
      const surprise = answers.surprise.score / 3;
      const recognizable = answers.recognizable.probability;
      scores[c.key] = { surprise, recognizable, score: surprise * (0.3 + 0.7 * recognizable) };
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
  console.log(`Scored ${ranked.length} (${failed} failed). Top 10:`);
  for (const c of ranked.slice(0, 10)) {
    const [x, e, l] = [c.bridge, c.early, c.late].map((id) => people.get(id)!.name);
    const s = scores[c.key];
    console.log(`  ${s.score.toFixed(3)}  ${x}: ${e} → ${l}  (surprise ${s.surprise.toFixed(2)}, known ${s.recognizable.toFixed(2)})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

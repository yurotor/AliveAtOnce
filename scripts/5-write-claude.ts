/**
 * Step 3 — Claude writes a punchy one-liner for each top-scored bridge.
 *
 * Picks the top TOP_FACTS by Jev score (with a diversity cap so the same few
 * names don't dominate — see selectFacts), then asks Claude in batches of 20. Claude only gets
 * the dates we computed, and is told not to add any outside facts.
 *
 * Resumable: lines cached in data/lines.json.
 * WRITER_MODEL defaults to Sonnet; set WRITER_MODEL=anthropic/claude-haiku-5.5 for cheap drafts.
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import { readJSON, writeJSON, pool, ageAt, selectFacts, type Person } from "./lib";
import type { Candidate } from "./3-candidates";
import type { Score } from "./4-score-jev";

const MODEL = process.env.WRITER_MODEL ?? "anthropic/claude-sonnet-5.5";
const TOP_FACTS = Number(process.env.TOP_FACTS ?? 3000);
const BATCH = 20;

const SYSTEM = `You write one-liners for "Alive At Once" (aliveatonce.app), a site about surprising lifetime overlaps between famous people.

For each fact you get a bridge person whose life overlapped both an earlier and a later figure who never overlapped each other, plus the bridge person's age at the key moments.

Write ONE line per fact:
- Under 120 characters. Punchy, conversational, made to be shared.
- Lead with the bridge person; land the twist on the later figure.
- Use ONLY the names, dates and ages given. Never add other facts, events or claims.
- If an age is given as "a baby"/"a newborn"/"N months old", you may use it; otherwise you may round ages, never invent them.
- No hashtags, no emoji, no "Did you know", no exclamation marks.
- Vary the phrasing across lines.

Examples of the tone:
- Picasso was a baby when Darwin died — and still alive when Eminem was born.
- Queen Victoria was born while Napoleon was alive. Hitler was 11 when she died.
- One lifetime: Mark Twain was born under James Madison and died after John Wayne was born.`;

const schema = z.object({
  lines: z.array(z.object({ id: z.number().describe("the fact id"), line: z.string() })),
});

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Set AI_GATEWAY_API_KEY in .env.local (Vercel dashboard → AI Gateway → API Keys).");
  }
  const people = new Map(readJSON<Person[]>("people.json").map((p) => [p.id, p]));
  const scores = readJSON<Record<string, Score>>("scores.json");
  const lines = readJSON<Record<string, string>>("lines.json", {});

  const ranked = readJSON<Candidate[]>("candidates.json")
    .filter((c) => scores[c.key])
    .sort((a, b) => scores[b.key].score - scores[a.key].score);
  const chosen = selectFacts(ranked, TOP_FACTS);
  writeJSON("chosen.json", chosen.map((c) => c.key));

  const todo = chosen.filter((c) => !lines[c.key]);
  console.log(`${chosen.length} facts chosen, ${todo.length} need lines (${MODEL})`);
  const batches: Candidate[][] = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));

  let done = 0;
  await pool(batches, 4, async (batch) => {
    const facts = batch.map((c, id) => {
      const [x, e, l] = [c.bridge, c.early, c.late].map((pid) => people.get(pid)!);
      return {
        id,
        bridge: `${x.name} (${x.bornLabel} – ${x.diedLabel ?? "living"}), ${x.description}`,
        earlier: `${e.name} (${e.bornLabel} – ${e.diedLabel}), ${e.description}`,
        later: `${l.name} (born ${l.bornLabel}), ${l.description}`,
        [`${x.name}'s age when ${e.name} died`]: ageAt(x, e.dLo!, e.dHi!)?.phrase ?? "unknown",
        [`${x.name}'s age when ${l.name} was born`]: ageAt(x, l.bLo, l.bHi)?.phrase ?? "unknown",
      };
    });
    try {
      const { output } = await generateText({
        model: MODEL,
        system: SYSTEM,
        prompt: `Write one line for each of these ${facts.length} facts. Return every id.\n\n${JSON.stringify(facts, null, 1)}`,
        output: Output.object({ schema }),
      });
      for (const { id, line } of output.lines) {
        if (batch[id] && line.length <= 160) lines[batch[id].key] = line.trim();
      }
    } catch (err) {
      console.warn(`  batch failed: ${(err as Error).message}`);
    }
    done += batch.length;
    writeJSON("lines.json", lines);
    console.log(`${done}/${todo.length}`);
  });

  const missing = chosen.filter((c) => !lines[c.key]).length;
  console.log(`Done. ${chosen.length - missing} lines written${missing ? `, ${missing} missing (re-run to retry)` : ""}.`);
  for (const c of chosen.slice(0, 8)) console.log(`  • ${lines[c.key]}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

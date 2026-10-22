/**
 * Step 5 — Claude writes the words on each card: a headline (≤ 40 chars), an
 * optional one-liner (≤ 90 chars), and the short name people know each person
 * by ("Picasso", "Darwin"). See the homepage spec, "Headline rules".
 *
 * Picks the top TOP_FACTS by Jev score (with a diversity cap so the same few
 * names don't dominate — see selectFacts). Feed bridges (Jev 8+, the ones that
 * rotate as the daily bridge) are written by FEATURED_MODEL (Sonnet); the rest,
 * shown only on person pages, by BULK_MODEL (Haiku). Batches of 20. Claude only
 * gets the dates we computed and is told not to add outside facts; anything over
 * the length limits or using banned words is dropped and the template is used.
 *
 * Resumable: data/writing.json (per bridge) and data/short-names.json (per person).
 * Needs ANTHROPIC_API_KEY (direct), or AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN for Vercel AI Gateway.
 */
import { generateText, Output, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { readJSON, writeJSON, pool, ageAt, selectFacts, type Person } from "./lib";
import { FEED_MIN_SURPRISE, checkCopy, HEADLINE_MAX, ONE_LINER_MAX } from "../src/lib/headline";
import type { Candidate } from "./3-candidates";
import type { Score } from "./4-score-jev";

const DIRECT = !!process.env.ANTHROPIC_API_KEY;
const FEATURED_MODEL = process.env.FEATURED_MODEL ?? (DIRECT ? "claude-sonnet-5-5" : "anthropic/claude-sonnet-5.5");
const BULK_MODEL = process.env.BULK_MODEL ?? (DIRECT ? "claude-haiku-5-5" : "anthropic/claude-haiku-5.5");
const anthropic = DIRECT ? createAnthropic() : null;
const modelFor = (id: string): LanguageModel => (anthropic ? anthropic(id) : id);
const TOP_FACTS = Number(process.env.TOP_FACTS ?? 3000);
const BATCH = 20;

export type Writing = { headline: string | null; oneLiner: string | null; model: string };

const SYSTEM = `You write the words on share cards for "Alive At Once" (aliveatonce.app), a site about surprising lifetime overlaps between famous people.

Each card shows three faces: an EARLIER person, a BRIDGE person whose life overlapped both, and a LATER person born after the earlier one died. You get each person's dates and the bridge person's age at the two key moments.

For each card write:

1. shortNames: the name a headline should use for each of the three people: their common full name, first and last ("Pablo Picasso", "Charles Darwin", "Abraham Lincoln"), with a title for royalty ("Queen Victoria", "King Charles II", "Tsar Nicholas II", "the Queen Mother"). Use a single name only when that is the name they go by (Eminem, Madonna, Michelangelo, Voltaire). Drop peerage tails and rarely used middle names ("Lord Palmerston", "Gottfried Leibniz").

2. headline: the shortest line that states the bridge, grammatically correct, with a slight street edge.
   - Default shape: "{Bridge} caught {Earlier} *and* {Later}." Write it like that unless you have something clearly better.
   - At most ${HEADLINE_MAX} characters (not counting asterisks). Wrap the word "and" in asterisks (*and*) when it joins the two names.
   - Use those names in full. Factually accurate: "caught" or "was alive with" only. Never say someone lived in another person's era or time, because the overlap may be months.
   - No heavy slang ("no cap", "fr", "lowkey"), no emoji, no hashtags.

3. oneLiner: one punchy line, at most ${ONE_LINER_MAX} characters, that lands the twist with the actual ages, e.g. "He was a baby when Darwin died, and 90 when Eminem was born." Optional: return "" if nothing good fits.
   - Use ONLY the names, dates and ages given. Never add other facts, events, nicknames or claims.
   - If an age is given as "a baby", "a newborn" or "N months old" you may use it; otherwise round, never invent.
   - At most one exclamation mark, most lines need none. No emoji, no "Did you know".
   - Joke about the timeline, never the person. When someone is tied to war, atrocity or tragedy, keep the surprise and drop the cheek.
   - Vary the structure across cards.`;

const schema = z.object({
  cards: z.array(z.object({
    id: z.number().describe("the card id"),
    shortNames: z.object({ bridge: z.string(), earlier: z.string(), later: z.string() }),
    headline: z.string(),
    oneLiner: z.string(),
  })),
});

/** Headline names may add a title ("King Charles II"), so only the length is checked. */
const validShort = (short: string) => short.length > 1 && short.length <= 32;

async function main() {
  if (!DIRECT && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Set ANTHROPIC_API_KEY (or AI_GATEWAY_API_KEY) in .env.local.");
  }
  const people = new Map(readJSON<Person[]>("people.json").map((p) => [p.id, p]));
  const scores = readJSON<Record<string, Score>>("scores.json");
  const writing = readJSON<Record<string, Writing>>("writing.json", {});
  const shortNames = readJSON<Record<string, string>>("short-names.json", {});

  const ranked = readJSON<Candidate[]>("candidates.json")
    .filter((c) => scores[c.key])
    .sort((a, b) => scores[b.key].score - scores[a.key].score);
  const chosen = selectFacts(ranked, TOP_FACTS);
  writeJSON("chosen.json", chosen.map((c) => c.key));

  const todo = chosen.filter((c) => !writing[c.key]);
  const featured = (c: Candidate) => scores[c.key].surprise >= FEED_MIN_SURPRISE;
  console.log(`${chosen.length} facts chosen (${chosen.filter(featured).length} feed), ${todo.length} to write`);
  const batches: { model: string; facts: Candidate[] }[] = [];
  for (const [model, list] of [[FEATURED_MODEL, todo.filter(featured)], [BULK_MODEL, todo.filter((c) => !featured(c))]] as const) {
    for (let i = 0; i < list.length; i += BATCH) batches.push({ model, facts: list.slice(i, i + BATCH) });
  }

  let done = 0, dropped = 0;
  await pool(batches, 4, async ({ model, facts }) => {
    const cards = facts.map((c, id) => {
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
        model: modelFor(model),
        system: SYSTEM,
        prompt: `Write the words for each of these ${cards.length} cards. Return every id.\n\n${JSON.stringify(cards, null, 1)}`,
        output: Output.object({ schema }),
      });
      for (const card of output.cards) {
        const c = facts[card.id];
        if (!c) continue;
        const [x, e, l] = [c.bridge, c.early, c.late].map((pid) => people.get(pid)!);
        for (const [p, short] of [[x, card.shortNames.bridge], [e, card.shortNames.earlier], [l, card.shortNames.later]] as const) {
          if (!shortNames[p.id] && validShort(short)) shortNames[p.id] = short.trim();
        }
        const headline = checkCopy(card.headline, HEADLINE_MAX);
        const oneLiner = checkCopy(card.oneLiner, ONE_LINER_MAX);
        if (!headline) dropped++;
        writing[c.key] = { headline, oneLiner, model };
      }
    } catch (err) {
      console.warn(`  batch failed: ${(err as Error).message}`);
    }
    done += facts.length;
    writeJSON("writing.json", writing);
    writeJSON("short-names.json", shortNames);
    console.log(`${done}/${todo.length}`);
  });

  const missing = chosen.filter((c) => !writing[c.key]).length;
  console.log(`Done. ${chosen.length - missing} written${missing ? `, ${missing} missing (re-run to retry)` : ""}, ${dropped} headlines over limit (template used).`);
  for (const c of chosen.slice(0, 10)) console.log(`  • ${writing[c.key]?.headline} — ${writing[c.key]?.oneLiner}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

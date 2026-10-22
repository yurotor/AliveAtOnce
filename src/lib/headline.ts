/**
 * Card copy rules (homepage spec, "Headline rules"), shared by the Claude step,
 * the DB load and the site. Headlines mark emphasis with *asterisks*.
 */

export const HEADLINE_MAX = 90;
/** Headlines use full names, so long ones are set smaller (a factor of the base size). */
export const headlineScale = (s: string) => {
  const n = visible(s).length;
  return n <= 40 ? 1 : n <= 56 ? 0.86 : 0.74;
};
export const ONE_LINER_MAX = 90;
/** Jev surprise (1–10) a bridge needs to be in the homepage feed. */
export const FEED_MIN_SURPRISE = 8;

// Letter-aware boundaries: plain \b treats accented letters as breaks ("Frédéric" would match "fr").
const BANNED = /(?<!\p{L})(era|eras|lived in|in the time of|no cap|fr|lowkey|ngl|bruh)(?!\p{L})|#|[\u{1F300}-\u{1FAFF}]/iu;

export const visible = (s: string) => s.replace(/\*/g, "");

/** The copy, trimmed, if it's within `max` visible characters and clean; else null. */
export function checkCopy(s: string | null | undefined, max: number) {
  const t = s?.trim().replace(/\s+/g, " ");
  if (!t || visible(t).length > max || BANNED.test(visible(t))) return null;
  return t;
}

// shortName is the name a headline uses: the common full form ("Charles Dickens",
// "King Charles II", "the Queen Mother").
type Named = { name: string; shortName?: string | null };
export const shortName = (p: Named) => p.shortName || p.name;

/**
 * The name under a portrait: the full name, minus peerage tails
 * ("John William Strutt, 3rd Baron Rayleigh" → "John William Strutt").
 */
export const labelName = (p: Named) => p.name.replace(/,\s*\d+(st|nd|rd|th)\s.*$/, "");

/** "Pablo Picasso caught Charles Darwin *and* Eminem." */
export function templateHeadline(bridge: Named, early: Named, late: Named) {
  const line = `${shortName(bridge)} caught ${shortName(early)} *and* ${shortName(late)}.`;
  return line[0].toUpperCase() + line.slice(1); // "the Queen Mother" opens a sentence
}

/** Split "*and*" emphasis into segments for rendering. */
export function emphasis(headline: string) {
  return headline.split(/(\*[^*]+\*)/).filter(Boolean).map((part) =>
    part.startsWith("*") && part.endsWith("*") ? { text: part.slice(1, -1), em: true } : { text: part, em: false },
  );
}

/**
 * Card copy rules (homepage spec, "Headline rules"), shared by the Claude step,
 * the DB load and the site. Headlines mark emphasis with *asterisks*.
 */

export const HEADLINE_MAX = 40;
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

type Named = { name: string; shortName?: string | null };
export const shortName = (p: Named) => p.shortName || p.name;

/** "Picasso caught Darwin *and* Eminem." */
export function templateHeadline(bridge: Named, early: Named, late: Named) {
  return `${shortName(bridge)} caught ${shortName(early)} *and* ${shortName(late)}.`;
}

/** Split "*and*" emphasis into segments for rendering. */
export function emphasis(headline: string) {
  return headline.split(/(\*[^*]+\*)/).filter(Boolean).map((part) =>
    part.startsWith("*") && part.endsWith("*") ? { text: part.slice(1, -1), em: true } : { text: part, em: false },
  );
}

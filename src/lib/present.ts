import { ageAt, displayYear, type Life } from "./life";
import { shortName, visible } from "./headline";
import type { Fact, Person } from "./db";

export const SITE = "aliveatonce.app";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE}`;

/** The headline as plain text (no emphasis markers), for titles and share text. */
export const plainHeadline = (f: Pick<Fact, "headline">) => visible(f.headline);

/**
 * How old `p` was at moment [tLo, tHi], in months when under two years
 * ("5 months old"), otherwise years ("90"). null when the dates are too fuzzy.
 */
export function ageText(p: Life, tLo: number, tHi: number) {
  const minAge = tLo - p.bHi;
  const maxAge = tHi - p.bLo;
  if (maxAge < 0) return null;
  if (maxAge < 2) {
    const lo = Math.max(0, Math.floor(minAge * 12));
    const hi = Math.floor(maxAge * 12);
    if (hi - lo > 2) return null;
    if (lo === 0 && hi === 0) return "a newborn";
    const n = lo === hi ? `${lo}` : `${lo}–${hi}`;
    return `${n} month${n === "1" ? "" : "s"} old`;
  }
  return ageAt(p, tLo, tHi)?.phrase ?? null;
}

const yearOf = (label: string) => {
  const m = label.match(/(\d+)( BC)?$/);
  return m ? `${m[1]}${m[2] ?? ""}` : label;
};

/**
 * The two moments that make a bridge work: when the earlier person died and
 * when the later one was born. `fact` is a plain sentence for the back of the
 * card; `year` labels the overlap point on the lifeline.
 */
export function moments(f: Fact) {
  const [x, e, l] = [f.bridge, f.early, f.late].map(shortName);
  const atDeath = ageText(f.bridge, f.early.dLo!, f.early.dHi!);
  // Prefer the later person's age when the bridge died ("Eminem was 5 months old when Picasso died");
  // for a living bridge, the bridge's age when the later one was born.
  const lateAge = f.bridge.dLo !== null ? ageText(f.late, f.bridge.dLo, f.bridge.dHi!) : null;
  const bridgeAge = ageText(f.bridge, f.late.bLo, f.late.bHi);
  return {
    earlyDied: {
      year: yearOf(f.early.diedLabel!),
      at: (f.early.dLo! + f.early.dHi!) / 2,
      fact: atDeath ? `${x} was ${atDeath} when ${e} died.` : `${e} died during ${x}’s lifetime.`,
    },
    lateBorn: {
      year: yearOf(f.late.bornLabel),
      at: (f.late.bLo + f.late.bHi) / 2,
      fact: lateAge
        ? `${l} was ${lateAge} when ${x} died.`
        : bridgeAge
          ? `${x} was ${bridgeAge} when ${l} was born.`
          : `${l} was born during ${x}’s lifetime.`,
    },
  };
}

export const personPath = (p: Pick<Person, "slug">) => `/p/${p.slug}`;
export const factPath = (f: Pick<Fact, "slug">) => `/b/${f.slug}`;

/** Wikimedia Commons thumbnail for a Special:FilePath URL. */
export function thumb(image: string | null, width = 320) {
  return image ? `${image}?width=${width}` : null;
}

export function lifeYears(p: Life) {
  return `${displayYear(p.bLo)}–${p.dLo === null ? "" : displayYear(p.dLo)}`;
}

/** Ages are only shown when dates pin them down; "living" for the still alive. */
export function lifeNote(p: Life) {
  if (p.dLo === null) return "living";
  const age = ageAt(p, p.dLo, p.dHi!);
  return age ? `died at ${age.years}` : null;
}

/** People in left-to-right card order: older endpoint, bridge, younger endpoint. */
export const trio = (f: Fact) => [f.early, f.bridge, f.late] as const;

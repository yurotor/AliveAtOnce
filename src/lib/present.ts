import { ageAt, displayYear, type Life } from "./life";
import type { Fact, Person } from "./db";

export const SITE = "aliveatonce.app";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE}`;

/** Claude's line, or a plain template while lines haven't been generated. */
export function factLine(f: Fact) {
  return f.line ?? `${f.bridge.name} was alive at the same time as ${f.early.name}… and ${f.late.name}.`;
}

/** The two moments that make a bridge work, phrased from the bridge person's side. */
export function moments(f: Fact) {
  const atDeath = ageAt(f.bridge, f.early.dLo!, f.early.dHi!);
  const atBirth = ageAt(f.bridge, f.late.bLo, f.late.bHi);
  return {
    earlyDied: {
      year: yearOf(f.early.diedLabel!),
      at: (f.early.dLo! + f.early.dHi!) / 2,
      text: atDeath
        ? `${f.bridge.name} was ${atDeath.phrase} when ${f.early.name} died`
        : `${f.early.name} died during ${f.bridge.name}'s lifetime`,
    },
    lateBorn: {
      year: yearOf(f.late.bornLabel),
      at: (f.late.bLo + f.late.bHi) / 2,
      text: atBirth
        ? `${f.bridge.name} was ${atBirth.phrase} when ${f.late.name} was born`
        : `${f.late.name} was born during ${f.bridge.name}'s lifetime`,
    },
  };
}

function yearOf(label: string) {
  const m = label.match(/(\d+)( BC)?$/);
  return m ? `${m[1]}${m[2] ?? ""}` : label;
}

export const personPath = (p: Pick<Person, "slug">) => `/p/${p.slug}`;
export const factPath = (f: Pick<Fact, "id">) => `/bridge/${f.id}`;

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

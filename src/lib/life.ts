/**
 * Lifespan maths shared by the data pipeline and the site.
 *
 * Dates are decimal years (1809.12 ≈ 12 Feb 1809) with uncertainty bounds:
 * bLo/bHi = earliest/latest possible birth, dLo/dHi = earliest/latest possible
 * death (null = still alive). Claims are only made when true for every reading.
 */
export type Life = {
  name: string;
  bornLabel: string;
  diedLabel: string | null;
  bLo: number;
  bHi: number;
  dLo: number | null;
  dHi: number | null;
};

/** True if A and B were certainly alive at the same moment. */
export function overlaps(a: Life, b: Life) {
  const start = Math.max(a.bHi, b.bHi);
  const end = Math.min(a.dLo ?? Infinity, b.dLo ?? Infinity);
  return start < end;
}

/** Years both were alive (conservative). */
export function overlapYears(a: Life, b: Life) {
  const now = currentYear();
  const start = Math.max(a.bHi, b.bHi);
  const end = Math.min(a.dLo ?? now, b.dLo ?? now);
  return Math.max(0, end - start);
}

export function currentYear() {
  const d = new Date();
  return d.getUTCFullYear() + d.getUTCMonth() / 12 + d.getUTCDate() / 365;
}

/**
 * How old `p` was at moment `t` (given as a [lo, hi] window), or null if the
 * dates are too fuzzy to say. Returns a human phrase like "6 months old" or "90".
 */
export function ageAt(p: Life, tLo: number, tHi: number): { years: number; phrase: string } | null {
  const minAge = tLo - p.bHi;
  const maxAge = tHi - p.bLo;
  if (maxAge < 0) return null;
  if (Math.floor(minAge) !== Math.floor(maxAge)) {
    // Imprecise — fall back to a range only if it's tight.
    if (maxAge - minAge > 1.5) return null;
    const a = Math.max(0, Math.floor(minAge));
    return { years: a, phrase: a === 0 ? "a baby" : `about ${a + 1}` };
  }
  const years = Math.floor(minAge);
  if (years === 0) {
    const months = Math.floor(minAge * 12);
    return { years, phrase: months <= 1 ? "a newborn" : `${months} months old` };
  }
  return { years, phrase: `${years}` };
}

export function lifespanLabel(p: Pick<Life, "bornLabel" | "diedLabel">) {
  return `${yearPart(p.bornLabel)}–${p.diedLabel ? yearPart(p.diedLabel) : ""}`;
}

/** "12 Feb 1809" → "1809", "c. 1642" → "c. 1642", "322 BC" → "322 BC" */
export function yearPart(label: string) {
  const m = label.match(/(c\. )?(\d+)( BC)?$/);
  return m ? `${m[1] ?? ""}${m[2]}${m[3] ?? ""}` : label;
}

/** Decimal year → display year ("1881", "100 BC"). */
export function displayYear(y: number) {
  const f = Math.floor(y);
  return f <= 0 ? `${1 - f} BC` : String(f);
}

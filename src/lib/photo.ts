/**
 * Portraits: where they come from, how they're cropped to a face, and how
 * they're tinted by era. Shared by the card, the share images and the pipeline.
 */

/** A Wikimedia Commons portrait (Wikidata P18), resolved at import time. */
export type Photo = {
  file: string; // Commons file name, without "File:"
  thumb: string; // upload.wikimedia.org thumbnail, ~500px wide
  w: number; // thumbnail size in px
  h: number;
  ow?: number; // original width in px
  /** Largest detected face, as fractions of the image: centre x/y and height. null = none found. */
  face: { x: number; y: number; h: number } | null;
  license: string;
  licenseUrl: string | null;
  author: string; // plain text
  source: string; // Commons file page
};

/**
 * The square of the image to show in a circle, as fractions of the image
 * (left, top, side as a fraction of width). Zooms in so the face fills about
 * 40% of the circle with eyes a little above centre; with no face, it takes
 * the largest centred square, from near the top.
 */
export function faceCrop(p: Pick<Photo, "w" | "h" | "face">) {
  const { w, h, face } = p;
  const maxSide = Math.min(w, h);
  let side = maxSide;
  let cx = w / 2;
  let cy = Math.min(h / 2, maxSide / 2 + h * 0.04);
  if (face) {
    side = Math.min(maxSide, Math.max(face.h * h * 2.4, maxSide * 0.3));
    cx = face.x * w;
    cy = face.y * h + side * 0.04;
  }
  const left = Math.min(Math.max(cx - side / 2, 0), w - side);
  const top = Math.min(Math.max(cy - side / 2, 0), h - side);
  return { left: left / w, top: top / h, side: side / w, aspect: h / w };
}

/**
 * Inline styles that place the image inside a square, overflow-hidden box so
 * the crop fills it, in percentages of the box.
 */
export function cropStyle(p: Pick<Photo, "w" | "h" | "face">) {
  const c = faceCrop(p);
  return {
    position: "absolute" as const,
    width: `${100 / c.side}%`,
    height: `${(100 * c.aspect) / c.side}%`,
    left: `${(-100 * c.left) / c.side}%`,
    top: `${(-100 * c.top * c.aspect) / c.side}%`,
    maxWidth: "none",
  };
}

const optimised = (url: string, w: number) => `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;

/**
 * Portrait sources via the Next image optimiser (WebP, sized to the circle,
 * same origin). Larger sizes use Wikimedia's 960px thumbnail when the original
 * is big enough.
 */
export function portraitSources(p: Pick<Photo, "thumb" | "ow">) {
  const big = p.ow && p.ow >= 960 ? p.thumb.replace(/\/\d+px-([^/]+)$/, "/960px-$1") : p.thumb;
  return {
    src: optimised(p.thumb, 384),
    srcSet: `${optimised(p.thumb, 256)} 256w, ${optimised(p.thumb, 384)} 384w, ${optimised(big, 640)} 640w, ${optimised(big, 828)} 828w`,
  };
}

export type Era = "sepia" | "mono" | "colour";

/** Pre-1850 sepia, 1850–1950 black and white, after 1950 full colour. */
export function eraOf(bornYear: number): Era {
  if (bornYear < 1850) return "sepia";
  if (bornYear < 1950) return "mono";
  return "colour";
}

export const ERA_FILTER: Record<Era, string> = {
  sepia: "sepia(0.85) contrast(1.05) brightness(0.95)",
  mono: "grayscale(1) contrast(1.08)",
  colour: "none",
};

/** Background tint for the initials fallback, in the same era family. */
export const ERA_TINT: Record<Era, string> = {
  sepia: "#6b5a3a",
  mono: "#4a4d5c",
  colour: "#3a4fb0",
};

export function initials(name: string) {
  const words = name.replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[A-ZÀ-Þ]/.test(w));
  const pick = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return pick.map((w) => w[0]).join("") || name.slice(0, 1).toUpperCase();
}

/**
 * The front of a bridge card: three overlapping portraits on a lifeline, names,
 * headline and one-liner. One component for the live card, the 9:16 story image
 * and the Open Graph image, so all three match.
 *
 * Everything is laid out in units of a 1000u-wide card via `u()`: CSS calc()
 * against `--u` in the browser, plain pixels in Satori. Styles are inline and
 * Satori-safe (every multi-child div is flex); browser-only extras (animation
 * hooks, CSS filters, srcset) are added only when `live` is set.
 */
import type { CSSProperties } from "react";
import type { Fact, Person } from "@/lib/db";
import { emphasis, headlineScale, labelName } from "@/lib/headline";
import { cropStyle, ERA_FILTER, ERA_TINT, eraOf, initials, portraitSources } from "@/lib/photo";
import { lifeYears, moments, thumb } from "@/lib/present";

export const CARD = {
  bg: "#15172b",
  ink: "#e9eaf3",
  muted: "#9ea1b8",
  ring: "#4b4f72",
  past: "#c2ae63",
  bridge: "#7d89ff",
  future: "#ff6b9d",
};

// Geometry, in units of a 1000u-wide row. Endpoint diameter d; the bridge is
// 20% larger and overlaps each endpoint by 18% of d.
const D_END = 1000 / (2 + 1.2 - 2 * 0.18);
const D_BRIDGE = D_END * 1.2;
const OVERLAP = D_END * 0.18;
const X = [0, D_END - OVERLAP, D_END - OVERLAP + D_BRIDGE - OVERLAP]; // left edges
const SIZES = [D_END, D_BRIDGE, D_END];
const TOPS = SIZES.map((s) => (D_BRIDGE - s) / 2);
const LENS = [(X[1] + X[0] + D_END) / 2, (X[2] + X[1] + D_BRIDGE) / 2]; // centres of the two overlaps
// The lifeline runs in its own band above the portraits, clear of the faces.
const BAND = 100;
const LINE_Y = 72;
const LABEL_GAP = 22;
const LABEL_HEIGHT = 130; // up to two lines of name, then the years
/** Height of the faces block, lifeline and names included. */
export const FACES_HEIGHT = BAND + D_BRIDGE + LABEL_GAP + LABEL_HEIGHT;

export type Unit = (n: number) => number | string;
export const cssUnit: Unit = (n) => `calc(${+n.toFixed(2)} * var(--u))`;
export const pxUnit = (scale: number): Unit => (n) => `${+(n * scale).toFixed(2)}px`;

type Fonts = { display: string; body: string };

/** Rendered width of a card portrait; crops zoom in, so ask for ~1.6× the circle. */
export const PORTRAIT_SIZES = "(min-width: 768px) 420px, 220px";

/** One circular portrait, cropped to the face and tinted by era. */
export function Portrait({ person, size, u, live, src, ring, priority }: {
  person: Person; size: number; u: Unit; live?: boolean; src?: string; ring: string; priority?: boolean;
}) {
  const era = eraOf(person.bLo);
  const box: CSSProperties = {
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
    width: u(size), height: u(size), borderRadius: "50%", overflow: "hidden",
    background: ERA_TINT[era], border: `${u(5)} solid ${ring}`,
  };
  const label = person.name;
  if (!live && src) {
    // Share images: already cropped and tinted server-side.
    // eslint-disable-next-line @next/next/no-img-element
    return <div style={box}><img src={src} alt={label} style={{ width: u(size), height: u(size), flexShrink: 0 }} /></div>;
  }
  if (live && person.photo) {
    return (
      <div style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...portraitSources(person.photo)}
          sizes={PORTRAIT_SIZES}
          alt={label}
          draggable={false}
          fetchPriority={priority ? "high" : undefined}
          style={{ ...cropStyle(person.photo), filter: ERA_FILTER[era] }}
        />
      </div>
    );
  }
  if (live && person.image) {
    return (
      <div style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb(person.image, 330)!}
          alt={label}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 15%", filter: ERA_FILTER[era] }}
        />
      </div>
    );
  }
  return (
    <div style={box} role="img" aria-label={label}>
      <span style={{ color: CARD.ink, fontSize: u(size * 0.3), opacity: 0.85 }}>{initials(person.name)}</span>
    </div>
  );
}

/** The faces row: endpoint, bridge, endpoint, overlapping, on a lifeline with the overlap years. */
export function Faces({ fact, u, fonts, live, portraits, labels = true, lifeline = true }: {
  fact: Fact; u: Unit; fonts: Fonts; live?: boolean; portraits?: Record<string, string>; labels?: boolean; lifeline?: boolean;
}) {
  const people = [fact.early, fact.bridge, fact.late];
  const m = moments(fact);
  const rings = [CARD.ring, CARD.bridge, CARD.ring];
  const tones = [CARD.past, CARD.bridge, CARD.future];
  // Lifeline segments: each runs across its own circle, overlapping its neighbours.
  const segs = [
    [X[0] + D_END * 0.1, X[0] + D_END],
    [X[1], X[1] + D_BRIDGE],
    [X[2], X[2] + D_END * 0.9],
  ];
  const top = lifeline ? BAND : 0;
  const height = top + D_BRIDGE + (labels ? LABEL_GAP + LABEL_HEIGHT : 0);
  return (
    <div style={{ position: "relative", display: "flex", width: u(1000), height: u(height) }}>
      {/* Paint order = DOM order in Satori (no z-index): bridge last so it sits on top. */}
      {[0, 2, 1].map((i) => people[i]).map((p) => ({ p, i: people.indexOf(p), name: labelName(p) })).map(({ p, i, name }) => (
        <div
          key={p.id}
          style={{
            position: "absolute", display: "flex", flexDirection: "column", alignItems: "center",
            left: u(X[i]), top: u(top + TOPS[i]), width: u(SIZES[i]),
            // Bridge on top, with a gap ring in the background colour so the overlap reads cleanly.
            ...(i === 1 && live ? { zIndex: 2 } : {}),
          }}
        >
          <div
            style={{
              display: "flex", borderRadius: "50%",
              ...(i === 1 ? { boxShadow: `0 0 0 ${u(10)} ${CARD.bg}` } : {}),
            }}
          >
            <Portrait person={p} size={SIZES[i]} u={u} live={live} src={portraits?.[p.id]} ring={rings[i]} priority={i === 1} />
          </div>
          {labels && (
            <div
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", marginTop: u(LABEL_GAP),
                width: u(SIZES[i] - 20), textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.body, fontSize: u(name.length > 22 ? 26 : 30), fontWeight: 600,
                  letterSpacing: "0.06em", textTransform: "uppercase", color: CARD.ink, lineHeight: 1.2,
                }}
              >
                {name}
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: u(30), color: CARD.muted, marginTop: u(6) }}>
                {lifeYears(p)}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Lifeline and overlap years, above the portraits. */}
      {lifeline && segs.map(([a, b], i) => (
        <div
          key={i}
          className={live ? "ll-seg" : undefined}
          style={{
            position: "absolute", display: "flex", left: u(a), top: u(LINE_Y - 2.5), width: u(b - a), height: u(5),
            borderRadius: u(3), background: tones[i], boxShadow: `0 0 ${u(8)} rgba(0,0,0,0.6)`,
            ...(live ? ({ "--i": i, zIndex: 3 } as CSSProperties) : {}),
          }}
        />
      ))}
      {lifeline && [m.earlyDied.year, m.lateBorn.year].map((year, i) => (
        <div
          key={year + i}
          className={live ? "ll-mark" : undefined}
          style={{
            position: "absolute", display: "flex", flexDirection: "column", alignItems: "center",
            left: u(LENS[i] - 60), top: u(LINE_Y - 62), width: u(120),
            ...(live ? ({ "--i": i, zIndex: 4 } as CSSProperties) : {}),
          }}
        >
          <span
            style={{
              display: "flex", fontFamily: fonts.body, fontSize: u(27), fontWeight: 700, color: CARD.ink,
              background: "rgba(21, 23, 43, 0.82)", padding: `${u(3)} ${u(12)}`, borderRadius: u(30),
              letterSpacing: "0.03em",
            }}
          >
            {year}
          </span>
          <span
            className={live ? "ll-dot" : undefined}
            style={{
              display: "flex", width: u(18), height: u(18), marginTop: u(12), borderRadius: "50%",
              background: CARD.ink, border: `${u(4)} solid ${CARD.bridge}`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** The headline with its *emphasis*. */
export function Headline({ text, u, fonts, live, size = 80, as: Tag = "div" }: {
  text: string; u: Unit; fonts: Fonts; live?: boolean; size?: number; as?: "div" | "h1" | "h2";
}) {
  const style: CSSProperties = {
    margin: 0, width: "100%", fontFamily: fonts.display, fontWeight: 400, fontSize: u(size * headlineScale(text)), lineHeight: 1.08,
    color: CARD.ink, textAlign: "center",
  };
  const em: CSSProperties = { fontStyle: "italic", color: CARD.bridge };
  if (live) {
    return (
      <Tag style={{ ...style, textWrap: "balance" }}>
        {emphasis(text).map((s, i) => (s.em ? <em key={i} style={em}>{s.text}</em> : s.text))}
      </Tag>
    );
  }
  // Satori has no inline text flow: wrap word by word.
  const words = emphasis(text).flatMap((s) => s.text.split(/\s+/).filter(Boolean).map((w) => ({ w, em: s.em })));
  return (
    <Tag style={{ ...style, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.24em" }}>
      {words.map(({ w, em: isEm }, i) => <span key={i} style={isEm ? em : undefined}>{w}</span>)}
    </Tag>
  );
}

/**
 * Faces, headline and one-liner, stacked. With `fill`, the card takes its
 * container's height and the faces sit centred in whatever the text leaves.
 */
export function CardArt({ fact, u, fonts, live, portraits, headingTag, fill }: {
  fact: Fact; u: Unit; fonts: Fonts; live?: boolean; portraits?: Record<string, string>; headingTag?: "h1" | "h2"; fill?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: u(1000), ...(fill ? { height: "100%" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", ...(fill ? { flex: "1 1 auto", minHeight: 0 } : {}) }}>
        <Faces fact={fact} u={u} fonts={fonts} live={live} portraits={portraits} />
      </div>
      <div style={{ display: "flex", marginTop: u(36), width: u(1000), ...(fill ? { flexShrink: 0 } : {}) }}>
        <Headline text={fact.headline} u={u} fonts={fonts} live={live} as={headingTag} />
      </div>
      {fact.oneLiner && (
        <p
          style={{
            display: "flex", justifyContent: "center", margin: 0, marginTop: u(26), maxWidth: u(880),
            fontFamily: fonts.body, fontSize: u(40), lineHeight: 1.35, color: CARD.muted, textAlign: "center",
          }}
        >
          {fact.oneLiner}
        </p>
      )}
    </div>
  );
}

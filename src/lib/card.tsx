import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { cacheLife } from "next/cache";
import sharp from "sharp";
import { CARD, CardArt, FACES_HEIGHT, Faces, Headline, pxUnit } from "@/components/CardArt";
import type { Fact, Person } from "./db";
import { currentYear, displayYear, type Life } from "./life";
import { eraOf, faceCrop } from "./photo";
import { SITE, thumb } from "./present";

export const CARD_SIZE = { width: 1200, height: 630 };
export const STORY_SIZE = { width: 1080, height: 1920 };

const C = { paper: "#eceee9", ink: "#1c1e3a", muted: "#5d6072", past: "#8a7a3c", bridge: "#2f3fd0", future: "#d6336f" };
const UA = "AliveAtOnce/0.1 (https://aliveatonce.app)";
const FONTS = { display: "Gloock", body: "Hanken Grotesk" };

const asset = (name: string) => readFile(join(process.cwd(), "src/assets", name));

async function fonts() {
  const [gloock, body, bold] = await Promise.all([
    asset("Gloock-Regular.ttf"), asset("HankenGrotesk-500.ttf"), asset("HankenGrotesk-700.ttf"),
  ]);
  return [
    { name: "Gloock", data: gloock, style: "normal" as const, weight: 400 as const },
    { name: "Hanken Grotesk", data: body, style: "normal" as const, weight: 500 as const },
    { name: "Hanken Grotesk", data: bold, style: "normal" as const, weight: 700 as const },
  ];
}

/**
 * A portrait cropped to the face and tinted by era, as a JPEG data URL — Satori
 * can't do CSS filters or offset crops itself. Cached: the same few faces
 * appear in many cards.
 */
async function portrait(p: Person, size: number): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const url = p.photo?.thumb ?? thumb(p.image, 500);
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const img = sharp(Buffer.from(await res.arrayBuffer()));
    const { width = 0, height = 0 } = await img.metadata();
    const c = faceCrop({ w: width, h: height, face: p.photo?.face ?? null });
    const side = Math.round(c.side * width);
    let out = img
      .extract({ left: Math.round(c.left * width), top: Math.round(c.top * height), width: side, height: Math.min(side, height) })
      .resize(size, size, { fit: "cover" });
    const era = eraOf(p.bLo);
    if (era === "mono") out = out.grayscale().linear(1.08, -10);
    if (era === "sepia") out = out.recomb([[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]]).linear(0.95, 0);
    return `data:image/jpeg;base64,${(await out.jpeg({ quality: 82 }).toBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

async function portraits(f: Fact, size: number) {
  const people = [f.early, f.bridge, f.late];
  const urls = await Promise.all(people.map((p) => portrait(p, size)));
  return Object.fromEntries(people.flatMap((p, i) => (urls[i] ? [[p.id, urls[i]]] : [])));
}

const Logo = ({ size }: { size: number }) => (
  <div style={{ display: "flex", fontFamily: "Gloock", fontSize: size, color: CARD.ink }}>Alive At Once</div>
);

/** 9:16 story image for TikTok / Instagram: the card, plus the watermark. */
export async function storyImage(f: Fact) {
  const width = 940;
  const u = pxUnit(width / 1000);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "space-between", background: CARD.bg, padding: "120px 70px 110px",
        }}
      >
        <Logo size={46} />
        <CardArt fact={f} u={u} fonts={FONTS} portraits={await portraits(f, 480)} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Hanken Grotesk" }}>
          <div style={{ display: "flex", fontSize: 34, color: CARD.muted }}>One lifetime. Find more at</div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: CARD.ink, marginTop: 8 }}>{SITE}</div>
        </div>
      </div>
    ),
    { ...STORY_SIZE, fonts: await fonts() },
  );
}

/** 1200×630 link preview: the faces and the headline. */
export async function ogImage(f: Fact) {
  const width = 680;
  const u = pxUnit(width / 1000);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", background: CARD.bg, position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 34, left: 44, display: "flex" }}><Logo size={30} /></div>
        <div
          style={{
            position: "absolute", bottom: 34, right: 44, display: "flex", fontFamily: "Hanken Grotesk",
            fontWeight: 700, fontSize: 26, color: CARD.muted,
          }}
        >
          {SITE}
        </div>
        <div style={{ display: "flex", height: u(FACES_HEIGHT) }}>
          <Faces fact={f} u={u} fonts={FONTS} portraits={await portraits(f, 360)} />
        </div>
        <div style={{ display: "flex", width: 1000, marginTop: 6 }}>
          <Headline text={f.headline} u={pxUnit(1)} fonts={FONTS} size={58} />
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: await fonts() },
  );
}

function bars(lives: { p: Life; color: string }[], width: number) {
  const now = currentYear();
  const lo = Math.min(...lives.map((l) => l.p.bLo));
  const hi = Math.max(...lives.map((l) => l.p.dHi ?? now));
  const pad = (hi - lo) * 0.02;
  const x = (y: number) => ((y - lo + pad) / (hi - lo + 2 * pad)) * width;
  return lives.map(({ p, color }) => {
    const left = x(p.bLo);
    const right = x(p.dLo ?? now);
    return (
      <div key={p.name} style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
        <div style={{ display: "flex", marginLeft: Math.min(left, width - 360), fontSize: 24, color: C.ink }}>
          {p.name}
          <span style={{ color: C.muted, marginLeft: 10 }}>
            {displayYear(p.bLo)}–{p.dLo === null ? "" : displayYear(p.dLo)}
          </span>
        </div>
        <div
          style={{
            marginTop: 6, marginLeft: left, width: Math.max(right - left, 6), height: 14,
            borderRadius: 7, background: color,
          }}
        />
      </div>
    );
  });
}

/** Text + life bars, for person pages and fallbacks. */
export async function textCard(title: string, subtitle: string, lives: Life[] = []) {
  const palette = [C.past, C.bridge, C.future];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", background: C.paper, color: C.ink, padding: "56px 64px",
          fontFamily: "Gloock",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 34, color: C.muted, marginTop: 18 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {bars(lives.map((p, i) => ({ p, color: palette[i % 3] })), 1072)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted }}>
          <span>One lifetime.</span>
          <span style={{ color: C.ink }}>{SITE}</span>
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: await fonts() },
  );
}

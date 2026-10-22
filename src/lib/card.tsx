import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Fact } from "./db";
import { currentYear, displayYear, type Life } from "./life";
import { factLine, SITE } from "./present";

export const CARD_SIZE = { width: 1200, height: 630 };

const C = { paper: "#eceee9", ink: "#1c1e3a", muted: "#5d6072", past: "#8a7a3c", bridge: "#2f3fd0", future: "#d6336f" };

const font = () => readFile(join(process.cwd(), "src/assets/Gloock-Regular.ttf"));

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

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "space-between", background: C.paper, color: C.ink, padding: "56px 64px",
        fontFamily: "Gloock",
      }}
    >
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: C.muted }}>
        <span>One lifetime.</span>
        <span style={{ color: C.ink }}>{SITE}</span>
      </div>
    </div>
  );
}

export async function factCard(f: Fact) {
  const line = factLine(f);
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", fontSize: line.length > 90 ? 50 : 58, lineHeight: 1.08, maxWidth: 1040 }}>
          {line}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {bars(
            [
              { p: f.early, color: C.past },
              { p: f.bridge, color: C.bridge },
              { p: f.late, color: C.future },
            ],
            1072,
          )}
        </div>
      </Frame>
    ),
    { ...CARD_SIZE, fonts: [{ name: "Gloock", data: await font(), style: "normal", weight: 400 }] },
  );
}

export async function textCard(title: string, subtitle: string, lives: Life[] = []) {
  const palette = [C.past, C.bridge, C.future];
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 34, color: C.muted, marginTop: 18 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {bars(lives.map((p, i) => ({ p, color: palette[i % 3] })), 1072)}
        </div>
      </Frame>
    ),
    { ...CARD_SIZE, fonts: [{ name: "Gloock", data: await font(), style: "normal", weight: 400 }] },
  );
}

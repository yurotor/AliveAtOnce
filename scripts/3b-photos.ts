/**
 * Step 3b — resolve every candidate's portrait (Wikidata P18) on Wikimedia
 * Commons: a ~500px thumbnail, its size, licence, author and source page, plus
 * a face-centre point for cropping (Apple Vision via scripts/faces.swift; on
 * other platforms faces are skipped and crops fall back to centre-top).
 *
 * Only people who appear in data/candidates.json are looked up. A person with no
 * usable photo can't be on the homepage, so steps 4+ skip their bridges.
 *
 * Resumable: data/photos.json (null = no usable photo), thumbnails in data/thumbs/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataPath, pool, readJSON, sleep, writeJSON, type Person, type Photo } from "./lib";
import type { Candidate } from "./3-candidates";

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "AliveAtOnce/0.1 (https://aliveatonce.app) data-pipeline";
const WIDTH = 500;
const OK_MIME = /^image\/(jpeg|png|webp|tiff)$/;

type ImageInfo = {
  url: string; descriptionurl: string; mime: string;
  thumburl?: string; thumbwidth?: number; thumbheight?: number; width: number; height: number;
  extmetadata?: Record<string, { value: string }>;
};

const fileOf = (image: string) => decodeURIComponent(image.split("/Special:FilePath/")[1] ?? "").replace(/_/g, " ");
const plain = (html = "") => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

async function get(url: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    if (attempt >= 5 || (res.status !== 429 && res.status < 500)) throw new Error(`HTTP ${res.status} ${url}`);
    await sleep(Number(res.headers.get("retry-after") ?? 10) * 1000);
  }
}

async function lookup(files: string[]) {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata", iiurlwidth: String(WIDTH),
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit",
    titles: files.map((f) => `File:${f}`).join("|"),
  });
  const json = (await (await get(`${API}?${params}`)).json()) as {
    query?: { normalized?: { from: string; to: string }[]; pages: { title: string; imageinfo?: ImageInfo[] }[] };
  };
  const alias = new Map((json.query?.normalized ?? []).map((n) => [n.to, n.from]));
  const out = new Map<string, ImageInfo>();
  for (const page of json.query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    if (info) out.set((alias.get(page.title) ?? page.title).replace(/^File:/, ""), info);
  }
  return out;
}

async function main() {
  const people = new Map(readJSON<Person[]>("people.json").map((p) => [p.id, p]));
  const ids = new Set(readJSON<Candidate[]>("candidates.json").flatMap((c) => [c.bridge, c.early, c.late]));
  const photos = readJSON<Record<string, Photo | null>>("photos.json", {});
  // Also refresh entries from before original widths were stored (faces are kept).
  const todo = [...ids].filter((id) => (!(id in photos) || (photos[id] && !photos[id]!.ow)) && people.get(id)?.image);
  console.log(`${ids.size} people in candidates, ${todo.length} photos to resolve`);

  // 1. Commons metadata, 50 files per request.
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const files = batch.map((id) => fileOf(people.get(id)!.image!));
    const infos = await lookup(files);
    batch.forEach((id, j) => {
      const info = infos.get(files[j]);
      const m = info?.extmetadata ?? {};
      const old = photos[id];
      photos[id] = info && OK_MIME.test(info.mime)
        ? {
            ...old,
            file: files[j],
            thumb: (info.thumburl ?? info.url).split("?")[0],
            w: info.thumbwidth ?? info.width,
            h: info.thumbheight ?? info.height,
            ow: info.width,
            face: old?.face ?? null,
            license: plain(m.LicenseShortName?.value) || "see source",
            licenseUrl: m.LicenseUrl?.value || null,
            author: plain(m.Artist?.value || m.Credit?.value).slice(0, 200) || "Unknown",
            source: info.descriptionurl,
          }
        : null;
    });
    if ((i / 50) % 10 === 0) { writeJSON("photos.json", photos); console.log(`metadata ${i + batch.length}/${todo.length}`); }
  }
  writeJSON("photos.json", photos);

  // 2. Download thumbnails and find faces.
  if (process.platform !== "darwin") {
    console.warn("Face detection needs macOS (Vision); crops will fall back to centre-top.");
    return;
  }
  const dir = dataPath("thumbs");
  mkdirSync(dir, { recursive: true });
  const faceless = [...ids].filter((id) => photos[id] && !photos[id]!.face && !(photos[id] as Photo & { scanned?: boolean }).scanned);
  console.log(`${faceless.length} thumbnails to scan for faces`);
  const paths = new Map<string, string>();
  let done = 0;
  await pool(faceless, 6, async (id) => {
    const path = join(dir, `${id}.img`);
    try {
      if (!existsSync(path)) writeFileSync(path, Buffer.from(await (await get(photos[id]!.thumb)).arrayBuffer()));
      paths.set(path, id);
    } catch (err) {
      console.warn(`  ${id}: ${(err as Error).message}`);
    }
    if (++done % 250 === 0) console.log(`downloaded ${done}/${faceless.length}`);
  });
  if (!paths.size) return;
  const out = execFileSync("swift", [join(import.meta.dirname, "faces.swift")], {
    input: [...paths.keys()].join("\n") + "\n",
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
  let found = 0;
  for (const line of out.split("\n").filter(Boolean)) {
    const { path, face } = JSON.parse(line) as { path: string; face: Photo["face"] };
    const id = paths.get(path);
    if (!id || !photos[id]) continue;
    photos[id] = { ...photos[id]!, face, ...(face ? {} : { scanned: true }) };
    if (face) found++;
  }
  writeJSON("photos.json", photos);
  const usable = [...ids].filter((id) => photos[id]).length;
  console.log(`Faces found in ${found}/${paths.size}. ${usable}/${ids.size} candidate people have a usable photo.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

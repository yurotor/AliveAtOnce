/**
 * Step 1b — rank people by English Wikipedia pageviews (last ~60 days, via the
 * MediaWiki API's prop=pageviews, 50 titles per request), blended with sitelinks
 * (how many languages cover them) so historical figures aren't drowned out by
 * this month's news. Keeps the top TOP_N.
 *
 * Wikimedia rate-limits aggressively, so this runs one request at a time and
 * honours Retry-After. Resumable: views are cached in data/pageviews-cache.json.
 * SKIP_PAGEVIEWS=1 ranks by sitelinks only (useful if you're rate-limited).
 *
 * Output: data/people.json
 */
import { readJSON, writeJSON, sleep, type Person } from "./lib";

const TOP_N = Number(process.env.TOP_N ?? 50_000);
const UA = "AliveAtOnce/0.1 (https://aliveatonce.app; contact via site) data-pipeline";
const API = "https://en.wikipedia.org/w/api.php";

type PvResponse = {
  continue?: Record<string, string>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: { title: string; pageviews?: Record<string, number | null> }[];
  };
};

async function fetchBatch(titles: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let cont: Record<string, string> = {};
  // prop=pageviews pages through results with `continue`.
  for (;;) {
    const params = new URLSearchParams({
      action: "query", prop: "pageviews", titles: titles.join("|"),
      format: "json", formatversion: "2", redirects: "1", maxlag: "5", ...cont,
    });
    const res = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500 || !res.headers.get("content-type")?.includes("json")) {
      const wait = Number(res.headers.get("retry-after") ?? 30);
      console.warn(`  HTTP ${res.status}, waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    const json = (await res.json()) as PvResponse;
    const alias = new Map<string, string>(); // resolved title -> requested title
    for (const n of [...(json.query?.normalized ?? []), ...(json.query?.redirects ?? [])]) {
      alias.set(n.to, alias.get(n.from) ?? n.from);
    }
    for (const page of json.query?.pages ?? []) {
      if (!page.pageviews) continue;
      const total = Object.values(page.pageviews).reduce<number>((s, v) => s + (v ?? 0), 0);
      const requested = alias.get(page.title) ?? page.title;
      out.set(requested, (out.get(requested) ?? 0) + total);
    }
    if (!json.continue) break;
    cont = json.continue;
  }
  return out;
}

async function main() {
  const people = readJSON<Person[]>("people-raw.json");
  const cache = readJSON<Record<string, number>>("pageviews-cache.json", {});

  if (!process.env.SKIP_PAGEVIEWS) {
    const todo = people.filter((p) => p.wiki && !(p.id in cache));
    console.log(`${people.length} people, ${todo.length} pageview lookups to do`);
    const started = Date.now();
    for (let i = 0; i < todo.length; i += 50) {
      const batch = todo.slice(i, i + 50);
      const titles = batch.map((p) => p.wiki!.replace(/_/g, " "));
      const views = await fetchBatch(titles);
      batch.forEach((p, j) => (cache[p.id] = views.get(titles[j]) ?? 0));
      if ((i / 50) % 20 === 0) {
        writeJSON("pageviews-cache.json", cache);
        const rate = (i + 50) / ((Date.now() - started) / 1000);
        console.log(`${i + batch.length}/${todo.length} (~${((todo.length - i) / rate / 60).toFixed(1)} min left)`);
      }
      await sleep(250);
    }
    writeJSON("pageviews-cache.json", cache);
  }

  // Fame = blend of log pageviews and log sitelinks, each normalised to 0..1.
  const havePv = Object.keys(cache).length > people.length * 0.5;
  const lv = people.map((p) => Math.log10(1 + (cache[p.id] ?? 0)));
  const ls = people.map((p) => Math.log10(p.sitelinks));
  const norm = (xs: number[]) => {
    let min = Infinity, max = -Infinity;
    for (const x of xs) { if (x < min) min = x; if (x > max) max = x; }
    return xs.map((x) => (x - min) / (max - min || 1));
  };
  const nv = norm(lv), ns = norm(ls);
  people.forEach((p, i) => {
    p.pageviews = cache[p.id] ?? 0;
    p.fame = havePv ? 0.6 * nv[i] + 0.4 * ns[i] : ns[i];
  });
  if (!havePv) console.warn("No pageview data — ranking by sitelinks only.");
  people.sort((a, b) => b.fame - a.fame);
  const top = people.slice(0, TOP_N);
  top.forEach((p, i) => (p.rank = i + 1));
  writeJSON("people.json", top);
  console.log(`Wrote ${top.length} people. Top 15:`);
  console.log(top.slice(0, 15).map((p) => `${p.rank}. ${p.name} (${p.pageviews.toLocaleString()} views, ${p.sitelinks} langs)`).join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });

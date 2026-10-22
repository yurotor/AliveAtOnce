/**
 * Step 1a — pull famous humans from Wikidata (via the QLever SPARQL endpoint,
 * which handles full scans of all humans far faster than query.wikidata.org).
 *
 * Output: data/people-raw.json — everyone with ≥ MIN_SITELINKS Wikipedia/Wikimedia
 * language editions and usable (day/month/year precision, consistent) dates.
 */
import { writeFileSync } from "node:fs";
import { dataPath, sleep, writeJSON, type Person } from "./lib";

const MIN_SITELINKS = Number(process.env.MIN_SITELINKS ?? 20);
const ENDPOINT = "https://qlever.dev/api/wikidata";

const QUERY = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?p ?sl ?label ?desc ?b ?bp ?br ?d ?dp ?dr ?img ?article WHERE {
  ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${MIN_SITELINKS})
  # Many famous people now carry only a language-neutral "mul" label (e.g. Picasso).
  ?p rdfs:label ?label . FILTER(LANG(?label) = "en" || LANG(?label) = "mul")
  OPTIONAL { ?p schema:description ?desc . FILTER(LANG(?desc) = "en") }
  ?p p:P569 ?bs . ?bs psv:P569 ?bv ; wikibase:rank ?br . FILTER(?br != wikibase:DeprecatedRank)
  ?bv wikibase:timeValue ?b ; wikibase:timePrecision ?bp .
  OPTIONAL {
    ?p p:P570 ?ds . ?ds psv:P570 ?dv ; wikibase:rank ?dr . FILTER(?dr != wikibase:DeprecatedRank)
    ?dv wikibase:timeValue ?d ; wikibase:timePrecision ?dp .
  }
  OPTIONAL { ?p wdt:P18 ?img }
  OPTIONAL { ?article schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> }
}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const yearLabel = (y: number) => (y <= 0 ? `${1 - y} BC` : String(y));
const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

type Bound = { lo: number; hi: number; label: string; precision: number };

/** Wikidata RDF times use astronomical years (0000 = 1 BC). */
function parseTime(value: string, precision: number): Bound | null {
  const m = value.match(/^(-?\d+)-(\d\d)-(\d\d)/);
  if (!m || precision < 9) return null; // decade/century precision is useless here
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  if (precision === 9) return { lo: y, hi: y + 0.9999, label: yearLabel(y), precision };
  const monthStart = y + CUM_DAYS[mo - 1] / 365;
  if (precision === 10)
    return { lo: monthStart, hi: y + CUM_DAYS[mo] / 365 - 0.0001, label: `${MONTHS[mo - 1]} ${yearLabel(y)}`, precision };
  const t = y + (CUM_DAYS[mo - 1] + day - 1) / 365;
  return { lo: t, hi: t + 1 / 365 - 0.0001, label: `${day} ${MONTHS[mo - 1]} ${yearLabel(y)}`, precision };
}

type Ranked = Bound & { preferred: boolean };

/**
 * Merge several date statements into one bound, or reject if they genuinely disagree.
 * Preferred-rank statements win (Wikidata's own "truthy" rule). A coarse value that
 * contains a finer one (1882 vs 19 Apr 1882) is a refinement, not a disagreement.
 */
function merge(all: Ranked[]): Bound | null {
  if (!all.length) return null;
  const preferred = all.filter((b) => b.preferred);
  const bounds = preferred.length ? preferred : all;
  const top = Math.max(...bounds.map((b) => b.precision));
  const finest = bounds.filter((b) => b.precision === top);
  let lo = Math.min(...finest.map((b) => b.lo));
  let hi = Math.max(...finest.map((b) => b.hi));
  const refines = bounds.every((b) => b.lo <= lo + 1e-6 && b.hi >= hi - 1e-6) || bounds.every((b) => b.lo <= hi && b.hi >= lo);
  if (!refines) {
    lo = Math.min(...bounds.map((b) => b.lo));
    hi = Math.max(...bounds.map((b) => b.hi));
  }
  if (hi - lo > 2) return null; // sources disagree by years — skip this person
  const label =
    finest.length === 1 && refines ? finest[0].label : `c. ${yearLabel(Math.floor(lo))}`;
  return { lo, hi, label, precision: top };
}

function unquote(s: string | undefined) {
  if (!s) return "";
  const m = s.match(/^"(.*)"(@\w+|\^\^.*)?$/);
  return (m ? m[1] : s).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
const unIri = (s: string | undefined) => (s ? s.replace(/^<|>$/g, "") : "");

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log(`Querying QLever for humans with ≥${MIN_SITELINKS} sitelinks…`);
  let tsv = "";
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/tab-separated-values",
        "User-Agent": "AliveAtOnce/0.1 (https://aliveatonce.app)",
      },
      body: new URLSearchParams({ query: QUERY }),
    });
    if (res.ok) { tsv = await res.text(); break; }
    const err = `QLever ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (attempt >= 5) throw new Error(err);
    console.warn(`${err}\n…retrying in ${attempt * 20}s`);
    await sleep(attempt * 20_000);
  }
  writeFileSync(dataPath("people-raw.tsv"), tsv);
  const lines = tsv.split("\n").filter(Boolean);
  const header = lines.shift()!.split("\t").map((h) => h.replace(/^\?/, ""));
  console.log(`${lines.length} rows`);

  type Acc = {
    id: string; sl: number; label: string; desc: string; img: string; article: string;
    births: Map<string, Ranked>; deaths: Map<string, Ranked>; hasDeath: boolean;
  };
  const acc = new Map<string, Acc>();
  for (const line of lines) {
    const cols = line.split("\t");
    const r = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]));
    const id = unIri(r.p).split("/").pop()!;
    let a = acc.get(id);
    if (a && r.label.endsWith("@en")) a.label = unquote(r.label);
    if (!a) {
      a = {
        id, sl: Number(unquote(r.sl)), label: unquote(r.label), desc: unquote(r.desc),
        img: unIri(r.img), article: unIri(r.article),
        births: new Map(), deaths: new Map(), hasDeath: false,
      };
      acc.set(id, a);
    }
    const b = parseTime(unquote(r.b), Number(unquote(r.bp)));
    if (b) a.births.set(b.label, { ...b, preferred: r.br.includes("Preferred") });
    if (r.d) {
      a.hasDeath = true;
      const d = parseTime(unquote(r.d), Number(unquote(r.dp)));
      if (d) a.deaths.set(d.label, { ...d, preferred: r.dr.includes("Preferred") });
    }
  }

  const people: Person[] = [];
  const slugs = new Set<string>();
  let rejected = 0;
  for (const a of acc.values()) {
    const birth = merge([...a.births.values()]);
    const death = a.hasDeath ? merge([...a.deaths.values()]) : null;
    // No death statement + born long ago = unknown death date, not "still alive".
    const aliveOk = !a.hasDeath && birth && birth.lo >= 1915;
    if (!birth || (a.hasDeath && !death) || (!a.hasDeath && !aliveOk) || /^Q\d+$/.test(a.label)) {
      rejected++;
      continue;
    }
    if (death && death.hi < birth.lo) { rejected++; continue; }
    const wiki = a.article ? decodeURIComponent(a.article.split("/wiki/")[1]) : null;
    let slug = slugify(wiki ? wiki.replace(/_/g, " ") : a.label) || a.id.toLowerCase();
    if (slugs.has(slug)) slug = `${slug}-${a.id.toLowerCase()}`;
    slugs.add(slug);
    people.push({
      id: a.id,
      slug,
      // The English Wikipedia title is usually the name people know ("Queen Victoria", not "Victoria").
      name: wiki ? wiki.replace(/_/g, " ").replace(/\s*\([^)]*\)$/, "") : a.label,
      // Drop the "(1809–1882)" suffix many descriptions carry; the site shows dates itself.
      description: a.desc.replace(/\s*\([^()]*\d{3,4}[^()]*\)\s*$/, "").trim(),
      bornLabel: birth.label,
      diedLabel: death?.label ?? null,
      bLo: birth.lo,
      bHi: birth.hi,
      dLo: death?.lo ?? null,
      dHi: death?.hi ?? null,
      image: a.img ? a.img.replace(/^http:/, "https:") : null,
      wiki,
      sitelinks: a.sl,
      pageviews: 0,
      fame: 0,
      rank: 0,
    });
  }
  console.log(`${people.length} usable people (${rejected} rejected for missing/inconsistent dates)`);
  writeJSON("people-raw.json", people);
}

main().catch((e) => { console.error(e); process.exit(1); });

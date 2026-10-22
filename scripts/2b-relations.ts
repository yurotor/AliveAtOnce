/**
 * Step 2b — known personal links between people (teacher/student, influence,
 * family, partners) from Wikidata, so step 3 can drop "same circle" bridges
 * like Plato–Socrates: an overlap is no surprise when one taught the other.
 *
 * Output: data/relations.json — sorted "Qa|Qb" pairs.
 */
import { readJSON, sleep, writeJSON, type Person } from "./lib";

const ENDPOINT = "https://qlever.dev/api/wikidata";

// student of, student, doctoral advisor/student, influenced by, spouse, partner,
// father, mother, child, sibling, relative, business/sport partner.
const PROPS = ["P1066", "P802", "P184", "P185", "P737", "P26", "P451", "P22", "P25", "P40", "P3373", "P1038", "P1327"];

const QUERY = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
SELECT DISTINCT ?a ?b WHERE {
  VALUES ?rel { ${PROPS.map((p) => `wdt:${p}`).join(" ")} }
  ?a ?rel ?b .
  ?a wdt:P31 wd:Q5 ; wikibase:sitelinks ?sa . FILTER(?sa >= 20)
  ?b wdt:P31 wd:Q5 ; wikibase:sitelinks ?sb . FILTER(?sb >= 20)
}`;

async function main() {
  const known = new Set(readJSON<Person[]>("people.json").map((p) => p.id));
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
  const qid = (iri: string) => iri.replace(/^<|>$/g, "").split("/").pop()!;
  const pairs = new Set<string>();
  for (const line of tsv.split("\n").slice(1)) {
    const [a, b] = line.split("\t").map((s) => (s ? qid(s) : ""));
    if (!a || !b || a === b || !known.has(a) || !known.has(b)) continue;
    pairs.add([a, b].sort().join("|"));
  }
  writeJSON("relations.json", [...pairs].sort());
  console.log(`${pairs.size} links between people in people.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });

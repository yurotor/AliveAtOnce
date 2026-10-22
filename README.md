# Alive At Once

Surprising lifetime overlaps between famous people — **aliveatonce.app**.
Plan: [`Alive At Once — MVP Plan.md`](./Alive%20At%20Once%20—%20MVP%20Plan.md).

Next.js 16 (App Router, Cache Components) · Neon Postgres · Vercel AI Gateway (Jev + Claude).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and AI_GATEWAY_API_KEY
npm run dev
```

## Data pipeline

Each step writes to `data/` (git-ignored) and is safe to re-run; the slow steps resume from cache.

| Step | Command | What it does | Needs |
| --- | --- | --- | --- |
| 1 | `npm run data:people` | ~86k humans with ≥20 Wikipedia language editions from Wikidata (via QLever), with uncertainty-aware birth/death bounds | — |
| 2 | `npm run data:rank` | Ranks by English Wikipedia pageviews (last ~60 days) blended with sitelinks; keeps top 50k. ~1h, rate-limited by Wikimedia. `SKIP_PAGEVIEWS=1` = sitelinks only | — |
| 3 | `npm run data:candidates` | Finds "bridges": one life that overlapped an earlier and a later figure who never overlapped each other | — |
| 4 | `npm run data:score` | **Jev** (`typesafe-ai/jev`) scores surprise + recognisability for each candidate | `AI_GATEWAY_API_KEY` |
| 5 | `npm run data:write` | **Claude** (Sonnet 5.5) writes a one-liner for the top 3,000 | `AI_GATEWAY_API_KEY` |
| 6 | `npm run data:load` | Loads people + facts into Postgres | `DATABASE_URL` |

Steps 4–5 are optional: without them, step 6 loads heuristic-ranked bridges with template lines, so the site works before any AI keys exist.

Useful knobs: `TOP_N`, `BRIDGE_POOL`, `END_POOL`, `MAX_CANDIDATES`, `SCORE_LIMIT`, `TOP_FACTS`, `JEV_MODEL`, `WRITER_MODEL` (e.g. `anthropic/claude-haiku-5.5` for cheap drafts).

### Date accuracy

Every person carries earliest/latest possible birth and death (`src/lib/life.ts`). An overlap is only claimed when it's true for every reading of the dates; people whose sources disagree by more than two years are dropped; Wikidata "preferred" statements win.

## Site

- `/` — today's bridge (rotates daily, UTC) + search + more bridges
- `/p/[slug]` — person page: lifetime chart vs famous contemporaries, surprising overlaps, who was alive when they were born / who was born during their life (SEO: "who was alive at the same time as …")
- `/bridge/[id]` — a single shareable bridge
- Share cards: `opengraph-image` on every page (watermarked aliveatonce.app)
- `/privacy`, `/terms` — needed for the TikTok developer app
- Sitemaps at `/sitemap/0.xml` … `/sitemap/5.xml`

## Deploy

```bash
vercel link
vercel env add DATABASE_URL production
vercel --prod
vercel domains add aliveatonce.app
```

On Vercel, AI Gateway authenticates via OIDC automatically; the key is only needed for running the pipeline locally.

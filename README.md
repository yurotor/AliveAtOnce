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
| 2b | `npm run data:relations` | Teacher/student, influence and family links from Wikidata, to drop "same circle" bridges | — |
| 3 | `npm run data:candidates` | Finds "bridges" (one life that overlapped an earlier and a later figure who never overlapped each other) and applies the hard surprise filters in `scripts/surprise.ts`, printing the spec's benchmarks | — |
| 3b | `npm run data:photos` | Commons portrait per candidate person: thumbnail, licence, author, plus a face-centre crop point (Apple Vision, macOS) | — |
| 4 | `npm run data:score` | **Jev** scores surprise 1–10 (feed = 8+) and recognisability | `TYPESAFE_API_KEY` or `AI_GATEWAY_API_KEY` |
| 5 | `npm run data:write` | **Claude** writes headline, one-liner and short names (Sonnet for feed bridges, Haiku for the rest) | `ANTHROPIC_API_KEY` or `AI_GATEWAY_API_KEY` |
| 6 | `npm run data:load` | Loads people + facts into Postgres; marks the homepage feed; assigns stable `/b/{slug}` slugs | `DATABASE_URL` |

Steps 4–5 are optional: without them, step 6 loads heuristic-ranked bridges with template headlines, so the site works before any AI keys exist.

Useful knobs: `TOP_N`, `BRIDGE_POOL`, `END_POOL`, `MAX_CANDIDATES`, `SCORE_LIMIT`, `TOP_FACTS`, `JEV_MODEL`, `WRITER_MODEL` (e.g. `anthropic/claude-haiku-5.5` for cheap drafts).

### Date accuracy

Every person carries earliest/latest possible birth and death (`src/lib/life.ts`). An overlap is only claimed when it's true for every reading of the dates; people whose sources disagree by more than two years are dropped; Wikidata "preferred" statements win.

## Site

- `/` — full-screen card with today's bridge (rotates daily, UTC); swipe / arrows / wheel through the feed
- `/b/[slug]` — one bridge card (e.g. `/b/darwin-picasso-eminem`), with a 1200×630 OG image and a 9:16 story image at `/b/[slug]/story`
- `/p/[slug]` — person page: lifetime chart vs famous contemporaries, surprising overlaps as face cards
- `/collections`, `/credits` — themed face-card grids; photo credits
- `/bridge/[id]` — old links, redirect to `/b/[slug]`
- Card, story image and OG image share one component: `src/components/CardArt.tsx`
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

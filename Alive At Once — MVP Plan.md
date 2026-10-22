# Alive At Once — MVP Plan

Oct 20, 2026 · @Uri

## Concept

A site about surprising lifetime overlaps between famous people — e.g. Picasso was alive alongside both Darwin and Eminem. Domain: **aliveatonce.app** (not purchased yet; \~$14.99/yr, renews \~$15).

## Full vision (sections)

- **Daily bridge** — one mind-blowing overlap per day, shareable
- **Explorer** — pick a person, see who overlapped with their life on a timeline
- **Connect two people** — shortest chain of overlapping lifetimes between any two people
- **Curated collections** — themed lists (science to pop culture, same birthday, last living witness)
- **Quiz mode** — "who was alive first?" style games
- **Submit a find** — user suggestions with upvotes

## Stack

- Next.js on Vercel
- Postgres (e.g. Neon) — overlaps are date-range queries
- **Jev** (TypeSafe AI, via Vercel AI Gateway as typesafe-ai/jev) — classifies how surprising a pairing is
- **Claude** (Sonnet; Haiku for bulk drafts) — writes one-liners and all other generation

## MVP milestone

1. **Data** — pull \~50k most famous people from Wikidata (rank by Wikipedia pageviews): birth/death dates, field, photo
2. **Scoring** — generate overlapping candidate pairs; Jev scores surprise; keep top few thousand
3. **Writing** — Claude writes a punchy one-liner for each top pair
4. **Site** — homepage with the daily bridge + person pages with a life timeline and surprising overlaps

## Seed examples

- Picasso (1881–1973): born before Darwin died, alive when Eminem was born
- Einstein (1879–1955): born while Marx alive; died after Steve Jobs was born
- Queen Victoria (1819–1901): born while Napoleon alive; Hitler was 11 when she died
- Darwin (1809–1882): born before Haydn died; died after FDR and James Joyce were born
- Mark Twain (1835–1910): born while James Madison alive; died after John Wayne was born
- Orville Wright (1871–1948): born while Babbage alive; died after Bowie, Stephen King, Schwarzenegger were born
- Galileo died and Newton was born in 1642; Lincoln and Darwin share a birthday (Feb 12, 1809)

## Notes

- Jev new signups are paused — use the Vercel AI Gateway route
- The .com is taken; always share the full .app domain

## Marketing

**Channels**

- Main: TikTok, Instagram Reels, YouTube Shorts — dedicated "Alive At Once" accounts, same handle everywhere, same video cross-posted
- Later: X (API is paid; post the best facts by hand)
- SEO: person pages target searches like "who was alive at the same time as Einstein"
- Shareable overlap cards (images) for X / WhatsApp, watermarked
- Reddit: optional one-time launch post on r/InternetIsBeautiful or r/SideProject; avoid self-promo in TIL
- No paid ads

**Short video format (15–20s, one fact per video)**

1. Hook (first 2s): "Picasso was alive at the same time as Charles Darwin…"
2. Twist: "…and Eminem." — smash cut
3. Visual: animated timeline of overlapping life bars
4. Kicker: "One lifetime. Find more at aliveatonce.app"

- Big captions (watched on mute), trending audio

**Automation**

- Generate videos from top-scored pairs with Remotion
- Upload via TikTok Content Posting API — apply for the app audit early; unaudited apps can only post privately, so meanwhile push as drafts and publish by hand

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Social arrivals.** People who land from a TikTok, Instagram Reel, YouTube Short, or a shared link (X, WhatsApp), almost always on a phone. They want a quick "wait, what?" moment, then they share it or tap into one more person.
- **Search arrivals.** People who come from queries like "who was alive at the same time as Einstein", often on desktop. They want to dig into one person's contemporaries and follow links from there.

The same pages serve both: a bridge or person page must land instantly on a phone and also reward a longer desktop browse.

## Product Purpose

Alive At Once (aliveatonce.app) shows surprising lifetime overlaps between famous people: one life that touched worlds that feel centuries apart. Picasso was alive at the same time as Darwin, and he was still alive when Eminem was born.

Success for now is audience growth only: shares, daily return visits for the daily bridge, social follower growth, and search traffic to person pages. There's no monetization plan, and nothing on the site should feel commercial.

## Positioning

- **The bridge.** The core unit is a "bridge": one lifetime that overlapped both an earlier and a later figure who never overlapped each other. It's not a generic timeline or a "born on this day" list.
- **Trustworthy dates.** Overlaps are uncertainty-safe. Dates come from Wikidata, and an overlap is only claimed when it holds for every reading of the dates. People whose sources disagree are dropped.
- **Scored and written for sharing.** Bridges are scored for surprise and name recognition, and each one gets a one-line summary written for sharing.

## Operating Context

- **Daily ritual.** One "daily bridge" on the homepage, rotating at the UTC day.
- **Short video.** A 15–20 second video, one fact per video: hook ("Picasso was alive at the same time as Charles Darwin…"), twist ("…and Eminem."), an animated timeline of overlapping life bars, then the kicker "One lifetime. Find more at aliveatonce.app". Captions are big because people watch on mute. The same video is cross-posted to TikTok, Reels, and Shorts from dedicated "Alive At Once" accounts with the same handle everywhere.
- **Share cards.** Watermarked overlap images for X and WhatsApp. Every shared link unfurls into a card.
- **SEO.** Person pages target "who was alive at the same time as …" searches.
- **Reddit.** An optional one-time launch post on r/InternetIsBeautiful or r/SideProject. No self-promotion in TIL.
- **X.** Best facts are posted by hand later.
- **No paid ads.**

## Capabilities and Constraints

**Current surfaces**

- Homepage: daily bridge, person search, more bridges.
- Person pages (`/p/[slug]`): lifetime chart, surprising overlaps, who was already alive at birth, who was born during the person's life.
- Bridge pages (`/bridge/[id]`).
- Search.
- About, Privacy, and Terms (Privacy and Terms are required for the TikTok developer app).
- OG share images and sitemaps.

**Data**

- About 50,000 people, ranked by Wikipedia pageviews blended with the number of language editions.
- Dates, descriptions, and portraits come from Wikidata and Wikimedia Commons.
- Some dates are only known to the year, or are marked "c.". Living people have no death date.

**Pipeline**

- Jev (`typesafe-ai/jev`, via Vercel AI Gateway) scores surprise and name recognition.
- Claude writes the one-liners: Sonnet, with Haiku for bulk drafts.
- One-liners may use only the dates and ages computed from the data, never outside facts.

**Links and domain**

- Bridge URLs are stable across data reloads, so shared links must never break.
- Always share the full domain, aliveatonce.app; the .com is taken.

**Planned, not yet built**

- Explorer.
- Connect two people (shortest chain of overlapping lifetimes).
- Curated collections (science to pop culture, same birthday, last living witness).
- Quiz mode ("who was alive first?").
- Submit a find, with upvotes.
- Remotion video generation and TikTok Content Posting API upload.

**Undecided**

- Monetization (deliberately none for now).

## Brand Commitments

- Name: **Alive At Once**. Domain: **aliveatonce.app**.
- **Voice: playful and excitable.** Lean into the wow: energetic, meme-literate, made for TikTok audiences. The excitement rides on true, specific facts, never on invented or exaggerated claims.
- **Kicker line:** "One lifetime. Find more at aliveatonce.app".

## Evidence on Hand

- **Facts.** Real lifetime data for about 50,000 people, plus generated bridges with surprise scores.
- **Seed examples** (from the plan):
  - Picasso / Darwin / Eminem
  - Einstein / Marx / Steve Jobs
  - Queen Victoria / Napoleon / Hitler
  - Darwin / Haydn / FDR and Joyce
  - Twain / Madison / John Wayne
  - Orville Wright / Babbage / Bowie, King, Schwarzenegger
  - Galileo's death and Newton's birth (1642)
  - Lincoln and Darwin sharing a birthday
- **Portraits** are from Wikimedia Commons under their own licences. Data is from Wikidata (CC0).
- **None yet:** no users, testimonials, press, follower counts, or traffic numbers. Don't fabricate any.

## Product Principles

1. **The fact is the hero.** Every surface exists to deliver one surprising, true overlap fast, then make it easy to share or follow.
2. **Never wrong.** Accuracy is what makes the wow worth sharing. Make no claim the dates don't support, and show uncertainty rather than hiding it.
3. **Phone first, desktop rewarded.** A social arrival gets the moment in one screen. A search arrival can keep pulling the thread.
4. **Every page is shareable.** Every bridge and person has a stable link and a card that carries the domain.
5. **Fun, not commercial.** Growth comes from delight and sharing, not ads, gates, or dark patterns.

# Alive At Once — Homepage Spec

Oct 22, 2026 · @Uri

## Goal and context

Rebuild the homepage as a full-screen, one-bridge-at-a-time card built to stop a scroll: faces first, a very short headline, next/prev, share. Everything else moves into menus.

The reference bridge is **Darwin → Picasso → Eminem**: Picasso (1881–1973) was born 6 months before Darwin died (1882) and was alive when Eminem was born (Oct 1972). Every bridge has this shape: two far-apart **endpoint** people and one **bridge** person whose life touches both.

Problems with the current homepage (localhost:3210) this spec fixes:

- No photos — all text, nothing to catch the eye.
- Template sentence "X was alive at the same time as Y… and Z" makes the reader work out the twist.
- "More bridges" is a wall of identical sentences.
- Bridges are not surprising (Plato–Socrates, Michelangelo–Leonardo): surprise filtering is missing or broken.
- No one-liners from Claude, though the MVP plan called for them.

## Screen layout

The homepage is a single full-viewport card (100dvh) showing one bridge. Nothing else scrolls below it.

Top to bottom, mobile first:

1. **Top bar** (thin, translucent): logo "Alive At Once" left, menu icon right.
2. **Faces visual** (\~55% of viewport height) — the hero; see Faces visual.
3. **Headline** — one line, max two on a 375px screen; see Headline rules.
4. **One-liner** — Claude's punchy line in small muted text, max \~90 characters. Optional per bridge.
5. **Action row** — prev · "how?" · share · next.

Desktop: same card, centred, max width \~720px, faces larger; prev/next also appear as large arrows at the screen edges.

Rules:

- No paragraphs, lists or secondary content on the card.
- Dark background (keep current palette); portraits are the only strong colour.
- Must look complete with no interaction — a screenshot of the card is a share-worthy image.
- Same composition as the 9:16 video frame and the share image, so all three can share one rendering component.

## Faces visual

The most important component. Three circular portraits in a row — endpoint A, bridge, endpoint B — where the bridge circle **physically overlaps** both neighbours, like a Venn diagram of faces. The word "overlap" lands before any text is read.

**Composition**

- Order left to right by birth year: older endpoint, bridge, younger endpoint.
- Bridge portrait is \~20% larger and on top (higher z-index); its circle overlaps each endpoint by \~18% of the endpoint's diameter.
- Thin ring around each circle; bridge ring uses the accent colour.
- Name under each portrait in small caps; life years under the name in muted text.

**Lifeline animation** (on load and on every next/prev)

- A thin horizontal line runs through all three circles at eye level.
- It draws left to right in \~1.2s: endpoint A's segment, then the bridge's segment starting just before A's ends, then B's segment starting just before the bridge's ends.
- The two overlap points pulse once with a small year label ("1882", "1972").
- Respect `prefers-reduced-motion`: show the final state, no animation.

**Era photo treatment**

- Apply a CSS filter per portrait based on birth year: pre-1850 sepia, 1850–1950 black-and-white, after 1950 full colour. Mixed eras across the row make the time gap felt without dates.
- Always crop to the face (use a stored face-centre point per photo, fallback centre-top).

**Missing photo fallback**: initials on a tinted circle using the same era tint. A bridge whose bridge person has no photo is never shown on the homepage.

## Headline rules

The headline is the shortest possible line that states the bridge, grammatically correct, with a slight street edge.

- Default template: **"{Bridge} caught {A} *and* {B}."** — e.g. "Picasso caught Darwin *and* Eminem." "And" is italic.
- Use the short, commonly known name ("Picasso", "Darwin", "Eminem"), stored per person as `shortName`; fall back to full name.
- Max \~40 characters; never more than two lines at 375px.
- Claude may write a better headline per bridge (stored as `headline`), within the same length limit, factually accurate and grammatical. Template is the fallback.
- Accuracy: never claim an "era" or that someone "lived in" another's time when the overlap is months (Eminem was 6 months old when Picasso died). "Caught" / "was alive with" only.
- No heavy slang on the site ("no cap", "fr") — that belongs in TikTok captions.

Alternates for A/B testing later: "{A} → {Bridge} → {B}." and "One life. {A} to {B}."

## Navigation

Next/prev moves through a ranked feed of bridges, one card at a time, TikTok-style.

- **Mobile**: vertical swipe — up = next, down = prev — with snap and a quick slide transition. Prev/next buttons stay in the action row for discoverability.
- **Desktop**: arrow buttons at screen edges + keyboard ←/→ and ↑/↓ + mouse wheel (debounced, one card per gesture).
- **Feed order**: today's featured bridge first, then the rest by surprise score with light shuffling so return visits feel fresh.
- **URLs**: every bridge has its own URL `/b/{slug}` (e.g. `/b/darwin-picasso-eminem`). Navigating updates the URL with `history.pushState`; back button works. `/` shows today's bridge.
- Preload the next 2 bridges' portraits so swipes never show an empty circle.
- First visit only: a small "swipe for more" hint that fades after the first swipe.

## Sharing

Share targets are TikTok, WhatsApp and Instagram. Only WhatsApp has a web share link; TikTok and Instagram can't be posted to from a website, so they go through the phone's share sheet with a file attached.

| Target | Mobile | Desktop |
| --- | --- | --- |
| WhatsApp | `https://wa.me/?text=` headline + bridge URL | Same link (opens WhatsApp Web) |
| TikTok | Web Share API with the 9:16 image (or short clip when available) attached | "Download card" button |
| Instagram | Web Share API with the 9:16 image attached | "Download card" button |
| Copy link | Clipboard + toast | Same |

- The share button opens a small sheet with these four options. If `navigator.canShare({files})` is false, TikTok/Instagram fall back to downloading the image.
- **Share images** (generated with `@vercel/og` / `ImageResponse`, cached):
  - 9:16 (1080×1920) for TikTok/IG stories — same composition as the card, plus "aliveatonce.app" watermark.
  - 1200×630 Open Graph image per `/b/{slug}` so WhatsApp and X link previews show the faces.
- Track share clicks per target and per bridge (Vercel Analytics custom events).

## The "how?" flip

A small "how?" button flips the card (3D flip, \~400ms) to show the proof for skeptics; tapping again flips back.

Back of the card:

- The existing three-bar life timeline (reuse the current component), compact.
- Two plain facts at the overlap points, e.g. "Picasso was 6 months old when Darwin died." / "Eminem was 6 months old when Picasso died." Computed from dates, months when under 2 years.
- Links to each person's page ("Explore Picasso").
- Source note: dates from Wikidata, linked.

The back face is not part of the share image.

## Menus

Everything beyond the card lives behind the menu icon, for people who want the serious version. The menu opens as a full-screen sheet on mobile, a dropdown on desktop.

- **Find a person** — search box → person page (life timeline + their most surprising overlaps as small face cards).
- **Connect two people** — pick two names, see the shortest chain of overlapping lives (can ship after this spec).
- **Collections** — themed lists (science to pop culture, same birthday, last living witness), shown as grids of face cards, never text lists.
- **Quiz** — later.
- **About** — what this is, data sources (Wikidata, Wikimedia Commons), photo credits page.

Remove the current "More bridges" text list and the "Find a person" block from the homepage.

## Content quality

The card only works if every bridge is genuinely surprising, so the feed must be filtered hard.

**Surprise filtering** (before Jev scoring, then Jev ranks what's left)

- Endpoints' midpoints at least \~100 years apart; reject pairs from the same era.
- Endpoints from different fields (science vs music, politics vs pop culture) score higher; same-field pairs are dropped from the homepage feed.
- Both endpoints must be widely known: top tier by Wikipedia pageviews (e.g. top 5,000). The bridge person may be less famous but must have a photo.
- No teacher–student or same-circle pairs (Plato–Socrates, Michelangelo–Leonardo).
- Jev (TypeSafe AI, via Vercel AI Gateway) gives each candidate a 1–10 surprise score; homepage feed = score ≥ 8.
- Benchmark: Darwin–Picasso–Eminem, Marx–Einstein–Steve Jobs, Lincoln–Ford–Trump should pass; Plato–Socrates–Alexander and Newton–Franklin–Beethoven should not.

**One-liners and headlines**

- Claude (Haiku for bulk drafts, Sonnet for featured daily bridges) writes `headline` and `oneLiner` for every bridge that passes, following Headline rules.
- Store them in the DB; never generate at request time.

**Photos**

- Source from Wikimedia Commons via the Wikidata image property (P18); store license, author and source URL per photo.
- Show credits on the About/credits page and in the "how?" back face.
- Modern celebrities often have few free photos: if none is usable, the person can't be a homepage endpoint or bridge.
- Precompute a face-centre crop point per photo (simple face detection at import).

## Acceptance criteria

- [ ] `/` shows one full-screen card: three overlapping circular portraits, headline, optional one-liner, action row — and nothing else.
- [ ] Darwin–Picasso–Eminem renders as "Picasso caught Darwin *and* Eminem." with era photo treatment and the lifeline animation.
- [ ] Headline fits in two lines at 375px for every bridge in the feed.
- [ ] Swipe up/down on mobile and arrows/keys on desktop move through the feed; each bridge has a working `/b/{slug}` URL and back button works.
- [ ] Share sheet: WhatsApp link works; TikTok/Instagram attach the 9:16 image via the native share sheet on iOS and Android; desktop downloads it.
- [ ] `/b/{slug}` has a 1200×630 OG image showing the faces.
- [ ] "how?" flips to the timeline with correct overlap facts.
- [ ] Menu holds Find a person, Collections, About; the old "More bridges" text list is gone.
- [ ] Homepage feed contains none of the reject benchmarks (Plato–Socrates–Alexander, Newton–Franklin–Beethoven).
- [ ] `prefers-reduced-motion` disables animations; Lighthouse mobile performance ≥ 90.

**Out of scope for this spec**: Connect two people, Quiz, user submissions, video generation and TikTok auto-posting (separate spec).

---
name: Alive At Once
description: Surprising lifetime overlaps between famous people, one full-screen bridge at a time.
colors:
  midnight-ink: "#15172b"
  midnight-raised: "#1d2038"
  moonlit-text: "#e9eaf3"
  dusk-muted: "#9ea1b8"
  night-rule: "#34385a"
  portrait-ring: "#4b4f72"
  year-chip-scrim: "rgba(21, 23, 43, 0.82)"
  lamplit-paper: "#eceee9"
  lamplit-raised: "#e2e5de"
  indigo-ink: "#1c1e3a"
  slate-muted: "#5d6072"
  paper-rule: "#c9ccc4"
  daguerreotype-gold: "#c2ae63"
  daguerreotype-gold-deep: "#8a7a3c"
  ultramarine-thread: "#7d89ff"
  ultramarine-thread-deep: "#2f3fd0"
  neon-magenta: "#ff6b9d"
  neon-magenta-deep: "#d6336f"
  sepia-tint: "#6b5a3a"
  mono-tint: "#4a4d5c"
  colour-tint: "#3a4fb0"
typography:
  card-headline:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "calc(80 * var(--u))"
    fontWeight: 400
    lineHeight: 1.08
  card-one-liner:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "calc(40 * var(--u))"
    fontWeight: 400
    lineHeight: 1.35
  card-name:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "calc(30 * var(--u))"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  card-year-chip:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "calc(27 * var(--u))"
    fontWeight: 700
    letterSpacing: "0.03em"
  display:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "Gloock, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.33
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  focus: "2px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  control-gap: "12px"
  section: "40px"
  header: "56px"
  control: "44px"
components:
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.moonlit-text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-round:
    backgroundColor: "transparent"
    textColor: "{colors.moonlit-text}"
    rounded: "{rounded.full}"
    size: "44px"
  button-edge-arrow:
    backgroundColor: "transparent"
    textColor: "{colors.dusk-muted}"
    rounded: "{rounded.full}"
    size: "64px"
  button-edge-arrow-hover:
    backgroundColor: "{colors.midnight-raised}"
    textColor: "{colors.moonlit-text}"
  input-search:
    backgroundColor: "{colors.midnight-raised}"
    textColor: "{colors.moonlit-text}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  sheet-row:
    backgroundColor: "transparent"
    textColor: "{colors.moonlit-text}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  sheet-row-hover:
    backgroundColor: "{colors.midnight-raised}"
  sheet:
    backgroundColor: "{colors.midnight-ink}"
    textColor: "{colors.moonlit-text}"
    rounded: "{rounded.lg}"
    padding: "12px"
  face-card:
    backgroundColor: "{colors.midnight-ink}"
    textColor: "{colors.moonlit-text}"
    rounded: "{rounded.lg}"
    padding: "16px"
  toast:
    backgroundColor: "{colors.moonlit-text}"
    textColor: "{colors.midnight-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  year-chip:
    backgroundColor: "{colors.year-chip-scrim}"
    textColor: "{colors.moonlit-text}"
    typography: "{typography.card-year-chip}"
    rounded: "{rounded.full}"
    padding: "calc(3 * var(--u)) calc(12 * var(--u))"
  nav-link:
    textColor: "{colors.dusk-muted}"
    typography: "{typography.label}"
---

# Design System: Alive At Once

## Overview

**Creative North Star: "The Night Archive"**

Each bridge is a single cinematic frame: a midnight-ink screen, three portraits lit out of the dark, a lifeline drawn across the top, and one big serif headline. It's bold through scale, contrast and cutting, not through chrome. The card fills the viewport, and moving to the next card is a cut: the old frame slides 28% away and fades, and the new one comes in from the side the swipe came from. The photographs feel archival: earlier faces arrive sepia or black-and-white, modern ones in full colour, so the jump across centuries is visible before anyone reads a date.

The frame works like a film: dark ground, hard-lit subjects, minimal UI. The palette stays cold and quiet so the portraits, the three meaning colours and the italic ultramarine emphasis carry all the punch. Controls are quiet outlined pills sitting below the frame. Inner pages (person, about, collections) follow the same type and colour vocabulary at reading density, with a light Lamplit Paper scheme that switches to midnight under `prefers-color-scheme: dark`.

Every card is also a still. The live card, the 9:16 story image and the Open Graph image come from the same component and the same unit grid, so a screenshot is always a finished, shareable image.

**Key Characteristics:**
- Always-dark bridge card; portraits are the only strong colour on it.
- Three meaning colours: gold for the earlier figure, ultramarine for the bridge life, magenta for the later figure.
- Era-filtered portraits (sepia before 1850, mono 1850–1949, colour from 1950).
- A Gloock display serif for headlines and Hanken Grotesk for everything else, with tabular lining numerals.
- One unit grid (1000u per card width) shared by the live card and the share images.
- Flat, tonally layered surfaces; shadows only on things that float.
- Motion choreographed around the lifeline: draw, then pulse the overlap years.

## Colors

A cold midnight-and-moonlight neutral base with three warm-to-electric meaning colours that each stand for one of the three lives.

### Primary
- **Ultramarine Thread** (`ultramarine-thread`; `ultramarine-thread-deep` on light paper): the bridge life. Its lifeline segment, the bridge portrait's ring, the overlap-year dots, the italic emphasis in the headline, the focus ring and the search field's focus border. It's the colour of the connecting thread, so it is also the system's interactive accent.

### Secondary
- **Daguerreotype Gold** (`daguerreotype-gold`; `daguerreotype-gold-deep` on light): the earlier figure. Their lifeline segment, their bar on timelines, the left rule on the "died in" proof line.
- **Neon Magenta** (`neon-magenta`; `neon-magenta-deep` on light): the later figure. Their lifeline segment, timeline bar and the "born in" proof line.

### Neutral
- **Midnight Ink** (`midnight-ink`): the ground of the bridge card, share images, sheets and dark-scheme pages. Also the browser `theme-color`.
- **Midnight Raised** (`midnight-raised`): the one step up for dark mode: hover fills, the search field, the active result row.
- **Moonlit Text** (`moonlit-text`): primary text on midnight, and the fill of toasts and hint bubbles (which invert).
- **Dusk Muted** (`dusk-muted`): life years, one-liners, secondary labels, nav links at rest.
- **Night Rule** (`night-rule`): hairline borders on pills, sheets and the header (40% opacity under the header blur).
- **Portrait Ring** (`portrait-ring`): the ring around the two endpoint portraits.
- **Year Chip Scrim** (`year-chip-scrim`): Midnight Ink at 82%, behind the overlap years so they read over the lifeline.
- **Lamplit Paper / Lamplit Raised / Indigo Ink / Slate Muted / Paper Rule**: the light-scheme counterparts of the five above, used by inner pages when the system is in light mode.
- **Era tints** (`sepia-tint`, `mono-tint`, `colour-tint`): backgrounds behind the initials when a person has no portrait, in that person's era family.

Brand colours used for logos only: WhatsApp green (#25d366) and Instagram pink (#e1306c), on the share-sheet icons.

### Named Rules
**The Three Lives Rule.** Gold always means the earlier figure, ultramarine the bridge, magenta the later figure, on every surface (lifeline, timelines, proof lines). Never swap them, and never use them as decoration with no meaning.

**The Portraits Are the Colour Rule.** On the bridge card, the only large saturated areas are the portraits. Chrome stays in ink, muted and rule. The meaning colours appear only as thin lines, rings and the headline emphasis.

**The Always-Night Card Rule.** The bridge card, face cards and every share image use the `.theme-dark` values whatever the system scheme is. Only the inner pages follow `prefers-color-scheme`.

## Typography

**Display Font:** Gloock (with ui-serif, Georgia)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui)

**Character:** Gloock is a high-contrast serif with a poster feel. It does the shouting in one weight (400), with italic for the punchline. Hanken Grotesk is clean and neutral and handles the facts: names, years, labels, prose. Its numerals are always tabular and lining, so years line up.

### Hierarchy
- **Card headline** (Gloock 400, 80u scaled to 0.86 above 40 characters and 0.74 above 56, line-height 1.08, balanced wrap, centred): the one sentence on a bridge card. Its `*emphasis*` is set in italic Ultramarine Thread.
- **Card one-liner** (Hanken 400, 40u, line-height 1.35, Dusk Muted, max 880u): the supporting line under the headline.
- **Card name** (Hanken 600, 30u, or 26u above 22 characters, uppercase, 0.06em tracking): the full name under each portrait, with life years at 30u Dusk Muted beneath.
- **Card year chip** (Hanken 700, 27u, 0.03em): the overlap years on the lifeline.
- **Display** (Gloock 400, 3rem rising to 3.75rem from 640px, line-height 1): a person's name on their page; other page titles use 3rem.
- **Headline** (Gloock 400, 1.875rem): section titles such as "Who was alive at the same time as …".
- **Title** (Gloock 400, 1.5rem): sub-sections, sheet titles, menu items, face-card headlines (1.25rem).
- **Body** (Hanken 400, 1rem, line-height 1.625, max 65ch on prose pages): reading text.
- **Label** (Hanken 500, 0.875rem): buttons, nav, list names, toasts.
- **Caption** (Hanken 400, 0.75rem, Dusk/Slate Muted): axis ticks, proof-line dates, source and licence notes.

### Named Rules
**The Serif Shouts, the Sans Proves Rule.** Gloock is only for headlines and titles. Every name, date, number and credit is in Hanken Grotesk.

**The One Italic Rule.** A headline has at most one emphasised phrase, and it is always Gloock italic in Ultramarine Thread. No bold, underline or second colour inside headlines.

## Layout

The bridge card is laid out in **card units**: `--u` is one thousandth of the card width (`--cw`). On the homepage `--cw = min(100vw − 32px, 720px, (100dvh − 170px) × 0.92)`, so the card fits both a phone's width and a laptop's height. When the card is width-bound (portrait phones), `--ut` lets the headline and one-liner grow up to 1.3× `--u` (never past the height-bound size), and names, life years and year chips get a 12px floor; the whole stack is centred vertically so the words sit with the faces. Satori share images get the same geometry in pixels, without either. Faces-row geometry is fixed: the endpoint portraits have diameter *d* = 1000 / 2.84 u, the bridge portrait is 1.2*d*, each overlaps its neighbour by 0.18*d*, and the lifeline runs in a 100u band above the faces at y = 72u.

The homepage is a fixed full-viewport stage: a 56px blurred header, the card centred in the remaining height, and a control row (12px gaps) at the bottom inside the safe area. From 640px, 64px arrow buttons sit at the left and right edges.

Inner pages use a single 1024px column (`max-w-5xl`) with a 16px gutter (24px from 640px). Sections are separated by 40px padding and a hairline rule. Prose pages cap at 65ch. Face-card grids go from one to two columns at 640px and three at 1024px, with 16px gaps.

### Named Rules
**The One Grid Rule.** Anything drawn on the card is positioned in `u()` units through `CardArt`, never in px or rem. That is what keeps the live card, the story image and the OG image identical.

## Elevation & Depth

Flat by default, with tonal layering: Midnight Ink → Midnight Raised (or Lamplit Paper → Lamplit Raised) is the only step for hover and inset fields. Shadows appear only on elements that float over the page: the share sheet and menu (`shadow-2xl`), the search dropdown, toasts and the swipe hint (`shadow-lg`). Two small depth effects belong to the card itself: a 10u Midnight Ink gap ring around the bridge portrait so the overlap reads cleanly, and an 8u black glow under the lifeline segments that lifts them off the faces.

### Shadow Vocabulary
- **Overlay** (`0 25px 50px -12px rgb(0 0 0 / 0.25)`): sheets and the desktop menu.
- **Float** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): toasts, the hint bubble and the search results.
- **Gap ring** (`0 0 0 calc(10 * var(--u)) #15172b`): the bridge portrait only.
- **Lifeline lift** (`0 0 calc(8 * var(--u)) rgba(0,0,0,0.6)`): lifeline segments only.

### Named Rules
**The Only Floaters Cast Shadows Rule.** If an element doesn't sit over other content, it gets no shadow. Cards, the header and buttons stay flat.

## Shapes

Round forms throughout. Portraits are perfect circles with a 5u ring, cropped to the face. Every control is a full pill or a circle. Containers use generous 24px corners (face cards, sheets, the desktop menu), and rows inside them use 16px. The only near-square forms are the 8px-rounded person photo on a person page and the 2px corner on a bare text link's focus outline; on every other control the outline follows the control's own shape. Lifeline segments and timeline bars are rounded capsules. A living person's bar fades out over its last 20% instead of ending.

## Components

### Buttons
Quiet pills that step back from the card. The card is the show; the controls just work it.
- **Shape:** full pill or circle (9999px), 44px tall, so every control is a full touch target.
- **Pill** ("how?", "Share"): transparent with a Night Rule hairline, Label type, 20px side padding, optional 20px icon.
- **Round** (previous/next): a 44px circle in the same style, showing up/down chevrons on phones and left/right from 640px.
- **Hover:** the hairline firms up to the ink colour. **Disabled:** 30% opacity, border stays at rule.
- **Edge arrows** (desktop only): 64px borderless circles in Dusk Muted that fill with Midnight Raised and brighten to Moonlit Text on hover.
- **Focus:** the global 2px Ultramarine outline, offset 3px, following the control's round shape. Sheets and the menu move focus inside on open, keep Tab inside, and return it to the opener on close.

### Cards / Containers
- **Bridge card (signature):** see below.
- **Face card:** a Midnight Ink tile with 24px corners and 16px padding, laid out as a container query (`--u = 100cqw / 1000`). It shows the faces row without names or lifeline, then a 1.25rem Gloock headline that underlines on hover.
- **Pair card:** two overlapping portraits (the first ringed in Ultramarine) with "A *and* B" in Gloock and a muted caption.

### Inputs / Fields
- **Search:** a full pill on Midnight Raised (or Lamplit Raised) with a rule hairline and 12px × 20px padding. On focus the border turns Ultramarine and there's no outline. Results drop into a 16px-rounded floating list, and the active row takes the raised tone.

### Navigation
- **Feed header:** 56px, Midnight Ink at 70% with a medium backdrop blur and a 40% Night Rule bottom hairline. The Gloock wordmark is on the left, the menu icon on the right.
- **Site header:** a 1.25rem Gloock wordmark, then Label-size links in muted that turn ink on hover.
- **Menu:** full-screen sheet on phones; on desktop a 384px dropdown with 24px corners, top right. Items are 1.5rem Gloock titles over muted Label descriptions, in 16px-rounded hover rows.

### Sheets, Toasts and Hints
- **Share sheet:** slides up from the bottom on phones (rounded top, safe-area padding) and is centred on desktop, over a 55% black scrim with a 2px blur. Rows are 16px-rounded with an icon, a medium title and a muted hint.
- **Toast / hint:** an inverted Moonlit Text pill on Midnight Ink text near the top, fading up in 300ms and gone after 2.2s.

### Bridge Card (signature)
Three overlapping circular portraits (earlier, bridge, later) under a three-segment lifeline in gold, ultramarine and magenta. Each segment overlaps the next. Above each overlap, a year chip sits on a pulsing dot with a Moonlit Text centre and an Ultramarine ring. Below that come the uppercase names and life years, then the headline and the one-liner. The bridge portrait is 20% larger, sits on top with a gap ring, and has an Ultramarine ring; the endpoints have Portrait Ring rings. The card flips (400ms rotateY) to a proof side: a timeline with dashed year markers, gold and magenta proof lines, and source and licence links.

**Motion:** the segments draw left to right (460ms each, staggered 370ms), each year chip rises in 260ms, and its dot pulses once (650ms, a scale-1.6 ring). With reduced motion, everything appears in place.

### Timeline
Capsule bars on a shared year axis with a hairline baseline and caption-size ticks. Bars are coloured by tone (past, bridge, future, or 45% muted for everyone else). On a person page the subject's lifespan is a faint 8% Ultramarine band with 30% edges. On the proof side, bars grow in over 900ms, staggered 180ms.

## Do's and Don'ts

### Do:
- **Do** keep the bridge card and every share image on Midnight Ink (`.theme-dark`), whatever the system scheme.
- **Do** colour the three lives as gold → ultramarine → magenta, in that order, every time.
- **Do** apply the era filter to portraits: sepia before 1850, mono 1850–1949, colour from 1950.
- **Do** lay out anything on the card in `u()` units through `CardArt`, so the live card and the images match.
- **Do** keep controls at 44px or larger, as quiet outlined pills or circles.
- **Do** set years and numbers in Hanken Grotesk with tabular lining figures.
- **Do** honour `prefers-reduced-motion` by removing every animation and the flip transition.

### Don't:
- **Don't** add large saturated fills, gradients or coloured panels to the card. Strong colour on it comes from the portraits.
- **Don't** use gold, ultramarine or magenta for anything that isn't one of the three lives (ultramarine also covers focus and the active accent).
- **Don't** set names, dates or credits in Gloock, or more than one italic phrase in a headline.
- **Don't** put shadows on cards, the header or buttons. Shadows are only for overlays.
- **Don't** introduce square corners on controls or containers. The form language is round.

---
name: FEVA Vote
description: Secret, one-person-one-vote elections for Ghanaian schools, churches and groups.
colors:
  ballot-green: "#0b6b4b"
  ballot-green-deep: "#085a3f"
  ballot-green-wash: "#e2f0e8"
  indelible-violet: "#5b3e9e"
  indelible-violet-wash: "#efe9fa"
  paper: "#f3f5f1"
  card: "#ffffff"
  sunk: "#eaeee8"
  ink: "#13201a"
  ink-muted: "#46564e"
  ink-faint: "#62726a"
  rule: "#d9dfd9"
  rule-strong: "#b4bfb7"
  caution: "#8a5300"
  caution-wash: "#fbf0dc"
  danger: "#b42318"
  danger-wash: "#fcebe9"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.06em"
  figure:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  md: "6px"
  lg: "10px"
  full: "9999px"
spacing:
  gutter: "16px"
  stack: "24px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ballot-green}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.ballot-green-deep}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 12px"
  candidate-row-selected:
    backgroundColor: "{colors.ballot-green-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
  receipt-panel:
    backgroundColor: "{colors.indelible-violet-wash}"
    textColor: "{colors.indelible-violet}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: FEVA Vote

## Overview

**Creative North Star: "The Ballot Paper"**

FEVA Vote borrows its world from a Ghanaian polling station: pale ballot paper, a printed candidate row with a photo, a square box where the voter presses their thumb, and the violet indelible ink that marks a finger once someone has voted. The interface is quiet and official, closer to a well-set government form than a startup dashboard, because the result has to look trustworthy to people who lost.

Density is low on voter screens (one decision per screen, large rows, one primary action pinned to the thumb zone) and moderate on organizer screens (lists, tabs, tables). Warmth comes from plain language and real names, not from decoration.

**Key Characteristics:**
- One green accent for every action and every "chosen" state; violet appears only after a vote is cast.
- A single hyper-legible type family, with a mono companion for codes, receipts and vote counts.
- Flat paper surfaces separated by hairline rules; shadows only on floating things.
- Left-aligned, form-like composition; nothing centered for effect.

## Colors

Muted, paper-and-ink neutrals with a green bias, one decisive green, and one ink violet held in reserve.

### Primary
- **Ballot Green** (#0b6b4b): every primary button, the selected candidate row, the thumbprint box when filled, progress bars, links. Deepens to **Ballot Green Deep** (#085a3f) on hover; its **Wash** (#e2f0e8) fills selected rows and success notices.

### Secondary
- **Indelible Violet** (#5b3e9e): only the VOTED stamp and the receipt panel (on **Violet Wash**, #efe9fa). It means "your vote is in" and nothing else.

### Neutral
- **Ballot Paper** (#f3f5f1): page background.
- **Card White** (#ffffff): cards, inputs, table bodies.
- **Sunk Paper** (#eaeee8): table headers, empty bars, quiet chips.
- **Ink** (#13201a): body text and headings; also the closed-election pill.
- **Muted Ink** (#46564e) and **Faint Ink** (#62726a): secondary text and hints.
- **Rule** (#d9dfd9) and **Strong Rule** (#b4bfb7): hairlines, input borders, dashed empty thumb boxes.

### Semantic
- **Caution Amber** (#8a5300 on #fbf0dc) for scheduled, ties and "can't undo" warnings; **Danger Red** (#b42318 on #fcebe9) for closing voting, deleting data and "No" votes.

Dark mode swaps every role through CSS variables (paper #0e1412, green #3fb885, violet #b39cf0); components never hard-code a theme.

### Named Rules
**The One Green Rule.** Green means "act" or "chosen". Never use it for decoration or for a neutral state.
**The Ink Is Earned Rule.** Violet appears only after a ballot is saved. A screen before submission never shows it.

## Typography

**Body Font:** Atkinson Hyperlegible Next (fallback ui-sans-serif, system-ui)
**Figure Font:** Atkinson Hyperlegible Mono (fallback ui-monospace)

**Character:** Designed by the Braille Institute for low-vision readers, with deliberately distinct letterforms (slashed zero, open counters). It reads as careful and public-service, and it keeps codes like K7QM2-XP9RT unambiguous.

### Hierarchy
- **Display** (800, 2.5rem on phones, 3.25rem from 640px, 1.05): landing page headline only.
- **Headline** (700, 1.75rem, 1.2): page titles, the position name on each ballot page.
- **Title** (700, 1.125rem, 1.45): section and card titles, candidate names.
- **Body** (400, 1rem, 1.6): all running text; keep lines under 65ch.
- **Label** (700, 0.8125rem, 0.06em, uppercase): organization name above voting pages, slip headers.
- **Figure** (mono 700, tabular): turnout, vote counts, receipt and voting codes.

### Named Rules
**The Tabular Count Rule.** Any number that changes live or lines up in a column uses the mono face with tabular figures.

## Layout

A 16px side gutter at every width. Voter pages are one column capped at 36rem, with the ballot's Back/Next bar fixed to the bottom and padded for the safe area. Organizer pages cap at 72rem: a top bar with tabs, lists as divided rows (not card grids), and a two-column split (main + 20–22rem side panel) on large screens that stacks on phones. The election wizard uses a 14rem step rail beside a 42rem form column; on phones the rail becomes "Step 2 of 6" with a progress bar. Vertical rhythm uses 24px between groups and 64px between landing sections.

## Elevation & Depth

Flat by default: surfaces are separated by hairline rules and tonal shifts (paper, card, sunk). Shadows appear only on things that float: dialogs (a large soft shadow over a 50% black backdrop), the landing ballot preview, and the fixed ballot navigation bar (translucent card with backdrop blur).

### Motion
Strong ease-out (cubic-bezier(0.23, 1, 0.32, 1)) for everything that enters or responds. Buttons and ballot rows press to 97–98% in 150ms. Each new step or ballot position rises 6px and fades in over 220ms. Bars slide in from the left with transform, never by animating width. The one authored moment is the VOTED stamp. Reduced motion removes movement.

### Named Rules
**The Flat Paper Rule.** If it doesn't float above the page, it has no shadow.

## Shapes

Gently squared corners: 6px on controls and small photos, 10px on cards, panels and candidate rows, full pills only for status chips. The dashed square (the empty thumbprint box, empty photo slot, cut-out code slips) is the one recurring signature shape.

## Components

### Buttons
- **Shape:** gently squared (6px), heights 32/40/48px.
- **Primary:** Ballot Green with white text, semibold.
- **Secondary:** Card White with a Strong Rule border; hover to Sunk Paper.
- **Ghost:** text only in Muted Ink; hover to Sunk Paper.
- **Danger:** Danger Red, used only for irreversible actions, always behind a confirm dialog.

### Candidate row (signature)
A full-width row: 64px photo or initials tile, name in Title weight, a short note in Muted Ink, and the 48px thumbprint box at the right. Selecting it turns the border and box Ballot Green and fills the row with Green Wash. Unopposed positions use two large Yes/No rows instead; "No" fills red.

### Receipt panel and VOTED stamp (signature)
After submission: a double-bordered VOTED stamp in Indelible Violet, rotated −8°, stamped in once; below it the receipt code in large violet mono on Violet Wash.

### Inputs / Fields
Card White, Strong Rule border, 6px corners, 44px tall (56px on the voter sign-in). Focus turns the border green with a soft green ring; errors turn the border red and show a sentence below.

### Navigation
Organizer top bar: logo, organization name, sign out; underneath, text tabs with a 2px green underline for the active tab. Election sections use the same tab style.

### Notices
Tinted boxes (Sunk, Green Wash, Caution Wash, Danger Wash) with a leading icon; no side stripes.

## Do's and Don'ts

### Do:
- **Do** keep one primary action per screen, in Ballot Green.
- **Do** set every code, receipt and count in the mono face with tabular figures.
- **Do** write labels as plain questions a voter would ask ("Who can vote?", "When can voters see results?").
- **Do** use hairline rules and tonal steps before reaching for a shadow.

### Don't:
- **Don't** use violet anywhere a vote hasn't been cast yet.
- **Don't** use emoji, gradients, glassmorphism or decorative illustrations.
- **Don't** center page content for effect; this is a form, not a poster.
- **Don't** add a colored side stripe to cards or notices.

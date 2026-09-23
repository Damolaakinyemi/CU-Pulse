---
name: CU Pulse
description: Financial health, forecasts and peer benchmarks for every federally insured credit union, read as a staff-forecast exhibit.
colors:
  ground: "#f4f5f7"
  sheet: "#ffffff"
  ink: "#0e1a2b"
  ink-2: "#384456"
  ink-3: "#5d6878"
  rule: "#d6dbe2"
  rule-soft: "#e7eaee"
  rule-strong: "#0e1a2b"
  fan: "#2833c8"
  fan-50: "rgba(40, 51, 200, 0.46)"
  fan-80: "rgba(40, 51, 200, 0.24)"
  fan-95: "rgba(40, 51, 200, 0.11)"
  fan-ink: "#1f28a3"
  fan-wash: "#eceefc"
  fan-on-dark: "#8f97ff"
  peer: "#7b8594"
  peer-band: "rgba(123, 133, 148, 0.2)"
  breach: "#b3261e"
  breach-wash: "#fbeceb"
  bar: "#0e1a2b"
  bar-ink: "#eef1f6"
  bar-ink-2: "#a9b3c3"
  bar-rule: "#26344a"
typography:
  display:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "32px"
    fontWeight: 720
    lineHeight: 1.08
    letterSpacing: "-0.028em"
    fontFeature: "tnum, lnum"
  figure:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "tnum, lnum"
  headline:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum, lnum"
  prose:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.62
  table:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tnum, lnum"
  label:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  source:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  stamp:
    fontFamily: "Public Sans Variable, Public Sans, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "2px"
spacing:
  gutter: "24px"
  pad: "32px"
  section: "40px"
  rhythm: "4px"
  max: "1440px"
  gutter-mobile: "16px"
  pad-mobile: "16px"
components:
  button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.fan-ink}"
    textColor: "{colors.sheet}"
  stamp-reported:
    textColor: "{colors.ink-2}"
    typography: "{typography.stamp}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "18px"
  stamp-projected:
    backgroundColor: "{colors.fan-wash}"
    textColor: "{colors.fan-ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.sm}"
    height: "18px"
  stamp-breach:
    backgroundColor: "{colors.breach-wash}"
    textColor: "{colors.breach}"
    typography: "{typography.stamp}"
    rounded: "{rounded.sm}"
    height: "18px"
  segmented-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    padding: "3px 9px"
  search-field:
    textColor: "{colors.bar-ink}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "34px"
  tab-active:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "10px 16px 11px"
  table-subject-row:
    backgroundColor: "{colors.fan-wash}"
  readout:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  top-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.bar-ink}"
    height: "52px"
---

# Design System: CU Pulse

## Overview

**Creative North Star: "The Staff Forecast Exhibit"**

CU Pulse reads every credit union the way a central-bank staff forecast or statistical release reads an economy. Reported history is drawn in blue-black ink; the projection is a graded ultramarine probability fan; peers are a graphite corridor; regulation is a set of ruled, hatched zones in brick red. The page is a stack of exhibits, each with a bold title, a hairline-ruled body, and a small source line naming account codes and quarters beneath it.

The density is that of an analyst's desk document: 14px base type, tabular lining figures everywhere, hairline rules instead of cards, square 2px corners, and almost no chrome. A single dark top bar carries the wordmark, the institution search, and the as-of filing; everything below sits on a cool release-white ground. Color is rationed: ink for fact, ultramarine for projection and interaction, graphite for peers, red for something wrong.

The system refuses the KPI-card SaaS dashboard (no tiles, no rounded panels, no drop-shadowed metric cards) and the neon trading terminal (no dark canvas, no glowing accents).

**Key Characteristics:**
- Hairline table rules structure every surface; strong ink rules sit under exhibit titles and table heads.
- One committed accent hue, ultramarine, meaning "projected" or "interactive".
- Reported, Projected, and Breach are stamped states in text and outline, never color alone.
- Public Sans with tabular lining numerals site-wide.
- A source line under every exhibit.
- Print-first one-page report sheet.

## Colors

Ink on cool release-white, one ultramarine fan, graphite peers, brick red held back for trouble.

### Primary
- **Staff Ultramarine** (fan): the projection. Forecast fan areas, the active-tab underline, focus outlines, range-slider fill, selection highlight. It marks what is modelled rather than filed.
- **Fan Densities** (fan-50, fan-80, fan-95): the 50, 80, and 95% prediction intervals, stacked darkest-inside. Always all three together on a forecast, and always named in a legend swatch.
- **Deep Ultramarine** (fan-ink): text-weight ultramarine. Links, projected figures in prose and tables, the dashed point-forecast line, the Projected stamp, primary-button hover.
- **Ultramarine Wash** (fan-wash): the pinned subject row in peer tables, the selected search option, the Projected stamp ground.
- **Night Periwinkle** (fan-on-dark): ultramarine lifted for use on the dark top bar and the severity panel: slider fill, pressed underline, focus ring, and the favicon's median band.

### Secondary
- **Peer Graphite** (peer, peer-band): the peer median line and the middle-50% corridor, in charts and in the percentile rule under each vital.

### Tertiary
- **Brick Breach** (breach, breach-wash): NCUA prompt-corrective-action thresholds and hatched zones, breached stress outcomes, the merger-flag dagger in peer tables, warning notes, and load-failure notices.

### Neutral
- **Release White** (ground): page ground.
- **Sheet White** (sheet): popovers, readouts, the printable report sheet, and button rest fill.
- **Blue-Black Ink** (ink): reported history lines, headings, figures, strong rules, primary buttons, the pressed segment.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary labels, then captions, axis ticks, and source lines.
- **Hairline / Soft Hairline** (rule, rule-soft): structural dividers and table row rules; soft for inside-exhibit rows and the source line.
- **Night Bar** (bar, bar-ink, bar-ink-2, bar-rule): the one dark surface, the sticky top bar and its text.

### Named Rules
**The One Fan Rule.** Ultramarine means projected or interactive. Reported values are never drawn in it, and no second accent hue exists.

**The Red Means Wrong Rule.** Brick red appears only when something is wrong: a regulatory threshold or breach, a flagged anomaly, a failure. Never as decoration, never simply for "negative".

**The Stamp, Not Swatch Rule.** Reported, Projected, and Breach are distinguished by a text stamp, line style (solid ink vs dashed ultramarine), or hatching as well as hue. Color is never the only signal.

## Typography

**Display Font:** Public Sans Variable (with Public Sans, system-ui, Segoe UI)
**Body Font:** Public Sans Variable, one family for everything
**Label/Mono Font:** ui-monospace stack only for inline code in Method prose

**Character:** A civic, government-release grotesque set with tabular lining figures (`font-variant-numeric: tabular-nums lining-nums` on the root), so every column of numbers aligns. Hierarchy comes from weight (450 to 700, with 650 as the house bold for figures) and small size steps rather than big display contrast.

### Hierarchy
Screen sizes come from one role scale on `:root` (`--fs-caption` 11, `--fs-label` 12, `--fs-ui` 13, `--fs-body` 14, `--fs-read` 15, `--fs-lead` 16, `--fs-sub` 18, `--fs-title` 20, `--fs-figure` 24, `--fs-vital` 28, `--fs-mast` 32). No half-pixel sizes; the print sheet keeps its own fixed sizes.

- **Poster display** (720, clamp to 68px, 1.02, -0.035em): the landing headline and the case-study title only (the case study clamps to 58px). Standfirsts under them are 18px ink-2.
- **Display** (720, 32px, 1.08, -0.028em): the institution name in the masthead; 24px on mobile and on the report sheet.
- **Figure** (650, 28px, 1.15, -0.02em): headline vital values and case-study facts; stress outcomes and landing specimen figures use 24px, small-multiple current values 20px.
- **Headline** (650, 18px): section heads in Method prose; notices use 20px.
- **Title** (700, 16px): exhibit titles, followed by a 450-weight ink-3 qualifier after a middle dot ("Net worth ratio · reported and projected four quarters"). Small multiples use 14px.
- **Body** (400, 14px, 1.45): base text. Analyst-reading clauses sit at 14px/1.5 with a 62ch measure; Method prose and plain-terms summaries at 15px.
- **Table** (400, 13px): data tables; column heads 12px/700 in ink-2.
- **Label** (600, 12px): vital labels, legend, controls, tabs (13px).
- **Source** (400, 12px, 1.5, ink-3): the source line under each exhibit; axis ticks 11px.
- **Stamp** (700, 10.5px, 0.04em, uppercase): state stamps only. Uppercase is reserved for this one role.

### Named Rules
**The Tabular Figures Rule.** Every number on every surface is tabular and lining; right-align numeric table columns.

**The Middle-Dot Qualifier Rule.** Titles carry their qualifier inline after " · " in lighter weight and ink-3, never as a separate line above or below.

## Layout

A 1440px max container with 32px side padding and a 12-column grid (24px gutter, 40px row gap, 32px top padding). Spacing sits on a 4px rhythm (`--s-1` to `--s-8`: 4, 8, 12, 16, 24, 32, 48, 64); only hairline-scale nudges inside controls fall between. The lead exhibit spans 8 columns with a 4-column reading beside it; secondary charts run three across at 4 columns; tables span 12. The vitals strip is a five-column ruled row, with vertical hairlines between cells and the first cell flush left.

Below 1100px, 4 to 8 column spans collapse to full width, span-3 becomes half, vitals go to three columns, and the stress layout stacks. Below 720px padding and gutter drop to 16px, the top bar wraps with search on its own row, vitals go to two columns, readings stack label over text, wide tables fade out at the right edge with a mask, the section tabs scroll sideways on one line with faded edges (44px touch height), masthead facts drop their separators, an odd final vital spans the row, and the Method table of contents hides.

The report is a letter-size sheet (8.5in max, 0.5in by 0.55in padding) that prints at 10px base with all app chrome removed.

**The Flush-Left Rule.** The first cell of any ruled row (vitals, outcomes, tabs, table first column) has no left padding, so content aligns to the container edge.

## Elevation & Depth

Flat by default. Structure comes from hairline rules and the one dark top bar, not from raised surfaces. Shadows appear only on things that float above the page (the search listbox and the chart readout), on the paper report sheet, and on the range thumb. All are soft, ink-tinted, and negative-spread.

### Shadow Vocabulary
- **Popover** (`box-shadow: 0 12px 32px -8px rgba(14, 26, 43, 0.35)`): search results listbox.
- **Readout** (`box-shadow: 0 6px 16px -6px rgba(14, 26, 43, 0.3)`): chart hover readout.
- **Paper** (`box-shadow: 0 1px 2px rgba(14, 26, 43, 0.08), 0 16px 40px -16px rgba(14, 26, 43, 0.25)`): the report sheet on screen; removed in print.
- **Thumb** (`box-shadow: 0 1px 3px rgba(14, 26, 43, 0.3)`): range slider thumb.

### Named Rules
**The Rules Not Cards Rule.** Exhibits and metrics are never boxed or shadowed. A strong ink rule under the title and soft hairlines inside do the separating.

## Shapes

Square-cornered: a single 2px radius on every control, stamp, popover, code chip, and skeleton. The only circles are data marks: the institution dot on the percentile rule, chart active dots, and stress-path points. Borders are 1px hairlines. Heavier weight appears only as the 3px active-tab underline, the 3px ink rule under the report head, and chart strokes (2px reported line, 1.75px dashed projection). Regulatory zones are hatched with diagonal red strokes at three densities.

## Components

### Buttons
Plain and ruled, like a form control on a printed release.
- **Shape:** square (2px), 34px tall, 1px ink border, 13px/600 label, optional 14px Lucide icon with a 7px gap.
- **Default:** sheet fill with ink text; hover inverts to ink fill and white text.
- **Primary:** ink fill, white text; hover shifts to deep ultramarine.
- **Disabled:** 45% opacity.
- **Transition:** 140ms ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Stamps
The state vocabulary. An 18px outlined uppercase tag in currentColor: Reported (ink-2 outline), Projected (deep ultramarine on wash), Breach (red on breach wash), Selected (white on deep ultramarine). Used in readouts, stress results, and provenance marks.

### Segmented Control
A 1px hairline group of 12px/600 ink-3 buttons split by hairlines; the pressed option fills ink with white text.

### Inputs / Fields
- **Search:** lives in the dark bar. 34px field on a slightly lifted navy with a darker navy border and 2px corners; focus-within brightens the border to periwinkle. A ⌘K key hint in a 1px outlined chip. Results drop in a sheet-white listbox with a strong ink border and the popover shadow; the active option takes the ultramarine wash and matched text is underlined in deep ultramarine.
- **Range:** 3px track filled ultramarine to the value over a hairline remainder; 16px square white thumb with a 2px ultramarine border. On the dark severity panel, track and thumb switch to periwinkle.
- **Focus:** a 2px ultramarine outline at 2px offset everywhere; periwinkle on dark surfaces.

### Navigation
- **Top bar:** sticky, 52px, night-bar fill with a bar-rule bottom border. Wordmark (15px/700) left, search, then as-of meta right-aligned at 12px with the key figures in bar-ink/600.
- **Section tabs:** 13px/600 ink-3 text over a strong ink bottom rule; hover and current go ink, and the current tab gets a 3px ultramarine underline sitting on the rule. They wrap on mobile.

### Exhibit (signature)
Every chart, table, or reading is an exhibit: a bold 15px title with its inline qualifier and optional right-aligned tools (legend, segmented control, stamp), a strong ink rule, the body, and a source line in 11.5px ink-3 above a soft hairline, naming account codes, quarters, and method.

### Vitals Strip & Percentile Rule (signature)
Five ruled cells: label, 28px figure, change line, then a percentile rule, which is a hairline track with a graphite middle-50% box, a graphite median tick, and an ink dot ringed in white for the institution, captioned with the percentile and which direction is stronger.

### Forecast Fan (signature)
Reported history as a 2px ink line; from the last filing, three stacked ultramarine interval areas (95, 80, 50) with a dashed deep-ultramarine point line, over a faint ultramarine tint of the projection period and a dotted "Last filing" divider. The fan unfolds once, left to right from the origin, via a 900ms clip-path reveal with exponential ease-out; reduced motion disables it. All synced charts share one quarter crosshair (1px ink cursor) and the same readout.

### Data Tables
13px, right-aligned numerics, 7px by 10px cells, soft hairline rows, a strong ink rule under the head, sortable headers as bare buttons with Lucide arrow icons. The subject institution's row is pinned and washed in ultramarine with ultramarine top and bottom rules. Summary rows sit on a strong ink rule. The first column can be sticky.

### Readout
A sheet-white tooltip with a strong ink border and 2px corners: the quarter and a state stamp on a hairline-ruled head, then label and value rows.

## Do's and Don'ts

### Do:
- **Do** put a source line under every exhibit, naming account codes and quarters.
- **Do** draw reported values in solid ink and projections in dashed deep ultramarine with the three-density fan, with a legend swatch for each.
- **Do** use stamps (Reported, Projected, Breach) wherever state could otherwise be read from hue alone.
- **Do** separate with hairline rules (`rule`, `rule-soft`) and a strong ink rule under titles and table heads.
- **Do** keep every control and container at the 2px radius; circles are for data marks only.
- **Do** keep numbers tabular and lining, and right-align numeric columns.

### Don't:
- **Don't** box metrics or exhibits in rounded, shadowed cards; shadows belong to floating layers and the paper sheet only.
- **Don't** introduce a second accent hue or use ultramarine for reported history.
- **Don't** use brick red for anything that isn't wrong (breach, flagged anomaly, failure).
- **Don't** use uppercase outside stamps, and don't put small uppercase labels above headings.
- **Don't** move to a dark canvas; the night bar is the only dark surface, apart from the stress severity panel.

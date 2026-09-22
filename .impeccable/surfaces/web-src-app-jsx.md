---
version: 1
slug: "web-src-app-jsx"
primary_target: "web/src/App.jsx"
related_targets: []
---

# Institution dashboard

Scope: the whole CU Pulse app shell and institution dashboard (Overview, Trends, Forecast, Peers, Stress test, Method, one-page Report), web/src.
Visitor mode: Operate. The analyst completes a read-out of one credit union; evaluators (Navy Federal FP&A / reporting hiring team) judge the rigor.

Audience & scene: CU financial analyst at a desk under office daylight, Excel and board packets open beside it; evaluators on a demo link. Light ground, chosen from that scene.
Task: pick an institution → health now → trajectory → peer standing → stress capital → export.
Content: real NCUA 5300 Call Report data, 2018Q1–2026Q2, every federally insured CU. Navy Federal (charter 5536) opens by default.
Constraints: no fabricated figures; forecasts always visibly distinct from reported values; every number traceable to account code + quarter; not color-alone.

## Direction contract

THESIS: Every institution is read as a central-bank staff forecast exhibit: reported history in ink, the projection as a graded probability fan, peers as a grey corridor, regulation as ruled zones. It refuses the KPI-card SaaS dashboard and the neon trading terminal.

OWN-WORLD: Cool release-white ground, blue-black ink, a strict hairline rule system of statistical tables, square-cornered controls. One committed fan hue, ultramarine, graded in three densities (50/80/95%); peers in graphite; brick red reserved for regulatory breach only. Public Sans with tabular lining figures everywhere; source lines under every exhibit.

STORY: The analyst understands health in five seconds (vitals row plus a computed analyst reading), sees the trajectory (fan) and standing (percentile), believes it because every figure names its account and quarter, and acts: drills into trends and peers, runs a stress case, prints the one-page report.

FIRST VIEWPORT: Top bar with wordmark, ⌘K institution search, as-of quarter and source. Masthead: name, charter, city, assets, members, peer set. A ruled vitals strip of five metrics, each with value, change, and peer percentile on a rule. Lead exhibit across eight columns: net worth ratio history + 4Q fan over PCA zones; four-column reading beside it. Section tabs below the masthead; Report action top-right.
Signature interaction: a synchronized quarter crosshair across every exhibit; the stress test's single control reshapes the capital fan live. Motion: the fan unfolds once from the forecast origin, exponential ease-out.

FORM: Central-bank staff-forecast exhibit / statistical release, position 3 of 7 on the grounded list; seed 0e305b44.
Raise, from the drawcord cape (declined): one control reshapes the whole projection.
Raise, from the mesophotic dive (declined): NCUA prompt-corrective-action capital tiers as ruled depth zones.
Raise, from the Crouwel grid specimen (declined): a strict visible 12-column armature; table rules land on column lines.
Raise, from the jet-age ticket wallet (declined): Reported / Projected / Sample are stamped states, never color alone; print-first report.
Raise, from the split-flap board (declined): the peer table is a fixed-column board with the subject row pinned.
Declined: ASCII scene render (loses both axes; nothing kept beyond tabular-figure discipline).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Deploy target.

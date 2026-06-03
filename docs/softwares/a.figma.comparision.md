---
title: Figma vs. kymo — Comparison
document_id: REF-FIGMA-CMP-001
version: "1.0"
issue_date: 2026-05-21
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the kymo DSL, layout engine, or render pipeline
review_cycle: On upstream Figma major release, on kymo DSL/layout change, or annually
supersedes: null
related_documents:
  - a.figma.md
  - ../formats/kymo-dsl/README.md
  - ../diagrams/best-practices.md
authors:
  - Vũ Anh
language: en
keywords:
  - figma
  - kymo
  - comparison
  - prior-art
  - design-tool
  - handoff
  - auto-layout
upstream:
  project: figma/figma
  homepage: https://www.figma.com/
  developer_site: https://developers.figma.com/
  license: Proprietary SaaS (typings package @figma/plugin-typings is MIT)
  access_date: 2026-05-18
---

# Figma vs. kymo — Comparison

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | REF-FIGMA-CMP-001                                             |
| Version           | 1.0                                                            |
| Issue Date        | 2026-05-21                                                     |
| Status            | Released                                                       |
| Classification    | Internal                                                       |
| Owner             | `diagrams/` project                                            |
| Audience          | Engineers evolving the kymo DSL, layout, or render pipeline    |
| Access Date       | 2026-05-18                                                     |
| Parent Reference  | [`figma.md`](a.figma.md)                                        |
| Related Documents | [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md) |

This document isolates the comparison between [Figma](https://www.figma.com/) and kymo. The factual reference (programmatic surfaces, Plugin API, auto-layout, variables, MCP) lives in [`figma.md`](a.figma.md); read that first if you need ground truth on how Figma actually behaves.

The comparison is kept separate so it can evolve at a different cadence than the factual reference: it is **an opinion shaped by kymo's current direction**, not a description of an external tool. Update it when kymo's DSL, layout, or render pipeline changes — even if upstream Figma does not. Figma is **not a rival renderer** — it is a collaborative *design* tool, and kymo already targets it as an **output**: `kymo <src> --figma` emits Figma Plugin JS via `packages/python/src/kymo/to_figma.py`. So the right frame for this whole document is a **handoff relationship** (kymo → Figma), not a contest — read §2 and §4 before the scores.

## 1. At-a-glance matrix

| Axis | Figma | kymo |
|------|-------|------|
| Primary purpose | Collaborative design canvas | Render static architecture diagrams |
| Authoring surface | WYSIWYG canvas; no DSL | `.kymo` declarative DSL |
| Implementation | TypeScript + Rust (closed); Plugin sandbox JS | Python 3 + JS port |
| Layout | Auto-layout (flex) + grid + absolute | Single: grid pack + per-row height sync |
| Edge routing | Manual (Design) / magnet connectors (FigJam) | Orthogonal Z-router with rounded corners |
| Animation | None in core; Smart Animate (prototypes) | Animated SVG + frame-synthesized WebP |
| Output | PNG, JPG, PDF, SVG (REST/Plugin) | SVG, animated SVG, WebP, Figma Plugin JS, Excalidraw |
| Themes | Variable modes (light/dark/print) | None — hand-coded |
| Icons | `createNodeFromSvg` or Components | Bundled SVG library |
| Token system | Variables + legacy Styles | Hand-coded |
| MCP exposure | First-party (remote + local) | None — CLI only |
| Relationship | kymo emits Figma Plugin JS via `to_figma.py` (handoff target) | — |
| License | Proprietary SaaS (typings MIT) | Apache-2.0 |

## 2. Headline tradeoffs

### 2.1 Not a rival — a handoff target

Figma is not a competing diagram renderer; it is a collaborative design environment, and kymo already *feeds into it*. `kymo <src> --figma` produces a Plugin API JS string that, when run via the Figma MCP `use_figma` tool or the dev console, lands the diagram inside a Figma file as editable frames — auto-layout containers for grouping, vector-network polylines for edges, full-fidelity SVG glyphs for each icon ([`figma.md` §3.1](a.figma.md), §3.5, §4). The animated SVG/WebP pipeline produces *final* artifacts; the Figma path produces an *editable* one a designer can re-style. kymo doesn't need to beat Figma here — it needs to land cleanly in it.

### 2.2 Text source vs WYSIWYG canvas

Figma is a canvas: positions are authored by hand and stored as coordinates. kymo is a text DSL: the `.kymo` source records *intent* and the layout engine computes positions. This is where kymo wins outright — diffs, code review, git history, regenerate-from-source automation — and Figma cannot follow, because its "source" is a node tree, not reviewable text. The flip side is approachability: a designer at the Figma canvas needs no syntax; a kymo author learns a small DSL. The two serve different ends of the same workflow, which is exactly why the handoff exists.

### 2.3 Auto-layout is more expressive than kymo's row-sync

Figma's auto-layout exposes a per-child `FIXED` / `HUG` / `FILL` sizing model ([`figma.md` §4](a.figma.md)) that is strictly richer than kymo's implicit per-row height sync. kymo's hybrid emitter (`_tree_to_js`) maps `|`/`,` onto nested auto-layout frames and relies on the fact that Python's `apply_layout_tree` and Figma's auto-layout share spacing rules so positions match. That works, but it means Figma can express layouts kymo's single algorithm cannot — a real lesson, not just a gap (see §4).

### 2.4 Catalog, themes, and components — Figma's accumulated surface

Figma's reuse model (components/instances/variants, §6 of `figma.md`), its variable **modes** for theming (§7), and its first-class icon import all represent surface kymo simply does not have: kymo re-renders every `hex-agent` as one-off SVG, has no theme system, and ships a single bundled icon library. These are the criteria where Figma scores highest — and, under the handoff frame, the right response is to *borrow* them (emit components, map accents to variables) rather than to out-build Figma.

### 2.5 Figma wins the headline — honestly

Of every tool compared in this folder, Figma is the **one that beats kymo on the overall** (§3.6: 105 vs 100). That is expected and fine: Figma is a mature, industry-defining design platform and kymo is an early, focused diagram renderer. The number that matters for kymo is not the headline gap but the per-category shape — kymo leads authoring/source (A) and owned routing (B), Figma leads scope/icons (C), output/interop (D), and ecosystem maturity (E2). Because kymo *feeds* Figma, "Figma is ahead overall" is not a threat; it is the destination.

## 3. Detailed scoring by category

The matrix in §1 says *what* differs; this section grades *how well* each tool handles each dimension. Because Figma is a WYSIWYG design tool rather than a diagram-as-code language, the rubric is the **general-tool** adaptation of the five categories used in [`diagrams.mingrammer.comparision.md`](b.diagrams.mingrammer.comparision.md): A Authoring & Source, B Layout & Rendering, C Scope & Iconography, D Output & Interop, E Cost/Deployment & Ecosystem. The per-category totals roll up to an overall in §3.6.

**Scale (per cell, out of 10):**

| Range | Meaning |
|:-:|---|
| 9–10 | Industry-leading; little room to improve. |
| 7–8  | Good; minor gaps that don't bite in practice. |
| 5–6  | Adequate; works but has known limits. |
| 3–4  | Limited; users routinely hit the ceiling. |
| 1–2  | Absent or unusable. |

**Caveats.** Scores for `kymo` reflect what is observable in this repo as of 2026-05-21 (`packages/python/src/kymo/`, `icons/`, `samples/`, `showcase/`, the layout-tree + Figma/Excalidraw exporters) and are held **consistent across every general-tool comparison in `docs/softwares/`** so kymo is judged the same way each time. Scores for `Figma` reflect the surface documented in [`figma.md`](a.figma.md) (REST v1, Plugin API, MCP server) as of the access date. The comparison is cross-model (design canvas vs DSL), so the **Why** column is load-bearing — read it, not the bare number. Remember the handoff frame: kymo *emits* Figma, so a Figma lead is the target landing zone, not a loss.

### 3.1 Category A — Authoring & Source

| # | Criterion | Figma | kymo | Why |
|---|-----------|:-----:|:----:|-----|
| A1 | Text / diff / git-friendliness of source | 3 | 9 | Figma's "source" is a node tree authored on a canvas — not diffable or reviewable as text; kymo's `.kymo` is plain declarative text built for git. |
| A2 | Reproducibility & automation | 5 | 8 | Figma can be driven via Plugin/REST/MCP but its artifacts are hand-authored; kymo regenerates SVG/WebP/Figma JS from source, ideal for CI. |
| A3 | Approachability / learning curve | 8 | 6 | Figma's canvas needs no syntax and is famously approachable; kymo asks the user to learn a small DSL. |
| A4 | Grouping / container semantics | 7 | 7 | Figma's frames/auto-layout + pages are powerful but generic; kymo's typed `region` containers carry layout/styling meaning — a wash. |
| | **Category total / 40** | **23** | **30** | **kymo +7** — everything that flows from plain-text source. |

### 3.2 Category B — Layout & Rendering

| # | Criterion | Figma | kymo | Why |
|---|-----------|:-----:|:----:|-----|
| B1 | Default layout quality | 7 | 8 | Figma auto-layout is excellent but the *default* is manual placement on a blank canvas; kymo's first-party engine is tuned for architecture diagrams out of the box. |
| B2 | User layout control | 9 | 8 | Figma gives total pixel-level control plus the `FIXED`/`HUG`/`FILL` sizing model; kymo's layout-tree DSL is expressive but computed, not hand-placed. |
| B3 | Edge / flow routing aesthetic | 5 | 10 | Figma Design has no auto-routing (manual connectors); FigJam magnet connectors re-route but aren't the H-V-H midpoint Z; kymo defaults to the team's owned Z-router ([[feedback-kymo-edge-routing]]). |
| B4 | Styling / themes / animation | 8 | 6 | Figma has rich styling, variable-mode theming, and prototype Smart Animate; kymo has animated SVG/WebP but no theme system. |
| | **Category total / 40** | **29** | **32** | **kymo +3** — owned Z-routing offsets Figma's deeper styling/control. |

### 3.3 Category C — Scope & Iconography

| # | Criterion | Figma | kymo | Why |
|---|-----------|:-----:|:----:|-----|
| C1 | Scope / notation breadth | 9 | 4 | Figma draws "anything" — UI, illustration, slides, whiteboard, diagrams; kymo draws architecture/block diagrams only. |
| C2 | Icon / shape catalog | 8 | 5 | Figma sources iconography from community kits + `createNodeFromSvg` + components; kymo's bundled `icons.py` set is sizable but narrower and architecture-tuned. |
| | **Category total / 20** | **17** | **9** | **Figma +8** — breadth and the component/library model; an accumulation gap kymo should *borrow* via the handoff, not chase in-tree. |

### 3.4 Category D — Output & Interop

| # | Criterion | Figma | kymo | Why |
|---|-----------|:-----:|:----:|-----|
| D1 | Output-format breadth | 8 | 6 | Figma emits PNG/JPG/PDF/SVG via REST and Plugin; kymo is SVG-first plus animated WebP and Figma/Excalidraw (no PNG/PDF yet). |
| D2 | Round-trip / data interchange | 7 | 5 | Figma round-trips within its own ecosystem and exposes full file JSON via REST; kymo's exporters are one-way (kymo → Figma) with no ingest. |
| D3 | Embeddability / API | 9 | 6 | Figma has REST, Plugin sandbox, iframe Embed, and a first-party MCP server; kymo is a Python module + JS port (no service/API). |
| | **Category total / 30** | **24** | **17** | **Figma +7** — a mature multi-surface API; kymo's strength here is being a clean *producer* into it. |

### 3.5 Category E — Cost, Deployment & Ecosystem

| # | Criterion | Figma | kymo | Why |
|---|-----------|:-----:|:----:|-----|
| E1 | License, cost & self-host/offline | 3 | 9 | Figma is proprietary SaaS with paid seats gating API access (the typings package is MIT, but the product is not); kymo is Apache-2.0 and fully local/offline. |
| E2 | Community / maturity | 9 | 3 | Figma is among the most widely used design platforms in existence with a vast plugin/community ecosystem; kymo is an early in-house tool. |
| | **Category total / 20** | **12** | **12** | **Tie** — kymo's licensing/offline strength exactly offsets Figma's maturity. |

### 3.6 Summary

**Weighting rule.** Every one of the **15 criteria** carries **equal weight** (`1/15` of the overall). Category sub-totals are shown for *shape*, not for weighting.

#### 3.6.1 Overall (equal weight per criterion)

| Tool | Sum of 15 cells / 150 | Mean per criterion / 10 | Percentage |
|---|:-:|:-:|:-:|
| `Figma` | **105** | **7.00** | **70 %** |
| `kymo`  | **100** | **6.67** | **67 %** |
| Gap (Figma − kymo) | 5 | 0.33 | 3 pp |

#### 3.6.2 Per-category sub-totals (context only)

| Category | # criteria | Max | Figma | kymo | Δ (kymo − Figma) |
|---|:-:|:-:|:-:|:-:|:-:|
| A — Authoring & Source        | 4 | 40 | 23 | 30 | **+7**  |
| B — Layout & Rendering        | 4 | 40 | 29 | 32 | **+3**  |
| C — Scope & Iconography       | 2 | 20 | 17 | 9  | **−8**  |
| D — Output & Interop          | 3 | 30 | 24 | 17 | **−7**  |
| E — Cost, Deployment & Ecosys | 2 | 20 | 12 | 12 | **0**   |
| **Overall**                   | **15** | **150** | **105** | **100** | **−5** |

#### 3.6.3 Sensitivity: equal weight per category

If each *category* (not each criterion) were given equal weight (1/5 each), the overall becomes the mean of the five normalised category scores:

| Tool | A | B | C | D | E | Mean / 10 | Percentage |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `Figma` | 5.75 | 7.25 | 8.50 | 8.00 | 6.00 | **7.10** | **71 %** |
| `kymo`  | 7.50 | 8.00 | 4.50 | 5.67 | 6.00 | **6.33** | **63 %** |
| Gap | | | | | | 0.77 | **8 pp** |

Equal-per-category **widens** Figma's lead (3 pp → 8 pp) because Figma dominates the 2-criterion C category (scope/icons), which gets upweighted relative to its single-criterion contribution. Use this only if you believe "scope/iconography" matters as much wholesale as "authoring" — but remember the handoff framing: kymo doesn't need to beat Figma on scope, it feeds *into* it, so the per-criterion number (§3.6.1) is the honest one for kymo's role.

#### 3.6.4 Read it this way

- **Headline (§3.6.1): Figma 7.00/10 vs kymo 6.67/10 — a 0.33-point / 3-pp gap.** Figma is the one tool in this folder that edges ahead of kymo overall — expected, given it is a mature design platform and kymo is a focused renderer.
- **kymo is not behind everywhere.** It *leads* category A (authoring/source/git) by +7 and category B (owned Z-routing) by +3. Figma's lead comes entirely from C (scope/icons), D (multi-surface API), and the maturity half of E.
- **Strategic shape — and the handoff.** kymo leads on what it *owns* (text source, layout/routing); Figma leads on what it *accumulates* (component library, API surface, community-years). Because kymo *emits* Figma, the move is to **borrow** Figma's strengths (components, variable-mode theming) through the exporter rather than out-build them in tree.
- **Cheapest moves on the board:** emit Figma `Component` for repeated icons (helps C2 and shrinks `--figma` output) and map accents to Figma `COLOR` variables (a path toward B4/themes). Both ride the existing exporter.
- **Cross-model caveat:** A2 (reproducibility) and A1 (diffability) are where kymo's text source genuinely changes the workflow; if your team works in a repo, weight A higher than the equal-weight headline implies — and treat Figma as the editable destination, not the competitor.

### 3.7 Re-score triggers

Re-run the relevant categories when any of the following happens — flag the date and which criteria moved:

1. kymo gains PNG/PDF output (D1) or its exporters become bidirectional, Figma → kymo (D2).
2. kymo's icon catalog or an arbitrary-asset escape hatch expands meaningfully (C2).
3. kymo gains a theme system (B4) — e.g. a `mode: dark` switch mapping to Figma variable modes.
4. kymo emits Figma components/instances instead of one-off frames (C2, D2), or ships a kymo MCP server (D3).
5. Upstream Figma changes its Plugin/REST API, MCP rate limits, or pricing/seat model (D3, E1).

## 4. Open questions for kymo

These follow from the comparison and the borrowable ideas catalogued in [`figma.md` §15](a.figma.md):

1. **Adopt `FIXED`/`HUG`/`FILL` sizing at the layout-tree level?** Figma's per-child sizing model is more expressive than kymo's implicit row-sync and would clean up rows mixing icons of different aspect ratios. Even just `HUG` (cell hugs its glyph) and `FILL` (cell fills its row) would help.
2. **Variable modes as kymo's theme primitive?** A `mode: dark` switch at the `Diagram` level cascading to every accent reference would beat per-component literal colours and map cleanly to Figma variable modes on export.
3. **Emit components + instances for repeated icons?** Every `hex-agent` is currently re-rendered SVG; emitting one Figma component + N instances would shrink `--figma` output and mirror kymo's `samples/` reuse pattern.
4. **Vector networks for richer edges?** Figma's vertex/segment/region model is strictly richer than the polyline kymo emits; it is already the data model kymo would want for fan-in/fan-out edges.
5. **A thin kymo MCP server wrapping `render()`?** Figma distributes itself as an MCP server; kymo exposes only a CLI. An MCP wrapper would let agentic tools generate diagrams without shelling out to `uv run kymo`.
6. **Tie `icons.py` symbols to source code, Code-Connect-style?** Linking a diagram component back to the code it represents would mirror Figma's design ↔ code bridge — useful for engineering-doc diagrams.

## 5. Provenance

- Comparison subject: Figma's programmatic surfaces as documented in [`figma.md`](a.figma.md) (REST v1 · Plugin API · MCP server) on 2026-05-18.
- Factual basis for the Figma column: [`figma.md`](a.figma.md).
- Factual basis for the kymo column: this repository's [`kymo-dsl/`](../formats/kymo-dsl/README.md), [`best-practices.md`](../diagrams/best-practices.md), the `packages/python/src/kymo/` tree (notably `to_figma.py`, the `--figma` handoff emitter), and team feedback recorded in memory (notably [[feedback-kymo-edge-routing]] at B3). The kymo cell scores follow the shared general-tool kymo column used across `docs/softwares/*.comparision.md` so kymo is judged consistently.
- Edits should restate the tradeoff, not just the conclusion — a future reader needs the *why* to judge whether the conclusion still holds, and to remember that kymo *feeds* Figma rather than competing with it.

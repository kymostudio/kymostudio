---
title: BPMN Animation — Design
document_id: DESIGN-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.anim format, validator, generator, and players
review_cycle: On phase/CR completion, or on format-schema change
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-001    # Requirements (traced below)
  - TEST-BPMN-ANIMATE-001    # Test documentation
  - PLAN-BPMN-ANIMATE-001    # Plan
  - KYMOANIM-MAP-001         # the self-contained kymo.anim format (normative)
  - KYMOJSON-MAP-001         # kymo.json model (Diagram built from a kymo.anim)
  - BPMN-MAP-001             # node type ↔ bpmn-* shapes; flow kinds
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - design
  - architecture
  - self-contained-format
  - kymo.anim
  - css-motion-path
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animation — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-BPMN-ANIMATE-001                            |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-05-31                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-BPMN-ANIMATE-001, TEST-BPMN-ANIMATE-001, PLAN-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

Realises FEAT-BPMN-ANIMATE-001 (FR/NFR cited per clause). **Umbrella architecture**; per-increment
detail in each CR's `03-DESIGN`. The format is normative in **KYMOANIM-MAP-001**. Covers ISO/IEC/IEEE
12207 Architecture & Design Definition.

## 1. Scope

How a **self-contained `kymo.anim` file** becomes a *process-animated* artifact — parse → validate →
build a `Diagram` from the explicit scene → render (token-driven) — plus the diagram→`kymo.anim`
generator and where the interactive viewer + WebP players attach. The existing static render and
input formats are unchanged; this design *adds* a new front-end (the format) and players.

## 2. Pipeline

```
kymo.anim file ──parse──► AnimDoc ──validate (internal)──► ok | errors[id/step]
                                       │ ok
                                       ▼  build (no layout pass — positions explicit)
                              Diagram (components/edges) + timeline
                                       │
                       ┌───────────────┴───────────────┐
                 no-JS SVG (CSS)   interactive viewer (JS)   WebP (frames)

  existing diagram (.bpmn/.kymo) ──(import/layout, --anim-init)──► AnimDoc   (generator, one-way)
```

- **Parse** — `from_kymoanim.parse(text) -> AnimDoc` (envelope + `controls` + `nodes` + `flows` +
  `timeline`); JS mirror `parseKymoAnim`.
- **Validate** — §4; abort with reported errors before building/rendering (FR-3).
- **Build** — turn the `AnimDoc` into a kymo `Diagram`: each `node` → a `Component` (`type`→`bpmn-*`
  shape per `BPMN-MAP-001`, `at`→`pos`, `size`/`label`); each `flow` → an `Edge` (`from`/`to`,
  `kind`→`bpmn_flow`, explicit `path`→`points`, else orthogonal route). **No `layout()` /
  `resolve_alignments()`** — positions are explicit, exactly as BPMN import already skips them
  (`cli.py`). This reuses the existing `to_svg` renderer.
- **Render** — `to_svg` over the built `Diagram` + the timeline-driven token CSS (§5).

## 3. The format (FR-1, FR-2)

Normative in **KYMOANIM-MAP-001**. For design: the file is **self-describing** — `nodes` carry
explicit `type` + `at`, `flows` carry `from`/`to` (+ optional explicit `path`), and the `timeline`
references them by id. All references are **internal**; there is no external diagram and no layout
inference. Node `type` ↔ `bpmn-*` shape and `flow.kind` ↔ `bpmn_flow` follow `BPMN-MAP-001`.

## 4. Validation (FR-3) — two layers, dependency-free

1. **Structural** — validate against the published JSON Schema (KYMOANIM-MAP-001 § JSON Schema). The
   repo ships **no validation library**; implement a small built-in checker (Python + JS mirror). The
   `kymo.anim.schema.json` file is shipped for editors / external validators.
2. **Semantic** — internal cross-references: every `flow.from`/`flow.to` and every timeline
   `node`/`flow`/`branch` resolves to a defined element; `branch` is an outgoing flow of its gateway;
   `step` ordinals strictly increase; `at`/`path` coordinates finite (and within `canvas` if given).
   `validate_anim(doc)` returns `[(id_or_step, message)]`; a player aborts on any error.

## 5. No-JavaScript SVG player (FR-5 SVG, NFR-1, NFR-2)

Pure CSS `@keyframes`, parameterised by the timeline, over the built `Diagram`:

- **Token along a flow** — a small `<circle>` (the two-circle "glow" idiom) travels each flow's path
  via **CSS Motion Path**: `offset-path: path('<flow path d>')` with `@keyframes token-run { from {
  offset-distance: 0% } to { offset-distance: 100% } }`; `animation-delay`/`-duration` from the
  step's order/`duration` (× `controls.speed`). The flow path comes from the flow's explicit
  `path` (or the routed `from.at`→`to.at`). `offset-path` is new to the repo (see § prior art in
  KYMOANIM-MAP-001); SMIL `<animateMotion><mpath>` is the documented raster fallback (CR-005).
- **Trail** — the existing `kymo-edge-flow` dash (`website/app/index.html:118` / `to_svg.py`
  `ANIM_PRESETS`).
- **Additivity (NFR-1)** — this is a new front-end; existing `.bpmn`/`.kymo`/`.kymo.json` paths are
  untouched, so their goldens stay byte-identical.
- **First frame / reduced motion (NFR-4)** — frame 0 = the static diagram; keyframes under
  `@media (prefers-reduced-motion: no-preference)`.

## 6. Generator (FR-4) — diagram → kymo.anim

`gen_anim(diagram) -> AnimDoc` (exposed as `--anim-init`): from a resolved `Diagram` (after
import/layout), emit `nodes` (shape→`type`, `pos`→`at`, `size`/`label`), `flows` (`bpmn_flow`→`kind`,
`points`→`path`), and a default `timeline` (a token-order traversal of sequence flows from the start
event(s); bounded walk on cycles; deterministic illustrative `branch` per gateway). Deterministic;
the result validates (FR-3). This is the one-way bridge from an existing diagram to an editable
`kymo.anim`.

## 7. Interactive viewer & WebP players (FR-5)

- **Viewer** (`CR-BPMN-ANIMATE-004`) — a JS player in `website/app/` reads the `AnimDoc` and exposes
  `controls` (play/pause/step) over the `timeline`. JS-driven (exempt from NFR-2).
- **WebP** (`CR-BPMN-ANIMATE-005`) — sample the timeline at frame times (using `controls.fr`), render
  each frame's SVG, rasterise via `to_webp.py` (`resvg_py.svg_to_bytes` — **not** cairosvg), encode
  an animated WebP. SMIL `<animateMotion>` is the token fallback for the rasteriser.

## 8. Parity & determinism (FR-6, NFR-3)

Parse, validate, build, generate, and CSS compilation are language-neutral and mirrored in
`packages/python` + `packages/js` (dependency-free); `pyRound` where Python rounds. For a given
`kymo.anim` file the validation verdict, built `Diagram`, and emitted CSS/markup are deterministic
and equivalent across languages — gated by the conformance suite alongside KYMOJSON-MAP-001.

## 9. Prior art

`kymo.anim` follows the **Lottie** model (one self-contained JSON of scene + animation,
schema-validated, rendered by portable players) but is higher-level and BPMN-semantic, and its
baseline player is no-JS SVG. Timeline semantics drew on declarative per-edge animation in **Mermaid**
(`animate:`) and **D2** (`style.animated`) and interactive **bpmn-js token-simulation**; the token
motion uses **CSS Motion Path** (MDN). Full citations in KYMOANIM-MAP-001 § Prior art.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-31 | Vũ Anh | Umbrella architecture: token-schedule model, no-JS CSS, viewer + WebP attach points. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on an explicit `kymo.anim` descriptor (parse → resolve target → validate → drive). |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format.** New pipeline parse → validate (internal) → **build a `Diagram` from the explicit scene (no layout pass)** → render; §6 generator is now diagram→`kymo.anim`; players unchanged in spirit; traceability to revised `FR-1..FR-7`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/animate/02-DESIGN.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces (FR-1…FR-7,
NFR-1…NFR-4) consistent with FEAT-BPMN-ANIMATE-001 and the format in KYMOANIM-MAP-001; increment
`version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-BPMN-ANIMATE-001 and
KYMOANIM-MAP-001. Reconcile any deviation there before release.

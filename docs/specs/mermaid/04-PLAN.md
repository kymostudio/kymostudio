---
title: Mermaid Support — Plan (umbrella)
document_id: PLAN-MERMAID-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Maintainers sequencing Mermaid-family work
review_cycle: On phase completion or scope change
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - DESIGN-MERMAID-001
  - TEST-MERMAID-001
  - PLAN-MERMAID-FLOWCHART-001
  - MERMAID-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - plan
  - roadmap
---

# Mermaid Support — Plan (umbrella)

## Phase 1 — Flowchart import in the Rust core (this delivery)

Status: **implemented**. Scope: `packages/rust/kymostudio-core` only.

- `model.rs`, `kymojson.rs`, `mermaid/{lexer,parser,mod}.rs`, `layout.rs`.
- Entry `mermaid_to_kymojson`; PyO3 + wasm bindings; `kymo` CLI `.mmd` → `.kymo.json`.
- Tests: unit + golden + determinism; CLI/wheel smoke in `rust.yml`.
- Docs: this umbrella, the flowchart module, MERMAID-MAP-001.

Verification: `cargo test` green; every fixture round-trips byte-identically through
Python `from_kymojson`/`to_kymojson`.

## Phase 2 — Python/JS rendering parity

Status: **implemented** (Python + JS). Make the kymojson actually render:

- ✅ Added the **`diamond`** glyph to the `Shape` literal/union and
  `SHAPE_HALF`/`LABEL_HEIGHT` in both `model.py` and `model.ts`.
- ✅ Both renderers (`to_svg.py`, `render.ts`) gained a **flowchart-node draw path**:
  icon-less labelled shapes draw the outline (box / rounded / circle / diamond /
  hex / cylinder / stadium) with the label **inside**, gated on `icon == ""` and
  behind conditional CSS so existing goldens stay byte-identical. `anchor()` no
  longer adds a label band for icon-less nodes. Excalidraw export draws native
  rectangle/ellipse/diamond for these too.
- ✅ Wired the binding: Python `_core.import_mermaid` + CLI `.mmd`/`.mermaid`
  dispatch (`cli.py`); JS `core.coreParseMermaid` → `parseMermaid` export +
  `bin/kymo.mjs` dispatch (via wasm `mermaidToKymoJson`).
- ✅ Native **`flowchart [DIR] { … }` DSL block** (body = Mermaid syntax) in both
  `dsl.py` and `dsl.ts`, resolved through the core (mirrors `bpmn { }`). Spec:
  KYMO-DSL grammar §6.11.
- ✅ Tests: `packages/python/tests/test_mermaid.py`, `packages/js/tests/mermaid.test.js`
  (structural — the two impls render independently; the Rust `.kymo.json` goldens
  remain the byte-exact import contract). Skip-guarded on the Python side when the
  installed core predates the Mermaid binding.
- **Two-release core rollout (in progress).** The Mermaid binding is a *new* core
  API not yet in the published wheel/npm. Per the caret-floor convention, this
  delivery degrades gracefully on an older core (Python tests skip; the render path
  errors clearly), and a `flowchart` conformance sample + golden SVGs are deferred
  until the core that ships the binding is released and the Python/JS floors raised.
- vscode-extension `.mmd` dispatch: still pending.

## Flowchart conversion hub (shipped alongside)

The Phase-1 parse model was lifted into a format-neutral **flowchart IR**
(`crate::flowchart`), turning the Mermaid front-end into one spoke of a small
conversion hub. Shipped on top of it (see MERMAID-MAP-001 §8 for the mapping):

- **Importers → IR:** `crate::mermaid`, **`crate::d2`** (D2), **`crate::dot`**
  (Graphviz DOT). So `d2_to_svg` / `dot_to_svg` / `d2_to_kymojson` / `dot_to_kymojson`.
- **Text emitters (IR → DSL):** `flowchart::emit::{to_mermaid, to_d2, to_dot}` —
  `mermaid_to_{mermaid,d2,dot}` (`kymo flow.mmd flow.d2`, round-trip-fixpoint tested).
- **draw.io encoder (`Diagram → mxGraph XML`):** `crate::drawio`, source-agnostic —
  `mermaid_to_drawio` + `drawio_from_kymojson`; reached from Python `--drawio` / JS
  `.drawio` and (any source) `kymo … flow.drawio`. RES-PIPELINE-001 §3.4 encoder.
- **Pure-Rust flowchart SVG renderer (`crate::flowchart_svg`):** the core's own
  `Diagram → SVG` — `kymo flow.{mmd,d2,dot} → flow.svg`, no external binary.
- **Rust CLI output registry** (`{ext → fn}`) — a first step toward
  RES-PIPELINE-001's "registry, not if/elif".

These are not Mermaid *diagram types* (Phase 3 below) — they are the flowchart
family's other source/target formats, sharing the same IR + layout.

## Phase 3+ — More diagram types (per module)

Add modules under `modules/<type>/`, each with its own 4-file set:

- **state** — reuse `layout.rs` (node-edge + Sugiyama); composite states → regions.
- **er** — node-edge topology; entity glyphs + relationship cardinalities.
- **sequence** — own timeline/lifeline layout (not layered).
- **class** — compartment sizing; own layout.

Each new type is a dispatch arm in `mermaid::mod` plus a `mermaid/<type>.rs`
producing the same resolved `Diagram`.

## Risks / open items

- **Layout has no external oracle.** Goldens are Rust-authored until a Python
  Mermaid front-end exists. Mitigated by the determinism test + the kymojson
  contract round-trip.
- **Subgraph clustering** is bounding-box only (members not force-grouped). Revisit
  if real diagrams look loose.
- **Conformance suite.** Phase 1 keeps goldens inside the crate; folding Rust into
  the repo-level `conformance/` happens once Python/JS consume the Rust output.

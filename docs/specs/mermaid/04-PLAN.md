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

Make the kymojson actually render:

- Add the **`diamond`** glyph to Python `to_svg` and JS `render`; add `diamond` to
  the `Shape` literals and `SHAPE_HALF`/sizing tables.
- Teach both renderers to draw **icon-less labelled shapes** (flowchart nodes carry
  no icon; today `render_component` requires one).
- Wire the binding: Python `from_mermaid`/CLI `.mmd` dispatch via
  `_kymostudio_core.mermaid_to_kymojson` → `from_kymojson`; JS equivalent via wasm;
  vscode-extension `.mmd` dispatch.
- Two-release core rollout if a new core API floor is required (see the repo's
  caret-floor convention).
- Render the Phase-1 fixtures to golden SVGs.

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

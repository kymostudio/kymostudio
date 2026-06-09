---
title: Flowchart Conversion Hub — Plan
document_id: PLAN-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers sequencing flowchart-hub work
review_cycle: On a phase being delivered
supersedes: null
related_documents:
  - FEAT-FLOWCHART-001
  - DESIGN-FLOWCHART-001
  - TEST-FLOWCHART-001
  - FEAT-MERMAID-001
  - FEAT-PIPECLI-001
authors:
  - Vũ Anh
language: en
keywords:
  - flowchart
  - plan
  - roadmap
---

# Flowchart Conversion Hub — Plan

## Phase 1 — IR + Mermaid import (shipped)

The Mermaid importer (`FEAT-MERMAID-001`) lands and its parse model is lifted into the
positionless **flowchart IR** (`crate::flowchart`). `mermaid_to_kymojson` + the Python/JS
render parity (icon-less nodes, `diamond` glyph).

## Phase 2 — Text transpilation (shipped)

`flowchart::emit::{to_mermaid, to_d2, to_dot}` — `mermaid_to_{mermaid,d2,dot}`, with convert
goldens + round-trip-fixpoint tests. Rust `kymo` CLI gains an **output-extension registry**
(`{ext → fn}`).

## Phase 3 — D2 + DOT import (shipped)

`crate::d2` and `crate::dot` parse their flowchart subsets into the IR
(`FEAT-FLOWCHART-D2-001` / `FEAT-FLOWCHART-DOT-001`; `D2-MAP-001` / `DOT-MAP-001`).
`d2_to_kymojson` / `dot_to_kymojson`; `.d2` / `.dot` / `.gv` CLI input.

## Phase 4 — Pure-Rust SVG render (shipped)

`crate::flowchart_svg` (`FEAT-FLOWCHART-SVG-001`) renders a resolved flowchart `Diagram`
→ SVG with no external binary. `mermaid_to_svg` / `d2_to_svg` / `dot_to_svg`;
`kymo flow.{mmd,d2,dot} → flow.svg`.

## Phase 5 — draw.io encode (shipped)

The source-agnostic draw.io encoder (`FEAT-PIPECLI-DRAWIO-001`, `DRAWIO-MAP-001`) reached
from the flowchart path via `mermaid_to_drawio` / `drawio_from_kymojson`.

## Open items

- **Two-release core rollout (in progress).** The d2/dot/drawio/svg bindings are new core
  APIs not yet in the published wheel/npm; the Python tests skip-guard, and golden SVGs + a
  `flowchart` conformance sample are deferred until that core is released and the Python/JS
  floors raised.
- **`.d2` / `.dot` input on the Python/JS CLIs** (today: Rust CLI + bindings only).
- **A `.drawio` importer** (mxGraph → IR) — would make draw.io a bidirectional spoke;
  currently export-only.
- **Layout quality** — the layered layout is functional, not yet tuned to Graphviz/D2
  aesthetics (edge-crossing minimisation, port routing).

## Annex A — Revision History

| Version | Date       | Author | Changes                                   |
|---------|------------|--------|-------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — five shipped phases + open items. |

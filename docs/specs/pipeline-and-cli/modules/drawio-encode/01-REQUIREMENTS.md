---
title: draw.io encoder — Requirements (module)
document_id: FEAT-PIPECLI-DRAWIO-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the draw.io encoder
review_cycle: On draw.io-encoder change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001          # Pipeline & CLI (umbrella)
  - DRAWIO-MAP-001            # Diagram → mxGraph mapping (normative)
  - KYMOJSON-MAP-001          # the resolved model it consumes
  - FEAT-DRAWIO-001           # the separate .drawio → SVG *import* feature
  - RES-PIPELINE-001          # §3.4 encoder pattern
authors:
  - Vũ Anh
language: en
keywords:
  - drawio
  - mxgraph
  - encoder
  - export
---

# draw.io encoder — Requirements (module)

**Status: implemented.** A **source-agnostic encoder** (RES-PIPELINE-001 §3.4): a resolved
`Diagram` → draw.io (mxGraph) XML. Realises the pipeline's "one encoder per output, by
registry" requirement (`FR-PC-3`-class, `FR-PC-7`).

- **FR-DRAWIO-1.** `crate::drawio::to_drawio(&Diagram) -> String` encodes any positioned
  `Diagram` (not just flowcharts). Shape→mxStyle, edges by `source`/`target`,
  subgraphs→`cluster` vertices, dashed / no-arrow honoured; non-flowchart shapes degrade to
  a labelled rectangle (icons not carried). Per `DRAWIO-MAP-001`.
- **FR-DRAWIO-2.** Two entry points: `mermaid_to_drawio` (mmd path) and
  `drawio_from_kymojson(json)` (any `.kymo.json` model — the generic any-source surface,
  via the canonical model JSON; rides the `bpmn`/serde feature).
- **FR-DRAWIO-3 (reach).** Python `--drawio` flag, JS `.drawio` output, Rust `kymo …
  flow.drawio`. All paths delegate to the one Rust encoder over the kymojson wire, so
  output is **byte-identical across Python and JS**. PyO3 (`mermaid_to_drawio` /
  `drawio_from_kymojson`) + wasm (`mermaidToDrawio` / `drawioFromKymoJson`).
- **NFR-DRAWIO-1.** Output is plain (uncompressed) mxfile XML, well-formed, deterministic.

**Out of scope:** the reverse (`.drawio` → kymo IR — see `FEAT-DRAWIO-001` for the
complementary `.drawio` → SVG *import*); compressed mxfile payloads; faithful icon export.

**Verification:** `src/drawio.rs` unit tests (per shape, edges, cluster, escaping,
non-mermaid fallback, typed == any-source round-trip), draw.io desktop opens the output.

## Annex A — Revision History

| Version | Date       | Author | Changes                                  |
|---------|------------|--------|------------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — draw.io (mxGraph) encoder. |

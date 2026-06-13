---
title: Graphviz DOT spoke — Requirements (module)
document_id: FEAT-FLOWCHART-DOT-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the DOT importer/emitter
review_cycle: On DOT spoke change
supersedes: null
related_documents:
  - FEAT-FLOWCHART-001          # Pipeline & CLI (umbrella)
  - DOT-MAP-001               # DOT ↔ kymo element mapping (normative)
  - FEAT-FLOWCHART-D2-001       # sibling D2 spoke
  - FEAT-FLOWCHART-SVG-001      # the renderer these feed
authors:
  - Vũ Anh
language: en
keywords:
  - dot
  - graphviz
  - importer
  - emitter
---

# Graphviz DOT spoke — Requirements (module)

**Status: implemented.** Graphviz DOT is a bidirectional spoke on the flowchart IR
(`crate::flowchart`), realising `FR-FC-2` (importer) / `FR-FC-3` (emitter); it also plugs
into the pipeline registry (`FR-PC-7`).

- **FR-DOT-1 (import).** `crate::dot::parse(src) -> Flowchart` parses the DOT flowchart
  subset (`digraph`/`graph` + `rankdir`, node `shape`/`style`/`label`, edges, `subgraph
  cluster_*`) into the IR. Per `DOT-MAP-001`; unrecognised statements skipped. No layout
  here.
- **FR-DOT-2 (emit).** `flowchart::emit::to_dot(&Flowchart) -> String` (the inverse).
- **FR-DOT-3 (APIs).** `dot_to_svg` / `dot_to_kymojson` and `mermaid_to_dot`. CLI
  `kymo flow.dot` → SVG, `kymo flow.mmd flow.dot`; PyO3 (`dot_to_svg` / `dot_to_kymojson`),
  wasm (`dotToSvg` / `dotToKymoJson`).
- **NFR-DOT-1.** No new crate deps; compiles `--no-default-features` and into wasm.

DOT is a clean node-edge fit (no qualified-ref bookkeeping like D2); cluster membership is
positional. Membership of the `cluster_` prefix is stripped on import and re-added on emit.

**Verification:** DOT-parser unit tests (`src/dot/mod.rs`), convert goldens, SVG validated
via resvg; `mmd/d2 → dot → kymo` matches the same graph. See `DOT-MAP-001` §5.

## Annex A — Revision History

| Version | Date       | Author | Changes                                 |
|---------|------------|--------|-----------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — DOT import/export spoke. |

---
title: D2 spoke — Requirements (module)
document_id: FEAT-PIPECLI-D2-001
version: "0.1"
issue_date: 2026-06-09
status: Implemented
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers maintaining the D2 importer/emitter
review_cycle: On D2 spoke change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001          # Pipeline & CLI (umbrella)
  - D2-MAP-001                # D2 ↔ kymo element mapping (normative)
  - FEAT-PIPECLI-DOT-001      # sibling DOT spoke
  - FEAT-PIPECLI-SVG-001      # the renderer these feed
  - MERMAID-MAP-001           # the first flowchart spoke
authors:
  - Vũ Anh
language: en
keywords:
  - d2
  - importer
  - emitter
  - flowchart
---

# D2 spoke — Requirements (module)

**Status: implemented.** D2 is a bidirectional spoke on the flowchart IR
(`crate::flowchart`), realising the pipeline's "one importer/encoder per format"
requirement (`FR-PC-2`, `FR-PC-7`).

- **FR-D2-1 (import).** `crate::d2::parse(src) -> Flowchart` parses the D2 flowchart
  subset (direction, node shapes, edges, containers, qualified refs) into the IR. Per
  `D2-MAP-001`; unrecognised statements are skipped (graph skeleton still imports). No
  layout here — `layout_flowchart` does that.
- **FR-D2-2 (emit).** `flowchart::emit::to_d2(&Flowchart) -> String` emits D2 from the IR
  (the inverse of import).
- **FR-D2-3 (APIs).** `d2_to_svg` / `d2_to_kymojson` (parse → layout → `flowchart_svg` /
  kymojson) and `mermaid_to_d2` (emit). Exposed on the `kymo` CLI (`kymo flow.d2` → SVG;
  `kymo flow.mmd flow.d2`), PyO3 (`d2_to_svg` / `d2_to_kymojson`) and wasm
  (`d2ToSvg` / `d2ToKymoJson`).
- **NFR-D2-1.** No new crate deps; compiles `--no-default-features` and into wasm.
- **NFR-D2-2.** `mmd/dot → d2 → kymo` round-trips the graph (the `to_d2` golden +
  round-trip-fixpoint tests in `tests/mermaid_convert.rs`).

**Verification:** D2-parser unit tests (`src/d2/mod.rs`), convert goldens, and SVG
validated by rasterizing through resvg. See `03-TEST` (umbrella) and `D2-MAP-001` §5.

## Annex A — Revision History

| Version | Date       | Author | Changes                                |
|---------|------------|--------|----------------------------------------|
| 0.1     | 2026-06-09 | Vũ Anh | Initial issue — D2 import/export spoke. |

# Mermaid Source Format — Index

This folder documents the **`.mmd` / `.mermaid` source format** — the
[Mermaid](https://mermaid.js.org) diagram-as-code text the kymo engine imports. The
importer lives in the Rust shared engine (`packages/rust/kymostudio-core`, module
`mermaid`) and emits the resolved model as `.kymo.json` (`KYMOJSON-MAP-001`), which the
Python and JS front-ends consume. **Phase 1 implements the `flowchart` family only**
(`graph` / `flowchart`); other Mermaid diagram types are recognised and rejected with a
clear error, their mappings reserved for future modules.

> **Upstream source.** Unlike `.bpmn` (which mirrors the OMG BPMN 2.0.2 specification,
> see `docs/formats/bpmn/`), **Mermaid has no formal ISO/OMG specification**. The upstream
> source of record is the Mermaid project documentation — <https://mermaid.js.org> (the
> flowchart grammar: <https://mermaid.js.org/syntax/flowchart.html>). Accordingly this
> folder is **not** a clause-by-clause spec mirror; it is the **import mapping**
> (`mermaid-mapping.md`) plus this index. Where this project's importer and upstream
> Mermaid disagree on accepted syntax, the gaps are recorded in the mapping's §6.

## Contents

| File / id | What |
|---|---|
| [`mermaid-mapping.md`](mermaid-mapping.md) (`MERMAID-MAP-001`) | The **normative** mapping from Mermaid source to the kymo model (`Component` / `Edge` / `Region`): diagram-type dispatch, direction, node shapes, edge operators, subgraphs, and the Phase-1 known gaps. |

## Companion documents

| Document id | What |
|---|---|
| `REF-FLOWCHART-001` (`docs/diagrams/flowchart/`) | A descriptive research reference — the flowchart **as a notation**: symbol taxonomy, connectors, control-flow constructs, history, and tooling. Background for *what* the imported diagrams are. |
| `KYMOJSON-MAP-001` (`docs/formats/kymo.json.md`) | The resolved-model serialization the importer emits, which the Python/JS back-ends render. |
| `BPMN-MAP-001` (`docs/formats/bpmn/kymo-mapping.md`) | The sibling importer mapping (BPMN → kymo), for comparison. |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                                            |
|---------|------------|--------|--------------------------------------------------------------------|
| 1.0     | 2026-06-08 | Vũ Anh | Initial issue — index for the `docs/formats/mermaid/` source-format folder. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/mermaid/README.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository; available to all readers.

### B.3 Change Control
Update when the Mermaid importer gains a diagram-type module (beyond flowchart), when a
file is added to or removed from this folder, or when the upstream Mermaid grammar this
folder tracks changes materially. Increment `version` and append a row to Annex A.

### B.4 References
Mermaid project documentation (<https://mermaid.js.org>); `MERMAID-MAP-001`,
`KYMOJSON-MAP-001`, `REF-FLOWCHART-001`.

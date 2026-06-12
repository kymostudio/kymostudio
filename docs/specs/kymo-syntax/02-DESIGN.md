---
title: Kymo Syntax (umbrella) — Design
document_id: DESIGN-KYMO-SYNTAX-001
version: "1.0"
issue_date: 2026-06-12
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers working on the kymo syntax surfaces (.kymo DSL, .kymo.json)
review_cycle: On module addition/removal, or on scope change
supersedes: null
related_documents:
  - FEAT-KYMO-SYNTAX-001     # Requirements (umbrella)
  - TEST-KYMO-SYNTAX-001     # V&V (umbrella)
  - PLAN-KYMO-SYNTAX-001     # Plan (umbrella)
  - DESIGN-KYMO-DSL-001      # modules/dsl design
  - DESIGN-KYMOJSON-001      # modules/json design
  - DESIGN-KYMO-NREF-001     # modules/nref design
authors:
  - Vũ Anh
language: en
keywords:
  - umbrella
  - design
  - dsl
  - kymo-json
  - pipeline
  - serialization
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 42010:2011
  - ISO 8601:2019
---

# Kymo Syntax (umbrella) — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-KYMO-SYNTAX-001` |
| Version           | 1.0 |
| Status            | Released |
| Issue Date        | 2026-06-12 |
| Owner             | `diagrams/` project |
| Related Documents | FEAT-TEST-PLAN-KYMO-SYNTAX-001; DESIGN-KYMO-DSL-001; DESIGN-KYMOJSON-001; DESIGN-KYMO-NREF-001 |

> Umbrella design: the *relationship* between the surfaces. Each surface's own design is in its
> module (`DESIGN-KYMO-DSL-001`, `DESIGN-KYMOJSON-001`, `DESIGN-KYMO-NREF-001`).

## 1. One pipeline, two ends

```
.kymo  (hand-authored)                                .kymo.json  (machine interchange)
   │                                                        ▲ │
   │ parse() — declarative, positions nothing               │ │ load — bidirectional,
   ▼                                                        │ ▼ lossless
 elements ──▶ layout() ──▶ resolve_alignments() ──▶ resolved Diagram ──▶ renderers
              (frames)      (5-pass geometry)        (the shared model)   (dumb back-ends)
```

The **DSL** (modules/dsl) is the *pre-resolution* surface: declarative text whose geometry the
engine computes. **`.kymo.json`** (modules/json) is the *post-resolution* surface: the resolved
`Diagram` serialized losslessly, skipping `layout()`/`resolve_alignments()` on load (already
resolved — the same fast-path `.bpmn` uses). UR-1's lossless guarantee is what lets the two ends
interoperate: author in text, cache/diff/exchange as JSON.

## 2. Normative references & dual-sourcing (UR-2)

| Surface | Normative reference | Reference implementation |
|---------|--------------------|--------------------------|
| `.kymo` DSL | `KYMO-DSL-001` (clause set under `docs/formats/kymo-dsl/`) | `dsl.py` (Python, the golden writer) |
| `.kymo.json` | `KYMOJSON-MAP-001` | the Python serializer/loader |

A grammar change flows: `dsl.py` + `KYMO-DSL-001` (lockstep, per the dsl module's NFR-4) → resolved
model → `KYMOJSON-MAP-001` + serializer when the model shape changes. The nref module records how
`KYMO-DSL-001` got its clause-per-file shape; it has no runtime surface.

## 3. Parity architecture

Both surfaces ship in **both implementations** — Python (`packages/python`, reference) and the
dependency-free JS (`packages/js`) — with Python as the sole golden writer and conformance suites
enforcing functional parity (byte parity where the module specifies it, e.g. `.kymo.json`
serialization). Umbrella-relevant consequence: a syntax change is **not done** until both
implementations and both surfaces agree; the module TEST docs carry the gates.

## 4. Folder architecture

The umbrella owns no code. `modules/{dsl,json}` carry the feature substance + `CR/` logs;
`modules/nref` is a completed-project record. The umbrella docs (this set) exist so the feature
root keeps the repository's strict 4-file shape while the modules stay independently versioned.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | Vũ Anh | Initial issue — umbrella design: the pre-/post-resolution relationship between `.kymo` and `.kymo.json`, the dual-source flow (UR-2), parity architecture, and the modules layout. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-syntax/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On an umbrella-level change: update the affected clause; keep `UR-` traces consistent with
FEAT-KYMO-SYNTAX-001; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the cross-module relationship; the normative surfaces are the modules and
`KYMO-DSL-001`/`KYMOJSON-MAP-001`. Reconcile any deviation there before release.

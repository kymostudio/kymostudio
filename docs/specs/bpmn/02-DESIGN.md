---
title: BPMN Support — Design (umbrella)
document_id: DESIGN-BPMN-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js
audience: Engineers implementing/maintaining any BPMN-family module
review_cycle: On a module being added/delivered, or on mapping/pipeline change
supersedes: null
related_documents:
  - FEAT-BPMN-001           # Requirements (umbrella, traced below)
  - TEST-BPMN-001           # Test documentation (umbrella)
  - PLAN-BPMN-001           # Plan (umbrella)
  - DESIGN-BPMN-PARSER-001  # module: parser design (the import path, in detail)
  - DESIGN-BPMN-EXPORT-001  # module: export design (the inverse path, in detail)
  - BPMN-MAP-001            # BPMN element → kymo mapping (normative)
  - BPMN-NREF-001           # BPMN 2.0 normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - design
  - architecture
  - mapping
  - pipeline
  - umbrella
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Support — Design (umbrella)

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | DESIGN-BPMN-001                                            |
| Version      | 0.1                                                       |
| Status       | Draft                                                     |
| Issue Date   | 2026-06-06                                                |
| Owner        | `packages/python` (kymo CLI) · `packages/js`              |
| Related      | FEAT-BPMN-001, TEST-BPMN-001, PLAN-BPMN-001, BPMN-MAP-001  |

## 1. Scope

This document describes the **family-level** design: how the BPMN modules slot into kymo's existing
diagram pipeline, the **shared substrate** they build on (the normative mapping and BPMN glyph
drawing), and the module plug-in model. Per-capability internals are delegated to each module's design
doc (`DESIGN-BPMN-PARSER-001`, `DESIGN-BPMN-EXPORT-001`, etc.).

## 2. Family architecture

kymo's pipeline is **front-ends produce a `Diagram`, then a shared back-end resolves and renders it**.
The BPMN family adds front-ends and back-ends at the edges of that pipeline without changing its core:

```
                ┌───────────────── BPMN family ──────────────────┐
   .bpmn  ──▶  parser ──┐                                          
   .diagram (bpmn)  ──▶ dsl ──┐                                    
                              ▼                                    
                          Diagram ──▶ resolve/layout ──▶ to_svg ──▶ SVG ──▶ animate
                              │                                          
                              └──────────────▶ export ──▶ .bpmn          
                                                                         
                          editor ◀── composes parser (open) + export (save)
                          lint   ◀── inspects .bpmn / Diagram + source mapping
   └────────────────────────────────────────────────────────────┘
```

- **Import (`parser`)** turns `.bpmn` into a fully-resolved `Diagram`. Because Diagram-Interchange
  coordinates are already **absolute**, `cli.py` skips both `layout()` and `resolve_alignments()` for
  `.bpmn` — the importer returns geometry ready to render. *(FR-BPMN-1)*
- **Authoring (`dsl`)** adds BPMN shapes/edges as DSL primitives that parse into the same `Diagram`
  model the rest of the pipeline consumes. *(FR-BPMN-3)*
- **Export (`export`)** is the inverse of `parser`: it walks a `Diagram` and emits BPMN 2.0 XML with DI
  geometry, supporting round-trip. *(FR-BPMN-2)*
- **Animation (`animate`)** operates on the rendered SVG, driving token flow over BPMN edges.
  *(FR-BPMN-5)*
- **Editor** is a **composition**: `parseBpmn(xml) → Diagram` for open, `toBpmn(Diagram) → xml` for
  save, over the canvas engine — it adds no new mapping. *(FR-BPMN-6)*
- **Lint** is a cross-cutting inspector over the import result and source. *(FR-BPMN-4)*

## 3. The shared substrate (FR-BPMN-7)

Two assets are shared by every module and are the family's single source of truth:

- **The normative mapping (`BPMN-MAP-001`).** The BPMN element ↔ kymo correspondence (shapes, edges,
  markers, labels, coordinate handling). `parser` reads it forward; `export` reads it inverse; `dsl`,
  `lint`, and `editor` cite it. No module re-derives the correspondence.
- **BPMN glyph drawing (`bpmn_shapes.py`, Python).** BPMN-specific shape rendering is kept **out of**
  `to_svg.py` to keep the renderer lean; `render_component`/`render_edge` delegate to it for `bpmn-*`
  shapes. BPMN defs/CSS are injected **only when a diagram actually uses them** (NFR-BPMN-2), so
  non-BPMN goldens stay byte-identical. The JS implementation mirrors this split.

## 4. Module plug-in model (FR-BPMN-8)

Each capability is a **module** under `modules/` with its own self-contained doc-set and CR log. A
module plugs into one of the pipeline seams above (a front-end, a back-end, an SVG post-pass, or a
cross-cutting inspector) and consumes the shared substrate rather than duplicating it. Adding a module
is additive: it MUST NOT change existing render/import paths (NFR-BPMN-2).

## 5. Dual-implementation parity (NFR-BPMN-1)

`packages/python` and `packages/js` are **independent, equivalent** codebases — neither a port of the
other — each with its own model, icon library, BPMN importer, and SVG renderer. A capability added to
one is implemented in the other; the JS package additionally stays **dependency-free**. The two share
the **mapping contract** (`BPMN-MAP-001`) and the corpus baseline, which is what keeps them at parity.

## 6. Prior art

The BPMN importer is kymo's reference precedent for ingesting a foreign XML diagram format with
embedded geometry; the `drawio` family (`INTRO-DRAWIO-001`) follows the same "decode geometry → emit"
shape for mxGraph XML and cites this design as precedent.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial umbrella design: family architecture (pipeline seams), the shared substrate (`BPMN-MAP-001` + `bpmn_shapes.py`), module plug-in model, dual-implementation parity. Created with the `bpmn/` consolidation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/02-DESIGN.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
Changing the family architecture or shared substrate requires: update the relevant clause; keep
FEAT-BPMN-001 and the affected module design consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This design delegates all element-level detail to `BPMN-MAP-001` and the module designs; on any change,
reconcile with those before release.

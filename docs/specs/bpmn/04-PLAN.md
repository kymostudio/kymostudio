---
title: BPMN Support — Plan (umbrella)
document_id: PLAN-BPMN-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js
audience: Engineers planning/maintaining the BPMN family
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - FEAT-BPMN-001           # Requirements (umbrella)
  - DESIGN-BPMN-001         # Design (umbrella)
  - TEST-BPMN-001           # Test documentation (umbrella)
  - PLAN-BPMN-PARSER-001    # module: parser plan
  - PLAN-BPMN-EXPORT-001    # module: export plan
  - PLAN-BPMN-DSL-001       # module: dsl plan
  - PLAN-BPMN-LINT-001      # module: lint plan
  - PLAN-BPMN-ANIMATE-001   # module: animate plan
  - PLAN-BPMN-EDITOR-001    # module: editor plan
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - plan
  - roadmap
  - modules
  - umbrella
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Support — Plan (umbrella)

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | PLAN-BPMN-001                                              |
| Version      | 0.1                                                       |
| Status       | Draft                                                     |
| Issue Date   | 2026-06-06                                                |
| Owner        | `packages/python` (kymo CLI) · `packages/js`              |
| Related      | FEAT-BPMN-001, DESIGN-BPMN-001, TEST-BPMN-001             |

## 1. Scope and approach

The BPMN family is built **bottom-up around the kymo `Diagram` model**: the importer and exporter
established the round-trip, the DSL added authoring, lint added validation, animation added flow, and
the interactive editor composes import/export. Each capability is delivered as an independent **module**
under `modules/` with its own plan; this umbrella plan tracks the **family roadmap, status, and risk**,
and delegates phase-level detail to the module plans.

## 2. Design

See DESIGN-BPMN-001: the modules plug into kymo's existing pipeline seams (front-ends, back-ends, SVG
post-pass, cross-cutting inspector) and share one normative mapping (`BPMN-MAP-001`) plus the BPMN
glyph-drawing split. Additivity (NFR-BPMN-2) and dual-implementation parity (NFR-BPMN-1) are the
governing constraints.

## 3. Module roadmap (delivery)

| Module | Capability | document_id (plan) | Status |
|--------|------------|--------------------|--------|
| `parser` | `.bpmn` → `Diagram` import | `PLAN-BPMN-PARSER-001` | **Delivered** |
| `export` | `Diagram` → `.bpmn` | `PLAN-BPMN-EXPORT-001` | **Released** (v1.0) |
| `dsl` | BPMN shapes in the DSL | `PLAN-BPMN-DSL-001` | **Delivered** |
| `lint` | Import-fidelity / graph-sanity checks | `PLAN-BPMN-LINT-001` | **Baselined** |
| `animate` | Token-flow animation | `PLAN-BPMN-ANIMATE-001` | **Delivered** |
| `editor` | Interactive modeling surface | `PLAN-BPMN-EDITOR-001` | **Planned** |

## 4. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Mapping drift between modules (each re-deriving element correspondence). | One normative mapping (`BPMN-MAP-001`, FR-BPMN-7); all modules cite it. |
| A BPMN change churns unrelated goldens. | Conditional BPMN defs/CSS injection (NFR-BPMN-2); golden + corpus baselines gate the build. |
| Parity drift between Python and JS. | Feature added to both; shared mapping contract + corpus baseline (NFR-BPMN-1). |
| Importer silently drops/misplaces elements. | `lint` module surfaces fidelity/reference/graph diagnostics (FR-BPMN-4). |
| Corpus regressions slip in unnoticed. | MIWG corpus baseline on every build + nightly full-corpus run (NFR-BPMN-5). |

## 5. Verification

Per TEST-BPMN-001: module unit suites + golden-SVG byte-equality + the MIWG corpus baseline, run
per-package in CI and nightly for the full corpus.

## 6. Change requests

Family-scope changes are raised against this umbrella set; capability-level changes are raised in the
owning module's `CR/` (or `CHANGE-REQUESTS/` for `editor`). A new capability is added as a new module
under `modules/` with its own doc-set, and registered in FEAT-BPMN-001 §0 and §5.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial umbrella plan: family approach, module roadmap with current delivery status, risk register, verification summary, and change-request routing. Created with the `bpmn/` consolidation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/04-PLAN.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the family; available to all repository readers.

### B.3 Change Control
Changing the family roadmap or risk register requires: update the relevant clause; keep FEAT-BPMN-001
§5 consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This plan is informative; module status is authoritative in each module's own plan. On any module
status change, reconcile §3 here with the owning module plan.

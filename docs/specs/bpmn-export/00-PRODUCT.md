---
title: BPMN 2.0 Export — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-EXPORT-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for BPMN 2.0 export; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-EXPORT-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
  - DESIGN-BPMN-DSL-001
  - REF-BPMNIO-CMP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - export
  - round-trip
  - interchange
---

# BPMN 2.0 Export — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-EXPORT-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-EXPORT-001`, `FEAT-BPMN-EXPORT-001` (the SRS derived from the needs below) |

> This doc owns the `SN-BPMN-EXPORT-NN`
> stakeholder needs; the SRS (`FEAT-BPMN-EXPORT-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

kymo can already **import** BPMN 2.0 XML (`from_bpmn`, `BPMN-MAP-001`) and, since `KYMO-DSL-001` §6.9,
**author** BPMN textually with the `bpmn { }` block. But all of kymo's *output* paths are
**one-way**: SVG, animated WebP, Figma, and Excalidraw — none is a standard, machine-readable
interchange format. The tool comparisons under `docs/softwares/` make this the recurring gap: bpmn.io
(`REF-BPMNIO-CMP-001`), Camunda (`REF-CAMUNDA-CMP-001`), Signavio (`REF-SIGNAVIO-CMP-001`), and
Flowable (`REF-FLOWABLE-CMP-001`) all *"round-trip standard BPMN 2.0 XML losslessly"* while *"kymo's
exporters are one-way with no standard interchange format."*

The feature adds a **BPMN 2.0 XML emitter** — `to_bpmn` — that is the **inverse of `from_bpmn`**: it
turns a kymo `Diagram` (whose components are `bpmn-*` glyphs, whether imported from `.bpmn` or
authored with the `bpmn { }` block) back into a complete, well-formed BPMN 2.0 document — both the
**semantic** model (`<process>` / `<collaboration>` with events, tasks, gateways, flows) and the
**Diagram-Interchange** geometry (`<bpmndi:BPMNDiagram>` with shape bounds + edge waypoints).

## 2. Users & context of operations (ConOps)

- **Who:** users moving process models between kymo and the BPMN tool ecosystem (Camunda, bpmn.io,
  Signavio, Flowable), plus engineers and maintainers of the kymo emitters and BPMN importer
  verifying round-trip fidelity against real-world `.bpmn` corpora.
- **Substrate it builds on (unchanged):** the BPMN importer's element mapping (`BPMN-MAP-001`), which
  this feature **inverts**; the `bpmn { }` authoring block (`DESIGN-BPMN-DSL-001`); and the existing
  emitter pattern (`to_svg` / `to_figma` / …) that `to_bpmn` joins.
- **Scenario:** `.bpmn` → import → kymo `Diagram` → **export** → `.bpmn` preserves the structure and
  layout, closing the interchange gap; the CLI gains a `--bpmn` target and the Python/JS libraries
  gain `export` / `toBpmn`.

## 3. Goals & non-goals

- **Goals:** turn any `Diagram` of `bpmn-*` glyphs into a standard, well-formed BPMN 2.0 XML file —
  semantic model + DI geometry — so kymo participates in BPMN tool interchange and supports
  `.bpmn` → kymo → `.bpmn` round-trip; mirrored in Python and JS, deterministic, with no new runtime
  deps.
- **Non-goals (v1):** exporting an arbitrary (non-BPMN) diagram; **byte** round-trip (the export
  reproduces the model + DI equivalently, not the original file's exact bytes/formatting/comments);
  executable semantics (`<conditionExpression>` bodies, listeners, forms, IO); and animation (BPMN is
  static). Deferred — see `PLAN-BPMN-EXPORT-001`.

## 4. Stakeholder needs (`SN-BPMN-EXPORT`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-EXPORT-01` | kymo must be able to **emit standard, well-formed BPMN 2.0 XML** from a `Diagram` of `bpmn-*` glyphs — both the semantic model and the DI geometry — so it participates in BPMN tool interchange. | Every output path today is one-way; peer tools round-trip standard BPMN losslessly. |
| `SN-BPMN-EXPORT-02` | A `.bpmn` imported into kymo must **round-trip** back out — `.bpmn` → kymo → `.bpmn` — preserving structure and layout (semantic + DI equivalence, within integer rounding). | Round-trip fidelity is the headline acceptance; it is what closes the interchange gap. |
| `SN-BPMN-EXPORT-03` | The mapping must be the **exact inverse of the importer** (`BPMN-MAP-001`): every `(shape, marker)` and `bpmn_flow` maps back to the BPMN element it came from, deterministically. | A single classification source avoids drift between import and export. |
| `SN-BPMN-EXPORT-04` | Export must be reachable from the **CLI** (a `--bpmn` target) and the **Python/JS libraries** (`export` / `toBpmn`), with **equivalent functionality in both** and no new runtime dependencies. | Consistent surface across the two implementations, kept dependency-free. |

## 5. Scope

**In scope (product level):** the `to_bpmn` emitter (semantic `<process>`/`<collaboration>` body + DI
geometry; inverse of `from_bpmn`); pools/lanes/groups/expanded-subprocess containers; preserved
element ids + deterministic output; a CLI `--bpmn` target and the `export`/`toBpmn` library APIs —
mirrored in Python and JS. **Out of scope (v1):** non-BPMN diagrams, byte-exact round-trip,
executable semantics, and animation (see §3 non-goals; the SRS `FEAT-BPMN-EXPORT-001` §4 records the
deferral).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-BPMN-EXPORT-001` §1–3 (problem/concept) and the stakeholder-needs portion of `FEAT-BPMN-EXPORT-001` §1; minted `SN-BPMN-EXPORT-01..04` (feature-scoped). |

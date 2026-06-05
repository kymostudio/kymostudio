---
title: BPMN Lint — Introduction
document_id: INTRO-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers and reviewers of the kymo BPMN importer, CLI, and BPMN→SVG pipeline
review_cycle: On CR completion, or on importer/renderer change
supersedes: null
related_documents:
  - PROD-BPMN-LINT-001      # Product description (stakeholder needs, SN-LINT)
  - FEAT-BPMN-LINT-001      # Requirements (FR-LINT / NFR-LINT)
  - DESIGN-BPMN-LINT-001    # Design (rule registry, line-mapping)
  - TEST-BPMN-LINT-001      # Test documentation (TC-LINT)
  - PLAN-BPMN-LINT-001      # Plan (delivery, change-requests)
  - DESIGN-BPMN-PARSER-001  # The .bpmn → Diagram importer this builds on
  - FEAT-BPMN-EXPORT-001    # The .bpmn exporter sibling
  - BPMN-MAP-001            # BPMN element → kymo mapping
  - BPMN-NREF-001           # BPMN 2.0 normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - di
  - import-fidelity
  - reference-integrity
  - graph-sanity
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-BPMN-LINT-001                                          |
| Version      | 1.0                                                         |
| Status       | Baselined                                                   |
| Issue Date   | 2026-06-05                                                  |
| Owner        | `packages/python` (kymo CLI)                                |
| Related      | PROD-BPMN-LINT-001, FEAT-BPMN-LINT-001, DESIGN-BPMN-LINT-001, TEST-BPMN-LINT-001, PLAN-BPMN-LINT-001 |

## 1. Purpose and scope

This document introduces the **BPMN lint** feature and is the entry point to its document set. It
states the concept, the relationship to neighbouring components, and the terminology, then maps the
reader to the rest of the set:

- **PROD-BPMN-LINT-001** — the product description: stakeholder needs (`SN-LINT-NN`) and the problem
  the feature solves.
- **FEAT-BPMN-LINT-001** — the requirements: functional (`FR-LINT-N`) and non-functional
  (`NFR-LINT-N`).
- **DESIGN-BPMN-LINT-001** — the design: rule registry, raw-XML scan, and source-line mapping.
- **TEST-BPMN-LINT-001** — the test documentation: test cases (`TC-LINT-NN`) and their traceability.
- **PLAN-BPMN-LINT-001** — the plan: delivery status, risk, and forward change-requests.

The set conforms to ISO/IEC/IEEE 12207:2017 and ISO/IEC/IEEE 15289:2019; dates are ISO 8601:2019.
The feature is **already implemented** (as-built); this baseline documents it. Cross-references use
**`document_id`** (never file paths).

## 2. Concept

`kymo lint <file.bpmn> [<file.bpmn> ...]` is a **raw-XML linter for the BPMN→SVG (DI-driven)
pipeline**. It reads the raw BPMN 2.0 XML — not the imported `Diagram` — so it can flag exactly what
the DI-driven importer (DESIGN-BPMN-PARSER-001) would silently drop. It flags three classes of issue:

- **Import-fidelity** — *will this file render in kymo?* — degenerate or absent Diagram-Interchange
  (DI): shapes without bounds, edges with too few waypoints, semantic elements with no DI.
- **Reference integrity** — dangling or missing `sourceRef` / `targetRef` on flows.
- **Graph sanity** — basic modelling mistakes: disconnected nodes, implicit start/end, a process with
  no start or end event.

It is **informational and always exits 0** — only usage errors (file not found, non-`.bpmn` suffix,
empty argument list) print a message and exit 1, so it is safe to drop into scripts and CI without
breaking the pipeline. Output is one finding per line, ruff/gcc-style and column-aligned —
`path:line  severity  message` — followed by a blank line and an `N errors, M warnings` summary.
A clean file prints `path: ✓ no issues`. Severities are `error` and `warn`. There is no auto-fix.

DI findings carry the **DI element's** line, not the semantic element's (e.g. a missing-`<dc:Bounds>`
finding points at the `<BPMNShape>`). `lint` is the **first positional subcommand** in the CLI, which
is otherwise `kymo <file> [--flags]`. It is **Python-only** — the JS package ships as a library with
no CLI.

Example output:

```
order.bpmn:42  error  Task_Approve 'Approve' targetRef 'Task_Ship' not found
order.bpmn:58  warn   Shape_Gateway_1 missing <dc:Bounds> (will not render)
order.bpmn:71  warn   SequenceFlow_7 has no DI edge (will not render)
order.bpmn:12  warn   StartEvent_1 start event has an incoming flow
order.bpmn:88  warn   process has no end event

1 errors, 4 warnings
```

## 3. Relationship to other components

- **Builds on the importer** — the BPMN importer (INTRO-BPMN-PARSER-001, DESIGN-BPMN-PARSER-001) is
  DI-driven: it renders a node only when a well-formed `<BPMNShape>`/`<BPMNEdge>` is present, and
  silently drops the rest. The linter exists to surface those silent drops *before* import, by reading
  the same raw XML the importer consumes.
- **Complements the exporter** — the BPMN exporter (FEAT-BPMN-EXPORT-001) writes `.bpmn` from a kymo
  `Diagram`; lint is a read-only check on inbound third-party `.bpmn`. The two do not share code but
  bracket the same round-trip.
- **Uses the mapping** — rule semantics (which semantic elements are visible nodes, which are flows,
  what DI each requires) follow the BPMN element → kymo mapping (BPMN-MAP-001) and the normative spec
  mirror (BPMN-NREF-001).
- **Distinct from bpmnlint** — [bpmnlint](https://github.com/bpmn-io/bpmnlint) (bpmn.io / Camunda) is
  the de-facto **semantic** linter: 27 configurable rules over the moddle model, JS, with editor
  markers. kymo lint is instead a **renderer-fidelity** linter — its unique value is the DI and
  dangling-reference checks bpmnlint omits because it is renderer-agnostic. The two are complementary,
  not competing; see the *BPMN Lint & Validation Tooling research note* (`docs/research/bpmn-lint/`)
  for the full comparison.

## 4. Definitions & abbreviations

- **DI / BPMNDI** — Diagram Interchange: the OMG-standardised graphical layer of a `.bpmn` file
  (`<bpmndi:BPMNDiagram>`) that carries absolute geometry. kymo's importer is DI-driven.
- **BPMNShape** — a `<bpmndi:BPMNShape>` element; the DI node for a semantic element, carrying its
  `<dc:Bounds>` (x, y, width, height).
- **BPMNEdge** — a `<bpmndi:BPMNEdge>` element; the DI connector for a flow, carrying its
  `<di:waypoint>` list.
- **Waypoint** — a `<di:waypoint>` (x, y) point on a `BPMNEdge`; an edge needs **≥ 2** to render.
- **Finding** — one reported issue: `(severity, eid, name, message, line)`. The unit of lint output.
- **Severity** — `error` or `warn`. Both are informational; neither changes the exit code.
- **Import-fidelity** — whether the file's DI lets kymo render it faithfully without silently losing
  elements; the linter's kymo-unique concern.
- **Dangling ref** — a `sourceRef`/`targetRef` (or other reference) pointing at an `id` not present in
  the document.
- **`bpmnElement`** — the DI attribute linking a `BPMNShape`/`BPMNEdge` to its semantic element by
  `id`.
- **Lint vs schema validation** — lint checks pragmatic render-fidelity and modelling sanity; it is
  **not** XSD/schema validation (well-formedness only, via LR-XML-01) and does **not** assert OMG
  schema conformance.

## 5. Document set & traceability

This module's six documents, and what each owns:

| # | Document | document_id | Owns |
|---|----------|-------------|------|
| 00 | Product | PROD-BPMN-LINT-001 | Stakeholder needs (`SN-LINT-01..05`); the problem and concept of operations. |
| 01 | Introduction (this) | INTRO-BPMN-LINT-001 | Entry point, concept, terminology, document map. |
| 02 | Feature | FEAT-BPMN-LINT-001 | Requirements (`FR-LINT-1..8`, `NFR-LINT-1..5`). |
| 03 | Design | DESIGN-BPMN-LINT-001 | Rule registry (`LR-*`), raw-XML scan, expat line-mapping. |
| 04 | Test | TEST-BPMN-LINT-001 | Test cases (`TC-LINT-01..`), fixtures, traceability to `FR-LINT`. |
| — | Plan | PLAN-BPMN-LINT-001 | Delivery status, risk, change-requests (`CR-BPMN-LINT-002..005`). |

Reading order: **INTRO-BPMN-LINT-001** (this) → **PROD-BPMN-LINT-001** → **FEAT-BPMN-LINT-001** →
**DESIGN-BPMN-LINT-001** → **TEST-BPMN-LINT-001**; delivery status in PLAN-BPMN-LINT-001. Traceability
chains needs → requirements → tests: `SN-LINT` (PROD) → `FR-LINT`/`NFR-LINT` (FEAT) → `TC-LINT`
(TEST), with the rule registry `LR-*` (DESIGN) realising the requirements.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial as-built baseline. Introduced the `kymo lint <file.bpmn>` raw-XML / DI-fidelity linter; concept, terminology, and document map for the set. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/01-INTRO.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (PRODUCT/FEATURE/DESIGN/TEST/PLAN)
consistent; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with `FEAT-BPMN-LINT-001` and
`DESIGN-BPMN-LINT-001` before release.

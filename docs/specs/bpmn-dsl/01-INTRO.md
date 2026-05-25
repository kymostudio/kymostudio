---
title: BPMN in the kymo DSL — Introduction
document_id: INTRO-BPMN-DSL-001
version: "1.2"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo DSL, layout engine, and renderers
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - PROD-BPMN-DSL-001    # Product description (ConOps & stakeholder needs)
  - FEAT-BPMN-DSL-001    # Requirements
  - DESIGN-BPMN-DSL-001    # Design
  - TEST-BPMN-DSL-001    # Test documentation
  - PLAN-BPMN-DSL-001   # Plan
  - KYMO-DSL-001             # kymo DSL language specification (normative)
  - BPMN-MAP-001              # BPMN importer element mapping
  - RES-MERMAID-D2-001       # Mermaid vs D2 (auto-layout prior art)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - dsl
  - auto-layout
  - sugiyama
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN in the kymo DSL — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-BPMN-DSL-001                                           |
| Version      | 1.2                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-25                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-BPMN-DSL-001, FEAT-BPMN-DSL-001, DESIGN-BPMN-DSL-001, TEST-BPMN-DSL-001, PLAN-BPMN-DSL-001 |

## 1. Purpose and scope

This document introduces the **BPMN-in-kymo** feature and is the entry point to
its document set. It states the problem, the concept, and the terminology, and
maps the reader to the requirements (FEAT-BPMN-DSL-001), the design
(DESIGN-BPMN-DSL-001), the test documentation (TEST-BPMN-DSL-001), and the
plan (PLAN-BPMN-DSL-001). The set conforms to ISO/IEC/IEEE 12207:2017
(life-cycle processes) and ISO/IEC/IEEE 15289:2019 (information-item content).

## 2. Background

Authoring BPMN in `.kymo` today requires placing every `bpmn-*` leaf at an
explicit `@ (x,y)` and hand-tracing every edge's `via` waypoints (see
`samples/order-fulfillment.kymo`). This is laborious and error-prone. Tools such
as Mermaid let an author describe a process textually and lay it out
automatically (cf. RES-MERMAID-D2-001). kymo can already *import* BPMN 2.0 XML
(BPMN-MAP-001) but cannot *author* it concisely.

## 3. Feature concept

A new file-scope `bpmn { … }` block in the kymo DSL (KYMO-DSL-001) lets an author
describe a process as typed nodes and flows — *declare-then-connect* — and have
the engine lay it out:

- **Declarative**: `start`/`task`/`xor`/`and`/`end` … node kinds, then `->`
  connections.
- **Auto-layout**: a left-to-right layered (Sugiyama/DAG) layout positions nodes
  and routes orthogonal flows.
- **Hybrid coordinates**: a node may add `@ (x,y)` to pin/override its position;
  un-pinned nodes are auto-placed.
- **Renderer reuse**: the block emits a fully-resolved sub-diagram (absolute
  positions + edge waypoints) exactly like the BPMN importer, so the existing
  `bpmn-*` glyphs and flow renderer draw it unchanged.

The normative grammar is in KYMO-DSL-001; the surface and behaviour are
specified as requirements in FEAT-BPMN-DSL-001; the architecture and
algorithm in DESIGN-BPMN-DSL-001.

## 4. Audience

Engineers implementing or reviewing the kymo DSL parser, the layout engine, and
the Python/JS renderers; and maintainers verifying conformance.

## 5. Terms and abbreviations

- **BPMN** — Business Process Model and Notation 2.0.
- **DSL** — the kymo domain-specific language (`.kymo`); see KYMO-DSL-001.
- **Block** — the brace-delimited `bpmn { … }` construct.
- **Leaf / node** — a single rendered element (a `bpmn-*` `Component`).
- **Flow** — a directed edge (sequence / message / association).
- **DAG** — directed acyclic graph.
- **Sugiyama** — layered graph-drawing method (rank → order → coordinates).
- **Pin** — a node carrying an explicit `@ (x,y)` override.

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec** (`00-PRODUCT`–`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`). The documents for bpmn-dsl:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | PROD-BPMN-DSL-001 | *what product problem & whose needs (`SN-BPMN-DSL`)?* |
| 01 | `01-INTRO.md` (this) | INTRO-BPMN-DSL-001 | *where do I start?* |
| 02 | `02-FEATURE.md` | FEAT-BPMN-DSL-001 | *what must it do? (requirements, `FR`/`NFR`)* |
| 03 | `03-DESIGN.md` | DESIGN-BPMN-DSL-001 | *how is it built?* |
| 04 | `04-TEST.md` | TEST-BPMN-DSL-001 | *how do we know it's right?* |
| — | `docs/specs/bpmn-dsl/PLAN.md` | PLAN-BPMN-DSL-001 | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Reading order: **`01-INTRO`** (this) → **`00-PRODUCT`** (product context + `SN-BPMN-DSL` needs) →
**`02-FEATURE`** → **`03-DESIGN`** → **`04-TEST`**; for delivery status read `PLAN-BPMN-DSL-001`.
Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only.

- **Change management:** a change to this baselined spec is raised as a change-request in
  `docs/specs/bpmn-dsl/CR/` and re-baselined (bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-23 | Vũ Anh | Initial issue. |
| 0.2     | 2026-05-23 | Vũ Anh | Doc-set version sync after P0 (spike) complete; no normative change to this item. |
| 1.0     | 2026-05-23 | Vũ Anh | Released — feature shipped (P0–P3 merged; normative grammar in KYMO-DSL-001 §6.9). |
| 1.1 | 2026-05-24 | Vũ Anh | Corrected the importer-mapping cross-reference to BPMN-MAP-001 (the importer doc gained an ID; moved to docs/formats/bpmn.md). |
| 1.2 | 2026-05-25 | Vũ Anh | **Doc reorganization.** §6 trimmed to a document map and adds `00-PRODUCT` (`PROD-BPMN-DSL-001`); reading order + change-management updated. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository at
`docs/specs/bpmn-dsl/01-INTRO.md`; the authoritative source is the
main-branch working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone
with repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version` (MAJOR/MINOR/PATCH); append a
row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any feature change, reconcile it with
FEAT-BPMN-DSL-001 (the normative requirements) before release.

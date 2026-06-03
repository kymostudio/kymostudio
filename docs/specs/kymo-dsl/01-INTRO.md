---
title: Kymo DSL Front-End — Introduction
document_id: INTRO-KYMO-DSL-001
version: "1.1"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and reviewers of the kymo DSL parser, layout engine, alignment resolver, and renderers
review_cycle: On phase completion, or on grammar change
supersedes: null
related_documents:
  - PROD-KYMO-DSL-001        # Product description (ConOps + StRS)
  - FEAT-KYMO-DSL-001        # Requirements
  - DESIGN-KYMO-DSL-001      # Design
  - TEST-KYMO-DSL-001        # Test documentation
  - PLAN-KYMO-DSL-001        # Plan
  - DESIGN-BPMN-DSL-001      # bpmn { } block design (delegated subset)
  - KYMOJSON-MAP-001         # .kymo.json — serialization of the resolved model
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - parser
  - layout
  - alignment
  - pipeline
  - introduction
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL Front-End — Introduction

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | INTRO-KYMO-DSL-001                                          |
| Version      | 1.1                                                         |
| Status       | Released                                                    |
| Issue Date   | 2026-05-25                                                  |
| Owner        | `diagrams/` project                                         |
| Related      | PROD-FEAT-DESIGN-TEST-PLAN-KYMO-DSL-001 |

## 1. Purpose and scope

This document introduces the **kymo DSL front-end** — the `.kymo` source-to-model
pipeline that turns declarative diagram text into a fully-resolved `Diagram` the
renderers can draw. It is the entry point to the feature's document set: it states
the problem, the concept, and the terminology, and maps the reader to the
product description (PROD-KYMO-DSL-001), the requirements (FEAT-KYMO-DSL-001),
the design (DESIGN-KYMO-DSL-001), the test documentation (TEST-KYMO-DSL-001),
and the plan (PLAN-KYMO-DSL-001). The set conforms to ISO/IEC/IEEE 12207:2017
(life-cycle processes) and ISO/IEC/IEEE 15289:2019 (information-item content).

**In scope:** the file-scope grammar surface (metadata directives, leaf
components, region containers, layout containers, edges, anonymous layout trees,
comments) and the **resolution pipeline** — parse → `layout()` → `resolve_alignments()`
→ renderer hand-off — in both the Python (`packages/python`) and JavaScript
(`packages/js`) implementations.

**Out of scope (delegated):** the normative EBNF grammar and per-statement
semantics; the `bpmn { … }` block and its auto-layout
(INTRO/FEAT/DESIGN/TEST-BPMN-DSL-001); the BPMN 2.0 XML importer/exporter
(BPMN-MAP-001 and the `bpmn-parser`/`bpmn-export` sets); the `.kymo.json`
interchange format (KYMOJSON-MAP-001); and the canvas editor (`canvas-*` sets).

## 2. Background

kymostudio is a diagram-as-code product: an author writes a `.kymo` file and the
toolchain compiles it to animated SVG (plus Figma / Excalidraw / WebP). The
`.kymo` DSL is the **primary, hand-authored front-end** — the first thing a new
user touches and the most-exercised code path in the toolchain.

Its language reference already exists: KYMO-DSL-001 specifies the grammar in EBNF
(per ISO/IEC 14977:1996) and the statement-level semantics. What was missing was
the **engineering document set** — requirements, design, test, and plan — that
every other feature area in the repository carries (`bpmn-parser`, `bpmn-export`,
`bpmn-dsl`, `canvas-engine`, `canvas-editor`, `canvas-jam`, `kymo-json`). This
set fills that gap. It is **descriptive** (the front-end is shipped and in daily
use); it captures the requirements the implementation already meets, the design
it already follows, and the tests that already gate it.

## 3. Feature concept

The front-end is a **declarative pipeline**. Parsing collects elements and
validates nothing and computes no positions; later passes resolve geometry; the
renderer is deliberately *dumb* and only turns resolved data into output:

1. **Source → `Diagram`** — `dsl.py:parse()` reads line-oriented `.kymo` text and
   returns `(Diagram, layout_dict, external_dict)`. The grammar is purely
   declarative: it records directives, leaves, regions, layout frames, edges, and
   layout trees as plain dataclasses; it does not position anything.
2. **`layout.py:layout()`** — only when a DSL `layout { … }` tree (or named
   layout frame) is present; packs members of auto-layout frames into rows/cells.
3. **`alignment.py:resolve_alignments()`** — the five-pass post-parse resolver
   where positions are actually computed: auto-layouts, parent/child anchoring,
   region auto-bounds, fan-in / trunk-lane edge staggering, and auto-canvas sizing.
4. **`to_svg.py:render()`** — the SVG back-end; sibling emitters `to_figma.py`,
   `to_excalidraw.py`, `to_webp.py` consume the same resolved model.

`cli.py:load()` dispatches by file extension and wires the stages together. Two
implementations — Python (reference) and JavaScript (`dsl.ts` / `layout.ts` /
`alignment.ts`, exposed as `parse` / `parseDiagram`, rendered by `renderSVG`) —
are kept at functional parity and enforced by a golden conformance suite.

## 4. Audience

Engineers implementing or reviewing the kymo DSL parser, the layout engine, the
alignment resolver, and the Python/JS renderers; and maintainers verifying
cross-language conformance.

## 5. Terms and abbreviations

- **DSL** — the kymo domain-specific language (`.kymo`); normative grammar in KYMO-DSL-001.
- **Front-end** — the source-to-resolved-`Diagram` path (this feature), as
  opposed to the renderers (the back-end).
- **Leaf / component** — a single rendered element (a `Component`).
- **Region** — a container with a visible border + label (`outer` / `inner` / `cluster`).
- **Layout frame** — an invisible positioning container (`horizontal` / `vertical`).
- **Edge** — a connector (`-->` / `==>` / `---`) with optional anchors, waypoints, and label.
- **Layout tree** — the single-line anonymous `layout { … }` grouping construct.
- **Resolution pipeline** — `parse()` → `layout()` → `resolve_alignments()` → render.
- **Alignment pass** — one of the five stages inside `resolve_alignments()`.
- **Parity** — functional (not byte-identical) equivalence between Python and JS.

## 6. Document map

This feature's docs use a two-layer model in this folder — a **baselined spec**
(`00-PRODUCT`–`04-TEST`) and a **living plan** (`PLAN.md` + `CR/`). The documents for kymo-dsl:

| # | Document | document_id | Answers |
|---|----------|-------------|---------|
| 00 | `00-PRODUCT.md` | `PROD-KYMO-DSL-001` | *what product problem & whose needs (`SN-KYMO-DSL`)?* |
| 01 | `01-INTRO.md` | `INTRO-KYMO-DSL-001` | *where do I start?* |
| 02 | `02-FEATURE.md` | `FEAT-KYMO-DSL-001` | *what must it do? (SRS, `FR`/`NFR`)* |
| 03 | `03-DESIGN.md` | `DESIGN-KYMO-DSL-001` | *how is it built?* |
| 04 | `04-TEST.md` | `TEST-KYMO-DSL-001` | *how do we know it's right?* |
| — | `docs/specs/kymo-dsl/PLAN.md` | `PLAN-KYMO-DSL-001` | *why, in what order, at what risk, what's done? (+ `CR/`)* |

Cross-document references use **`document_id`** (never file paths); the numeric `NN-` prefixes are a
reading-order aid only. The normative grammar (EBNF + statement semantics) is **KYMO-DSL-001**; this
set references it rather than restating it.

**Change management:** a change to this baselined spec is raised as a change-request in
`docs/specs/kymo-dsl/CR/` and re-baselined (bump version + record in Annex A).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — descriptive spec set for the shipped `.kymo` front-end. |
| 1.1     | 2026-05-25 | Vũ Anh | **Doc reorganization.** §6 reworked to a document map that defers the ISO/lifecycle model to the standard and adds `00-PRODUCT` (`PROD-KYMO-DSL-001`) + a change-management pointer to `docs/specs/kymo-dsl/CR/`; §1 reading map updated to include the product description. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository at
`docs/specs/kymo-dsl/01-INTRO.md`; the authoritative source is the main-branch
working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it introduces; available to anyone
with repository read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set
(REQ/DSN/TST/PLAN) consistent; increment `version` (MAJOR/MINOR/PATCH); append a
row to Annex A.

### B.4 Backwards Compatibility
This is an informative overview; on any front-end change, reconcile it with
FEAT-KYMO-DSL-001 (the normative requirements) and KYMO-DSL-001 (the normative
grammar) before release.

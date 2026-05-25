---
title: Kymo DSL Front-End — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-KYMO-DSL-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for the kymo DSL front-end; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-KYMO-DSL-001          # Introduction
  - FEAT-KYMO-DSL-001           # Requirements (SRS derived from the needs below)
  - KYMO-DSL-001                # kymo DSL language specification (normative grammar)
  - KYMOJSON-MAP-001            # .kymo.json — serialization of the resolved model
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - kymo-dsl
  - parser
  - pipeline
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Kymo DSL Front-End — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-KYMO-DSL-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-KYMO-DSL-001`, `FEAT-KYMO-DSL-001` (the SRS derived from the needs below) |

> This doc owns the `SN-KYMO-DSL-NN`
> stakeholder needs; the SRS (`FEAT-KYMO-DSL-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

kymostudio is a diagram-as-code product: an author writes a `.kymo` file and the toolchain compiles
it to animated SVG (plus Figma / Excalidraw / WebP). The `.kymo` DSL is the **primary, hand-authored
front-end** — the first thing a new user touches and the most-exercised code path in the toolchain.
The problem it solves is that an author should describe *what* the diagram contains — components,
containers, connectors, grouping — **without hand-computing layout coordinates**; the engine resolves
geometry deterministically. Its language reference (`KYMO-DSL-001`, EBNF + statement semantics) already
exists; what this product description (and its sibling spec set) captures is the **engineering context**
the shipped front-end already satisfies.

## 2. Users & context of operations (ConOps)

- **Who:** authors of `.kymo` diagram source, and the engineers/maintainers of the parser, layout
  engine, alignment resolver, and Python/JS renderers.
- **How it operates:** the front-end is a **declarative pipeline** — parsing collects elements and
  validates nothing and computes no positions; later passes resolve geometry; the renderer is
  deliberately *dumb* and only turns resolved data into output. `parse()` → `layout()` →
  `resolve_alignments()` → renderer hand-off; `cli.py:load()` dispatches by file extension.
- **Substrate it builds on:** two implementations kept at functional parity — Python (`packages/python`,
  the reference) and JavaScript (`packages/js`, `parse`/`parseDiagram`, rendered by `renderSVG`) —
  enforced by a golden conformance suite.
- **Status:** the front-end is **shipped and in daily use**; this set is **descriptive** — it captures
  the requirements the implementation already meets.

## 3. Goals & non-goals

- **Goals:** a declarative, line-oriented `.kymo` language whose source compiles into a fully-resolved
  `Diagram` the renderers can draw; deterministic geometry resolution; functional parity across the
  Python and JavaScript implementations; the grammar dual-sourced with `KYMO-DSL-001`.
- **Non-goals (delegated):** the normative EBNF grammar and per-statement semantics (`KYMO-DSL-001`);
  the `bpmn { … }` block and its auto-layout (`FEAT-BPMN-DSL-001`); the BPMN 2.0 XML
  importer/exporter (`BPMN-MAP-001` and the `bpmn-parser`/`bpmn-export` sets); the `.kymo.json`
  interchange format (`KYMOJSON-MAP-001`); and the canvas editor (`canvas-*` sets).

## 4. Stakeholder needs (`SN-KYMO-DSL`)

| ID | Need |
|----|------|
| `SN-KYMO-DSL-01` | An author SHALL describe *what* a diagram contains — components, containers, connectors, grouping — in declarative, line-oriented `.kymo` text, **without hand-computing layout coordinates**. |
| `SN-KYMO-DSL-02` | The source SHALL compile into a **fully-resolved `Diagram`** that the renderers can draw; the engine resolves geometry, so the author never positions anything by hand. |
| `SN-KYMO-DSL-03` | Geometry resolution SHALL be **deterministic** — the same source yields the same diagram every time (byte-stable golden output). |
| `SN-KYMO-DSL-04` | The front-end SHALL behave **identically across the Python and JavaScript implementations**, so a diagram authored once renders the same in either. |

## 5. Scope

**In scope (product level):** the file-scope grammar surface (metadata directives, leaf components,
region containers, layout containers, edges, anonymous layout trees, comments) and the **resolution
pipeline** — parse → `layout()` → `resolve_alignments()` → renderer hand-off — in both the Python and
JavaScript implementations. **Out of scope (delegated):** see §3 non-goals; the SRS (`FEAT-KYMO-DSL-001`
§4) carries the detailed constraints/out-of-scope list and the `KYMO-DSL-001`/`FEAT-BPMN-DSL-001`
delegations.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-KYMO-DSL-001` §1–§3 (purpose/background/concept) and `FEAT-KYMO-DSL-001` §1 (scope & stakeholder needs); minted feature-scoped needs `SN-KYMO-DSL-01..04`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; the authoritative source is the main-branch working
tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes; available to anyone with repository read
access.

### B.3 Change Control
Changes require: update the relevant clause; keep the document set (`INTRO`/`FEAT`/`DESIGN`/`TEST`/`PLAN`)
consistent; increment `version`; append a row to Annex A. New stakeholder needs are minted here only,
through a baseline or an approved change-request.

### B.4 Backwards Compatibility
This is the product context; on any front-end change, reconcile it with `FEAT-KYMO-DSL-001` (the
normative requirements) and `KYMO-DSL-001` (the normative grammar) before release.

---
title: kymo — Diagram-as-Code Source Format
document_id: KYMO-FMT-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers and authors using or maintaining the .kymo source format and its tooling
review_cycle: On grammar change, or on format-identification change
supersedes: null
related_documents:
  - INTRO-KYMO-DSL-001          # Front-end engineering doc set — introduction
  - FEAT-KYMO-DSL-001           # Front-end requirements
  - DESIGN-KYMO-DSL-001         # Front-end design
  - TEST-KYMO-DSL-001           # Front-end test documentation
  - KYMOJSON-MAP-001            # .kymo.json — serialization of the resolved model this format produces
  - BPMN-MAP-001                # BPMN 2.0 import/export (the other front-end + a back-end)
authors:
  - Vũ Anh
language: en
keywords:
  - kymo
  - dsl
  - source format
  - diagram-as-code
  - file format
  - interchange
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo — Diagram-as-Code Source Format

| Field             | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| Document ID       | KYMO-FMT-001                                                      |
| Version           | 1.0                                                              |
| Issue Date        | 2026-05-24                                                       |
| Status            | Released                                                         |
| Classification    | Internal                                                        |
| Owner             | `diagrams/` project                                             |
| Audience          | Engineers and authors using or maintaining the `.kymo` format    |
| Review Cycle      | On grammar change, or on format-identification change            |
| Supersedes        | —                                                               |
| Related Documents | `INTRO-`FEAT-`DESIGN-`TEST-`KYMOJSON-MAP-001`, `BPMN-MAP-001` |

`.kymo` is kymo's **hand-authored, diagram-as-code source format** — a line-oriented
text file that declares a diagram (components, containers, connectors, grouping)
and compiles to a fully-resolved model the renderers turn into animated SVG (plus
Figma / Excalidraw / WebP). This document is the **format-catalog reference** for
`.kymo`: it identifies the format and surveys its structure and tooling. The
**normative grammar and per-statement semantics are KYMO-DSL-001** (EBNF per
ISO/IEC 14977:1996); the engineering requirements/design/test set is
INTRO/FEAT/DESIGN/TEST/PLAN-KYMO-DSL-001. This reference is **non-normative for the
grammar** — on any conflict, KYMO-DSL-001 governs.

```bash
kymo path/to/diagram.kymo                 # compile → path/to/diagram.svg
kymo path/to/diagram.kymo --animate       # → diagram-animated.svg (flowing edges)
kymo path/to/diagram.kymo --figma         # → diagram.figma.js (Figma Plugin API)
kymo path/to/diagram.kymo --excalidraw    # → diagram.excalidraw (scene v2)
kymo path/to/diagram.kymo --json          # → diagram.kymo.json (resolved model)
```

## Format identification

`.kymo` is a **specialization of UTF-8 plain text** — a domain-specific textual
format, the way `.kymo.json` (KYMOJSON-MAP-001) is a specialization of JSON and
`.bpmn` (BPMN-MAP-001) is a specialization of XML. It carries no magic number and
is identified **by file extension**.

| Property | Value |
|----------|-------|
| Format name | kymo diagram-as-code source |
| File extension | `.kymo` |
| Base format | UTF-8 plain text, line-oriented (LF) |
| Character encoding | UTF-8 (no BOM); Latin + Vietnamese diacritics expected |
| Media type | none registered with IANA; `text/plain; charset=utf-8` in transit, or the unregistered convention `text/vnd.kymo` |
| Identification | by `.kymo` extension (no signature/magic bytes) |
| Structure | a sequence of statements, one per logical line; `{ … }` blocks nest |
| Normative grammar | KYMO-DSL-001 (EBNF, ISO/IEC 14977:1996) |
| Conformance | a file is conforming iff it parses under KYMO-DSL-001's grammar |

## Structure at a glance

A `.kymo` file is a sequence of statements; the parser disambiguates each by line
shape (KYMO-DSL-001 §6.6), validates nothing, and computes no positions —
resolution happens in later pipeline passes (DESIGN-KYMO-DSL-001). The statement
categories (full grammar + semantics in the cited KYMO-DSL-001 clauses):

| Category | Surface | KYMO-DSL-001 |
|----------|---------|--------------|
| Metadata directives | `canvas W x H`, `title:`, `subtitle:`, `external … above …` | §6.3 |
| Leaf component | `<id> <shape>/<icon>/<accent> "Name" "Sub" [@ placement]` | §6.4 |
| Region container | `<id> (outer\|inner\|cluster) "Label" [opts] { … }` | §6.5 |
| Layout container | `<id> (horizontal\|vertical) pos (x,y) gap N { … }` | §6.5 |
| Edge | `<src> (-->\|==>\|---) <dst> [: "Label"] [{ opts }]` | §6.7 |
| BPMN process block | `bpmn { … }` (declare-then-connect; auto-laid-out) | §6.9 |
| Anonymous layout tree | `layout { a \| b , c }` (`\|` horizontal, `,` vertical) | §6.10 |
| Comment | `#` to end of line (a `#`-then-hex-digit is a colour literal) | §6.4, §6.6 |

Example (informative):

```
title: "Order service"
canvas 900 x 360

gw   hex/gateway/blue "API Gateway" "edge"
svc  box/service/green "Order service" "core" @ gw right 120
db   cylinder/database/orange "Orders DB" "" @ svc right 120

gw --> svc : "POST /orders"
svc --> db : "persist"
```

## Where it sits

`.kymo` is one of three file formats kymo reads, and the only **hand-authored**
one. All three converge on the same resolved `Diagram` model:

| Format | Doc | Role |
|--------|-----|------|
| `.kymo` | **KYMO-FMT-001** (this) / KYMO-DSL-001 | authored diagram-as-code source (front-end) |
| `.kymo.json` | KYMOJSON-MAP-001 | lossless serialization of the resolved model (interchange / IR) |
| `.bpmn` | BPMN-MAP-001 | BPMN 2.0 XML import (a second front-end) and export (a back-end) |

Pipeline: `.kymo` source → `parse()` → `layout()` → `resolve_alignments()` →
resolved `Diagram` → renderer (SVG / Figma / Excalidraw / WebP). `cli.py:load()`
dispatches by extension; `.bpmn` and `.kymo.json` arrive already resolved and skip
the layout/alignment passes. See DESIGN-KYMO-DSL-001 for the full pipeline.

## Tooling

- **CLI** (Python, `kymo`) — `kymo <file>.kymo [--animate|--figma|--excalidraw|--json]`;
  output is written next to the input.
- **Python** — `from kymo import parse, render` (`parse(text)` → `Diagram`,
  `render(diagram)` → SVG).
- **JavaScript** — `parse` / `parseDiagram` and `renderSVG` (`packages/js`,
  dependency-free ESM).
- **VS Code** — the `packages/vscode-extension` bundles the JS engine for
  in-editor `.kymo` / `.bpmn` preview.

## Scope and normative references

- **Normative grammar & semantics:** KYMO-DSL-001 (EBNF per ISO/IEC 14977:1996).
- **Engineering set:** INTRO/FEAT/DESIGN/TEST/PLAN-KYMO-DSL-001.
- **Serialized model:** KYMOJSON-MAP-001 (`.kymo.json`).
- **BPMN interchange:** BPMN-MAP-001 (`.bpmn` import/export).
- This document is a **catalog reference**, non-normative for the grammar; it does
  not restate the EBNF. There is no model → `.kymo` back-emitter (a resolved model
  serializes to `.kymo.json`, not back to authored `.kymo` text).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — `.kymo` format-catalog reference (identification, structure survey, tooling); grammar delegated to KYMO-DSL-001. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the format it documents; available to all repository
readers.

### B.3 Change Control
On a format-identification or structure-survey change: update the affected clause;
keep it consistent with KYMO-DSL-001 (which governs the grammar) and the
KYMO-DSL-001 engineering set; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This is an informative catalog reference; the normative surface is KYMO-DSL-001.
Reconcile any grammar-affecting change there before release.

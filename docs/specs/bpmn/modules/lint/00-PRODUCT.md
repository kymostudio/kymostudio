---
title: BPMN Lint — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Anyone needing the product context for the kymo BPMN linter; stakeholders, reviewers, CI maintainers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-LINT-001
  - FEAT-BPMN-LINT-001        # the SRS derived from the needs below
  - DESIGN-BPMN-LINT-001
  - TEST-BPMN-LINT-001
  - PLAN-BPMN-LINT-001
  - PROD-BPMN-PARSER-001      # the .bpmn → Diagram importer this complements
  - DESIGN-BPMN-PARSER-001    # importer internals (what it silently drops)
  - BPMN-MAP-001              # BPMN element → kymo mapping
  - BPMN-NREF-001             # BPMN 2.0 normative-spec mirror set
  - FEAT-BPMN-EXPORT-001      # exporter sibling (round-trip context)
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - lint
  - import-fidelity
  - diagram-interchange
---

# BPMN Lint — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-LINT-001` |
| Version           | 1.0 |
| Status            | Baselined |
| Owner             | `packages/python` (kymo CLI) |
| Related Documents | `INTRO-BPMN-LINT-001`, `FEAT-BPMN-LINT-001` (the SRS derived from the needs below), `DESIGN-BPMN-LINT-001`, `PROD-BPMN-PARSER-001` (the importer this complements), `BPMN-MAP-001` |

> This doc owns the `SN-LINT-NN` stakeholder needs; the SRS (`FEAT-BPMN-LINT-001`)
> derives `FR-LINT`/`NFR-LINT` from them.

## 1. Problem & motivation

kymo imports `.bpmn` **purely from its Diagram-Interchange (DI) geometry**: the importer
(`PROD-BPMN-PARSER-001`, internals in `DESIGN-BPMN-PARSER-001`) reads `<bpmndi:BPMNShape>`
bounds and `<bpmndi:BPMNEdge>` waypoints and maps them to kymo elements per `BPMN-MAP-001`. A
semantic element with **no DI**, or with **degenerate DI** — a shape with no `<dc:Bounds>`, an
edge with fewer than two waypoints — has no geometry to place, so the importer **silently drops
it**. The render still succeeds and produces a valid SVG; it is simply *missing* nodes or
flows, with no diagnostic emitted.

The consequence is that a user handed a third-party `.bpmn` **cannot distinguish a faithful
import from a lossy one** by looking at the output. The file might be perfectly valid BPMN yet
render as a partial picture, and nothing in the pipeline says so.

**Lint ≠ schema validation.** This feature is *not* an XSD/well-formedness gate for "is this
legal BPMN 2.0" (that is the domain of `bpmn-moddle` and the OMG schema, `BPMN-NREF-001`). It is
a **renderer-fidelity check** answering a narrower, kymo-specific question — *"will this file
render faithfully in kymo's DI-driven importer, and is it sane as a process graph?"* — plus a
handful of ordinary modelling-mistake checks (dangling references, missing start/end,
disconnected nodes) that are cheap to surface alongside.

## 2. Operational concept

- **Who:** anyone about to render a `.bpmn` they did not author — engineers, reviewers — and
  CI pipelines that ingest BPMN from external authoring tools.
- **When:** **before rendering** (a quick "is this going to come through clean?" pre-flight) or
  **in CI** as an advisory step over a corpus of `.bpmn` sources.
- **UX:** a dedicated subcommand, `kymo lint <file.bpmn> [<file.bpmn> ...]`. It is the first
  positional subcommand in the CLI (otherwise `kymo <file> [--flags]`), and is **Python-package
  only** — the JS package is library-only with no CLI.
- **Output:** one finding per line, ruff/gcc-style and column-aligned —
  `‹path›:‹line›  ‹severity›  ‹id› '‹name›' ‹message›` — followed by a blank line and an
  `N errors, M warnings` summary. A clean file prints `‹path›: ✓ no issues`. Severities are
  `error | warn`.
- **Informational, always exit 0.** Lint results never change the exit code; the linter reports
  and gets out of the way. Only **usage errors** (file not found, a non-`.bpmn` suffix, an empty
  argument list) print a message and exit 1. Malformed XML is reported as a single `error`
  finding (still exit 0), not a crash. This makes the command safe to drop into any script or CI
  job without it ever breaking the pipeline.

## 3. Stakeholder needs (`SN-LINT`)

This document **owns** the stakeholder needs below; `FEAT-BPMN-LINT-001` derives the `FR-LINT`
functional requirements from them.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-LINT-01` | Before rendering a third-party `.bpmn`, a user must be able to learn whether it will render **faithfully** or **silently lose** elements. | The DI-driven importer drops un-rendered elements without a word (§1); the user otherwise has no way to tell a complete picture from a partial one. |
| `SN-LINT-02` | Each problem must point at the **exact source line**. | Findings are only actionable if the user can jump straight to the offending element in the XML; a problem without a location forces a manual hunt. |
| `SN-LINT-03` | The check must run inside the **existing Python CLI** with **no extra dependency** (stdlib only). | kymo's distribution and supply-chain posture are kept lean; a linter that pulled in a parser/schema library would be a disproportionate cost for an advisory tool. |
| `SN-LINT-04` | It must be **safe to run in scripts/CI** — it must not break the pipeline. | An advisory pre-flight that can fail a build (or crash on bad input) would not be adopted; informational, always-exit-0 behaviour makes it droppable anywhere. |
| `SN-LINT-05` | It must also catch **basic BPMN modelling mistakes** — missing start/end, disconnected nodes, dangling refs — not only render issues. | Reference and graph-sanity defects are cheap to detect on the same parse and are common in hand-edited files; surfacing them alongside fidelity issues makes the one command worth running. |

## 4. Competitive landscape

The de-facto standard is **[bpmnlint](https://github.com/bpmn-io/bpmnlint)** (bpmn.io /
Camunda): ~27 configurable JavaScript rules, presets (`recommended`/`all`/`correctness`), a
`bpmnlint-plugin-*` ecosystem, and a CLI plus live editor markers via `bpmn-js-bpmnlint`. It
operates on the **semantic moddle model**, so it is intentionally **renderer-agnostic**.

| Tool / class | Operates on | Catches | Relation to kymo lint |
|---|---|---|---|
| **bpmnlint** | semantic moddle model | start/end-required, no-disconnected, implicit start/end, superfluous gateway, missing DI (`no-bpmndi`) | Overlaps on modelling sanity; does **not** check DI-degeneracy or dangling refs (renderer-agnostic). |
| **bpmn-moddle** / OMG XSD | XML schema | well-formedness, schema conformance | Schema validation, not fidelity — orthogonal (`BPMN-NREF-001`, [OMG BPMN 2.0](https://www.omg.org/spec/BPMN/2.0.2/)). |
| Signavio modelling conventions | enterprise model repo | naming/governance conventions | Enterprise governance; out of band for a CLI pre-flight. |
| jBPM / Flowable / Activiti | execution model | execution-readiness (engine-compat) | Execution bar, not rendering — a different question entirely. |

**Overlap** (kymo ≈ bpmnlint): `LR-PR-01/02` ≈ `start-event-required`/`end-event-required`;
`LR-GR-01` ≈ `no-disconnected`; `LR-GR-07..10` ≈ `no-implicit-start`/`no-implicit-end`;
`LR-GR-11` ≈ `superfluous-gateway`; `LR-DI-03` ≈ `no-bpmndi`.

**kymo-unique value:** `LR-DI-01/02/04` (DI present-but-degenerate — the exact failure mode the
importer drops on) and `LR-REF-01` (dangling `sourceRef`/`targetRef`). bpmnlint checks none of
these because it never looks at geometry.

**Known gaps vs bpmnlint:** not configurable; ~10 rule families vs ~27 rules; no
execution-readiness; no XSD conformance; no editor integration; Python-only.

**Positioning.** kymo lint is a **renderer-fidelity linter** for the BPMN → SVG (DI-driven)
pipeline — **complementary to bpmnlint, not a replacement**. Use bpmnlint for breadth and
configurability of semantic rules; use `kymo lint` to answer the one question bpmnlint cannot:
*will this specific file render in kymo?* See the **BPMN Lint & Validation Tooling research
note** (`docs/research/bpmn-lint/`) for the full prior-art survey.

## 5. Scope & non-goals

**In scope (product level)** — for `.bpmn` input only:

- **Import-fidelity (DI) checks** — the kymo-unique value: shapes/edges that the DI-driven
  importer would silently drop (`LR-DI-01..05`).
- **Reference-integrity checks** — dangling or missing `sourceRef`/`targetRef`
  (`LR-REF-01..02`).
- **Graph-sanity checks** — disconnected nodes, missing/excess incoming/outgoing flows,
  redundant gateways, start/end-event placement, and process-level start/end presence
  (`LR-GR-01..12`, `LR-PR-01..02`), plus a well-formedness fallback (`LR-XML-01`).

**Out of scope (for now)** — each forwarded to a change-request in `PLAN-BPMN-LINT-001`:

- **Configurability** — rc-file rule on/off, per-rule severity, presets (`CR-BPMN-LINT-002`).
- **Execution-readiness** — engine/Camunda-compatibility checks (no CR; not a kymo goal).
- **XSD / schema conformance** — that is `bpmn-moddle` / the OMG schema (`BPMN-NREF-001`), not a
  fidelity linter.
- **Broader bpmnlint-parity rules** — `no-implicit-split`, `no-duplicate-sequence-flows`,
  `label-required` (`CR-BPMN-LINT-003`).
- **JS / editor integration** — a JS `lintBpmn()` port and VS Code diagnostics via the
  `bpmn-editor` engine (`CR-BPMN-LINT-004`); machine-readable `--json` output and an opt-in
  CI-gating exit-code mode (`CR-BPMN-LINT-005`).

See `FEAT-BPMN-LINT-001` §4 for the requirement-level scope.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial baseline. Documents the **as-built** `kymo lint <file.bpmn>` linter (`packages/python/src/kymo/lint_bpmn.py` + CLI subcommand). Owns `SN-LINT-01..05`. Establishes the renderer-fidelity-linter positioning vs `bpmnlint`. |

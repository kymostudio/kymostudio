---
title: BPMN Lint — Requirements
document_id: FEAT-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers implementing and verifying the kymo BPMN linter; integrators consuming the lint API
review_cycle: On CR completion, or on importer/renderer change affecting render fidelity
supersedes: null
related_documents:
  - PROD-BPMN-LINT-001      # Product description (stakeholder needs SN-LINT-NN)
  - INTRO-BPMN-LINT-001     # Introduction
  - DESIGN-BPMN-LINT-001    # Design
  - TEST-BPMN-LINT-001      # Test documentation (traceability matrix)
  - PLAN-BPMN-LINT-001      # Plan (change-requests)
  - DESIGN-BPMN-PARSER-001  # The .bpmn → Diagram importer this linter mirrors
  - FEAT-BPMN-EXPORT-001    # BPMN exporter sibling
  - BPMN-MAP-001            # BPMN element → kymo mapping
  - BPMN-NREF-001           # BPMN 2.0 normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - validation
  - import-fidelity
  - di
  - requirements
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-LINT-001                                 |
| Version      | 1.0                                                |
| Status       | Baselined                                          |
| Issue Date   | 2026-06-05                                         |
| Owner        | `packages/python` (kymo CLI)                       |
| Related      | PROD-BPMN-LINT-001 (stakeholder needs), INTRO-BPMN-LINT-001, DESIGN-BPMN-LINT-001, TEST-BPMN-LINT-001, PLAN-BPMN-LINT-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-BPMN-LINT-001; the rule registry (§3) is
the normative catalogue those requirements detect. Concept: INTRO-BPMN-LINT-001; realisation:
DESIGN-BPMN-LINT-001.

## 1. Scope and stakeholder needs

Stakeholder needs (`SN-LINT-01..05`, ISO 29148 §6.4.2 ConOps) are owned by **PROD-BPMN-LINT-001**;
each requirement traces back via the **Source need** annotation. They are not restated here.

**Scope (this SRS):** specify a `kymo lint <file.bpmn>` command that reads **raw BPMN 2.0 XML** and
reports two classes of problem — (a) **import-fidelity** issues that the kymo importer
(DESIGN-BPMN-PARSER-001) silently drops, so a file "looks fine" but renders incompletely, and
(b) ordinary **BPMN modelling** mistakes (dangling refs, disconnected nodes, missing start/end). The
linter is **informational**: it never changes exit status on findings, so it is safe in CI. It is a
**renderer-fidelity linter** for the BPMN→SVG (DI-driven) pipeline, complementary to the de-facto
[bpmnlint](https://github.com/bpmn-io/bpmnlint), not a replacement. Configurability, a JS port, and
machine-readable output are out of baseline scope (§6).

## 2. Functional requirements

- **FR-LINT-1** The feature SHALL accept `kymo lint <file.bpmn> [<file.bpmn> ...]` and report findings
  per file.
  *Clarification:* `lint` is the first positional subcommand of the otherwise `kymo <file> [--flags]`
  CLI; multiple files are linted independently and reported in argument order.
  *Source need:* SN-LINT-01, SN-LINT-05.

- **FR-LINT-2** The feature SHALL operate on the **raw BPMN XML** (not the imported `Diagram`) and
  detect import-fidelity issues **LR-DI-01..05** that the importer (DESIGN-BPMN-PARSER-001) silently
  drops.
  *Clarification:* working pre-import is the only way to flag DI that is present but degenerate
  (e.g. a `<BPMNShape>` with no `<dc:Bounds>`), which the importer discards before a `Diagram` exists.
  *Source need:* SN-LINT-01.

- **FR-LINT-3** The feature SHALL detect reference-integrity issues **LR-REF-01..02**.
  *Clarification:* dangling `sourceRef`/`targetRef` on `sequenceFlow`/`messageFlow`/`association`
  (`LR-REF-01`, error) and missing such attributes (`LR-REF-02`, warn).
  *Source need:* SN-LINT-05.

- **FR-LINT-4** The feature SHALL detect graph-sanity issues **LR-GR-01..12** and process-level issues
  **LR-PR-01..02**.
  *Clarification:* disconnected nodes, implicit start/end, redundant gateways, boundary-event
  connectivity, and processes missing a start or end event — see §3.
  *Source need:* SN-LINT-05.

- **FR-LINT-5** Each finding SHALL carry a **1-based source line** and SHALL be printed as
  `path:line  severity  message`.
  *Clarification:* line numbers are recovered by re-scanning the text with `xml.parsers.expat` and
  zipping its document-order element stream against `root.iter()`; DI findings carry the **DI
  element's** line (see NFR-LINT-4).
  *Source need:* SN-LINT-02.

- **FR-LINT-6** Lint results SHALL **always exit 0**; only usage errors SHALL exit non-zero.
  *Clarification:* findings (errors or warnings) are informational and never fail the process; usage
  errors — empty argument list, file not found, non-`.bpmn` suffix — print a message and exit 1.
  *Source need:* SN-LINT-04.

- **FR-LINT-7** A clean file SHALL print `path: ✓ no issues`; otherwise the report SHALL end with an
  `N errors, M warnings` summary.
  *Clarification:* one finding per line, ruff/gcc-style and column-aligned, then a blank line, then the
  count summary; counts come from `counts()`.
  *Source need:* SN-LINT-02, SN-LINT-04.

- **FR-LINT-8** Malformed XML SHALL be reported as a **single error finding (LR-XML-01)** carrying its
  line, and SHALL NOT raise.
  *Clarification:* an `ElementTree.ParseError` is caught and converted to one `LR-XML-01` finding using
  `ParseError.position` for the line.
  *Source need:* SN-LINT-04.

## 3. The rule set

This is the **normative catalogue** of rules. Each rule emits a `Finding` with the listed severity and
message; the **FR** column traces the rule to the requirement that mandates its detection. Namespaces
are ignored throughout (matching on the local tag name), so the linter is agnostic to the
`bpmn:` / `bpmn2:` prefix, like the importer.

### 3.1 Import-fidelity (DI) — the kymo-unique value

Answers "will this file render in kymo's DI-driven importer?". bpmnlint does not check most of these
because it is renderer-agnostic.

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-DI-01 | warn | `shape missing <dc:Bounds> (will not render)` | a `<BPMNShape>` with no `<dc:Bounds>` | FR-LINT-2 |
| LR-DI-02 | warn | `edge has fewer than 2 waypoints (will not render)` | a `<BPMNEdge>` with `< 2` `<di:waypoint>` | FR-LINT-2 |
| LR-DI-03 | warn | `has no DI shape (will not render)` | a visible semantic node with no `<BPMNShape>` | FR-LINT-2 |
| LR-DI-04 | warn | `has no DI edge (will not render)` | a flow with no `<BPMNEdge>` | FR-LINT-2 |
| LR-DI-05 | warn | `BPMNShape/BPMNEdge references unknown element` / `… has no bpmnElement` | DI pointing at a missing/empty `bpmnElement` | FR-LINT-2 |

### 3.2 Reference integrity

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-REF-01 | error | `‹kind›Ref '‹id›' not found` | `sequenceFlow`/`messageFlow`/`association` `sourceRef`/`targetRef` dangling | FR-LINT-3 |
| LR-REF-02 | warn | `has no ‹kind›Ref` | flow missing a `sourceRef`/`targetRef` attribute | FR-LINT-3 |

### 3.3 Graph sanity (semantic)

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-GR-01 | error (activity/gateway) / warn (event) | `is not connected to any flow` | no incoming **and** no outgoing flow | FR-LINT-4 |
| LR-GR-02 | warn | `start event has an incoming flow` | start event with an incoming flow | FR-LINT-4 |
| LR-GR-03 | warn | `start event has no outgoing flow` | start event with no outgoing flow | FR-LINT-4 |
| LR-GR-04 | warn | `end event has an outgoing flow` | end event with an outgoing flow | FR-LINT-4 |
| LR-GR-05 | warn | `end event has no incoming flow` | end event with no incoming flow | FR-LINT-4 |
| LR-GR-06 | warn | `boundary event has no outgoing flow` | boundary event with no outgoing flow | FR-LINT-4 |
| LR-GR-07 | error | `has no incoming sequence flow` | activity with no incoming sequence flow | FR-LINT-4 |
| LR-GR-08 | error | `has no outgoing sequence flow` | activity with no outgoing sequence flow | FR-LINT-4 |
| LR-GR-09 | error | `has no incoming sequence flow` | gateway with no incoming sequence flow | FR-LINT-4 |
| LR-GR-10 | error | `has no outgoing sequence flow` | gateway with no outgoing sequence flow | FR-LINT-4 |
| LR-GR-11 | warn | `gateway has a single incoming and outgoing flow (redundant)` | redundant gateway | FR-LINT-4 |
| LR-GR-12 | warn | `has no incoming flow` / `has no outgoing flow` | intermediate catch/throw event missing a flow | FR-LINT-4 |

### 3.4 Process

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-PR-01 | warn | `process has no start event` | a `<process>` with no `startEvent` descendant | FR-LINT-4 |
| LR-PR-02 | warn | `process has no end event` | a `<process>` with no `endEvent` descendant | FR-LINT-4 |

### 3.5 Well-formedness

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-XML-01 | error | `not well-formed XML: ‹detail›` | input that ElementTree cannot parse | FR-LINT-8 |

### 3.6 Connectivity nuance (normative)

- **Directional checks** (LR-GR-02..05, LR-GR-07..12) count **sequence flows only**: a start event's
  outgoing, an activity's incoming/outgoing, etc. are sequence-flow connectivity.
- The **fully-disconnected check** (LR-GR-01) counts **sequence + message** flows, so a node reachable
  only by a message flow is **not** falsely flagged as disconnected; it is, however, still subject to
  the directional sequence-flow checks above.
- **Boundary events** attach to a host activity (no incoming sequence flow is expected), so only their
  **outgoing** is checked (LR-GR-06); they are exempt from incoming-flow rules.

## 4. Non-functional requirements

- **NFR-LINT-1** **Stdlib only.** The linter SHALL add no new runtime or dev dependency, using only
  `xml.etree.ElementTree` (semantic parse) and `xml.parsers.expat` (line mapping). *(Source need:
  SN-LINT-03.)*
- **NFR-LINT-2** **Deterministic order.** Findings SHALL be emitted in a stable, document-order
  sequence, making the output suitable for golden tests.
- **NFR-LINT-3** **Informational severity model.** Severities SHALL be exactly `{error, warn}`; the
  linter SHALL NOT auto-fix and SHALL NOT mutate the input.
- **NFR-LINT-4** **DI line attribution.** A DI finding SHALL carry the **DI element's** source line
  (e.g. a missing-`<dc:Bounds>` finding points at the `<BPMNShape>`, not the semantic element).
- **NFR-LINT-5** **Parity (deferred).** The JS package has no CLI; the rule logic MAY later be ported
  as a JS `lintBpmn()` to drive `bpmn-editor` diagnostics (CR; see §6 and PLAN-BPMN-LINT-001).

## 5. Interfaces & output contract

### 5.1 CLI surface

```
kymo lint <file.bpmn> [<file.bpmn> ...]
```

`lint` is the first positional subcommand of the kymo CLI; **Python package only** (the JS package is
library-only with no CLI). Each argument is linted independently; per-file reports are joined by a
blank line.

### 5.2 Exit-code contract

| Outcome | Exit |
|---------|------|
| Linting completed (with or without findings) | **0** |
| Usage error: empty argument list, file not found, or non-`.bpmn` suffix | **1** |

### 5.3 Output line format

One finding per line, ruff/gcc-style and column-aligned:

```
‹path›:‹line›  ‹severity›  ‹id› '‹name›' ‹message›
```

The `‹id› '‹name›'` who-prefix is omitted when absent. After the findings, a blank line then the
summary `N errors, M warnings` (singular/plural agreement). A file with no findings prints
`‹path›: ✓ no issues` instead.

### 5.4 Public Python API

Module `kymo.lint_bpmn` (re-exported from `kymo` as `lint_bpmn`):

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `Finding` | `Finding(severity, eid, name, message, line=0)` | frozen dataclass for one finding |
| `lint` | `lint(xml_text: str) -> list[Finding]` | lint raw XML; returns ordered findings |
| `lint_file` | `lint_file(path: Path) -> list[Finding]` | read a file, then `lint` it |
| `counts` | `counts(findings) -> tuple[int, int]` | `(error_count, warning_count)` |
| `format_report` | `format_report(label, findings) -> str` | render the §5.3 report for one file |

## 6. Future requirements (change-requests)

Forward-looking deltas are proposed (not built) and specified in PLAN-BPMN-LINT-001:

- **CR-BPMN-LINT-002** — configurable rules (rc-file on/off + per-rule severity, presets).
- **CR-BPMN-LINT-003** — more bpmnlint-parity rules (`no-implicit-split`,
  `no-duplicate-sequence-flows`, `label-required`).
- **CR-BPMN-LINT-004** — JS port (`lintBpmn()`) + VS Code diagnostics via the `bpmn-editor` engine
  (realises NFR-LINT-5).
- **CR-BPMN-LINT-005** — `--json` machine-readable output and an opt-in `--max-severity` / exit-code
  mode for CI gating.

See PLAN-BPMN-LINT-001 for the full CR statements; requirement IDs in this SRS are stable and a
withdrawn requirement SHALL be marked withdrawn rather than re-used.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial as-built SRS (`FR-LINT-1..8`, `NFR-LINT-1..5`); normative rule registry `LR-*`; interfaces & output contract; CR roadmap (`CR-BPMN-LINT-002..005`, Proposed). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/02-FEATURE.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
`TEST-BPMN-LINT-001`'s traceability matrix; increment `version`; append a row to Annex A. A delivery
increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.

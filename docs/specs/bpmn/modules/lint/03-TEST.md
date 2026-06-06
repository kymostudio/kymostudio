---
title: BPMN Lint — Test Documentation
document_id: TEST-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers verifying the kymo BPMN linter
review_cycle: On CR completion, or on rule-registry / CLI change
supersedes: null
related_documents:
  - FEAT-BPMN-LINT-001      # Requirements (FR/NFR, traced below)
  - DESIGN-BPMN-LINT-001    # Design
  - PLAN-BPMN-LINT-001      # Plan / change-requests
  - DESIGN-BPMN-PARSER-001  # Importer whose silent drops this linter surfaces
  - BPMN-MAP-001            # BPMN element mapping
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - import-fidelity
  - stdlib
  - test
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Test Documentation

| Field       | Value                                                              |
|-------------|-------------------------------------------------------------------|
| Document ID | TEST-BPMN-LINT-001                                                |
| Version     | 1.0                                                               |
| Status      | Baselined                                                         |
| Issue Date  | 2026-06-05                                                        |
| Owner       | `packages/python` (kymo CLI)                                      |
| Related     | FEAT-BPMN-LINT-001, DESIGN-BPMN-LINT-001, PLAN-BPMN-LINT-001 |

Verifies FEAT-BPMN-LINT-001 (FR-LINT-1..8, NFR-LINT-1..5). Covers the ISO/IEC/IEEE 12207:2017
Verification & Validation processes. This document **owns** test cases TC-LINT-01..10. The headline
properties under test are: **import-fidelity detection** (the DI rules the importer
DESIGN-BPMN-PARSER-001 silently drops), **exact source-line mapping**, **always-exit-0 behaviour**,
and **deterministic, golden-friendly output**.

## 1. Test approach and levels

- **Level — unit.** All cases exercise the module API directly (`lint(xml_text)`,
  `counts(findings)`, `format_report(label, findings)`); no subprocess, no filesystem beyond the one
  committed fixture. Each case constructs an in-memory XML string (or reads the fixture) and asserts
  on the returned `Finding` set.
- **Style — deterministic, golden-friendly.** Findings are emitted in document order
  (NFR-LINT-2), so assertions compare exact `(severity, eid, message)` tuples and exact 1-based
  line numbers — values that are stable across runs and therefore suitable for golden comparison.
- **Severity / line precision.** Cases assert both the rule's severity (`error` | `warn`) and, where
  load-bearing, the precise line — including that DI findings carry the **DI element's** line, not the
  semantic element's (NFR-LINT-4).
- **CI gating.** The suite runs in `.github/workflows/test.yml`, which first runs
  `ruff check src tests` and only then `pytest`. A lint (ruff) failure or any pytest failure fails the
  build.

## 2. Test items, environment, tooling

| Item              | Value                                                                  |
|-------------------|------------------------------------------------------------------------|
| Module under test | `kymo.lint_bpmn` (exported from `kymo` as `lint_bpmn`)                  |
| API surface       | `lint`, `lint_file`, `counts`, `format_report`, `Finding`, `ERROR`, `WARN` |
| Dependencies      | Python standard library only (`xml.etree.ElementTree`, `xml.parsers.expat`) — NFR-LINT-1 |
| Runtime           | Python ≥ 3.13, managed with `uv`                                        |
| Test file         | `packages/python/tests/test_lint_bpmn.py` (12 tests)                    |
| Fixture           | `packages/python/tests/fixtures/bpmn/no_di.bpmn` (semantic graph, no DI plane) |
| Inline fixtures   | `CLEAN` (start → task → end, full DI) and `BROKEN` (well-formed XML, multiple graph + DI faults) defined in the test module |
| Command           | `uv run --group dev python -m pytest tests/test_lint_bpmn.py -q`        |
| Lint gate         | `ruff check src tests`                                                  |

## 3. Test cases

The suite has **12 tests** in total; this section enumerates the ten owned cases TC-LINT-01..10.
(The two further tests are inspection-grade reinforcements: an additional single-finding malformed-XML
assertion and the clean-report `✓ no issues` string check, both folded into the criteria below.)

| ID | Intent | Input | Expected finding(s) / rule | Exit | Covers |
|----|--------|-------|----------------------------|------|--------|
| **TC-LINT-01** | Clean file produces nothing | `CLEAN` (start→task→end, full DI) | `lint() == []`; `counts() == (0, 0)`; report `✓ no issues` | 0 | FR-LINT-7 |
| **TC-LINT-02** | Dangling `targetRef` is an error at the flow's line | `BROKEN` flow `F9` → `targetRef="Node_X"` | `error` **LR-REF-01** `F9 "targetRef 'Node_X' not found"` at line 11 | 0 | FR-LINT-3, FR-LINT-5 |
| **TC-LINT-03** | Start event with an incoming flow warns | `BROKEN` (`Floop` targets start `S`) | `warn` **LR-GR-02** `S "start event has an incoming flow"` | 0 | FR-LINT-4 |
| **TC-LINT-04** | Gateway with no incoming sequence flow is an error | `BROKEN` gateway `G` | `error` **LR-GR-09** `G "has no incoming sequence flow"` at line 9 | 0 | FR-LINT-4 |
| **TC-LINT-05** | `<BPMNShape>` without `<dc:Bounds>` warns at the SHAPE line | `BROKEN` shape for `G` (no `<dc:Bounds>`) | `warn` **LR-DI-01** `G "shape missing <dc:Bounds> (will not render)"` at line **17** (DI line, not semantic line 9) | 0 | FR-LINT-2, FR-LINT-5; NFR-LINT-4 |
| **TC-LINT-06** | Flow with no `<BPMNEdge>` warns | `BROKEN` flow `F9` (no DI edge) | `warn` **LR-DI-04** `F9 "has no DI edge (will not render)"` | 0 | FR-LINT-2 |
| **TC-LINT-07** | Process with no end event warns | `BROKEN` process `P` | `warn` **LR-PR-02** `P "process has no end event"` | 0 | FR-LINT-4 |
| **TC-LINT-08** | No-DI fixture flags every node and every flow | `tests/fixtures/bpmn/no_di.bpmn` | `warn` **LR-DI-03** per node (e.g. `S "has no DI shape (will not render)"`) + `warn` **LR-DI-04** per flow (e.g. `F0`); **all** findings `warn` | 0 | FR-LINT-2 |
| **TC-LINT-09** | Malformed XML → single error carrying a line | `"<a>\n  <b>\n"` (unclosed) | exactly one finding, `severity == ERROR`, `line ≥ 1` (**LR-XML-01**) | 0 | FR-LINT-8 |
| **TC-LINT-10** | Counts + report summary | `BROKEN` | `counts() == (2, ≥1)`; report contains `broken.bpmn:` locations and **ends with** `N errors, M warnings`; e.g. `broken.bpmn:11  error  F9 targetRef 'Node_X' not found` | 0 | FR-LINT-7 |

All findings are reported informationally; lint itself never exits non-zero (FR-LINT-6). Exit-code
behaviour is a property of the CLI wiring (`cli.py`) verified by inspection against
DESIGN-BPMN-LINT-001, since these unit tests call the API rather than the process.

## 4. Pass/fail criteria

The feature **passes** when:

- Every asserted finding in TC-LINT-01..10 is present with the **correct severity** (`error` | `warn`)
  and, where asserted, the **correct 1-based line** — including the DI-element line for LR-DI-01
  (TC-LINT-05) rather than the semantic-element line.
- A clean input (`CLEAN`) yields `lint() == []`, `counts() == (0, 0)`, and
  `format_report(label, []) == "‹label›: ✓ no issues"`.
- A non-clean input yields a report whose final line is exactly `N errors, M warnings`, with `N`/`M`
  from `counts()`, and ruff/gcc-style `‹path›:‹line›  ‹severity›  ‹id› '‹name›' ‹message›` rows.
- Malformed XML yields exactly **one** `error` finding (LR-XML-01) with `line ≥ 1` and does **not**
  raise.
- Lint always exits 0 (informational); only usage errors (missing file, non-`.bpmn` suffix, empty
  argument list) exit non-zero — verified by inspection of `cli.py` against DESIGN-BPMN-LINT-001.
- `ruff check src tests` reports **no** findings.

Any severity/line mismatch, any non-deterministic finding order, any introduction of a third-party
dependency, or any uncaught exception on malformed input is a **failure**.

## 5. Requirements traceability matrix

Every requirement of FEAT-BPMN-LINT-001 maps to at least one owned case; items reachable only by
reading the CLI wiring are flagged **(inspection)**.

| Requirement | Covered by |
|-------------|-----------|
| FR-LINT-1 (accept `kymo lint <file.bpmn> [...]`, report per file) | TC-LINT-01..10 exercise the underlying `lint()`/`format_report()`; the per-file CLI loop and argument handling **(inspection)** of `cli.py` |
| FR-LINT-2 (import-fidelity LR-DI-01..05) | TC-LINT-05 (LR-DI-01), TC-LINT-06 (LR-DI-04), TC-LINT-08 (LR-DI-03 + LR-DI-04). LR-DI-02 / LR-DI-05 **(inspection)** of the rule registry in DESIGN-BPMN-LINT-001 |
| FR-LINT-3 (reference integrity LR-REF-01..02) | TC-LINT-02 (LR-REF-01). LR-REF-02 **(inspection)** |
| FR-LINT-4 (graph sanity LR-GR-01..12, process LR-PR-01..02) | TC-LINT-03 (LR-GR-02), TC-LINT-04 (LR-GR-09), TC-LINT-07 (LR-PR-02). Remaining LR-GR / LR-PR-01 **(inspection)** |
| FR-LINT-5 (1-based source line in output) | TC-LINT-02, TC-LINT-04, TC-LINT-05, TC-LINT-10 |
| FR-LINT-6 (lint always exits 0; only usage errors non-zero) | TC-LINT-01..10 are informational by construction; exit-code path **(inspection)** of `cli.py` |
| FR-LINT-7 (clean → `✓ no issues`; else `N errors, M warnings`) | TC-LINT-01, TC-LINT-10 |
| FR-LINT-8 (malformed XML → single LR-XML-01 error, no raise) | TC-LINT-09 |
| NFR-LINT-1 (stdlib only) | Whole suite imports no third-party package; environment per §2 **(inspection)** of imports |
| NFR-LINT-2 (deterministic, document-order findings) | TC-LINT-10 asserts ordered line locations; all exact-tuple assertions rely on stable order |
| NFR-LINT-3 (severity model {error, warn}; informational) | TC-LINT-02/04 (error), TC-LINT-03/05/06/07/08 (warn); no auto-fix exercised |
| NFR-LINT-4 (DI findings point at the DI element's line) | TC-LINT-05 (line 17, the `<BPMNShape>`, not semantic line 9) |
| NFR-LINT-5 (JS parity / future `lintBpmn()`) | Not testable in this Python suite — **(inspection)**; tracked as CR-BPMN-LINT-004 in PLAN-BPMN-LINT-001 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                                       |
|---------|------------|--------|---------------------------------------------------------------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial as-built test documentation: cases `TC-LINT-01..10`, pass/fail criteria, and full FR/NFR traceability for FEAT-BPMN-LINT-001. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/03-TEST.md`; the authoritative source is the
main-branch working tree (history via `git log`). The executable counterpart is
`packages/python/tests/test_lint_bpmn.py`.

### B.2 Distribution
Implicit — checked in alongside the feature and test suite; available to all repository readers.

### B.3 Change Control
When a requirement in FEAT-BPMN-LINT-001 or a rule in DESIGN-BPMN-LINT-001 changes, update the
affected test case(s) and the traceability matrix in the same revision, increment `version`, and
append a row to Annex A. New rules SHALL gain a covering TC-LINT case or be explicitly marked
**(inspection)**.

### B.4 Backwards Compatibility
Test-case IDs (`TC-LINT-NN`) are stable; a withdrawn case SHALL be marked withdrawn rather than
re-used, so traceability links from FEAT-BPMN-LINT-001 remain valid.

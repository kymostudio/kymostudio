---
title: BPMN Lint — Plan
document_id: PLAN-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers implementing/maintaining the kymo BPMN linter and its CLI subcommand
review_cycle: On CR completion
supersedes: null
related_documents:
  - FEAT-BPMN-LINT-001    # Requirements
  - DESIGN-BPMN-LINT-001  # Design
  - TEST-BPMN-LINT-001    # Test documentation
  - DESIGN-BPMN-PARSER-001  # Importer this builds on
  - FEAT-BPMN-EXPORT-001    # Exporter sibling
  - BPMN-MAP-001            # BPMN element mapping
  - BPMN-NREF-001           # BPMN normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - import-fidelity
  - stdlib
  - change-requests
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-BPMN-LINT-001                                 |
| Version      | 1.0                                                |
| Status       | Baselined                                          |
| Issue Date   | 2026-06-05                                         |
| Owner        | `packages/python` (kymo CLI)                       |
| Related      | FEAT-BPMN-LINT-001, DESIGN-BPMN-LINT-001, TEST-BPMN-LINT-001 |

Stakeholder needs & requirements (SN/FR/NFR): FEAT-BPMN-LINT-001. Design: DESIGN-BPMN-LINT-001.
Verification: TEST-BPMN-LINT-001.

## 1. Scope and approach

The `-001` baseline is the **as-built** BPMN linter — already implemented and shipped:
`packages/python/src/kymo/lint_bpmn.py`, wired as the `kymo lint` CLI subcommand in
`packages/python/src/kymo/cli.py`, with tests in `packages/python/tests/test_lint_bpmn.py` and the
fixture `packages/python/tests/fixtures/bpmn/no_di.bpmn`.

The discipline is **stdlib-only** (`xml.etree.ElementTree` + `xml.parsers.expat`, no new
runtime/dev dependency — NFR-LINT-1) and **informational** (results always exit 0; only usage
errors exit non-zero — FR-LINT-6, NFR-LINT-3). The linter reads **raw BPMN 2.0 XML**, not the
imported `Diagram`, so it can flag exactly what the importer (DESIGN-BPMN-PARSER-001) silently
drops — its kymo-unique value as a **renderer-fidelity linter** for the BPMN→SVG (DI-driven)
pipeline. It is **Python-package only**; the JS package is library-only with no CLI.

This plan records scope, the as-built baseline, the forward change-request register, risks, and the
worklog. The normative surface is FEAT-BPMN-LINT-001 and DESIGN-BPMN-LINT-001.

## 2. Design

The as-built design — raw-XML scan, the `expat` ↔ `ElementTree` document-order zip that recovers
1-based source lines (CPython's C parser drops positions), the side dict keyed by element identity,
the DI-element line attribution (NFR-LINT-4), and the rule registry (LR-DI / LR-REF / LR-GR / LR-PR
/ LR-XML) — is specified in **DESIGN-BPMN-LINT-001**. This plan covers scope, sequencing, and risks.

## 3. Delivery increments (change-requests)

The baseline (`-001`) is the as-built linter. Later changes are raised as change-requests under
`CR/` (logged in `CR/README.md`); CR folders start at `CR-002`. All increments below are **Proposed**
(not built) and realise additions to FEAT-BPMN-LINT-001.

| CR | Increment | Realises | Status | Date |
|----|-----------|----------|--------|------|
| — (`-001`) | **As-built** — raw-XML stdlib linter, `kymo lint` subcommand, rule families LR-DI/REF/GR/PR/XML, expat line mapping, informational exit-0 | FR-LINT-1..8; NFR-LINT-1..5 | **Baselined** | 2026-06-05 |
| `CR-BPMN-LINT-002` (`CR-002/`) | **Configurable rules** — rc-file enable/disable + per-rule severity overrides + presets (e.g. `recommended`/`all`) | extends FR-LINT-2..4; NFR-LINT-3 | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-003` (`CR-003/`) | **bpmnlint-parity rules** — `no-implicit-split`, `no-duplicate-sequence-flows`, `label-required` | extends FR-LINT-3, FR-LINT-4 | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-004` (`CR-004/`) | **JS port** — `lintBpmn()` rule logic in the JS package + VS Code diagnostics via the `bpmn-editor` engine | realises NFR-LINT-5 | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-005` (`CR-005/`) | **CI gating** — `--json` machine-readable output + opt-in `--max-severity` / exit-code mode | extends FR-LINT-6, FR-LINT-7 | **Proposed** | 2026-06-05 |

## 4. Risks and mitigations

- **Rule false-positives on valid-but-unusual models** — heuristic graph-sanity rules (e.g.
  LR-GR-11 superfluous-gateway, LR-PR-01/02 missing start/end) can flag legitimate-but-atypical
  models. Mitigation: keep findings **informational** (exit 0, NFR-LINT-3); make severities and
  on/off **configurable** via the rc-file (CR-BPMN-LINT-002) so noise can be tuned per project.
- **expat/ElementTree document-order coupling for line numbers** — line recovery relies on
  `StartElementHandler` firing in the *same* document order as `root.iter()`. A future stdlib or
  parser change could desync the two streams. Mitigation: golden/deterministic tests
  (NFR-LINT-2) over fixtures pin the mapping; malformed XML falls back to `ParseError.position`
  (LR-XML-01, FR-LINT-8) rather than raising.
- **Scope creep toward full bpmnlint parity** — bpmnlint ships 27 configurable rules, presets, a
  plugin ecosystem and editor markers; chasing full parity dilutes the renderer-fidelity focus.
  Mitigation: positioning is **complementary, not a replacement** — keep the kymo-unique DI/ref
  rules central (LR-DI-01/02/04, LR-REF-01) and add parity rules only as bounded CRs
  (CR-BPMN-LINT-003), not as an open mandate.
- **JS/Python rule drift (CR-004)** — a JS `lintBpmn()` port risks diverging from the Python
  reference. Mitigation: treat Python as the reference implementation; mirror rule ids/severities
  and cover the port with shared fixtures when CR-BPMN-LINT-004 is picked up.

## 5. Verification

Verification approach, levels, and the requirements-traceability matrix (TC-LINT-01..10, mapping
back to FR-LINT-1..8 and NFR-LINT-4) are specified in **TEST-BPMN-LINT-001**, realised by the
pytest suite `packages/python/tests/test_lint_bpmn.py` (12 tests) over the fixture
`tests/fixtures/bpmn/no_di.bpmn`. Run:

```bash
uv run --group dev python -m pytest tests/test_lint_bpmn.py -q
```

CI gates `ruff check src tests`, then pytest, on every build. Each CR maps its CR-local cases back
to TEST-BPMN-LINT-001.

## 6. Change requests

Later changes to the spec (`docs/specs/bpmn/modules/lint/`) are raised, assessed, and logged in
`CR/` (raise → assess → approve → implement → re-baseline). The `-001` baseline reserves the `-001`
suffix; CR folders start at `CR-002` under `CR/`. CR-BPMN-LINT-002 (configurable rules),
CR-BPMN-LINT-003 (bpmnlint-parity rules), CR-BPMN-LINT-004 (JS port + VS Code diagnostics) and
CR-BPMN-LINT-005 (CI gating) are registered as **Proposed**.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial as-built plan: scope/approach (stdlib-only, informational, raw-XML renderer-fidelity linter), baseline `-001` + CR-002..005 register, risks, verification, change-request register. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/04-PLAN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On CR completion or scope change: update the affected clause + CR row; keep requirement IDs and the
TEST traceability matrix consistent; increment `version`; append a row to Annex A (document edits)
and Annex C (the increment's implementation worklog).

### B.4 Backwards Compatibility
The plan is informative; the normative surface is FEAT-BPMN-LINT-001 and DESIGN-BPMN-LINT-001.
Reconcile any deviation there before release. The linter is informational (exit 0) and stdlib-only,
so the baseline imposes no compatibility constraint on consumers; CI-gating exit codes are opt-in
(CR-BPMN-LINT-005).

## Annex C — Worklog

**Table C.1 — Implementation worklog.** Per-increment work as it happens — distinct from Annex A,
which records edits to *this document*. Newest entries at the bottom; dates ISO 8601.

| Date       | Increment | Work | Outcome / artifacts |
|------------|-----------|------|---------------------|
| 2026-06-05 | `-001` (as-built) | Built the BPMN linter (`packages/python/src/kymo/lint_bpmn.py`): raw BPMN 2.0 XML scan via `xml.etree.ElementTree`, `expat` ↔ `ElementTree` document-order zip recovering 1-based source lines (side dict keyed by element identity; DI findings point at the DI element's line), rule families LR-DI-01..05 / LR-REF-01..02 / LR-GR-01..12 / LR-PR-01..02 / LR-XML-01, `Finding`/`lint`/`lint_file`/`counts`/`format_report` API exported as `lint_bpmn`. Wired `kymo lint <file.bpmn> [...]` as the first positional subcommand in `cli.py` (informational, always exit 0; usage errors exit 1). Tests `tests/test_lint_bpmn.py` (12) + fixture `tests/fixtures/bpmn/no_di.bpmn`. Stdlib-only — no new dependency. | **Delivered** — linter runs; results informational; spec set authored for the shipped code. |

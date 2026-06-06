---
title: "Icons CR-008 — Test: parity & byte-stability across the move"
document_id: TEST-ICONS-CR008
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers / reviewers verifying the packages/icons move
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-008                # Requirements — CR-ICONS-008/01-REQUIREMENTS
  - DESIGN-ICONS-CR008          # Design — CR-ICONS-008/02-DESIGN
  - PLAN-ICONS-CR008            # Plan — CR-ICONS-008/04-PLAN
  - TEST-ICONS-001              # Baseline test (full suite that must stay green)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - parity
  - byte-stability
iso_compliance:
  - ISO/IEC/IEEE 29119-3:2021
  - ISO 8601:2019
---

# Icons CR-008 — Test

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR008                                   |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-008, DESIGN-ICONS-CR008, PLAN-ICONS-CR008, TEST-ICONS-001 |

Verifies **CR-ICONS-008**. No new test file is required: the existing suites already cover resolution
and parity, and the move is content-neutral — the bar is that they stay green from the new location.

## 1. Cases / gates

| ID | Intent | Where |
|----|--------|-------|
| CR008-1 | Catalogue resolves from `packages/icons`: `len(icon_addresses()) == 2460`; sample address path is `icons/<provider>/…` under `_ICONS_PKG` | py |
| CR008-2 | `_REPO_ROOT` still points at the real repo root (`docs/` exists) so doc-lint / bin / samples tests pass | py |
| CR008-3 | **Pure move** — `git diff` shows the catalogue (`icons-manifest.json`, `icons-collections.json`, `sets/`) as renames with no content change; regenerating in `packages/icons` produces no diff | git / CI freshness |
| CR008-4 | **Python↔JS CLI parity** holds when `packages/js` copies are absent (the CI condition): the JS CLI reads `packages/icons` and returns the full catalogue, matching Python (TC-16) | py (`test_icons_cli.py`) |
| CR008-5 | `packages/js` build-copy: `sync-icons` reproduces the index; copies are git-ignored; `npm test` green | js |
| CR008-6 | Website bundle rebuilt with base URL `…@main/packages/icons` | website |

## 2. Regression gates (must stay green / unchanged)

- **Full suites** — Python `pytest -q`, JS `npm test`.
- **Goldens / BPMN baselines** — unchanged (NFR-2): the move is byte-identical.
- **Zero runtime deps** — `packages/js` `dependencies` stays empty (TC-12 / NFR-3).

## 3. Results

All green. Python **707 passed / 47 skipped** (including under the CI condition with `packages/js`
copies absent); JS **399 passed / 29 skipped**, 0 failed; `tsc` clean; website bundle rebuilt. CI on
PR #129: Python (3.10–3.13), JS, canvas, Playwright, VS Code — all pass.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — CR008-1..6 + regression gates; recorded green run (incl. the CI-condition parity fix). |

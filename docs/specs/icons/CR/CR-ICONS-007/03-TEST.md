---
title: "Icons CR-007 — Test: inline-set rendering & index integrity"
document_id: TEST-ICONS-CR007
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers / reviewers verifying the vendored `ai` set
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-007                # Requirements — CR-ICONS-007/01-REQUIREMENTS
  - DESIGN-ICONS-CR007          # Design — CR-ICONS-007/02-DESIGN
  - PLAN-ICONS-CR007            # Plan — CR-ICONS-007/04-PLAN
  - TEST-ICONS-001              # Baseline test (full suite that must stay green)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - test
  - inline-body
  - parity
iso_compliance:
  - ISO/IEC/IEEE 29119-3:2021
  - ISO 8601:2019
---

# Icons CR-007 — Test

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR007                                   |
| Version      | 0.1                                                |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-007, DESIGN-ICONS-CR007, PLAN-ICONS-CR007, TEST-ICONS-001 |

Verifies **CR-ICONS-007**. New cases live in `packages/python/tests/test_icons_ai.py` and the
CR-ICONS-007 block of `packages/js/tests/icons.test.js`; the **full** baseline suite must remain
green and goldens byte-stable.

## 1. Cases

| ID | Intent | Where |
|----|--------|-------|
| CR007-1 | `ai` is indexed (`collections["ai"]` = 3 icons / `provider`) and `load_set("ai")` records are inline (`body`, no `path`); license `CC0-1.0` | py + js |
| CR007-2 | `ai:openai/anthropic/gemini` render as `<svg viewBox=…>…<path…></svg>` with their own viewBox dims (256×260 / 256×176 / 512×188) | py + js |
| CR007-3 | Brand colours preserved — `#181818` (Anthropic), `#076eff` + `radialGradient` (Gemini) survive (no `currentColor` recolour) | py |
| CR007-4 | Repeated inline of `ai:gemini` yields **disjoint** element ids (FR-7) — records render fresh per use, refs rewritten (`url(#g-i…)`) | py + js |
| CR007-5 | Unknown name (`ai:no-such-model`) is rejected with `unknown icon` | py + js |
| CR007-6 | The real `sets/ai.json` is a valid inline set (3 brand logos, all `body`, license) | js |
| CR007-7 | Inline render performs **no file fetch** (only the set JSON is read) | js |

## 2. Regression gates (must stay green / unchanged)

- **Full suites** — Python `pytest -q`, JS `npm test`.
- **Goldens / BPMN baselines** — unchanged: no `icons/` file added, no diagram uses `ai:`; only
  `icons-collections.json` gains the `ai` row (NFR-2).
- **Generator idempotence** — re-running `npm run build-manifest` keeps `ai` in the collections index
  and leaves `icons-manifest.json` + `sets/<provider>.json` byte-identical.
- **Shape test retargeted** — `test_per_set_iconifyjson_shape` now targets a path-backed set
  (`aws`) rather than `sorted(cols)[0]`, since the new alphabetical-first set (`ai`) is inline with
  its own dims.

## 3. Results

All cases pass. Python: 707 passed / 47 skipped. JS: 399 passed / 29 skipped, 0 failed.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — CR007-1..7 + regression gates; recorded green run. |

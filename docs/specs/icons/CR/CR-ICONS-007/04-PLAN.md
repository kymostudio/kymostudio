---
title: "Icons CR-007 — Plan: vendored inline sets + `ai` group"
document_id: PLAN-ICONS-CR007
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Implementer / reviewer
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-007                # Requirements — CR-ICONS-007/01-REQUIREMENTS
  - DESIGN-ICONS-CR007          # Design — CR-ICONS-007/02-DESIGN
  - TEST-ICONS-CR007            # Test — CR-ICONS-007/03-TEST
  - PLAN-ICONS-001              # Baseline plan
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - inline-set
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO 8601:2019
---

# Icons CR-007 — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR007                                   |
| Version      | 0.1                                                |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-007, DESIGN-ICONS-CR007, TEST-ICONS-CR007, PLAN-ICONS-001 |

Single increment — additive to the released catalogue, no baseline phase reopened.

## 1. Steps

1. **Vendor `sets/ai.json`** — fetch `logos:{openai-icon,anthropic-icon,google-gemini}` from the
   Iconify API; assemble an inline IconifyJSON set (category `provider`, CC0 provenance in `info`).
2. **Python loader** — add `_inline_record` + the inline tail-branch in `get_icon`.
3. **JS loader** — render `body` records in the on-demand path; add `renderRecord` + `makeIdsSafe`;
   cache set-level dims in `loadSet`.
4. **Generator** — fold vendored inline `sets/*.json` into `icons-collections.json`; sort keys.
   Re-run `npm run build-manifest` (only the collections file changes).
5. **CLI** — `describe` prints `inline (IconifyJSON body)` + license when there is no `path` (py + js).
6. **Docs** — `ICONS-MAP-001` §2.1; this CR set.
7. **Tests** — `test_icons_ai.py` + JS CR-ICONS-007 block; retarget `test_per_set_iconifyjson_shape`
   to a path-backed set; run both full suites.

## 2. Status

| Step | State |
|------|-------|
| 1 Vendor artifact | ✅ Done |
| 2 Python loader   | ✅ Done |
| 3 JS loader       | ✅ Done |
| 4 Generator       | ✅ Done |
| 5 CLI describe    | ✅ Done |
| 6 Docs            | ✅ Done |
| 7 Tests           | ✅ Done — both suites green |

## 3. Rollback

Delete `sets/ai.json`, re-run `npm run build-manifest` (drops the `ai` row), and revert the loader /
generator / CLI / doc edits. No persisted state; no other set affected.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — plan + completion status for the inline-set capability and `ai` group. |

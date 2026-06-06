---
title: "Icons CR-008 — Plan: extract catalogue into packages/icons"
document_id: PLAN-ICONS-CR008
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Implementer / reviewer
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-008                # Requirements — CR-ICONS-008/01-REQUIREMENTS
  - DESIGN-ICONS-CR008          # Design — CR-ICONS-008/02-DESIGN
  - TEST-ICONS-CR008            # Test — CR-ICONS-008/03-TEST
  - PLAN-ICONS-001              # Baseline plan
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - plan
  - packaging
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO 8601:2019
---

# Icons CR-008 — Plan

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | PLAN-ICONS-CR008                                   |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-008, DESIGN-ICONS-CR008, TEST-ICONS-CR008, PLAN-ICONS-001 |

Single increment — a content-neutral relocation; no baseline phase reopened.

## 1. Steps

1. **Move** art + generator + index into `packages/icons` (`git mv`, renames only).
2. **Generator** — repoint its `ICONS_DIR`/outputs to the package root; verify byte-identical output.
3. **Python** — `_ICONS_PKG` for catalogue resolution; `_REPO_ROOT` = real root.
4. **JS** — `scripts/sync-icons.mjs` (build-copy index); `prebuild`/`prepack` hooks;
   `.gitignore` the copies; CLI reads `packages/icons` when present.
5. **Website** — manifest import + base URL → `packages/icons`; rebuild bundle.
6. **CI** — freshness gate runs the generator in `packages/icons`.
7. **Docs** — `ICONS-MAP-001` §2; this CR; reconcile baseline `DESIGN-ICONS-001` §1/§4 + the
   `PLAN-ICONS-001` ledger.
8. **Verify** — both full suites (incl. CI-condition parity), goldens, typecheck.

## 2. Status

| Step | State |
|------|-------|
| 1 Move | ✅ Done |
| 2 Generator | ✅ Done — byte-identical |
| 3 Python | ✅ Done |
| 4 JS build-copy + CLI | ✅ Done |
| 5 Website | ✅ Done — bundle rebuilt |
| 6 CI | ✅ Done |
| 7 Docs | ✅ Done |
| 8 Verify | ✅ Done — suites green |

## 3. Rollback

`git mv` the catalogue back, revert the loader/generator/website/CI edits, drop `packages/icons` +
`sync-icons` + `.gitignore`. No persisted state; content-neutral both ways.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — plan + completion status for the `packages/icons` extraction. |

---
title: "Icons CR-001 — Verification & Validation: `kymo icons` command group"
document_id: TEST-ICONS-CR001
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer verifying the `kymo icons` CLI across packages/python and packages/js; reviewers
review_cycle: Until CR-ICONS-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-001                # CR lead doc — motivation + requirements (FR-12..FR-15)
  - DESIGN-ICONS-CR001          # CR design
  - PLAN-ICONS-CR001            # CR plan
  - TEST-ICONS-001              # Baseline test (TC-1..TC-12) this delta extends
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - cli
  - test
  - traceability
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-001 — Verification & Validation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-ICONS-CR001                                   |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-001, DESIGN-ICONS-CR001, PLAN-ICONS-CR001, TEST-ICONS-001 |

Verifies **CR-ICONS-001** (FR-12..FR-15). This is a **test delta** adding **TC-13..TC-16** to
the baseline `TEST-ICONS-001` (TC-1..TC-12 unchanged). Headline checks: the read-trio runs
**offline**, `download` applies the **normalize pipeline**, and Python/JS are at **parity**.

## 1. Test approach and levels

- **Unit** — argument parsing per verb; first-token disambiguation (`icons` reserved vs. source
  path vs. global option); `prefix:name` validation; `--json` schema shape; exit-code mapping.
- **Functional** — `list`/`search`/`describe` against a fixture catalogue with **no network**
  (a stubbed/forbidden HTTP layer asserts offline); `search --remote` and `download --from
  iconify` against a **mocked Iconify API** (no live network in CI).
- **Integration** — `download --from iconify` writes a normalized record, re-syncs the manifest,
  and a subsequent render resolves the new key.
- **Cross-language parity** — Python `cli.py` and JS `bin` produce equivalent `--json` output and
  equal exit codes for the same catalogue/query.
- **Regression (negative)** — adding the `icons` namespace does not alter converter behaviour.

## 2. Test items, environment, tooling

`packages/python` (`uv run --group dev python -m pytest` — a new `tests/test_icons_cli.py`),
`packages/js` (`npm test` → `node --test` — a new `icons-cli.test.js`), both driving the `kymo`
entry point with a **fixture catalogue** and a **mocked Iconify endpoint**. No new **runtime**
dependency (NFR-3); HTTP is stdlib (`urllib` / `fetch`) and is stubbed in tests.

## 3. Test cases (additions)

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-13** | `icons list` enumeration | FR-12, FR-13 | `kymo icons list` lists every fixture set with correct counts/license; `list <provider>` filters to that set; `--json` matches the documented schema; exit `0` |
| **TC-14** | `icons search` offline + remote | FR-14 | `kymo icons search lambda` finds `aws:lambda` (and its aliases) **with the HTTP layer forbidden** (proves offline); `--remote` against the mock API merges Iconify matches tagged vendored/fetchable; `--provider`/`--limit` constrain; empty result exits `0` with empty list; `--json` parseable |
| **TC-15** | `icons describe` + errors | FR-15 | `kymo icons describe aws:lambda` reports correct dims, alias chain, set `info`/license, source path; `--json` shape stable; an unknown/malformed key exits **non-zero** with a clear message |
| **TC-16** | `icons download` pipeline + parity | FR-12, FR-15 | `kymo icons download --from iconify mdi:home` (mock API) writes a **normalized** record (pipeline applied — `currentColor`, minified body, not a raw fetch), re-syncs the manifest, and the icon then resolves in a render; Python and JS yield equivalent results/exit codes; **and** `kymo x.kymo` / `kymo x.kymo -t svg` remain byte-identical (converter unaffected by the `icons` namespace) |

## 4. Pass/fail criteria

The CR passes when **TC-13..TC-16** pass and the full Python suite + JS `npm test` are green. A
Python/JS divergence in verb output or exit code is a **failure** to reconcile toward Python (sole
reference impl, per `CLAUDE.md`), not a re-baseline. Any change to existing golden SVG / BPMN /
conformance baselines caused by this CR is a **failure** — the CLI is additive and MUST NOT alter
rendered output (TC-16 converter-unaffected clause).

## 5. Requirements traceability matrix (delta)

| Requirement | Test case(s) |
|-------------|--------------|
| FR-12 | TC-13, TC-16 |
| FR-13 | TC-13 |
| FR-14 | TC-14 |
| FR-15 | TC-15, TC-16 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — test delta TC-13..TC-16 for the `kymo icons` command group (offline read-trio, download pipeline, parity, converter-unaffected). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-001/03-TEST.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On approval, TC-13..TC-16 and the matrix delta are **re-based into `TEST-ICONS-001`** (preserving
IDs). Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable and additive; TC-1..TC-12 are untouched. A removed case SHALL be marked
withdrawn (not re-used) so traceability links remain valid.

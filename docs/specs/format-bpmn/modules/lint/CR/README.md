# BPMN Lint — Change-Request Log

Change-requests against the `bpmn-lint` spec (`docs/specs/format-bpmn/modules/lint/`). The `-001` baseline
is the **as-built** BPMN linter (`packages/python/src/kymo/lint_bpmn.py` + the `kymo lint` CLI
subcommand + `tests/test_lint_bpmn.py`) — a stdlib-only, informational, raw-XML renderer-fidelity
linter for the BPMN→SVG (DI-driven) pipeline. Each increment is a self-contained mini
engineering-spec folder `CR-NNN/` (`01-INTRO` → `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` →
`05-PLAN`). The baseline reserves the `-001` suffix, so CR folders start at `CR-002`. Log each row
below.

| CR | Title | Target baseline | Status | Date |
|----|-------|-----------------|--------|------|
| `CR-BPMN-LINT-002` (`CR-002/`) | **Configurable rules** — rc-file enable/disable + per-rule severity overrides + presets (e.g. `recommended`/`all`) | `FEAT-BPMN-LINT-001` (extends FR-LINT-2..4; NFR-LINT-3) | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-003` (`CR-003/`) | **bpmnlint-parity rules** — `no-implicit-split`, `no-duplicate-sequence-flows`, `label-required` | `FEAT-BPMN-LINT-001` (extends FR-LINT-3, FR-LINT-4) | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-004` (`CR-004/`) | **JS port** — `lintBpmn()` rule logic in the JS package + VS Code diagnostics via the `bpmn-editor` engine | `FEAT-BPMN-LINT-001` (realises NFR-LINT-5) | **Proposed** | 2026-06-05 |
| `CR-BPMN-LINT-005` (`CR-005/`) | **CI gating** — `--json` machine-readable output + opt-in `--max-severity` / exit-code mode | `FEAT-BPMN-LINT-001` (extends FR-LINT-6, FR-LINT-7) | **Proposed** | 2026-06-05 |

**Statuses.** `Proposed` — registered, awaiting the increment being picked up (its
`01-INTRO`..`05-PLAN` are authored then). `Open` — fully specified, ready to build. `Closed` —
implemented + re-baselined.

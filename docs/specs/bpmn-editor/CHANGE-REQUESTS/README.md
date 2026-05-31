# BPMN Editor — Change-Request Log

Change-requests against the (to-be-)baselined `bpmn-editor` spec (`docs/specs/bpmn-editor/`). Each CR
is a **self-contained mini engineering-spec** in a `CR-NNN/` folder (`01-INTRO` → `02-REQUIREMENT` →
`03-DESIGN` → `04-TEST` → `05-PLAN`), mirroring the parent layout and scoped to one change — the
`canvas-studio/CHANGE-REQUESTS` convention. Each folder's `01-INTRO` doubles as its change record;
log each row in the register below.

The five CRs are pre-logged as the feature's **post-v1 roadmap** — the deferred-from-v1 scope plus the
natural next enhancements. Status **Proposed**: authored but not yet raised, because the v1 baseline
(`*-BPMN-EDITOR-001`) is still Draft. Each targets the v1 baseline `FEAT`/`DESIGN`/`TEST`/`PLAN-BPMN-EDITOR-001`.

| CR | Folder | Title | Type | Status | Date |
|----|--------|-------|------|--------|------|
| `CR-BPMN-EDITOR-001` | [`CR-001/`](CR-001/01-INTRO.md) | Pools / participants & lanes (the laning model) | Enhancement | **Proposed** | 2026-05-31 |
| `CR-BPMN-EDITOR-002` | [`CR-002/`](CR-002/01-INTRO.md) | "Set color" action (element recolor + DI color round-trip) | Enhancement | **Proposed** | 2026-05-31 |
| `CR-BPMN-EDITOR-003` | [`CR-003/`](CR-003/01-INTRO.md) | Live BPMN validation / lint overlay | Enhancement | **Proposed** | 2026-05-31 |
| `CR-BPMN-EDITOR-004` | [`CR-004/`](CR-004/01-INTRO.md) | Copy / paste, duplicate & keyboard modeling | Enhancement | **Proposed** | 2026-05-31 |
| `CR-BPMN-EDITOR-005` | [`CR-005/`](CR-005/01-INTRO.md) | One-click auto-layout for hand-drawn diagrams | Enhancement | **Proposed** | 2026-05-31 |

**Conventions.** Folder `CR-NNN/`; mini-spec doc series `<TYPE>-BPMN-EDITOR-CR-NNN` (distinct from the
baseline series `<TYPE>-BPMN-EDITOR-001`); CR-local item IDs `FR-CRn-`/`NFR-CRn-`/`TC-CRn-`/`RK-CRn-`
(mapped to the parent `FR-BE`/`NFR-BE` clauses in each `02-REQUIREMENT §5`). On approval a CR is built
per its `05-PLAN`, the parent clauses are re-baselined, and its register row flips to **Closed**.

**Notes.** `CR-001` (pools/lanes) is the largest and may itself phase further. `CR-002` (set color) is
cross-feature — it also amends `FEAT-BPMN-EXPORT-001` / `FEAT-BPMN-PARSER-001` (DI color) and
`BPMN-MAP-001`. `CR-003` (lint) is grounded in `RES-BPMN-LINT-001`. `CR-005` (auto-layout) wraps the
existing `bpmnLayout` (`packages/js`) and does **not** modify the layout algorithm.

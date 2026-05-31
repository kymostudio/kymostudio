---
title: BPMN Editor — Implementation Plan
document_id: PLAN-BPMN-EDITOR-001
version: "0.1"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the BPMN editor (`website/app/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - PROD-BPMN-EDITOR-001
  - INTRO-BPMN-EDITOR-001
  - FEAT-BPMN-EDITOR-001
  - DESIGN-BPMN-EDITOR-001
  - TEST-BPMN-EDITOR-001
  - FEAT-ENGINE-001
  - FEAT-STUDIO-001
  - FEAT-JAM-001
  - FEAT-BPMN-PARSER-001
  - FEAT-BPMN-EXPORT-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - bpmn-editor
  - palette
  - context-pad
  - estimation
  - story-points
---

# BPMN Editor — Implementation Plan

| Field             | Value |
|-------------------|-------|
| Document ID       | `PLAN-BPMN-EDITOR-001` |
| Version           | 0.1 |
| Issue Date        | 2026-05-31 |
| Status            | Draft |
| Classification    | Internal |
| Owner             | `diagrams/` project |
| Audience          | Engineers implementing the BPMN editor (`website/app/`) |
| Related Documents | `FEAT-BPMN-EDITOR-001` (requirements), `DESIGN-BPMN-EDITOR-001` (design), `TEST-BPMN-EDITOR-001` (V&V), `BPMN-MAP-001` |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3 Technical Management).** The *delivery* layer for the
> bpmn-editor: rationale, the phased plan (**milestones = phases**), the risk register, and the
> change-requests. It implements the spec (`FEAT`/`DESIGN`/`TEST-BPMN-EDITOR-001`). A change to the
> spec is raised as a change-request in `CHANGE-REQUESTS/`, then the spec is re-baselined.

---

## 1. Context

kymostudio already renders, imports/exports, and textually authors BPMN, but has **no WYSIWYG
modeling surface** like `demo.bpmn.io`. The editor adds that surface to `website/app/`. The honest
framing: **the substrate is done** — engine (`FEAT-ENGINE-001`), studio chrome (`FEAT-STUDIO-001`),
undo/export (`FEAT-JAM-001`), and `parseBpmn`/`toBpmn` (`FEAT-BPMN-PARSER-001`/`FEAT-BPMN-EXPORT-001`)
all exist; the work is the **BPMN interaction layer** (palette → placement, context pad → morph/
append, direct edit, `.bpmn` I/O), keyed to `BPMN-MAP-001`. No engine or renderer change.

## 2. Decision

**Build the BPMN interaction layer on the existing stack, phased by pillar, with no engine/renderer
change.** The palette extends the studio tool registry; placement/connect/morph dispatch to the
`Editor` facade; file I/O wraps `parseBpmn`/`toBpmn`. v1 covers **core elements**; pools/lanes, color,
validation, copy-paste, and auto-layout are deferred to the proposed CRs (`CR-BPMN-EDITOR-001..005`).

## 3. Architecture (overview)

Full design in `DESIGN-BPMN-EDITOR-001`. New modules under `website/app/src`: `engine/bpmn-tools.ts`
(placement/connect), `engine/bpmn-ops.ts` (morph/append/label), `ui/ContextPad.tsx`, `bpmn-io.ts`
(open/new/export); plus extensions to `ui/tools.ts` (BPMN palette group) and `engine/shapes.tsx`
(`canEdit` in-place editing). Everything calls published `packages/js` / `packages/js-canvas` APIs.

## 4. Phased plan

| ID | Phase | Deliverables | Exit criteria | Reqs | Status |
|----|-------|--------------|---------------|------|--------|
| P1 | Palette & placement | BPMN palette group in `ui/tools.ts`; `bpmn-tools.ts` placement modes; default geometry from `BPMN-MAP-001` | Each core element places at the click point with correct glyph + default size | FR-BE-01, FR-BE-03, NFR-BE-01 | ⏳ Planned |
| P2 | Flows & interaction tools | Connect mode (flow-type by endpoints); hand/lasso/global-connect wired | Sequence/message/association flows draw and bind; tools delegate to engine | FR-BE-02, FR-BE-04 | ⏳ Planned |
| P3 | Context pad & morph | `ContextPad.tsx` + `bpmn-ops.ts` append/morph/connect/delete | Pad shows element-aware actions; append + morph preserve id/position/flows | FR-BE-05, FR-BE-06 | ⏳ Planned |
| P4 | Direct edit & undo/redo | `canEdit` in-place label editor; one history step per BPMN edit | Double-click edits labels; every edit undoes/redoes atomically | FR-BE-07, FR-BE-08 | ⏳ Planned |
| P5 | File I/O | `bpmn-io.ts` open (picker + drag-drop) / new / export `.bpmn` + SVG | Open/new/export work; round-trip equivalent (`NFR-BE-03`) | FR-BE-09, FR-BE-10, FR-BE-11, NFR-BE-03 | ⏳ Planned |
| P6 | Navigation & polish | Zoom/fit reuse; keyboard-shortcut reference; bundle/budget check | Shortcut reference complete; bundle within budget; regression green | FR-BE-12, NFR-BE-02, NFR-BE-04, NFR-BE-05 | ⏳ Planned |

**Sequencing:** `P1 → P2 → P3 → P4 → P5 → P6`. P5 (I/O) can land in parallel with P3/P4 since it only
depends on the model + `parseBpmn`/`toBpmn`, not on the context pad.

## 5. Complexity & sizing (story points)

Relative story points (Fibonacci); one experienced dev. Reuse keeps each phase modest.

| Phase | SP | Complexity driver |
|-------|----|-------------------|
| P1 — palette & placement | 8 | per-type defaults + placement modes; first BPMN tool wiring |
| P2 — flows & tools | 8 | flow-type selection by endpoints; connect-tool geometry |
| P3 — context pad & morph | 13 | element-aware pad; morph keyed to `BPMN-MAP-001` markers |
| P4 — direct edit & undo/redo | 5 | in-place editor + one-step history grouping |
| P5 — file I/O | 5 | picker/drag-drop + download wiring over `parseBpmn`/`toBpmn` |
| P6 — navigation & polish | 3 | shortcut reference + budget check |
| V&V build-out (Playwright + regression) | 5 | e2e harness for the interaction layer |
| **Total** | **≈ 47** | within the per-feature **≤ 50-SP cap** |

- **≤50-SP check:** ≈47 SP total — under the per-feature cap (the canvas-engine 50-SP split norm). If
  scope creeps (e.g. message-flow routing complexity), the natural split seam is **modeling (P1–P4)**
  vs **file-I/O + navigation (P5–P6)**.
- **Risk concentration:** P3 (context pad + morph) is the hardest single phase (~28% of points).

## 6. Risk register

Likelihood / impact are qualitative (Low / Med / High).

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|-----------|--------|------------|-------|--------|
| RK-01 | Morph maps to the wrong `bpmn-*` marker/glyph (subtype confusion) | Med | High | Drive every morph target from `BPMN-MAP-001`'s classification tables; unit-test the type→marker lookup (`TC-05`) | Vũ Anh | Open |
| RK-02 | Connect-tool flow geometry/routing looks wrong for hand-drawn diagrams | Med | Med | v1 uses straight/orthogonal endpoints from node bounds; defer fancy routing; auto-layout is `CR-BPMN-EDITOR-005` | Vũ Anh | Open |
| RK-03 | Round-trip fidelity degrades after edits (DI geometry drift) | Med | High | Lean on `toBpmn`/`parseBpmn` invariants; `TC-10` re-imports the exported file and asserts equivalence; corpus baseline gate (`TC-14`) | Vũ Anh | Open |
| RK-04 | Bundle budget regressed by the new UI | Low | Med | No new runtime dep (reuse `packages/js`/`-canvas`); measure in P6 (`TC-12`) | Vũ Anh | Open |
| RK-05 | Overlap/confusion with the generic `canvas-create-tools` palette | Low | Med | Keep the BPMN palette a distinct group; reuse (not fork) the connect + in-place-edit primitives (`DESIGN §3/§5`) | Vũ Anh | Open |

## 7. Files to create / modify

- **New:** `website/app/src/engine/bpmn-tools.ts`, `engine/bpmn-ops.ts`, `ui/ContextPad.tsx`,
  `bpmn-io.ts`; `website/app/e2e/*` BPMN specs.
- **Modify:** `website/app/src/ui/tools.ts` (BPMN palette group), `engine/shapes.tsx` (`canEdit` +
  in-place editor); commit the regenerated bundle.
- **Unchanged:** `packages/js-canvas` engine, the `bpmn-*` renderers + `BPMN-MAP-001`, `parseBpmn`/
  `toBpmn`, and the Pages deploy workflow.

## 8. Verification

Detailed cases + traceability in `TEST-BPMN-EDITOR-001`. At the plan level: per phase, the tracing
`TC`s pass via Playwright against the served app; `packages/js` `npm test` + Python goldens + the BPMN
corpus baseline stay green (no renderer change); the engine render-guard E2E gate is green; bundle
within budget.

## 9. Change requests

Changes to the (to-be-)baselined spec are raised, assessed, and logged in
[`CHANGE-REQUESTS/`](CHANGE-REQUESTS/README.md) — each a self-contained `CR-NNN/` mini-spec
(`01-INTRO`→`05-PLAN`), per the `canvas-studio/CHANGE-REQUESTS` convention. Five post-v1 enhancements
are pre-logged as **Proposed** (the deferred scope + natural next steps): `CR-001` (pools/lanes),
`CR-002` (set color), `CR-003` (validation/lint), `CR-004` (copy-paste/keyboard), `CR-005`
(auto-layout) — see [`CHANGE-REQUESTS/README.md`](CHANGE-REQUESTS/README.md).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial plan. Six phases (P1 palette/placement → P6 navigation/polish), ≈47 SP (within the ≤50-SP cap), risk register RK-01..05, and the five proposed post-v1 CRs. |

## Annex B — Open questions / pending decisions

1. **Pure-BPMN vs unified editor** — does the BPMN editor run as a *mode* of the existing unified
   `website/app/` editor (sharing the `.kymo`/text round-trip), or a dedicated `.bpmn` session? v1
   assumes a mode of the same app; revisit if the chrome diverges.
2. **Message flows before pools** — message/association flow creation is specified in P2, but message
   flows are only meaningful across participants, which land in `CR-BPMN-EDITOR-001`. v1 ships the
   flow primitive; cross-pool semantics arrive with pools/lanes.
3. **Split seam** — if scope grows past 50 SP, split into *modeling* (P1–P4) and *file-I/O + nav*
   (P5–P6) per the per-feature cap norm.

---
title: Canvas Studio — Feature & Requirements (SRS)
document_id: FEAT-STUDIO-001
version: "0.1"
issue_date: 2026-05-24
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the hi-fi editor chrome (`website/app/`); reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - INTRO-STUDIO-001
  - DESIGN-STUDIO-001
  - TEST-STUDIO-001
  - PLAN-STUDIO-001
  - FEAT-JAM-001
  - FEAT-CANVAS-001
  - FEAT-ENGINE-001
  - KYMO-DSL-001
authors:
  - Vũ Anh
language: en
keywords:
  - requirements
  - srs
  - iso-29148
  - canvas-studio
  - editor-shell
  - tool-rail
  - status-bar
  - acceptance-criteria
---

# Canvas Studio — Feature & Requirements (SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | FEAT-STUDIO-001                                                   |
| Version           | 0.1                                                              |
| Status            | Draft                                                            |
| Owner             | `diagrams/` project                                             |
| Related Documents | `DESIGN-STUDIO-001` (how), `TEST-STUDIO-001` (V&V), `FEAT-JAM-001` (the capability layer), `FEAT-CANVAS-001` (the playground host), `KYMO-DSL-001` (the DSL it renders) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-CS-NN`**, non-functional
> **`NFR-CS-NN`**. This feature is **client-only** chrome over the complete engine — no backend, no
> new runtime deps, the same static GitHub-Pages deploy. This document owns the `FR-CS`/`NFR-CS`
> IDs; `PLAN-STUDIO-001` never re-defines them.

---

## 1. Stakeholder needs (ISO 29148 §6.4.2)

| ID | Need |
|----|------|
| SN-1 | The playground must look and feel like the hi-fi prototype's **Editor** — a real product chrome (top bar, tool rail, status bar), not a bare split-pane — while staying **client-only**. |
| SN-2 | The engine's existing tools (select, pan, draw, sticky, text) must be **discoverable** in a tool rail with tooltips + keyboard shortcuts, with room for future creation tools to slot in. |
| SN-3 | On-canvas **items** (nodes / regions / edges) should carry the prototype's visual language (tile stripe + glyph, dashed container, flowing-dash edge) and show clear **selection affordances**. |
| SN-4 | Standard editor **actions** (undo/redo, theme, export, share) and persistent **status** (node/edge counts, autosave, zoom, fit) must be one click away in the chrome. |
| SN-5 | **Zero regression** to the DSL renderer (golden-safe) and the engine; no new runtime deps; the committed-bundle / static-deploy contract is preserved. |

## 2. Functional requirements (`FR-CS`)

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-CS-01** | The app SHALL adopt a single **design-token surface** ported from the hi-fi prototype (`tokens.css`): surfaces, brand accents, item palette, DSL-syntax colours, radii, type, shadows — with **full light/dark parity** driven by the existing `[data-theme]` attribute on `<html>` (`App.tsx`). No layout change is required by this requirement alone; it is the token foundation the later regions consume. | SN-1, SN-5 | P1 |
| **FR-CS-02** | The app SHALL present a **top bar** replacing the current `<header>`: brand/logo, an editable breadcrumb/title (local-only label, not persisted server-side), a **theme toggle** (reusing the `[data-theme]` effect), **undo/redo** buttons wired to the engine history (`editor.undo()/redo()`), and **Export** / **Share** entry points reusing the existing `onDownload`/`onShare`. Center **panel-toggle tabs** show/hide the `.kymo` code pane (`Code`) and the canvas (`Preview`); `Comments` / `Versions` render as **disabled placeholders** (backend out of scope). Presence avatars render as **static placeholders**. | SN-1, SN-4 | P2 |
| **FR-CS-03** | The app SHALL present a **left tool rail** (and an equivalent bottom floating toolbar) driven by a **tool registry** (`{ id, icon, kbd, title, enabled }`). The active tool is highlighted; a document-level **keyboard shortcut** selects each tool (guarded so the `.kymo` `<textarea>` keeps its keys). It wires the existing engine `Tool` set — `select`, `hand` (pan), `draw`, `sticky`, `text`. Not-yet-built creation tools (frame, shape, diamond, edge, cloud-tile, comment, AI) render as **disabled placeholders** with explanatory tooltips, reserving their slots for the `canvas-create-tools` sibling. | SN-2 | P3 |
| **FR-CS-04** | On-canvas **items** SHALL match the prototype's visual language: `kymo-node` as a tile with a colour stripe + glyph + title/sub; `kymo-region` as an outer/inner container with a solid or dashed border + corner label; `kymo-edge` with the flowing-dash animation. Styling lives in the engine's interactive shape layer (`engine/shapes.tsx`); `note`/`text`/`freedraw` are unchanged. The DSL renderer (`renderSVG`, `packages/js`) is **not** touched (golden-safe). | SN-3, SN-5 | P4 |
| **FR-CS-05** | A **selected** shape SHALL show a **selection rectangle with corner resize handles and a size badge** (e.g. `232 × 64`), rendered in the **canvas layer** (extending the engine's existing in-wrapper selection outline so it tracks a dragged shape frame-for-frame). A shape MAY carry a **comment-pin** marker rendered as a visual-only badge (no thread backend). | SN-3 | P5 |
| **FR-CS-06** | The app SHALL present a **status bar**: **node/edge counts** (derived from the parsed `Diagram`), an **autosave indicator** (driven by the `engine/persist` save signal), **zoom** `−` / `%` / `+` controls and a **Fit** action wired to the engine camera (`editor.getCamera()`, `editor.zoomToFit()`). | SN-4 | P6 |

> **Reactivity constraint.** The engine does **not yet expose a reactive selection signal**
> (`PLAN-JAM-001` P3 retired the non-reactive Inspector for this reason). Therefore selection-driven
> chrome is limited to the **canvas layer** in `FR-CS-05` (where the engine already re-renders the
> selected shape). A reactive *React panel* keyed on selection (the inspector) is **out of scope**
> here and deferred to `canvas-inspector` (see §4), which must first add the reactive signal.

## 3. Non-functional requirements (`NFR-CS`)

| ID | Attribute (ISO 25010) | Requirement |
|----|-----------------------|-------------|
| **NFR-CS-01** | Usability | Every tool and action SHALL carry a tooltip; tools SHALL show a visible shortcut and an obvious active state; both light and dark themes SHALL stay legible (contrast on chrome + canvas). |
| **NFR-CS-02** | Performance efficiency | The chrome MUST NOT regress the engine's ~60 fps. Top-bar/status-bar/tool state changes MUST NOT re-render the canvas **shape layer** (the per-record reactivity from `NFR-J-01` stays intact — chrome state is separate React state). |
| **NFR-CS-03** | Maintainability | The DSL-render bytes from `renderSVG` MUST be **byte-identical** before/after (golden-safe); the chrome is **additive** React components; the engine core (`packages/js-canvas`) is untouched. |
| **NFR-CS-04** | Portability / footprint | **No new runtime dependencies**; the committed `kymo.bundle.js` MUST stay well under budget; `build.sh` and the static GitHub-Pages deploy (`deploy-website.yml`) are unchanged. |
| **NFR-CS-05** | Compatibility | Full **light/dark parity** via `[data-theme]`; design tokens single-sourced so chrome and canvas stay consistent across themes. |

> Inherited and still binding from the siblings: **`NFR-EN-06`** / **`NFR-J-02`** (committed bundle,
> no CI build) and the freeform-layer invariant **`FR-CE-03`** (freeform shapes never serialise into
> `.kymo`) — unaffected by chrome work.

## 4. Scope

**In scope (this feature):** the design-token surface; the top bar; the tool rail + bottom toolbar
wired to the existing engine tools; on-canvas item styling + selection handles/size badge +
comment-pin marker; the status bar (counts, autosave, zoom, fit). All **client-only**.

**Out of scope → named sibling specs (each a later feature so the ≤ 50-SP cap holds):**

| Deferred region | Sibling spec | Why out |
|-----------------|--------------|---------|
| Right inspector panel (Selected props → DSL, Animate, Outline tree) | `canvas-inspector` | ~21 SP + a risky property→DSL surgical patch (cf. `canvas-editor` Tier-2), and it needs a **reactive selection signal** the engine lacks today. |
| Animation timeline (play / pause / seek the flow-dash) | `canvas-timeline` | ~8–13 SP, self-contained, lower priority. |
| Node/edge **creation** tools (frame, shape, diamond, edge-draw, icon-tile) | `canvas-create-tools` | XL; edge-binding/connectors/frames were explicit `canvas-jam` non-goals ("a possible later feature"). The rail (FR-CS-03) reserves their slots as disabled placeholders. |
| Presence / live cursors / comment threads / sharing-with-accounts / dashboard / AI prompt→diagram | — (needs a backend) | Excluded by the **client-only** decision; the top bar shows presence as static placeholders only. |

## 5. Acceptance criteria (feature-level)

1. The playground renders the hi-fi **top bar, left tool rail, and status bar** over the live
   `EngineBoard`, in both light and dark themes (`FR-CS-01/02/03/06`, `NFR-CS-05`).
2. Switching tools from the rail (click **or** keyboard shortcut) drives the engine tool; the
   existing select/pan/draw/sticky/text all work; placeholder tools are visibly disabled
   (`FR-CS-03`).
3. On-canvas items show the prototype styling (tile stripe+glyph, dashed container, flow-dash edge)
   and a selected shape shows **resize handles + a size badge** that track a drag (`FR-CS-04/05`).
4. Undo/redo, theme, Export, and Share work from the top bar; the status bar shows correct
   node/edge counts, a working zoom/Fit, and an autosave indicator (`FR-CS-02/06`).
5. **Golden-safe & client-only:** `packages/js` + `packages/python` goldens are byte-identical, no
   new runtime deps land in `website/app/package.json`, and the build/deploy contract is unchanged
   (`NFR-CS-03/04`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial requirements: `FR-CS-01..06` (tokens, top bar, tool rail, item styling, selection affordances, status bar) + `NFR-CS-01..05`, scope with the deferred-sibling map (`canvas-inspector`/`canvas-timeline`/`canvas-create-tools`) and the reactive-selection constraint, and feature-level acceptance. |

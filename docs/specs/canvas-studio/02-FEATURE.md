---
title: Canvas Studio — Feature & Requirements (SRS)
document_id: FEAT-STUDIO-001
version: "0.7"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the hi-fi editor chrome (`website/app/`); reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - PROD-STUDIO-001
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
| Version           | 0.7                                                              |
| Status            | Draft                                                            |
| Owner             | `diagrams/` project                                             |
| Related Documents | `PROD-STUDIO-001` (stakeholder needs), `DESIGN-STUDIO-001` (how), `TEST-STUDIO-001` (V&V), `FEAT-JAM-001` (the capability layer), `FEAT-CANVAS-001` (the playground host), `KYMO-DSL-001` (the DSL it renders) |

> Requirements per **ISO/IEC/IEEE 29148**. IDs: functional **`FR-CS-NN`**, non-functional
> **`NFR-CS-NN`**. This feature is **client-only** chrome over the complete engine — no backend, no
> new runtime deps, the same static GitHub-Pages deploy. This document owns the `FR-CS`/`NFR-CS`
> IDs; `PLAN-STUDIO-001` never re-defines them.

---

## 1. Stakeholder needs

Stakeholder needs (`SN-CS-01..05`, ISO 29148 §6.4.2 ConOps) are owned by the product description
**`PROD-STUDIO-001`** (`00-PRODUCT.md`). Each requirement below traces back to them via the
**Source need** column.

## 2. Functional requirements (`FR-CS`)

| ID | Requirement | Source need | Phase |
|----|-------------|-------------|-------|
| **FR-CS-01** | The app SHALL adopt a single **design-token surface** ported from the hi-fi prototype (`tokens.css`): surfaces, brand accents, item palette, DSL-syntax colours, radii, type, shadows — with **full light/dark parity** driven by the existing `[data-theme]` attribute on `<html>` (`App.tsx`). No layout change is required by this requirement alone; it is the token foundation the later regions consume. | SN-CS-01, SN-CS-05 | P1 |
| **FR-CS-02** | The app SHALL present a **top bar** replacing the current `<header>`: brand/logo, an **editable title** (local-only label, not persisted), a **theme toggle** (reusing the `[data-theme]` effect), **undo/redo** buttons wired to the engine history (`editor.undo()/redo()`), and **Export** / **Share** entry points reusing the existing `onDownload`/`onShare`. A center **panel toggle**: a single `Code` control shows/hides the `.kymo` pane (the canvas is always present behind it). The bar is **client-only** — it carries **no** breadcrumb, star, comments, version-history, or presence/account chrome (those need a backend; see §4). *(Realized in P7/`FR-CS-07`: the standalone theme toggle was replaced by the top-bar 3-mode appearance control. Amended by `CR-STUDIO-002`: the redundant `Preview` tab was removed — a single `Code` toggle now owns the pane, hidden by default for a canvas-first landing.)* | SN-CS-01, SN-CS-04 | P2 |
| **FR-CS-03** | The app SHALL present a **left tool rail** on the canvas's left edge, driven by a **tool registry** (`{ id, Icon, kbd, title, enabled }`). The active tool is highlighted; a document-level **keyboard shortcut** selects each tool (guarded so the `.kymo` `<textarea>` keeps its keys). It wires the existing engine `Tool` set — `select` (V), `hand` (H, real pan-anywhere tool), `draw` (P), `sticky` (S), `text` (T). Not-yet-built creation tools (frame, shape, diamond, edge, cloud-tile, comment, AI) render as **disabled placeholders** with explanatory tooltips, reserving their slots for the `canvas-create-tools` sibling. Tool buttons live only in the rail (no duplicates). *(Realized in P7/`FR-CS-07`: the floating toolbar that P3 had kept for sample/background/export was retired — those controls moved to the top bar.)* | SN-CS-02 | P3 |
| **FR-CS-04** | On-canvas **items** SHALL carry the kymo visual language, **matched to `renderSVG`** so the live board agrees with the export: `kymo-node` keeps its real cloud-icon **glyph** + name (the engine already renders the true icon — richer than the prototype's flat-tile mockup, so no downgrade); `kymo-region` matches `renderSVG`'s `REGION_STYLE` — outer = slate `#cbd5e1` solid + faint fill, **inner = purple `#7c3aed` dashed + faint purple fill + `#6d28d9` label**; `kymo-edge` gets the **flow-dash animation** (`#94a3b8`, the signature animated look). Styling lives in `engine/shapes.tsx` (`component` + `toSvg` in lockstep); `note`/`text`/`freedraw` unchanged; `renderSVG` (`packages/js`) is **not** touched (golden-safe). | SN-CS-03, SN-CS-05 | P4 |
| **FR-CS-05** | A **selected** shape SHALL show a **selection rectangle with corner resize handles and a `W × H` size badge** (accent-green, matching the prototype `KSelect`), rendered in the **canvas layer** — extending the engine's existing in-wrapper selection outline so it tracks a dragged shape frame-for-frame. Handles are **presentational** in the MVP (interactive resize is the `canvas-create-tools`/transform backlog). *(The comment-pin marker once listed here was dropped — there is no comment data model; comment markers belong to the backend comments feature, not this client-only phase.)* | SN-CS-03 | P5 |
| **FR-CS-06** | The app SHALL present a **status bar** (floating at the canvas bottom): **node/edge counts** (`diagram.components`/`edges`); an **autosave indicator** (`Saving…`→`Saved`, driven by document edits — the app debounce-persists source→URL and camera/freeform→IndexedDB); and **zoom** `−`/`%`/`+` + **Fit** wired to the engine via a `ViewApi` (`zoomToPoint`/`zoomToFit` through `applyCamera`). The `%` readout is **polled in an isolated `StatusBar`** so zoom (incl. wheel) updates it **without** re-rendering the canvas shape layer (`NFR-CS-02`). | SN-CS-04 | P6 |
| **FR-CS-07** | The chrome SHALL have **one owner per control**, removing the `FR-CS-02`/`FR-CS-03` duplication. The **floating canvas toolbar is removed**; its non-duplicate controls move to the **top bar** — the **sample/starter picker** and a **3-mode canvas-background control** (light / dark / transparent) reusing the existing `selectBg`/`bgActive`. The top bar's standalone theme toggle is **subsumed** by that control (light/dark already re-theme chrome+canvas via the single `theme` var; transparent flips only the canvas bg). **Export** SHALL have a **single** entry point (the top-bar Export; the floating `SVG` button — the same `onDownload` — is removed). The center chrome SHALL be a **single `Code` toggle** whose `active` state reflects pane visibility *(amended by `CR-STUDIO-002`: the `Preview` tab — redundant once code is hidden by default — was removed; superseding the original "truthful `Code`/`Preview` tabs" wording).* Client-only; `renderSVG`/`svgBackground` untouched (golden-safe). | SN-CS-01, SN-CS-04, SN-CS-05 | P7 |

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
| Presence / live cursors / comment threads / sharing-with-accounts / dashboard / AI prompt→diagram | — (needs a backend) | Excluded by the **client-only** decision; the top bar carries no presence/account/comments chrome at all. |

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
6. **One owner per control:** there is **no** floating toolbar; the sample picker and the canvas
   background control live in the top bar; there is a **single** Export entry point; and a **single
   `Code` toggle** owns the code-pane state — no `Preview` tab, code hidden on first load
   (`FR-CS-07`, amended by `CR-STUDIO-002`).

---

## Annex A — Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 0.1     | 2026-05-24 | Vũ Anh | Initial requirements: `FR-CS-01..06` (tokens, top bar, tool rail, item styling, selection affordances, status bar) + `NFR-CS-01..05`, scope with the deferred-sibling map (`canvas-inspector`/`canvas-timeline`/`canvas-create-tools`) and the reactive-selection constraint, and feature-level acceptance. **P2 build:** `FR-CS-02` trimmed to client-only — dropped breadcrumb/star/Comments/Versions/presence (all backend-implying). **P3 build:** `FR-CS-03` realised as a left tool rail — tool buttons moved out of the floating toolbar (which keeps sample/bg/export); `hand` is a real pan-anywhere engine tool. **P4 build:** `FR-CS-04` matched to `renderSVG` (not the flat-tile mockup) — node keeps the real glyph; region outer-slate / inner-purple-dashed; edges flow-dash. **P5 build:** `FR-CS-05` shipped — selection rect + 4 corner handles + `W × H` badge (accent-green, prototype `KSelect`); comment-pin dropped (no comment data model). **P6 build:** `FR-CS-06` status bar shipped — counts · autosave (`Saving…`→`Saved`) · zoom −/%/+/Fit via the engine `ViewApi` (isolated `%` poll, 0 canvas re-renders). **canvas-studio complete (P1–P6).** |
| 0.2     | 2026-05-25 | Vũ Anh | **P7 (chrome de-dup):** added **`FR-CS-07`** — one owner per control. The floating toolbar is removed; the sample picker + a 3-mode (light/dark/transparent) canvas-background control move to the top bar; a single Export entry point; truthful `Code`/`Preview` tabs. Supersedes the standalone-theme-toggle clause of `FR-CS-02` and the floating-toolbar clause of `FR-CS-03`; added §5 acceptance #6. Pure relocation — `renderSVG`/`svgBackground` untouched (golden-safe). |
| 0.3     | 2026-05-25 | Vũ Anh | **Doc reorganization.** Moved §1 stakeholder needs to `PROD-STUDIO-001` (renamed `SN-1..5` → `SN-CS-01..05`); §1 now points there and the `FR-CS` Source-need column cites the new IDs. No requirement content changed. |
| 0.4     | 2026-05-25 | Vũ Anh | **Renumber for reading order.** Renamed `02-FEATURE.md` → `03-FEATURE.md`; updated the §1 `PROD-STUDIO-001` pointer to `02-PRODUCT.md`. Numbering now follows the reading order (`01-INTRO` first). See `INTRO-STUDIO-001` §2. |
| 0.5     | 2026-05-25 | Vũ Anh | **P7 reconciled to as-built (`CR-STUDIO-001`).** P7 is now implemented & verified, so the `FR-CS-02`/`FR-CS-03` supersession notes moved from pending to **realized** (past tense): the standalone theme toggle is subsumed by the top-bar 3-mode appearance control, and the floating toolbar P3 had kept for sample/bg/export was retired (those controls live in the top bar). §5 acceptance #6 now holds. No requirement scope changed. |
| 0.6     | 2026-05-28 | Vũ Anh | **Restructure to repo-norm layout.** Renamed `03-FEATURE.md` → `02-FEATURE.md`; updated the §1 `PROD-STUDIO-001` pointer to `00-PRODUCT.md`. No requirement scope changed. See `INTRO-STUDIO-001` Annex A 0.4. |
| 0.7     | 2026-05-31 | Vũ Anh | **`CR-STUDIO-002` re-baseline (editor-chrome simplification).** `FR-CS-02` center tabs → a single `Code` toggle; `FR-CS-07` "truthful `Code`/`Preview` tabs" → single `Code` toggle (the `Preview` tab is removed — redundant once code is hidden by default); §5 acceptance #6 reworded to match (single `Code` toggle, code hidden on first load). Canvas-first default. Client-only; goldens byte-identical. |

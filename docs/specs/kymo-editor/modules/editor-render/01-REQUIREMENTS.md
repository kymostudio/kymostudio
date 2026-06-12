---
title: Editor Render — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KRENDER-001
version: "0.3"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the kymo-editor authoring surface (`packages/editor/web/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
  - FEAT-FLOWCHART-001
  - FEAT-KYMOJSON-001
  - REF-KROKI-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - kymo-editor
  - editor-render
  - client-side-render
  - wasm
  - kroki
  - diagram-kinds
  - samples
  - codemirror
  - splitter
  - dompurify
  - svg-sanitization
---

# Editor Render — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KRENDER-001` |
| Version           | 0.3 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KSHARE-001` (sibling — sharing & export), `FEAT-KLIVE-001` (sibling — accounts & live documents), `FEAT-KLIBRARY-001` (sibling — library & workspaces), `FEAT-KEMCP-001` (sibling — MCP channel), `FEAT-FLOWCHART-001` (the native DSL), `FEAT-KYMOJSON-001` (the engine reused unchanged), `REF-KROKI-001` (the external render gateway) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns the **authoring & rendering surface**: the client-side kymo render path (wasm), the 29-kind selector with per-kind samples, kroki.io delegation for non-kymo kinds, and the editing surface (CodeMirror 6 + pane splitter). It owns the `SN-RD`, `FR-RD`, and `NFR-RD` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §2–5 / §11 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

The fastest way to feel a diagram-as-code loop is to type source and watch the diagram appear — instantly, with no install and no server roundtrip. kymo-editor solved that with a client-side wasm render for the native kymo DSL, and multiplied its daily utility by rendering 28 further diagram languages (Mermaid, PlantUML, D2, GraphViz, …) through kroki.io. Real authoring also demands a professional code surface — highlighting, undo/redo, an adjustable split. As the shipped `kymo-editor` feature is split into modules, **this module owns everything between keystroke and rendered SVG**: the render paths, the kind selector + samples, and the editing surface. What happens to a finished diagram (share/export — `editor-share`), where it lives (rooms/library — `editor-live`/`editor-library`), and who else can author it (MCP — `editor-mcp`) are sibling modules.

### A.2 Users & context of operations (ConOps)

- **Who:** any visitor to editor.kymo.studio — signed-in or not — typing diagram source in the left pane and reading the render on the right.
- **Substrate it builds on (unchanged):** the `kymostudio` JS engine + `kymostudio-core` wasm (`FEAT-KYMOJSON-001`) for kymo kinds; the public kroki.io API (`REF-KROKI-001`) for the other 28 kinds.
- **Constraint:** kymo rendering is **fully client-side** (works offline once the engine chunk is loaded); kroki kinds are network-bound by design and must never block or misorder the UI.

### A.3 Goals & non-goals

- **Goals:** instant in-browser kymo render at parity with the published engine; a practical multi-language pad (28 kroki kinds with starter samples and per-kind highlighting); a professional editing surface (CodeMirror 6, adjustable split).
- **Non-goals (owned by siblings / umbrella):** SVG/PNG/source export and share links (`FEAT-KSHARE-001`); persistence, autosave, live sync, accounts (`FEAT-KLIVE-001`); the library/workspaces (`FEAT-KLIBRARY-001`); the MCP channel (`FEAT-KEMCP-001`); build/deploy and the zero-ops hosting contract (umbrella, `NFR-KE-02/03`); any DSL coverage beyond what the engine renders or kroki.io accepts.

### A.4 Stakeholder needs (`SN-RD`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-RD-01` | An author wants to type diagram source and see the result **immediately**, with no install and no perceptible render delay. | ⊇ `SN-KE-01` |
| `SN-RD-02` | The team wants the kymo output to **match** the `kymostudio` engine exactly (no second renderer to keep in sync). | ⊇ `SN-KE-06` |
| `SN-RD-03` | An author wants to write **other diagram languages** (Mermaid, PlantUML, D2, GraphViz, …) in the same editor. | ⊇ `SN-KE-09` |
| `SN-RD-04` | An author wants a **professional editing surface**: syntax highlighting, line numbers, undo/redo, bracket matching, and an adjustable code/preview split. | ⊇ `SN-KE-12` |

### A.5 Scope

**In scope:** the render orchestration (`EditorPage.doRender`, debounce + stale guard), the lazy engine path (`web/engine.ts`), kroki delegation (`web/kroki.ts`), kinds + samples (`web/samples.ts`), the CodeMirror wrapper (`web/codeeditor.tsx`), and the pane splitter. **Out of scope:** everything listed in §A.3 non-goals — each maps to its sibling spec in §B.3.

---

## Part B — Introduction

### B.1 Purpose & motivation

`kymo-editor` shipped complete (P2–P9, `PLAN-KEDITOR-001` §4). To keep the spec navigable as the product grows, the maintainer is splitting it into **five sibling modules**, mirroring the `canvas-studio` umbrella decomposition (`FEAT-STUDIO-001` → toolbar/export/items). This module is the **authoring & rendering surface** — the part of the product a signed-out, first-time visitor already fully exercises. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

This module is a **stub doc-set**: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` (§2 client app structure, §3 render orchestration, §4 splitter, §11 build) and the V&V in `TEST-KEDITOR-001` (TC-KE-01..03, 05, 06, 17, 18) until a change to this surface warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN` (same strict 4-file shape). Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

```
kymo-editor (FEAT-KEDITOR-001) → UMBRELLA — the shipped editor.kymo.studio product
        ├── editor-render (this)  → authoring & rendering surface        [as-built]
        ├── editor-share          → URL sharing & export                 [as-built]
        ├── editor-live           → accounts, rooms & persistence       [as-built]
        ├── editor-library        → library & workspaces                [as-built]
        └── editor-mcp            → remote MCP channel                  [as-built]
```

**Re-homing summary (from `FEAT-KEDITOR-001`)** — requirement text is carried over verbatim in Part C; the umbrella remains the v0.2 baseline of record:

| Former (kymo-editor) | Re-homed here | What |
|----------------------|---------------|------|
| `FR-KE-01` | `FR-RD-01` | client-side kymo render, lazy engine chunk |
| `FR-KE-02` | `FR-RD-02` | per-kind debounce, stale guard, status line |
| `FR-KE-04` | `FR-RD-03` | icon art from CDN |
| `FR-KE-05` | `FR-RD-04` | error surface, no crash |
| `FR-KE-13` | `FR-RD-05` | kind selector + kroki.io render |
| `FR-KE-14` | `FR-RD-06` | per-kind starter samples, kind persisted |
| `FR-KE-15` | `FR-RD-07` | CodeMirror 6 editing surface |
| `FR-KE-16` | `FR-RD-08` | draggable pane splitter |
| `NFR-KE-01` | `NFR-RD-01` | render performance |
| `NFR-KE-05` | `NFR-RD-02` | engine parity |

`FR-KE-03` (SVG download) re-homes to **`editor-share`** (`FR-SH-04`) with the rest of export. Cross-module seams: the *kind* chosen here is persisted with the diagram by **`editor-live`** (`FR-LV-07`) and badged in the library by **`editor-library`**; share links restore it via `?k=` (**`editor-share`**, `FR-SH-01`).

### B.4 Status & ownership

- **Status:** Implemented — **as-built carve-out**; shipped under kymo-editor P2 + P7 (`PLAN-KEDITOR-001`). No new code is implied by the split.
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-RD-*` are covered by `TEST-KEDITOR-001` TC-KE-01..03, 05, 06, 17, 18 (via the former IDs in its matrix) and TC-KE-24 (FR-RD-09, sanitization).
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — Render (`FR-RD-01..04`, `FR-RD-09`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-RD-01** | The editor SHALL render the kymo `flowchart { }` / `bpmn { }` DSL to SVG **entirely in the browser**, via `parseDiagram(source)` → `renderSVG(...)` from the `kymostudio` package with the `kymostudio-core` wasm initialised once on first use. The engine module SHALL be **lazy-loaded** (dynamic import) on the **first kymo render** — a kroki-kind session (e.g. a Mermaid `?s=` share link) SHALL NOT fetch the wasm chunk at all, and a share link's `?k`/`?s` seed the initial kind/source so the mount cycle never renders the kymo sample. There SHALL be no server roundtrip for kymo rendering. *(v0.3: load moved from editor mount to first kymo render — commit `ef02c04`.)* | SN-RD-01, SN-RD-02 |
| **FR-RD-02** | The editor SHALL re-render on input with a debounce of **120 ms for kymo** and **450 ms for kroki kinds**, SHALL discard stale async render responses (a sequence guard), and SHALL show a status line `OK · <n> bytes · <ms>ms` on success. The **first render of a session** SHALL fire immediately, without waiting out the typing debounce. *(v0.3: immediate first render — commit `ef02c04`.)* | SN-RD-01 |
| **FR-RD-03** | The editor SHALL resolve icon art from a CDN base URL (`setIconBaseURL` → jsDelivr `gh/kymostudio/kymostudio@main/packages/icons`), so no icon assets are bundled or served locally. | SN-RD-02 |
| **FR-RD-04** | On a parse/render error (engine exception or a kroki error response), the editor SHALL surface the message in the status line (error state) and SHALL NOT crash the page. | SN-RD-01 |
| **FR-RD-09** | SVG returned by kroki.io is **third-party markup rendered from source the editor does not control** (a `?s=` share link can carry anyone's source — see `FEAT-KSHARE-001`). Before injection into the page, the editor SHALL **sanitize** it with DOMPurify (`USE_PROFILES: svg + svgFilters + html`), stripping scripts, event handlers, and `javascript:` URLs. `foreignObject` SHALL be **preserved** (Mermaid `htmlLabels` puts every node/edge label in HTML inside one) with its HTML content sanitized via the html profile (`HTML_INTEGRATION_POINTS` extended to `foreignobject`, which DOMPurify excludes by default). Kymo output (the local, trusted engine) does not pass through sanitization. *(As-built: commits `51d08ec`, `a5ff7b5` — module-native requirement, no former `FR-KE` id.)* | SN-RD-03 |

### C.2 Functional requirements — Diagram kinds & samples (`FR-RD-05..06`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-RD-05** | The editor SHALL offer a **kind selector** with `kymo` plus the 28 kroki kinds enumerated in `web/kroki.ts` (ActDiag … WireViz). Non-kymo kinds SHALL render by `POST https://kroki.io/<kind>/svg` with the raw source as the body; a non-OK response SHALL surface as a render error (FR-RD-04). The first render of a `?s=` share link MAY be served by the **early kick-off**: the HTML shell fires the identical POST before the app bundle has downloaded, and `renderKroki` adopts the in-flight response when kind+source match exactly (single use; on mismatch or failure it falls back to a fresh request — `DESIGN-KEDITOR-001` §3). The adopted response passes through the same sanitization (FR-RD-09). *(v0.3: early kick-off — commit `ef02c04`.)* | SN-RD-03 |
| **FR-RD-06** | Switching kind SHALL load that kind's **starter sample** (`web/samples.ts`; each verified to render on kroki.io) into the editor and render it — mirroring kroki.io's own selector behaviour. The current kind SHALL be persisted with the diagram (`FR-LV-07`) and shown as a badge in the library list (`FEAT-KLIBRARY-001`). | SN-RD-03 |

### C.3 Functional requirements — Editing surface (`FR-RD-07..08`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-RD-07** | The code pane SHALL be a **CodeMirror 6** editor with line numbers, active-line highlight, undo/redo history, bracket matching, line wrapping, indent-with-Tab, and **per-kind syntax highlighting** (a generic diagram-DSL tokenizer parameterised by keyword set for DSL-ish kinds; JSON/XML/YAML/Clojure/LaTeX/Verilog modes for the rest), themed on the brand palette. External document changes (room updates, kind switch, share-link load) SHALL replace the buffer without echoing back as user edits. | SN-RD-04 |
| **FR-RD-08** | The code/preview split SHALL be adjustable by a **draggable divider** (clamped 15–85 %), persisted to `localStorage` (`kymo_split`), with double-click resetting to 50/50. | SN-RD-04 |

### C.4 Non-functional requirements (`NFR-RD`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-RD-01** | Performance efficiency | A kymo render MUST complete in the order of tens of milliseconds on a typical laptop and MUST NOT depend on any network call. Kroki renders are network-bound by design and MUST NOT block the UI (async, stale responses dropped). |
| **NFR-RD-02** | Compatibility | Kymo output MUST be produced by the **same `kymostudio` engine** the npm package ships — no second renderer. |

### C.5 Acceptance criteria (module-level)

1. Typing a `flowchart TD { … }` block renders client-side within ~120 ms of pausing, with the byte/ms status line — and kymo rendering works **offline** after the engine chunk has loaded.
2. Switching the kind to (e.g.) Mermaid loads the Mermaid sample, renders it via kroki.io, and switches the syntax highlighting; a slow kroki response never paints over a newer one.
3. Line numbers, undo/redo, bracket match, and Tab-indent work; the splitter drags (clamped 15–85 %), persists across reload, and resets on double-click.
4. Malformed source (kymo or kroki) surfaces in the status line without crashing the page.
5. A kroki SVG carrying `<script>`, event-handler attributes, or `javascript:` URLs renders with all of them stripped — nothing executes in the preview; ordinary Mermaid `htmlLabels` (foreignObject) still display.
6. Opening a kroki-kind share link on a cold profile **never fetches the wasm engine chunk** (network panel: no `chunks/engine-*.js`), and its kroki POST is in flight before `main.js` finishes downloading (the early kick-off).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-01/06/09/12 → SN-RD-01..04`, `FR-KE-01/02/04/05/13/14/15/16 → FR-RD-01..08`, `NFR-KE-01/05 → NFR-RD-01..02`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. |
| 0.2     | 2026-06-12 | Vũ Anh | **As-built reconciliation: third-party SVG sanitization.** Added **`FR-RD-09`** — kroki SVG is sanitized with DOMPurify before DOM injection (scripts/handlers/`javascript:` stripped; `foreignObject` preserved with html-profile-sanitized content for Mermaid `htmlLabels`); kymo output stays unsanitized (trusted local engine). Module-native id (no former `FR-KE`); shipped in commits `51d08ec`/`a5ff7b5` but previously undocumented. Added acceptance #5; traceability extended to TC-KE-24 (`TEST-KEDITOR-001` v0.3); see ADR-9 in `DESIGN-KEDITOR-001` v0.3. |
| 0.3     | 2026-06-12 | Vũ Anh | **Share-link first-load perf re-baseline** (commit `ef02c04`, P11 in `PLAN-KEDITOR-001` v0.4). `FR-RD-01`: engine chunk loads on **first kymo render** (was: editor mount) — kroki-kind sessions never fetch the wasm; share `?k`/`?s` seed initial state. `FR-RD-02`: first render of a session fires without the debounce. `FR-RD-05`: documented the **early kroki kick-off** (HTML shell fires the POST pre-bundle; `renderKroki` adopts on exact kind+source match; sanitization unchanged). Acceptance #6 added; see ADR-10 in `DESIGN-KEDITOR-001` v0.4 and the `benches/editor` snapshot (Annex B of `TEST-KEDITOR-001` v0.4). |

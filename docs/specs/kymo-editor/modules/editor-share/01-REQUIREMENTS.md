---
title: Editor Share — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KSHARE-001
version: "0.3"
issue_date: 2026-06-13
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining kymo-editor's sharing & export surface (`packages/editor/web/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
  - FEAT-KRAPI-001
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
  - editor-share
  - url-sharing
  - share-codec
  - deflate
  - base64url
  - export
  - svg
  - png
---

# Editor Share — Requirements (ConOps, StRS & SRS)

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-KSHARE-001` |
| Version           | 0.3 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella the needs were carved from), `FEAT-KRENDER-001` (sibling — render & editing surface), `FEAT-KLIVE-001` (sibling — accounts & live documents), `FEAT-KLIBRARY-001` (sibling — library & workspaces), `FEAT-KEMCP-001` (sibling — MCP channel), `FEAT-KRAPI-001` (the render Worker the Markdown-image GET URL now points at), `REF-KROKI-001` (the encoding it stays compatible with) |

> **Module of the `kymo-editor` umbrella** (`FEAT-KEDITOR-001`). This module owns **getting a finished diagram out of the editor**: kroki-style `?s=` URL sharing (codec, address-bar autosync, Share action) and the Export menu (SVG / PNG / source). It owns the `SN-SH`, `FR-SH`, and `NFR-SH` IDs, re-homed as-built from `FEAT-KEDITOR-001` (see §B.3). This is a **stub doc-set** (01 only): the *how* and *V&V* remain in `DESIGN-KEDITOR-001` §5 and `TEST-KEDITOR-001` until this module grows its own 02/03/04.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

Sharing must not require sign-in: a reader given a link should see (and tweak) the diagram with no account and no stored document. kymo-editor solved this kroki-style — the **whole source travels in the URL** (deflate + base64url), interchangeable with kroki.io's own GET payloads — and pairs it with client-side export to SVG, PNG, and the raw source. As the shipped feature is split into modules, **this module owns the share codec, the address-bar autosync, the Share action, and the Export menu**. The rendering that produces the SVG being exported is `editor-render`; cross-user sharing of *server-side* documents remains a non-goal (a `?d=` room is owner-only — `editor-live`).

### A.2 Users & context of operations (ConOps)

- **Who:** authors (signed-in or not) copying a link or downloading artefacts; recipients opening a `?s=` link in any browser with no account.
- **Mechanics:** `?s=<deflate+base64url>` (+ `&k=<kind>` for non-kymo kinds) carries the source; the address bar keeps itself a working share link while editing without a room; Export rasterises/downloads entirely client-side.
- **Constraint:** no server-side document and no server-side export pipeline are involved anywhere on this surface.

### A.3 Goals & non-goals

- **Goals:** account-free open/edit/re-share via the URL alone; kroki-compatible payload interchange in both directions; one-click Share with clipboard confirmation; export to title-named SVG / 2× PNG / source text.
- **Non-goals (owned by siblings / umbrella):** rendering itself (`FEAT-KRENDER-001`); room links `?d=` and their precedence machinery beyond what FR-SH-02 states (`FEAT-KLIVE-001`); cross-user server-side sharing (umbrella non-goal — deferred); server-side render/export (umbrella non-goal).

### A.4 Stakeholder needs (`SN-SH`)

| ID | Need | ⊇ former |
|----|------|----------|
| `SN-SH-01` | An author wants to **share** a diagram by sending a single URL, and to **download** the rendered SVG. | ⊇ `SN-KE-02` |
| `SN-SH-02` | A recipient of a shared link wants to **open, edit, and re-share** the diagram **without an account**, and the link must not depend on any stored document. | ⊇ `SN-KE-10` |
| `SN-SH-03` | An author wants to **export PNG** (for docs/slides) and the **source text**, not just SVG. | ⊇ `SN-KE-11` |

### A.5 Scope

**In scope:** the share codec + `shareUrl` (`web/share.ts`), the address-bar autosync, the Share UI, and the Export menu (SVG/PNG/source) in the header. **Out of scope:** everything in §A.3 non-goals.

---

## Part B — Introduction

### B.1 Purpose & motivation

Part of the five-module decomposition of the shipped `kymo-editor` (see `FEAT-KEDITOR-001` and `FEAT-KRENDER-001` §B.1 for the rationale and the module tree). This module is the **outbound surface** — the only one a recipient with no account ever touches. As an as-built carve-out it re-homes the relevant `FEAT-KEDITOR-001` IDs (§B.3) and changes no behaviour.

### B.2 Document map

Stub doc-set: only this `01-REQUIREMENTS.md` exists. The *how* lives in `DESIGN-KEDITOR-001` §5 (share codec) and the Export paths in §2, the V&V in `TEST-KEDITOR-001` (TC-KE-04, 15, 16, 23), until a change warrants module-local `02-DESIGN` / `03-TEST` / `04-PLAN`. Cross-document references use **`document_id`** (never file paths).

### B.3 Relationship to the kymo-editor umbrella & sibling modules

See the module tree in `FEAT-KRENDER-001` §B.3 (identical for all five siblings).

**Re-homing summary (from `FEAT-KEDITOR-001`)** — requirement text carried over verbatim in Part C:

| Former (kymo-editor) | Re-homed here | What |
|----------------------|---------------|------|
| `FR-KE-25` | `FR-SH-01` | kroki-style `?s=` codec |
| `FR-KE-26` | `FR-SH-02` | address-bar autosync |
| `FR-KE-27` | `FR-SH-03` | Share action (copy + confirm) |
| `FR-KE-03` | `FR-SH-04` | SVG download |
| `FR-KE-28` | `FR-SH-05` | PNG export |
| `FR-KE-29` | `FR-SH-06` | source download |
| `NFR-KE-07` | `NFR-SH-01` | kroki-compatible encoding |

Cross-module seams: the SVG being exported is the last successful render from **`editor-render`**; `?d=` taking precedence over `?s=` is the room-mode rule owned by **`editor-live`**; the `&k=` kind round-trips into the kind selector (**`editor-render`**, `FR-RD-05/06`).

### B.4 Status & ownership

- **Status:** Implemented — **as-built carve-out**; shipped under kymo-editor P6 (export) + P9 (URL sharing) + P10 (share popover — see `PLAN-KEDITOR-001` v0.3). The popover commits `6577011`/`607b156` flagged at v0.1 as the first candidate re-baseline are folded in as of v0.2 (`FR-SH-03`).
- **Owner:** `diagrams/` project (Vũ Anh).
- **Traceability:** `FR-SH-*` are covered by `TEST-KEDITOR-001` TC-KE-04, 15, 16, 23 (via the former IDs in its matrix).
- **Change management:** changes are raised as CRs under `docs/specs/kymo-editor/CR/` (umbrella) or module-local `CR/` once this doc-set grows, and re-baselined here (bump version + Annex A).

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords; text is carried over as-built from `FEAT-KEDITOR-001` v0.2 (internal references rewritten to module IDs).

### C.1 Functional requirements — URL sharing (`FR-SH-01..03`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-SH-01** | The editor SHALL encode share links **kroki-style**: source → raw-deflate (`CompressionStream("deflate")`, zlib) → **base64url** (`+`→`-`, `/`→`_`, padding stripped) → `/?s=<payload>`, with `&k=<kind>` prepended for non-kymo kinds (omitted for kymo). Decoding SHALL accept payloads lifted from kroki.io GET URLs unchanged; an undecodable payload SHALL surface as a status-line error. | SN-SH-02 |
| **FR-SH-02** | When editing **without a room** (signed out, or a shared link), the editor SHALL keep the address bar a **working share link** — re-encoding into `?s=` via `history.replaceState` on a 300 ms debounce. A `?d=` room link takes precedence over `?s=` when both are present. | SN-SH-02 |
| **FR-SH-03** | The **Share** action SHALL open a **popover** that copies the share URL to the clipboard immediately on open (with a prompt fallback) and confirms visually. The popover SHALL offer: the URL in a select-on-focus field with a **Copy** button; a **length warning** when the link exceeds 2 000 characters (chat apps may truncate); **Copy Markdown link** (`[<title>](<url>)`); and — for non-kymo kinds — **Copy Markdown image**, a **render.kymo.studio GET** URL (`https://render.kymo.studio/<kind>/svg/<payload>`) built from the same `?s=` payload (the `NFR-SH-01` interchange — render.kymo.studio accepts the Kroki GET encoding — usable directly in a GitHub README). *(v0.2: popover with copy variants + auto-copy replaces the v0.1 single copy-button — commits `6577011`/`607b156`. v0.3: the GET image URL points at **render.kymo.studio** instead of kroki.io — commit `07f7d9a`; and opening Share fires a fire-and-forget **warm-up POST** of the current kind+source to render.kymo.studio — `warmedShare` dedupe, commit `531b5c7` — so the recipient's first paint and GitHub's image fetch hit a warm content-hash cache.)* **Known gap:** a very long source can still produce a GET URL longer than the upstream limit; the 2 000-character warning covers only the editor link, not the GET URL. | SN-SH-01, SN-SH-02 |

### C.2 Functional requirements — Export (`FR-SH-04..06`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-SH-04** | The editor SHALL let the user **download** the last successfully rendered SVG, named after the diagram title (`<title>.svg`, falling back to `flowchart.svg`). | SN-SH-01 |
| **FR-SH-05** | The Export menu SHALL produce a **PNG** of the last rendered SVG at 2× scale (canvas rasterise, white background, `viewBox` fallback for dimensions), named `<title>.png`. | SN-SH-03 |
| **FR-SH-06** | The Export menu SHALL download the **source text** (`<title>.kymo` for kymo; `<title>.<kind>.txt` otherwise) and SHALL also offer the SVG download (FR-SH-04). | SN-SH-03 |

### C.3 Non-functional requirements (`NFR-SH`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-SH-01** | Compatibility (sharing) | The `?s=` payload encoding MUST remain **kroki-compatible** (deflate + base64url) so payloads interchange with kroki.io URLs in both directions. |

### C.4 Acceptance criteria (module-level)

1. Signed out: editing keeps the address bar a working `?s=` link; opening that link in a private window reproduces the diagram (source + kind); a kroki.io GET payload pasted into `?s=` decodes; a corrupted payload shows the invalid-link error.
2. Opening Share puts the working URL straight in the clipboard and shows the popover (URL field, Copy, Markdown-link variant; for non-kymo kinds a Markdown-image variant whose `https://render.kymo.studio/<kind>/svg/<payload>` GET URL renders the same diagram when fetched) and fires a warm-up POST to render.kymo.studio; with clipboard blocked, the prompt fallback appears; a link over 2 000 characters shows the truncation warning.
3. Export produces `<title>.svg` (bytes equal the displayed SVG), `<title>.png` at 2× on white, and the source file named by kind.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-12 | Vũ Anh | Initial **as-built carve-out** from `FEAT-KEDITOR-001` v0.2 under the kymo-editor umbrella decomposition. Re-homes `SN-KE-02/10/11 → SN-SH-01..03`, `FR-KE-25/26/27/03/28/29 → FR-SH-01..06`, `NFR-KE-07 → NFR-SH-01`. Stub doc-set (01 only); design/V&V remain in `DESIGN-KEDITOR-001` / `TEST-KEDITOR-001`. Post-v0.2 share-popover commits noted as the first candidate re-baseline. |
| 0.2     | 2026-06-12 | Vũ Anh | **Re-baseline `FR-SH-03` to the shipped share popover** (commits `6577011`/`607b156`, P10 in `PLAN-KEDITOR-001` v0.3): auto-copy on open, URL field + Copy, > 2 000-char truncation warning, Copy Markdown link, and Copy Markdown image (kroki.io GET URL from the same `?s=` payload — the `NFR-SH-01` interchange). Recorded the known gap that kroki.io's ~4 k GET URL limit is not separately warned about. Acceptance #2 updated; TC-KE-16 revised in `TEST-KEDITOR-001` v0.3. |
| 0.3     | 2026-06-13 | Vũ Anh | **render.kymo.studio re-point (P12/P15).** `FR-SH-03`: the **Copy Markdown image** GET URL now targets `https://render.kymo.studio/<kind>/svg/<payload>` (`FEAT-KRAPI-001`) instead of kroki.io (commit `07f7d9a`), preserving the `NFR-SH-01` Kroki-GET encoding interchange; and opening Share fires a **warm-up POST** to render.kymo.studio (`531b5c7`) so the recipient's first paint hits a warm content-hash cache. Acceptance #2 updated. Codec, address-bar autosync, and export paths unchanged. |

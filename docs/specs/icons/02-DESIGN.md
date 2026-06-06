---
title: kymo Icons v2 — Design
document_id: DESIGN-ICONS-001
version: "0.2"
issue_date: 2026-06-04
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo icon catalogue, generator, renderer, and JS loader
review_cycle: On phase completion, or on scope change
supersedes: null
related_documents:
  - FEAT-ICONS-001              # Requirements (ConOps + SN + SRS; traced below)
  - TEST-ICONS-001              # Test documentation
  - PLAN-ICONS-001              # Plan
  - RES-ICONS-001               # Prior-art research (Iconify) — the evidence base
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - design
  - iconify-json
  - generator
  - loader
  - on-demand
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo Icons v2 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-001                                   |
| Version      | 0.1                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-06-04                                         |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-ICONS-001, TEST-ICONS-001, PLAN-ICONS-001, RES-ICONS-001 |

Realises FEAT-ICONS-001 (FR/NFR cited per clause). The icon-record / IconifyJSON mechanics
are evidenced by RES-ICONS-001 §2–§5. Covers ISO/IEC/IEEE 12207 Architecture & Design.

## 1. Scope

The icon **catalogue format** (per-set IconifyJSON artifacts), the **generator** that emits
it, the **renderer/loader** changes in both packages, and the **on-demand client loading**
path. The renderers/loaders live in `packages/python` (`src/kymo/icons.py`) and `packages/js`
(`src/icons-loader.ts`, `src/icons-builtin.ts`); the catalogue + generator
(`scripts/build-manifest.mjs`) are the shared **`packages/icons`** package — the single source of
truth both implementations resolve through (see ICONS-MAP-001 §2 and CR-ICONS-008). It replaces
the current state diagnosed in RES-ICONS-001 §6.

## 2. Current state (the thing being replaced)

- **Catalogue** — root `icons/`: ~2,460 files / ~38 MB, **99.9% raster PNG**, vendored from
  `mingrammer/diagrams` with no version/update/license manifest.
- **Python** — `icons.py`: 34 hand-coded vector glyphs in `ICONS` + file-backed icons
  catalogued by `_scan_icons_dir()`. PNG → base64 `<image>` at a fixed 64 px; SVG →
  `_svg_as_inline()` dumps the **entire raw document** (no viewBox normalization, no
  `id`/`defs` dedup → collisions and bloat).
- **JS** — `icons-loader.ts`: async mirror; `getIcon()` lazily fetches manifest then asset,
  base64-embeds into the same 64 px wrapper, caches. 34 built-ins in `icons-builtin.ts`.
- **Manifest** — `build-manifest.mjs` walks `icons/` → `icons-manifest.json`, a flat
  `{ key: path }` map (148 KB) loaded **whole**; **2,300 keys for 2,457 PNGs** → ~157
  unreachable; no metadata.

## 3. Catalogue format — per-set IconifyJSON (FR-1, FR-2, FR-3, FR-4, FR-5)

The unit of storage is the **icon set**: one JSON file per collection (e.g. `aws.json`,
`gcp.json`), shaped per RES-ICONS-001 §2 —

```jsonc
{
  "prefix": "aws",
  "width": 24, "height": 24, "left": 0, "top": 0,   // root defaults, inherited
  "icons": {
    "lambda": { "body": "<path d=\"…\"/>" },          // inherits 24×24
    "s3":     { "body": "<path d=\"…\"/>", "width": 32 }
  },
  "aliases": {
    "lambda-fn": { "parent": "lambda" },              // synonym
    "s3-flip":   { "parent": "s3", "hFlip": true }     // synonym + transform
  },
  "info": { "name": "AWS", "total": 320, "license": { "title": "…" } }
}
```

Design choices (FR-2/FR-3): **body, not document** (the renderer wraps it on demand);
**sparse + root defaults** (a dimension/transform appears on an icon only when it differs
from the root; a minify pass hoists the common value); **self-describing** (`info` travels
with the data). Icons are addressed globally as **`prefix:name`** matching
`^[a-z0-9]+(-[a-z0-9]+)*$` (FR-1), keeping the category in the name so the legacy
last-write-wins collisions disappear. **Aliases** (FR-4) collapse synonyms / transformed
variants without a second copy of the path data, resolved by walking the parent chain and
merging properties with cycle guards.

## 4. Generator — one source of truth (FR-8, NFR-1, NFR-3)

A single build tool (extending `scripts/build-manifest.mjs` into a real generator) takes
**vector source art** and runs the RES-ICONS-001 §4 pipeline:

```
importDirectory(dir, { prefix })
  └─ per icon: cleanupSVG()                 // strip scripts/styles/editor cruft, remote refs
              parseColors({ default: 'currentColor' })
              runSVGO()                      // minify paths, drop metadata, round coords
              (validate viewBox / dims)
  └─ deduplicate identical bodies → aliases
  └─ minifyIconSet()                         // hoist common dims to root
  → emit <prefix>.json (+ optional .d.ts)
```

The emitted per-set JSON is the **single artifact** both implementations consume (FR-8),
replacing the two hand-maintained scanners. SVG-normalization tooling is a **build-time**
dependency of the generator only — `packages/js` stays zero-runtime-dep (NFR-3). The
generator is deterministic so its output is diffable and parity-checkable (NFR-1).

## 5. Renderer & inlining (FR-6, FR-7)

Both renderers assemble `<svg viewBox="left top width height">{body}</svg>` at the requested
size from the resolved record (FR-6); `currentColor` in the body makes icons themeable, and
the vector body scales crisply. To keep repeated icons in one document collision-free
(FR-7), inlining either (a) namespaces/suffixes element `id`s per use, or (b) emits each
distinct icon once into `<defs>` and references it with `<use>` — chosen so output stays
byte-stable for unaffected diagrams. Feature defs/CSS are injected **only when used** so the
golden SVG and BPMN-corpus baselines don't churn (NFR-2; same discipline as `bpmn_shapes`).

## 6. Loader & on-demand loading (FR-9)

The JS loader (`icons-loader.ts`) keeps its async `getIcon()` shape but resolves against the
per-set artifact: it **collects** referenced `prefix:name`s, **batches** one request per
prefix for only those icons, and **caches** results tiered `prefix → { icons, missing }` (in
memory; `localStorage` where available), recording 404s in `missing` so a name is never
re-requested (RES-ICONS-001 §5). Python (`icons.py`) loads the per-set JSON for the prefixes
a diagram references (cached on first hit, as `icons.py` already caches its file scan).

## 7. Backwards compatibility (FR-11)

A compatibility map / alias layer resolves legacy `<provider>-<name>` keys to the new
`prefix:name` records, so authored `.kymo`/BPMN diagrams keep rendering across the upgrade.
The 34 hand-coded built-in glyphs (`ICONS` / `icons-builtin.ts`) are retained — re-expressed
as records in a `kymo` (built-in) set — so no in-repo sample regresses.

## 8. Cross-language parity (NFR-1)

The catalogue artifact and the resolved record (body + effective dims after alias/transform
resolution) are compared by the golden conformance suite, with **Python as reference impl
and sole golden writer**. A divergence is reconciled toward Python, not loosened — the same
discipline `CLAUDE.md` mandates for the existing `.kymo`/BPMN conformance.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-06-04 | Vũ Anh | Initial issue — design of the IconifyJSON-style catalogue, generator, renderer/inliner, on-demand loader, and parity gate, derived from RES-ICONS-001. |
| 0.2     | 2026-06-06 | Vũ Anh | §1 reconciled: the catalogue + generator are now the shared `packages/icons` package (single source of truth) per CR-ICONS-008; renderers/loaders stay in the language packages. §2 (state being replaced) left historical. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the spec; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces
(FR-1…FR-11, NFR-1…NFR-4) consistent with FEAT-ICONS-001; increment `version`; append a row
to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-ICONS-001.
Reconcile any deviation there before release.

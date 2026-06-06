---
title: "Icons CR-007 — Design: inline-set resolution & the `ai` artifact"
document_id: DESIGN-ICONS-CR007
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the icon loaders + generator
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-007                # Requirements — CR-ICONS-007/01-REQUIREMENTS
  - TEST-ICONS-CR007            # Verification — CR-ICONS-007/03-TEST
  - PLAN-ICONS-CR007            # Plan — CR-ICONS-007/04-PLAN
  - ICONS-MAP-001               # Catalogue-format doc (§2.1)
  - DESIGN-ICONS-001            # Baseline design
  - CR-ICONS-004                # P3 per-set IconifyJSON + collections
  - CR-ICONS-005                # P4 record rendering reused here
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - design
  - inline-body
  - loader
  - generator
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-007 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR007                                 |
| Version      | 0.1                                                |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-007, TEST-ICONS-CR007, PLAN-ICONS-CR007, ICONS-MAP-001, CR-ICONS-004, CR-ICONS-005 |

Realises **CR-ICONS-007**. Three small, additive changes — loader resolution, generator index, and
the vendored artifact.

## 1. The artifact — `packages/icons/sets/ai.json`

A standard per-set IconifyJSON (P3 shape), but **inline**: each record carries `body` (the inner
SVG, no `<svg>` wrapper) plus its own `width`/`height` (the source viewBox), and a `category`.
There is **no** `path`, and **no** `icons/ai/` directory.

```jsonc
{
  "prefix": "ai", "width": 256, "height": 256,
  "icons": {
    "anthropic": { "body": "<path fill=\"#181818\" d=\"…\"/>", "width": 256, "height": 176, "category": "provider" },
    "gemini":    { "body": "<defs><radialGradient id=\"…\"/>…</defs><path fill=\"url(#…)\" …/>", "width": 512, "height": 188, "category": "provider" },
    "openai":    { "body": "<path d=\"…\"/>", "width": 256, "height": 260, "category": "provider" }
  },
  "aliases": {},
  "info": { "name": "AI", "total": 3,
            "author":  { "name": "gilbarbara/logos (SVG Logos)", "url": "https://github.com/gilbarbara/logos" },
            "license": { "title": "CC0 1.0", "spdx": "CC0-1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/" },
            "categories": { "provider": ["anthropic", "gemini", "openai"] } }
}
```

Bodies are taken verbatim from the Iconify API (`GET /logos.json?icons=openai-icon,anthropic-icon,google-gemini`)
— Iconify's own canonical data — so brand fills/gradients are preserved. The recolour step
(`parseColors → currentColor`) is **not** applied (these are not monochrome glyphs).

## 2. Resolution (both loaders)

A file-backed address is in the flat `icons-manifest.json`; an inline address is not, so it falls
through to a per-set load:

- **Python `icons.py`** — `get_icon` gains a tail branch after the path lookup: `_inline_record(key)`
  loads `sets/<prefix>.json` (cached `load_set`), and if the record carries `body`, builds a
  self-contained `{body, width, height}` (set-level dims filled in), registers it via
  `register_record`, and renders through the existing P4 `render_record` (`<svg viewBox>{body}</svg>`,
  `make_ids_safe` per use).
- **JS `icons-loader.ts`** — the on-demand `getIcon` path already fetches `sets/<prefix>.json` for an
  address; when the record has `body` it now renders inline via `renderRecord` + `makeIdsSafe`
  (mirrors `render_record`/`icons_pipeline`), instead of fetching `rec.path`. `loadSet` caches the
  set-level `width`/`height` to fill sparse records.

Both render the record **fresh per call** (not cached), so the same icon inlined N times in one
document gets disjoint element ids (FR-7) — critical for Gemini's gradient ids.

## 3. Generator — keeping the set indexed

`build-manifest.mjs` scans `icons/` and rewrites the generated sets + `icons-collections.json`
wholesale. It never touches `sets/ai.json` (no `icons/ai/` source), but the collections rewrite would
drop `ai`. The fix: after building the generated collections, read every `sets/*.json` **not** in the
generated set (the vendored inline ones) and add its `{ total, categories }` from `info`; then write
`icons-collections.json` with **sorted** keys (so `ai` sorts first, deterministically). This is the
only generator output that changes; `icons-manifest.json` and `sets/<provider>.json` stay
byte-identical.

## 4. CLI

`list`/`describe` already read `collections()` + `load_set`, so they surface `ai` with no change.
`describe` is refined to print `source : inline (IconifyJSON body)` and a `license` line when the
record has no `path` — on both the Python and JS CLIs, for parity.

## 5. Why not the file path?

Dropping PNG/SVG files into `icons/ai/` and letting the generator scan them was the alternative. It
was rejected: it loses brand colour (rasterised or recoloured), stores art kymo can render natively
as a wrapper around bytes, and is *not* how Iconify manages a set. Inline `body` is the Iconify model
and the lighter artifact.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — inline-set resolution (both loaders), generator collections-merge, `ai` artifact, CLI describe refinement. |

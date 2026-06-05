---
title: kymo Icons — Catalogue Format (prefix:name + IconifyJSON)
document_id: ICONS-MAP-001
version: "1.0"
issue_date: 2026-06-05
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers using or maintaining the kymo icon catalogue, generator, loaders, and the kymo icons CLI
review_cycle: On catalogue-format or generator change
supersedes: null
related_documents:
  - FEAT-ICONS-001              # Requirements (FR/NFR)
  - DESIGN-ICONS-001            # Design
  - RES-ICONS-001               # Prior-art research (Iconify)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - prefix-name
  - iconify-json
  - manifest
  - aliases
  - generator
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo Icons — Catalogue Format

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | ICONS-MAP-001                                      |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Owner        | `diagrams/` project                                |
| Related      | FEAT-ICONS-001, DESIGN-ICONS-001, RES-ICONS-001    |

This is the **authoritative** description of the kymo Icons v2 catalogue: the
addressing scheme, the per-set IconifyJSON shape, aliases, the generated
artifacts, and the legacy-compatibility contract. The renderer, the JS loader,
and the `kymo icons` CLI all cite this document rather than re-describing the
format. It is realised by phases P1–P6 of PLAN-ICONS-001 (CR-ICONS-001..006).

## 1. Addressing — `prefix:name`

Every icon has one collision-proof address `prefix:name`, both halves matching
`^[a-z0-9]+(-[a-z0-9]+)*$`:

- `prefix` — the icon **set** (the top-level provider directory, e.g. `aws`).
- `name` — the rest of the source path, category **retained**, slugged and
  joined with `-` (e.g. `icons/aws/security/waf.png` → `aws:security-waf`).

Because the category is kept, two icons that the legacy flat `<provider>-<name>`
key collapsed onto one slot now hold distinct addresses — the catalogue exposes
**one address per source file** (no silent shadowing; FR-1).

## 2. Generated artifacts

A single generator — `packages/js/scripts/build-manifest.mjs` — scans the
repo-root `icons/` and emits (deterministically; re-running produces no diff):

| Artifact | Shape | Consumed by |
|----------|-------|-------------|
| `packages/js/icons-manifest.json` | `{ icons: {addr→path}, legacy: {legacyKey→addr}, aliases: {} }` | Python `icons.py` (bulk) + JS loader (legacy resolution) |
| `packages/js/sets/<prefix>.json` | per-set IconifyJSON (below) | on-demand loader + `kymo icons` |
| `packages/js/icons-collections.json` | `{ prefix: { total, categories[] } }` | `kymo icons list` |

Both implementations consume these artifacts; there is no second scanner
(FR-8). `packages/js` carries **zero runtime dependencies** — the generator and
SVG-normalization tooling are build-time only (NFR-3).

## 3. Per-set IconifyJSON

```jsonc
{
  "prefix": "aws",
  "width": 64, "height": 64,           // root dimension defaults (inherited)
  "icons": {
    "security-waf": { "path": "icons/aws/security/waf.png", "category": "security" },
    "compute-lambda": { "path": "icons/aws/compute/lambda.png", "category": "compute" }
  },
  "aliases": { "lambda-fn": { "parent": "compute-lambda" } },
  "info": { "name": "aws", "total": 525, "categories": { "security": ["security-waf"], … } }
}
```

- **Sparse + root defaults** (FR-3): `width`/`height` live on the set root;
  an icon carries its own only when it differs (none do pre-vectorization).
- **Records** are `{ body, width?, height? }` once vectorized — `body` is the
  inner SVG (no `<svg>` wrapper); until then `path` points at the source file.
- **Metadata** (FR-5): `info` carries totals + categories; each record carries
  its `category` — enough for the CLI / a picker UI to search and filter.

## 4. Aliases

An alias is `{ parent, rotate?, hFlip?, vFlip? }` — a synonym, or a transformed
variant. Resolution walks the parent chain with a **cycle guard** (a cycle is
rejected, never looped); transforms compose onto the parent fragment
(`rotate(n·90)`, `scale(±1, ±1)`). Aliases collapse near-duplicate art instead
of storing it twice (FR-4).

## 5. Rendering

A record renders as `<svg viewBox="0 0 W H">{body}</svg>` at the requested size
(`render_record` / pipeline `toRecord`). `currentColor` in the body makes the
icon adopt the diagram theme, and the vector scales crisply (FR-6). When the
same icon is inlined more than once in a document, its element `id`s are
suffixed uniquely per use so they never collide (`make_ids_safe`, FR-7). Raster
PNGs still render through the fixed-size `<image>` path until their set is
vectorized — so diagrams with unaffected icons stay byte-identical (NFR-2).

## 6. Normalize pipeline

Vector art passes through `cleanupSvg → parseColors(currentColor) → minify
→ to_record` (`icons_pipeline.py` / `scripts/icons-pipeline.mjs`, regex-based,
zero-dep). `kymo icons download --from iconify` runs this on fetched art, so it
vendors a normalized record — not a raw fetch. Migrating the ~2,400 raster PNGs
to vector records depends on **sourcing vector originals** (RES-ICONS-001 §7.1)
and proceeds per set.

## 7. Legacy compatibility

The `legacy` map resolves every historical `<provider>-<name>` key (last-write-
wins winner) to its address, so authored `.kymo`/BPMN diagrams resolve unchanged
(FR-11). Resolution order in both packages: built-in glyph → alias → `prefix:name`
address → legacy key.

## 8. The `kymo icons` CLI

`kymo icons list|search|describe|download` operates over these artifacts; the
read-trio is offline, `--remote`/`--from iconify` are the only network paths.
See FEAT-ICONS-001 (FR-12..15) and CR-ICONS-001.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial release — authoritative catalogue format (addressing, artifacts, IconifyJSON, aliases, rendering, pipeline, legacy compat, CLI), consolidating the implemented P1–P6. |

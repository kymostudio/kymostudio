---
title: kymo Icons — Catalogue Format (prefix:name + IconifyJSON)
document_id: ICONS-MAP-001
version: "1.2"
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
| Version      | 1.2                                                |
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

## 2. Source of truth — the `packages/icons` package

The icon catalogue — **raw art and the generated index** — is a single shared
package, `packages/icons`, consumed by both implementations:

```
packages/icons/
  icons/<provider>/<cat…>/<file>   # raw art (PNG/SVG)
  scripts/build-manifest.mjs       # the single generator
  icons-manifest.json              # generated index ┐
  icons-collections.json           # generated index ├ committed source of truth
  sets/<prefix>.json               # generated index ┘
```

A single generator — `packages/icons/scripts/build-manifest.mjs` — scans
`packages/icons/icons/` and emits (deterministically; re-running produces no diff):

| Artifact | Shape | Consumed by |
|----------|-------|-------------|
| `icons-manifest.json` | `{ icons: {addr→path}, legacy: {legacyKey→addr}, aliases: {} }` | Python `icons.py` (bulk) + JS loader (legacy resolution) |
| `sets/<prefix>.json` | per-set IconifyJSON (below) | on-demand loader + `kymo icons` |
| `icons-collections.json` | `{ prefix: { total, categories[] } }` | `kymo icons list` |

Paths inside the manifest stay **relative to `packages/icons`** (`icons/<provider>/…`),
so a consumer resolves them against wherever it hosts/mirrors the package.

**How each side consumes it:**
- **Python** reads `packages/icons/{icons-manifest.json,sets/,icons/}` directly in the dev tree
  (degrading to built-in glyphs when absent, e.g. a pip-installed tree).
- **JS** build-copies the **index** (`sets/`, `icons-manifest.json`, `icons-collections.json` — not the
  art) into `packages/js` at `prebuild`/`prepack` (`scripts/sync-icons.mjs`); those copies are
  git-ignored, so the only committed copy lives in `packages/icons`. The published npm tarball is
  thus self-contained while staying **zero runtime dependencies** (NFR-3). Raw art is fetched at
  runtime from a host/CDN via `setIconBaseURL` (the playground points at jsDelivr `…@main/packages/icons`).

There is no second scanner (FR-8); both sides resolve identically by construction.

### 2.1 Vendored inline sets (CR-ICONS-007)

A set need not be backed by source files under `icons/`. A **vendored inline
set** is a hand-authored `sets/<prefix>.json` whose records ship the SVG `body`
inline (§3) — exactly how an `@iconify-json/<prefix>` package distributes its
`icons.json`. The generator does not scan or rewrite such a file (it has no
`icons/<prefix>/` source), but **folds it into `icons-collections.json`** so
`kymo icons list` still indexes it across rebuilds. The loaders resolve an
inline address on demand (`load_set(prefix)` → render the `body`), never
fetching a file. The first such set is **`ai`** — three foundation-model brand
logos (`ai:openai`, `ai:anthropic`, `ai:gemini`), sourced from the canonical
Iconify `logos` collection (CC0-1.0). Brand art keeps its own fills/gradients;
the `currentColor` recolour (§6) is **not** applied to it.

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
  Vendored inline sets (§2.1) ship `body` records from the outset, with their
  own per-icon `width`/`height` (the source viewBox).
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
| 1.1     | 2026-06-06 | Vũ Anh | Add §2.1 vendored inline sets (CR-ICONS-007): hand-authored `sets/<prefix>.json` with inline `body` art, folded into collections by the generator, resolved on demand — first set `ai` (openai/anthropic/gemini brand logos, CC0). |
| 1.2     | 2026-06-06 | Vũ Anh | §2 rewritten: catalogue (raw art + generated index + generator) consolidated into the shared `packages/icons` package as the single source of truth; Python reads it directly, JS build-copies the index (git-ignored) at prebuild/prepack; playground base URL → `…@main/packages/icons`. |

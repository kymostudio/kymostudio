# Icon Management at Scale — Iconify (Research)

| Field             | Value                                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------|
| Document ID       | RES-ICONS-001                                                                                          |
| Version           | 1.0                                                                                                    |
| Issue Date        | 2026-06-03                                                                                             |
| Status            | Released                                                                                               |
| Classification    | Internal                                                                                               |
| Owner             | `diagrams/` project                                                                                    |
| Audience          | Engineers evolving kymo's icon catalog / loader, or weighing an Iconify-style icon pipeline            |
| Subjects          | [`iconify/iconify`](https://github.com/iconify/iconify) · `@iconify/tools` · `@iconify/api` · `@iconify/json` (IconifyJSON format) |
| Licenses          | MIT (Iconify libraries) · Apache-2.0 + per-set (icon data)                                             |
| Versions Reviewed | @iconify/utils 3.x, @iconify/core 4.x (2026-06-03)                                                     |
| Related Documents | `PROD-ICONS-001`, `INTRO-ICONS-001`, `FEAT-ICONS-001`, `DESIGN-ICONS-001`, `TEST-ICONS-001`, `PLAN-ICONS-001` (the kymo Icons v2 spec set derived from this note) · `REF-DRAWIO-001`, `REF-PLANTUML-001`, `RES-MERMAID-D2-001` |

This is a **research note on prior art** for managing an icon catalogue *at scale* — not a specification of kymo. Iconify serves **~250,000 icons across 150+ sets** from one data model; kymo today ships ~2,460 vendored icons through a much simpler mechanism. The note dissects *how* Iconify gets to that scale (format, namespacing, build pipeline, distribution, on-demand loading), then maps each lesson onto kymo's current icon subsystem. No code or behaviour in this repository depends on Iconify; nothing here is committed work — it is the evidence base for a possible future "kymo icons v2".

A framing used throughout: Iconify never stores a *file*; it stores a **normalized icon record** (`{ body, width, height }` + sparse transforms) and **assembles** an `<svg>` at render time. Almost every scaling property below — small payloads, recolouring, dedup, on-demand fetch — falls out of that one decision. kymo currently stores *files* (mostly PNGs) and inlines them verbatim, which is the root of its scale gaps in §6.

## 1. Landscape — why "thousands of icons" is its own problem

Below a few hundred icons, any approach works: dump files in a folder, inline them. The problems are emergent — they only bite at scale.

| Concern | Naïve folder-of-files | Iconify | Why it matters at scale |
|---|---|---|---|
| Per-icon payload | Full SVG/PNG document | Inner **body** only, shared root dims | 200–600 B vs 6–12 KB per inlined icon |
| Recolour / theming | None (raster) or per-file edits | `currentColor` in body | Match every icon to diagram theme for free |
| Crisp scaling | No (PNG) | Yes (vector) | Retina / zoom / export to any size |
| Duplicate art | N copies on disk | 1 icon + **aliases** | "arrow-left" / "arrow-back" share one body |
| Name collisions | Flat names overwrite silently | `prefix:name` namespace | No icon is unreachable |
| Search / filter | Re-derive from paths | Metadata in the set (`info`, tags, categories) | A picker UI can search 250k icons |
| Loading | Ship/inline everything | **On-demand**, batched, cached | Page loads 12 icons, not the whole set |
| One source of truth | Per-platform scanners drift | One IconifyJSON, many consumers | Python & JS read identical data |

kymo's gaps line up almost exactly with the left column; §6 quantifies them.

## 2. IconifyJSON — the data format

The unit of storage is the **icon set**: one JSON file per collection (`mdi.json`, `fa6-solid.json`, …), shaped roughly:

```jsonc
{
  "prefix": "mdi",            // namespace for every icon below
  // root-level defaults — inherited by every icon unless overridden
  "width": 24, "height": 24,  // default viewBox size
  "left": 0, "top": 0,        // default viewBox origin
  "rotate": 0,                // 0..3 → 0/90/180/270°
  "hFlip": false, "vFlip": false,

  "icons": {
    "home":     { "body": "<path d=\"…\"/>" },          // inherits 24×24
    "logo":     { "body": "<path d=\"…\"/>", "width": 32 } // overrides width only
  },

  "aliases": {
    "house":    { "parent": "home" },                    // pure synonym
    "home-flip":{ "parent": "home", "hFlip": true }       // synonym + transform
  },

  "info":  { "name": "Material Design Icons", "total": 7447,
             "author": { "name": "…" }, "license": { "title": "Apache 2.0" } },
  "chars": { "e88a": "home" }                              // optional font codepoints
}
```

Three design choices do the heavy lifting:

1. **Body, not document.** Each icon stores only the *inner* SVG (`<path>`, `<g>`…) — no `<svg>` wrapper, no `xmlns`, no `<defs>` cruft. The renderer wraps it in `<svg viewBox="left top width height">…</svg>` on demand (`iconToSVG()` / `iconToHTML()` in `@iconify/utils`). One body → many target sizes, colours, transforms.
2. **Sparse + root defaults.** Width/height/transform appear on an icon *only when they differ* from the root. `minifyIconSet()` finds the most common value across the set and hoists it to the root, deleting it from each icon — typically **60–70% smaller** JSON.
3. **Self-describing.** `info` (counts, author, license) and optional `chars` travel with the data, so tooling and pickers need nothing external.

## 3. Namespacing & aliases — `prefix:name`

Icons are addressed globally as **`prefix:name`** (e.g. `mdi:home`, `fa6-solid:arrow-up-right`). `stringToIcon()` parses this; valid names match `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, dash-separated, no spaces/uppercase). The `prefix` makes names collision-proof across 150+ sets — `mdi:home` and `bi:home` coexist.

**Aliases** are how Iconify avoids duplicating art:

- An alias is `{ parent, …transforms? }`. Resolution walks the parent chain (`alias → parent → … → base icon`), merging properties at each hop via `mergeIconData()`, with cycle guards.
- This expresses three things cheaply: **synonyms** (`house → home`), **transformed variants** (`arrow-down = arrow-up + rotate:2`), and **theme variants** — all without a second copy of the path data.

For a catalogue with many near-duplicate names (kymo's per-cloud icon sets have plenty), aliases collapse the duplication that a flat file tree cannot.

## 4. Build pipeline — SVG sources → IconifyJSON (`@iconify/tools`)

Raw vendor SVGs are messy (editor metadata, scripts, hard-coded colours, off-origin viewBoxes). `@iconify/tools` normalizes them through a pipeline before they ever become an icon record:

```
importDirectory(dir, { prefix })        // load a folder of .svg into an IconSet
  └─ for each icon:
       cleanupSVG()                      // strip <script>, <style>, <text>, raster <image>,
                                         //   remote refs, editor (Inkscape/sodipodi) cruft
       parseColors({ default: 'currentColor' })  // hoist fills/strokes to currentColor → themeable
       runSVGO()                         // SVGO: minify paths, drop metadata, round coords
       (validate viewBox / dimensions)
  └─ deduplicate identical bodies → aliases
  └─ minifyIconSet()                     // hoist common dims to root
  → export mdi.json (+ optional .d.ts)
```

Two outputs matter for *us*: every icon ends up **vector, sanitized, recolourable, and same-origin/normalized viewBox**, and **byte-identical bodies become aliases** instead of repeated data. This is exactly the transform kymo's raster catalogue never received.

## 5. Distribution & on-demand loading

**Packaging** (three tiers, pick per use-case):

- `@iconify/json` — everything in one package (~120 MB unpacked); used by API servers and offline build tools.
- `@iconify-json/<prefix>` — one package per set (`@iconify-json/mdi`); install only the sets you use; tree-shakeable.
- Per-icon ES exports — `import homeIcon from '@iconify-icons/mdi/home'`; bundler keeps only icons actually imported.

**Runtime / on-demand** (the part that makes 250k icons usable in a browser):

- The **Iconify API** (`@iconify/api`, Fastify) serves icons by query. The hot path is the **batch** endpoint — `GET /mdi.json?icons=home,settings,search` returns a *minimal IconifyJSON* containing only those icons + needed aliases. It also exposes per-icon `…/home.svg`, full-set `…/icons.json`, `/collections`, and (optionally) `/search`.
- The client **collects** icon names referenced on the page, **debounces**, then issues one batched request per prefix (`@iconify/core` queue + `api-redundancy` failover).
- Results are cached in memory **and `localStorage`**; the API sends `Cache-Control: max-age=604800` (7 days). Repeat visits hit cache, not network.
- Storage is tiered `provider → prefix → { icons, missing }`; the `missing` set records 404s so a name is never re-requested.
- The `iconify-icon` web component additionally uses an `IntersectionObserver` so off-screen icons aren't rendered.

Net effect: a page that uses 12 icons downloads ~those 12, once, then never again.

## 6. kymostudio today — diagnosis

kymo's icon subsystem (two parallel implementations at feature parity, per `CLAUDE.md`) is simple and works at its current size, but every property in §1's left column applies. Concrete state:

- **Catalogue:** root `icons/` holds ~2,460 files / ~38 MB, **99.9% raster PNG** (256–500 px); only 3 SVGs. Source is the `mingrammer/diagrams` set, vendored as a static snapshot in git — no version/update path, no license manifest.
- **Python** — `packages/python/src/kymo/icons.py`: 34 hand-coded vector glyphs in `ICONS` (composed via `_cube`/`_box`/`_aws_tile`) plus file-backed icons catalogued by `_scan_icons_dir()`. Files are inlined at render time: PNG → base64 `<image>` at a fixed 64 px; SVG → `_svg_as_inline()` dumps the **entire raw document** (Inkscape namespaces and all) into an `<svg>` — **no viewBox normalization, no `<defs>`/`id` dedup**, so repeated icons collide on element IDs and bloat output. No recolouring of file icons.
- **JS** — `packages/js/src/icons-loader.ts`: async mirror; `getIcon()` lazily `fetch`es the manifest then the asset, base64-embeds into the same 64 px wrapper, caches. 34 built-ins in `icons-builtin.ts`. Image bytes are *not* bundled — fetched from a CDN base URL.
- **Manifest** — `packages/js/scripts/build-manifest.mjs` walks `icons/` and emits `icons-manifest.json`, a flat **`{ key: path }`** map (148 KB), loaded **whole** before resolving any single icon.
- **Flat key `<provider>-<name>`** (category folder dropped, last-write-wins): the manifest has **2,300 keys for 2,457 PNGs** → **~157 icons are silently unreachable.** This collision rate only grows with the catalogue.
- **Two hand-maintained scanners** — `_scan_icons_dir` (Python) and `build-manifest.mjs` (JS) must be kept byte-compatible by convention; drift risk.
- **No metadata** — manifest is `key → path` only: no dimensions, aliases, category, or tags, so a picker UI can't search or filter without re-deriving from paths.

Reference files: `packages/python/src/kymo/icons.py`, `packages/js/src/icons-loader.ts`, `packages/js/src/icons-builtin.ts`, `packages/js/scripts/build-manifest.mjs`, `packages/js/icons-manifest.json`, root `icons/`. The only existing icon documentation is a prose section in `docs/guide/dsl-guide.md`.

## 7. Lessons for kymo

Mapping Iconify's mechanics onto the four areas this research targeted. These are **directional** — priority and impact, not an implementation spec (that would be a separate feature under `docs/specs/`).

### 7.1 PNG → SVG body  *(highest impact)*

Adopt the §4 transform for the whole catalogue: run the raster/source art through a `cleanupSVG → parseColors(currentColor) → SVGO → validate` pipeline and store each icon as a normalized **`{ body, width, height }`** record rather than a base64-inlined file. Wins: recolour to match diagram themes, crisp scaling/export, an order-of-magnitude smaller per-icon payload, and the end of `_svg_as_inline()`'s whole-document/`id`-collision problem. *Caveat:* kymo's icons are raster — vectorizing 2,400 PNGs is non-trivial; the realistic path is sourcing vector originals (the upstream `diagrams`/cloud-vendor SVGs) rather than tracing PNGs.

### 7.2 Namespace `prefix:name` & stop losing icons  *(high impact, lower effort)*

Replace the flat `<provider>-<name>` key with a **`prefix:name`** scheme that keeps the category in the name (or otherwise disambiguates), eliminating the ~157 silent collisions. Add **aliases** for the synonyms and transformed variants that pervade cloud-icon sets. This is largely a keying/manifest change and could land independently of 7.1.

### 7.3 IconifyJSON-style manifest with metadata + on-demand loading  *(high impact)*

Evolve `icons-manifest.json` from `key → path` toward a **per-set IconifyJSON** carrying dimensions, aliases, `info`, and category/tags. Two payoffs: a future icon-picker can **search and filter** thousands of icons, and the client can fetch **per-set / batched** records instead of pulling the full 148 KB (soon ~MBs) up front — the §5 batch-and-cache pattern.

### 7.4 One source of truth for Python & JS  *(reduces drift)*

Generate the normalized icon data **once** (the build pipeline emits IconifyJSON), and have both `icons.py` and the JS loader **consume that artefact** rather than each re-scanning `icons/`. Removes the standing requirement to keep two scanners byte-compatible and guarantees the two implementations see identical icons — directly serving the "two implementations at parity" rule in `CLAUDE.md`.

**Suggested sequencing:** 7.2 (cheap, stops data loss) → 7.4 (single generator) → 7.3 (richer manifest) → 7.1 (vectorization, the big lift). This adoption is now written up as the **kymo Icons v2** feature spec under `docs/specs/icons/` (`INTRO-ICONS-001` → `FEAT-ICONS-001` → `DESIGN-ICONS-001` → `TEST-ICONS-001` → `PLAN-ICONS-001`, anchored by `PROD-ICONS-001`), which traces these lessons to requirements and phases (P1=7.2, P2=7.4, P3=7.3, P4=7.1) and cross-references this note by `RES-ICONS-001`.

## 8. Sources

- Iconify — main monorepo (utils/core/component): <https://github.com/iconify/iconify>
- Iconify Tools (SVG → IconifyJSON pipeline): <https://github.com/iconify/tools> · <https://iconify.design/docs/libraries/tools/>
- Iconify API server (batch endpoints, caching): <https://github.com/iconify/api> · <https://iconify.design/docs/api/>
- Icon sets / `@iconify/json` (IconifyJSON data, ~250k icons): <https://github.com/iconify/icon-sets> · <https://icon-sets.iconify.design/>
- IconifyJSON format & types: <https://iconify.design/docs/types/> · <https://github.com/iconify/iconify/tree/main/packages/types>
- `@iconify/utils` (`iconToSVG`, `minifyIconSet`, `parseIconSet`, `stringToIcon`, `mergeIconData`): <https://iconify.design/docs/libraries/utils/>
- kymo current implementation (in-repo): `packages/python/src/kymo/icons.py`, `packages/js/src/icons-loader.ts`, `packages/js/scripts/build-manifest.mjs`, `docs/guide/dsl-guide.md`

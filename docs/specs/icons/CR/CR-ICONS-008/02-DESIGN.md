---
title: "Icons CR-008 — Design: the packages/icons package & build-copy linkage"
document_id: DESIGN-ICONS-CR008
version: "0.1"
issue_date: 2026-06-06
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the catalogue, generator, loaders, and packaging
review_cycle: Until closed
supersedes: null
related_documents:
  - CR-ICONS-008                # Requirements — CR-ICONS-008/01-REQUIREMENTS
  - TEST-ICONS-CR008            # Verification — CR-ICONS-008/03-TEST
  - PLAN-ICONS-CR008            # Plan — CR-ICONS-008/04-PLAN
  - ICONS-MAP-001               # Catalogue-format doc (§2)
  - DESIGN-ICONS-001            # Baseline design
  - CR-ICONS-003                # P2 generator / single source of truth
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - design
  - packaging
  - build-copy
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-008 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR008                                 |
| Status       | Implemented                                        |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-008, TEST-ICONS-CR008, PLAN-ICONS-CR008, ICONS-MAP-001, CR-ICONS-003 |

Realises **CR-ICONS-008**.

## 1. Package layout

```
packages/icons/                    # @kymostudio/icons (private) — source of truth
  icons/<provider>/<cat…>/<file>   # raw art (PNG/SVG)
  scripts/build-manifest.mjs       # the single generator (moved from packages/js)
  icons-manifest.json              ┐ generated index — the ONLY committed copy
  icons-collections.json           ├
  sets/<prefix>.json               ┘
  package.json                     # private; "build-manifest" script; no deps
```

The generator scans `packages/icons/icons/` and writes the index next to it. Manifest paths stay
**relative to the package** (`icons/<provider>/…`), so the move is content-neutral: the JSON bytes are
identical to the pre-move artifact — only the base they resolve against changes.

## 2. Resolution

- **Python `icons.py`** — `_ICONS_PKG = …/packages/icons`; `_ICONS_DIR = _ICONS_PKG/icons`; the
  manifest, sets, and collections load from `_ICONS_PKG`, and each address resolves to
  `_ICONS_PKG / rel`. `_REPO_ROOT` is redefined as the **real repo root** (it still backs
  `docs/`/`samples/`/`bin/` lookups in tooling and tests). Absent package → built-in glyphs only.
- **JS loader `icons-loader.ts`** — unchanged; runtime resolution is base-URL relative (the host
  serves the package).
- **JS CLI `bin/icons-cli.mjs`** — reads the catalogue from `packages/icons` when that sibling exists
  (monorepo / CI, where the `packages/js` copies are git-ignored), else from this package's own
  bundled copies (a published npm install). `download --from local` reads art from `packages/icons`.

## 3. Packaging — build-copy, not a dependency

`packages/js` must ship the index inside its own tarball (npm cannot reference a sibling package), yet
must stay **zero runtime deps** (NFR-3). Resolution: `scripts/sync-icons.mjs` copies the **index only**
(`sets/`, `icons-manifest.json`, `icons-collections.json` — never the multi-MB art) from
`packages/icons` into `packages/js`, wired as `prebuild` (build/test) and `prepack` (publish). Those
copies are **git-ignored** (`packages/js/.gitignore`), so the only committed copy is in
`packages/icons`. The art is fetched from a host/CDN at runtime via `setIconBaseURL`.

## 4. Website & CI

- **Website** — `website/app/src/kymo.ts` inlines the manifest from `packages/icons` and sets the
  base URL to `https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons`. Because the
  base now contains both `icons/` and `sets/`, on-demand per-set fetches (e.g. inline `ai:`) resolve
  correctly — previously they pointed at the repo root, which lacked `sets/`.
- **CI** — the *Icon generator freshness* step runs `node scripts/build-manifest.mjs` in
  `packages/icons` and `git diff --exit-code`s the committed index there.

## 5. Why build-copy over symlink / workspace dependency

- **Symlink** — npm pack does not reliably dereference symlinked dirs; the published tarball could
  ship a dangling link.
- **Workspace dependency** — would add a runtime dep to `packages/js`, violating NFR-3.
- **Build-copy** — keeps one committed source, a self-contained tarball, and zero runtime deps. Chosen.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial — package layout, resolution, build-copy packaging, website/CI repoint. |

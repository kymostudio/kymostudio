# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Both the Python (`kymostudio` on PyPI) and JavaScript (`kymostudio` on npm)
packages share a version number.

## [Unreleased]

## [0.2.2] - 2026-05-21

### Changed

- **Docs:** the package summary/description is now identical across PyPI and
  npm; dropped the "(also Figma / Excalidraw)" clause from the tagline; and
  rewrote the relative README links (`samples/`, `docs/BPMN.md`, `icons/`,
  `LICENSE`) as absolute GitHub URLs so they resolve on the registry pages.

## [0.2.1] - 2026-05-21

### Changed

- **Docs:** simplified both package README titles to `kymostudio` (dropped the
  `(Python)` / `(JavaScript / TypeScript)` suffixes) and unified the tagline
  across the Python and JS package READMEs, so the PyPI and npm pages describe
  kymostudio identically.

## [0.2.0] - 2026-05-21

### Added

- **BPMN 2.0 import** (Python). `kymo path/to/process.bpmn → process.svg`
  renders a standard `.bpmn` file (Camunda Modeler, bpmn.io, Signavio …)
  to SVG. Geometry comes straight from the file's Diagram-Interchange
  section (`BPMNShape`/`dc:Bounds`, `BPMNEdge`/`di:waypoint`), so no layout
  pass runs. The mapped subset covers events (start/end/intermediate/
  boundary, with message/timer/error/signal/terminate/… definitions),
  tasks (user/service/script/send/receive/manual/business-rule) and
  collapsed sub-processes, gateways (exclusive/parallel/inclusive/event/
  complex), sequence flows (incl. default & conditional markers), message
  flows, associations, data objects/stores, text annotations, and pools/
  lanes. New modules `from_bpmn.py` (parser) + `bpmn_shapes.py` (glyphs);
  public API `from kymo import parse_bpmn`. See
  [`samples/order.bpmn`](../samples/order.bpmn),
  [`samples/collaboration.bpmn`](../samples/collaboration.bpmn) and
  [`docs/BPMN.md`](./BPMN.md).

- **BPMN 2.0 import in the JS/TS package** — `parseBpmn(xml)` brings the same
  feature to `packages/js` at parity with Python: a dependency-free XML reader
  (`xml.ts`) + importer (`from-bpmn.ts`) + glyph renderer (`bpmn-shapes.ts`),
  and `renderSVG` now draws BPMN glyphs, pools/lanes, and DI-waypoint flows.
  Output matches the Python renderer (monochrome, bpmn.io-faithful). This
  reflects that `packages/js` is an **independent implementation at feature
  parity**, not a port.

- **`renderSVG(diagram)`** in the JS/TS package — a standalone SVG renderer
  (background, cubic-Bézier edges with arrowheads, icon glyphs + labels, and
  auto-computed canvas bounds). It is an original TypeScript implementation.

### Changed

- **`packages/js` migrated to TypeScript.** `model`, `icons-builtin`,
  `icons-loader` and `index` are now `.ts`; the package compiles with `tsc`
  to `dist/` (JS + `.d.ts`) and publishes type declarations. `main`/`exports`
  point at `dist/`, and the npm release workflow builds before publishing.

- **Monorepo restructure** mirroring [Remotion](https://github.com/remotion-dev/remotion):
  the two publishable libraries now live under `packages/`.
  - `src/python/kymo/` → `packages/python/src/kymo/` (Python src-layout); the
    Python tests and golden fixtures moved to `packages/python/tests/`, and
    `pyproject.toml` / `uv.lock` moved to `packages/python/`.
  - `src/js/` → `packages/js/src/`; `scripts/build-manifest.mjs` →
    `packages/js/scripts/`; `package.json` and the generated
    `icons-manifest.json` moved to `packages/js/`.
  - Shared, repo-level assets stay at the root: `icons/` (consumed by both
    packages), `samples/`, `showcase/`, `playground/`, and `docs/`.
  - Each package now carries its own `README.md` and `LICENSE`.
- CI release workflows (`release-pypi.yml`, `release-npm.yml`) build and
  publish from their package subdirectories via `working-directory`. The
  GitHub Pages workflow is unchanged (`showcase/` is still at the root).
- The JS package test script uses Node's default test discovery
  (`node --test`); a smoke test was added under `packages/js/tests/`.

### Fixed

- File-backed icons now resolve against the repo-root `icons/` directory. A
  previous move had left the lookup pointing at a non-existent path, silently
  disabling the ~2300 file-backed icons in the dev tree.
- `playground/server.py` imported the renderer modules with stale top-level
  names; it now imports them from the `kymo` package and points at the new
  package paths.

## [0.1.1] - 2026-05-20

### Changed

- Renamed the published distributions to `kymostudio` (PyPI: `kymo` →
  `kymostudio`; npm: `kymostudio`).

## [0.1.0] - 2026-05-20

### Added

- Initial release: diagram-as-code DSL rendering declarative architecture
  diagrams to animated SVG / WebP, with a Python source-of-truth, a
  browser/Node port of the data model + icon library, and tag-triggered
  PyPI and npm release workflows.

[Unreleased]: https://github.com/kymostudio/kymostudio/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/kymostudio/kymostudio/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/kymostudio/kymostudio/releases/tag/v0.1.0

# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Both the Python (`kymostudio` on PyPI) and JavaScript (`kymostudio` on npm)
packages share a version number.

## [Unreleased]

## [0.3.0] - 2026-05-24

### Added

- **BPMN 2.0 export** — turn any kymo diagram of BPMN glyphs (imported from a
  `.bpmn`, or authored with the `bpmn { }` DSL block) back into BPMN 2.0 XML: a
  `<bpmn:process>` (or a `<bpmn:collaboration>` of `<participant>`s when there
  are pools) plus a `<bpmndi:BPMNDiagram>` of DI geometry. The exact inverse of
  the importer, so a file round-trips (`.bpmn` → kymo → `.bpmn`) preserving
  structure and geometry. Python: `kymo <file> --bpmn` and
  `from kymo import to_bpmn`; JavaScript: `toBpmn(diagram)` — at parity, both
  engines. Pools/lanes/groups/expanded sub-processes are emitted; round-trip is
  gated against the full MIWG corpus. See [`docs/formats/bpmn.md`](./formats/bpmn.md).

## [0.2.8] - 2026-05-23

### Added

- **`bpmn { }` DSL block** — author BPMN 2.0 processes directly in `.kymo` as
  typed nodes and flows, auto-laid-out left-to-right (Sugiyama) with optional
  `@ (x,y)` pins, in both the Python and JavaScript engines. Node kinds map to
  `bpmn-*` glyphs/markers (`start`/`end`/`end!`/`task`/`xor`/`and`/`or`/…, with
  `type=` refinements); flow arrows `->` (sequence), `~>` (message), `..>`
  (association); chains and `;` expand to one flow per segment. The block emits
  a fully-resolved sub-diagram, so the existing renderer draws it unchanged. New
  sample [`samples/order-flow.kymo`](../samples/order-flow.kymo); grammar
  specified in `DSL.md` §6.9 (DSL-LANG-001 v2.1).

## [0.2.7] - 2026-05-23

### Changed

- **Breaking — DSL source file extension renamed `.diagram` → `.kymo`.** The
  CLI, the JavaScript parser dispatch, and the VS Code extension now recognise
  `.kymo` source files; `.diagram` is no longer accepted. Rename existing
  sources to `.kymo`. Samples, tests, and the DSL spec/docs were updated to
  match.
- Refreshed the project tagline to **"Type it. See it appear. Watch it
  animate."** across the root and per-package READMEs and the PyPI / npm / VS
  Code package descriptions; added a VS Code Marketplace badge to the README.

## [0.2.6] - 2026-05-22

The Python (PyPI) and JavaScript (npm) package payloads are unchanged versus
0.2.5; this release covers the surrounding tooling, docs, and the VS Code
extension.

### Added

- **VS Code extension** published to the **Visual Studio Marketplace** and
  **Open VSX** as `kymostudio.kymostudio-vscode`, with a marketplace icon and a
  `release-vscode.yml` workflow that publishes to both on a `v*` tag (each
  publish step is gated on its token secret).
- **Website:** a client-side `.kymo` playground deployed to
  `kymostudio.github.io`.
- **`tools/info.py`** — read or set the shared version and tagline across the
  monorepo from one place.

### Changed

- Revamped the root README (centered header; PyPI / npm / Tests / License
  badges) and scoped each package README to its own implementation.

## [0.2.5] - 2026-05-22

### Added

- **JavaScript:** the JS package now ships the full `.kymo` front-end at
  parity with Python — a line-oriented DSL parser, an auto-layout engine, and
  an alignment resolver, exported as `parse` / `parseDiagram` (plus `layout`
  and `resolveAlignments`). `parseDiagram(src)` → `renderSVG(diagram)` renders
  a `.kymo` file to SVG entirely in JS, no Python required. The package
  stays zero-runtime-dependency.
- **VS Code extension** (`packages/vscode-extension`, bundled separately —
  not published to PyPI/npm): live in-editor SVG preview for `.kymo` and
  `.bpmn` files (zoom / pan / export), rendered in-process by the bundled JS
  engine, so no Python is required.

## [0.2.4] - 2026-05-21

### Internal

- **CI:** moved the GitHub Actions toolchain off the deprecated Node.js 20
  runtime — `actions/checkout@v5`, `actions/setup-node@v5`, and
  `astral-sh/setup-uv@v7` (all first Node-24 majors). No change to the
  published package payload versus 0.2.3.

## [0.2.3] - 2026-05-21

### Changed

- **Python:** lowered the minimum supported Python from `3.13` to `3.10` — the
  package only needs `match`/`case`, so it now installs on 3.10, 3.11, and 3.12
  as well. CI tests against 3.10, 3.11, 3.12, and 3.13.

### Internal

- Added lint/type-check gates to CI: `ruff` for the Python package, and
  `eslint` + `tsc --noEmit` for the JS package (both dev-only — the JS package
  remains zero-runtime-dependency).

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
  [`docs/formats/bpmn.md`](./formats/bpmn.md).

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

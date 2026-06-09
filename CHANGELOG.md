# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Both the Python (`kymostudio` on PyPI) and JavaScript (`kymostudio` on npm)
packages share a version number.

## [Unreleased]

### Added

- **Pure-Rust flowchart SVG rendering + D2 / DOT importers — the core's first
  flowchart renderer.** `kymostudio-core` gains **importers** for D2 (`crate::d2`)
  and Graphviz DOT (`crate::dot`) — the inverses of the d2/dot emitters: they parse
  each language's flowchart subset (direction, node shapes, edges with labels/dash,
  containers → subgraphs) into the shared flowchart IR — and a **pure-Rust flowchart
  SVG renderer** (`crate::flowchart_svg` — outline shapes with interior labels,
  anchor-routed orthogonal edges, cluster regions). Together: `d2_to_svg`,
  `dot_to_svg` and `mermaid_to_svg` render **entirely in Rust** (no external `d2` /
  `dot` binary) — the Rust CLI can now render flowcharts, not just convert. Also
  `d2_to_kymojson` / `dot_to_kymojson` (D2/DOT as kymo import sources). Surfaced on
  the `kymo` CLI (`kymo flow.d2` / `kymo flow.dot` → `flow.svg`; `kymo flow.mmd
  flow.svg`) and via PyO3 + wasm (`d2ToSvg` / `dotToSvg` / `mermaidToSvg` + the
  `*ToKymoJson` importers). Output is the core's own flowchart look (not
  byte-identical to the Python/JS renderers). Validated by rasterizing through resvg.
- **draw.io export (`Diagram → mxGraph XML`), a source-agnostic encoder.** A new
  `kymostudio-core` encoder (`drawio::to_drawio`) turns any resolved diagram into a
  draw.io document that opens directly in app.diagrams.net — shaped (rectangle /
  ellipse / rhombus / hexagon / cylinder / stadium), laid-out, subgraph-clustered,
  edges auto-routed (dashed / no-arrow honoured). Per RES-PIPELINE-001 this is a
  pure *encoder* (it consumes only the positioned `Diagram`). Two entry points:
  `mermaid_to_drawio` (`kymo flow.mmd flow.drawio`) and `drawio_from_kymojson`
  (any `.kymo.json` model). Reaches every source via a **`--drawio`** flag on the
  Python CLI and a `.drawio` output on the JS CLI, both delegating to the one Rust
  encoder — so draw.io output is byte-identical across Python and JS. PyO3 + wasm
  bindings; non-flowchart shapes (icons / BPMN / AWS) degrade to a labelled
  rectangle. The Rust `kymo` CLI's converter dispatch is now a small `{ext → fn}`
  registry (a first step toward RES-PIPELINE-001's "registry, not if/elif").
- **Native `flowchart [DIR] { … }` DSL block.** Author a flowchart inline in a
  `.kymo` file — the block body is Mermaid flowchart syntax, laid out by the core
  (mirrors the `bpmn { }` block). Direction is optional (`flowchart LR { … }`,
  default `TD`). Implemented in both Python (`dsl.py`) and JS (`dsl.ts`); see the
  KYMO-DSL grammar §6.11.
- **Flowchart transpilation: `mmd → {Mermaid, D2, DOT}`.** The core's flowchart
  parse model was lifted into a format-neutral **flowchart IR** (`crate::flowchart`)
  — a positionless node/edge/subgraph hub. New text emitters convert a Mermaid
  flowchart to **D2**, **Graphviz DOT**, or **Mermaid** (round-trip / normalize);
  each target lays the graph out itself, so no geometry is involved. Surfaced as
  Rust APIs (`mermaid_to_d2` / `mermaid_to_dot` / `mermaid_to_mermaid`), the `kymo`
  CLI (output extension picks the target: `kymo flow.mmd flow.d2` / `flow.dot` /
  `norm.mmd`), and PyO3 + wasm bindings (Python `kymo._core.mermaid_to_d2` …; JS
  `mermaidToD2` / `mermaidToDot` / `normalizeMermaid`). Golden + round-trip-fixpoint
  + determinism tests; DOT output validated against Graphviz.

## [0.4.3] - 2026-06-07

### Added

- **Mermaid rendering + CLI parity (Python/JS).** The Phase-1 Mermaid importer
  is now usable end-to-end from both front-ends. The Python and JS renderers
  gain a `diamond` glyph and an icon-less flowchart-node path
  (`box`/`circle`/`cylinder`/`badge`/`hex`/`diamond` drawn with the label inside);
  flowchart CSS is injected conditionally so existing output stays byte-identical.
  `kymo foo.mmd` now renders in the Python CLI (`cli.py` → `_core.import_mermaid`)
  and JS CLI (`render-cli.mjs` → `parseMermaid`), and the vscode-extension
  previews/exports `.mmd`/`.mermaid`. The core's `mermaid_to_kymojson` binding
  ships in this release.
- **Mermaid flowchart import (Rust core).** `kymostudio-core` gains a Mermaid
  importer — the first parser/model/layout subsystem to live in the Rust engine
  (rather than being duplicated in Python and JS like BPMN). It parses Mermaid
  `graph` / `flowchart` source (directions `TD`/`TB`/`BT`/`LR`/`RL`; node shapes
  `[]` `()` `([])` `[[]]` `[()]` `(())` `{}` `{{}}`; edges `-->` `---` `-.->`
  `==>` with `|labels|`; `subgraph … end`) and emits the resolved model as
  `.kymo.json` (the interchange format Python/JS already load). A layered
  (Sugiyama) layout — ported from `bpmn_layout.py` — positions the
  coordinate-less graph deterministically. Decision nodes (`{}`) introduce a new
  `diamond` shape. Exposed as a Rust API (`mermaid_to_kymojson`), the `kymo` CLI
  (`kymo flow.mmd → flow.kymo.json`), PyO3 (`mermaid_to_kymojson`) and wasm
  (`mermaidToKymoJson`). The output is byte-conformant with `to_kymojson`.
  See `docs/specs/mermaid/` (FEAT-MERMAID-001) and
  `docs/formats/mermaid/mermaid-mapping.md` (MERMAID-MAP-001); samples
  `samples/pipeline.mmd`, `samples/approval.mmd`.

## [0.4.2] - 2026-06-07

### Changed

- **BPMN is now a single source of truth in `kymostudio-core` (Rust).** Python and
  JS no longer carry their own BPMN ports — import, export, layout and rendering
  all delegate to the core (the wheel for Python, the wasm build for JS). The core
  gains BPMN bindings (`bpmn_import` / `bpmn_export` / `bpmn_layout` / `bpmn_render`,
  and the wasm `bpmnImport` / `bpmnExport` / `bpmnLayout` / `bpmnRender`) plus a
  model-JSON → `Diagram` deserializer. BPMN output is byte-identical across Python,
  JS and Rust.

### Notes

- The JS library's synchronous BPMN entry points (`parseBpmn` / `toBpmn` /
  `bpmnLayout`, and `parseDiagram` on a `bpmn { }` source) now require the wasm core
  to be initialized once: `await init()` (browser) or `initSync(bytes)` (Node).
  `renderSVG` auto-initializes; the `kymo` CLI and the VS Code extension do it for
  you. The `kymostudio-core` dependency requirement is unchanged (`^0.4`).

## [0.4.1] - 2026-06-06

### Changed

- **Python & JS now require `kymostudio-core` `^0.4`** (`>=0.4,<0.5` / `^0.4`),
  up from `^0.3`. This activates the `kymo … out.pdf` SVG → vector PDF path in
  the Python and JS CLIs (it calls the core's `svg_to_pdf`, new in 0.4.0). The
  floor raise lands one release after 0.4.0 so the floor always points at an
  already-published core (`docs/RELEASING.md`); 0.4.0 published the core, so CI
  and installs now resolve it cleanly. No API changes.

## [0.4.0] - 2026-06-06

### Added

- **SVG → vector PDF.** New `svg_to_pdf` in `kymostudio-core` (built on
  `svg2pdf`) converts an SVG to a one-page vector PDF — crisp at any zoom,
  selectable text, no `--scale`. CSS-class-aware like the PNG path. `svg2pdf`
  brings its own `usvg` 0.45, kept behind a `pdf` cargo feature alongside the
  resvg 0.47 PNG path (native only; the wasm build also enables it for the JS
  CLI). Exposed to Python (PyO3 `svg_to_pdf`) and JS (wasm `svgToPdf`).
- **`kymo <input> out.pdf` in all three CLIs.** The output format follows the
  output extension (`.pdf` → vector PDF, otherwise PNG). An existing `.svg`
  converts directly; a `.kymo`/`.bpmn`/`.kymo.json` source is rendered then
  converted. **Live now in the Rust `kymo` CLI** (it depends on the 0.4 core).
  The Python and JS CLIs ship the `.pdf` path here too, but it activates once
  they run on a 0.4 core — their `kymostudio-core` floor is raised to `^0.4` in
  0.4.1 (until then `kymo … out.pdf` prints a "needs kymostudio-core ≥ 0.4"
  hint). See `docs/RELEASING.md` for why the floor lags one release.

## [0.3.6] - 2026-06-06

### Added

- **`kymo <input> [output.png] [--scale N]` SVG → PNG CLI in all three impls.**
  An existing `.svg` rasterizes directly; a `.kymo`/`.bpmn`/`.kymo.json` source
  is rendered then rasterized (Python + JS). All three route through the one
  `resvg` engine in `kymostudio-core`, producing byte-identical PNG output.
- **New `packages/rust/kymostudio` crate** — the `kymo` CLI binary now lives in
  its own crate (published as `kymostudio` on crates.io → `cargo install
  kymostudio`); `kymostudio-core` is now a pure library. `release-crate.yml`
  gained a `publish-cli` job (publishes the CLI after the core, with retry for
  crates.io index lag).

### Changed

- **Python now depends only on `kymostudio-core`** — dropped `cairosvg`; SVG→PNG
  (CLI + Excalidraw icon embedding) goes through the shared `resvg` engine.
- **JS adds `kymostudio-core` (wasm) as its sole runtime dependency** for the
  `kymo` CLI's PNG output; the library itself remains dependency-free.

### Fixed

- **PyPI `kymostudio-core` was stuck at 0.3.3.** `pyproject.toml` pinned the
  version statically, so maturin rebuilt 0.3.3 every release. The version is now
  sourced dynamically from `Cargo.toml` (one source of truth), so each release
  publishes the correct wheel.

## [0.3.5] - 2026-06-06

### Fixed

- **`release-crate.yml` macOS wheel build** — the `macos-13` (Intel) runner was
  retired by GitHub on 2025-12-08, so that job queued forever and blocked the
  PyPI publish for `kymostudio-core` 0.3.4. Switched to `macos-latest` (arm64) +
  `macos-15-intel` (x86_64), matching linebender/resvg's CI. This release lands
  `kymostudio-core` on PyPI for the first time.

## [0.3.4] - 2026-06-06

### Added

- **New `packages/rust/kymostudio-core`** — a pure-Rust SVG → PNG rasterizer
  built on `resvg` (no browser, no C deps). One core crate compiled to three
  targets via feature flags: the native `kymo` CLI, a Python extension (abi3
  wheel, `_kymostudio_core`), and a wasm package for browser + Node. Published
  to crates.io, PyPI, and npm as `kymostudio-core`. CI build matrix in
  `.github/workflows/rust.yml`; release via `release-crate.yml`.

### Changed

- `packages/python` `to_webp.py` now prefers the in-repo `_kymostudio_core`
  rasterizer when installed, falling back to `resvg-py` — same engine, no
  behavior change.

## [0.3.3] - 2026-06-03

### Fixed

- **BPMN external labels (events / gateways / data objects & stores) now
  render at their authored `BPMNLabel` DI position and width** instead of
  always being forced centered below the glyph. The importer reads each
  shape's `<bpmndi:BPMNLabel><dc:Bounds>` (new `Component.label_box`),
  and the renderer places + wraps the label there with font metrics tuned
  to the label font (~0.46em) so multi-word labels match bpmn.io's line
  breaks and are never truncated with an ellipsis. Diagrams without label
  bounds keep the previous below-glyph fallback.

## [0.3.2] - 2026-06-03

### Fixed

- **BPMN node labels no longer truncate to two lines** — event, gateway,
  data-object and data-store labels now wrap onto up to **three lines**
  (matching tasks), so longer multi-word labels (e.g. the Vietnamese
  "Nhận xác nhận thông luồng" / "Phát sinh vấn đề nghiệp vụ") render in
  full instead of being cut off with an ellipsis (`…`).

## [0.3.1] - 2026-05-29

### Changed

- **BPMN format docs restructured into a normative-reference set** — the single
  `docs/formats/bpmn.md` is now the folder [`docs/formats/bpmn/`](docs/formats/bpmn/),
  a **1:1 mirror of the OMG BPMN 2.0.2 specification** (OMG `formal/2013-12-09` /
  ISO/IEC 19510:2013): a `README.md` index (`BPMN-NREF-001`) over one file per clause
  (`01-scope` … `15-exchange-formats`) and per annex (`annex-a` … `annex-c`) — the
  spec's **15 clauses + 3 annexes** — each citing its governing OMG clause. The kymo
  element mapping keeps its id `BPMN-MAP-001` and moves to
  [`docs/formats/bpmn/kymo-mapping.md`](docs/formats/bpmn/kymo-mapping.md).

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
  gated against the full MIWG corpus. See [`docs/formats/bpmn.md`](docs/formats/bpmn.md).

## [0.2.8] - 2026-05-23

### Added

- **`bpmn { }` DSL block** — author BPMN 2.0 processes directly in `.kymo` as
  typed nodes and flows, auto-laid-out left-to-right (Sugiyama) with optional
  `@ (x,y)` pins, in both the Python and JavaScript engines. Node kinds map to
  `bpmn-*` glyphs/markers (`start`/`end`/`end!`/`task`/`xor`/`and`/`or`/…, with
  `type=` refinements); flow arrows `->` (sequence), `~>` (message), `..>`
  (association); chains and `;` expand to one flow per segment. The block emits
  a fully-resolved sub-diagram, so the existing renderer draws it unchanged. New
  sample [`samples/order-flow.kymo`](samples/order-flow.kymo); grammar
  specified in `docs/formats/kymo-dsl/06-grammar.md` §6.9 (KYMO-DSL-001 v2.1).

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
  [`samples/order.bpmn`](samples/order.bpmn),
  [`samples/collaboration.bpmn`](samples/collaboration.bpmn) and
  [`docs/formats/bpmn.md`](docs/formats/bpmn.md).

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

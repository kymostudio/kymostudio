# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Both the Python (`kymostudio` on PyPI) and JavaScript (`kymostudio` on npm)
packages share a version number.

## [Unreleased]

### Changed

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

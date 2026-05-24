# Contributing to kymo

Thanks for your interest in improving **kymo**! This guide covers how the
monorepo is laid out, how to build and test each package, and the conventions we
follow for commits, pull requests, and releases.

To report a security issue, see [SECURITY.md](SECURITY.md) — please do **not**
open a public issue for vulnerabilities.

## Repository layout

```
packages/
  python/             # Python package (PyPI: kymostudio) — reference engine
  js/                 # JS/TS package (npm: kymostudio) — independent engine
  vscode-extension/   # VS Code extension (bundles the JS engine)
website/app/          # Browser .kymo playground (React + esbuild)
docs/                 # KYMO_DSL.md (normative spec), formats/, specs/plans/features
icons/                # File-backed icon assets, consumed at build time
samples/              # Example .kymo / .bpmn sources and rendered output
tools/info.py         # Version/tagline sync across the monorepo
```

The Python and JS packages are **two independent implementations** of the same
`.kymo` DSL, model, layout, and BPMN behavior — `packages/js` is not a port of
`packages/python`. Keep them at feature parity (see [Parity](#parity)).

## Prerequisites

- **Python ≥ 3.10** and [uv](https://docs.astral.sh/uv/) (for `packages/python`)
- **Node 20** (for `packages/js`, `packages/vscode-extension`, `website/app`)

## Per-package dev loop

Run commands from inside the relevant package directory.

| Package | Install | Lint / typecheck | Test | Build |
|---|---|---|---|---|
| `packages/python` | `uv sync --group dev` | `uv run --group dev ruff check src tests` | `uv run --group dev python -m pytest -q` | `python -m build` |
| `packages/js` | `npm ci` | `npm run lint` · `npm run typecheck` | `npm test` | `npm run build` |
| `packages/vscode-extension` | `npm ci` | `npm run typecheck` | `npm test` | `npm run build` → `npm run package` |
| `website/app` | — | — | — | `./website/app/build.sh` |

Notes:
- `packages/js` `npm test` runs `tsc` then `node --test`; it stays
  zero-runtime-dependency.
- `packages/vscode-extension` bundles the JS engine, so build `packages/js`
  first if you changed it.
- Tests include **golden fixtures** (`packages/*/tests/`) — when you
  intentionally change rendered output, regenerate and review the fixture diffs
  rather than editing them blindly.

## Parity

If you change DSL parsing, the diagram model, layout, alignment, or BPMN
import/export behavior in one language, mirror the change in the other so
`pip install kymostudio` and `npm install kymostudio` stay consistent.
[`docs/KYMO_DSL.md`](docs/KYMO_DSL.md) is the normative specification — update it when the
language surface changes.

## Commit & pull-request conventions

- Use Conventional-Commits-style messages with a scope, matching existing
  history: `feat(js): …`, `fix(website): …`, `docs(canvas-engine): …`,
  `chore(python): …`.
- Keep each PR focused. Fill out the PR template checklist.
- Add a bullet under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for any
  user-visible change.
- Make sure lint/typecheck and tests pass for every package you touched.

## Versioning & releases

Releases are maintainer-only. The single source of truth for the version is
`packages/python/pyproject.toml`; propagate it across all manifests with:

```bash
python tools/info.py version X.Y.Z
```

Pushing a `vX.Y.Z` tag triggers the PyPI, npm, and VS Code release workflows.
Contributors should **not** bump versions in PRs — just add the changelog entry.

# Releasing & dependency conventions

How the `kymostudio` monorepo versions, depends on its shared core, and publishes
to PyPI, npm, and crates.io. The release itself is automated by the `/kymo-bump`
workflow; this document is the normative reference for the conventions it follows.

## Lockstep versioning

These all share **one** version number, bumped together every release:

| Package | Registry | Manifest |
| --- | --- | --- |
| `kymostudio` (Python) | PyPI | `packages/python/pyproject.toml` (+ `src/kymo/__init__.py`) |
| `kymostudio` (JS) | npm | `packages/js/package.json` |
| `kymostudio-core` | crates.io · PyPI · npm (wasm) | `packages/rust/kymostudio-core/Cargo.toml` |
| `kymostudio` (CLI) | crates.io | `packages/rust/kymostudio/Cargo.toml` |

`kymostudio-core` is the shared, pure-Rust **resvg** engine (SVG → PNG). Its
wheel version is sourced dynamically from `Cargo.toml` (`dynamic = ["version"]`
in its `pyproject.toml`) — one source of truth, so the PyPI wheel never drifts
from the crate version.

A `v*` tag fires every `release-*.yml`; the `verify-version` jobs fail the
release if any manifest is out of sync.

## The `kymostudio-core` dependency convention

Every `kymostudio` package depends on `kymostudio-core` with the **same
caret-to-MINOR-series** requirement (pre-1.0: a caret on the leading non-zero
component, i.e. the minor). All three forms below are exactly `>=0.3.0, <0.4.0`:

| Ecosystem | Manifest | Declaration |
| --- | --- | --- |
| Rust | `packages/rust/kymostudio/Cargo.toml` | `kymostudio-core = { path = "../kymostudio-core", version = "0.3" }` |
| Python | `packages/python/pyproject.toml` | `kymostudio-core>=0.3,<0.4` |
| npm | `packages/js/package.json` | `"kymostudio-core": "^0.3"` |

**Rule: bump this dependency only on a minor/major release — never on a patch.**
A `/kymo-bump patch` leaves all three dep specs untouched; the dep is **not** a
lockstep version spot. Only raise it when moving to a new minor (`0.3` → `0.4`)
or when a package starts requiring a newer core feature.

Why caret-to-minor instead of an exact, lockstep pin:

- **Identical semantics** across all three resolvers — one mental model.
- **No churn / drift** — the dep isn't edited on patch releases.
- **The resolver always installs the newest compatible core**, so users still
  get the matching version on a fresh install.
- **The floor is always an already-published version**, which removes the
  crates.io same-release publish-ordering problem (see below).

## Publish flow & ordering

Each registry resolves dependencies differently, so only one needs ordering:

- **crates.io** — `cargo publish` verifies the dependency requirement against the
  index **at publish time**. With the caret-to-minor floor, the CLI's requirement
  (`>=0.3.0`) is satisfied by an already-published core, so on a **patch** release
  `kymostudio` publishes immediately. `release-crate.yml` still publishes
  `kymostudio-core` before the `kymostudio` CLI (`publish-cli` `needs:
  [publish-crate]`) and retries; that retry only matters on a **minor** bump,
  when the floor points at the core version published in the same run and the
  sparse index lags briefly.
- **npm & PyPI** — `npm publish` / `twine upload` do **not** resolve dependencies
  at publish time (resolution happens at install). The Python and JS `kymostudio`
  packages and the `kymostudio-core` wheel/wasm publish from separate workflows
  (`release-pypi.yml`, `release-npm.yml`, and the `publish-pypi`/`publish-npm`
  jobs in `release-crate.yml`) **in parallel, with no ordering** — and none is
  needed, because the dep is a range satisfied by an already-published core.

Publishes are **idempotent**: the crates.io jobs treat an `already exists`
response as success, so re-running a release does not false-fail.

### First publish of a brand-new crate

crates.io **Trusted Publishing (OIDC) cannot create a new crate** — the first
publish of a new crate name must be done once manually with an API token to
claim the name, after which a trusted publisher is configured and subsequent
releases use OIDC. (Both `kymostudio-core` and `kymostudio` are already claimed
and configured.)

## Cutting a release

Run `/kymo-bump [patch|minor|major|X.Y.Z]` (default `patch`). It bumps every
lockstep spot, updates `CHANGELOG.md`, ships to `main`, watches CI, tags +
creates the GitHub release, and watches the publish workflows. See the
`/kymo-bump` skill for the step-by-step.

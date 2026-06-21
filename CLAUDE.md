# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**kymostudio** — a diagram-as-code DSL that compiles declarative source into **animated SVG** (plus Figma / Excalidraw / WebP). Monorepo (layout mirrors Remotion): two publishable libraries under `packages/`, sharing one version number.

- `packages/python` (PyPI `kymostudio`, CLI `kymo`) — the Python implementation: DSL parser, BPMN importer, layout engine, and renderers.
- `packages/js` (npm `kymostudio`) — an **independent TypeScript implementation with equivalent functionality** (its own data model, icon library, DSL parser + layout + alignment resolver (`dsl.ts`/`layout.ts`/`alignment.ts`, exposed as `parse`/`parseDiagram`), BPMN importer, and SVG renderer `renderSVG`). **Not a port** of the Python package — the two are separate codebases developed in parallel and kept at feature parity.
- Shared root assets consumed by both: `icons/`, `samples/`, `docs/`. The websites live under `packages/`: `packages/website` (kymo.studio — React landing + client-side playground at `/app/`), `packages/docs` (docs.kymo.studio — VitePress, content sourced from `docs/`), `packages/editor` (editor.kymo.studio — client-side editor). All three deploy to **Cloudflare Pages** (root `website/` is an empty legacy dir).

Python requires **>=3.13** and is managed with **uv**.

## Commands

```bash
# Python (run from packages/python)
uv run --group dev python -m pytest -q                          # all tests
uv run --group dev python -m pytest tests/test_dsl.py::test_x   # single test
uv run kymo ../../samples/aiq.kymo                           # .kymo -> .svg
uv run kymo <file> --animate | --figma | --excalidraw           # other targets
uv run kymo ../../samples/order.bpmn                            # .bpmn -> .svg (BPMN import)

# Regenerate golden SVGs after an INTENTIONAL renderer/layout change (see gotcha):
KYMO_UPDATE_GOLDEN=1 uv run --group dev python -m pytest tests/test_diagrams.py tests/test_layout.py tests/test_edges.py

# JavaScript (run from packages/js)
npm test                # builds TS to dist/ then `node --test`
npm run build           # tsc -> dist/ (JS + .d.ts)
npm run typecheck       # tsc --noEmit
npm run build-manifest  # regenerate the icon manifest from root icons/

# Website (run from packages/website) — landing + playground at /app/
./build.sh              # assemble dist/ from committed bundles (no JS recompile)
./build.sh --bundle     # also rebuild src/landing.bundle.js + app/kymo.bundle.js (esbuild)
npm run dev             # serve dist/ at http://localhost:4321

# Deploy a website to Cloudflare Pages manually (wrangler OAuth must be
# logged in; --branch=main = production). Local auth identity: CLAUDE.local.md.
npx wrangler pages deploy dist --project-name=kymo-studio --branch=main
```

CI (`.github/workflows/test.yml`) runs `pytest -q` (Python) and `npm test` (JS) per package.

**Deploys**: pushing to `main` auto-deploys via `deploy-website.yml` / `deploy-docs.yml` / `deploy-editor.yml` (Cloudflare Pages projects `kymo-studio` / `kymo-docs` / `kymo-editor`, path-filtered). The wrangler command above is the manual path — note a later `main` push re-deploys whatever is on `main`, so land the source change too or it gets overwritten.

**Local dev ports (fixed by convention).** The `kymo-mcp` worker's `ALLOWED_ORIGINS` CORS whitelist (`packages/mcp/src/index.ts`) only admits two localhost origins, so serve each site on its assigned port or its cross-origin calls to `api.kymo.studio` get blocked:
- **`icons.kymo.studio`** (`packages/website-icons`) → **8231** — e.g. `cd packages/website-icons && ./build.sh && (cd dist && python3 -m http.server 8231)`. Needs the API for the live brands/overlay catalogue + the admin panel.
- **`editor.kymo.studio`** (`packages/editor`) → **8099**.

Both ports (and their `127.0.0.1` forms) are whitelisted; any other port is rejected by the worker's `/api/*` CORS.

## Architecture (packages/python/src/kymo)

The renderer is deliberately **dumb**: `model.py` holds plain dataclasses (`Component`, `Region`, `Edge`, `Diagram`) and the emitters just turn that data into output. To change a diagram you change the data, never the renderer.

**Pipeline** (front-ends produce a `Diagram`, then a shared back-end resolves + renders):

1. **Source → `Diagram`**
   - `.kymo` (the DSL) → `dsl.py:parse()` — line-oriented grammar; parsing is purely declarative (collects elements, validates nothing, computes no positions).
   - `.bpmn` (BPMN 2.0 XML) → `from_bpmn.py:parse()` — reads the file's Diagram-Interchange geometry.
   - `.py` source → a module exposing `DIAGRAM` (+ optional `LAYOUT`, `EXTERNAL_LAYOUT`).
2. **`layout.py:layout()`** — only when a DSL `layout { … }` tree is present; positions members of auto-layout frames.
3. **`alignment.py:resolve_alignments()`** — the post-parse resolver (5 passes): auto-layouts, parent/child anchoring, region auto-bounds, fan-in / trunk-lane edge staggering, and auto-canvas sizing. This is where positions actually get computed.
4. **`to_svg.py:render()`** — the SVG back-end. Sibling emitters: `to_figma.py`, `to_excalidraw.py`, `to_webp.py`.

`cli.py` wires this together (`load()` dispatches by extension). **BPMN is special**: DI coordinates are already absolute, so `cli.py` skips both `layout()` and `resolve_alignments()` for `.bpmn` — the importer returns a fully-resolved `Diagram`.

`icons.py` resolves icon keys: hand-coded `ICONS` first, then file-backed icons scanned from the root `icons/` directory (cached on first hit).

BPMN glyph drawing lives in `bpmn_shapes.py` (kept out of `to_svg.py` to keep the architecture renderer lean); `render_component`/`render_edge` delegate to it for `bpmn-*` shapes, and BPMN defs/CSS are injected **only when the diagram actually uses them** (see gotcha).

## Key gotchas

- **Golden SVG tests are byte-for-byte.** `tests/test_diagrams.py`, `test_layout.py`, `test_edges.py` compare `render()` output against committed `output.svg` fixtures. Any change that alters rendered bytes fails them. When the change is intentional, regenerate with `KYMO_UPDATE_GOLDEN=1` (see Commands). When adding a feature, keep output for unaffected diagrams byte-identical (e.g. inject feature-specific CSS/defs conditionally) so you don't have to churn every golden.
- **BPMN render-regression baselines are the same idea, corpus-scale.** `tests/test_bpmn_corpus.py` renders ~120 vendored MIWG `.bpmn` (in `tests/corpus_bpmn/`) and compares `(status, node/edge counts, SVG hash)` to `baseline.json`; it gates every build. After an intentional BPMN-renderer change, regenerate with `KYMO_UPDATE_BPMN_BASELINE=1 uv run --group dev python -m pytest tests/test_bpmn_corpus.py`, and **also** refresh the full-corpus `baseline_full.json` (used by the nightly `bpmn-regression.yml`) via `tests/_bpmn_regress.py --corpus <MIWG clone> --baseline tests/corpus_bpmn/baseline_full.json --update`.
- **The DSL spec is normative and dual-sourced.** `dsl.py` is the reference implementation; `docs/DSL.md` specifies the grammar (EBNF) and must be updated in lockstep when the grammar changes. `docs/BPMN.md` documents the importer's element mapping.
- **Rasterization uses the resvg core (`kymostudio-core`), not cairosvg.** PNG output goes through `to_png.py:render_png` → `_kymostudio_core.svg_to_png` (the `kymostudio-core` wheel; `resvg-py` is an undeclared best-effort fallback). cairosvg was REMOVED (it mis-rendered CSS-class SVGs to blank); `kymostudio-core` is now Python's sole runtime dep and also backs `to_webp.py` + the Excalidraw icon embedding. For ad-hoc SVG→PNG checks, `rsvg-convert` also works.
- **Two independent implementations at parity.** `packages/python` and `packages/js` are separate, equivalent codebases (each with its own model, icons, DSL parser + layout + alignment, BPMN importer, and SVG renderer) — neither is a port of the other. A feature added to one (e.g. BPMN import, or the `.kymo` DSL front-end) should be implemented in the other too. The `packages/js` **library** is dependency-free (ships ESM + `.d.ts`); its only runtime dep is `kymostudio-core` (the wasm resvg build), used by the `kymo` CLI's PNG output (`bin/render-cli.mjs`). A third package, `packages/vscode-extension`, bundles the JS engine for in-editor `.kymo`/`.bpmn` preview. The `kymo` SVG→PNG CLI exists in all three impls (Rust binary in the `packages/rust/kymostudio` crate, Python `kymo … out.png`, JS `bin/kymo.mjs`), all via the one `kymostudio-core` resvg engine.
- **Python↔JS parity is enforced by a golden conformance suite, not by trust.** Two layers, both with **Python as reference impl and sole golden writer** (regenerate with `KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest tests/test_conformance.py tests/test_bpmn_conformance.py`, then make the JS suite pass against the same goldens — reconcile toward Python, don't loosen): (1) **`.kymo` → model** — `conformance/corpus/*.kymo` + `samples/*.kymo` drive `test_conformance.py` / `conformance.test.js`, deep-equal of resolved model JSON + BPMN export digest vs `conformance/golden/*.json`; (2) **BPMN both directions** — `samples/*.bpmn` + `tests/fixtures/bpmn/*` + the full MIWG `tests/corpus_bpmn/` drive `test_bpmn_conformance.py` / `bpmn-conformance.test.js` (consolidated snapshots `golden/bpmn_import.json` + `bpmn_export.json` + committed interop XML `golden/export_bpmn/`), locking same `.bpmn`→same model AND export interop. The serializers (`tests/_conformance.py` ↔ `tests/_conformance.mjs`) are hand-mirrored — keep them in sync. **JS must round with `pyRound` (`src/round.ts`, half-to-even) wherever Python uses `int(round(...))`** — this was the single root cause behind every divergence reconciled (in `alignment.ts`, `bpmn-layout.ts`, `from-bpmn.ts`, `to-bpmn.ts`). Tracked-but-unreconciled `.bpmn` divergences go in `conformance/known_divergences.json` (currently empty). See `conformance/README.md`.

## Conventions

- **Releasing + dependency conventions live in [`docs/RELEASING.md`](docs/RELEASING.md)** (normative, tracked). In brief: every `kymostudio` package depends on the shared `kymostudio-core` engine with the **same caret-to-MINOR-series** requirement — Rust `version = "0.3"`, Python `>=0.3,<0.4`, npm `^0.3` (all ≡ `>=0.3.0, <0.4.0`) — bumped **only on a minor/major** release, **never on a patch** (NOT a lockstep version spot). The floor is always an already-published core, so crates.io needs no same-release publish ordering; npm/PyPI resolve at install so never need it. See the doc for the publish flow + the brand-new-crate (Trusted Publishing) caveat.
- Commit messages: `<type>(<namespace>): <subject>` (e.g. `feat(python): …`), subject ≤ 50 chars. Never add AI-attribution (`Co-Authored-By: Claude/Anthropic`) trailers.
- **Commit identity + network/proxy notes are machine-local** — see `CLAUDE.local.md` (gitignored): the repo pins a specific `git config user.email`, and when `git push` times out on this network it tunnels through a cloud box. Keep those operational details out of this committed file.
- **Mermaid-bench worst/best comparison tables use the three-engine image format.** In `benches/mermaid-format/research/*.md`, the worst-10 (and best-10) comparison tables are **always** the columns `| file | kymo render · Δ | merman render · Δ | mermaid.js 11 (mmdc, reference) | cause |` — each render cell an `<img width="…" src="assets/2026-06-15-worst10/{kymo,merman,mermaidjs}/<file>.png"><br>` followed by the bold `**Δ%**` (kymo) / plain `Δ%` (merman), the mermaid.js cell image-only (it is the reference). Sort **worst-first by kymo Δ**. Δ = mean per-channel |Δ| vs the mmdc PNG (`accuracy.py` metric). Numbers come from `worst10-grid.mjs` → `assets/.../scores.json` (`kScore`/`mScore` ×100); regenerate both renders and scores with `node worst10-grid.mjs`. Never reduce these to a plain text-only table.
- **Cross-doc citation by `document_id`, not path.** In `docs/` notes that carry a `document_id` frontmatter field (the reference / comparison docs under `docs/softwares/`, plus `DSL.md` and `BEST_PRACTICE_DIAGRAMS.md`), cite other such docs by their **`document_id`** (e.g. `REF-D2-CMP-001`, `DSL-LANG-001`) — in `related_documents`, the doc-control table, and inline prose alike. Never reference them by file path. IDs are stable across file moves/renames (relative paths break when a doc is relocated); external resources (upstream repos, web URLs) stay as plain links.

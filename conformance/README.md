# Python ↔ JS conformance — parity lock

`packages/python` and `packages/js` are two **independent** implementations of
the kymostudio toolkit, kept at feature parity. This directory locks that parity
*before* any new render target is added. Two layers:

1. **`.kymo` → model** — given the same DSL source, both resolve to the **same
   diagram model**.
2. **BPMN format, both directions** — given the same `.bpmn`, both **import** to
   the same model; and any model **exports** to interoperable `.bpmn` (one
   language's export re-imports, in the other, to the same model).

## How it works

Python is the **reference implementation** (per `CLAUDE.md`) and the sole writer
of the goldens. Both test suites then assert their own output against the same
committed bytes, so parity is locked transitively (both `== golden` ⇒ both equal),
and the suite doubles as a regression snapshot.

- `corpus/*.kymo` — curated feature cases (copied from the Python golden-test
  inputs). The 5 repo `samples/*.kymo` are **also** part of the corpus, read in
  place — not copied here. Corpus = `samples/*.kymo` ∪ `corpus/*.kymo`, keyed by
  filename stem.
- `golden/<stem>.model.json` — the canonical resolved model (every corpus file).
- `golden/<stem>.bpmn.json` — the BPMN export digest (BPMN-capable files only).

Test drivers:
- `.kymo` — `test_conformance.py` / `conformance.test.js`.
- `.bpmn` (both directions) — `test_bpmn_conformance.py` / `bpmn-conformance.test.js`.
- shared serializers: `tests/_conformance.py` ↔ `tests/_conformance.mjs` (hand-mirrored — keep in sync).

All run inside the existing `python` / `js` CI jobs — no new job.

## What is compared

After the full resolve pipeline (`parse → [bpmnLayout] → [layout] →
resolveAlignments`):

1. **Canonical model** — `width`, `height`, `title`, `subtitle`, and the
   `components` / `regions` / `edges` lists with every field. Intermediate AST
   (`layout_trees`/`layoutTrees`, `bpmn_blocks`/`bpmnBlocks`) is excluded.
2. **BPMN export digest** — for any diagram using `bpmn-*` shapes: round-trip
   `Diagram → export → re-import (parseBpmn) → canonical`, collections sorted by
   id. A normalized digest (not raw XML) because the two serializers will never
   match byte-for-byte and `packages/js` has no XML parser.

## BPMN format — bidirectional (`test_bpmn_conformance.py` / `bpmn-conformance.test.js`)

Corpus = `samples/*.bpmn` + `packages/python/tests/fixtures/bpmn/*` + the full
vendored MIWG corpus (`packages/python/tests/corpus_bpmn/`, ~120 files,
referenced in place). `.bpmn` files are read as UTF-8 with invalid bytes replaced
(matching the existing corpus tooling and Node's `readFileSync(…, "utf8")`).

- **Import** (`.bpmn` → model): both importers must produce the **same canonical
  model** (`golden/bpmn_import.json`, `{stem: model}`). An importer that throws is
  recorded as `{"status":"error"}` (no language-specific type/message), so
  both-error matches while error-vs-success is a tracked divergence.
- **Export** (model → `.bpmn`): each importable, non-empty model's `export → re-import`
  digest must match (`golden/bpmn_export.json`).
- **Export interop**: for a small reviewable set (`golden/export_bpmn/<stem>.bpmn` —
  Python's actual export of samples + fixtures), each suite asserts that importing
  **that committed XML** yields the same digest as importing its **own** export.
  This is the real "both export the same format" proof: Python's output is readable
  by JS's importer to the identical model, and vice-versa — not byte-for-byte.

Goldens here are **consolidated snapshots** (like `tests/corpus_bpmn/baseline.json`)
because the corpus is large; the small `.kymo` corpus stays per-file for readable diffs.

### Known divergences (`known_divergences.json`)

A hand-maintained `{stem: reason}` allowlist of `.bpmn` import divergences not yet
reconciled. The JS suite **skips** these stems (they are *tracked*, never hidden);
Python guards that no entry is stale. Currently **empty** — the full MIWG corpus is
locked in both directions. Burn any future entries down rather than growing the list.

> The two importers/exporters must round identically: JS uses `pyRound`
> (`packages/js/src/round.ts`, half-to-even) everywhere Python uses `int(round(...))`.
> This was the single root cause behind every MIWG divergence reconciled here.

## Canonical schema

- **Keys:** snake_case (Python-native; matches `docs/DSL.md`). The JS serializer
  maps its camelCase fields to snake_case.
- **Points/bounds:** arrays (Python tuples → lists).
- **Numbers:** integral floats collapse to ints (`5.0` → `5`); genuine fractions
  are kept as-is so a real divergence surfaces rather than being rounded away.
  `-0` normalizes to `0`.
- **Nulls:** every field is emitted explicitly (`null` for `None`/`null`).
- **Order:** `components`/`regions`/`edges` keep parse order (order is part of the
  contract); the BPMN digest sorts by id.
- **Completeness guardrail:** each serializer asserts it emits every model field
  (Python via `dataclasses.fields`; JS via the factory's `Object.keys`), so a new
  model field can't be silently dropped.

## Regenerating the goldens

Only Python writes goldens. After an **intentional** change to the resolved model
or BPMN import/export:

```bash
cd packages/python
KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest \
    tests/test_conformance.py tests/test_bpmn_conformance.py
```

Then run the JS suite (`cd packages/js && npm test`). If it fails, the two
implementations have diverged — reconcile them (default to Python) rather than
loosening the comparison.

## Rust BPMN — the single source of truth

The Rust core (`packages/rust/kymostudio-core`, `bpmn` feature) carries the BPMN
stack — import, export, layout, **and SVG render** — as the eventual single source
of truth. It is validated against Python (the reference) the same golden way, via
`packages/rust/kymostudio-core/tests/bpmn_conformance.rs` (`cargo test --features bpmn`):

- **import / export** reuse the shared `golden/bpmn_import.json` + `golden/bpmn_export.json`
  (the very files the Python/JS suites assert against) — locked over the full corpus.
- **layout** uses `golden/bpmn_layout.json` — the positionless `bpmn { }` block AST +
  its resolved model, written by `gen_bpmn_layout.py` (Rust has no DSL front-end yet,
  so the AST is fed directly rather than parsed from `.kymo`).
- **render** is **byte-identical** to `to_svg.render`: `golden/bpmn_svg/<stem>.svg`
  (curated, byte-compared) + `golden/bpmn_svg.json` (`{stem: sha256}` over the full
  corpus), written by `gen_bpmn_svg.py`.

Regenerate the two Rust-only goldens after an intentional change (Python stays the
sole writer):

```bash
cd packages/python
uv run python ../../conformance/gen_bpmn_layout.py
uv run python ../../conformance/gen_bpmn_svg.py
```

The Python wheel (`python` feature ⇒ `bpmn`) exposes `bpmn_import`, `bpmn_layout`,
and `bpmn_to_svg` so Python/JS can eventually delegate to this core; the delegation
(deleting the per-language ports) is a later step, intentionally not done yet.

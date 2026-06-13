---
title: Mermaid Format — Test & Verification (umbrella)
document_id: TEST-MERMAID-001
version: "0.3"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers verifying the Mermaid importer
review_cycle: On test-strategy or family-scope change
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - DESIGN-MERMAID-001
  - PLAN-MERMAID-001
  - TEST-MERMAID-FLOWCHART-001
  - KYMOJSON-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - test
  - golden
  - conformance
---

# Mermaid Format — Test & Verification (umbrella)

## 1. Levels

| Level | Where | Gates |
|---|---|---|
| Unit | `#[cfg(test)]` in `model`, `kymojson`, `mermaid::lexer`, `mermaid::parser`, `mermaid` | `cargo test` |
| Golden | `tests/mermaid_golden.rs` + `tests/fixtures/mermaid/*.mmd` + `golden/*.kymo.json` | `cargo test` |
| Determinism | `tests/mermaid_golden.rs::layout_is_deterministic` | `cargo test` |
| Contract | Python `from_kymojson` round-trip (see §3) | manual / parity-phase CI |
| Smoke | `rust.yml` CLI step + wheel `mermaid_to_kymojson` import | CI |

## 2. Golden tests (TC-MERMAID)

- **TC-1** Each `tests/fixtures/mermaid/<name>.mmd` → `mermaid_to_kymojson` is
  compared byte-for-byte to `golden/<name>.kymo.json`. Fixtures cover: a TD chain,
  a TD decision with a diamond + labelled branches, an LR fan-out, all node shapes,
  a subgraph (→ region), and a cycle (back-edge ranking).
- **TC-2** Goldens are **Rust-authored** (no Python Mermaid front-end exists yet to
  cross-check); regenerate deliberately with
  `KYMO_UPDATE_MERMAID_GOLDEN=1 cargo test --test mermaid_golden` and review the
  diff.
- **TC-3 (determinism, NFR-1)** Two imports of each fixture are byte-equal.

## 3. Contract fidelity (NFR-3)

The Rust output must be loadable and byte-stable through the Python contract. The
verification (run during development; folds into the parity phase CI):

```
for f in golden/*.kymo.json:
    d  = from_kymojson.parse(open(f).read())
    rt = to_kymojson.export(d)
    assert open(f).read() == rt           # byte-identical
```

All Phase-1 fixtures pass this, including the subgraph fixture (exercises a
serialized `Region`).

## 4. CI

`.github/workflows/rust.yml` already runs `cargo test` (unit + golden + determinism)
on Linux/macOS/Windows and `cargo check --no-default-features`. Added:
- CLI smoke: `kymo flow.mmd flow.kymo.json` then assert the envelope.
- Wheel smoke: `_kymostudio_core.mermaid_to_kymojson(...)` returns a `diamond`-bearing
  kymojson.

## 5. End-to-end rendering (now verified)

End-to-end **rendering** of Mermaid output is now tested (the parity phase shipped):
the Python/JS renderers draw icon-less flowchart nodes + the `diamond` glyph
(`packages/python/tests/test_mermaid.py`, `packages/js/tests/mermaid.test.js`), and
the core's own **pure-Rust flowchart SVG renderer** (`crate::flowchart_svg`) renders
`mermaid_to_svg` / `d2_to_svg` / `dot_to_svg` — validated by rasterizing through
resvg. Transpilation + draw.io encoding are covered by `tests/mermaid_convert.rs`
and `src/drawio.rs` unit tests.

# bench — kymostudio benchmarks

A first-class home for **offline benchmarks**, kept separate from `tests/` the
way a Rust crate keeps `benches/` separate from `tests/`. A test asserts *did it
stay correct*; a bench answers *how good is it* — and prints numbers you can
read, link, and put in front of a stakeholder.

This is its own **uv project** (path-depends on `../packages/python`, editable),
so it runs standalone without touching the package's own dev environment:

```bash
cd bench
uv sync                       # one-time: create the env (kymo editable)
uv run python bpmn/run.py     # run a bench, refresh its results/
```

Benches are **offline** — run by hand, results committed. None of them gate CI;
the per-build/nightly regression gates live in `packages/python/tests/` and
`.github/workflows/`. A bench reads those committed snapshots (and times the
real pipeline) to roll them up — it never re-baselines them.

## Benches

| Folder | Measures | Output |
|--------|----------|--------|
| [`bpmn/`](bpmn/) | BPMN module quality — render pass-rate, Python↔JS parity, element coverage (correctness) **and** parse+render timing (performance) | [`bpmn/results/REPORT.md`](bpmn/results/REPORT.md) |
| [`svg2png/`](svg2png/) | SVG→PNG rasterizer comparison — kymo's resvg core vs cairosvg, svglib, pyvips/librsvg, resvg-py: render fidelity vs the kymo reference (correctness) **and** rasterize timing (performance) | [`svg2png/results/REPORT.md`](svg2png/results/REPORT.md) |

Each bench folder follows the same shape: read-only `quality.py` (correctness,
pure stdlib), `perf.py` (timing, imports `kymo`), `run.py` (both → `results/`),
and a committed `results/` with `quality.json`, `perf.json`, `REPORT.md`.

Related: [`../conformance/`](../conformance/) locks Python↔JS parity (the source
of the parity numbers a bench reports).

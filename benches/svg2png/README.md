# svg2png — SVG → PNG rasterizer bench

Puts kymo's SVG→PNG path (the `kymo … out.png` back-end, **resvg**) side by side
with the popular Python rasterizers, on the SVGs **kymo itself emits** — and asks
two questions:

- **Fidelity** — does the engine actually reproduce kymo's PNG, or does it drop
  the modern SVG features kymo uses (`<style>` class selectors, `height:auto`,
  pattern/gradient fills, a filter)?
- **Performance** — how fast is each engine over the same corpus?

## Engines compared

| Engine | Backend | Role |
|---|---|---|
| `kymo` | resvg (kymostudio-core) | **reference** — the shipped `kymo … out.png` path |
| `resvg-py` | resvg (standalone) | control — same engine, should be pixel-identical |
| `pyvips` | librsvg (via libvips) | independent high-fidelity renderer |
| `cairosvg` | Cairo | popular pure-Python rasterizer |
| `svglib` | reportlab renderPM | popular pure-Python rasterizer |

An engine whose package isn't importable is reported as skipped, not an error.

## Run

```bash
cd benches
uv sync --extra svg2png        # one-time: pull the comparison rasterizers
uv run python svg2png/run.py   # quality + perf → results/
```

`run.py` writes `results/quality.json`, `results/perf.json`, and the
human-readable `results/REPORT.md`. `quality.py` and `perf.py` also run
standalone.

> The comparison engines need system libraries — Cairo (`libcairo2`), libvips
> (`libvips-dev`) and a C toolchain (`build-essential pkg-config python3-dev
> libffi-dev libfreetype6-dev`) for the Cairo/ReportLab bindings. On Debian/Ubuntu:
> `sudo apt-get install -y build-essential pkg-config python3-dev libcairo2-dev
> libffi-dev libfreetype6-dev libvips-dev`.

## Files

- `engines.py` — the rasterizer registry (one guarded adapter per engine).
- `corpus.py` — builds the corpus: real kymo SVGs rendered from `.kymo` sources.
- `quality.py` — fidelity vs the kymo reference (render rate, dimensions, pixel diff).
- `perf.py` — timing per engine (median/p95, throughput, speed vs kymo).
- `run.py` — runs both, renders `results/REPORT.md`.
- `results/` — committed snapshot (`quality.json`, `perf.json`, `REPORT.md`).

See [`results/REPORT.md`](results/REPORT.md) for the latest scorecard.

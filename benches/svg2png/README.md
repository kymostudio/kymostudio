# svg2png — SVG → PNG rasterizer bench

Puts kymo's SVG→PNG path (the `kymo … out.png` back-end, **resvg**) side by side
with the popular Python rasterizers, and answers two questions:

- **Fidelity** — does the engine reproduce the SVGs **kymo itself emits**
  (`<style>` class selectors, `height:auto`, pattern/gradient fills, a filter)?
  Reference = kymo; `resvg-py` is the same-engine control.
- **Accuracy** — is the engine **correct**, judged against an *independent*
  ground truth (**headless Google Chrome**, the de-facto SVG renderer) on a
  vendored subset of the resvg test suite? Here **kymo is graded too**.
- **Performance** — how fast is each engine over the same kymo SVGs?

## Engines compared

| Engine | Backend | Role |
|---|---|---|
| `kymo` | resvg (kymostudio-core) | the shipped `kymo … out.png` path |
| `resvg-py` | resvg (standalone) | control — same engine as kymo |
| `pyvips` | librsvg (via libvips) | independent renderer |
| `cairosvg` | Cairo | popular pure-Python rasterizer |
| `svglib` | reportlab renderPM | popular pure-Python rasterizer |

## Headline result

Against Chrome ground truth, **kymo's resvg core is the most accurate** engine in
the field (lowest mean Δ overall and in nearly every category), *and* on kymo's
own SVGs it is the faithful, fastest option. librsvg is a close second; cairosvg
and svglib trail and partly fail. See [`results/REPORT.md`](results/REPORT.md).

For the full write-up — motivation, method, the two-reference design, per-category
analysis, and the investigation into why the best engines all "fail" one shapes
case (an SVG 2 `ic`-unit feature only Chrome implements) — read
**[`RESEARCH.md`](RESEARCH.md)**.

## Run

```bash
cd benches
uv sync --extra svg2png          # one-time: pull the comparison rasterizers
uv run python svg2png/run.py     # fidelity + accuracy + perf → results/
```

`run.py` writes `results/{quality,accuracy,perf}.json` and the human-readable
`results/REPORT.md`. Each pass also runs standalone (`quality.py`, `accuracy.py`,
`perf.py`).

> The comparison engines need system libraries — Cairo (`libcairo2`), libvips
> (`libvips-dev`) and a C toolchain for the Cairo/ReportLab bindings. On Debian/Ubuntu:
> `sudo apt-get install -y build-essential pkg-config python3-dev libcairo2-dev
> libffi-dev libfreetype6-dev libvips-dev`.

## The accuracy dataset

`datasets/resvg-suite/` is a vendored, MIT-licensed subset of the
[resvg test suite](https://github.com/linebender/resvg-test-suite) — 72
self-contained, text-free SVGs across 6 categories (shapes, painting,
paint-servers, structure, masking, filters) — each paired with a **headless-Chrome
reference PNG** in `refs/`. The committed refs *are* the ground truth, so the
accuracy bench runs without Chrome; Chrome is only needed to regenerate them.

```bash
# regenerate the dataset (needs network + Chrome):
python svg2png/datasets/select_dataset.py copy svg2png/datasets/resvg-suite 12 <suite-sha>
uv run python svg2png/gen_refs.py            # re-render Chrome refs
```

See [`datasets/resvg-suite/PROVENANCE.md`](datasets/resvg-suite/PROVENANCE.md) for
the source commit and selection rule. `text`/`image` SVGs are excluded — they
depend on bundled fonts / external resources that confound *rasterizer* accuracy
and can't resolve through the string-based engine API.

## Files

- `engines.py` — the rasterizer registry (one guarded adapter per engine).
- `corpus.py` — real kymo SVGs rendered from `.kymo` sources (fidelity corpus).
- `datasets.py` — the resvg-suite loader + viewBox-size normalizer.
- `quality.py` — fidelity vs the kymo reference.
- `accuracy.py` — accuracy vs the Chrome ground truth, per category.
- `perf.py` — timing per engine.
- `gen_refs.py` — render the Chrome reference PNGs (regeneration tool).
- `datasets/select_dataset.py` — re-select the vendored subset from the suite.
- `run.py` — runs all three passes, renders `results/REPORT.md`.
- `results/` — committed snapshot (`quality.json`, `accuracy.json`, `perf.json`, `REPORT.md`).

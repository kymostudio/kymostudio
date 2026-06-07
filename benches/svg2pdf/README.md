# svg2pdf — SVG → PDF converter bench

Puts kymo's SVG→PDF path (the `kymo … out.pdf` back-end, **`svg2pdf`** — the
usvg-lineage vector converter by typst, running inside `kymostudio-core`) side by
side with the well-known FOSS SVG→PDF tools reachable from Python, and answers:

- **Fidelity** — does the engine reproduce the PDF **kymo itself emits** from the
  SVGs **kymo itself emits** (`<style>` class selectors, `height:auto`,
  pattern/gradient fills, embedded icons, a filter)? Reference = kymo. PDFs are
  rasterized with **PyMuPDF** (MuPDF) for the pixel comparison.
- **Structure** — is the output *real vector content*? Page count, page size vs
  the SVG's own px size (the px→pt convention), and the vector-ops / embedded-image
  counts on page 1.
- **Performance** — how fast is each engine over the same kymo SVGs?

Unlike [`../svg2png/`](../svg2png/), there is **no same-engine control**:
`resvg-py` has no PDF path (resvg rasterizes; only `svg2pdf` in the core emits
PDF). So `rsvg-convert` (librsvg) is the independent cross-check, not a control.

## Engines compared

| Engine | Backend | Role |
|---|---|---|
| `kymo` | svg2pdf (kymostudio-core) | the shipped `kymo … out.pdf` path — reference |
| `rsvg-convert` | librsvg | independent high-fidelity vector engine (CLI) |
| `cairosvg` | Cairo | popular pure-Python converter |
| `svglib` | reportlab renderPDF | popular pure-Python converter |
| `fpdf2` | fpdf2 (pure Python) | zero-native-dep converter |

## Headline result

kymo's `svg2pdf` core emits a complete vector PDF (paths as vectors, icons as
images) for the SVGs kymo emits; **librsvg is the one independent engine that
reproduces it faithfully**. The pure-Python field struggles on kymo's real SVGs
(`cairosvg` produces blank pages; `svglib` can't handle `height:auto`; `fpdf2`
rejects `rgba()` and drops markers/filters/patterns). Engines also disagree on
the px→pt convention (kymo/fpdf2 keep 1 px → 1 pt, ×1.0; Cairo/librsvg apply the
CSS 96-dpi conversion, ×0.75).
See [`results/REPORT.md`](results/REPORT.md), and [`research/`](research/) for the
written analysis per round.

## Run

```bash
cd benches
uv sync --extra svg2pdf          # one-time: pull the comparison converters
uv run python svg2pdf/run.py     # fidelity + structure + perf → results/
```

`run.py` writes `results/{quality,perf}.json` and the human-readable
`results/REPORT.md`. Each pass also runs standalone (`quality.py`, `perf.py`).

> Dependencies: the **kymo** engine needs `kymostudio-core >= 0.4` (the release
> that added `svg_to_pdf`); on an older core it is reported as skipped. The
> comparison engines need system libraries — Cairo (`libcairo2`) for cairosvg,
> and **librsvg** (`rsvg-convert`, Debian/Ubuntu `librsvg2-bin`) for the librsvg
> engine; `rsvg-convert` is skipped if the binary isn't on `PATH`. PDFs are
> rasterized with PyMuPDF (bundled MuPDF, no system deps). On Debian/Ubuntu:
> `sudo apt-get install -y libcairo2 librsvg2-bin`.

## Files

- `engines.py` — the converter registry (one guarded adapter per engine).
- `corpus.py` — real kymo SVGs rendered from `.kymo` sources (fidelity corpus).
- `quality.py` — fidelity + structure vs the kymo reference (PyMuPDF rasterize).
- `perf.py` — SVG→PDF timing per engine.
- `run.py` — runs both passes, renders `results/REPORT.md`.
- `results/` — committed snapshot (`quality.json`, `perf.json`, `REPORT.md`).
- `research/` — a written article per benchmarking round (hand-written, not
  auto-generated).

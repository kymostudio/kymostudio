# svg2pdf — SVG → PDF converter bench

Puts kymo's SVG→PDF path (the `kymo … out.pdf` back-end, **`svg2pdf`** — the
usvg-lineage vector converter by typst, running inside `kymostudio-core`) side by
side with the widest reasonable field of well-known FOSS SVG→PDF software — famous
general-purpose renderers (headless Chrome, Inkscape, LibreOffice) *and* dedicated
converters — and answers:

- **Fidelity** — does the engine reproduce the PDF **kymo itself emits** from the
  SVGs **kymo itself emits** (`<style>` class selectors, `height:auto`,
  pattern/gradient fills, embedded icons, a filter)? Reference = kymo. PDFs are
  rasterized with **PyMuPDF** (MuPDF) for the pixel comparison.
- **Accuracy** — is the engine **correct**, judged against an *independent* ground
  truth (**headless Google Chrome**, the de-facto SVG renderer) on a vendored
  subset of the **web-platform-tests** SVG suite? Here **kymo is graded too**.
- **Structure** — is the output *real vector content*? Page count, page size vs
  the SVG's own px size (the px→pt convention), vector-ops / embedded-image counts,
  and **selectable-text** chars on page 1.
- **Performance** — how fast is each engine over the same kymo SVGs?

The svg2png bench uses `resvg-py` as a same-engine control; resvg has no PDF path,
but **`vl-convert` wraps the same `svg2pdf` as kymo**, so it plays that control
role here (expected ~0 diff). Chrome — the de-facto SVG renderer — and three other
independent engines provide the cross-checks that kymo's output is *correct*.

## Engines compared

| Engine | Backend | Role |
|---|---|---|
| `kymo` | svg2pdf (kymostudio-core) | the shipped `kymo … out.pdf` path — reference |
| `chrome` | headless Google Chrome | de-facto SVG renderer (print-to-PDF) |
| `rsvg-convert` | librsvg | independent high-fidelity vector engine (CLI) |
| `inkscape` | Inkscape | the vector editor, headless export (CLI) |
| `libreoffice` | LibreOffice | the office suite, headless convert (CLI) |
| `vl-convert` | svg2pdf (vl-convert) | same `svg2pdf` as kymo → same-engine control |
| `cairosvg` | Cairo | popular pure-Python converter |
| `svglib` | reportlab renderPDF | popular pure-Python converter |
| `fpdf2` | fpdf2 (pure Python) | zero-native-dep converter |

## Headline result

kymo's `svg2pdf` core emits a complete vector PDF (paths as vectors, icons as
images, **selectable text**) for the SVGs kymo emits. **`vl-convert` confirms the
method** (same `svg2pdf`, **0.0 diff — pixel-identical**), and the famous renderers
**Chrome** (0.81), **librsvg** (1.81) and **LibreOffice** (2.01) all reproduce the
diagram at high fidelity, so kymo's output is correct, not just self-consistent.
**Inkscape** is the lone divergent renderer (17 — fine on simple graphs, off on
the icon-rich samples). The dedicated pure-Python converters fall down: `cairosvg`
produces blank pages, `svglib` can't handle `height:auto`, `fpdf2` rejects
`rgba()` and drops markers/filters/patterns.
Engines also split on the px→pt convention (kymo/vl-convert/fpdf2 keep 1 px → 1 pt,
×1.0; Chrome/Inkscape/LibreOffice/Cairo/librsvg apply the CSS 96-dpi conversion,
×0.75).
See [`results/REPORT.md`](results/REPORT.md), and [`research/`](research/) for the
written analysis per round.

## Run

```bash
cd benches
uv sync --extra svg2pdf          # one-time: pull the comparison converters
uv run python svg2pdf/run.py     # fidelity + accuracy + structure + perf → results/
```

`run.py` writes `results/{quality,accuracy,perf}.json` and the human-readable
`results/REPORT.md`. Each pass also runs standalone (`quality.py`, `accuracy.py`,
`perf.py`). The accuracy pass reads the committed Chrome reference PNGs, so it
needs no browser; Chrome is only needed to *regenerate* them
(`uv run python svg2pdf/gen_refs.py`).

> Dependencies. The **kymo** engine needs `kymostudio-core >= 0.4` (the release
> that added `svg_to_pdf`); on an older core it is reported as skipped. Python
> converters (`vl-convert`, `cairosvg`, `svglib`, `fpdf2`) come from the
> `svg2pdf` extra. The CLI engines are system software, each skipped if its binary
> isn't on `PATH`: `rsvg-convert` (`librsvg2-bin`), `inkscape`, `libreoffice`, and
> a Chrome/Chromium binary (`google-chrome` / `chromium`). PDFs are rasterized
> with PyMuPDF (bundled MuPDF, no system deps). On Debian/Ubuntu:
> `sudo apt-get install -y libcairo2 librsvg2-bin inkscape libreoffice` (Chrome
> installed separately). Any absent engine is simply listed as skipped.

## Files

- `engines.py` — the converter registry (one guarded adapter per engine).
- `corpus.py` — real kymo SVGs rendered from `.kymo` sources (fidelity corpus).
- `datasets.py` — the web-platform-tests SVG loader + viewBox-size normalizer.
- `quality.py` — fidelity + structure vs the kymo reference (PyMuPDF rasterize).
- `accuracy.py` — accuracy vs the Chrome ground truth, per category.
- `perf.py` — SVG→PDF timing per engine.
- `gen_refs.py` — render the Chrome reference PNGs (regeneration tool).
- `run.py` — runs all three passes, renders `results/REPORT.md`.
- `datasets/wpt-svg/` — vendored WPT SVG subset + committed Chrome refs (see
  `PROVENANCE.md`).
- `results/` — committed snapshot (`quality.json`, `accuracy.json`, `perf.json`,
  `REPORT.md`).
- `research/` — a written article per benchmarking round (hand-written, not
  auto-generated).

---
bench: svg2pdf
generated: 2026-06-07
timestamp: 2026-06-07T02:12:47+00:00
host: Linux-6.8.0-117-generic-x86_64-with-glibc2.39
python: "3.13.13"
kymo_version: "0.4.1"
reps: 5
corpus: 30
reference: kymo
rasterizer: "PyMuPDF 1.27.2.3"
engines:
  kymo: "svg2pdf (kymostudio-core 0.4.1)"
  chrome: "Google Chrome 149.0.7827.53"
  rsvg-convert: "rsvg-convert version 2.58.0"
  inkscape: "Inkscape 1.2.2 (b0a8486541, 2022-12-01)"
  libreoffice: "LibreOffice 24.2.7.2 420(Build:2)"
  vl-convert: "svg2pdf (vl-convert 1.9.0.post1)"
  cairosvg: "Cairo (2.9.0)"
  svglib: "reportlab renderPDF (4.5.1, svglib 1.6.0)"
  fpdf2: "fpdf2 (2.8.7)"
---

# SVG → PDF — converter scorecard

> **Generated 2026-06-07** by `benches/svg2pdf/run.py` (run stamp `2026-06-07T02:12:47+00:00`).
> **Offline bench** — re-run with
> `cd benches && uv run python svg2pdf/run.py`. One question, two passes:
> **Fidelity** — does an engine reproduce the PDF *kymo itself emits* from the
> SVGs *kymo itself emits*, as real vector content? PDFs are rasterized with
> **PyMuPDF 1.27.2.3** for the pixel comparison. Fidelity is deterministic;
> *timing* is machine-dependent (host below), not a gate. The field spans famous
> general-purpose renderers (headless **Chrome**, **Inkscape**, **LibreOffice**)
> and dedicated converters; **vl-convert** is built on the same `svg2pdf` as kymo,
> so it doubles as a same-engine control (expected ~0 diff).

## 1. Fidelity + speed — vs kymo, on real kymo SVGs

Corpus: **30 kymo SVGs** (samples + conformance corpus), rendered from `.kymo`
sources; every engine converts the identical SVG string to PDF. Fidelity is
measured on page 1 rasterized over white; *diff* is mean per-channel |Δ| (0…255),
*differ* is the share of pixels off by > 1 luminance.

| Engine | Backend | Renders | Non-empty | Diff | Differ | Median ms | Files/s | Speed | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| kymo | `svg2pdf (kymostudio-core 0.4.1)` | 30/30 | 30/30 | — | — | 13.756 | 46.9 | ×1.0 | **reference** |
| chrome | `Google Chrome 149.0.7827.53` | 30/30 | 30/30 | 0.81 | 5.21% | 358.547 | 2.6 | ×0.05 | **high fidelity** |
| rsvg-convert | `rsvg-convert version 2.58.0` | 30/30 | 30/30 | 1.81 | 6.49% | 29.824 | 18.0 | ×0.38 | **high fidelity** |
| inkscape | `Inkscape 1.2.2 (b0a8486541, 2022-12-01)` | 30/30 | 30/30 | 17.09 | 18.13% | 210.278 | 4.6 | ×0.1 | **low fidelity** |
| libreoffice | `LibreOffice 24.2.7.2 420(Build:2)` | 30/30 | 30/30 | 2.01 | 10.19% | 1559.316 | 0.6 | ×0.01 | **high fidelity** |
| vl-convert | `svg2pdf (vl-convert 1.9.0.post1)` | 30/30 | 30/30 | 0.0 | 0.0% | 22.482 | 26.3 | ×0.56 | **pixel-identical** |
| cairosvg | `Cairo (2.9.0)` | 30/30 | 0/30 | 11.37 | 99.73% | 2.222 | 405.3 | ×8.64 | **empty pages** |
| svglib | `reportlab renderPDF (4.5.1, svglib 1.6.0)` | 0/30 | 0/0 | — | — | — | — | — | **fails to convert** |
| fpdf2 | `fpdf2 (2.8.7)` | 27/30 | 27/27 | 0.96 | 5.04% | 5.79 | 170.2 | — | **high fidelity (only 27/30)** |

*Diff/Differ blank for the reference (compared to itself). Speed is vs kymo,
shown only when an engine converted the same file set.*

## 2. PDF structure — page geometry & vector content

What actually landed in the PDF: page count, the page size relative to the SVG's
own px size (engines disagree on the px→pt convention — kymo/vl-convert/fpdf2 keep
1 px → 1 pt (×1.0), while Chrome/Inkscape/LibreOffice/Cairo/librsvg apply the CSS
96-dpi conversion, 1 px → 0.75 pt (×0.75); the drawing is identical, only the
nominal page differs), how much vector/image content page 1 carries (most engines
embed the diagram icons as images), and **Text (chars)** — how much *selectable*
text the PDF preserves (extracted with PyMuPDF).

| Engine | Single-page | Page scale vs SVG | Avg vector ops | Avg images | Text (chars) |
|---|---|---|---|---|---|
| kymo | 30/30 | ×1.0 | 10.2 | 4.1 | 78 |
| chrome | 30/30 | ×0.75 | 11.6 | 4.1 | 78 |
| rsvg-convert | 30/30 | ×0.75 | 11.7 | 4.1 | 61 |
| inkscape | 30/30 | ×0.75 | 25.2 | 4.1 | 60 |
| libreoffice | 30/30 | ×0.752 | 119.7 | 2.4 | 44 |
| vl-convert | 30/30 | ×1.0 | 10.2 | 4.1 | 78 |
| cairosvg | 30/30 | ×0.75 | 0.0 | 0.0 | 0 |
| svglib | 0/0 | — | — | — | — |
| fpdf2 | 27/27 | ×1.0 | 22.4 | 0.0 | 8 |

## What this shows

- **kymo's `svg2pdf` core produces a complete vector PDF** for the SVGs kymo
  emits — paths as vectors, icons embedded as images, selectable text — and is
  the reference here.
- **vl-convert validates the method.** It wraps the same `svg2pdf`, so it lands
  ~0 diff on kymo's output — the same-engine control the svg2png bench gets from
  `resvg-py`, which has no PDF equivalent.
- **The famous renderers largely agree with kymo:** headless **Chrome** (the
  de-facto SVG renderer), **librsvg** and **LibreOffice** each reproduce the full
  diagram at high fidelity — independent cross-checks that kymo's output is
  correct, not merely self-consistent. **Inkscape is the exception:** it matches
  on the simple conformance graphs (Δ ≈ 6) but diverges hard on the icon-rich
  architecture samples (Δ 80–140), where its PDF export of kymo's embedded raster
  icons / dense content departs from the resvg/Chrome consensus — pulling its
  corpus average to a low-fidelity 17.
- **The dedicated pure-Python converters are the ones that fall down:** `cairosvg`
  emits blank pages (it doesn't apply kymo's `<style>` class fills → 0 vector ops),
  `svglib` can't parse `height:auto`, and `fpdf2` renders the simpler conformance
  graphs but rejects the icon-rich samples' `rgba()` fills and drops
  `<marker>`/`<filter>`/`<pattern>` — so its low diff is over that easy subset only.
- **Selectable text survives in most engines** (Text column): the `svg2pdf`-based
  pair (kymo, vl-convert) and the renderers (Chrome, Inkscape, LibreOffice) keep
  real text — so kymo's PDFs *are* searchable, contrary to the old "svg2pdf
  paths-out-text" lore; cairosvg's blank pages carry none.
- Engines disagree on the **px→pt convention** (page-scale column): kymo,
  vl-convert and fpdf2 keep 1 SVG px = 1 PDF pt (×1.0); Chrome, Inkscape,
  LibreOffice, Cairo and librsvg apply the CSS 96-dpi conversion (×0.75). The
  rendered drawing is the same; only the nominal page size differs.

## Per-engine failures

- **svglib** — 30 failures: e.g. `ValueError: Can't convert 'auto' to length`
- **fpdf2** — 3 failures: e.g. `ValueError: rgba(15,23,42,0.02) does not follow the expected rgb(...) format`

## How it is measured

- **Fidelity** (`quality.py`) — render every `samples/*.kymo` +
  `conformance/corpus/*.kymo` through the kymo pipeline to one SVG string per
  item; convert each with every engine; rasterize page 1 with PyMuPDF, composite
  over white, and compare to kymo's rasterized page. Structural facts (page size,
  vector ops, images) come from the same PyMuPDF parse.
- **Performance** (`perf.py`) — time each engine (median of 5 reps per
  file after one warm-up) converting the kymo SVGs to PDF bytes.

## Honest limitations

- **Fidelity is agreement with kymo**, not an absolute ground truth. But with the
  de-facto renderer (Chrome) and three other independent engines in the field all
  converging on kymo's output, "self-consistent" and "correct" coincide here.
  `vl-convert` (same `svg2pdf`) is the same-engine control.
- **Page count / extra pages.** Chrome prints via paged media, so it can emit a
  trailing blank page (paged-media overflow) — the `single-page` column shows
  this; fidelity scores page 1, which holds the diagram.
- **Text axis measures presence, not placement.** The Text column counts
  extractable characters, confirming a PDF keeps real text; it does not verify the
  glyphs are positioned pixel-for-pixel (that is the fidelity pass's job).
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Comparison is via rasterization (PyMuPDF/MuPDF), so it inherits MuPDF's own
  rendering — a second renderer in the loop, applied identically to every engine.
- **Timing spans very different cost models** — in-process libraries vs CLI
  subprocesses (Chrome/Inkscape) vs LibreOffice (a full office suite that
  re-inits a profile per call, so it is slow by construction, not by inefficiency
  at the conversion itself). Host-specific: `Linux-6.8.0-117-generic-x86_64-with-glibc2.39`, Python
  3.13.13, 4 CPU, reps=5, 2026-06-07T02:12:47+00:00.

For the full write-up — motivation, method, per-engine analysis — read the
**[`research/`](research/)** folder: a written article per benchmarking round.

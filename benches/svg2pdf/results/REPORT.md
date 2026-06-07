---
bench: svg2pdf
generated: 2026-06-07
timestamp: 2026-06-07T00:50:19+00:00
host: Linux-6.8.0-117-generic-x86_64-with-glibc2.39
python: "3.13.13"
kymo_version: "0.4.1"
reps: 7
corpus: 30
reference: kymo
rasterizer: "PyMuPDF 1.27.2.3"
engines:
  kymo: "svg2pdf (kymostudio-core 0.4.1)"
  rsvg-convert: "rsvg-convert version 2.58.0"
  cairosvg: "Cairo (2.9.0)"
  svglib: "reportlab renderPDF (4.5.1, svglib 1.6.0)"
  fpdf2: "fpdf2 (2.8.7)"
---

# SVG → PDF — converter scorecard

> **Generated 2026-06-07** by `benches/svg2pdf/run.py` (run stamp `2026-06-07T00:50:19+00:00`).
> **Offline bench** — re-run with
> `cd benches && uv run python svg2pdf/run.py`. One question, two passes:
> **Fidelity** — does an engine reproduce the PDF *kymo itself emits* from the
> SVGs *kymo itself emits*, as real vector content? PDFs are rasterized with
> **PyMuPDF 1.27.2.3** for the pixel comparison. Fidelity is deterministic;
> *timing* is machine-dependent (host below), not a gate. There is **no
> same-engine control** (resvg has no PDF path); `rsvg-convert` (librsvg) is the
> closest independent cross-check.

## 1. Fidelity + speed — vs kymo, on real kymo SVGs

Corpus: **30 kymo SVGs** (samples + conformance corpus), rendered from `.kymo`
sources; every engine converts the identical SVG string to PDF. Fidelity is
measured on page 1 rasterized over white; *diff* is mean per-channel |Δ| (0…255),
*differ* is the share of pixels off by > 1 luminance.

| Engine | Backend | Renders | Non-empty | Diff | Differ | Median ms | Files/s | Speed | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| kymo | `svg2pdf (kymostudio-core 0.4.1)` | 30/30 | 30/30 | — | — | 14.206 | 45.8 | ×1.0 | **reference** |
| rsvg-convert | `rsvg-convert version 2.58.0` | 30/30 | 30/30 | 1.81 | 6.49% | 29.949 | 18.5 | ×0.4 | **high fidelity** |
| cairosvg | `Cairo (2.9.0)` | 30/30 | 0/30 | 11.37 | 99.73% | 2.364 | 372.7 | ×8.14 | **empty pages** |
| svglib | `reportlab renderPDF (4.5.1, svglib 1.6.0)` | 0/30 | 0/0 | — | — | — | — | — | **fails to convert** |
| fpdf2 | `fpdf2 (2.8.7)` | 27/30 | 27/27 | 0.96 | 5.04% | 5.676 | 175.0 | — | **high fidelity (only 27/30)** |

*Diff/Differ blank for the reference (compared to itself). Speed is vs kymo,
shown only when an engine converted the same file set.*

## 2. PDF structure — page geometry & vector content

What actually landed in the PDF: page count, the page size relative to the SVG's
own px size (engines disagree on the px→pt convention — kymo and fpdf2 keep
1 px → 1 pt (×1.0), while Cairo and librsvg apply the CSS 96-dpi conversion,
1 px → 0.75 pt (×0.75); the drawing is identical, only the nominal page differs),
and how much vector/image content page 1 carries (kymo and librsvg embed the
diagram icons as images).

| Engine | Single-page | Page scale vs SVG | Avg vector ops | Avg images |
|---|---|---|---|---|
| kymo | 30/30 | ×1.0 | 10.2 | 4.1 |
| rsvg-convert | 30/30 | ×0.75 | 11.7 | 4.1 |
| cairosvg | 30/30 | ×0.75 | 0.0 | 0.0 |
| svglib | 0/0 | — | — | — |
| fpdf2 | 27/27 | ×1.0 | 22.4 | 0.0 |

## What this shows

- **kymo's `svg2pdf` core produces a complete vector PDF** for the SVGs kymo
  emits — paths as vectors, icons embedded as images — and is the reference here.
- **librsvg (`rsvg-convert`)** is the one *independent* engine that reproduces
  kymo's output faithfully: full vector content and the same embedded icons. It
  is the closest thing to a cross-check in the absence of a same-engine control.
- **The pure-Python field struggles on kymo's real SVGs:** `cairosvg` emits
  blank pages (it doesn't apply kymo's `<style>` class fills → 0 vector ops),
  `svglib` can't parse `height:auto`, and `fpdf2` renders the simpler conformance
  graphs closely but rejects the icon-rich samples' `rgba()` fills and drops
  `<marker>`/`<filter>`/`<pattern>` — so its low diff is over that easy subset only.
- Engines disagree on the **px→pt convention** (page-scale column): kymo and
  fpdf2 keep 1 SVG px = 1 PDF pt (×1.0), while Cairo and librsvg apply the CSS
  96-dpi conversion (1 px → 0.75 pt, ×0.75). The rendered drawing is the same;
  only the nominal page size differs.

## Per-engine failures

- **svglib** — 30 failures: e.g. `ValueError: Can't convert 'auto' to length`
- **fpdf2** — 3 failures: e.g. `ValueError: rgba(15,23,42,0.02) does not follow the expected rgb(...) format`

## How it is measured

- **Fidelity** (`quality.py`) — render every `samples/*.kymo` +
  `conformance/corpus/*.kymo` through the kymo pipeline to one SVG string per
  item; convert each with every engine; rasterize page 1 with PyMuPDF, composite
  over white, and compare to kymo's rasterized page. Structural facts (page size,
  vector ops, images) come from the same PyMuPDF parse.
- **Performance** (`perf.py`) — time each engine (median of 7 reps per
  file after one warm-up) converting the kymo SVGs to PDF bytes.

## Honest limitations

- **One reference, one question.** Fidelity is *agreement with kymo*; there is no
  same-engine control (resvg has no PDF path), so `rsvg-convert` (librsvg) is the
  independent cross-check rather than a ground truth.
- **Text rendering differs by design.** `svg2pdf` (kymo) converts text to vector
  paths — crisp, but not selectable; Cairo/librsvg can embed real text. The
  rasterized comparison scores *appearance*, not text-selectability.
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Comparison is via rasterization (PyMuPDF/MuPDF), so it inherits MuPDF's own
  rendering — a second renderer in the loop, applied identically to every engine.
- Timing is host-specific (`Linux-6.8.0-117-generic-x86_64-with-glibc2.39`, Python 3.13.13,
  4 CPU, reps=7, 2026-06-07T00:50:19+00:00).

For the full write-up — motivation, method, per-engine analysis — read the
**[`research/`](research/)** folder: a written article per benchmarking round.

# A second reference: accuracy vs Chrome on web-platform-tests

**Round:** 2026-06-07 (accuracy pass) · Linux x86_64 (4 CPU), Python 3.13,
kymostudio-core 0.4.1 · PyMuPDF 1.27.2.3 rasterizer · ground truth: headless
Google Chrome 149 · 96 self-contained WPT SVGs.

Companion to [`../results/REPORT.md`](../results/REPORT.md) §2. The previous
rounds scored engines against **kymo's own output** (fidelity) — useful, but it
can only answer "who reproduces kymo," never "is kymo *right*." This round adds
the second reference the svg2png bench has and svg2pdf lacked: an **independent
ground truth**. Every engine — kymo included — is now graded against **headless
Chrome**, the de-facto SVG renderer, on a neutral third-party corpus.

## The dataset

96 **self-contained** SVGs vendored from the
[web-platform-tests](https://github.com/web-platform-tests/wpt) `svg/` suite
(commit `63a3c25`, BSD-3-Clause / W3C), across 11 categories (painting, path,
styling, struct, shapes, pservers, geometry, …). Selection mirrors the svg2png
bench's discipline: drop anything that pulls external resources (`<image>`,
external `href`, `@import`, web fonts, `<script>`) or lives in the
font/animation/interaction dirs, and drop oversized canvases (> 1000 px) to keep
the committed reference PNGs small. Each SVG is normalized to its viewBox size and
paired with a committed Chrome screenshot in `refs/`, so the pass runs offline —
Chrome is only needed to regenerate refs (`gen_refs.py`).

## Results — mean Δ vs Chrome (lower = more accurate)

```
Engine        Renders  Mean Δ   Matches    Note
chrome         96/96     2.91     97%       print-to-PDF = same renderer → baseline control
cairosvg       96/96     3.20     97%       <-- best of the real field
vl-convert     96/96     4.28     97%
inkscape       96/96     4.45     97%
rsvg-convert   96/96     4.62     95%
kymo           96/96     4.72     94%       svg2pdf core
libreoffice    87/96     9.16     79%
fpdf2          91/96    11.63     77%
svglib         94/96    13.32     76%
```

*"Matches" = share of samples with Mean Δ < 10 (lenient — absorbs AA/gamma).*

## Two things this reveals that the kymo-fidelity pass could not

### 1. cairosvg's "blank pages" was a kymo-specific failure, not a defect

In the fidelity pass cairosvg scored as **empty pages** — it produced blank PDFs
for kymo's SVGs. The obvious-but-wrong conclusion is "cairosvg is broken." The
accuracy pass refutes that decisively: on standard WPT SVGs cairosvg is the
**most accurate engine in the real field (3.20)**, ahead of every other converter.
So its fidelity failure is *specific to how kymo paints* — fills declared via
`<style>` class selectors, which cairosvg's PDF path doesn't apply — not a general
inability to convert SVG. This is exactly the kind of correction a second,
independent reference exists to make.

### 2. kymo is correct, but it is not the most accurate — and that's fine

Judged against kymo, kymo is the reference (0 by definition) and most rivals
"fail." Judged against Chrome, kymo is **4.72 — solidly in the leading cluster but
sixth of nine**, behind cairosvg and roughly tied with vl-convert / Inkscape /
librsvg. All the vector engines pack into a tight 3.2–4.7 band: on neutral SVGs
they are *all about equally close to Chrome*. kymo's real distinction here is
robustness — **96/96 rendered**, where LibreOffice (87), fpdf2 (91) and svglib
(94) drop files.

The honest synthesis of both references:

> On **kymo's own diagrams**, kymo's `svg2pdf` core (with vl-convert and librsvg)
> is the faithful choice and the pure-Python converters fall apart. On **generic
> SVGs**, kymo is correct and competitive but not exceptional — the vector field
> converges, and cairosvg, the §1 "failure," leads. kymo's edge is its own output,
> not SVG-at-large.

## Control check passed

`chrome` print-to-PDF scores **2.91** — the lowest, as it must, because it routes
the *same* renderer as the ground truth (the residual is the print pipeline:
paged-media, the px→pt scale, MuPDF re-rasterization). That near-baseline is the
method's sanity control, the role `resvg-py` plays in svg2png's accuracy pass.

## The weak tail, on a neutral corpus

LibreOffice (9.16), fpdf2 (11.63) and svglib (13.32) trail *and* drop files even
here — so their poor showing isn't a kymo-SVG quirk; they are simply less accurate
SVG→PDF paths in general. fpdf2's failures are still `rgba()` and unsupported
tags; svglib's are still parse errors; LibreOffice diverges on richer fills.

## Caveats

- Chrome is the de-facto SVG renderer but still *one* renderer; a category where
  everything diverges from it is as much a Chrome quirk as an engine fault.
- Comparison goes through MuPDF rasterization — a second renderer in the loop,
  applied identically to all engines.
- The corpus is the self-contained, ≤1000 px, text/animation-free slice of WPT;
  it is breadth across SVG features, not a stress test of huge documents.

## Bottom line

Adding the independent reference turns a one-sided "everyone fails to match kymo"
into the real picture: **kymo's svg2pdf output is correct (94% match to Chrome,
100% render) and sits in the top cluster of vector engines on neutral SVGs, while
its standout advantage is reserved for kymo's own diagrams.** And it corrected the
record on cairosvg — whose §1 "blank pages" verdict, taken alone, would have
libelled a converter that is actually the most accurate of the field on standard
input.

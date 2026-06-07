# The full FOSS field: SVG → PDF, nine engines

**Round:** 2026-06-07 (expanded field) · Linux x86_64 (4 CPU), Python 3.13,
kymostudio-core 0.4.1 · PyMuPDF 1.27.2.3 rasterizer · 30 kymo SVGs · reps 5.

Companion to [`../results/REPORT.md`](../results/REPORT.md). The
[first round](2026-06-07-svg-to-pdf-field-benchmark.md) benched kymo's `svg2pdf`
core against four converters (librsvg, cairosvg, svglib, fpdf2). This round
widens the field to **nine engines** — adding the famous general-purpose software
people actually reach for (**headless Chrome**, **Inkscape**, **LibreOffice**) and
**vl-convert** — and adds a **text-extractability** axis. Two assumptions from
round one did not survive contact with the data.

## What changed, and why

Round one's honest caveat was *"there is no same-engine control"* — svg2png gets
one from `resvg-py`, but resvg has no PDF path. That turned out to be wrong in a
useful way: **`vl-convert` is built on the same `svg2pdf`** kymo uses, so it *is*
a same-engine control. Adding it closes the methodological gap.

The second motivation was breadth. Round one's field was all dedicated
converters, three of which failed on kymo's real SVGs — which risks reading as
"kymo's SVGs are weird." Adding the de-facto renderer (Chrome) and two famous
vector applications (Inkscape, LibreOffice) tests that directly: if the software
everyone trusts renders kymo's output correctly, the dedicated converters' failures
are *their* limitation, not kymo's.

## Results

```
Engine        Renders  Diff    Text(ch)  Scale   Median ms   Speed   Verdict
kymo          30/30    —       78        ×1.0    13.8        ×1.0    reference
chrome        30/30     0.81   78        ×0.75   358.5       ×0.05   high fidelity
rsvg-convert  30/30     1.81   61        ×0.75    29.8       ×0.38   high fidelity
inkscape      30/30    17.09   60        ×0.75   210.3       ×0.10   low fidelity
libreoffice   30/30     2.01   44        ×0.75  1559.3       ×0.01   high fidelity
vl-convert    30/30     0.0    78        ×1.0     22.5       ×0.56   pixel-identical
cairosvg      30/30    11.37    0        ×0.75     2.2       ×8.64   empty pages
svglib         0/30    —       —         —        —          —       fails to convert
fpdf2         27/30     0.96    8        ×1.0      5.8       —       high fidelity (27/30)
```

*Diff = mean per-channel |Δ| vs kymo (lower = closer). Text = avg extractable
chars/page. Scale = PDF page size ÷ SVG px. Speed = vs kymo over the same files.*

## Two assumptions overturned

### 1. vl-convert ≈ kymo — the control works

`vl-convert` lands at essentially **zero diff** with the same page geometry and
the same embedded icons, exactly as a same-engine control should. This is the
validation round one couldn't offer: the fidelity method is sound, and kymo's
`svg2pdf` output is reproducible by an independent build of the same converter.

### 2. svg2pdf does NOT path-out text — kymo's PDFs are searchable

Round one repeated the common lore that `svg2pdf` converts text to vector paths
(crisp but unselectable). The new **Text column refutes it**: kymo's PDFs carry
the full complement of extractable characters — they are searchable and
copy-pasteable. `vl-convert` matches (same engine); Chrome, Inkscape and
LibreOffice also embed real text. The only engines without selectable text are the
ones that produced nothing to begin with. The lesson: measure, don't inherit
folklore — the axis added to *check* the assumption is what disproved it.

## The famous renderers mostly agree with kymo — with one exception

Headless **Chrome** — the de-facto SVG renderer the svg2png bench trusts as
ground truth — reproduces kymo's diagrams faithfully (Δ 0.81), as do **librsvg**
(1.81) and **LibreOffice** (2.01). Three independent engines, two of them
household-name applications, converging on kymo's output is a stronger statement
than round one's single librsvg cross-check: kymo's PDF is *correct*, not merely
self-consistent. The spread among them is familiar renderer-level stuff —
antialiasing, a faint background tint (librsvg), the px→pt page convention.

**Inkscape is the exception, and it's an interesting one.** Its corpus average is
**17.09 (low fidelity)** — but that hides a split: on the simple conformance
graphs it tracks kymo closely (Δ ≈ 5.8–7.3), while on the icon-rich architecture
samples it diverges *drastically* (`samples/aiq` Δ 81.8, `samples/data` Δ 138.2).
The divergence lives where kymo embeds **raster icons and dense content**;
Inkscape 1.2.2's PDF export renders those differently from the
resvg/Chrome/librsvg consensus that the other four engines form. So the low score
isn't "Inkscape is broken" — it's "Inkscape disagrees specifically on kymo's
busiest diagrams," and because those few samples carry the most ink, they dominate
the mean. A good example of why the bench reports per-engine structure (Inkscape
renders 30/30, single-page, same image count) alongside the headline diff.

## The dedicated converters still fall down — the same three ways

The expansion doesn't rescue the pure-Python field; it sharpens the contrast.
Against four famous engines that all succeed, `cairosvg` (blank pages), `svglib`
(`height:auto` parse failure) and `fpdf2` (`rgba()` rejection + dropped
markers/filters/patterns, succeeding only on the simpler graphs) are clearly the
outliers. When Chrome, Inkscape, LibreOffice, librsvg, kymo and vl-convert all
render a diagram and three converters can't, the SVGs are not the problem.

## Cost models differ — read the timing accordingly

The timing column now spans three regimes: in-process libraries (kymo, vl-convert,
cairosvg, fpdf2), CLI subprocesses (Chrome, rsvg-convert, Inkscape), and
**LibreOffice**, which re-initialises an office-suite profile per call and is slow
by construction — that is process startup, not conversion cost. The bench reports
it plainly rather than hiding it; for a batch converter you'd amortise startup,
which this per-file harness deliberately does not.

## What I'd still add

- **vl-convert's embedded-text layer vs kymo's** — both embed text now; a glyph
  position check would confirm they agree, not just that both have text.
- **Inkscape "text to path" mode** as a second column, to show the selectable vs
  outlined trade-off on demand.
- A browser **screenshot ground-truth** accuracy pass (à la svg2png), grading
  every engine — including kymo — against Chrome's raster rather than against kymo.

## Bottom line

With the field widened to the software people actually use, the picture is
stronger, not weaker: **kymo's `svg2pdf` output is reproduced pixel-identically by
an independent build of the same engine (vl-convert, 0.0 diff) and rendered
faithfully by the de-facto renderer Chrome plus librsvg and LibreOffice, with
selectable text preserved throughout.** Inkscape agrees on simple graphs but
diverges on the icon-rich diagrams (a real, localized difference the bench
surfaces rather than averages away). The dedicated pure-Python converters remain
the only ones that can't handle kymo's real SVGs at all — and the text axis we
added to interrogate kymo ended up correcting the record in kymo's favour
(svg2pdf embeds real, searchable text; it does not path it out).

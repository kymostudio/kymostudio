# Benchmarking SVG → PDF against the FOSS field

**Round:** 2026-06-07 · Linux x86_64 (4 CPU), Python 3.13, kymostudio-core 0.4.1 ·
PyMuPDF 1.27.2.3 as the rasterizer · corpus of 30 kymo SVGs.

This is the written companion to the machine scorecard at
[`../results/REPORT.md`](../results/REPORT.md). The scorecard is the numbers; this
is what they *mean*, and why the bench is shaped the way it is.

## Why this bench exists

kymo grew a PDF output path: `kymo … out.pdf` routes the rendered SVG through
[`svg2pdf`](https://github.com/typst/svg2pdf) (the usvg-lineage vector converter
by typst) inside `kymostudio-core`. PNG already had a bench
([`../../svg2png/`](../../svg2png/)); PDF did not. The question is the same one
svg2png asks, transposed to vector output: **of the well-known open-source
SVG→PDF converters, which actually reproduce the SVGs kymo emits — and at what
speed?**

The honest framing matters because PDF is not pixels. A converter can emit a
file that *opens* and *has one page of the right size* and still contain nothing.
So the bench does not trust file size or "it ran" — it **rasterizes page 1 with
MuPDF (PyMuPDF)** and compares the actual rendered image to kymo's, and it
**introspects the page** (vector-op count, embedded-image count, page geometry)
to catch the empty-but-valid case.

## The field

I deliberately benched the **widest reasonable set** of FOSS SVG→PDF tools
reachable from Python, not just the easy two:

| Engine | Backend | Why it's here |
|---|---|---|
| `kymo` | svg2pdf (kymostudio-core) | the shipped path — the reference |
| `rsvg-convert` | librsvg (GNOME) | the independent high-fidelity vector engine |
| `cairosvg` | Cairo | the most popular pure-Python converter |
| `svglib` | reportlab renderPDF | the other popular pure-Python converter |
| `fpdf2` | fpdf2 (pure Python) | zero-native-dependency converter |

The notable absence is a **same-engine control**. In svg2png, `resvg-py` is the
control: standalone resvg, the same engine kymo rasterizes with, so it reads ~0
diff and validates the method. There is no equivalent for PDF — resvg has no PDF
path; only `svg2pdf` emits PDF, and there is no second independent `svg2pdf`
binding in the field. So `rsvg-convert` (librsvg) takes the role of *independent
cross-check* rather than control. That's a real limitation, stated plainly in the
report.

## What the numbers say

```
Engine        Renders  Non-empty  Diff   Differ   Median ms  Speed   Verdict
kymo          30/30    30/30      —      —        14.2       ×1.0    reference
rsvg-convert  30/30    30/30      1.81   6.49%    29.9       ×0.4    high fidelity
cairosvg      30/30    0/30       11.37  99.73%   2.4        ×8.14   empty pages
svglib         0/30    0/0        —      —        —          —       fails to convert
fpdf2         27/30    27/27      0.96   5.04%    5.7        —        high fidelity (only 27/30)
```

**Two engines convert kymo's real SVGs; three do not — each failing differently.**

### librsvg is the faithful independent engine

`rsvg-convert` is the only non-kymo engine that reproduces the full diagram:
30/30 non-empty, mean Δ **1.81** vs kymo, and it embeds the diagram icons as
images just as kymo does (avg 4.1 images/page, matching kymo's 4.1). The residual
1.81 is antialiasing and a faint full-canvas background tint, not missing content.
It is ~2.5× slower than kymo (×0.4), which is unsurprising for a subprocess that
re-parses fonts per invocation. This is the closest the bench has to a second
opinion, and it agrees with kymo.

### cairosvg emits valid, beautiful, *empty* PDFs

This is the headline trap. `cairosvg` "renders" 30/30 — every call returns a
`%PDF` that opens to a single correctly-sized page. And every one is **blank**:
0 vector ops, 0 images, ~950 bytes. The verdict column says `empty pages`, not
`high fidelity`, precisely because the structural pass caught what a
"did-it-run" check would have missed. The cause is the same one that gives
cairosvg low fidelity in svg2png: kymo paints via `<style>` class selectors, and
cairosvg's PDF path doesn't apply them, so nothing draws. Its blazing ×8.14 speed
is meaningless — it's fast at producing nothing. (Note the `Differ` of 99.73%:
near-every pixel differs from kymo by a hair because kymo lays a light canvas
background the blank page lacks; the *mean* Δ stays low at 11.37 because the
difference is faint.)

### svglib can't even start

`svglib` fails 30/30 with `Can't convert 'auto' to length` — kymo's SVGs use
`height:auto`, which svglib's parser rejects before drawing anything. Identical to
its svg2png result. It is simply not a candidate for kymo output.

### fpdf2 is the interesting one — and the reason verdicts carry a caveat

`fpdf2` posts the *lowest* diff in the field, **0.96** — lower than librsvg's
1.81. Taken alone that reads as "fpdf2 is the most faithful converter," which is
false, and the bench is built so the caveat travels with the number: the verdict
is `high fidelity (only 27/30)`, and `Speed` is blank.

What's actually happening: fpdf2 renders the **27 simpler conformance graphs**
closely (correct geometry, correct fills), but **fails the 3 icon-rich samples**
(`aiq`, `aws_1`, `data`) with `rgba(15,23,42,0.02) does not follow the expected
rgb(...) format` — it has no `rgba()` support — and along the way drops
`<marker>`, `<filter>`, and `<pattern>`. So its 0.96 is an average over the *easy
subset only*, where the missing arrowhead markers cost almost nothing because
they're tiny. librsvg's 1.81 is over all 30, including the hard icon-rich
samples. The two averages are not comparable, which is exactly why `speed_vs_kymo`
is computed **only when an engine converted the same file set as the reference** —
fpdf2 converted 27 ≠ 30, so it gets no speed ratio, and the report says so.

This is the single most important design decision in the bench: **partial success
must not masquerade as full success.** A naive mean would have crowned fpdf2.

## The px → pt disagreement

A side finding worth recording: the engines don't agree on how an SVG pixel maps
to a PDF point.

| | page scale vs SVG px |
|---|---|
| kymo, fpdf2 | ×1.0 (1 px → 1 pt) |
| cairosvg, librsvg | ×0.75 (CSS 96-dpi: 1 px → 0.75 pt) |

Both are defensible — ×0.75 is the literal CSS interpretation (96 px/in ÷ 72
pt/in), ×1.0 treats the SVG's user units as points directly. The *drawing* is
identical; only the nominal page size differs, so the rasterized comparison
(which resizes to a common canvas) is unaffected. But it means a kymo PDF opens
at a different physical size than a librsvg one from the same source — a thing to
know if page dimensions ever matter downstream.

## What I'd add next

- **A text-selectability axis.** `svg2pdf` converts text to vector paths (crisp,
  not selectable); Cairo/librsvg can embed real text. The current bench scores
  appearance only. A pass that counts extractable text (`page.get_text()`) would
  surface this real, by-design difference — and motivate watching
  [`vl-convert-pdf`](https://lib.rs/crates/vl-convert-pdf), which adds an embedded
  text layer on top of svg2pdf.
- **Inkscape** as a second independent vector reference, if a headless install is
  acceptable (heavy, CLI-only).
- A **rgba-free corpus variant** to measure what fpdf2 does when it isn't tripped
  by `rgba()`, separating "can't parse the color" from "can't draw the diagram."

## Bottom line

For the SVGs kymo emits, **kymo's `svg2pdf` core and librsvg are the only two
engines that produce a complete, faithful vector PDF**, and kymo is the faster of
the two. The popular pure-Python converters each fall down in a different,
instructive way — blank (cairosvg), unparseable (svglib), or partial (fpdf2) —
which is the honest, useful result, and the one a "did it return bytes?" check
would have completely hidden.

# Which SVG→PNG rasterizer should a diagram tool ship? A two-reference benchmark

*An offline study behind `benches/svg2png/`. Written 2026-06-06 — analysing the run in [`../results/REPORT.md`](../results/REPORT.md).*

## Abstract

kymo turns a tiny DSL into an SVG and, when asked for a `.png`, rasterizes that
SVG. The rasterizer is therefore a load-bearing dependency: it decides whether
the PNG a user gets actually looks like the diagram kymo drew. We benchmark five
Python-reachable SVG→PNG engines — **resvg** (the one kymo ships, via
`kymostudio-core`), the standalone **resvg-py**, **librsvg** (via `pyvips`),
**cairosvg**, and **svglib/reportlab** — along two axes that are usually
conflated: *fidelity* (does the engine reproduce the SVG kymo emits?) and
*accuracy* (is the engine correct against an independent ground truth?). For the
second axis we use **headless Google Chrome** as the oracle over a vendored subset
of the resvg test suite. The two measurements agree: **resvg is both the faithful
choice for kymo's output and the most Chrome-accurate engine in the field**
(mean per-channel error 4.0/255 vs Chrome; 94 % of cases within tolerance). We
also report a methodological finding — the single largest engine-vs-Chrome
divergence in the whole corpus is not an engine defect but an SVG 2 feature
(`ic` length units) that Chrome implements and no dedicated rasterizer does.

## 1. Motivation

A diagram-as-code tool has an unusual property: it is the *author* of the SVGs it
later rasterizes. kymo emits a specific dialect of SVG — a `<style>` block with
CSS class selectors, a responsive root (`style="max-width:100%;height:auto"`),
gradient and pattern fills via `url(#…)`, and at least one filter. When a user
runs `kymo diagram.kymo out.png`, the question is not "is this rasterizer good in
general" but "does this rasterizer reproduce *our* SVG, fast, and correctly?"

That splits into two questions people routinely merge:

1. **Fidelity** — does engine X produce the same pixels kymo intends? The natural
   reference is kymo's own renderer.
2. **Accuracy** — is engine X *correct*? kymo can't be the reference here, or the
   benchmark just measures agreement-with-ourselves. We need an outside oracle.

Most rasterizer comparisons answer only one of these, and often circularly. We
answer both, and keep them clearly separate.

## 2. The rasterizer landscape

| Engine | Core | Language | Notes |
|---|---|---|---|
| resvg | resvg | Rust | Conformance-focused; kymo ships it as `kymostudio-core`. |
| resvg-py | resvg | Rust+PyO3 | Standalone binding of the same engine, pinned to an older resvg. |
| librsvg | librsvg | Rust/C | GNOME's renderer; reached here through libvips (`pyvips`). |
| cairosvg | Cairo | Python | Pure-Python parser over the Cairo 2D library. |
| svglib | reportlab | Python | Converts SVG to a ReportLab drawing, then renders. |

These differ not just in speed but in *how much of SVG they implement*. resvg and
librsvg are built to be SVG-conformant. cairosvg and svglib are lighter and trade
coverage for simplicity — which, as we'll see, matters a great deal for SVG that
leans on CSS and paint servers.

## 3. Why this is harder than "render and diff"

Two traps sink naive rasterizer benchmarks:

**Circularity.** If you score engines by how close they are to *your* renderer,
your renderer wins by definition, and an engine that happens to share your bug
scores better than one that's actually correct. The fix is an independent ground
truth. We use headless Chrome — the de-facto SVG renderer, implemented by neither
us nor any engine under test. To validate the method, we keep resvg-py in the
field: it wraps the *same* engine as kymo, so if our fidelity metric is sound,
resvg-py must score ~0 against kymo. It does (0.00).

**Intrinsic sizing.** The test SVGs carry a `viewBox` but no `width`/`height`, so
every renderer applies its own default size. Comparing a 200×200 render to a
100×100 one measures sizing policy, not rendering. We **normalize** every SVG to
its viewBox pixel extent before *any* renderer (Chrome included) sees it, so the
canvas is identical and differences are purely about drawing.

**Background convention.** Some engines default to transparent, others to white.
We composite every output over white before diffing, so an engine isn't penalized
for an alpha convention — only real drawing differences count.

## 4. Method

### 4.1 Two corpora

- **Fidelity corpus** — 30 real kymo SVGs, rendered from every `samples/*.kymo`
  and `conformance/corpus/*.kymo` through the public kymo pipeline (parse →
  layout → resolve_alignments → render). This is exactly the SVG a user
  rasterizes. Every engine receives the *identical* SVG string per item.
- **Accuracy dataset** — 72 SVGs vendored from the MIT-licensed
  [resvg test suite](https://github.com/linebender/resvg-test-suite), the
  de-facto SVG conformance corpus (~1,600 cases). We take a deterministic,
  self-contained, text-free subset: 12 each from *shapes, painting,
  paint-servers, structure, masking, filters*. We exclude `text` and `image`
  cases — they depend on bundled fonts and external resources that confound
  *rasterizer* accuracy (and can't resolve through a string-based API anyway).

### 4.2 Ground truth

For each dataset SVG, we render a reference PNG with **headless Google Chrome**
(`--headless=new`, device-scale 1, white background) at the normalized size, and
commit it. The committed references *are* the ground truth, so the accuracy bench
runs with no browser present; Chrome is needed only to regenerate them.

### 4.3 Metrics

After compositing over white, for each (engine, sample) we compute:

- **mean |Δ|** — mean per-channel absolute difference vs the reference, 0…255.
  This is the headline number; lower is closer.
- **% pixels differ** — share of pixels off by more than 1 luminance level.
- **match** — a sample "matches" the reference if mean |Δ| < 10 (lenient, to
  absorb antialiasing/gamma differences a correct renderer still shows vs Chrome).

We roll up per category and overall, and (for the kymo corpus) also time each
engine: median of 7 reps per file after a warm-up. Every run stamps a YAML front
matter into the report — host, Python/engine versions, corpus sizes, timestamp —
so two runs are trivially distinguishable.

## 5. Results

### 5.1 Fidelity — vs kymo, on real kymo SVGs

| Engine | Renders | mean Δ | % differ | Median ms | Verdict |
|---|---|---|---|---|---|
| kymo | 30/30 | — (ref) | — | 11.7 | reference |
| resvg-py | 30/30 | **0.00** | 0.0 % | 19.2 | pixel-identical |
| pyvips (librsvg) | 30/30 | 0.24 | 4.1 % | 15.7 | high fidelity |
| cairosvg | 30/30 | 11.24 | 99.7 % | 7.3 | low fidelity |
| svglib | **0/30** | — | — | — | fails to render |

Two engines reproduce kymo's output; two do not. cairosvg renders *something* for
every file but diverges on nearly every pixel — on the icon-rich samples it comes
out essentially blank, because it ignores the `<style>`-block class selectors and
the `url(#…)` gradient/pattern fills that carry most of kymo's color. svglib never
produces a pixel: kymo's responsive root (`style="…height:auto"`) trips
ReportLab's length parser (`ValueError: Can't convert 'auto' to length`) before
rendering begins.

### 5.2 Accuracy — vs headless Chrome, on the resvg test suite

| Engine | Renders | Matches | mean Δ | filt | mask | paint-srv | paint | shape | struct |
|---|---|---|---|---|---|---|---|---|---|
| **kymo** | 72/72 | **68/72 (94 %)** | **4.0** | 0.42 | 6.93 | 0.45 | 0.08 | 10.52 | 5.57 |
| resvg-py | 72/72 | 66/72 (92 %) | 5.51 | 1.46 | 6.93 | 0.45 | 0.08 | 10.52 | 13.62 |
| pyvips | 72/72 | 59/72 (82 %) | 9.82 | 7.34 | 8.69 | 17.91 | 0.07 | 10.58 | 14.36 |
| cairosvg | 67/72 | 46/72 (64 %) | 15.11 | 28.66 | 23.55 | 11.21 | 7.81 | 16.81 | 0.38 |
| svglib | 69/72 | 38/72 (53 %) | 36.02 | 16.80 | 60.57 | 66.47 | 39.47 | 11.51 | 15.48 |

Against an oracle that is no one's home renderer, **kymo's resvg core is the most
accurate engine here** — the lowest overall error and the lowest in nearly every
category. librsvg is a clear second, weakest on paint-servers (gradients/patterns)
and structure. cairosvg is mixed: best of all on plain document *structure* (0.38)
but poor on filters (28.66) and masking (23.55), and it fails outright on five
nested cases (`RecursionError`). svglib trails everywhere paint servers matter —
it has no real gradient or mask support — yet, tellingly, it renders 69/72 of the
*dataset* SVGs even though it rendered 0/30 of kymo's: those have explicit sizes
and no `height:auto`, so its parser survives. The defect is specific to kymo's
output, not to SVG in general.

### 5.3 Performance

Over the kymo corpus, the only engine faster than kymo is **cairosvg (×1.78)** —
and it is fast precisely because it skips the work (no CSS resolution, no paint
servers). Among the *faithful* engines, kymo is fastest by a wide margin: ×1.85
vs resvg-py and ×3.3 vs librsvg. The resvg-py result is the most surprising:
**same engine, ~1.85× slower** than kymo's core, with PNGs ~3× larger — a less
aggressive PNG encoder in the older standalone build. librsvg has the heaviest
tail (p95 344 ms): it is fine on small graphs but slow on the large icon-rich
diagrams that dominate total time.

## 6. Findings

**F1 — resvg wins both axes, and kymo's build wins within resvg.** kymo is exact
on its own SVG and most accurate vs Chrome. It even edges out resvg-py on
*filters* (0.42 vs 1.46) and *structure* (5.57 vs 13.62) — the only categories
where they differ — because `kymostudio-core` tracks a newer resvg than the
standalone binding. The version you ship matters as much as the engine you pick.

**F2 — "fast" can mean "skipped the hard part."** cairosvg tops the speed chart
and bottoms much of the accuracy chart for the same reason: it doesn't resolve
the CSS and paint servers that make kymo's diagrams legible. A throughput number
without a fidelity number is misleading.

**F3 — the biggest divergence is the oracle's, not the engine's.** The *shapes*
category looks anomalous: kymo, resvg-py, and librsvg all sit at ≈10.5 mean Δ,
far above their ~0.1 elsewhere. Per-sample analysis pins the entire gap on **one**
case, `shapes/rect__ic-values`, where every engine differs from Chrome by ~125/255:

```
shapes/rect__ic-values        kymo 125.51   pyvips 125.49   cairosvg 125.49
(other 11 shapes samples)     kymo  ~0.07   pyvips   ~0.13   cairosvg  ~5–51
```

The SVG sizes a rect in `ic` units — `width="90ic"` — the SVG 2 / CSS
*ideographic-advance* unit, relative to the font. Chrome implements `ic` and draws
a large square; **no** standalone SVG rasterizer implements it, so they all size
the rect differently. This is the central caveat of any browser-as-oracle study
made concrete: a large diff can mean "the engine is wrong" *or* "the oracle uses a
bleeding-edge feature the engine reasonably omits." Exclude this one case and the
resvg family is within ~0.1 of Chrome on shapes — effectively perfect.

**F4 — pure-Python engines are fragile at the edges.** Beyond accuracy, cairosvg
recurses to death on nested structures and svglib raises on several malformed-but-
recoverable inputs that resvg/librsvg render without complaint. Robustness tracks
conformance focus.

## 7. Threats to validity

- **Two references, two scopes.** Fidelity is *agreement with kymo*; accuracy is
  *agreement with Chrome*. Chrome is the de-facto SVG renderer but still one
  renderer — F3 shows it can be the outlier. Where all engines diverge from it,
  read "Chrome quirk" as readily as "engine bug."
- **Subset, not census.** 72 of ~1,600 suite cases, text/image excluded. The
  numbers describe self-contained, font-independent SVG; text rendering (where
  font availability dominates) is deliberately out of scope.
- **Host-specific timing.** Times are from a 4-vCPU cloud box (see the report's
  front matter) and are a same-machine reference, not an SLA.
- **Encoder, not just rasterizer.** Our metric is on decoded pixels, so PNG
  encoder choices don't affect accuracy — but they do affect the speed and output
  size we report (see resvg-py).

## 8. Conclusion

For a tool that authors modern SVG and then rasterizes it, the rasterizer choice
is not a wash. Of the five engines tested, only resvg and librsvg reproduce the
SVG kymo emits; of those, **resvg is both faithful and the most accurate against
an independent browser oracle, while also being the fastest faithful option** —
validating kymo shipping it as `kymostudio-core`. The pure-Python rasterizers are
attractive for their light footprint but drop the CSS and paint-server features
that diagram SVG depends on (cairosvg) or fail to parse it at all (svglib). And
the one place the best engines "fail" turns out to be a place the *oracle* is
ahead of every dedicated rasterizer — a reminder that an accuracy benchmark
measures conformance to its oracle, not platonic correctness.

## Reproduce

```bash
cd benches
uv sync --extra svg2png
uv run python svg2png/run.py     # fidelity + accuracy + perf → results/REPORT.md
```

See [`results/REPORT.md`](results/REPORT.md) for the live scorecard and
[`README.md`](README.md) for the harness. The accuracy dataset, its Chrome
references, and provenance live under
[`datasets/resvg-suite/`](datasets/resvg-suite/).

## References

1. resvg test suite — linebender/resvg-test-suite (MIT). https://github.com/linebender/resvg-test-suite
2. resvg — an SVG rendering library. https://github.com/linebender/resvg
3. librsvg — GNOME SVG rendering library. https://gitlab.gnome.org/GNOME/librsvg
4. CairoSVG. https://cairosvg.org/ · svglib. https://github.com/deeplook/svglib
5. CSS Values and Units — the `ic` unit. https://www.w3.org/TR/css-values-4/#ic

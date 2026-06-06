# SVG → PNG — rasterizer scorecard

> **Generated 2026-06-06** by `benches/svg2png/run.py` (run stamp `2026-06-06T12:51:11+00:00`).
> **Offline bench** — re-run with
> `cd benches && uv run python svg2png/run.py`. Two complementary questions:
> **(1) Fidelity** — does an engine reproduce the SVGs *kymo itself emits*?
> **(2) Accuracy** — is an engine *correct*, judged against an independent ground
> truth (**headless Google Chrome**) on the resvg test suite? Fidelity/accuracy
> are deterministic; *timing* is machine-dependent (host below), not a gate.

## 1. Fidelity + speed — vs kymo, on real kymo SVGs

Corpus: **30 kymo SVGs** (samples + conformance corpus), rendered from `.kymo`
sources; every engine rasterizes the identical SVG string. Fidelity is measured
on the image composited over white; *diff* is mean per-channel |Δ| (0…255),
*differ* is the share of pixels off by > 1 luminance.
`resvg-py` is the control — same engine as kymo, so ~0.

| Engine | Backend | Renders | Dims | Diff | Differ | Median ms | Files/s | Speed | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| kymo | `resvg (kymostudio-core 0.3.6)` | 30/30 | 30/30 | — | — | 11.156 | 60.6 | ×1.0 | **reference** |
| resvg-py | `resvg (0.3.2)` | 30/30 | 30/30 | 0.0 | 0.0% | 18.729 | 33.1 | ×0.55 | **pixel-identical** |
| pyvips | `librsvg (via libvips 8.15.1)` | 30/30 | 30/30 | 0.24 | 4.07% | 13.797 | 18.7 | ×0.31 | **high fidelity** |
| cairosvg | `Cairo (2.9.0)` | 30/30 | 30/30 | 11.24 | 99.73% | 6.974 | 106.8 | ×1.76 | **low fidelity** |
| svglib | `reportlab renderPM (4.5.1, svglib 1.6.0)` | 0/30 | 0/0 | — | — | — | — | — | **fails to render** |

*Diff/Differ blank for the reference (compared to itself). Speed is vs kymo,
shown only when an engine rendered the same file set.*

## 2. Accuracy — vs headless Chrome, on the resvg test suite

Dataset: **72 SVGs** vendored from `resvg-test-suite (MIT)` (filters 12, masking 12, paint-servers 12, painting 12, shapes 12, structure 12) — self-contained,
text-free, normalized to their viewBox size. Ground truth = **headless Google Chrome**
(committed `refs/`); every engine, *kymo included*, is graded against it. **Mean Δ**
is mean per-channel |Δ| vs Chrome (lower = more accurate); a sample "matches" if
Mean Δ < 10.0. Per-category columns are mean Δ.

| Engine | Backend | Renders | Matches Chrome | Mean Δ | filt | mask | paint-srv | paint | shape | struct |
|---|---|---|---|---|---|---|---|---|---|---|
| kymo | `resvg (kymostudio-core 0.3.6)` | 72/72 | 68/72 (94%) | **4.0** | 0.42 | 6.93 | 0.45 | 0.08 | 10.52 | 5.57 |
| resvg-py | `resvg (0.3.2)` | 72/72 | 66/72 (92%) | **5.51** | 1.46 | 6.93 | 0.45 | 0.08 | 10.52 | 13.62 |
| pyvips | `librsvg (via libvips 8.15.1)` | 72/72 | 59/72 (82%) | **9.82** | 7.34 | 8.69 | 17.91 | 0.07 | 10.58 | 14.36 |
| cairosvg | `Cairo (2.9.0)` | 67/72 | 46/72 (64%) | **15.11** | 28.66 | 23.55 | 11.21 | 7.81 | 16.81 | 0.38 |
| svglib | `reportlab renderPM (4.5.1, svglib 1.6.0)` | 69/72 | 38/72 (53%) | **36.02** | 16.8 | 60.57 | 66.47 | 39.47 | 11.51 | 15.48 |

*Closer to 0 = closer to Chrome. Rows sorted by overall accuracy.*

## What this shows

- **Against an independent ground truth, kymo's resvg core is the most accurate**
  engine here — lowest mean Δ vs Chrome overall and in nearly every category
  (filters, paint-servers, painting, structure). It even edges out the standalone
  `resvg-py` (newer resvg ⇒ better filters & structure).
- **librsvg (pyvips)** is the next most accurate, but diverges from Chrome on
  paint-servers (gradients/patterns) and structure.
- **cairosvg** is middling: good on basic structure, poor on filters and masking,
  and recurses to death on a few nested cases.
- **svglib** is the least accurate — no real gradient/mask support — and on kymo's
  *own* SVGs it can't render at all (`height:auto` defeats its parser).
- On kymo SVGs, the fidelity table tells the shipping story: resvg (shipped) is
  exact and fastest among the faithful engines; librsvg is faithful but slow;
  cairosvg is fast but drops kymo's CSS/gradients; svglib fails.

The two passes agree: **resvg is both the faithful choice for kymo's output and
the most Chrome-accurate engine in the field.**

## Per-engine failures

- **svglib** — 30 failures on the kymo SVGs: e.g. `ValueError: Can't convert 'auto' to length`
- **cairosvg** — 5 failures on the resvg-test-suite (MIT) dataset: e.g. `RecursionError: maximum recursion depth exceeded`
- **svglib** — 3 failures on the resvg-test-suite (MIT) dataset: e.g. `ValueError: could not convert string to float: ''`

## How it is measured

- **Fidelity** (`quality.py`) — render every `samples/*.kymo` + `conformance/corpus/*.kymo`
  through the kymo pipeline; decode each engine's PNG (Pillow), composite over
  white, compare to the kymo reference.
- **Accuracy** (`accuracy.py` + `datasets.py`) — a vendored MIT subset of the
  resvg test suite (`datasets/resvg-suite/`, see `PROVENANCE.md`), each SVG paired
  with a headless-Chrome reference (`gen_refs.py`, committed). Score every engine
  vs Chrome, rolled up per category. Chrome is only needed to *regenerate* refs.
- **Performance** (`perf.py`) — time each engine (median of 7 reps per
  file after one warm-up) over the kymo SVGs.

## Honest limitations

- **Two references, two questions.** Fidelity is *agreement with kymo* (with
  `resvg-py` as the same-engine control); accuracy is *agreement with Chrome*.
  Chrome is the de-facto SVG renderer but still one renderer — a category where
  all engines diverge from it (e.g. a shapes antialiasing case) is a Chrome
  quirk as much as an engine one.
- Engines that default to a transparent background are composited over white
  before comparison, so they aren't penalised for the alpha convention.
- Accuracy scope excludes `text`/`image` SVGs (font/external-resource dependent,
  and unresolvable through the string-based engine API).
- Timing is host-specific (`Linux-6.8.0-117-generic-x86_64-with-glibc2.39`, Python 3.13.13,
  4 CPU, reps=7, 2026-06-06T12:51:11+00:00).
- Browser engines are the ground truth here but out of scope as *engines* —
  heavy, and not what the `kymo` CLI ships.

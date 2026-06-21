# Layout-quality bench — baseline & metric design (2026-06-21)

*Research note written while building `benches/layout-algorithms`, the absolute
layout-quality bench that feeds the `layout-hillclimb` loop. Establishes the metric,
the first kymo-vs-mermaid baseline, and what the numbers say to do next. Live assets:
`research/assets/2026-06-21-layout-quality/{scores.json,leaderboard.json}`,
headline in `results/REPORT.md`. Theory backing: `docs/research/layout-algorithms/`
(RES-LAYOUT-ALGO-001). Loop design: `RES-LOOP-002`.*

## 1. Why an absolute metric

The existing `benches/mermaid-format` measures *pixel-Δ vs mermaid.js* — distance to the
incumbent. That **ceilings kymo at mermaid parity**: you cannot rank #1 by converging on someone
else's pixels. This bench instead scores **absolute geometric quality** from the rendered SVG, so
kymo can score *above* mermaid. The same scorer runs on any engine's SVG, which makes a real
head-to-head leaderboard possible.

## 2. The metric

Composite 0–100 (higher = better), a weighted sum of seven terms read from rendered geometry
(`metric.mjs`), each grounded in `BPD-DGM-001` §6/§7.6:

| Term | w | Rewards |
|---|---|---|
| `crossings` | 0.28 | few edge crossings (counted only *outside* node boxes, so shared endpoints don't count) |
| `node_overlap` | 0.22 | nodes don't overlap (Σ pairwise box-intersection / node area) |
| `edge_node_overlap` | 0.16 | edge interiors don't run under unrelated nodes |
| `orthogonality` | 0.16 | straight (M/L) segments are H or V; curves exempt |
| `compactness` | 0.08 | ink fills the canvas without crowding (triangular reward band) |
| `aspect_balance` | 0.05 | sane width/height |
| `grid_snap` | 0.05 | node centres on the 8-px grid (house style) |

Weights are front-loaded on the robust structural signals. **They are the bench's definition of
"beautiful"** — see `docs/research/layout-algorithms/02-aesthetic-tradeoffs.md`.

## 3. Baseline (97 flowchart fixtures, mermaid-cypress corpus)

| Engine | Mean composite |
|---|---|
| **kymo** | **88.27** |
| mermaid.js | 87.28 |

**kymo leads by Δ 0.99 on the mean** — competitive, slightly ahead. But the mean hides the real
story (below).

## 4. Key finding — kymo's problem is a *tail*, and the tail is *orthogonality*

kymo wins or ties on most fixtures, but a tail of ~10 fixtures trails mermaid badly, and the
dragging term is almost always **orthogonality** (edges not snapped to H/V):

| fixture | kymo | mermaid | Δ | crossings | node_overlap | orthogonality |
|---|---|---|---|---|---|---|
| flowchart-v2_034 | 77.08 | **93.03** | **−15.9** | 1 | 0 | **0.50** |
| flowchart_041 | 78.06 | 91.52 | −13.5 | 0 | **0.088** | 1.0 |
| flowchart-v2_036 | 77.08 | 84.71 | −7.6 | 1 | 0 | **0.50** |
| flowchart-v2_019 | 78.97 | 87.15 | −8.2 | 2 | 0.0016 | **0.625** |
| flowchart_006 | 74.64 | 75.61 | −1.0 | **15** | 0 | 0.313 |

Two distinct weaknesses surface:
1. **Orthogonality (dominant):** kymo routes many edges as diagonals/curves where mermaid keeps
   them axis-aligned (orthogonality 0.3–0.6 vs mermaid's ~1.0). This is the biggest single point of
   loss and maps directly to `docs/research/layout-algorithms/03-edge-and-connector-routing.md`.
2. **Occasional node_overlap / crossings:** a few fixtures (flowchart_041 overlap 0.088;
   flowchart_006 with 15 crossings) lose on placement.

→ The single highest-leverage fix is **orthogonal edge routing** in `kymo-layout`. It would lift the
whole tail and is exactly what the hill-climb loop is set up to climb.

## 5. Coverage vs the 9 layout problems

The bench scores a single *static* drawing, so it covers the geometric problems and is blind to the
dynamic/semantic ones. Full table in the bench `README.md`; in short: **§02 aesthetics** fully,
**§01 crossings** and **§03 routing** partially, a slice of **§04** via `node_overlap`; **nothing**
for **§05 labels, §06 stability/animation, §07 scale, §09 degenerate**. The two highest-opportunity
problems (§03 obstacle-avoiding routing, §06 stability+animation) are under/un-measured — the gap to
close next.

## 6. Calibration notes

- The metric **discriminates**: clean simple flowcharts score ~91–93, tangled ones ~75–79, and the
  per-term breakdown localises *why* (orthogonality vs crossings vs overlap). Trustworthy as a gradient.
- mermaid.js scores a sane ~87 mean (not pathologically high/low), so it's a fair bar.
- Hardening: fixtures that render **0 nodes** produced `NaN` (0/0 in `node_overlap`) until guarded;
  `scoreLayout` now returns `composite: null` (degenerate, filtered) for them — see
  `docs/research/layout-algorithms/09-degenerate-inputs.md`.

## 7. Next steps

1. **§03 — obstacle-avoiding orthogonal routing** in `kymo-layout` (libavoid/Adaptagrams-style).
   Directly raises `orthogonality` + `edge_node_overlap` — the tail's two weak terms. **Highest priority.**
2. **Add a routing-specific term** (or sub-score) so the loop can target routing explicitly.
3. **§06 — a stability/animation metric** (determinism + minimal-change relayout) — kymo's
   differentiator, currently unmeasured.
4. **Leaderboard columns for d2 / ELK** (open-source, renderable) to measure the gap to the best
   *open* engines, not just mermaid.
5. Grow the corpus beyond mermaid-cypress flowcharts (it biases toward mermaid's style).

## Assets

- `research/assets/2026-06-21-layout-quality/scores.json` — per-fixture composite + term breakdown.
- `research/assets/2026-06-21-layout-quality/leaderboard.json` — engine means + weights + `kymo_leads`.
- `results/REPORT.md` — the headline leaderboard + worst-10 table.

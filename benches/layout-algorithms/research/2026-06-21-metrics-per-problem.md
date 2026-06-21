# A metric for each of the 9 layout problems (2026-06-21)

*Research note: maps every problem in `docs/research/layout-algorithms/` (RES-LAYOUT-ALGO-001) to a
**concrete, computable metric** — what `metric.mjs` measures today (✅) and what to add (🔲). The aim
is that each of the 9 factors gets at least one number, so the `layout-hillclimb` loop can climb the
differentiators (§03, §06), not just the aesthetics it already covers. Companion to
`2026-06-21-layout-quality-baseline.md`. All directions: higher term = better, 0..1 before weighting.*

## Master table

| # | Factor | Metric(s) | Status | Harness needed |
|---|---|---|---|---|
| 01 | Computational hardness | `crossings` | ✅ | single SVG |
| 02 | Conflicting aesthetics | `orthogonality`, `compactness`, `aspect_balance`, `grid_snap` ✅ · `symmetry`, `angular_resolution`, `edge_length_uniformity` 🔲 | partial | single SVG |
| 03 | Edge & connector routing | `edge_node_overlap` ✅ · `edge_bends`, `obstacle_clearance`, `parallel_separation` 🔲 | partial | single SVG |
| 04 | Compound & constraints | `node_overlap` ✅ · `cluster_containment`, `cluster_overlap`, `constraint_satisfaction` 🔲 | partial | single SVG (+ source) |
| 05 | Label placement | `raster_safe_recall` (in mermaid-format) · `label_overlap`, `min_font_legible` 🔲 | not in this bench | single SVG |
| 06 | Stability & dynamics | `determinism`, `mental_map_stability`, `animation_no_crossover` 🔲 | none yet | **before/after pair** |
| 07 | Scalability | `layout_ms_per_node`, `scaling_exponent` 🔲 | none yet | **perf harness** |
| 08 | No ground truth | `proxy_correlation` (Spearman ρ vs human ranking) 🔲 | none yet | **human-labelled sample** |
| 09 | Degenerate inputs | `degenerate_pass_rate` 🔲 (the 0-node guard exists) | partial | **degenerate corpus** |

Three problems need a *different shape of harness* than the current "score one SVG": §06 needs two
layouts (before/after an edit), §07 needs timing, §08 needs human labels, §09 needs a stress corpus.

---

## 01 — Computational hardness → `crossings` ✅

You can't measure "hardness"; you measure the *outcome quality* the hard objective targets.

| Metric | Compute | Dir |
|---|---|---|
| `crossings` ✅ | count edge-pairs that intersect at a point **outside** all node boxes; score `1/(1+crossings/E)` | ↑ |

---

## 02 — Conflicting aesthetics → the weighted bundle ✅ + 3 proposed

| Metric | Compute | Status |
|---|---|---|
| `orthogonality` ✅ | fraction of straight (M/L) segments with `|Δx|≤ε ∨ |Δy|≤ε` | ✅ |
| `compactness` ✅ | node ink / canvas area, triangular reward around a target band | ✅ |
| `aspect_balance` ✅ | `W/H` inside a sane band | ✅ |
| `grid_snap` ✅ | fraction of node centres on the 8-px grid | ✅ |
| `symmetry` 🔲 | mirror nodes about the centroid (H and V axes); fraction with a partner within ε | 🔲 |
| `angular_resolution` 🔲 | per node, min angle between incident edges ÷ ideal `2π/deg`; mean over nodes | 🔲 |
| `edge_length_uniformity` 🔲 | `1/(1+cv)` where cv = stdev/mean of edge lengths | 🔲 |

---

## 03 — Edge & connector routing → `edge_node_overlap` ✅ + the routing terms 🔲

The baseline shows this is kymo's **biggest loss** (orthogonality tail). It deserves its own terms.

| Metric | Compute | Status |
|---|---|---|
| `edge_node_overlap` ✅ | fraction of edge *interior* sample points inside any node box | ✅ |
| `edge_bends` 🔲 | mean bends per edge beyond the minimum; score `1/(1+excess)` (a 1-elbow orthogonal edge has 1 bend) | 🔲 |
| `obstacle_clearance` 🔲 | min distance from each edge to the nearest non-incident node box, normalised by node size | 🔲 |
| `parallel_separation` 🔲 | parallel edges sharing a corridor are separated by ≥ a gap (no exact overlap) | 🔲 |

> These four together = "does the router behave like libavoid/FigJam?" (see RES-LAYOUT-ALGO-004/§03).

---

## 04 — Compound & constraints → `node_overlap` ✅ + cluster/constraint terms 🔲

Needs the *source* (which nodes are in which cluster / what constraints) alongside the SVG.

| Metric | Compute | Status |
|---|---|---|
| `node_overlap` ✅ | Σ pairwise node-box intersection / total node area | ✅ |
| `cluster_containment` 🔲 | fraction of each cluster's children fully inside the cluster bbox | 🔲 |
| `cluster_overlap` 🔲 | pairwise cluster-bbox intersection area / total cluster area (↓) | 🔲 |
| `constraint_satisfaction` 🔲 | fraction of declared constraints (align / order / fixed-pos) actually honoured | 🔲 |

---

## 05 — Label placement → reuse recall + 2 proposed 🔲

| Metric | Compute | Status |
|---|---|---|
| `raster_safe_recall` | fraction of label tokens surviving in `<text>` (already in `benches/mermaid-format`) | ✅ elsewhere |
| `label_overlap` 🔲 | pairwise overlap area of all label boxes (node + edge) and label-vs-node / total label area (↓) | 🔲 |
| `min_font_legible` 🔲 | fraction of `<text>` with rendered size ≥ a legibility threshold | 🔲 |

---

## 06 — Stability & dynamics → needs a before/after pair 🔲 (kymo's differentiator)

Cannot be computed from one SVG — requires laying out **twice**.

| Metric | Compute | Status |
|---|---|---|
| `determinism` 🔲 | SVG-hash equality across two runs of the *same* input (1/0) | 🔲 |
| `mental_map_stability` 🔲 | after a localised source edit, `1 − mean(node displacement)/diagonal` between the two layouts | 🔲 |
| `animation_no_crossover` 🔲 | during a linear morph A→B, no two node paths cross (fraction of node-pairs that don't swap order) | 🔲 |

> This is the highest-value gap: few competitors measure it and kymo already *produces* animated
> output. A small `stability.mjs` (render src, render src+edit, diff) would open it.

---

## 07 — Scalability → a perf harness 🔲

| Metric | Compute | Status |
|---|---|---|
| `layout_ms_per_node` 🔲 | wall-clock layout time ÷ node count, over a size-graded corpus | 🔲 |
| `scaling_exponent` 🔲 | fitted exponent of time vs n (target ≈ n·log n) | 🔲 |

Low priority for kymo (authored diagrams, tens of nodes), but cheap to add as a guard.

---

## 08 — No ground truth → validate the proxy itself 🔲

The "metric" here measures whether the *other* metrics are trustworthy.

| Metric | Compute | Status |
|---|---|---|
| `proxy_correlation` 🔲 | Spearman ρ between the composite and a **human ranking** on a labelled sample of fixtures | 🔲 |

If ρ is low, recalibrate `WEIGHTS` (see the baseline note's calibration section) — don't let the loop
climb a proxy that doesn't track human judgement.

---

## 09 — Degenerate inputs → a pass-rate over a stress corpus 🔲

| Metric | Compute | Status |
|---|---|---|
| `degenerate_pass_rate` 🔲 | fraction of a degenerate corpus (self-loops, multi-edges, high-degree hubs, disconnected, empty, huge labels) that renders to a **finite, non-degenerate** score | 🔲 |

The `scoreLayout` 0-node guard is the first brick; a curated degenerate corpus is the rest.

---

## How this lands in `metric.mjs`

- The 🔲 *single-SVG* terms (§02 symmetry/angular/length, §03 routing, §04 cluster, §05 label) slot
  straight into the existing `scoreLayout({nodes, polylines, straights, dims})` shape — same inputs,
  new term functions + `WEIGHTS` entries. **Do §03 first** (it's the baseline's weak spot).
- §06/§07/§08/§09 need *new harnesses* (pair / perf / human / stress corpus); keep them as sibling
  scripts (`stability.mjs`, `perf.mjs`, …) reporting their own numbers, surfaced in `results/`.
- Adding a term changes the composite scale → **re-run the full baseline and re-calibrate weights**
  before the loop trusts the new number.

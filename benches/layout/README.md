# Layout-quality bench

Scores a flowchart corpus on an **absolute layout-quality metric** — and ranks kymo against
mermaid.js on the *same* yardstick. This is the reward signal the `layout-hillclimb` loop climbs to
push kymo toward best-in-market layout (higher composite = better).

Unlike `benches/mermaid-format` (which measures *how close kymo is to mermaid.js* — a ceiling at
parity), this bench measures **absolute quality** from the rendered geometry, so kymo can rank
*above* the incumbent.

## Metric (`metric.mjs`)

Composite 0–100 (higher = better), a weighted sum of terms derived from
`docs/diagrams/best-practices.md` (BPD-DGM-001). All terms read only from the rendered SVG, so the
same score applies to any engine.

| Term | What it rewards | Doc |
|---|---|---|
| `crossings` | few edge crossings (counted at points outside any node box) | §6.1 |
| `node_overlap` | nodes don't overlap | §6.7.6 |
| `edge_node_overlap` | edges don't run under unrelated nodes | §7.4 |
| `orthogonality` | straight segments are horizontal or vertical (curves exempt) | §7.6 |
| `compactness` | ink fills the canvas without crowding | §6.1 |
| `aspect_balance` | sane width/height | §6.6.4 |
| `grid_snap` | node centres on the 8-px grid (house style) | §6.6.2 |

Weights live in the `WEIGHTS` block of `metric.mjs` — **the only thing to tune during calibration.**
They are front-loaded on the robust structural signals (crossings/overlap/orthogonality).

## Layout

```
benches/layout/
  metric.mjs          # the absolute scorer (pure)
  geometry.mjs        # SVG geometry extractors (mirrors mermaid-format/layout-accuracy.mjs)
  layout-quality.mjs  # main: render corpus → score kymo + mermaid.js → leaderboard
  results/REPORT.md   # headline leaderboard + kymo's worst fixtures
  research/assets/<date>-layout-quality/{scores.json,leaderboard.json}
```

## Run

```bash
# preconditions: a kymo-mermaid wasm build + bench deps + Chrome
cd packages/rust/kymo-mermaid && \
  wasm-pack build --target web --out-dir pkg --out-name kymo_mermaid -- --no-default-features --features wasm,math
cd ../../../benches/layout && npm ci

node layout-quality.mjs --all          # whole flowchart corpus
node layout-quality.mjs --n 12         # first 12 (quick calibration pass)
node layout-quality.mjs flowchart_005  # specific fixtures
```

Corpus: the flowchart fixtures under `../mermaid-format/datasets/mermaid-cypress/flowchart/`.
mermaid.js reference is rendered via `mmdc`; kymo via the `kymo-mermaid` wasm (flowcharts route
through `packages/rust/kymo-layout`). Chrome path is the macOS default; override with `$CHROME`.

Output: `research/assets/<date>-layout-quality/{scores.json,leaderboard.json}` and `results/REPORT.md`.
`leaderboard.json.kymo_leads` is the headline — `true` once kymo's mean composite clears mermaid.js.

> **d2 column** is a TODO: the metric already scores any SVG, but we don't yet render the corpus
> through d2 (it needs the diagrams in d2 syntax). Add it as a third leaderboard engine later.

## Used by

`.claude/workflows/layout-hillclimb.js` — the hill-climb loop. It reads this bench's `scores.json`
as the gradient, proposes one `kymo-layout` fix per round in a worktree, and keeps it only under the
**hybrid gate** (composite ↑ **and** pixel-Δ / golden `test_layout.py` / `cargo test` don't regress).

# Layout-quality leaderboard — 2026-06-21 · dataset `layout-suite`

Absolute composite score (0–100, higher = better) over **12** fixtures.
Metric: `metric.mjs` (BPD-DGM-001 §6/§7.6). The layout-hillclimb loop drives kymo's mean upward.

| Engine | Mean composite |
|---|---|
| **kymo** | **86.93** |
| mermaid.js | 87.9 |

**kymo leads: ❌ not yet** (Δ -0.97)

## kymo's 10 worst fixtures (hill-climb targets)

| fixture | kymo | mermaid | crossings | node_overlap | orthogonality |
|---|---|---|---|---|---|
| 12-clusters | 70.89 | 92.32 | 0 | 0.0665 | 1 |
| 05-crossing | 85.2 | 85.27 | 0 | 0 | 0.6 |
| 09-hub | 86.86 | 87.48 | 0 | 0 | 0.5 |
| 10-wide | 87.13 | 87.24 | 0 | 0 | 0.6 |
| 11-deep | 87.21 | 87.22 | 0 | 0 | 1 |
| 04-diamond | 87.46 | 87.47 | 0 | 0 | 0.6 |
| 06-cycle | 88.71 | 84.04 | 0 | 0 | 1 |
| 08-multi-edge | 89.1 | 83.62 | 0 | 0 | 1 |
| 01-chain | 89.62 | 89.36 | 0 | 0 | 1 |
| 07-self-loop | 90.24 | 88.53 | 0 | 0 | 1 |

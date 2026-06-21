# Layout-engine lab — 2026-06-21

Absolute layout-quality composite (0–100, higher = better) over **12** neutral graphs,
one column per engine. Engines lay out the *same* graphs; positions scored by `metric.mjs`.

| rank | engine | mean composite |
|---|---|---|
| 1 | graphviz | 81.18 |
| 2 | elk | 79.5 |
| 3 | kymo-dagre | 76.47 |
| 4 | dagre.js | 74.65 |

## Per-graph

| graph | kymo-dagre | dagre.js | elk | graphviz |
|---|---|---|---|---|
| branch | 80.22 | 79.95 | 77.86 | 84.6 |
| chain | 77.07 | 76.42 | 72.43 | 87.03 |
| crossing | 69.15 | 66.31 | 77.47 | 82.04 |
| cycle | 77.43 | 68.96 | 79.66 | 88 |
| dag | 75.64 | 73.94 | 79.19 | 75.11 |
| deep | 76.56 | 75.66 | 70.6 | 85.67 |
| diamond | 77.89 | 76.96 | 81.11 | 79.58 |
| fan-in | 79.26 | 80 | 82.62 | 85.04 |
| grid-mesh | 77.37 | 77.93 | 83.89 | 76.73 |
| hub | 74.39 | 70.51 | 83.38 | 71.92 |
| tree | 75.4 | 75.92 | 82.3 | 82.15 |
| wide | 77.2 | 73.26 | 83.49 | 76.29 |

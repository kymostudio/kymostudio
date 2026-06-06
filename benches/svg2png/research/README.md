# svg2png — research

Written analyses of the svg2png rasterizer benchmark. Each benchmarking round —
a run on a given host with given engine versions — gets **one article, written by
hand**, so the numbers are actually interpreted rather than dumped. These are not
auto-generated; the live machine output is the scorecard at
[`../results/REPORT.md`](../results/REPORT.md).

| Date | Article | Gist |
|---|---|---|
| 2026-06-06 | [A two-reference rasterizer benchmark](2026-06-06-two-reference-rasterizer-benchmark.md) | resvg wins both fidelity (vs kymo) and accuracy (vs headless Chrome); the lone shapes outlier turns out to be an SVG 2 `ic`-unit feature only Chrome implements. |

## Adding a new round

After a fresh run (`cd benches && uv run python svg2png/run.py`), write a new
`YYYY-MM-DD-<slug>.md` here analysing *that* run — what changed vs the previous
article (engine versions, host, any new divergences), not just the table. Then add
a row above. Methodology and reproduction live in the bench
[`../README.md`](../README.md); the standing study is the dated articles
themselves.

# svg2pdf — research

Written analyses of the svg2pdf converter benchmark. Each benchmarking round — a
run on a given host with given engine versions — gets **one article, written by
hand**, so the numbers are actually interpreted rather than dumped. These are not
auto-generated; the live machine output is the scorecard at
[`../results/REPORT.md`](../results/REPORT.md).

| Date | Article | Gist |
|---|---|---|
| 2026-06-07 | [Benchmarking SVG→PDF against the FOSS field](2026-06-07-svg-to-pdf-field-benchmark.md) | kymo's `svg2pdf` core + librsvg are the only engines that faithfully convert kymo's real SVGs; the pure-Python field (cairosvg/svglib/fpdf2) renders empty or fails. The engines also split 96-dpi vs 72-dpi on page size. |

## Adding a new round

After a fresh run (`cd benches && uv run python svg2pdf/run.py`), write a new
`YYYY-MM-DD-<slug>.md` here analysing *that* run — what changed vs the previous
article (engine versions, host, any new divergences), not just the table. Then add
a row above. Methodology and reproduction live in the bench
[`../README.md`](../README.md); the standing study is the dated articles
themselves.

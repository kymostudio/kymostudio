# editor — research

Written analyses of the editor first-load benchmark. Each benchmarking round —
a run against a given deploy, host and network — gets **one article, written by
hand**, so the numbers are actually interpreted rather than dumped. These are
not auto-generated; the live machine output is the scorecard at
[`../results/REPORT.md`](../results/REPORT.md).

| Date | Article | Gist |
|---|---|---|
| 2026-06-12 | [What a share link costs: anatomy of the editor's first load](2026-06-12-share-link-first-load.md) | The round behind PR #279 + #282: stripped foreignObject deleted every mermaid label; an always-loaded 2.5 MB wasm chunk and a ~1.9 s-late kroki POST put the diagram at ~4.3 s — fixed to ~2.4 s, with kroki's own server-side render now the dominant (and least reliable) remaining term. |

## Adding a new round

After an editor deploy that touches the loading path, re-run the bench
(`cd benches && uv run python editor/run.py`) and write a new
`YYYY-MM-DD-<slug>.md` here analysing *that* run — what changed vs the previous
article (deploy, bundle layout, kroki behaviour, any new divergences), not just
the table. Then add a row above.

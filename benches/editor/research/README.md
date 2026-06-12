# editor — research

Written analyses of the editor first-load benchmark. Each benchmarking round —
a run against a given deploy, host and network — gets **one article, written by
hand**, so the numbers are actually interpreted rather than dumped. These are
not auto-generated; the live machine output is the scorecard at
[`../results/REPORT.md`](../results/REPORT.md).

| Date | Article | Gist |
|---|---|---|
| 2026-06-12 (4) | [Round 4: mermaid moves in-browser — and the waterfall the bench caught](2026-06-12-mermaid-client-side.md) | mermaid renders locally behind a 900 ms warm-up race (cache hit = 0 extra bytes; typing = 0 render requests). The bench caught `import("mermaid")` becoming a ~25-chunk waterfall (5–14 s on 4G, invisible on localhost) — fixed by pre-bundling to one ~760 KB chunk; fresh-link 🔴→🟡 3.2 s, new `mermaid-fresh` nonce-per-load scenario. |
| 2026-06-12 (3) | [Round 3: the editor stops shipping a rasterizer it never calls](2026-06-12-lean-editor-wasm.md) | svgToPng/svgToPdf (resvg + svg2pdf = ~85% of the wasm) move behind the `pdf` cargo feature; editor builds plain `wasm`: 6.1 MB → 0.9 MB raw, 1.4 MB → 210 KB brotli. **Both scenarios all-🟢 on every graded metric** — kymo at 1,615 ms / 502 KB total. |
| 2026-06-12 (2) | [Round 2: an edge cache for kroki and a wasm that travels alone](2026-06-12-cache-proxy-and-wasm-diet.md) | The round behind PR #291/#294: SVGs cached at the edge by content hash (mermaid share links go all-🟢, 1,232 ms, zero kroki-outage failures) and the wasm shipped as its own streaming asset (kymo sheds both 🔴s; engine JS 8.4 MB → 363 KB). Negative result: wasm-opt -Oz shrinks raw 21 % but worsens brotli wire +70 KB. |
| 2026-06-12 | [What a share link costs: anatomy of the editor's first load](2026-06-12-share-link-first-load.md) | The round behind PR #279 + #282: stripped foreignObject deleted every mermaid label; an always-loaded 2.5 MB wasm chunk and a ~1.9 s-late kroki POST put the diagram at ~4.3 s — fixed to ~2.4 s, with kroki's own server-side render now the dominant (and least reliable) remaining term. |

## Adding a new round

After an editor deploy that touches the loading path, re-run the bench
(`cd benches && uv run python editor/run.py`) and write a new
`YYYY-MM-DD-<slug>.md` here analysing *that* run — what changed vs the previous
article (deploy, bundle layout, kroki behaviour, any new divergences), not just
the table. Then add a row above, and rename the run's auto-archived snapshot in
[`../reports/`](../reports/README.md) to its `rN-<slug>` form so the article's
numbers stay machine-readable forever.

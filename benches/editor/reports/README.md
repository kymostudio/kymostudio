# editor — reports archive

Every benchmarking round's full snapshot (`REPORT.md` + `perf.json` +
`quality.json`), preserved verbatim. `../results/` always holds only the
**latest** run — it gets overwritten by `run.py` — so this folder is the
history: the numbers each research article was written against, kept
machine-readable instead of living only in git archaeology.

**Day rollup: [2026-06-12-SUMMARY.md](2026-06-12-SUMMARY.md)** — the four
rounds, what each shipped, the negative results, and the architecture after.

`run.py` also archives every fresh run here automatically, named by the run's
UTC timestamp. Rename a run's folder to a `rN-<slug>` form (and add it below)
when it becomes a *round* — i.e. when it gets a research article.

| Round | Snapshot | DIAGRAM_VISIBLE_MS medians | Article |
|---|---|---|---|
| 1 — baseline (morning run, kroki outage live) | [`2026-06-12-r1-baseline/`](2026-06-12-r1-baseline/REPORT.md) | mermaid 3,408 🟡 (3/5 reps failed) · kymo 4,465 🔴 | [What a share link costs](../research/2026-06-12-share-link-first-load.md) |
| 2 — edge cache proxy + wasm as own asset | [`2026-06-12-r2-cache-proxy-wasm-split/`](2026-06-12-r2-cache-proxy-wasm-split/REPORT.md) | mermaid 1,232 🟢 · kymo 3,517 🟡 | [Round 2: an edge cache for kroki…](../research/2026-06-12-cache-proxy-and-wasm-diet.md) |
| 3 — lean wasm (no svgToPng/svgToPdf) | [`2026-06-12-r3-lean-wasm/`](2026-06-12-r3-lean-wasm/REPORT.md) | mermaid 1,049 🟢 · kymo 1,615 🟢 — **all green** | [Round 3: the editor stops shipping a rasterizer…](../research/2026-06-12-lean-editor-wasm.md) |
| 4 — mermaid in-browser (+ `mermaid-fresh` scenario) | [`2026-06-12-r4-mermaid-local/`](2026-06-12-r4-mermaid-local/REPORT.md) | share 1,492 🟢 · fresh 3,239 🟡 · kymo 3,438 🟡 (degraded network — see article) | [Round 4: mermaid moves in-browser…](../research/2026-06-12-mermaid-client-side.md) |

Cross-round caveat (same as everywhere in this bench): these are live-network
snapshots — compare rounds *through* their TTFB/FCP noise indicators, not as
raw absolutes. Round 4's run was visibly slower-network than round 3's.

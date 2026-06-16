# Mermaid render accuracy — kymo vs mermaid.js 11

**Canonical bench: `accuracy-mermaidjs.mjs`** (ground truth = mermaid.js 11 in
headless Chrome). Latest full-corpus run (`results/accuracy-mermaidjs.json`,
2026-06-14), raster-safe label recall:

| grammar | n | recall | perfect |
|---|---|---|---|
| **flowchart** | 799 | **100%** | **100%** |
| **sequence** | 410 | **100%** | **100%** |
| state | 322 | 88.9% | 78% |

Flowchart and sequence keep **100%** of mermaid.js's visible labels in their
raster-safe `<text>` (merman drops them in `<foreignObject>`). 6 extreme/legacy
fixtures are marked in `datasets/known-divergent.json` and excluded. State is
lower because its renderer does not draw notes yet.

See `research/2026-06-13-to-15-flowchart-bench-research.md` (part "Engine accuracy
vs mermaid.js 11") for method and the per-fix breakdown.

---

*The legacy kroki/merman-based scripts (`accuracy.py`, `render.mjs`,
`coverage.mjs`) and their `recall.json`/`COVERAGE.md` snapshots remain for
history but are superseded: merman is not a fair reference (no KaTeX, render
quirks) — see the research note.*

# datasets/ — mermaid corpora

Each subfolder is a **dataset** with its own card (`README.md`). All sources are
mermaid `.mmd`, MIT-compatible (they derive from mermaid.js).

| Dataset | Sources | Role |
|---|---|---|
| [`mermaid-kymo/`](mermaid-kymo/) | 11 | scored — labelled ground truth |
| [`merman/`](merman/) | 3078 | coverage — raw sources |
| [`mermaid-cypress/`](mermaid-cypress/) | 803 | coverage — raw sources |
| [`mermaid-to-svg/`](mermaid-to-svg/) | 85 | coverage — raw sources |

`mermaid-kymo` is the small labelled set the scored accuracy bench reads; the
other three are raw, per-grammar coverage corpora gathered from public test
suites (deduped by content). Rebuild the coverage corpora with `build-corpus.py`
(not committed — needs the three upstream repos checked out).

## known-divergent.json — legacy/ambiguous fixtures

A small set of fixtures use legacy or genuinely-ambiguous Mermaid syntax that
mermaid.js parses via its full grammar but kymo's lenient parser intentionally
throws on (e.g. an inline edge label that literally contains the link delimiter
`==`, or the legacy asymmetric `>...]` shape chained with arrows). These are
listed in `known-divergent.json` with a per-file reason and **excluded from the
accuracy headline** by `accuracy-mermaidjs.mjs` — they test kymo's non-support
of deprecated/ambiguous forms, not a renderer bug. Excluding them, flowchart
label recall vs mermaid.js is 100%.

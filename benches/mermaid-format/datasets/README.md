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

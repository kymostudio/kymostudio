# datasets/ — mermaid source corpus, split by diagram type

3966 mermaid diagram sources gathered from three public test suites, deduped
by content and filed under `<grammar>/` by their first keyword. Each file is
named `<source>-<original-name>.mmd`. Raw inputs for rendering/conversion
coverage; the scored accuracy bench uses the small labelled `corpus.json`.

By source: merman 3078, cypress 803, warp 85.

## Sources & licenses

All three derive ultimately from **mermaid.js** (MIT) and are MIT-compatible:

| Prefix | Origin | License |
|---|---|---|
| `merman-` | [Latias94/merman](https://github.com/Latias94/merman) `fixtures/` — traced to mermaid docs/tests/cypress | MIT OR Apache-2.0 |
| `warp-` | [warpdotdev/mermaid-to-svg](https://github.com/warpdotdev/mermaid-to-svg) `samples/` | MIT |
| `cypress-` | [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) `cypress/integration/rendering/` (inline `imgSnapshotTest`/`renderGraph` sources) | MIT |

## By diagram type

| folder | sources |
|---|---|
| `flowchart/` | 1027 |
| `sequence/` | 436 |
| `state/` | 347 |
| `class/` | 282 |
| `gitgraph/` | 249 |
| `architecture/` | 199 |
| `gantt/` | 188 |
| `block/` | 159 |
| `er/` | 138 |
| `mindmap/` | 127 |
| `kanban/` | 96 |
| `timeline/` | 90 |
| `pie/` | 86 |
| `xychart/` | 81 |
| `requirement/` | 80 |
| `quadrant/` | 69 |
| `c4/` | 68 |
| `treemap/` | 60 |
| `radar/` | 55 |
| `packet/` | 40 |
| `sankey/` | 27 |
| `journey/` | 26 |
| `zenuml/` | 18 |
| `info/` | 18 |

Regenerate with `build-corpus.py` (not committed — needs the three repos
checked out). Sources with JS interpolation (`${...}`) in the cypress specs are
skipped; filename collisions after truncation drop a handful of near-duplicates.

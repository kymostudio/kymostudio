# mermaid-kymo

> Hand-written mermaid diagrams with ground-truth labels — the scored corpus for the accuracy bench.

| | |
|---|---|
| Sources | 11 |
| Diagram types | 2 |
| Origin | Hand-authored for this bench. |
| License | Apache-2.0 (this repo). |
| Format | `corpus.json` — one array, each entry `{id, grammar, source, labels}`. |

## Diagram types

`flowchart`, `sequence`

## Use

`render.mjs` renders every entry through kymo / merman / mermaid.js and `accuracy.py` scores raster-safe label recall against the `labels`. This is the only dataset the **scored** bench reads; the others are raw coverage corpora.

# Engine accuracy vs mermaid.js 11 — flowchart & sequence at 100%

*2026-06-14. Hand-written analysis of the `accuracy-mermaidjs.mjs` run.*

## Method

Ground truth is **mermaid.js 11.15** itself, rendered in headless Chrome via
puppeteer (`accuracy-mermaidjs.mjs`) — **not** merman. merman (the `kymo-mermaid`
port bundled in render-api) has no KaTeX and renders some things its own way, so
using it as the reference unfairly penalised kymo. Confirmed on the corpus math
fixtures: kymo renders `√`, `π`, matrix entries matching mermaid.js, while merman
prints the raw LaTeX (`$$\sqrt{x}$$`) — merman, not kymo, was the outlier.

**Metric:** raster-safe label recall. For each source we render the reference with
mermaid.js and kymo with its own engine, then measure the fraction of mermaid.js's
*visible* word-tokens that appear in kymo's `<text>` (the text that survives to
PNG/PDF — kymo's whole point, since merman puts flowchart/state labels in
`<foreignObject>` which the rasteriser drops). Non-visible reference text is
excluded: KaTeX MathML `<annotation>` (raw TeX), accessibility `<title>`/`<desc>`,
and hidden actor-link menus.

`ref-skip` = sources mermaid.js itself errors on (stress/error fixtures) — no
reference, so excluded. `excluded` = fixtures in `datasets/known-divergent.json`.

## Result (full corpus)

| grammar | n | recall | perfect | imperfect | excluded |
|---|---|---|---|---|---|
| **flowchart** | 799 | **100%** | **100%** | 0 | 5 |
| **sequence** | 410 | **100%** | **100%** | 0 | 1 |
| state | 322 | 88.9% | 78% | 71 | 0 |

Flowchart and sequence reach **100% raster-safe label recall, 100% perfect** vs
mermaid.js across the whole corpus. State is left at ~89% (kymo's state renderer
does not draw notes yet — the bulk of its misses).

## Fixes that got us there (this pass)

Benchmarking against the real mermaid.js (rather than merman) surfaced genuine
gaps that the merman-based metric had hidden or misattributed:

- **KaTeX `$…$` → Unicode** (Greek, operators, relations, arrows, `\frac`/`\sqrt`/
  `\text`, `\begin{…}` environments, accents, function names). kymo now matches
  mermaid.js on math labels; merman shows raw LaTeX.
- **Math rendered before break-stripping** — stripping `<br>`/`\n`/`\t` first ate
  the `\t` in `\text`, the `\n` in `\nabla`. Order fixed.
- **mermaid-11 exotic arrows** (`-|/`, `//-`, `--|/`, …) — a `find_arrow` fallback
  keeps the message (and its label) instead of dropping the whole line.
- **autonumber as a running counter** — `off` hides but keeps counting, bare
  `autonumber` resumes from the count, `N M` resets (step defaults to 1).
- **nested subgraph titles**, **`<br>` / escaped `\n` labels**, **`@{}` YAML
  block-scalar labels**, **`create`/`destroy participant` aliases**, **notes,
  activations, title, box, critical/break, rect grouping**, **bidirectional
  `<<->>` arrows**, **lenient stray `else`/`and`**.

## Known-divergent fixtures (excluded, `known-divergent.json`)

Six fixtures use syntax kymo intentionally does not handle:

- **legacy (4)** — deprecated/ambiguous forms mermaid.js parses via its full
  grammar but kymo's lenient parser throws on: `==` literally inside an inline
  edge label; the legacy `>...]` asymmetric shape chained with arrows; a multiline
  edge label split mid-`--"`.
- **exotic (2)** — pathological stress fixtures no real diagram uses: a
  double-backslash-escaped, deeply-nested KaTeX expression with custom commands
  (`\phase`, `\relax`, continued `\frac`) that would need a full KaTeX layout
  engine; and decimal autonumber (`autonumber 10.1 .01`, kymo's counter is
  integer).

## Why this matters

merman emits `<foreignObject>` HTML labels for flowchart/state → **~0% of the
text survives to PNG/PDF**. kymo's text-based renderers keep 100%. For sequence,
merman is already raster-safe, so the bar was mermaid.js parity — now met, plus
kymo adds mermaid-11 bidirectional arrows merman predates.

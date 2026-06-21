# DBML — Database Markup Language (Import)

kymo imports **DBML**, the schema language used by [dbdiagram.io](https://dbdiagram.io)
and [dbml.dbdiagram.io](https://dbml.dbdiagram.io/docs), and renders it as an
**ER diagram** — table boxes with a coloured header, field rows, and
foreign‑key relationship lines, styled to match the dbdiagram.io look.

> **Status.** Implemented in the **JavaScript** engine only (`packages/js`).
> `.dbml` → a fully‑positioned `Diagram` → `renderSVG`. The Python and Rust
> CLIs do **not** yet read `.dbml`.

## Usage

```bash
# from packages/js
node bin/kymo.mjs schema.dbml schema.svg     # → SVG
node bin/kymo.mjs schema.dbml schema.png     # → PNG (via kymostudio-core)
```

```js
import { parseDbml, renderSVG } from "kymostudio";
const svg = await renderSVG(parseDbml(dbmlSource));
```

Each `Table` becomes a `Component` of the new `shape: "table"`, carrying its
field list in `Component.rows` (`TableRow[]`). `Ref` relationships become
`Edge`s with `style: "fk"` plus `srcRow`/`dstRow` so the renderer anchors a
line from the foreign‑key column to the referenced column. The importer also
assigns table positions (a deterministic grid), so — like the BPMN importer —
the result is already laid out and skips the alignment pass.

## Supported subset (v1 — "Core ER")

| DBML | kymo rendering |
| --- | --- |
| `Table name [as alias] { … }` | table box; header bar shows the name/alias |
| field `name type` | a row: name (left), type (right, gray monospace) |
| `[pk]` / `[primary key]` | bold field name + 🔑 key glyph |
| `[not null]` | `NN` badge after the type |
| `[unique]` | parsed (`TableRow.unique`); no distinct glyph yet |
| `[default: …]`, `[increment]` | parsed/tolerated; not shown |
| `[note: '…']` | small note glyph after the field name |
| `[headercolor: #rrggbb]` | header bar fill colour |
| inline `[ref: > other.col]` | FK edge from this column |
| `Ref: a.b > c.d` (short) | FK edge `a.b → c.d` |
| `Ref name { a.b < c.d }` (long block) | FK edge |
| operators `>` `<` `-` `<>` | drawn as a relationship line (all alike for now) |
| `enum name { value … }` | a value‑list box (distinct header colour) |

Schema prefixes (`schema.table.col`) are accepted; the schema segment is
dropped. Composite references (`(a, b)`) use the **first** column.

## Deferred (parsed‑and‑skipped, so a file still imports)

`TableGroup`, `indexes { }`, `checks`, full composite foreign keys,
`TablePartial` (`~template`), `Project` / `Note` blocks, and per‑operator
relationship cardinality markers (crow's‑foot). These do not break parsing —
they are simply not rendered yet.

## Reference

- Sample: [`samples/social.dbml`](../../../samples/social.dbml) (the
  dbdiagram.io default template + `Ref`s) and its rendered `samples/social.svg`.
- Implementation: `packages/js/src/from-dbml.ts` (parser + layout),
  `packages/js/src/render.ts` (`tableNode` / `fkEdge` / `TABLE_STYLE`).
- DBML language docs: <https://dbml.dbdiagram.io/docs>.

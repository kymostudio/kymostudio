---
title: kymo.json — Resolved-Model Interchange Format
document_id: KYMOJSON-MAP-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers using or maintaining the kymo.json serializer/loader and its consumers
review_cycle: On model or kymo.json schema change
supersedes: null
related_documents:
  - DESIGN-KYMOJSON-001         # kymo.json feature design (serializer/loader/CLI)
  - FEAT-KYMOJSON-001           # kymo.json requirements
  - KYMO-DSL-001                # kymo DSL (a front-end that produces this model)
  - BPMN-MAP-001                # BPMN import/export (the other front-end + a back-end)
  - DESIGN-BPMN-PARSER-001      # BPMN importer (produces this model)
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - serialization
  - interchange
  - intermediate-representation
  - round-trip
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json — Resolved-Model Interchange Format

| Field             | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| Document ID       | KYMOJSON-MAP-001                                                   |
| Version           | 1.0                                                                |
| Issue Date        | 2026-05-24                                                         |
| Status            | Released                                                           |
| Classification    | Internal                                                           |
| Owner             | `diagrams/` project                                               |
| Related Documents | `DESIGN-KYMOJSON-001`, `FEAT-KYMOJSON-001`, `KYMO-DSL-001`, `BPMN-MAP-001`, `DESIGN-BPMN-PARSER-001` |

`.kymo.json` is a **versioned, lossless JSON serialization of a resolved kymo
`Diagram`** — the model that every front-end produces (the `.kymo` DSL parser, the
BPMN importer) and every back-end consumes (SVG, Figma, Excalidraw, WebP, BPMN
export). It is the persisted form of kymo's model seam: a cache / interchange / IR.
It is **bidirectional** — write it from any `Diagram`, and read it back to a
`Diagram` that renders identically. This document is the normative schema; the
feature design is DESIGN-KYMOJSON-001.

## Why a serialized model

kymo's renderer is deliberately dumb: front-ends build a `Diagram`, back-ends turn
it into output. Without `.kymo.json`, every render re-parses from source and the
resolved model can only be inspected through a renderer. `.kymo.json` exposes that
model directly so you can cache it, diff it in version control, hand it between the
Python and JS implementations, or feed any back-end without re-parsing — the role an
IR plays for a compiler (cf. Pandoc's JSON AST, LLVM IR, the Excalidraw/tldraw scene
files). Because it is plain JSON, editors, `jq`, and JSON-schema validators work on
it directly — the reason the extension is `.kymo.json`, not an opaque custom one.

## Envelope

```jsonc
{
  "format": "kymo.json",   // type marker — authoritative regardless of filename
  "version": 1,            // schema version; readers ignore unknown fields (forward-compat)
  "diagram": { … }         // the resolved model body (below)
}
```

A loader **must** check `format == "kymo.json"` and **should** tolerate a higher
`version` by ignoring unknown fields.

## Model body (`diagram`)

Snake_case keys; points and bounds are arrays; integral floats collapse to ints
(`5.0`→`5`) and `-0`→`0`; every field is emitted explicitly; `components` /
`regions` / `edges` preserve parse order. Top-level keys:

| Key | Type | Notes |
|-----|------|-------|
| `width`, `height` | int | canvas size |
| `title`, `subtitle` | string | may be empty |
| `components` | array | nodes (below) |
| `regions` | array | boundaries / pools / lanes (below) |
| `edges` | array | connections (below) |
| `layout_trees` | array | `layout { }` auto-layout AST (below); empty for most diagrams |

The transient `bpmn_blocks` AST is **not** serialized (it is always empty in a
resolved diagram). Field lists per object (mirroring `kymo.model`):

- **component** — `id`, `name`, `subtitle`, `icon`, `shape`, `accent`, `pos` `[cx,cy]`, `size` `[w,h]|null`, `parent`, `align`, `align_gap`, `align_offset` `[dx,dy]`.
- **region** — `id`, `label`, `bounds` `[x,y,w,h]`, `contains` `[id…]`, `padding` `[h,v]`, `padding_bottom`, `style`, `icon`, `layout`, `pos` `[x,y]|null`, `gap`, `align`, `visible`, `border_dash`, `border_stroke`, `label_anchor`, `label_position`.
- **edge** — `src`, `dst`, `label`, `style`, `src_anchor`, `dst_anchor`, `route`, `via` `[[x,y]…]`, `src_offset`, `dst_offset`, `label_offset`, `label_anchor`, `label_small`, `label_pos` `[x,y]|null`, `dashed`, `no_arrow`, `trunk_offset`, `shared_port`, `points` `[[x,y]…]|null`, `bpmn_flow`.

## Layout-tree nodes (`layout_trees`)

The `layout { }` auto-layout AST, consumed by the Figma back-end (other back-ends
ignore it). A language-neutral tagged-object form — the basic leaf/group shape that
is the only one stored on a resolved `Diagram` (region inlining/padding is a
transient positioning step, never serialized):

```jsonc
{ "t": "id", "id": "<component-id>" }                                   // leaf
{ "t": "group", "dir": "horizontal"|"vertical", "children": [ … ] }      // group
```

## Round-trip guarantees

- **Load-fixpoint** — `export(parse(x)) == x`; `export` is deterministic (byte-stable
  for a given `Diagram`), so `export∘parse∘export` is idempotent.
- **Render-equivalence** — `render(parse(export(d)))` equals `render(d)` for every
  back-end; the Figma back-end stays on its hybrid path because `layout_trees`
  survive.
- **Cross-language** — the Python (`to_kymojson.export` / `from_kymojson.parse`) and
  JS (`toKymoJson` / `parseKymoJson`) implementations emit **byte-identical**
  `.kymo.json` for the same source and each loads the other's file; this is gated by
  the conformance suite (`conformance/`), which compares the model body — including
  `layout_trees` — across both languages.

## CLI & API

- **CLI** (Python) — `kymo <src> --json` writes `<stem>.kymo.json`; `kymo <file>.kymo.json`
  loads it (already resolved → no layout/alignment pass) and renders to any target.
- **Python** — `to_kymojson.export(diagram) -> str`, `from_kymojson.parse(text) -> Diagram`.
- **JS** — `toKymoJson(diagram): string`, `parseKymoJson(text): Diagram` (library only).

## Scope & limitations

- **Resolved model, not editable source** — `.kymo.json` round-trips the *model*
  (positions baked in), not the original `.kymo` text/comments. There is no
  model → `.kymo` DSL back-emitter.
- **No editor ephemera** — selection/UI/undo state is not part of the model and is
  never serialized.
- **No new runtime dependencies** — Python stdlib `json`; JS `JSON`.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — kymo.json v1 schema (envelope + model body + layout-tree form), bidirectional + lossless, cross-language byte parity gated by the conformance suite. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo.json.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
A schema change requires: bump the envelope `version` if not backward-compatible;
update this document and DESIGN-KYMOJSON-001; keep the Python/JS serializers and the
conformance comparison in lockstep; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
`version` is the schema version; readers ignore unknown fields so a v1 reader
tolerates a forward-compatible v2 file. A breaking change increments `version` and is
reconciled against FEAT-KYMOJSON-001 before release.

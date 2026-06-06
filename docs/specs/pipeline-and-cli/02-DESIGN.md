---
title: Pipeline & CLI Architecture — Design
document_id: DESIGN-PIPECLI-001
version: "0.1"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js · packages/rust
audience: Engineers implementing the kymo pipeline and CLI
review_cycle: On a phase being delivered, or on architecture change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001            # Requirements (traced below)
  - TEST-PIPECLI-001            # Test documentation
  - PLAN-PIPECLI-001            # Plan
  - RES-PIPELINE-001            # Research: FFmpeg-inspired pipeline architecture
  - RES-CLI-001                 # Research: FFmpeg-inspired CLI grammar
  - KYMOJSON-MAP-001            # .kymo.json — the interchange wire format
authors:
  - Vũ Anh
language: en
keywords:
  - pipeline
  - cli
  - design
  - registry
  - filter-graph
  - architecture
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Pipeline & CLI Architecture — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-PIPECLI-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `packages/python` · `packages/js` · `packages/rust` |
| Related Documents | `FEAT-PIPECLI-001` (requirements, traced below), `TEST-PIPECLI-001`, `PLAN-PIPECLI-001` |

## 1. Scope

This document gives the architecture realising `FEAT-PIPECLI-001`: the six-stage internal
pipeline, the registries, the module layout, the CLI grammar that drives it, and the
invariants that keep it honest. It is design-level — file/function names are indicative of
intent, not a committed API. The narrative evidence is `RES-PIPELINE-001` (§3 proposed
pipeline, §5 module layout) and `RES-CLI-001` (§4 proposed CLI).

## 2. The six-stage pipeline (`FR-PC-1`)

```
 ┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐
 │ DEMUX    │ → │ DECODE   │ → │ FILTER GRAPH │ → │ ENCODE   │ → │ POST       │ → │ MUX      │
 │ (sniff)  │   │ (parse)  │   │ (transform)  │   │ (render) │   │ (bitstream)│   │ (write)  │
 └──────────┘   └──────────┘   └──────────────┘   └──────────┘   └────────────┘   └──────────┘
   *.bpmn         BPMN AST       layout/align       SVG string     animate-        foo.svg
   *.kymo         DSL AST        theme/animate      Figma JS       snapshot        foo.webp
   *.kymo.json    JSON tree      concat/overlay     Excal JSON     minify          foo.figma.js
   *.py           Python AST     subgraph/diff      BPMN XML       inline fonts
   *.drawio       drawio XML                        kymo.json
   stdin          (sniff)        ── Diagram → Diagram ──
```

**Invariant: everything flows through a single intermediate `Diagram`** (`FR-PC-1`) — the
analogue of FFmpeg's raw frame. Both ends (importers and encoders) register against a
central registry (`FR-PC-7`).

| Stage | Role | Today | Target |
|-------|------|-------|--------|
| **DEMUX** | sniff extension + magic bytes → importer name; accept `stdin`, `-f` override | suffix switch `cli.py:61–77` | `pipeline/demux.py` registry (`FR-PC-7`, `FR-PC-10`) |
| **DECODE** | importer → `Diagram` (no layout/align) | `dsl.py`, `from_bpmn.py`, `from_kymojson.py`, dynamic `.py` | `pipeline/importers/*` (`FR-PC-2`) |
| **FILTER** | `Diagram → Diagram` passes, format-agnostic | `bpmn_layout.py`, `layout.py`, `alignment.py`, `--animate` flag | `pipeline/filters/*` (`FR-PC-3`) |
| **ENCODE** | `Diagram` → container bytes/string | `to_svg/figma/excalidraw/bpmn/kymojson` | `pipeline/encoders/*` (`FR-PC-4`) |
| **POST** | tweak encoded payload, no re-decode | `to_webp.make_frame_svg` (animation snapshot) | `pipeline/post/*` (`FR-PC-5`) |
| **MUX** | write file / stdout; infer container from `-o`, `-f` overrides | `out.write_text(...)` per branch | `pipeline/mux.py` (`FR-PC-12`) |

### 2.1 Stage 1 — DEMUX (`FR-PC-7`, `FR-PC-10`)

```python
# pipeline/demux.py
IMPORTERS = {
    ".kymo":      "kymo_dsl",
    ".kymo.json": "kymo_json",
    ".bpmn":      "bpmn_2_0",
    ".drawio":    "drawio",
    ".svg":       "svg",
    ".py":        "python_module",
}
def sniff(path_or_stream) -> str: ...   # → importer name (extension + magic bytes; -f overrides)
```

Replaces the suffix switch at `cli.py:61–77` and the `unsupported source` check at
`cli.py:171–173`.

### 2.2 Stage 2 — DECODE (`FR-PC-2`, `FR-PC-6`)

Each importer is an independent module returning a `Diagram`. Importers **must not** run
layout or alignment. The implicit "pre-resolved" property of `from_bpmn`/`from_kymojson`
becomes an **explicit `diagram.resolved = True` flag** (`FR-PC-6`), so the filter stage skips
layout deterministically instead of `cli.py:193` checking `src.suffix not in (".bpmn",
".json")`.

| Importer | Existing module | `resolved`? |
|----------|-----------------|-------------|
| `kymo_dsl` | `dsl.py` | No |
| `bpmn_2_0` | `from_bpmn.py` | Yes (DI geometry) |
| `kymo_json` | `from_kymojson.py` | Yes |
| `python_module` | dynamic `import_module` (`cli.py:75–77`) | Depends (`mod.LAYOUT`) |
| `drawio` | port from `packages/js/src/drawio2svg/` | Yes |
| `svg` | new | Yes |

### 2.3 Stage 3 — FILTER GRAPH (`FR-PC-3`, `FR-PC-13`) — the stage kymo is missing most

Today the passes are scattered: `bpmn_layout.py::layout` (`bpmn { }` blocks, `cli.py:183–185`),
`layout.py::layout` (DSL DAG, `cli.py:186–187`), `alignment.py::resolve_alignments`
(`cli.py:193–194`), and `--animate` forwarded to the renderer (`cli.py:232`). Each becomes a
registered `Diagram → Diagram` filter:

```python
# pipeline/filters.py
FILTERS = {
    "layout":   layout_filter,     # algo=dagre|bpmn|external
    "align":    align_filter,
    "autosize": autosize_filter,
    "theme":    theme_filter,      # dark|light|brand
    "animate":  animate_filter,    # flow|pulse|breath
    "concat":   concat_filter,     # join diagrams (axis=h|v)
    "overlay":  overlay_filter,    # stack
    "subgraph": subgraph_filter,   # crop to a node subset
    "diff":     diff_filter,
    "rename":   rename_filter,
}
```

Filter-chain syntax (borrowed from FFmpeg, `FR-PC-13`):

```bash
kymo -i order.bpmn -vf "layout=algo=bpmn,theme=dark,animate=flow" -o order.svg
kymo -i a.bpmn -i b.kymo -filter_complex "[0][1]concat=axis=v[out]" -map "[out]" -o merged.svg
```

**Load-bearing invariant:** filters touch only the model; they know nothing about output
formats. The default chain for a *non-resolved* source is `layout → align → autosize` (the
order `cli.py:186–194` runs today); a `resolved` diagram skips straight to encode.

### 2.4 Stage 4 — ENCODE (`FR-PC-4`)

```python
ENCODERS = {
    "svg":        to_svg.render,
    "figma":      to_figma.render,
    "excalidraw": to_excalidraw.render,
    "bpmn":       to_bpmn.export,
    "kymojson":   to_kymojson.export,
    "png":        compose(to_svg.render, rust_core.svg_to_png),
    "webp":       compose(to_svg.render, rust_core.svg_to_webp),
}
```

Raster targets pipe **through SVG first** — `Diagram → SVG → raster` — mirroring FFmpeg's
wrapper-over-codec containers. No encoder reads from disk; the mux owns I/O.

### 2.5 Stage 5 — POST / BITSTREAM (`FR-PC-5`)

Tweaks the encoded payload without re-decoding: **animation snapshot**
(`to_webp.py:102 make_frame_svg` rewrites CSS into the encoded SVG to freeze a time-step —
it belongs here, not in the encoder), **SVG minify**, **inline fonts / base64 images**,
**sanitize** (strip `<script>`/comments).

### 2.6 Stage 6 — MUX (`FR-PC-12`)

Infers the container from the `-o` extension; `-f` overrides; `-o -` writes stdout. Replaces
the per-branch `out.write_text(...)` and `src.with_suffix(...)` destination logic
(`cli.py:196–241`).

## 3. CLI grammar (`FR-PC-8..16`)

A clean break to FFmpeg's verb-less model — the binary *is* the converter:

```
kymo [-i] <src|->  [-f <informat>] [-t <target>]... [-o <path|->]
                   [-vf <chain>] [--anim <preset>] [--width N] [--frames N] [--quality Q]
                   [-y|-n] [-q|-v]

# auxiliary modes — flags, not sub-commands:
kymo --probe <src|->        # inspect: format, size, node/edge counts, valid? (no render)
kymo --lint  <src|->        # rule-check (today: `kymo lint`, cli.py:159)
kymo --watch <src> -t ...   # re-render on change

# capability & help:
kymo -formats | -targets | -h [topic]
```

| FFmpeg | kymo equivalent | Requirement |
|--------|-----------------|-------------|
| Demuxer (`.mp4`) | Importer (`.bpmn`, `.kymo`, `.kymo.json`, `.drawio`, `.py`) | `FR-PC-2` |
| `-vf scale=…,crop=…` | `-vf layout=dagre,align=center,theme=dark` | `FR-PC-13` |
| `-c:v libx264` / `-f mp4` | target `-t svg` / format `-f` | `FR-PC-9,10` |
| Bitstream filter | SVG minify, animation snapshot, font inlining | `FR-PC-5` |
| Muxer | file writer (svg/webp/png/figma.js/excalidraw/bpmn) | `FR-PC-12` |
| `ffprobe` / `ffplay` | `--probe` / `--watch` (flags on one binary) | `FR-PC-14` |
| `-formats` / `-h full` | `-formats` / `-targets` / `-h [topic]` | `FR-PC-15` |

**What kymo rejects from FFmpeg** (`FR-PC-16`): positional options (kymo options are
order-insensitive); stream-specifier microsyntax (`-c:v:0` — a kymo source is one diagram);
the dual input/output meaning of `-i` (`-i` marks input only). The throughline: borrow the
shape, drop the positional-option trap.

**Behaviour fixes the grammar buys** (`FR-PC-9,11`): `-t svg -t figma` renders both from one
parse (today the first-truthy-flag wins and extras are silently ignored, `cli.py:196–232`);
`--anim` against a non-animatable target warns instead of silently dropping
(`cli.py:175,204`).

## 4. Module layout (`FR-PC-1..7`)

```
packages/python/src/kymo/
├── cli.py                 # arg parsing → pipeline driver (registry lookup, not if/elif)
├── pipeline/
│   ├── demux.py           # sniff + dispatch
│   ├── importers/         # 1 file/format: kymo_dsl, bpmn, kymo_json, drawio, svg, python_module
│   ├── model.py           # Diagram (= model.py today; + `resolved` flag)
│   ├── filters/           # 1 file/filter: layout, align, autosize, animate, theme, concat, overlay, subgraph
│   ├── encoders/          # 1 file/target: svg, figma, excalidraw, bpmn, kymojson, png, webp
│   ├── post/              # bitstream tweaks: minify_svg, inline_fonts, animate_snapshot
│   └── mux.py             # write file / stdout, content-type
└── …
```

Existing modules move into the registry **unchanged in behaviour** — `to_svg.py` →
`encoders/svg.py`, `from_bpmn.py` → `importers/bpmn.py`, etc. The migration (`PLAN-PIPECLI-001`
§3) does this move-then-rewire so golden output stays byte-identical (`NFR-PC-1`).

## 5. Dual/triple-implementation parity (`NFR-PC-3`)

`packages/rust/kymostudio-core` (`main.rs`) is today a separate `kymo` binary that accepts
**only `.svg` via `-i`** and writes PNG — it shares no architecture with the Python CLI.
Target state: all three implementations present the **same pipeline diagram and CLI surface**;
only the implementation differs. `.kymo.json` (`KYMOJSON-MAP-001`) becomes the wire format
between them — analogous to FFmpeg's raw frame on a Unix pipe. The Rust CLI may be the "fast
path" (demux + decode + encode for pre-resolved `.kymo.json`), with the filter stage optional
there (open question, `RES-PIPELINE-001` §9).

## 6. Invariants

1. **Model is the single source of truth.** Only `Diagram` flows decode → filter → encode. A
   new importer/encoder is one file; the core never moves. (`FR-PC-1`)
2. **Filters are format-agnostic.** A filter knows `Diagram`, not `.svg`/`.figma`. (`FR-PC-3`)
3. **Each stage is pure.** Explicit inputs/outputs; per-stage testable. (`NFR-PC-2`)
4. **Registry, not if/elif.** `cli.py` dispatches by name; it does not switch on format. (`FR-PC-7`)
5. **Raster lives at the tail.** PNG/WebP are always `Diagram → SVG → raster`. (`FR-PC-4`)

## 7. Prior art

FFmpeg's six-stage pipeline and verb-less CLI (`RES-PIPELINE-001`, `RES-CLI-001`); the
intermediate-representation pattern shared with Pandoc's JSON AST, LLVM IR, and
Excalidraw/tldraw scene files — front-ends decoupled from back-ends by a stable model
(`.kymo.json`, `KYMOJSON-MAP-001`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial design. Six-stage pipeline, registries, module layout, CLI grammar, parity, invariants — derived from `RES-PIPELINE-001` §3/§5 and `RES-CLI-001` §4; traced to `FR-PC`/`NFR-PC`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; authoritative source is the main-branch working
tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes.

### B.3 Change Control
Changes require: update the clause; keep `FEAT`/`TEST`/`PLAN`-`PIPECLI` consistent; increment
`version`; append to Annex A. Architecture decisions that change a requirement go through a
`CR/` against `FEAT-PIPECLI-001`.

### B.4 Backwards Compatibility
The design exists to make migration behaviour-preserving (`NFR-PC-1`): modules move into the
registry before any externally-visible grammar changes.

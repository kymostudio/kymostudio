---
title: Pipeline & CLI Architecture — Design
document_id: DESIGN-PIPECLI-001
version: "0.4"
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
| Version           | 0.4 |
| Status            | Draft |
| Owner             | `packages/python` · `packages/js` · `packages/rust` |
| Related Documents | `FEAT-PIPECLI-001` (requirements, traced below), `TEST-PIPECLI-001`, `PLAN-PIPECLI-001` |

## 1. Scope

This document gives the architecture realising `FEAT-PIPECLI-001`: the six-stage internal
pipeline, the registries, the module layout, the CLI grammar that drives it, and the
invariants that keep it honest. It is design-level — file/function names are indicative of
intent, not a committed API. The narrative evidence is `RES-PIPELINE-001` (§3 proposed
pipeline, §5 module layout) and `RES-CLI-001` (§4 proposed CLI).

> **Architecture stance (v0.4): the engine lives in `kymostudio-core` (Rust).** The original
> framing put a six-stage engine inside `packages/python`. As-built, the heavy stages have
> already moved into the shared Rust core and are reached by PyO3 (Python) / wasm (JS) — BPMN
> and Mermaid **decode**, BPMN and flowchart **layout filters**, the draw.io and BPMN
> **encoders**, and the PNG/PDF **post/raster** stage are all `kymostudio-core` today (see
> `FEAT-PIPECLI-001` §0.1). This design therefore treats **the core as the engine that owns
> the `decode → filter → encode → post` stages**, with the Python/JS/Rust CLIs as thin
> front-ends that own DEMUX (sniff/arg-parse) and MUX (write), register stages into the core's
> registry, and exchange the model as `.kymo.json` (`KYMOJSON-MAP-001`). A few stages remain
> language-local during migration (the DSL parser, DSL-DAG `layout`, `alignment`, and the
> SVG/Figma/Excalidraw emitters are still Python) — those are migration state, not the target.

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
| **DEMUX** | sniff extension + magic bytes → importer name; accept `stdin`, `-f` override | suffix switch in `load()` (front-end) | front-end `demux` registry (`FR-PC-7`, `FR-PC-10`) |
| **DECODE** | importer → `Diagram` (no layout/align) | core: `_core.import_bpmn`, `_core.import_mermaid`; Python: `dsl.py`, `from_kymojson.py`, dynamic `.py` | core `decode` registry; language-local importers register into it (`FR-PC-2`) |
| **FILTER** | `Diagram → Diagram` passes, format-agnostic | core: `_core.apply_layout` (BPMN), `_core.resolve_flowchart_blocks`; Python: `layout.py`, `alignment.py`; `--animate` flag | core `filter` registry (`FR-PC-3`) |
| **ENCODE** | `Diagram` → container bytes/string | core: `_core.diagram_to_drawio`, `_core.export_bpmn`; Python: `to_svg/figma/excalidraw/kymojson` | core `encode` registry (`FR-PC-4`) |
| **POST** | tweak encoded payload, no re-decode | core: PNG (resvg) / PDF (svg2pdf) via `to_png`/`to_pdf`; Python: `to_webp.make_frame_svg` (animation snapshot) | core `post` stage (`FR-PC-5`) |
| **MUX** | write file / stdout; infer container from `-o`, `-f` overrides | per-branch `out.write_text(...)`/`write_bytes(...)` in `main()` (front-end) | front-end `mux` (`FR-PC-12`) |

### 2.1 Stage 1 — DEMUX (`FR-PC-7`, `FR-PC-10`)

```python
# front-end demux (sniff + dispatch into the core's decode registry)
IMPORTERS = {
    ".kymo":         "kymo_dsl",        # Python: dsl.parse
    ".kymo.json":    "kymo_json",       # Python: from_kymojson.parse
    ".bpmn":         "bpmn_2_0",        # core:   _core.import_bpmn
    ".mmd":          "mermaid",         # core:   _core.import_mermaid
    ".mermaid":      "mermaid",         # core:   _core.import_mermaid
    ".drawio":       "drawio",          # (planned import; encoder ships today)
    ".svg":          "svg",             # (planned)
    ".py":           "python_module",   # Python: import_module → mod.DIAGRAM
}
def sniff(path_or_stream) -> str: ...   # → importer name (extension + magic bytes; -f overrides)
```

Replaces the suffix switch in `load()` and the `unsupported source` check in `main()`.

### 2.2 Stage 2 — DECODE (`FR-PC-2`, `FR-PC-6`)

Each importer returns a `Diagram` and **must not** run layout or alignment. Some importers are
Python modules, some are PyO3 calls into the core (`_core.import_bpmn`, `_core.import_mermaid`)
— the registry hides which. The implicit "pre-resolved" property becomes an **explicit
`diagram.resolved = True` flag** (`FR-PC-6`), so the filter stage skips layout deterministically
instead of `_load_resolved()` checking the as-built condition:

```python
src.suffix not in (".bpmn", ".json", ".mmd", ".mermaid") and not had_bpmn and not had_flowchart
```

**`resolved` is a per-`Diagram` property, not a property of the source format**, and it covers
**three** pre-resolved categories:

1. `.bpmn`/`.kymo.json`/`.mmd`/`.mermaid` sources — positioned at decode (DI geometry, the
   serialized resolved model, or core Mermaid layout).
2. A `.kymo` DSL source carrying a `bpmn { }` block (`had_bpmn`) — positioned by the
   `_core.apply_layout` filter, then alignment-skipped.
3. A source carrying `flowchart { }` blocks (`had_flowchart`) — positioned by the
   `_core.resolve_flowchart_blocks` filter, then alignment-skipped.

So the importer alone cannot always set `resolved` — for categories (2)/(3) it is the **core
layout filter** that marks the diagram resolved once it has positioned the block. The default
chain (below) must consult the flag *after* those filters run, not before.

| Importer | Where it runs today | `resolved`? |
|----------|---------------------|-------------|
| `kymo_dsl` | Python `dsl.py` | No — **unless** it carries a `bpmn { }` / `flowchart { }` block, then set *after* the corresponding `_core.*` layout filter |
| `bpmn_2_0` | core `_core.import_bpmn` | Yes (DI geometry) |
| `mermaid` | core `_core.import_mermaid` | Yes (core layout) |
| `kymo_json` | Python `from_kymojson.py` | Yes |
| `python_module` | dynamic `import_module` in `load()` | Depends (`mod.LAYOUT`) |
| `drawio` | port from `packages/js/src/drawio2svg/` (planned) | Yes |
| `svg` | new (planned) | Yes |

### 2.3 Stage 3 — FILTER GRAPH (`FR-PC-3`, `FR-PC-13`) — the stage kymo is missing most

Today the passes are scattered through `_load_resolved()`: `_core.apply_layout` (`bpmn { }`
blocks, in the Rust core — was `bpmn_layout.py`), `_core.resolve_flowchart_blocks`
(`flowchart { }` blocks, core), `layout.py::layout` (DSL DAG, Python),
`alignment.py::resolve_alignments` (Python), with `--animate` forwarded to the renderer in
`main()`. Each becomes a registered `Diagram → Diagram` filter (some Python, some core-backed):

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
formats. The default chain mirrors the order `_load_resolved()` runs today:
`_core.apply_layout` (only if the diagram has `bpmn { }` blocks) → `_core.resolve_flowchart_blocks`
(only if `flowchart { }` blocks) → `layout` (only if a DSL `layout { }` spec is present) →
`align` (only if the diagram is **not** `resolved`). Today **`autosize` is not a separate pass**
at this point — auto-canvas sizing is one of the passes *inside* `resolve_alignments`; splitting
it into its own `autosize` filter is part of this work, and must preserve the current ordering.
A `resolved` diagram skips `layout`/`align` and goes straight to encode. Note two of these
filters (`apply_layout`, `resolve_flowchart_blocks`) are **core-backed** — the registry entry is
a thin PyO3 shim, not Python layout code.

### 2.4 Stage 4 — ENCODE (`FR-PC-4`)

```python
ENCODERS = {
    "svg":        to_svg.render,            # Python
    "figma":      to_figma.render,          # Python
    "excalidraw": to_excalidraw.render,     # Python
    "kymojson":   to_kymojson.export,       # Python
    "drawio":     _core.diagram_to_drawio,  # core (mxGraph XML; FEAT-PIPECLI-DRAWIO-001)
    "bpmn":       _core.export_bpmn,         # core (was to_bpmn.export)
    "png":        compose(to_svg.render, _core.svg_to_png),   # core: resvg
    "pdf":        compose(to_svg.render, _core.svg_to_pdf),   # core: svg2pdf (vector)
    "webp":       compose(to_svg.render, _core.svg_to_webp),  # core: resvg
}
```

Raster/vector targets pipe **through SVG first** — `Diagram → SVG → {png,pdf,webp}` —
mirroring FFmpeg's wrapper-over-codec containers. The core owns the raster/PDF back-ends
(resvg, svg2pdf); no encoder reads from disk; the mux owns I/O.

### 2.5 Stage 5 — POST / BITSTREAM (`FR-PC-5`)

Tweaks the encoded payload without re-decoding: **animation snapshot**
(`to_webp.make_frame_svg` rewrites CSS into the encoded SVG to freeze a time-step —
it belongs here, not in the encoder), **SVG minify**, **inline fonts / base64 images**,
**sanitize** (strip `<script>`/comments).

### 2.6 Stage 6 — MUX (`FR-PC-12`)

Infers the container from the `-o` extension; `-f` overrides; `-o -` writes stdout. Replaces
the per-branch `out.write_text(...)` and `src.with_suffix(...)` destination logic in `main()`.

## 3. CLI grammar (`FR-PC-8..16`)

A clean break to FFmpeg's verb-less model — the binary *is* the converter:

```
# converter (verb-less) — every first token that is not a reserved subcommand is a source:
kymo [-i] <src|->  [-f <informat>] [-t <target>]... [-o <path|->]
                   [-vf <chain>] [--anim <preset>] [--width N] [--frames N] [--quality Q]
                   [--probe] [--watch] [-y|-n] [-q|-v]

# reserved tooling subcommands (git/cargo-style first-token verb — NOT flags):
kymo lint  <src|-> [--json] [--max-level warn|error]   # rule-check the source
kymo icons <verb>                                      # the icon command group

# converter-run modifiers are flags on the converter (no separate binary, no subcommand):
kymo --probe <src|->        # inspect: format, size, node/edge counts, valid? (no render)
kymo --watch <src> -t ...   # re-render on change

# capability & help:
kymo -formats | -targets | -h [topic]
```

| FFmpeg | kymo equivalent | Requirement |
|--------|-----------------|-------------|
| Demuxer (`.mp4`) | Importer (`.bpmn`, `.kymo`, `.kymo.json`, `.mmd`/`.mermaid`, `.drawio`, `.py`) | `FR-PC-2` |
| `-vf scale=…,crop=…` | `-vf layout=dagre,align=center,theme=dark` | `FR-PC-13` |
| `-c:v libx264` / `-f mp4` | target `-t svg` / format `-f` | `FR-PC-9,10` |
| Bitstream filter | SVG minify, animation snapshot, font inlining | `FR-PC-5` |
| Muxer | file writer (svg/webp/png/pdf/figma.js/excalidraw/drawio/bpmn) | `FR-PC-12` |
| `ffprobe` / `ffplay` | `--probe` / `--watch` (flags on one binary) | `FR-PC-14` |
| `-formats` / `-h full` | `-formats` / `-targets` / `-h [topic]` | `FR-PC-15` |

**What kymo rejects from FFmpeg** (`FR-PC-16`): positional options (kymo options are
order-insensitive); stream-specifier microsyntax (`-c:v:0` — a kymo source is one diagram);
the dual input/output meaning of `-i` (`-i` marks input only). The throughline: borrow the
shape, drop the positional-option trap.

**Behaviour fixes the grammar buys** (`FR-PC-9,11`): `-t svg -t figma` renders both from one
parse (today the target branches in `main()` each return early, so the first matched flag wins
and extras never run); `--anim` against a non-animatable target warns instead of silently
dropping (today the `figma` branch renders without the `animate` flag).

### 3.1 Grammar layers & parser rules (`FR-PC-8`, `FR-PC-14`, `FR-PC-16`)

kymo deliberately mixes three lexical token styles (FFmpeg homage, GNU long, POSIX short). That
is legal because the parser is **hand-rolled and zero-dependency** (`RES-CLI-001` §5) — but the
mix is only consistent if the tokenisation is specified. This subsection is that specification;
it resolves the `-f`/`-formats` and `-t`/`-targets` ambiguity and the prefix-style mismatch.

**Layer 0 — reserved subcommand token.** If `argv[0]` is `icons` or `lint`, dispatch to that
tooling verb (`git`/`cargo`-style). Otherwise the invocation is the **verb-less converter** and
`argv[0]` is the source. These are the *only* reserved first tokens. The converter may also take
**one trailing positional output path** (`kymo in.svg out.png`, today's behaviour) — a
positional *path* is FFmpeg-style and is distinct from the positional *options* `FR-PC-16`
rejects.

**Three option classes** (converter + flags):

| Class | Shape | Members |
|-------|-------|---------|
| **Short** | `-` + one char; value is the next token or `=value` | `-i -o -t -f -y -n -q -v -h` (each with a GNU long alias: `--input --out --to --from …`) |
| **Long** | `--` + word | `--anim --probe --watch --json --width --frames --quality --max-level` — **no `--lint`** (lint is a subcommand) |
| **Capability keyword** | `-` + word, matched as one atomic token (FFmpeg homage, deliberate) | `-formats` · `-targets` · `-vf` (≡ `--filter`) · `-filter_complex` |

**Parser rules** (make the grammar order-insensitive and unambiguous):

1. **Whole-token match.** A `-…` token is looked up *entire* against the option table; longest
   exact match wins. `-formats` matches the `-formats` keyword and **never** decomposes to
   `-f` + `ormats`; `-f` matches only the literal token `-f`.
2. **No bundling.** `-qv` is an error, not `-q -v`. (Removes the whole short-flag-run ambiguity.)
3. **No glued short value.** `-tsvg` is invalid; write `-t svg` or `-t=svg` (the `=` form is
   already accepted today — see `_extract_scale`'s `-s N`/`-s=N`/`--scale=N`).
4. A short option that takes a value (`-i -o -t -f`) consumes the **next** token (or its `=value`);
   capability keywords take **no** value.

Because tokens are matched whole and never bundled, `-f` (format override) and `-formats`
(capability) coexist with zero ambiguity, and every option means the same thing wherever it sits
(`FR-PC-16`) — without FFmpeg's positional-option trap.

## 4. Module layout (`FR-PC-1..7`)

The engine stages (`decode · filter · encode · post`) are owned by **`kymostudio-core`** and
exposed through its registry; each front-end (Python/JS/Rust) owns only DEMUX (sniff/arg-parse)
and MUX (write), plus any **language-local stages still being migrated into the core**. A
registry entry is therefore either a native-language function or a thin binding shim
(`_core.*` / wasm) — the driver does not care which.

```
kymostudio-core (Rust)                packages/python/src/kymo/      packages/js/
├── decode/   import_bpmn,            ├── cli.py    # demux + mux     ├── render-cli.mjs # demux+mux
│             import_mermaid, …       │             # + registry wiring│
├── filter/   apply_layout (bpmn),    ├── _core.py  # PyO3 bindings → core stages
│             resolve_flowchart, …    ├── dsl.py    # language-local DECODE (DSL)
├── encode/   diagram_to_drawio,      ├── from_kymojson.py            # language-local DECODE
│             export_bpmn, …          ├── layout.py, alignment.py     # language-local FILTER
├── post/     svg→png (resvg),        ├── to_svg/figma/excalidraw/    # language-local ENCODE
│             svg→pdf (svg2pdf), …    │   kymojson.py
└── (model: KYMOJSON-MAP-001 wire)    └── to_png.py, to_pdf.py, to_webp.py  # POST shims → core
```

**Migration shape (`PLAN-PIPECLI-001` §3).** Two motions run in parallel: (a) **into the core** —
heavy stages already moved (`from_bpmn.py` → `_core.import_bpmn`, `bpmn_layout.py` →
`_core.apply_layout`, `to_bpmn.py` → `_core.export_bpmn`, raster/PDF → core); the remaining
Python-local stages (DSL parse, DSL-DAG `layout`, `alignment`, SVG/Figma/Excalidraw emitters)
follow as parity demands. (b) **behind the registry** — whether a stage is core-backed or
language-local, it is reached by name, so the driver loses its `if/elif`. Every step is
move-then-rewire so golden output stays byte-identical (`NFR-PC-1`).

## 5. Dual/triple-implementation parity (`NFR-PC-3`)

The Rust CLI lives in its own crate `packages/rust/kymostudio` (`src/main.rs`); the
`kymostudio-core` crate is the **library engine** (resvg/svg2pdf, the importers/encoders, no
`main.rs`). The `kymo` binary today already runs a `{ext → fn}` `CONVERTERS` registry
(`FEAT-PIPECLI-001` §0.1) — Mermaid → svg/d2/dot/drawio/xmi/mdj, D2/DOT → svg, etc. — so it is
**closer to the target registry shape than the Python CLI**, but it does not yet expose the
verb-less grammar (`FR-PC-8..16`). The gap is grammar parity, not architecture.
Target state: all three implementations present the **same pipeline diagram and CLI surface**;
only the front-end language differs, because the engine is the shared core. `.kymo.json`
(`KYMOJSON-MAP-001`) is the wire format between them — analogous to FFmpeg's raw frame on a Unix
pipe. A front-end may offer a "fast path" (demux + decode + encode for pre-resolved
`.kymo.json`), with the filter stage skipped via the `resolved` flag.

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
| 0.2     | 2026-06-06 | Vũ Anh | Review corrections. §2.2: `resolved` is a per-`Diagram` flag (covers DSL-with-`bpmn{}`, set after `bpmn_layout`), not a source-format property. §2.3: default chain restated to match `_load_resolved()` (`bpmn_layout → layout → align`); noted `autosize` is currently a sub-pass of `resolve_alignments`, not a standalone pass. §5: Rust CLI is the `kymostudio` crate (`kymostudio-core` is lib-only). Replaced fragile `cli.py:NN` / `to_webp.py:NN` citations with function names. |
| 0.3     | 2026-06-06 | Vũ Anh | Grammar-consistency fix (review finding #5). New §3.1 "Grammar layers & parser rules": Layer-0 reserved subcommands (`icons`/`lint`), three option classes (short / long / FFmpeg-homage capability keywords), and four parser rules (whole-token match, no bundling, no glued short value) that make `-f`/`-formats` and `-t`/`-targets` unambiguous. §3 code block regrouped into converter / tooling-subcommands / converter-run-flags; `--lint` removed (lint is `kymo lint`). |
| 0.4     | 2026-06-13 | Vũ Anh | **Rust-core reframe + as-built reconciliation.** New §1 architecture stance: the engine (`decode·filter·encode·post`) is owned by `kymostudio-core`, reached via PyO3/wasm, with the per-language CLIs as thin front-ends (DEMUX/MUX + registry wiring). Updated the §2 stage table, §2.1 DEMUX (added `.mmd`/`.mermaid`), §2.2 DECODE (skip condition `… not in (".bpmn",".json",".mmd",".mermaid") and not had_bpmn and not had_flowchart`; three resolved categories; `from_bpmn.py`→`_core.import_bpmn`, added mermaid), §2.3 FILTER (`bpmn_layout`→`_core.apply_layout`, added `_core.resolve_flowchart_blocks`), §2.4 ENCODE (`to_bpmn.export`→`_core.export_bpmn`; added `drawio`, `pdf`), §3 mapping (mmd importer; drawio/pdf muxer), and §4 module layout (core-engine vs language-local split). §5: Rust CLI already ships the `CONVERTERS` registry (no longer "`.svg`-only"). |

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

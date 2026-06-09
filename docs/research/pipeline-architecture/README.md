# A Pipeline Architecture for kymo — Lessons from FFmpeg (Research)

| Field             | Value                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-PIPELINE-001                                                                                                 |
| Version           | 0.1                                                                                                              |
| Issue Date        | 2026-06-06                                                                                                       |
| Status            | Draft                                                                                                            |
| Classification    | Internal                                                                                                         |
| Owner             | `diagrams/` project                                                                                              |
| Audience          | Engineers redesigning kymo's internal architecture across the Python, JS, and Rust packages                      |
| Subjects          | [FFmpeg](https://ffmpeg.org/ffmpeg.html) pipeline model (demux · decode · filter graph · encode · mux) — applied to diagram tooling |
| Licenses          | FFmpeg: LGPL-2.1+/GPL-2+ (documentation cited under its terms; no FFmpeg code is used)                           |
| Versions Reviewed | FFmpeg 7.x architecture documentation (2026-06-06); kymo @ `32fdfc3` (`main`)                                    |
| Related Documents | `RES-CLI-001` (`docs/research/cli-design/`)                                                                      |

This is a **research note on prior art** — a study of how FFmpeg structures its internal pipeline, and a
**proposal** for restructuring kymo's converter core the same way. It is **not a specification**: nothing in
this repository depends on it, and no behaviour described under "Proposed" is committed work. It is the
evidence base for a possible future `docs/specs/kymo-pipeline/`.

The framing thesis: **kymo wants to be to diagrams what FFmpeg is to video** — one binary that ingests many
source formats, transforms them through composable passes, and emits many target formats. FFmpeg achieves
this by splitting its core into six clean stages (demux → decode → filter graph → encode → bitstream → mux),
each pluggable via registries. kymo today does the same work, but it is **scattered across `cli.py` if/elif
branches**: importers, layout passes, renderers, and writers are not separated by registry. This document
maps FFmpeg's six-stage pipeline onto kymo's existing modules and proposes an incremental migration that
preserves behaviour while making every new format a one-file addition.

---

## 1. FFmpeg's pipeline

A single `ffmpeg` invocation is an **execution graph** with six stages. The command:

```
ffmpeg -i in.mp4 -vf scale=1280:720 -c:v libx264 -b:v 2M out.mp4
```

flows as:

```
 demuxer → decoder → filter graph → encoder → bitstream filter → muxer
 (mp4)     (h264)    (scale=…)      (libx264)  (h264_mp4toannexb)  (mp4)
```

### 1.1 The six stages

1. **Demuxer (`-i`)** — opens a container (mp4/mkv/webm/…), splits it into raw **streams** (video,
   audio, subtitle, data). No decoding; just framing. Multiple `-i` can be passed and mixed downstream.

2. **Decoder** — turns encoded packets (h264, aac, vp9, …) into raw **frames** (YUV420 / PCM). The
   decoder is picked from the codec id automatically; `-c:v h264_cuvid` overrides.

3. **Filter graph (`-vf`, `-af`, `-filter_complex`)** — a DAG of frame transforms: `scale`, `crop`,
   `overlay`, `fps`, `drawtext`, `concat`, `split`, … This is the **compose** layer: many inputs may
   blend, a single input may fork. Filters are format-agnostic — they know about frames, not files.

4. **Encoder (`-c:v`, `-c:a`)** — raw frames → encoded packets (libx264, libvpx, aac, …). Bitrate,
   quality, preset are set here.

5. **Bitstream filter** (optional) — manipulates encoded packets without re-decoding (e.g.
   `h264_mp4toannexb` adapts h264 between containers).

6. **Muxer (output path)** — gathers packets into the destination container, inferred from the file
   extension (`.mp4` → `mp4`, `.webm` → `webm`); `-f` overrides.

### 1.2 What FFmpeg gets right

- **Format-agnostic at both ends** — input and output are decoupled from the core. Adding a new
  container = adding a muxer; nothing else moves.
- **Codec ↔ container decoupled** — `libx264` works inside mp4, mkv, ts, flv. This is what makes
  FFmpeg feel "universal".
- **Filter graph is its own DSL** — text-based (`[0:v][1:v]overlay=10:10[out]`), composes freely,
  testable without real I/O.
- **Streaming** — frames flow through the graph without loading whole files.
- **Pluggable** — every codec, filter, demuxer, muxer is a registered module; build flags toggle
  them on/off.

### 1.3 Where the analogy stops

- **Streaming doesn't fit diagrams.** A diagram is a small, whole graph; layout passes need to see
  the entire model. kymo's "stream" is a single in-memory `Diagram`, not a chunked frame queue.
- **No real-time clock.** FFmpeg's frames have timestamps; kymo's animations are declarative CSS,
  computed offline.

---

## 2. kymo today

### 2.1 Inventory

Importers (parsers producing a `Diagram`):

| Source       | Module                                                  | Notes                            |
|--------------|---------------------------------------------------------|----------------------------------|
| `.kymo` DSL  | `packages/python/src/kymo/dsl.py`                       | Needs layout                     |
| `.bpmn`      | `packages/python/src/kymo/from_bpmn.py`                 | Already positioned via DI bounds |
| `.kymo.json` | `packages/python/src/kymo/from_kymojson.py`             | Already resolved                 |
| `.py`        | dynamic `importlib` in `cli.py`                         | `mod.DIAGRAM` convention         |
| `.mmd`       | `kymostudio-core` `crate::mermaid`                       | Mermaid flowchart → IR → layout  |
| `.d2`        | `kymostudio-core` `crate::d2`                            | D2 flowchart → IR → layout       |
| `.dot`       | `kymostudio-core` `crate::dot`                           | Graphviz DOT → IR → layout       |
| `.drawio`    | `packages/js/src/drawio2svg/` (→ SVG, dev tool)         | faithful mxGraph render; not yet an IR importer |
| `.svg`       | — (none)                                                | Used only by Rust rasterizer     |

Transforms (model → model):

| Pass                 | Module                                             | Scope                                  |
|----------------------|----------------------------------------------------|----------------------------------------|
| BPMN block layout    | `packages/python/src/kymo/bpmn_layout.py`          | Embedded `bpmn { }` blocks in DSL      |
| DAG layout           | `packages/python/src/kymo/layout.py`               | DSL-authored nodes                     |
| Alignment resolution | `packages/python/src/kymo/alignment.py`            | DSL-authored nodes                     |
| Animate (flag-only)  | `to_svg.render(..., animate=…)`                    | Passed through to renderer             |

Renderers (`Diagram` → encoded bytes/string):

| Codec         | Module                                            | Output                       |
|---------------|---------------------------------------------------|------------------------------|
| `svg`         | `packages/python/src/kymo/to_svg.py`              | SVG string                   |
| `figma`       | `packages/python/src/kymo/to_figma.py`            | Figma Plugin JS              |
| `excalidraw`  | `packages/python/src/kymo/to_excalidraw.py`       | Excalidraw scene JSON        |
| `bpmn`        | `packages/python/src/kymo/to_bpmn.py`             | BPMN 2.0 XML                 |
| `kymojson`    | `packages/python/src/kymo/to_kymojson.py`         | Resolved model JSON          |
| `drawio`      | `kymostudio-core` `crate::drawio`                 | mxGraph XML (source-agnostic encoder) |
| `mermaid`/`d2`/`dot` | `kymostudio-core` `flowchart::emit`        | text DSL (from the flowchart IR, not `Diagram`) |
| `svg` (flowchart) | `kymostudio-core` `crate::flowchart_svg`      | SVG, pure Rust (no external binary) |
| `png`         | `packages/rust/kymostudio-core` (`svg_to_png`)    | PNG bytes (from SVG input)   |
| `webp`        | `packages/python/src/kymo/to_webp.py`             | Animated WebP (from SVG)     |

### 2.2 Dispatch is hard-coded

The current entry point (`packages/python/src/kymo/cli.py:58-72`, `:119-127`, `:144-189`) selects
importers and renderers via suffix checks and flag branches:

```python
if source.suffix == ".bpmn":   ...
if source.suffix == ".json":   ...
if source.suffix == ".kymo":   ...
```

```python
if excalidraw: ...
if figma:      ...
if bpmn:       ...
if json_out:   ...
```

Every new format means editing `cli.py`. There is no registry, no filter abstraction, and no way to
compose passes from the command line.

### 2.3 The Rust CLI

The `kymo` binary now lives in its own crate (`packages/rust/kymostudio`). It started as
an SVG→PNG rasterizer but has since grown a real front-end + an **output-extension
registry** (`{ext → fn}`, the proposal's invariant #4 in miniature): it imports
`.mmd` / `.d2` / `.dot` (Mermaid / D2 / Graphviz DOT → the shared flowchart IR) and
writes `.svg` (a pure-Rust flowchart renderer), `.d2` / `.dot` / `.mmd` (text emitters),
`.drawio` (mxGraph encoder), or `.kymo.json`. So `kymo flow.d2 flow.svg` and
`kymo flow.mmd flow.drawio` already work. Aligning the *whole* CLI (all stages, all
sources) with the Python CLI — sharing `kymojson` as the wire format — remains the win
this proposal enables.

---

## 3. Proposed pipeline

```
 ┌──────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ DEMUX    │ → │ DECODE   │ → │ FILTER GRAPH │ → │ ENCODE   │ → │ POST     │ → │ MUX      │
 │ (sniff)  │   │ (parse)  │   │ (transform)  │   │ (render) │   │ (bitstream)│ │ (write)  │
 └──────────┘   └──────────┘   └──────────────┘   └──────────┘   └──────────┘   └──────────┘
   *.bpmn         BPMN AST       layout/align       SVG string     animate-      foo.svg
   *.kymo         DSL AST        theme/animate      Figma JS       inject        foo.webp
   *.kymo.json    JSON tree      merge/overlay      Excal JSON     minify        foo.figma.js
   *.py           Python AST     diff/filter        BPMN XML       inline fonts
   *.drawio       drawio XML                        kymo.json
   *.svg          SVG tree
   stdin          (sniff bytes)
```

The invariant: **everything flows through a single intermediate `Diagram` model** — the analogue of
FFmpeg's raw frame. Both ends (importers and encoders) register against a central registry.

### 3.1 Stage 1 — DEMUX (sniff & dispatch)

Pick an importer from extension + magic bytes; expose `stdin` (`-i -`); accept multiple `-i` flags.

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
def sniff(path_or_stream) -> str: ...   # → importer name
```

Replaces the suffix-switch at `cli.py:58-72` and `cli.py:119-121`.

### 3.2 Stage 2 — DECODE (parser → `Diagram`)

Each importer is an independent module returning `Diagram`. Importers **must not** run layout or
alignment — that is the filter stage's job. The current implicit "pre-resolved" property of
`from_bpmn` and `from_kymojson` becomes an explicit flag on the model (e.g. `diagram.resolved =
True`) so the filter stage can skip layout deterministically, instead of `cli.py:141` checking the
file suffix.

| Importer        | Existing module       | Pre-resolved? |
|-----------------|-----------------------|---------------|
| `kymo_dsl`      | `dsl.py`              | No            |
| `bpmn_2_0`      | `from_bpmn.py`        | Yes (DI)      |
| `kymo_json`     | `from_kymojson.py`    | Yes           |
| `python_module` | `cli.py` dynamic load | Depends       |
| `drawio`        | (port from JS)        | Yes           |
| `svg`           | (new)                 | Yes           |

### 3.3 Stage 3 — FILTER GRAPH (transform `Diagram` → `Diagram`)

This is **the stage kymo is missing most**. Today the relevant passes are scattered:

- `bpmn_layout.py::layout` — `bpmn { }` blocks
- `layout.py::layout` — DSL DAG layout
- `alignment.py::resolve_alignments` — alignment resolution
- `--animate` — currently a flag forwarded to the renderer, not a transform

Proposed registry — each filter is `Diagram → Diagram`:

```python
# pipeline/filters.py
FILTERS = {
    "layout":   layout_filter,      # algo=dagre|bpmn|external
    "align":    align_filter,
    "autosize": autosize_filter,
    "theme":    theme_filter,       # dark/light/brand
    "animate":  animate_filter,     # flow|pulse|breath
    "concat":   concat_filter,      # join diagrams horizontally/vertically
    "overlay":  overlay_filter,     # stack on top
    "subgraph": subgraph_filter,    # crop to a node subset
    "diff":     diff_filter,        # compare two diagrams
    "rename":   rename_filter,
}
```

Filter-chain syntax (borrowed from FFmpeg):

```bash
kymo -i order.bpmn -vf "layout=algo=bpmn,theme=dark,animate=flow" -o order.svg

# filter_complex for multi-input compose:
kymo -i a.bpmn -i b.kymo \
     -filter_complex "[0][1]concat=axis=v[out]" \
     -map "[out]" -o merged.svg
```

Filters only touch the model; they know nothing about output formats. This is the load-bearing
invariant.

### 3.4 Stage 4 — ENCODE (`Diagram` → container bytes)

Existing renderers fit unchanged:

```python
ENCODERS = {
    "svg":        to_svg.render,
    "figma":      to_figma.render,
    "excalidraw": to_excalidraw.render,
    "bpmn":       to_bpmn.export,
    "kymojson":   to_kymojson.export,
    "drawio":     rust_core.drawio_from_kymojson,   # mxGraph XML — SHIPPED (source-agnostic)
    "png":        compose(to_svg.render, rust_core.svg_to_png),
    "webp":       compose(to_svg.render, rust_core.svg_to_webp),
}
```

Note: PNG and WebP **do not encode directly from `Diagram`** — they pipe through SVG first. This
mirrors FFmpeg, where some containers are wrappers over a more fundamental codec.

### 3.5 Stage 5 — POST / BITSTREAM (optional)

Tweaks the encoded payload without re-decoding. Useful for:

- **Animation injection** — `to_webp.py:102 make_frame_svg` already does this (rewrites CSS into
  the encoded SVG to snapshot a time-step). It belongs in this stage, not in the encoder.
- **SVG minify** — strip whitespace, dedupe `<defs>`.
- **Embed assets** — inline fonts, base64 images.
- **Sanitize** — strip `<script>`, comments.

### 3.6 Stage 6 — MUX (write file / stdout)

Infers the container from the output extension; `-f` overrides; `-o -` writes to stdout for
pipelines.

```bash
kymo -i x.bpmn -f svg -o -      # SVG to stdout
kymo -i x.bpmn -o x.svg         # inferred: svg
kymo -i x.bpmn -o x.webp        # inferred: webp (chains SVG → WebP encode)
```

---

## 4. Mapping table — FFmpeg ↔ kymo

| FFmpeg                              | kymo equivalent                                                  |
|-------------------------------------|------------------------------------------------------------------|
| Demuxer (`.mp4`, `.mkv`)            | Importer (`.bpmn`, `.kymo`, `.kymo.json`, `.drawio`, `.py`)      |
| Stream (video/audio)                | `Diagram` (nodes, edges, clusters)                               |
| Decoder                             | Parser → `Diagram`                                               |
| **Filter graph**                    | Layout + alignment + autosize + theme + animate                  |
| Encoder                             | Renderer (`to_svg`, `to_figma`, `to_excalidraw`, `to_bpmn`, …)   |
| Bitstream filter                    | SVG minify, animation snapshot, font inlining                    |
| Muxer                               | File writer (svg/webp/png/figma.js/excalidraw/bpmn xml)          |
| `-vf scale=…,crop=…`                | `-vf layout=dagre,align=center,theme=dark`                       |
| `-c:v libx264`                      | `-c svg` / `-c figma`                                            |
| `-f mp4`                            | `-f svg` / `-f webp`                                             |

Hypothetical ideal command:

```bash
kymo -i order.bpmn -i overlay.kymo \
     -filter_complex "layout=dagre, theme=dark, animate=flow" \
     -c svg -f webp order.webp
```

---

## 5. Proposed module layout

```
packages/python/src/kymo/
├── cli.py                 # arg parsing → pipeline driver
├── pipeline/
│   ├── demux.py           # sniff + dispatch
│   ├── importers/         # 1 file per format, registry-driven
│   │   ├── kymo_dsl.py    (= dsl.py today)
│   │   ├── bpmn.py        (= from_bpmn.py)
│   │   ├── kymo_json.py   (= from_kymojson.py)
│   │   ├── drawio.py      (port from JS)
│   │   ├── svg.py         (new)
│   │   └── python_module.py
│   ├── model.py           # Diagram (= model.py today)
│   ├── filters/           # 1 file per filter
│   │   ├── layout.py
│   │   ├── align.py
│   │   ├── animate.py
│   │   ├── theme.py
│   │   ├── concat.py
│   │   ├── overlay.py
│   │   └── subgraph.py
│   ├── encoders/          # 1 file per output codec
│   │   ├── svg.py         (= to_svg.py)
│   │   ├── figma.py       (= to_figma.py)
│   │   ├── excalidraw.py  (= to_excalidraw.py)
│   │   ├── bpmn.py        (= to_bpmn.py)
│   │   ├── kymojson.py    (= to_kymojson.py)
│   │   ├── png.py         (compose svg → rust)
│   │   └── webp.py        (= to_webp.py)
│   ├── post/              # bitstream tweaks
│   │   ├── minify_svg.py
│   │   ├── inline_fonts.py
│   │   └── animate_snapshot.py
│   └── mux.py             # write file / stdout, content-type
└── ...
```

---

## 6. Invariants

1. **Model is the single source of truth.** `Diagram` is the only thing that flows from decode →
   filter → encode. A new importer is one file; a new encoder is one file. The core never moves.
2. **Filters are format-agnostic.** A filter knows about `Diagram`; it does not know about
   `.svg` or `.figma`.
3. **Each stage is pure.** Inputs and outputs are explicit; testing is per-stage.
4. **Registry, not if/elif.** `cli.py` dispatches by name; it does not switch on format.
5. **Raster lives at the tail.** PNG/WebP are always `Diagram → SVG → raster`. No shortcuts.

---

## 7. What this unlocks

- Adding a new flowchart **source** = one importer crate + one registry arm. **Now
  shipped** for the Rust core: D2 (`crate::d2`) and Graphviz DOT (`crate::dot`) parse
  into the shared flowchart IR (`d2_to_kymojson` / `dot_to_kymojson` / `d2_to_svg` / …).
- Adding a new **encoder** = one function the registry dispatches by output extension.
  **Now shipped**: the draw.io encoder (`Diagram → mxGraph XML`, source-agnostic
  `drawio_from_kymojson`, RES §3.4), the text emitters (`flowchart::emit` → Mermaid/D2/DOT),
  and a pure-Rust flowchart SVG renderer (`crate::flowchart_svg`) — all wired into the
  Rust `kymo` CLI's `{ext → fn}` output registry (the proposal's invariant #4, in miniature).
- Adding a `.pdf` output = one encoder. **Shipped**: vector PDF via `kymostudio-core`'s
  `svg_to_pdf` (svg2pdf), dispatched by the `.pdf` output extension in all three CLIs.
- `kymo -i a.bpmn -i b.kymo -filter_complex concat -o out.svg` works without touching the core.
- Per-stage unit tests (importer with fixed JSON, filter with fixed `Diagram`, encoder with fixed
  `Diagram`) replace today's end-to-end-only coverage.
- Rust and Python CLIs share the **same pipeline diagram**, only the implementation differs;
  `.kymo.json` becomes their interchange format — analogous to FFmpeg's raw frame on a Unix pipe.

---

## 8. Incremental migration plan

Big-bang rewrites would invalidate the conformance corpus in `conformance/golden/`. The migration is
designed to be observable from the outside as a no-op until the new surface is opted in.

1. **Scaffold `pipeline/`** and move existing importer/renderer modules into the registry.
   `cli.py` keeps its current public interface; only its dispatch switches from if/elif to registry
   lookup. Behaviour identical; golden files unchanged.
2. **Extract `layout`, `align`, `animate`** into real filters (`Diagram → Diagram` functions). The
   existing flag-driven path keeps calling them in the old order.
3. **Introduce `-vf` and `-filter_complex`** alongside the legacy flags (`--animate` still works).
4. **Add `-f` (format override) and `-o -`** (stdout).
5. **Add new sources** (`.drawio`, `.svg`, stdin) — one PR each.
6. **Mirror the pipeline shape in the Rust CLI** so both binaries present the same UX surface, with
   `.kymo.json` as the shared wire format.

At each step, the conformance corpus is the regression net — a stage migration is only landed once
all golden outputs match.

---

## 9. Open questions

- **Filter-chain DSL grammar.** Should `-vf` use FFmpeg's comma-separated `name=k=v:k=v` syntax
  verbatim, or a slightly less cramped variant (e.g. `layout(algo=dagre), theme(dark)`)? FFmpeg's
  syntax composes well with shell quoting but is famously dense.
- **Diagram merge semantics.** `concat=axis=v` is obvious; `overlay` is not. How are duplicate node
  ids resolved across inputs? Auto-prefixed, errored, or merged by label?
- **External layout engines.** `layout=algo=external` would shell out to dagre/elk; how is that
  wired into the registry without making it a hard dependency?
- **Streaming filter execution.** Diagrams are small enough that a whole-model pass is fine. But for
  very large BPMN imports, is it worth chunking by sub-process so layout runs per-process in
  parallel?
- **Rust ↔ Python parity.** If the Rust CLI is the "fast path" (just demux + decode + encode for
  pre-resolved sources), does it need the filter stage at all, or does it always require
  `.kymo.json` as input?

These are tracked here as research, not as blocking design decisions; they belong in a future
`docs/specs/kymo-pipeline/` once the scaffolding stage lands.

---

## 10. References

- FFmpeg documentation, "Detailed description" (pipeline stages):
  <https://ffmpeg.org/ffmpeg.html#Detailed-description>
- FFmpeg filter graph syntax: <https://ffmpeg.org/ffmpeg-filters.html>
- `docs/research/cli-design/` (`RES-CLI-001`) — FFmpeg-inspired CLI grammar for kymo.
- `packages/python/src/kymo/cli.py` — current Python dispatch.
- `packages/python/src/kymo/to_webp.py` — example of an already-pipelined stage (encode + bitstream
  tweak) that this proposal would formalise.
- `packages/rust/kymostudio-core/src/main.rs` — Rust CLI; today only the rasterizer tail.

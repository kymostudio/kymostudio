---
title: Pipeline & CLI Architecture — Requirements
document_id: FEAT-PIPECLI-001
version: "0.3"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js · packages/rust
audience: Engineers redesigning kymo's converter core and command-line surface
review_cycle: On a phase being delivered, or on scope change
supersedes: null
related_documents:
  - DESIGN-PIPECLI-001          # Design
  - TEST-PIPECLI-001            # Test documentation
  - PLAN-PIPECLI-001            # Plan
  - RES-PIPELINE-001            # Research: FFmpeg-inspired pipeline architecture
  - RES-CLI-001                 # Research: FFmpeg-inspired CLI grammar
  - KYMOJSON-MAP-001            # .kymo.json — the interchange wire format
  - BPMN-MAP-001                # BPMN import/export (a registered importer/encoder)
authors:
  - Vũ Anh
language: en
keywords:
  - pipeline
  - cli
  - registry
  - ffmpeg
  - importers
  - filters
  - encoders
  - requirements
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Pipeline & CLI Architecture — Requirements

| Field             | Value |
|-------------------|-------|
| Document ID       | `FEAT-PIPECLI-001` |
| Version           | 0.3 |
| Status            | Draft |
| Owner             | `packages/python` (kymo CLI) · `packages/js` · `packages/rust` |
| Related Documents | `DESIGN-PIPECLI-001`, `TEST-PIPECLI-001`, `PLAN-PIPECLI-001`; evidence base `RES-PIPELINE-001`, `RES-CLI-001` |

> This doc owns the `SN-PC-NN` stakeholder needs and derives the `FR-PC`/`NFR-PC`
> requirements from them. It promotes the two FFmpeg-inspired research notes
> (`RES-PIPELINE-001` internal architecture, `RES-CLI-001` external grammar) into a
> single baselined feature: **one converter core, two surfaces** — an internal
> registry-driven pipeline and the verb-less command line that drives it.

## 0. The feature and its document set

kymo wants to be to diagrams what FFmpeg is to video: **one binary that ingests many
source formats, transforms them through composable passes, and emits many targets.**
FFmpeg achieves this with a six-stage pipeline (demux → decode → filter graph → encode →
bitstream → mux), each stage pluggable through a registry, driven by a verb-less command
line that decouples *container* from *codec*. kymo does the same work today but it is
**scattered through `cli.py` if/elif branches**: importers, layout/alignment passes,
renderers, and writers are selected by suffix checks and boolean flags, never by registry.

This feature has two inseparable halves, both researched in prior art and both baselined here:

| Half | Concern | Research note |
|------|---------|---------------|
| **Pipeline** | The internal architecture — registry-driven stages, a single intermediate `Diagram`, format-agnostic filters. | `RES-PIPELINE-001` |
| **CLI** | The external surface — verb-less binary, target vs variant, pipes, capability discovery. | `RES-CLI-001` |

They are one feature because the CLI grammar **is** the user-facing projection of the
pipeline stages: `-i/-f` drives demux, `-vf` drives the filter graph, `-t/-c` selects an
encoder, `-o` drives the mux. Specifying them apart would let the two drift.

The document set: this `FEAT` (requirements) · `DESIGN-PIPECLI-001` (architecture &
mapping) · `TEST-PIPECLI-001` (V&V) · `PLAN-PIPECLI-001` (phased migration). The
normative interchange schema between implementations is `KYMOJSON-MAP-001`.

## 1. Scope and stakeholder needs (`SN-PC`)

**In scope:** a registry-driven six-stage pipeline (`demux · decode · filter · encode ·
post · mux`) in `packages/python`, mirrored in `packages/js`, with the Rust CLI aligned to
the same shape; a verb-less FFmpeg-style command line that drives it; an incremental
migration that keeps the conformance corpus green at every step.

**Out of scope (v1):** see `FEAT` §4. The detailed FFmpeg analysis and the rejected ideas
live in the research notes; this baseline takes only what §2/§3 require.

| ID | Need |
|----|------|
| `SN-PC-01` | Adding a new input or output format SHALL be a **one-file addition plus a registry entry**, not an edit to the dispatch core. |
| `SN-PC-02` | Model transforms (layout, alignment, animate, theme, …) SHALL be **composable, format-agnostic passes**, not logic scattered across the CLI and renderers. |
| `SN-PC-03` | The command line SHALL be **predictable and Unix-composable** — order-insensitive options, stdin/stdout pipes, conventional plumbing. |
| `SN-PC-04` | A single invocation SHALL produce **many targets from one parse/resolve**, not one process per target. |
| `SN-PC-05` | A source SHALL be **inspectable and rule-checkable without rendering** (the `ffprobe`/lint analogue). |
| `SN-PC-06` | The Python, JS, and Rust front-ends SHALL present the **same pipeline shape and CLI surface**, with `.kymo.json` as the interchange wire format. |
| `SN-PC-07` | The migration SHALL be **observable from the outside as a no-op** until a new surface is opted in — the conformance corpus is the regression net at each step. |

## 2. Functional requirements (`FR-PC`)

### 2.1 Pipeline core (internal) — realises `SN-PC-01`, `SN-PC-02`

| ID | Requirement | Trace |
|----|-------------|-------|
| `FR-PC-1` | A **single intermediate `Diagram` model** SHALL be the only artifact that flows `decode → filter → encode`. It is kymo's analogue of FFmpeg's raw frame. | `SN-PC-01,02` |
| `FR-PC-2` | **Importers** (decode) SHALL be registered one-per-format and return a `Diagram`. An importer SHALL NOT run layout or alignment — that is the filter stage's job. | `SN-PC-01` |
| `FR-PC-3` | **Filters** SHALL be `Diagram → Diagram` functions registered by name, **format-agnostic** (they know nothing about `.svg`/`.figma`). `layout`, `align`, `autosize`, `animate`, `theme` SHALL each be a filter. | `SN-PC-02` |
| `FR-PC-4` | **Encoders** SHALL be registered one-per-target. Raster targets (`png`, `webp`) SHALL encode as `Diagram → SVG → raster`, never directly. | `SN-PC-01` |
| `FR-PC-5` | A **post / bitstream** stage SHALL exist for transforms on the *encoded* payload (animation snapshot, SVG minify, font inlining, sanitize), distinct from the encoder. | `SN-PC-02` |
| `FR-PC-6` | The "already-resolved" property of pre-positioned sources SHALL become an **explicit `diagram.resolved` flag on the model** that an importer/filter sets — so the filter stage can skip layout deterministically, replacing the `src.suffix not in (".bpmn", ".json") and not had_bpmn` skip in `_load_resolved()`. Note this currently also covers a `.kymo` DSL source carrying a `bpmn { }` block (laid out by `bpmn_layout`, then alignment-skipped), so `resolved` is a per-`Diagram` property, **not** a property of the source format alone. | `SN-PC-02` |
| `FR-PC-7` | Stage dispatch SHALL be by **registry lookup, not `if/elif`** — replacing the suffix switch in `load()` and the boolean-flag target chain in `main()`. | `SN-PC-01` |

### 2.2 CLI grammar (external) — realises `SN-PC-03`, `SN-PC-04`, `SN-PC-05`

| ID | Requirement | Trace |
|----|-------------|-------|
| `FR-PC-8` | The **converter** SHALL be **verb-less** (`kymo [-i] <src> -t <target>`): the binary *is* the converter, `-i` only **marks** the input and is optional when the source is the first bare argument. Beside the converter, `icons` and `lint` are **reserved tooling subcommands** (a `git`/`cargo`-style first-token verb); they are the only reserved first tokens — every other first token is a converter source (the first-token checks in `main()`). | `SN-PC-03` |
| `FR-PC-9` | The output target SHALL be **a value** (`-t svg`, repeatable: `-t svg -t figma -t webp`) producing **many outputs from one parse/resolve**, not the first-truthy-flag chain of today. | `SN-PC-04` |
| `FR-PC-10` | An input-format override (`-f/--from`) SHALL decouple format from extension, enabling **stdin** (`-i -`); `-` as an output target SHALL write **stdout** (`-o -`). | `SN-PC-03` |
| `FR-PC-11` | **Container vs variant** SHALL be separated: animation is a *property* of the `svg`/`webp` target (`--anim <preset>`), not its own target. `--anim` against a target that cannot animate SHALL **warn**, not silently drop (today the `figma` branch in `main()` renders without the `animate` flag, so `--figma --animate` drops silently). | `SN-PC-03` |
| `FR-PC-12` | Output destination SHALL be controllable via `-o <path\|->`; absent `-o`, the legacy "next to input" default is retained. | `SN-PC-03` |
| `FR-PC-13` | A **filter-chain** option (`-vf "layout=algo=bpmn,theme=dark,animate=flow"`) SHALL drive the filter stage from the command line; a `-filter_complex` form SHALL support multi-input compose (`concat`, `overlay`). | `SN-PC-02,04` |
| `FR-PC-14` | Auxiliary modes SHALL split by kind: **converter-run modifiers** — `--probe` (inspect: format, size, node/edge counts, validity — no render) and `--watch` (re-render on change) — are **flags** on the converter; **standalone tooling verbs** — `icons` and `lint` (rule-check) — are **reserved subcommands** (`kymo lint <src>`), **not** flags. There is no `--lint` flag. (Deliberate divergence from `RES-CLI-001` §4, which modelled lint as a flag: tooling verbs read better as `git`/`cargo`-style subcommands.) | `SN-PC-05` |
| `FR-PC-15` | **Capability & help** SHALL be queryable: `-formats` (input formats), `-targets` (output targets), `-h [topic]` (layered help) — replacing the bare `print(__doc__)` in `main()`. | `SN-PC-05` |
| `FR-PC-16` | Options SHALL be **order-insensitive** — a flag means the same thing wherever it appears (kymo rejects FFmpeg's positional-option trap). Conventional plumbing `-y/-n` (overwrite) and `-q/-v` (verbosity) SHALL be honoured. | `SN-PC-03` |
| `FR-PC-17` | The `packages/js` `bin` (today `kymo`/`kymo-icons` via `render-cli.mjs`, which renders `.svg`/`.kymo`/`.bpmn`/`.kymo.json` → svg/png but with an ad-hoc flag surface) SHALL expose the **same verb-less grammar** as the Python CLI — the gap is grammar parity, not the absence of a binary. | `SN-PC-06` |

## 3. Non-functional requirements (`NFR-PC`)

| ID | Requirement | Trace |
|----|-------------|-------|
| `NFR-PC-1` | **Behaviour-preserving migration.** Each migration step SHALL leave all golden SVGs (`tests/test_diagrams.py`, `test_layout.py`, `test_edges.py`) and the BPMN corpus baselines byte-identical until a new surface is explicitly opted in. | `SN-PC-07` |
| `NFR-PC-2` | **Per-stage testability.** Each stage SHALL be pure (explicit inputs/outputs) so an importer (fixed bytes → `Diagram`), a filter (fixed `Diagram` → `Diagram`), and an encoder (fixed `Diagram` → bytes) are unit-testable in isolation, replacing today's end-to-end-only coverage. | `SN-PC-07` |
| `NFR-PC-3` | **Cross-language parity.** Python, JS, and Rust SHALL present the same pipeline shape and CLI surface; `.kymo.json` (`KYMOJSON-MAP-001`) SHALL be the byte-stable interchange between them. | `SN-PC-06` |
| `NFR-PC-4` | **No new runtime dependencies.** The `packages/js` **library** stays dependency-free (ESM + `.d.ts`); the only runtime dep of its CLI remains `kymostudio-core` (the wasm resvg build, for PNG/WebP) — no dep is added. The Python/JS registry uses only the standard library. External layout engines, if added, SHALL be optional (not a hard import). | — |
| `NFR-PC-5` | **Backwards compatibility during migration.** Legacy flags (`--animate`, `--figma`, `--excalidraw`, `--bpmn`, `--json`) SHALL keep working alongside the new grammar until the clean-break phase (see `PLAN-PIPECLI-001` §3), with a deprecation window. | `SN-PC-07` |

## 4. Constraints, assumptions, out-of-scope (v1)

- **Constraints.** Python ≥ 3.13 / uv (Python); zero-dep ESM (JS). The DSL spec `docs/DSL.md`
  and the `.kymo.json` schema `KYMOJSON-MAP-001` are normative and unchanged by this feature —
  the pipeline reorganises *dispatch*, not the model or the grammars.
- **Assumptions.** Diagrams are small whole graphs; **streaming does not apply** (a layout pass
  needs the entire model). kymo's "stream" is a single in-memory `Diagram`, not a chunked frame
  queue. Animations are declarative CSS computed offline — there is no real-time clock.
- **Out of scope (v1).** Multi-input compose semantics beyond `concat`/`overlay` (id-collision
  policy is an open question — see `RES-PIPELINE-001` §9); external layout engines (dagre/elk
  shell-out); a streaming/chunked filter executor; the filter-chain DSL grammar choice
  (FFmpeg's `name=k=v:k=v` vs a less cramped variant) — these are tracked as research, to be
  resolved by change-request once the scaffolding phase lands.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial requirements. Promotes `RES-PIPELINE-001` (six-stage architecture) and `RES-CLI-001` (verb-less grammar) into one baselined feature; minted needs `SN-PC-01..07`, requirements `FR-PC-1..17`, `NFR-PC-1..5`. |
| 0.2     | 2026-06-06 | Vũ Anh | Review corrections. Restated `FR-PC-17` (JS already ships a `bin`; the gap is verb-less grammar parity, not an absent binary) and `NFR-PC-4` (JS *library* is dependency-free; its CLI's lone dep stays `kymostudio-core`). Clarified `FR-PC-6` `resolved` as a per-`Diagram` flag covering the DSL-with-`bpmn{}` case. Replaced fragile `cli.py:NN` citations with function names (`load()`, `main()`, `_load_resolved()`). |
| 0.3     | 2026-06-06 | Vũ Anh | Grammar-consistency fix (review finding #5). `FR-PC-8`: converter is verb-less; `icons`/`lint` are reserved tooling subcommands beside it. `FR-PC-14`: split aux modes — `--probe`/`--watch` are converter-run flags, `icons`/`lint` are subcommands, **no `--lint` flag** (deliberate divergence from `RES-CLI-001` §4). See `DESIGN-PIPECLI-001` §3 for the grammar layers + parser-tokenisation rules that resolve the `-f`/`-formats`, `-t`/`-targets` ambiguity. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; the authoritative source is the main-branch
working tree, with history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes; available to anyone with repository
read access.

### B.3 Change Control
Changes require: update the relevant clause; keep the set
(`FEAT`/`DESIGN`/`TEST`/`PLAN`-`PIPECLI`) consistent; increment `version`; append a row to
Annex A. New stakeholder needs are minted here only, through a baseline or an approved
change-request under `CR/`.

### B.4 Backwards Compatibility
On any change, reconcile with `DESIGN-PIPECLI-001` (architecture) and `KYMOJSON-MAP-001`
(interchange schema) before release. `NFR-PC-1` governs migration: no golden/corpus churn
until a surface is opted in.

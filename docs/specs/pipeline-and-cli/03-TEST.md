---
title: Pipeline & CLI Architecture — Test Documentation
document_id: TEST-PIPECLI-001
version: "0.3"
issue_date: 2026-06-06
status: Draft
classification: Internal
owner: packages/python (kymo CLI) · packages/js · packages/rust
audience: Engineers verifying the kymo pipeline and CLI
review_cycle: On a phase being delivered, or on architecture change
supersedes: null
related_documents:
  - FEAT-PIPECLI-001            # Requirements (traced below)
  - DESIGN-PIPECLI-001          # Design
  - PLAN-PIPECLI-001            # Plan
  - KYMOJSON-MAP-001            # .kymo.json — the interchange wire format
authors:
  - Vũ Anh
language: en
keywords:
  - pipeline
  - cli
  - test
  - verification
  - conformance
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Pipeline & CLI Architecture — Test Documentation

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-PIPECLI-001` |
| Version           | 0.3 |
| Status            | Draft |
| Owner             | `packages/python` · `packages/js` · `packages/rust` |
| Related Documents | `FEAT-PIPECLI-001` (traced below), `DESIGN-PIPECLI-001`, `PLAN-PIPECLI-001` |

## 1. Test approach and levels

The migration is **behaviour-preserving** (`NFR-PC-1`), so the primary verification net is the
**existing golden/corpus suites used as regression oracles** — they must stay green and
byte-identical until a new surface is opted in. New tests are added per stage to lock in the
structure the requirements demand.

| Level | What | Tooling |
|-------|------|---------|
| **Regression (oracle)** | Golden SVGs and BPMN baselines unchanged across each migration step | `tests/test_diagrams.py`, `test_layout.py`, `test_edges.py`, `test_bpmn_corpus.py` |
| **Unit (per stage)** | Importer (bytes → `Diagram`), filter (`Diagram` → `Diagram`), encoder (`Diagram` → bytes) in isolation | `pytest` (Python), `node --test` (JS) |
| **Integration (CLI)** | The verb-less grammar end-to-end: `-t`/`-f`/`-o`/`-vf`/`--probe`/`-formats` | `pytest` driving `kymo` argv; JS `node --test` driving the `bin` |
| **Parity** | Python ↔ JS ↔ Rust produce byte-identical `.kymo.json` and SVG | conformance suite (`conformance/golden/`) |

## 2. Test items, environment, tooling

**Items:** `pipeline/{demux,mux}.py`, `pipeline/importers/*`, `pipeline/filters/*`,
`pipeline/encoders/*`, `pipeline/post/*`, the rewired `cli.py`, the JS `bin`, the Rust CLI.
**Environment:** Python ≥ 3.13 / uv; Node (JS `node --test`); Rust toolchain. **Oracle data:**
the committed golden SVGs, `tests/corpus_bpmn/baseline.json`, `conformance/golden/`.

## 3. Test cases (`TC-PC`)

| ID | Title | Verifies | Procedure → Expected |
|----|-------|----------|----------------------|
| `TC-PC-1` | **Golden no-op across migration** | `NFR-PC-1` | After each migration step, run the golden + corpus suites → all byte-identical to pre-migration. |
| `TC-PC-2` | **Single `Diagram` flows the pipeline** | `FR-PC-1` | Feed each importer; assert the object handed to a filter and to an encoder is the same `Diagram` type. |
| `TC-PC-3` | **Importer registry, one-file add** | `FR-PC-2`, `FR-PC-7` | Register a stub importer via a registry entry only (no `cli.py` edit) → `kymo -f stub in` decodes it. |
| `TC-PC-4` | **Importers do not layout** | `FR-PC-2` | A `kymo_dsl` decode returns a `Diagram` with **unresolved** positions until the `layout` filter runs. |
| `TC-PC-5` | **Filters are `Diagram → Diagram` and format-agnostic** | `FR-PC-3` | `layout`/`align`/`autosize`/`theme`/`animate` each take and return a `Diagram`; none imports an encoder module. |
| `TC-PC-6` | **`resolved` flag skips layout** | `FR-PC-6` | A `.bpmn` / `.kymo.json` decode sets `diagram.resolved=True`; **and** a `.kymo` source carrying a `bpmn { }` block becomes `resolved` after the `bpmn_layout` filter — in all three the default chain skips `align`, and output matches today's `src.suffix not in (".bpmn",".json") and not had_bpmn` path. |
| `TC-PC-7` | **Encoder registry; one parse, many targets** | `FR-PC-4`, `FR-PC-9` | `kymo in.kymo -t svg -t figma -t webp` → three outputs, **one** decode/filter pass (assert parse called once). |
| `TC-PC-8` | **Raster goes through SVG** | `FR-PC-4` | `png`/`webp` encode = `Diagram → SVG → raster`; assert the SVG encoder is invoked en route. |
| `TC-PC-9` | **Post stage owns animation snapshot** | `FR-PC-5` | `make_frame_svg` runs in `post/`, on the encoded SVG, not inside the SVG encoder. |
| `TC-PC-10` | **Mux: `-o` and stdout** | `FR-PC-10`, `FR-PC-12` | `-o out.svg` writes there; `-o -` writes stdout; absent `-o`, "next to input" default holds. |
| `TC-PC-11` | **Verb-less grammar; `-i` optional; tooling subcommands** | `FR-PC-8`, `FR-PC-14` | `kymo in.kymo -t svg` ≡ `kymo -i in.kymo -t svg`; `icons`/`lint` dispatch as reserved first-token **subcommands** (`kymo lint <src>`); there is **no `--lint` flag** (passing `--lint` is an unknown-option error, not a lint run). |
| `TC-PC-12` | **Format override enables stdin** | `FR-PC-10` | `cat in.kymo \| kymo -i - -f kymo -t svg -o -` renders from a pipe. |
| `TC-PC-13` | **Container vs variant; `--anim` warns not drops** | `FR-PC-11` | `kymo in.kymo -t figma --anim flow` → warning emitted (not silent), figma still produced. |
| `TC-PC-14` | **Filter-chain `-vf`** | `FR-PC-13` | `-vf "layout=algo=bpmn,theme=dark,animate=flow"` applies all three filters in order. |
| `TC-PC-15` | **`--probe` inspects without render** | `FR-PC-14` | `kymo --probe in.bpmn` prints format/size/node+edge counts/validity; no output file written. |
| `TC-PC-16` | **Capability & help flags; whole-token parse** | `FR-PC-15`, `FR-PC-16` | `-formats` lists inputs; `-targets` lists targets; `-h theme` shows topic help. **`-formats`/`-targets` parse as one atomic token** — never as `-f ormats` / `-t argets` — so they coexist with `-f`/`-t`. |
| `TC-PC-17` | **Options order-insensitive; tokenisation rules** | `FR-PC-16` | `kymo -t svg in.kymo` ≡ `kymo in.kymo -t svg`; `-y/-n`, `-q/-v` honoured. **No bundling** (`-qv` is an error, not `-q -v`); a short value is the next token or `-t=svg`, never glued (`-tsvg` invalid). |
| `TC-PC-18` | **JS `bin` grammar parity** | `FR-PC-17`, `NFR-PC-3` | The JS `bin` (already present as `kymo`/`kymo-icons`) exposes the **same verb-less grammar** as Python — verify grammar parity, not mere existence; `.kymo.json` and SVG outputs are byte-identical to Python (`conformance/golden/`). |
| `TC-PC-19` | **Per-stage unit isolation** | `NFR-PC-2` | An importer test (fixed bytes), a filter test (fixed `Diagram`), an encoder test (fixed `Diagram`) each run with no other stage. |
| `TC-PC-20` | **Legacy flags still work (deprecation window)** | `NFR-PC-5` | `--figma`/`--excalidraw`/`--bpmn`/`--json`/`--animate` produce identical output to pre-migration until the clean-break phase. |

## 4. Pass/fail criteria

- **PASS** ⇔ all golden/corpus oracles byte-identical at every migration step (`TC-PC-1`),
  every `TC-PC` green, and parity outputs byte-identical across Python/JS (`TC-PC-18`).
- **FAIL** ⇔ any golden/corpus drift not justified by an intentional, documented change; any
  importer running layout (`TC-PC-4`); any filter importing an encoder (`TC-PC-5`); any
  multi-target run re-parsing (`TC-PC-7`); any silent `--anim` drop (`TC-PC-13`).

## 5. Requirements traceability matrix

| Requirement | Verified by |
|-------------|-------------|
| `FR-PC-1` | `TC-PC-2` |
| `FR-PC-2` | `TC-PC-3`, `TC-PC-4` |
| `FR-PC-3` | `TC-PC-5` |
| `FR-PC-4` | `TC-PC-7`, `TC-PC-8` |
| `FR-PC-5` | `TC-PC-9` |
| `FR-PC-6` | `TC-PC-6` |
| `FR-PC-7` | `TC-PC-3` |
| `FR-PC-8` | `TC-PC-11` |
| `FR-PC-14` | `TC-PC-11` (subcommands / no `--lint`), `TC-PC-15` (`--probe`) |
| `FR-PC-9` | `TC-PC-7` |
| `FR-PC-10` | `TC-PC-10`, `TC-PC-12` |
| `FR-PC-11` | `TC-PC-13` |
| `FR-PC-12` | `TC-PC-10` |
| `FR-PC-13` | `TC-PC-14` |
| `FR-PC-15` | `TC-PC-16` |
| `FR-PC-16` | `TC-PC-16` (whole-token), `TC-PC-17` |
| `FR-PC-17` | `TC-PC-18` |
| `NFR-PC-1` | `TC-PC-1` |
| `NFR-PC-2` | `TC-PC-19` |
| `NFR-PC-3` | `TC-PC-18` |
| `NFR-PC-4` | (review — no new runtime deps in `pyproject`/`package.json`) |
| `NFR-PC-5` | `TC-PC-20` |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-06 | Vũ Anh | Initial test documentation. 20 `TC-PC` cases over pipeline stages + CLI grammar; full RTM against `FR-PC`/`NFR-PC`. |
| 0.2     | 2026-06-06 | Vũ Anh | Review corrections. `TC-PC-6` extended to cover the DSL-with-`bpmn{}` resolved case (not only `.bpmn`/`.kymo.json`); `TC-PC-18` reframed as grammar parity (JS already ships a `bin`). |
| 0.3     | 2026-06-06 | Vũ Anh | Grammar-consistency fix (review finding #5). `TC-PC-11` asserts `icons`/`lint` are subcommands and there is no `--lint` flag; `TC-PC-16` asserts `-formats`/`-targets` parse as whole tokens; `TC-PC-17` asserts no bundling + no glued short value. RTM: added `FR-PC-14` row, pointed `FR-PC-16` at `TC-PC-16`+`TC-PC-17`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled in the project repository; authoritative source is the main-branch working
tree, history via `git log`.

### B.2 Distribution
Implicit — checked in alongside the feature it describes.

### B.3 Change Control
Changes require: update the affected case/RTM row; keep `FEAT`/`DESIGN`/`PLAN`-`PIPECLI`
consistent; increment `version`; append to Annex A.

### B.4 Backwards Compatibility
The golden/corpus oracle (`TC-PC-1`) is the contract that migration is behaviour-preserving;
no oracle drift is accepted without a documented intentional change.

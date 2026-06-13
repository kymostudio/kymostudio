---
title: Mermaid Format — Requirements (umbrella)
document_id: FEAT-MERMAID-001
version: "0.3"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine) · consumed by packages/python · packages/js
audience: Engineers implementing and verifying any Mermaid-family module
review_cycle: On a module being added/delivered, or on family-scope change
supersedes: null
related_documents:
  - DESIGN-MERMAID-001            # Design (umbrella)
  - TEST-MERMAID-001              # Test documentation (umbrella)
  - PLAN-MERMAID-001              # Plan (umbrella)
  - FEAT-MERMAID-FLOWCHART-001    # module: flowchart requirements (implemented)
  - FEAT-MERMAID-SEQUENCE-001     # module: sequence (reserved)
  - FEAT-MERMAID-STATE-001        # module: state (reserved)
  - FEAT-MERMAID-CLASS-001        # module: class (reserved)
  - FEAT-MERMAID-ER-001           # module: er (reserved)
  - MERMAID-MAP-001               # Mermaid element → kymo mapping (normative)
  - KYMOJSON-MAP-001              # .kymo.json — the import's output contract
  - BPMN-MAP-001                  # sibling importer (BPMN) for reference
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - requirements
  - import
  - flowchart
---

# Mermaid Format — Requirements (umbrella)

> **Scope.** This feature owns the Mermaid **format front-end** (parsing/import of `.mmd` into
> the kymo model) and the Mermaid **diagram-type roadmap** (flowchart implemented;
> sequence/state/class/er reserved). The format-neutral IR, the Mermaid/D2/DOT **text emitters**,
> the **D2/DOT importers**, the pure-Rust **SVG renderer**, and the **draw.io encoder** are owned
> by the sibling flowchart hub `FEAT-FLOWCHART-001` — this feature *feeds* that hub via the IR; it
> does not own those parts.

## Part A — ConOps / StRS (concept & stakeholder needs)

kymo already imports BPMN. **Mermaid** is the most widely-authored diagram-as-code
syntax, so importing it lets users bring existing `.mmd` diagrams into kymo's
renderer (animated SVG, Figma, Excalidraw, PNG/PDF) without rewriting them.

This feature also serves a second, architectural goal: it is the **first
subsystem of the kymo engine to live in the Rust core** (`kymostudio-core`).
Rather than duplicate the importer in Python and JS (as BPMN is today), the
Mermaid parser + diagram model + layered layout are written once in Rust and
exposed to Python (PyO3) and JS (wasm). The Rust import emits the resolved model
as `.kymo.json` (KYMOJSON-MAP-001); the existing Python/JS back-ends render it.

**Stakeholder needs (SN):**

- **SN-1** A user can convert a Mermaid flowchart file to a kymo diagram.
- **SN-2** The conversion runs without a browser or Node — pure Rust.
- **SN-3** The output is the standard `.kymo.json` model, identical in shape to
  what the DSL and BPMN front-ends produce, so every kymo back-end consumes it.
- **SN-4** The design admits more Mermaid diagram types later without reworking
  the dispatch or the model.

## Part B — Introduction & family map

The Mermaid family is an **umbrella** with one module per diagram type. Each module
follows the repo's 4-file structure under `modules/<type>/`.

| Module | document_id | status | layout fit |
|---|---|---|---|
| flowchart | `FEAT-MERMAID-FLOWCHART-001` | **implemented (Phase 1)** | node-edge + Sugiyama |
| sequence | `FEAT-MERMAID-SEQUENCE-001` | reserved | needs own timeline layout |
| state | `FEAT-MERMAID-STATE-001` | reserved | node-edge + Sugiyama (reusable) |
| class | `FEAT-MERMAID-CLASS-001` | reserved | needs compartment sizing/own layout |
| er | `FEAT-MERMAID-ER-001` | reserved | node-edge topology, own glyphs |

Pipeline: `mermaid::parse` (dispatch by header) → `layout::layout_flowchart`
(positions) → `kymojson::export` (serialize). See DESIGN-MERMAID-001.

## Part C — SRS (software requirements)

**Functional (FR):**

- **FR-1** Parse `graph` / `flowchart` with directions `TD`/`TB`/`BT`/`LR`/`RL`.
- **FR-2** Recognise node shapes `[]`, `()`, `([])`, `[[]]`, `[()]`, `(())`, `{}`,
  `{{}}`, `>]` and map them per MERMAID-MAP-001 (`{}` → new `diamond` shape).
- **FR-3** Recognise edges `-->`, `---`, `-.->`, `-.-`, `==>`, `===` with optional
  `|label|`; set `dashed` / `no_arrow` / `label` accordingly.
- **FR-4** Support node chains (`A --> B --> C`) and forward references; a later
  explicit shape/label upgrades an earlier bare node.
- **FR-5** Map `subgraph … end` to a `cluster` region containing its members.
- **FR-6** Lay out the (coordinate-less) graph deterministically into positioned
  components and a sized canvas.
- **FR-7** Serialize to `.kymo.json` byte-compatible with the kymo model contract.
- **FR-8** Reject unsupported diagram types with a clear, typed error naming the
  type; report syntax errors with a line number.
- **FR-9** Expose the entry point as a Rust API (`mermaid_to_kymojson`), a CLI
  path (`.mmd`/`.mermaid` → `.kymo.json`), a PyO3 function, and a wasm function.

**Non-functional (NFR):**

- **NFR-1 (determinism)** Identical input → byte-identical output across runs and
  platforms (fixed sweep counts, stable secondary sort keys, half-to-even rounding).
- **NFR-2 (no heavy deps)** No new crate dependencies; compiles under
  `--no-default-features` and into the wasm bundle.
- **NFR-3 (contract fidelity)** Output round-trips through Python `from_kymojson`
  and re-exports byte-identically via `to_kymojson`.

**Out of scope (Phase 1):** diagram types other than flowchart; inline
`-- text --` edge labels; nested-region nesting.

> **Since shipped (later phases):** the items originally deferred here have since
> landed — the Python/JS renderers draw icon-less flowchart nodes + the `diamond`
> glyph (Phase 2). The rendering and cross-format paths that grew out of this work were
> **promoted into the flowchart hub `FEAT-FLOWCHART-001`** and are owned there, not here:
> the pure-Rust SVG renderer (`crate::flowchart_svg`, `mermaid_to_svg`), the text emitters
> (Mermaid/D2/DOT), the draw.io encoder, and the D2/DOT *importers*. This feature's parse
> output (the IR / `.kymo.json`) is what feeds those — see MERMAID-MAP-001 §8 and
> `FEAT-FLOWCHART-001`.

---
title: kymo.json Interchange Format — Design
document_id: DESIGN-KYMOJSON-001
version: "1.0"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.json serializer/loader and its JS port
review_cycle: On phase completion, or on schema change
supersedes: null
related_documents:
  - INTRO-KYMOJSON-001          # Introduction
  - FEAT-KYMOJSON-001           # Requirements (traced below)
  - TEST-KYMOJSON-001           # Test documentation
  - PLAN-KYMOJSON-001           # Plan
  - KYMOJSON-MAP-001            # The normative schema
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.json
  - design
  - serializer
  - loader
  - determinism
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.json Interchange Format — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-KYMOJSON-001                                |
| Version      | 1.0                                                |
| Status       | Released                                           |
| Issue Date   | 2026-05-24                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-KYMOJSON-001, FEAT-KYMOJSON-001, TEST-KYMOJSON-001, PLAN-KYMOJSON-001 |

Realises FEAT-KYMOJSON-001 (FR/NFR cited per clause). The serialized shape is the
normative schema KYMOJSON-MAP-001. Covers ISO/IEC/IEEE 12207 Architecture & Design.

## 1. Scope

The serializer (`Diagram` → `.kymo.json`) and loader (`.kymo.json` → `Diagram`),
mirrored in `packages/python` (`to_kymojson.py` / `from_kymojson.py`) and
`packages/js` (`to-kymojson.ts` / `from-kymojson.ts`), plus CLI wiring.

## 2. Envelope & model body (FR-1, FR-2)

`export(d)` emits `{ "format": "kymo.json", "version": 1, "diagram": model_dict(d) }`,
JSON with 2-space indent + trailing newline. `model_dict` builds the body: `width`,
`height`, `title`, `subtitle`, then `components` / `regions` / `edges` via an explicit
ordered field map (camelCase → snake_case in JS; native in Python). A normalisation
pass converts tuples → arrays, collapses integral floats to ints and `-0`→`0`, and
keeps genuine fractions (so a real divergence surfaces). A field-completeness guardrail
fails loudly if the model gains a field the serializer doesn't emit (Python via
`dataclasses.fields`; JS via the factory's `Object.keys`).

## 3. Layout-tree serialization (FR-3)

`layout_trees` are serialized in a language-neutral tagged-object form —
`{ "t": "id", "id": … }` (leaf) / `{ "t": "group", "dir": …, "children": [ … ] }`
(group). This reconciles the two native shapes: Python tuples `("id", cid)` /
`("group", dir, [children])` and JS `LayoutNode` objects. Only the **basic** form is
stored on a resolved `Diagram` (region inlining/padding is transient), so no padding
field is serialized. The loader rebuilds each language's native representation.

## 4. Loader (FR-5, FR-6)

`parse(text)` checks `format == "kymo.json"` (else raises), reads `diagram`, and
rebuilds the model: Python constructs the dataclasses, **coercing JSON arrays back to
tuples** for the tuple-typed fields (`pos`/`size`/`bounds`/offsets/`via`/`points`) and
rebuilding native layout-tree tuples; JS uses the `makeComponent`/`makeRegion`/
`makeEdge`/`makeDiagram` factories (arrays stay arrays). Unknown top-level fields are
ignored. The result is fully resolved, so `cli.load()` returns it with no layout/
external specs and `cli.main()` **skips** `layout()` / `resolve_alignments()` — the
same path `.bpmn` takes.

## 5. Determinism (FR-4)

Fields are emitted in a fixed order, ids verbatim, coordinates integerised, so a given
`Diagram` yields byte-identical JSON across runs and across the Python/JS
implementations (`export∘parse∘export` is idempotent).

## 6. Integration (FR-7, FR-8)

- **CLI** — `cli.py` adds a `--json` target writing `src.with_name(stem + ".kymo.json")`
  via `to_kymojson.export`, and a `.json` branch in `load()` → `from_kymojson.parse`
  (`Path("x.kymo.json").suffix == ".json"`); the suffix guard and the resolve-skip
  condition both add `.json`.
- **Python API** — `to_kymojson.export(d) -> str`, `from_kymojson.parse(text) -> Diagram`.
- **JS** — `to-kymojson.ts` (`toKymoJson`, `modelDict`) + `from-kymojson.ts`
  (`parseKymoJson`), exported from `index.ts`. No JS CLI (library only).

## 7. Single source of truth & cross-language parity (NFR-1)

`model_dict` / `modelDict` is the **one** canonical model serializer: the conformance
suite imports it (replacing its former in-test copy), so the cross-language comparison
— including `layout_trees` — is exactly what `.kymo.json` persists. Byte-identical
output across languages is achievable because both use 2-space-indent JSON with the
same key order and the same number normalisation; the conformance corpus gates it.

## 8. Render-equivalence (NFR-2)

Because the body carries every resolved field plus `layout_trees`, `render(load(
export(d)))` equals `render(d)` for SVG / Excalidraw / BPMN export, and the Figma
back-end stays on its hybrid path (it dispatches on non-empty `layout_trees`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — design of the `.kymo.json` serializer/loader, the layout-tree canonical form, CLI wiring, and the single-source-of-truth conformance reuse. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/kymo-json/03-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the requirement IDs it traces
(FR-1…FR-8, NFR-1…NFR-4) consistent with FEAT-KYMOJSON-001 and KYMOJSON-MAP-001;
increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-KYMOJSON-001
and KYMOJSON-MAP-001. Reconcile any deviation there before release.

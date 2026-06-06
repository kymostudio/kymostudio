---
title: "BPMN Animation CR-002 — Design (kymo.anim format + no-JS SVG player)"
document_id: DESIGN-BPMN-ANIMATE-002
version: "0.3"
issue_date: 2026-05-31
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the kymo.anim parser, validator, generator, and SVG player in Python and JS
review_cycle: Until CR-002 is closed
supersedes: null
related_documents:
  - INTRO-BPMN-ANIMATE-002
  - FEAT-BPMN-ANIMATE-002
  - TEST-BPMN-ANIMATE-002
  - PLAN-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
  - KYMOJSON-MAP-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - kymo.anim
  - self-contained-format
  - json-schema
  - validator
  - generator
  - css-motion-path
  - bpmn-animate
---

# BPMN Animation CR-002 — Design (kymo.anim format + no-JS SVG player)

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-BPMN-ANIMATE-002` |
| Version           | 0.3 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-ANIMATE-002` (requirements, traced below), `TEST-BPMN-ANIMATE-002`, `PLAN-BPMN-ANIMATE-002`, `DESIGN-BPMN-ANIMATE-001` (umbrella), `KYMOANIM-MAP-001` (the format) |

Realises `FEAT-BPMN-ANIMATE-002` (`FR-CR2-*`/`NFR-CR2-*`). Refines the umbrella pipeline of
`DESIGN-BPMN-ANIMATE-001`. The format is normative in `KYMOANIM-MAP-001`.

## 1. Overview

Five parts, mirrored Python (`packages/python/src/kymo/`) + JS (`packages/js/src/`): **(A)** parse;
**(B)** validate; **(C)** generate (diagram→anim); **(D)** build a `Diagram` from the scene; **(E)**
compile the token CSS.

```
*.kymo.anim.json ─parse─► AnimDoc ─validate─► ok ─build─► Diagram ─render(+timeline)─► animated SVG
                                     │ errors                (no layout pass)
diagram (.bpmn/.kymo) ─import/layout─┴─gen_anim──► AnimDoc   (one-way, --anim-init)
```

New modules (suggested): `from_kymoanim.py` (parse), `anim_validate.py` (schema + semantic),
`anim_gen.py` (diagram→anim), `anim_build.py` (AnimDoc→Diagram), token CSS in `to_svg.py`; JS mirrors.

## 2. Parse (FR-CR2-01)

`from_kymoanim.parse(text) -> AnimDoc` (envelope + `controls` + `nodes` + `flows` + `timeline`),
checking `format == "kymo.anim"`, tolerating unknown fields. A timeline step is a tagged record
(exactly one of `node`/`flow`). JS mirror `parseKymoAnim`.

## 3. Validation (FR-CR2-02) — two layers, dependency-free

1. **Structural** — built-in checker against the `KYMOANIM-MAP-001` schema (required fields, enums,
   per-step `oneOf`, `additionalProperties:false`). No JSON-Schema library; the `kymo.anim.schema.json`
   is shipped for editors.
2. **Semantic** — `validate_anim(doc)`: build id sets of `nodes` + `flows`; check every `flow.from`/
   `flow.to` and every timeline `node`/`flow`/`branch` resolves **internally**; `branch` is an
   outgoing flow of its gateway; `step` strictly increasing; `at`/`path` finite (and within `canvas`).
   Return `[(id_or_step, message)]`; a player aborts on any error.

## 4. Generator (FR-CR2-03) — diagram → kymo.anim

`gen_anim(diagram) -> AnimDoc`: from a resolved `Diagram` (after import/layout), emit `nodes`
(`shape`→`type` per `BPMN-MAP-001`, `pos`→`at`, `size`/`label`), `flows` (`bpmn_flow`→`kind`,
`points`→`path`), and a default `timeline` — a token-order traversal of sequence flows from the start
event(s) (topological where acyclic; bounded walk on cycles; deterministic illustrative `branch` per
gateway). Deterministic; the result validates. Exposed as `--anim-init`.

## 5. Build + token CSS (FR-CR2-04) — no-JS SVG

- **Build (`anim_build`)** — turn the `AnimDoc` into a kymo `Diagram`: each `node` → a `Component`
  (`type`→`bpmn-*` shape, `at`→`pos`, `size`/`label`); each `flow` → an `Edge` (`from`/`to`,
  `kind`→`bpmn_flow`, explicit `path`→`points`, else orthogonal route). **Skip `layout()` /
  `resolve_alignments()`** — positions are explicit, exactly as the BPMN front-end does. Render the
  built `Diagram` with the existing `to_svg`.
- **Token** — for each `flow` step, emit a `<circle>` (two-circle "glow") travelling the flow path via
  **CSS Motion Path**:
  ```css
  #tok-<flowid> { offset-path: path('<flow path d>');
                  animation: token-run <duration>s linear <delay>s infinite; }
  @keyframes token-run { from { offset-distance: 0% } to { offset-distance: 100% } }
  ```
  `<delay>`/`<duration>` from step order/`duration` × `controls.speed`. Trail = existing
  `kymo-edge-flow` dash. `offset-path` is new; SMIL `<animateMotion><mpath>` is the raster fallback
  (CR-005). First frame = static; keyframes under `@media (prefers-reduced-motion: no-preference)`.
- **Additivity (NFR-CR2-01)** — this is a new front-end + player; existing render paths are untouched,
  so their goldens stay byte-identical.

## 6. Integration (FR-CR2-05)

- **CLI** (`cli.py`) — `load()` dispatches `*.kymo.anim.json` → parse → validate → build → render
  (writing `-animated.svg`); `--anim-init <diagram>` → `gen_anim` → serialise. The generic `--animate`
  and existing formats are unchanged.
- **Python API** — `parse`, `validate_anim`, `gen_anim`, and `render` over the built `Diagram`.
- **JS** — mirror `parseKymoAnim`/`validateAnim`/`genAnim` + the SVG player; dependency-free.

## 7. Parity & determinism (FR-CR2-05, NFR-CR2-03)

Parse/validate/generate/build/compile are language-neutral; Python and JS produce equivalent verdicts,
generated files, built diagrams, and CSS. `pyRound` where Python rounds. Gated by the conformance
suite alongside `KYMOJSON-MAP-001`.

## 8. Requirements traceability

| `FR-CR2` / `NFR-CR2` | Realised by |
|----------------------|-------------|
| `FR-CR2-01` | §2 parse |
| `FR-CR2-02` | §3 validation |
| `FR-CR2-03` | §4 generator |
| `FR-CR2-04` | §5 build + token CSS |
| `FR-CR2-05` | §6 integration |
| `NFR-CR2-01` | §5 additivity |
| `NFR-CR2-02` | §3 (built-in checker) + §5 (CSS only) + §6 (JS dep-free) |
| `NFR-CR2-03` | §7 |
| `NFR-CR2-04` | §5 (first frame / reduced motion) |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Token-schedule algorithm + schedule-parameterised CSS preset. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-scoped to a descriptor: parse → validate → drive; default-gen; descriptor-driven CSS. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to the self-contained format.** Pipeline parse → validate (internal) → **build a `Diagram` from the explicit scene (no layout)** → render; §4 generator is diagram→`kymo.anim`; §5 token via CSS Motion Path over the built diagram; traceability to revised `FR-CR2-*`. |

---
title: "BPMN Animation CR-002 — Test Documentation (kymo.anim format + no-JS SVG player)"
document_id: TEST-BPMN-ANIMATE-002
version: "0.3"
issue_date: 2026-05-31
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the kymo.anim format, validator, generator, and SVG player
review_cycle: Until CR-002 is closed
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-002
  - DESIGN-BPMN-ANIMATE-002
  - PLAN-BPMN-ANIMATE-002
  - TEST-BPMN-ANIMATE-001
  - KYMOANIM-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - test
  - kymo.anim
  - self-contained-format
  - validation
  - additivity
  - traceability
  - bpmn-animate
---

# BPMN Animation CR-002 — Test Documentation (kymo.anim format + no-JS SVG player)

| Field             | Value |
|-------------------|-------|
| Document ID       | `TEST-BPMN-ANIMATE-002` |
| Version           | 0.3 |
| Status            | **Open** |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-BPMN-ANIMATE-002` (requirements, traced below), `DESIGN-BPMN-ANIMATE-002`, `PLAN-BPMN-ANIMATE-002`, `TEST-BPMN-ANIMATE-001` (parent), `KYMOANIM-MAP-001` (format + schema) |

Verifies `FEAT-BPMN-ANIMATE-002` (`FR-CR2-*`/`NFR-CR2-*`). Headline checks: **file validation**
(structural + internal semantic) and **additivity** (existing render paths unchanged).

## 1. Test approach and levels

- **Unit** — parse; structural validation (schema-valid vs malformed); semantic validation (internal
  dangling refs, non-increasing `step`, `branch` not an outgoing flow, non-finite coords);
  `gen_anim` yields a valid file.
- **Integration** — build a `Diagram` from a `kymo.anim` (no layout pass) + token `offset-path` per
  the timeline; CLI render + `--anim-init`.
- **Additivity** — existing `.bpmn`/`.kymo`/`.kymo.json` renders byte-identical to goldens;
  `test_bpmn_corpus.py` baseline unchanged.
- **Parity** — Python and JS produce equivalent verdicts, generated files, built diagrams, markup.

## 2. Test items, environment, tooling

`packages/python` (`pytest`), `packages/js` (`npm test`), the golden-SVG fixtures, the BPMN corpus
harness, `samples/order-flow.kymo` + a sample `order-flow.kymo.anim.json`, and the shipped
`kymo.anim.schema.json`.

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-CR2-01** | Parse | `FR-CR2-01` | A well-formed `kymo.anim` parses to the expected `nodes`/`flows`/`timeline`; unknown fields tolerated |
| **TC-CR2-02** | Schema validation | `FR-CR2-02` | Schema-valid accepted; missing/extra fields, bad enums/types, non-`oneOf` steps rejected with the offending id/step |
| **TC-CR2-03** | Semantic validation | `FR-CR2-01`, `FR-CR2-02` | Dangling `flow.from`/`to`/timeline refs, non-increasing `step`, `branch` not an outgoing flow, non-finite coords rejected |
| **TC-CR2-04** | Validate-before-render | `FR-CR2-02` | A player refuses an invalid file; errors name the id/step |
| **TC-CR2-05** | Generation | `FR-CR2-03` | `--anim-init` converts a `.bpmn`/`.kymo` into a file that re-validates; timeline traverses sequence flows in process order |
| **TC-CR2-06** | Build + SVG | `FR-CR2-04` | Built `Diagram` uses explicit positions (no layout pass); each `flow` step → a token `offset-path` timed from the timeline; CSS only (no `<script>`) |
| **TC-CR2-07** | Additivity | `FR-CR2-05`, `NFR-CR2-01` | Existing `.bpmn`/`.kymo`/`.kymo.json` renders byte-identical to goldens; corpus baseline unchanged |
| **TC-CR2-08** | Determinism & parity | `FR-CR2-05`, `NFR-CR2-03` | Same file → byte-stable; Python/JS verdicts + built diagrams + markup equivalent |
| **TC-CR2-09** | No-JS / dep-free | `NFR-CR2-02` | Animated SVG no `<script>`; validator built-in (no JSON-Schema lib); no new runtime dep (CI) |
| **TC-CR2-10** | Reduced motion / first frame | `NFR-CR2-04` | `prefers-reduced-motion` degrades to static; first frame is the valid static diagram |

## 4. Pass/fail criteria

CR-002 passes when `TC-CR2-01..10` pass and the full Python suite (incl. golden-SVG + BPMN-corpus
gates) and JS `npm test` are green. **Any** drift on the **existing input paths** is a **failure**,
not a re-baseline.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| `FR-CR2-01` | TC-CR2-01, TC-CR2-03 |
| `FR-CR2-02` | TC-CR2-02, TC-CR2-03, TC-CR2-04 |
| `FR-CR2-03` | TC-CR2-05 |
| `FR-CR2-04` | TC-CR2-06 |
| `FR-CR2-05` | TC-CR2-07, TC-CR2-08 |
| `NFR-CR2-01` | TC-CR2-07 |
| `NFR-CR2-02` | TC-CR2-09 |
| `NFR-CR2-03` | TC-CR2-08 |
| `NFR-CR2-04` | TC-CR2-10 |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Schedule order, CSS mapping, CLI, golden-safety, parity, no-JS, reduced-motion. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-scoped to a descriptor: parse, schema + semantic validation, validate-before-render, default-gen, descriptor-driven SVG, sidecar/golden-safety. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to the self-contained format.** Internal semantic validation, generation (diagram→anim), build-from-scene (no layout) + SVG token, additivity (existing paths byte-identical); traceability to revised `FR-CR2-*`. |

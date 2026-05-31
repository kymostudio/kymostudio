---
title: BPMN Animation — Test Documentation
document_id: TEST-BPMN-ANIMATE-001
version: "0.3"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the BPMN animation feature
review_cycle: On phase/CR completion, or on format-schema change
supersedes: null
related_documents:
  - INTRO-BPMN-ANIMATE-001   # Introduction
  - FEAT-BPMN-ANIMATE-001    # Requirements (traced below)
  - DESIGN-BPMN-ANIMATE-001  # Design
  - PLAN-BPMN-ANIMATE-001    # Plan
  - KYMOANIM-MAP-001         # the kymo.anim format + JSON Schema
  - KYMOJSON-MAP-001         # kymo.json model (shared conventions)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - animation
  - test
  - self-contained-format
  - kymo.anim
  - validation
  - traceability
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Animation — Test Documentation

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | TEST-BPMN-ANIMATE-001                              |
| Version      | 0.3                                                |
| Status       | Draft                                              |
| Issue Date   | 2026-05-31                                         |
| Owner        | `diagrams/` project                                |
| Related      | INTRO-BPMN-ANIMATE-001, FEAT-BPMN-ANIMATE-001, DESIGN-BPMN-ANIMATE-001, PLAN-BPMN-ANIMATE-001, KYMOANIM-MAP-001 |

Verifies FEAT-BPMN-ANIMATE-001 (FR/NFR IDs). Covers 12207 Verification & Validation. Headline checks:
**file validation** (structural + semantic), **rendering a self-contained file**, and **additivity**
(existing input paths unchanged). Per-increment cases live in each CR's `04-TEST`.

## 1. Test approach and levels

- **Unit** — parse (`from_kymoanim`); structural validation (schema-valid vs malformed); semantic
  validation (internal: dangling `flow.from`/`to` or timeline ref, non-increasing `step`, `branch`
  not an outgoing flow, non-finite/out-of-canvas coords); generation (`gen_anim`) yields a valid file.
- **Integration** — build a `Diagram` from a `kymo.anim` (no layout pass; `type`→shape, `at`→pos,
  `path`→points) + descriptor-driven SVG (token `offset-path` per the timeline); CLI render +
  `--anim-init`.
- **Additivity / golden-safety (key)** — existing `.bpmn`/`.kymo`/`.kymo.json` renders stay
  **byte-identical** to the committed goldens; the BPMN-corpus baseline is unchanged.
- **Parity** — Python and JS produce equivalent verdicts, generated files, built diagrams, and markup.

## 2. Test items, environment, tooling

`packages/python` (`pytest`), `packages/js` (`npm test`), the golden-SVG fixtures + BPMN corpus
harness, the conformance suite (`KYMO_UPDATE_CONFORMANCE`), `samples/order-flow.kymo` + a sample
`order-flow.kymo.anim.json`, the shipped `kymo.anim.schema.json`, and the playground E2E
(`website/app/e2e`).

## 3. Test cases

| ID | Title | Verifies | Pass criterion |
|----|-------|----------|----------------|
| **TC-1** | Parse | FR-1 | A well-formed `kymo.anim` parses to the expected `nodes`/`flows`/`timeline` |
| **TC-2** | Schema validation | FR-3 | Schema-valid files pass; missing/extra fields, bad enums/types, non-`oneOf` steps rejected with the offending id/step |
| **TC-3** | Semantic validation | FR-2, FR-3 | Dangling `flow.from`/`to`/timeline refs, non-increasing `step`, `branch` not an outgoing flow, non-finite coords rejected |
| **TC-4** | Generation | FR-4 | `--anim-init` converts a `.bpmn`/`.kymo` into a valid `kymo.anim` whose timeline traverses sequence flows in process order |
| **TC-5** | Build + SVG | FR-1, FR-2, FR-5 (SVG) | Built `Diagram` uses explicit positions (no layout pass); each `flow` step → a token (`offset-path`) timed from the timeline; CSS only |
| **TC-6** | Additivity / golden-safety | FR-7, NFR-1 | Existing `.bpmn`/`.kymo`/`.kymo.json` renders byte-identical to goldens; corpus baseline unchanged |
| **TC-7** | CLI render / `--anim-init` | FR-6 | `kymo file.kymo.anim.json` renders; `--anim-init` emits a file that re-validates; invalid file refused |
| **TC-8** | Determinism & parity | FR-6, NFR-3 | Same file → byte-stable output; Python/JS verdicts + built diagrams + markup equivalent |
| **TC-9** | No-JS / dep-free | NFR-2 | Animated SVG has no `<script>`; validator built-in (no JSON-Schema lib); no new runtime dep |
| **TC-10** | Reduced motion / first frame | NFR-4 | `prefers-reduced-motion` degrades to static; first frame is the valid static diagram |
| **TC-11** | Interactive viewer | FR-5 (interactive) | Viewer play/pause/step over the timeline; smoke test green (`CR-BPMN-ANIMATE-004`) |
| **TC-12** | WebP / playback | FR-5 (WebP) | WebP sampled from the timeline (`controls.fr`) emits the expected frames (`CR-BPMN-ANIMATE-005`) |

## 4. Pass/fail criteria

A CR passes when its mapped test cases pass and the full Python suite (incl. golden-SVG + BPMN-corpus
gates) and JS `npm test` are green. **Any** golden-SVG or BPMN-corpus drift on the **existing input
paths** is a **failure**, not a re-baseline (NFR-1). Intentional changes to `kymo.anim`-rendered
fixtures are regenerated per the repo's golden/conformance update flags.

## 5. Requirements traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-1 | TC-1, TC-5 |
| FR-2 | TC-3, TC-5 |
| FR-3 | TC-2, TC-3 |
| FR-4 | TC-4 |
| FR-5 | TC-5, TC-11, TC-12 |
| FR-6 | TC-7, TC-8 |
| FR-7 | TC-6 |
| NFR-1 | TC-6 |
| NFR-2 | TC-9 |
| NFR-3 | TC-8 |
| NFR-4 | TC-10 |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 0.1     | 2026-05-31 | Vũ Anh | `TC-1..TC-10` + traceability; golden-safety + token-order headline. |
| 0.2     | 2026-05-31 | Vũ Anh | Re-centered on the descriptor: parse, schema + semantic validation, default-gen, descriptor-driven SVG, sidecar/golden-safety, `--anim`/`--anim-init`. |
| 0.3     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format.** Cases now cover internal semantic validation, build-from-scene (no layout pass), diagram→anim generation, additivity (existing paths byte-identical), `kymo file.kymo.anim.json` render; traceability remapped to revised `FR-1..FR-7`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn-animate/04-TEST.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
When a requirement changes, update the affected test case(s) and the traceability matrix in the same
revision; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
Test-case IDs are stable; a removed case SHALL be marked withdrawn (not re-used) so traceability
links remain valid.

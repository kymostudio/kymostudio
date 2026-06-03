---
title: BPMN in the kymo DSL — Product Description (ConOps & Stakeholder Requirements)
document_id: PROD-BPMN-DSL-001
version: "0.1"
issue_date: 2026-05-25
status: Draft
classification: Internal
owner: diagrams/ project
audience: Anyone needing the product context for authoring BPMN in the kymo DSL; stakeholders, reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - INTRO-BPMN-DSL-001
  - FEAT-BPMN-DSL-001
  - BPMN-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - bpmn
  - dsl
  - auto-layout
---

# BPMN in the kymo DSL — Product Description (ConOps & Stakeholder Requirements)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PROD-BPMN-DSL-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `INTRO-BPMN-DSL-001`, `FEAT-BPMN-DSL-001` (the SRS derived from the needs below) |

> This doc owns the `SN-BPMN-DSL-NN`
> stakeholder needs; the SRS (`FEAT-BPMN-DSL-001`) derives `FR`/`NFR` from them.

## 1. Problem & motivation

Authoring BPMN in `.kymo` today requires placing every `bpmn-*` leaf at an explicit `@ (x,y)` and
hand-tracing every edge's `via` waypoints (see `samples/order-fulfillment.kymo`). This is laborious
and error-prone. Tools such as Mermaid let an author describe a process textually and lay it out
automatically (cf. `RES-MERMAID-D2-001`). kymo can already *import* BPMN 2.0 XML (`BPMN-MAP-001`) but
cannot *author* it concisely.

A new file-scope `bpmn { … }` block in the kymo DSL lets an author describe a process
as typed nodes and flows — *declare-then-connect* — and have the engine lay it out: declarative
node kinds (`start`/`task`/`xor`/`and`/`end` …) then `->` connections; a left-to-right layered
(Sugiyama/DAG) auto-layout that positions nodes and routes orthogonal flows; hybrid coordinates (a
node may add `@ (x,y)` to pin/override its position, un-pinned nodes are auto-placed); and renderer
reuse — the block emits a fully-resolved sub-diagram (absolute positions + edge waypoints) exactly
like the BPMN importer, so the existing `bpmn-*` glyphs and flow renderer draw it unchanged.

## 2. Users & context of operations (ConOps)

- **Who:** authors of `.kymo` diagrams who want to express a BPMN process concisely, plus engineers
  and maintainers of the kymo DSL parser, layout engine, and Python/JS renderers.
- **Substrate it builds on (unchanged):** the kymo DSL; the BPMN importer's element
  mapping (`BPMN-MAP-001`) — the block reuses the same `(shape, marker)` / flow classification; and
  the existing `bpmn-*` glyphs + flow renderer, which draw the emitted sub-diagram without change.
- **Scenario:** an author writes a `bpmn { … }` block of typed nodes + flows, optionally pinning a
  few nodes with `@ (x,y)`; the engine lays out the rest and emits a fully-resolved sub-diagram the
  renderer draws directly — no manual coordinates or waypoints required.

## 3. Goals & non-goals

- **Goals:** a concise, auto-laid-out way to author BPMN diagrams directly in `.kymo` — a process as
  nodes + flows without manual coordinates or waypoints — while preserving the ability to **pin**
  positions when needed; mirrored in `packages/python` and `packages/js`, golden-stable, with **no**
  renderer/importer change.
- **Non-goals (v1):** LR direction only (TB/RL later); no pools/lanes inside the block; no
  constrained-pin reflow; no fenced `bpmn` code-block alias (deferred — see `PLAN-BPMN-DSL-001`).

## 4. Stakeholder needs (`SN-BPMN-DSL`)

| ID | Need | Rationale |
|----|------|-----------|
| `SN-BPMN-DSL-01` | Authors must be able to express a BPMN process **concisely** as typed nodes + flows (*declare-then-connect*) in `.kymo`, **without** manual `@ (x,y)` coordinates or hand-traced `via` waypoints. | Today's `bpmn-*` authoring is laborious and error-prone; textual tools (Mermaid) auto-lay-out instead. |
| `SN-BPMN-DSL-02` | The engine must **auto-lay-out** the block (left-to-right layered/Sugiyama) and route flows, while letting an author **pin** any node's position with `@ (x,y)` when the auto result needs overriding. | Combines hands-off authoring with escape-hatch control over placement. |
| `SN-BPMN-DSL-03` | The feature must **reuse the existing renderer** — emit a fully-resolved sub-diagram (absolute positions + edge waypoints) like the BPMN importer — so the `bpmn-*` glyphs and flow renderer draw it unchanged, with no golden/baseline churn. | Keeps the renderer dumb and protects byte-stable goldens and the corpus baseline. |
| `SN-BPMN-DSL-04` | The capability must exist with **equivalent functionality in both** `packages/python` and `packages/js`, the JS implementation staying dependency-free. | The two implementations are kept at parity. |

## 5. Scope

**In scope (product level):** the file-scope `bpmn { … }` block (declare-then-connect nodes + flows);
the left-to-right layered DAG auto-layout with orthogonal routing; hybrid `@ (x,y)` pin override; and
emission of a fully-resolved sub-diagram reusing the existing renderer — mirrored in Python and JS.
**Out of scope (v1):** non-LR directions, pools/lanes inside the block, constrained-pin reflow, and a
fenced `bpmn` code-block alias (see §3 non-goals; the SRS `FEAT-BPMN-DSL-001` §4 records the deferral).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-25 | Vũ Anh | Initial product description. Extracted from `INTRO-BPMN-DSL-001` §1–3 (problem/concept) and the stakeholder-needs portion of `FEAT-BPMN-DSL-001` §1; minted `SN-BPMN-DSL-01..04` (feature-scoped). |

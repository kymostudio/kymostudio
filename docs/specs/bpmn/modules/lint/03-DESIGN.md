---
title: BPMN Lint — Design
document_id: DESIGN-BPMN-LINT-001
version: "1.0"
issue_date: 2026-06-05
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers implementing/maintaining the kymo BPMN linter
review_cycle: On CR completion, or on importer/DI-model change
supersedes: null
related_documents:
  - PROD-BPMN-LINT-001      # Stakeholder needs (SN-LINT-*)
  - INTRO-BPMN-LINT-001     # Introduction
  - FEAT-BPMN-LINT-001      # Requirements (FR/NFR — traced below)
  - TEST-BPMN-LINT-001      # Test documentation (TC-LINT-*)
  - PLAN-BPMN-LINT-001      # Plan / change requests
  - DESIGN-BPMN-PARSER-001  # BPMN importer this contrasts against
  - FEAT-BPMN-EXPORT-001    # BPMN exporter sibling
  - BPMN-MAP-001            # BPMN element mapping
  - BPMN-NREF-001           # BPMN normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - di-fidelity
  - graph-sanity
  - expat
  - stdlib
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Design

| Field        | Value                                                               |
|--------------|---------------------------------------------------------------------|
| Document ID  | DESIGN-BPMN-LINT-001                                                 |
| Version      | 1.0                                                                 |
| Status       | Baselined                                                          |
| Issue Date   | 2026-06-05                                                          |
| Owner        | `packages/python` (kymo CLI)                                        |
| Related      | INTRO-BPMN-LINT-001, FEAT-BPMN-LINT-001, TEST-BPMN-LINT-001, PLAN-BPMN-LINT-001, DESIGN-BPMN-PARSER-001 |

Realises FEAT-BPMN-LINT-001 (FR/NFR cited per clause). Describes the **as-built** implementation in
`packages/python/src/kymo/lint_bpmn.py` and its CLI wiring in `packages/python/src/kymo/cli.py`.
Covers ISO/IEC/IEEE 12207 Architecture & Design Definition.

## 1. Scope

How `kymo lint <file.bpmn> [...]` turns a raw BPMN 2.0 file into an ordered, line-anchored list of
findings. The design covers: the single module `packages/python/src/kymo/lint_bpmn.py` (parse →
index → rules → `format_report`), and its CLI wiring — `cli.py:_lint()`, dispatched from `main()`
when the first positional argument is the literal `lint`. The linter is **Python only**; the JS
package is library-only with no CLI (NFR-LINT-5). It adds **no new dependency** — `xml.etree` and
`xml.parsers.expat` are both stdlib (NFR-LINT-1). It does not modify, render, or re-export the file.

## 2. Pipeline

```
file.bpmn ──read──► xml_text
                       │
                       ▼  ET.fromstring                  (ParseError → single LR-XML-01, exit here)
                     root  ───► _line_map(xml_text, root)  (expat re-scan → {Element: line})  §3
                       │
                       ▼  single root.iter() pass
        ┌──────────────┴───────────────────────────────────────────────┐
        │ id index │ shape-nodes │ edge-flows │ processes │ BPMNShape/BPMNEdge lists │
        └──────────────┬───────────────────────────────────────────────┘
                       ▼  build seq_in/seq_out + any_in/any_out connectivity tables
        ┌──────────────┴──────────────┬──────────────────────┐
        │ reference-integrity (REF)   │ graph-sanity (GR/PR)  │ import-fidelity (DI)  │  §4
        └──────────────┬──────────────┴──────────────────────┘
                       ▼  ordered list[Finding]
                 format_report(label, findings) ──► aligned text + summary   §5
```

1. **Parse.** `lint(xml_text)` calls `ET.fromstring`. A `ParseError` short-circuits to one
   `LR-XML-01` finding carrying `position[0]` (FR-LINT-8); the linter never raises.
2. **Line map.** `_line_map` re-scans the same text with expat to recover 1-based start lines (§3).
3. **Index.** A single `root.iter()` pass builds: an `id → Element` map (first id wins); a list of
   visible shape-nodes (`_SHAPE_NODES`); a list of edge-flows (`_EDGE_FLOWS`); the `<process>` list;
   and the `<BPMNShape>` / `<BPMNEdge>` DI lists. Tags are matched on their **local** name
   (`_local` strips the `}`-namespace), so the linter is prefix-agnostic, exactly like the importer.
4. **Connectivity tables.** Sequence-flow in/out counters per node id, plus sequence+message
   "any" counters used only by the disconnected check (§4).
5. **Rules.** The three families run and append `Finding`s via the local `add()` closure, which
   resolves each element to its line through the `_line_map` side dict.
6. **Report.** `format_report` aligns and prints; `counts` summarises.

Crucially the linter works on the **raw XML, not the imported `Diagram`** (contrast
DESIGN-BPMN-PARSER-001). The importer normalises and *silently drops* anything it cannot place —
a shape with no `<dc:Bounds>`, an edge with one waypoint, a node with no DI at all. By reading the
XML directly, the linter sees exactly those dropped elements, which is the feature's unique value
(FR-LINT-2, NFR-LINT-4).

## 3. Source-line resolution (NFR-LINT-4, FR-LINT-5)

The central design gotcha. Each finding must carry a 1-based source line, but stdlib ElementTree
exposes **no** source position on CPython: the C accelerator (`_elementtree`) does not call the
Python-level `TreeBuilder._start` override, so the usual subclass-and-record trick **no-ops** and
`Element` has no `sourceline` attribute.

Solution: re-scan the same text with `xml.parsers.expat`. Its `StartElementHandler` fires once per
start tag in **document order** — identical to the order `root.iter()` yields elements — so zipping
the two streams pairs each `Element` with its line:

```python
starts = []
p = expat.ParserCreate()
p.StartElementHandler = lambda *_: starts.append(p.CurrentLineNumber)
p.Parse(xml_text, True)
return dict(zip(root.iter(), starts))   # {Element: 1-based line}
```

A C `Element` cannot hold extra attributes, so the mapping is a **side dict keyed by element
identity**, not a field on the node. The `add()` closure looks lines up here (defaulting to 0 when
absent). DI findings therefore resolve to the **DI element's** line — a missing-`<dc:Bounds>`
finding points at its `<BPMNShape>`, not the semantic node it references (NFR-LINT-4) — because the
DI element is what `add()` is handed. Malformed XML never reaches this path; it uses the earlier
`ParseError.position` (FR-LINT-8). If expat itself errors (it should not, ET already validated),
`_line_map` returns `{}` and all lines degrade to 0 rather than raising.

## 4. Rule families (FR-LINT-2..4)

Severities are `{error, warn}` only; findings are informational with no auto-fix (NFR-LINT-3).

**Import-fidelity — DI (`LR-DI-*`, all warn) — FR-LINT-2.** The kymo-unique family: "will this file
render in kymo's DI-driven importer?" Computed against the indexed DI lists and the
`shaped_refs` / `edged_refs` sets (the `bpmnElement` targets of all `<BPMNShape>` / `<BPMNEdge>`):

| Rule      | Catches                                                                 |
|-----------|------------------------------------------------------------------------|
| LR-DI-01  | `<BPMNShape>` with no child `<dc:Bounds>` — will not render            |
| LR-DI-02  | `<BPMNEdge>` with fewer than two `<di:waypoint>` — will not render     |
| LR-DI-03  | visible semantic node (`_SHAPE_NODES`) whose id ∉ `shaped_refs`        |
| LR-DI-04  | edge-flow (`_EDGE_FLOWS`) whose id ∉ `edged_refs`                      |
| LR-DI-05  | DI element with an empty / unknown `bpmnElement`                       |

**Reference integrity (`LR-REF-*`) — FR-LINT-3.** For each `sequenceFlow` / `messageFlow` /
`association` (`_REF_FLOWS`), both `sourceRef` and `targetRef` are checked: missing attribute →
`LR-REF-02` (warn, `has no ‹kind›Ref`); present but not in the id index → `LR-REF-01`
(**error**, `‹kind›Ref '‹id›' not found`).

**Graph sanity (`LR-GR-*`) + process (`LR-PR-*`) — FR-LINT-4.** Driven by the connectivity tables.
Two counter sets are kept deliberately:

- **Directional** checks (`si` / `so` = sequence-flow in / out) drive the per-kind rules below.
- The **fully-disconnected** check (`LR-GR-01`) uses the **sequence + message** counters
  (`ai` / `ao`). A node reachable only by a message flow is therefore *not* falsely flagged as
  disconnected. `LR-GR-01` is **error** for activities/gateways, **warn** for events.

Per-kind, after the `ai == 0 and ao == 0` disconnected short-circuit:

- *startEvent* — incoming present → `LR-GR-02` (warn); no outgoing → `LR-GR-03` (warn).
- *endEvent* — outgoing present → `LR-GR-04` (warn); no incoming → `LR-GR-05` (warn).
- *boundaryEvent* — only outgoing is checked (`LR-GR-06`, warn). A boundary event attaches to a
  host and has **no incoming sequence flow by design**, so incoming is never flagged.
- *activity* — no incoming → `LR-GR-07` (error); no outgoing → `LR-GR-08` (error).
- *gateway* — no incoming → `LR-GR-09` (error); no outgoing → `LR-GR-10` (error); exactly one in
  and one out → `LR-GR-11` (warn, redundant).
- *intermediate catch/throw* — no incoming / no outgoing → `LR-GR-12` (warn).

Per `<process>`, the set of descendant local tags is checked: absent `startEvent` → `LR-PR-01`
(warn); absent `endEvent` → `LR-PR-02` (warn).

## 5. Output & exit model (FR-LINT-5..7)

`format_report(label, findings)` emits ruff/gcc-style, column-aligned lines. The location prefix is
`‹path›:‹line›` (bare `‹path›` when line is 0); all prefixes are padded to a common width, then
severity (padded to 5), then `‹id› '‹name›' ‹message›` (the id/name prefix is dropped when absent):

```
order.bpmn:42  error  Flow_3 'approve' targetRef 'Task_X' not found
order.bpmn:18  warn   Shape_2 'Review' shape missing <dc:Bounds> (will not render)

1 error, 1 warning
```

A clean file prints `‹path›: ✓ no issues`. Otherwise the body is followed by a blank line and an
`N errors, M warnings` summary (`counts` splits the list; `_plural` pluralises). Multiple files are
joined with a blank line between reports.

**Exit model (FR-LINT-6).** Lint *results* are informational and **always exit 0** — safe in
scripts and CI (SN-LINT-04). Only **usage errors** in `cli.py:_lint()` exit 1: empty argument list
(`usage: kymo lint <file.bpmn> [...]`), a path that does not exist (`not found: …`), or a non-`.bpmn`
suffix (`lint only supports .bpmn sources …`). `main()` routes to `_lint()` when `argv[1]` is
`lint`, before the normal render dispatch.

## 6. Dependencies & determinism (NFR-LINT-1..2)

**Stdlib only.** `xml.etree.ElementTree` (parse + tree walk) and `xml.parsers.expat` (line
recovery) ship with CPython; the linter adds **no runtime or dev dependency** (NFR-LINT-1,
SN-LINT-03). The module API surface is small and frozen: `Finding(severity, eid, name, message,
line)` (frozen dataclass), `lint(xml_text) -> list[Finding]`, `lint_file(path)`,
`counts(findings) -> (errors, warnings)`, `format_report(label, findings) -> str`; exported from the
`kymo` package as `lint_bpmn`.

**Determinism.** Findings accumulate in a fixed family order — REF, then per-node GR, then PR, then
DI shapes, DI edges, no-DI nodes, no-DI flows — and within each family in `root.iter()` document
order. Output is a pure function of the input bytes, so it is **golden-test stable** (NFR-LINT-2);
`tests/test_lint_bpmn.py` relies on this.

## 7. Parity & prior art (NFR-LINT-5)

**Parity.** The linter is **Python only** today. The JS package (`packages/js`) is library-only with
no CLI, so there is nothing to mirror at the command surface. The rule logic MAY later be ported as a
JS `lintBpmn()` to drive in-editor diagnostics for the `bpmn-editor` spec set (NFR-LINT-5;
CR-BPMN-LINT-004 in PLAN-BPMN-LINT-001). The shared rule registry (LR-* ids) is the contract a port
must honour.

**Prior art.** The de-facto standard is **bpmnlint** (bpmn.io / Camunda,
[github.com/bpmn-io/bpmnlint](https://github.com/bpmn-io/bpmnlint)): ~27 configurable rules over the
**semantic moddle model**, with presets and a plugin ecosystem. kymo overlaps it on the modelling
rules (`LR-PR-01/02`, `LR-GR-01`, `LR-GR-07..11`, `LR-DI-03`) but is positioned differently: because
bpmnlint reads the moddle model it is **renderer-agnostic** and cannot see DI-fidelity defects.
kymo's `LR-DI-01/02/04` (DI present-but-degenerate) and `LR-REF-01` (dangling ref) are therefore
**kymo-unique** — this is a **renderer-fidelity linter** for the DI-driven BPMN→SVG pipeline,
complementary to bpmnlint rather than a replacement. The full comparison (and the broader tooling
landscape: `bpmn-moddle` XSD validation, Signavio conventions, engine load-time checks) is in the
**BPMN Lint & Validation Tooling research note** (`docs/research/bpmn-lint/`).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes                                                                 |
|---------|------------|--------|-------------------------------------------------------------------------|
| 1.0     | 2026-06-05 | Vũ Anh | Initial as-built design: pipeline (raw-XML, not imported `Diagram`), expat line-resolution gotcha, the three rule families (DI / REF / GR+PR), output & always-exit-0 model, stdlib-only determinism, parity & bpmnlint prior art. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/03-DESIGN.md`; the authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the rule ids (LR-*) and requirement ids
(FR-LINT-1…8, NFR-LINT-1…5) consistent with FEAT-BPMN-LINT-001; increment `version`; append a row to
Annex A.

### B.4 Backwards Compatibility
This describes the implementation; the normative surface is FEAT-BPMN-LINT-001. The rule registry
(LR-* ids, severities, messages) and the `Finding` / report formats are the stable contract —
golden tests in TEST-BPMN-LINT-001 pin the exact output. Reconcile any deviation in
FEAT-BPMN-LINT-001 before release.

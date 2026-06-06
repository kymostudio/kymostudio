---
title: BPMN Lint — Requirements
document_id: FEAT-BPMN-LINT-001
version: "1.2"
issue_date: 2026-06-06
status: Baselined
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers implementing and verifying the kymo BPMN linter; integrators consuming the lint API
review_cycle: On CR completion, or on importer/renderer change affecting render fidelity
supersedes:
  - FEAT-BPMN-LINT-001
  - FEAT-BPMN-LINT-001
related_documents:
  - FEAT-BPMN-001           # BPMN feature umbrella
  - DESIGN-BPMN-LINT-001    # Design
  - TEST-BPMN-LINT-001      # Test documentation (traceability matrix)
  - PLAN-BPMN-LINT-001      # Plan (change-requests)
  - DESIGN-BPMN-PARSER-001  # The .bpmn → Diagram importer this linter mirrors
  - FEAT-BPMN-EXPORT-001    # BPMN exporter sibling
  - BPMN-MAP-001            # BPMN element → kymo mapping
  - BPMN-NREF-001           # BPMN 2.0 normative spec mirror set
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - validation
  - import-fidelity
  - di
  - diagram-interchange
  - reference-integrity
  - graph-sanity
  - requirements
  - traceability
  - conops
  - stakeholder-requirements
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# BPMN Lint — Requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | FEAT-BPMN-LINT-001                                 |
| Version      | 1.2                                                |
| Status       | Baselined                                          |
| Issue Date   | 2026-06-06                                         |
| Owner        | `packages/python` (kymo CLI)                       |
| Related      | FEAT-BPMN-001, DESIGN-BPMN-LINT-001, TEST-BPMN-LINT-001, PLAN-BPMN-LINT-001 |

The key words **SHALL**, **SHOULD**, and **MAY** are used per ISO drafting conventions. Each
requirement carries a stable ID for traceability from TEST-BPMN-LINT-001; the rule registry (§4) is
the normative catalogue those requirements detect. Design realisation: DESIGN-BPMN-LINT-001.

## 1. Introduction and scope

This document is the **requirements** entry point for the **BPMN lint** feature and the single
source of its stakeholder needs (`SN-LINT-NN`), functional requirements (`FR-LINT-N`) and
non-functional requirements (`NFR-LINT-N`). It consolidates the former product description
(FEAT-BPMN-LINT-001) and introduction (FEAT-BPMN-LINT-001).

`kymo lint <file.bpmn> [<file.bpmn> ...]` is a **raw-XML linter for the BPMN→SVG (DI-driven)
pipeline**. It reads the raw BPMN 2.0 XML — not the imported `Diagram` — so it can flag exactly what
the DI-driven importer (DESIGN-BPMN-PARSER-001) would silently drop. It flags three classes of issue:

- **Import-fidelity** — *will this file render in kymo?* — degenerate or absent Diagram-Interchange
  (DI): shapes without bounds, edges with too few waypoints, semantic elements with no DI.
- **Reference integrity** — dangling or missing `sourceRef` / `targetRef` on flows.
- **Graph sanity** — basic modelling mistakes: disconnected nodes, implicit start/end, a process with
  no start or end event.

It is **informational and always exits 0** — only usage errors (file not found, non-`.bpmn` suffix,
empty argument list) print a message and exit 1, so it is safe to drop into scripts and CI without
breaking the pipeline. Output is one finding per line, ruff/gcc-style and column-aligned —
`path:line  severity  message` — followed by a blank line and an `N errors, M warnings` summary.
A clean file prints `path: ✓ no issues`. Severities are `error` and `warn`. There is no auto-fix.

DI findings carry the **DI element's** line, not the semantic element's (e.g. a missing-`<dc:Bounds>`
finding points at the `<BPMNShape>`). `lint` is the **first positional subcommand** in the CLI, which
is otherwise `kymo <file> [--flags]`. It is **Python-only** — the JS package ships as a library with
no CLI.

Example output:

```
order.bpmn:42  error  Task_Approve 'Approve' targetRef 'Task_Ship' not found
order.bpmn:58  warn   Shape_Gateway_1 missing <dc:Bounds> (will not render)
order.bpmn:71  warn   SequenceFlow_7 has no DI edge (will not render)
order.bpmn:12  warn   StartEvent_1 start event has an incoming flow
order.bpmn:88  warn   process has no end event

1 errors, 4 warnings
```

**Lint ≠ schema validation.** This feature is *not* an XSD/well-formedness gate for "is this legal
BPMN 2.0" (that is the domain of `bpmn-moddle` and the OMG schema, BPMN-NREF-001). It is a
**renderer-fidelity check** answering a narrower, kymo-specific question — *"will this file render
faithfully in kymo's DI-driven importer, and is it sane as a process graph?"* — plus a handful of
ordinary modelling-mistake checks (dangling references, missing start/end, disconnected nodes) that
are cheap to surface alongside.

**Relationship to other components.**

- **Builds on the importer** — the BPMN importer (DESIGN-BPMN-PARSER-001) is DI-driven: it renders a
  node only when a well-formed `<BPMNShape>`/`<BPMNEdge>` is present, and silently drops the rest. The
  linter exists to surface those silent drops *before* import, by reading the same raw XML the
  importer consumes.
- **Complements the exporter** — the BPMN exporter (FEAT-BPMN-EXPORT-001) writes `.bpmn` from a kymo
  `Diagram`; lint is a read-only check on inbound third-party `.bpmn`. The two do not share code but
  bracket the same round-trip.
- **Uses the mapping** — rule semantics (which semantic elements are visible nodes, which are flows,
  what DI each requires) follow the BPMN element → kymo mapping (BPMN-MAP-001) and the normative spec
  mirror (BPMN-NREF-001).
- **Distinct from bpmnlint** — [bpmnlint](https://github.com/bpmn-io/bpmnlint) (bpmn.io / Camunda) is
  the de-facto **semantic** linter: 27 configurable rules over the moddle model, JS, with editor
  markers. kymo lint is instead a **renderer-fidelity** linter — its unique value is the DI and
  dangling-reference checks bpmnlint omits because it is renderer-agnostic. The two are complementary,
  not competing; see the *BPMN Lint & Validation Tooling research note* (`docs/research/bpmn-lint/`)
  for the full comparison.

**Definitions & abbreviations.**

- **DI / BPMNDI** — Diagram Interchange: the OMG-standardised graphical layer of a `.bpmn` file
  (`<bpmndi:BPMNDiagram>`) that carries absolute geometry. kymo's importer is DI-driven.
- **BPMNShape** — a `<bpmndi:BPMNShape>` element; the DI node for a semantic element, carrying its
  `<dc:Bounds>` (x, y, width, height).
- **BPMNEdge** — a `<bpmndi:BPMNEdge>` element; the DI connector for a flow, carrying its
  `<di:waypoint>` list.
- **Waypoint** — a `<di:waypoint>` (x, y) point on a `BPMNEdge`; an edge needs **≥ 2** to render.
- **Finding** — one reported issue: `(severity, eid, name, message, line)`. The unit of lint output.
- **Severity** — `error` or `warn`. Both are informational; neither changes the exit code.
- **Import-fidelity** — whether the file's DI lets kymo render it faithfully without silently losing
  elements; the linter's kymo-unique concern.
- **Dangling ref** — a `sourceRef`/`targetRef` (or other reference) pointing at an `id` not present in
  the document.
- **`bpmnElement`** — the DI attribute linking a `BPMNShape`/`BPMNEdge` to its semantic element by
  `id`.
- **Lint vs schema validation** — lint checks pragmatic render-fidelity and modelling sanity; it is
  **not** XSD/schema validation (well-formedness only, via LR-XML-01) and does **not** assert OMG
  schema conformance.

**Document set & reading order.** This module follows the 4-document module layout. Read in order:

| # | Document | document_id | Owns |
|---|----------|-------------|------|
| 01 | Requirements (this) | FEAT-BPMN-LINT-001 | Stakeholder needs (`SN-LINT-01..05`), requirements (`FR-LINT-1..8`, `NFR-LINT-1..5`), the rule registry (`LR-*`), interfaces & output contract. |
| 02 | Design | DESIGN-BPMN-LINT-001 | Rule registry realisation (`LR-*`), raw-XML scan, expat line-mapping. |
| 03 | Test | TEST-BPMN-LINT-001 | Test cases (`TC-LINT-01..`), fixtures, traceability to `FR-LINT`. |
| 04 | Plan | PLAN-BPMN-LINT-001 | Delivery status, risk, change-requests (`CR-BPMN-LINT-002..005`) under `CR/`. |

Reading order: **FEAT-BPMN-LINT-001** (this) → **DESIGN-BPMN-LINT-001** → **TEST-BPMN-LINT-001**;
delivery status and change-requests in **PLAN-BPMN-LINT-001** + `CR/`. Traceability chains needs →
requirements → tests: `SN-LINT` → `FR-LINT`/`NFR-LINT` → `TC-LINT` (TEST), with the rule registry
`LR-*` (DESIGN) realising the requirements. The set conforms to ISO/IEC/IEEE 12207:2017 and
ISO/IEC/IEEE 15289:2019; dates are ISO 8601:2019. The feature is **already implemented** (as-built);
this baseline documents it. Cross-references use **`document_id`** (never file paths).

## 2. Stakeholder needs (`SN-LINT`)

This document **owns** the stakeholder needs below; the `FR-LINT` functional requirements (§3) derive
from them.

kymo imports `.bpmn` **purely from its Diagram-Interchange (DI) geometry**: the importer
(DESIGN-BPMN-PARSER-001) reads `<bpmndi:BPMNShape>` bounds and `<bpmndi:BPMNEdge>` waypoints and maps
them to kymo elements per BPMN-MAP-001. A semantic element with **no DI**, or with **degenerate DI** —
a shape with no `<dc:Bounds>`, an edge with fewer than two waypoints — has no geometry to place, so
the importer **silently drops it**. The render still succeeds and produces a valid SVG; it is simply
*missing* nodes or flows, with no diagnostic emitted. The consequence is that a user handed a
third-party `.bpmn` **cannot distinguish a faithful import from a lossy one** by looking at the
output.

| ID | Need | Rationale |
|----|------|-----------|
| `SN-LINT-01` | Before rendering a third-party `.bpmn`, a user must be able to learn whether it will render **faithfully** or **silently lose** elements. | The DI-driven importer drops un-rendered elements without a word; the user otherwise has no way to tell a complete picture from a partial one. |
| `SN-LINT-02` | Each problem must point at the **exact source line**. | Findings are only actionable if the user can jump straight to the offending element in the XML; a problem without a location forces a manual hunt. |
| `SN-LINT-03` | The check must run inside the **existing Python CLI** with **no extra dependency** (stdlib only). | kymo's distribution and supply-chain posture are kept lean; a linter that pulled in a parser/schema library would be a disproportionate cost for an advisory tool. |
| `SN-LINT-04` | It must be **safe to run in scripts/CI** — it must not break the pipeline. | An advisory pre-flight that can fail a build (or crash on bad input) would not be adopted; informational, always-exit-0 behaviour makes it droppable anywhere. |
| `SN-LINT-05` | It must also catch **basic BPMN modelling mistakes** — missing start/end, disconnected nodes, dangling refs — not only render issues. | Reference and graph-sanity defects are cheap to detect on the same parse and are common in hand-edited files; surfacing them alongside fidelity issues makes the one command worth running. |

## 3. Functional requirements

- **FR-LINT-1** The feature SHALL accept `kymo lint <file.bpmn> [<file.bpmn> ...]` and report findings
  per file.
  *Clarification:* `lint` is the first positional subcommand of the otherwise `kymo <file> [--flags]`
  CLI; multiple files are linted independently and reported in argument order.
  *Source need:* SN-LINT-01, SN-LINT-05.

- **FR-LINT-2** The feature SHALL operate on the **raw BPMN XML** (not the imported `Diagram`) and
  detect import-fidelity issues **LR-DI-01..05** that the importer (DESIGN-BPMN-PARSER-001) silently
  drops.
  *Clarification:* working pre-import is the only way to flag DI that is present but degenerate
  (e.g. a `<BPMNShape>` with no `<dc:Bounds>`), which the importer discards before a `Diagram` exists.
  *Source need:* SN-LINT-01.

- **FR-LINT-3** The feature SHALL detect reference-integrity issues **LR-REF-01..02**.
  *Clarification:* dangling `sourceRef`/`targetRef` on `sequenceFlow`/`messageFlow`/`association`
  (`LR-REF-01`, error) and missing such attributes (`LR-REF-02`, warn).
  *Source need:* SN-LINT-05.

- **FR-LINT-4** The feature SHALL detect graph-sanity issues **LR-GR-01..12** and process-level issues
  **LR-PR-01..02**.
  *Clarification:* disconnected nodes, implicit start/end, redundant gateways, boundary-event
  connectivity, and processes missing a start or end event — see §4.
  *Source need:* SN-LINT-05.

- **FR-LINT-5** Each finding SHALL carry a **1-based source line** and SHALL be printed as
  `path:line  severity  message`.
  *Clarification:* line numbers are recovered by re-scanning the text with `xml.parsers.expat` and
  zipping its document-order element stream against `root.iter()`; DI findings carry the **DI
  element's** line (see NFR-LINT-4).
  *Source need:* SN-LINT-02.

- **FR-LINT-6** Lint results SHALL **always exit 0**; only usage errors SHALL exit non-zero.
  *Clarification:* findings (errors or warnings) are informational and never fail the process; usage
  errors — empty argument list, file not found, non-`.bpmn` suffix — print a message and exit 1.
  *Source need:* SN-LINT-04.

- **FR-LINT-7** A clean file SHALL print `path: ✓ no issues`; otherwise the report SHALL end with an
  `N errors, M warnings` summary.
  *Clarification:* one finding per line, ruff/gcc-style and column-aligned, then a blank line, then the
  count summary; counts come from `counts()`.
  *Source need:* SN-LINT-02, SN-LINT-04.

- **FR-LINT-8** Malformed XML SHALL be reported as a **single error finding (LR-XML-01)** carrying its
  line, and SHALL NOT raise.
  *Clarification:* an `ElementTree.ParseError` is caught and converted to one `LR-XML-01` finding using
  `ParseError.position` for the line.
  *Source need:* SN-LINT-04.

- **FR-LINT-9** The rule set SHALL be **configurable** (delivered by CR-BPMN-LINT-002): every finding
  carries its `LR-*` rule code, and a configuration MAY select a **preset** (`all` — every rule, the
  default; `recommended` — drops purely-stylistic rules) and then **override** individual rules
  (disable, or change severity to `warn`/`error`). Configuration is read from a JSON `.kymolintrc`
  (`extends` + `rules`, each value `off|warn|error`) discovered from the cwd upward, or selected via
  `--preset=`/`--config=`; an invalid configuration is a usage error (exit 1). The default
  configuration (no rc-file, no flag) SHALL be behaviourally identical to preset `all`.
  *Clarification:* configuration is applied as a post-pass over the generated findings — disabled rules
  are dropped and severity overrides are substituted — so rule logic (FR-LINT-2..4, FR-LINT-8) is
  unchanged. Extends FR-LINT-2..4 and NFR-LINT-3.
  *Source need:* SN-LINT-04, SN-LINT-05.

## 4. The rule set

This is the **normative catalogue** of rules. Each rule emits a `Finding` with the listed severity and
message; the **FR** column traces the rule to the requirement that mandates its detection. Namespaces
are ignored throughout (matching on the local tag name), so the linter is agnostic to the
`bpmn:` / `bpmn2:` prefix, like the importer.

### 4.1 Import-fidelity (DI) — the kymo-unique value

Answers "will this file render in kymo's DI-driven importer?". bpmnlint does not check most of these
because it is renderer-agnostic.

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-DI-01 | warn | `shape missing <dc:Bounds> (will not render)` | a `<BPMNShape>` with no `<dc:Bounds>` | FR-LINT-2 |
| LR-DI-02 | warn | `edge has fewer than 2 waypoints (will not render)` | a `<BPMNEdge>` with `< 2` `<di:waypoint>` | FR-LINT-2 |
| LR-DI-03 | warn | `has no DI shape (will not render)` | a visible semantic node with no `<BPMNShape>` | FR-LINT-2 |
| LR-DI-04 | warn | `has no DI edge (will not render)` | a flow with no `<BPMNEdge>` | FR-LINT-2 |
| LR-DI-05 | warn | `BPMNShape/BPMNEdge references unknown element` / `… has no bpmnElement` | DI pointing at a missing/empty `bpmnElement` | FR-LINT-2 |

### 4.2 Reference integrity

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-REF-01 | error | `‹kind›Ref '‹id›' not found` | `sequenceFlow`/`messageFlow`/`association` `sourceRef`/`targetRef` dangling | FR-LINT-3 |
| LR-REF-02 | warn | `has no ‹kind›Ref` | flow missing a `sourceRef`/`targetRef` attribute | FR-LINT-3 |

### 4.3 Graph sanity (semantic)

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-GR-01 | error (activity/gateway) / warn (event) | `is not connected to any flow` | no incoming **and** no outgoing flow | FR-LINT-4 |
| LR-GR-02 | warn | `start event has an incoming flow` | start event with an incoming flow | FR-LINT-4 |
| LR-GR-03 | warn | `start event has no outgoing flow` | start event with no outgoing flow | FR-LINT-4 |
| LR-GR-04 | warn | `end event has an outgoing flow` | end event with an outgoing flow | FR-LINT-4 |
| LR-GR-05 | warn | `end event has no incoming flow` | end event with no incoming flow | FR-LINT-4 |
| LR-GR-06 | warn | `boundary event has no outgoing flow` | boundary event with no outgoing flow | FR-LINT-4 |
| LR-GR-07 | error | `has no incoming sequence flow` | activity with no incoming sequence flow | FR-LINT-4 |
| LR-GR-08 | error | `has no outgoing sequence flow` | activity with no outgoing sequence flow | FR-LINT-4 |
| LR-GR-09 | error | `has no incoming sequence flow` | gateway with no incoming sequence flow | FR-LINT-4 |
| LR-GR-10 | error | `has no outgoing sequence flow` | gateway with no outgoing sequence flow | FR-LINT-4 |
| LR-GR-11 | warn | `gateway has a single incoming and outgoing flow (redundant)` | redundant gateway | FR-LINT-4 |
| LR-GR-12 | warn | `has no incoming flow` / `has no outgoing flow` | intermediate catch/throw event missing a flow | FR-LINT-4 |

### 4.4 Process

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-PR-01 | warn | `process has no start event` | a `<process>` with no `startEvent` descendant | FR-LINT-4 |
| LR-PR-02 | warn | `process has no end event` | a `<process>` with no `endEvent` descendant | FR-LINT-4 |

### 4.5 Well-formedness

| Rule | Sev. | Message | Catches | FR |
|------|------|---------|---------|----|
| LR-XML-01 | error | `not well-formed XML: ‹detail›` | input that ElementTree cannot parse | FR-LINT-8 |

### 4.6 Connectivity nuance (normative)

- **Directional checks** (LR-GR-02..05, LR-GR-07..12) count **sequence flows only**: a start event's
  outgoing, an activity's incoming/outgoing, etc. are sequence-flow connectivity.
- The **fully-disconnected check** (LR-GR-01) counts **sequence + message** flows, so a node reachable
  only by a message flow is **not** falsely flagged as disconnected; it is, however, still subject to
  the directional sequence-flow checks above.
- **Boundary events** attach to a host activity (no incoming sequence flow is expected), so only their
  **outgoing** is checked (LR-GR-06); they are exempt from incoming-flow rules.

## 5. Non-functional requirements

- **NFR-LINT-1** **Stdlib only.** The linter SHALL add no new runtime or dev dependency, using only
  `xml.etree.ElementTree` (semantic parse) and `xml.parsers.expat` (line mapping). *(Source need:
  SN-LINT-03.)*
- **NFR-LINT-2** **Deterministic order.** Findings SHALL be emitted in a stable, document-order
  sequence, making the output suitable for golden tests.
- **NFR-LINT-3** **Informational severity model.** Severities SHALL be exactly `{error, warn}`; the
  linter SHALL NOT auto-fix and SHALL NOT mutate the input.
- **NFR-LINT-4** **DI line attribution.** A DI finding SHALL carry the **DI element's** source line
  (e.g. a missing-`<dc:Bounds>` finding points at the `<BPMNShape>`, not the semantic element).
- **NFR-LINT-5** **Parity (deferred).** The JS package has no CLI; the rule logic MAY later be ported
  as a JS `lintBpmn()` to drive `bpmn-editor` diagnostics (CR; see §7 and PLAN-BPMN-LINT-001).

## 6. Interfaces & output contract

### 6.1 CLI surface

```
kymo lint [--preset=all|recommended] [--config=<.kymolintrc>] <file.bpmn> [<file.bpmn> ...]
```

`lint` is the first positional subcommand of the kymo CLI; **Python package only** (the JS package is
library-only with no CLI). Each argument is linted independently; per-file reports are joined by a
blank line. `--preset=` selects a preset; `--config=` points at an explicit rc-file; with neither, the
nearest `.kymolintrc` from the cwd upward is used, else preset `all` (see §6.5).

### 6.2 Exit-code contract

| Outcome | Exit |
|---------|------|
| Linting completed (with or without findings) | **0** |
| Usage error: empty argument list, file not found, or non-`.bpmn` suffix | **1** |
| Configuration error: bad preset/rule/severity, missing `--config` file, or invalid rc-file JSON | **1** |

### 6.3 Output line format

One finding per line, ruff/gcc-style and column-aligned:

```
‹path›:‹line›  ‹severity›  ‹id› '‹name›' ‹message›
```

The `‹id› '‹name›'` who-prefix is omitted when absent. After the findings, a blank line then the
summary `N errors, M warnings` (singular/plural agreement). A file with no findings prints
`‹path›: ✓ no issues` instead.

### 6.4 Public Python API

Module `kymo.lint_bpmn` (re-exported from `kymo` as `lint_bpmn`):

| Symbol | Signature | Purpose |
|--------|-----------|---------|
| `Finding` | `Finding(severity, eid, name, message, line=0, rule="")` | frozen dataclass for one finding; `rule` is its `LR-*` code |
| `lint` | `lint(xml_text: str, config: Config \| None = None) -> list[Finding]` | lint raw XML; `config=None` ⇒ preset `all` |
| `lint_file` | `lint_file(path: Path, config: Config \| None = None) -> list[Finding]` | read a file, then `lint` it |
| `counts` | `counts(findings) -> tuple[int, int]` | `(error_count, warning_count)` |
| `format_report` | `format_report(label, findings) -> str` | render the §6.3 report for one file |
| `RULES` / `PRESETS` | `dict[str, str]` / `dict[str, frozenset[str]]` | the rule registry and named presets |
| `Config` | `Config(enabled, severity)` | a resolved configuration (active codes + overrides) |
| `default_config` / `preset_config` | `() -> Config` / `(name) -> Config` | preset-`all` default; a named preset |
| `parse_config` / `load_config` / `find_config` | `(dict) -> Config` / `(Path) -> Config` / `(Path) -> Path \| None` | build/read/discover an rc-file config |
| `ConfigError` | exception | raised on an invalid configuration |

### 6.5 Configuration (rc-file & presets) — FR-LINT-9

A JSON `.kymolintrc` (or `.kymolintrc.json`) mirrors bpmnlint's shape:

```json
{
  "extends": "recommended",
  "rules": { "LR-GR-11": "off", "LR-DI-01": "error" }
}
```

- **`extends`** — a preset name: `all` (every rule; the default when omitted) or `recommended` (every
  rule except purely-stylistic ones — currently `LR-GR-11`).
- **`rules`** — per-rule overrides keyed by `LR-*` code: `"off"` disables a rule; `"warn"`/`"error"`
  re-enables it (over the preset) and sets its severity. An unknown preset, unknown rule code, or bad
  severity value is a configuration error (exit 1).

Resolution precedence: `--config=<path>` › `--preset=<name>` › nearest `.kymolintrc` (cwd upward) ›
preset `all`. The default path (no rc-file, no flag) is behaviourally identical to the pre-CR-002
linter, so existing output is unchanged.

## 7. Future requirements (change-requests)

Forward-looking deltas are specified in PLAN-BPMN-LINT-001:

- **CR-BPMN-LINT-002** — configurable rules (rc-file on/off + per-rule severity, presets).
  **Delivered** (realises FR-LINT-9): `.kymolintrc` + `--preset=`/`--config=`, presets `all`/
  `recommended`, per-rule `off|warn|error`.
- **CR-BPMN-LINT-003** — more bpmnlint-parity rules (`no-implicit-split`,
  `no-duplicate-sequence-flows`, `label-required`).
- **CR-BPMN-LINT-004** — JS port (`lintBpmn()`) + VS Code diagnostics via the `bpmn-editor` engine
  (realises NFR-LINT-5).
- **CR-BPMN-LINT-005** — `--json` machine-readable output and an opt-in `--max-severity` / exit-code
  mode for CI gating.

See PLAN-BPMN-LINT-001 for the full CR statements; requirement IDs in this SRS are stable and a
withdrawn requirement SHALL be marked withdrawn rather than re-used.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0 (FEAT-BPMN-LINT-001) | 2026-06-05 | Vũ Anh | Initial baseline of the product description. Documented the **as-built** `kymo lint <file.bpmn>` linter (`packages/python/src/kymo/lint_bpmn.py` + CLI subcommand). Owned `SN-LINT-01..05`. Established the renderer-fidelity-linter positioning vs `bpmnlint`. |
| 1.0 (FEAT-BPMN-LINT-001) | 2026-06-05 | Vũ Anh | Initial as-built baseline of the introduction. Introduced the `kymo lint <file.bpmn>` raw-XML / DI-fidelity linter; concept, terminology, and document map for the set. |
| 1.0 (FEAT-BPMN-LINT-001) | 2026-06-05 | Vũ Anh | Initial as-built SRS (`FR-LINT-1..8`, `NFR-LINT-1..5`); normative rule registry `LR-*`; interfaces & output contract; CR roadmap (`CR-BPMN-LINT-002..005`, Proposed). |
| 1.1 | 2026-06-06 | Vũ Anh | Consolidated FEAT-BPMN-LINT-001 (stakeholder needs) and FEAT-BPMN-LINT-001 (introduction/map) into this requirements doc under the new 4-document module layout (01-REQUIREMENTS/02-DESIGN/03-TEST/04-PLAN). |
| 1.2 | 2026-06-06 | Vũ Anh | **CR-BPMN-LINT-002 delivered.** Added `FR-LINT-9` (configurable rules): `LR-*` codes now carried on every `Finding`; presets `all`/`recommended`; per-rule `off\|warn\|error` overrides via JSON `.kymolintrc` (`extends` + `rules`) and `--preset=`/`--config=` CLI flags. Updated §6.1 (CLI), §6.2 (config-error exit 1), §6.4 (API: `Config`/`RULES`/`PRESETS`/`parse_config`/`load_config`/`find_config`/`ConfigError`; `lint`/`lint_file` gain `config`), added §6.5 (rc-file contract). Default path behaviourally identical to pre-CR-002. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/01-REQUIREMENTS.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
Adding/changing a requirement requires: edit the relevant FR/NFR (preserving IDs); update
`TEST-BPMN-LINT-001`'s traceability matrix; increment `version`; append a row to Annex A. A delivery
increment is raised as a change-request under `CR/`.

### B.4 Backwards Compatibility
Requirement IDs are stable across revisions; a removed requirement SHALL be marked withdrawn (not
re-used) so traceability links remain valid.

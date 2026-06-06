---
title: kymo BPMN lint vs. other BPMN linters — Comparison
document_id: REF-BPMN-LINT-CMP-001
version: "1.1"
issue_date: 2026-06-06
status: Released
classification: Internal
owner: packages/python (kymo CLI)
audience: Engineers evolving the kymo BPMN lint feature; reviewers positioning it against prior art
review_cycle: On a kymo lint rule-set change, on an upstream bpmnlint/Camunda linting major release, or annually
supersedes: null
related_documents:
  - FEAT-BPMN-LINT-001      # kymo lint requirements + rule registry (LR-*)
  - DESIGN-BPMN-LINT-001    # kymo lint design (raw-XML scan, expat line-mapping)
  - PLAN-BPMN-LINT-001      # kymo lint plan + change-requests (CR-BPMN-LINT-002..005)
  - DESIGN-BPMN-PARSER-001  # the DI-driven importer whose silent drops lint surfaces
  - BPMN-MAP-001            # BPMN element → kymo mapping
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - lint
  - bpmnlint
  - camunda
  - di-fidelity
  - comparison
  - prior-art
  - static-analysis
upstream:
  - project: bpmnlint
    homepage: https://github.com/bpmn-io/bpmnlint
    npm: https://www.npmjs.com/package/bpmnlint
  - project: "@camunda/linting"
    homepage: https://github.com/camunda/linting
    npm: https://www.npmjs.com/package/@camunda/linting
  - project: bpmnlint-plugin-camunda-compat
    homepage: https://github.com/camunda/bpmnlint-plugin-camunda-compat
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo BPMN lint vs. other BPMN linters — Comparison

| Field        | Value                                                       |
|--------------|-------------------------------------------------------------|
| Document ID  | REF-BPMN-LINT-CMP-001                                       |
| Version      | 1.1                                                        |
| Status       | Released                                                   |
| Issue Date   | 2026-06-06                                                 |
| Owner        | `packages/python` (kymo CLI)                                |
| Related      | FEAT-BPMN-LINT-001, DESIGN-BPMN-LINT-001, PLAN-BPMN-LINT-001 |

## 1. Scope and the tools compared

This report compares kymo's BPMN lint (`kymo lint <file.bpmn>`, `kymo.lint_bpmn`, rule registry
`LR-*` in FEAT-BPMN-LINT-001) against the established BPMN linters in the ecosystem. The aim is to
locate kymo's distinct value, map rule-for-rule overlap, and flag the gaps already (or not yet)
tracked as change-requests in PLAN-BPMN-LINT-001.

| Tool | Vendor | Runtime | One-line positioning |
|------|--------|---------|----------------------|
| **kymo lint** | kymostudio | Python (stdlib only) | **Will-it-render** linter: DI import-fidelity + graph sanity on the raw XML. |
| **bpmnlint** | bpmn.io (Camunda-sponsored) | JavaScript / npm | Configurable **modeling best-practice + BPMN-correctness** linter on the semantic model. |
| **@camunda/linting** | Camunda | JavaScript / npm | bpmnlint **+ execution-platform compatibility** (Camunda 7 / 8 / Zeebe) for the Modeler. |
| **bpmnlint-plugin-camunda-compat** | Camunda | JavaScript / npm | The execution-compat rule plug-in `@camunda/linting` bundles. |

> The three JS tools form one family: `@camunda/linting` wraps `bpmnlint` and adds
> `bpmnlint-plugin-camunda-compat`, switching rule sets by `executionPlatform`/`executionPlatformVersion`.
> So the substantive comparison is **kymo lint vs. bpmnlint**, with Camunda's layer noted where it adds
> a dimension (executability) neither kymo nor vanilla bpmnlint covers.

## 2. Positioning at a glance

| Dimension | kymo lint | bpmnlint | @camunda/linting |
|-----------|-----------|----------|------------------|
| Primary question answered | *Will this file render in kymo's DI-driven importer, and is the graph sane?* | *Does this model follow BPMN best practice / compliance?* | *Will this model execute on the chosen Camunda platform?* |
| Operates on | **Raw XML** (ElementTree + expat) | **moddle** semantic objects (`bpmn-moddle`) | moddle objects + platform config |
| Sees DI defects | **Yes — its core value** | Mostly no (semantic-only) | Mostly no |
| Graph-sanity checks | Yes | Yes | Yes (inherited) |
| Execution/runtime checks | No | No | **Yes** (Zeebe/C7 compat) |
| Configurable rule set | **Yes** (CR-BPMN-LINT-002: `.kymolintrc`, presets `all`/`recommended`, per-rule `off\|warn\|error`) | **Yes** (rc-file, presets, per-rule severity) | Yes (auto-configured by platform) |
| Plugin ecosystem | None | **Yes** (`bpmnlint-plugin-*`) | Built on plugins |
| Editor integration | None (CLI + Python API; CR-BPMN-LINT-004 proposed) | **Yes** (`bpmn-js-bpmnlint`, bundler plugins) | **Yes** (Camunda Modeler canvas + properties panel) |
| Auto-fix | No | No | No |
| Dependencies | **Zero** (Python stdlib) | npm (`bpmn-moddle`, …) | npm (bpmnlint + camunda-compat) |
| Output | ruff/gcc-style text CLI | reports keyed by rule (CLI + API) | Modeler-rendered messages |

## 3. Architecture and input model — the decisive difference

The architectural split drives everything else:

- **kymo lint reads the raw XML.** It deliberately does *not* import the file into a `Diagram` first,
  because the whole point is to flag what the importer (`DESIGN-BPMN-PARSER-001`) would **silently
  drop**: a `<BPMNShape>` with no `<dc:Bounds>`, a `<BPMNEdge>` with fewer than two waypoints, a
  semantic node with no DI shape, a flow with no DI edge. It matches on **local tag names**, so it is
  agnostic to the `bpmn:` / `bpmn2:` prefix. This makes it a *rendering-fidelity* checker first and a
  graph linter second.
- **bpmnlint reads the semantic model** (`bpmn-moddle` parses XML → moddle objects, then rules run
  over that object graph). The **Diagram Interchange layer is largely invisible** to it — only
  `no-overlapping-elements` (geometry) and `no-bpmndi` (presence/absence of DI) touch DI at all. It is
  therefore strong on *modeling correctness* and weak on *will-it-actually-draw*.
- **@camunda/linting** adds a third axis: it configures bpmnlint by the target execution platform and
  layers `bpmnlint-plugin-camunda-compat` to answer *will this deploy and run on Zeebe / Camunda 7-8*
  (element-template conformance, unsupported elements, FEEL expressions, etc.) — orthogonal to both
  kymo and vanilla bpmnlint.

**Consequence:** kymo lint and bpmnlint are **complementary, not competing**. A file can be perfectly
valid BPMN per bpmnlint yet fail to render (missing bounds) — kymo catches that. A file can render
fine yet violate modeling best practice (unlabeled tasks, implicit splits) — bpmnlint catches that.

## 4. Rule-by-rule coverage

### 4.1 kymo `LR-*` rules and their nearest bpmnlint counterpart

| kymo rule (LR-*) | Severity | Checks | Nearest bpmnlint rule |
|------------------|----------|--------|-----------------------|
| `LR-DI-01` shape missing `<dc:Bounds>` | warn | DI render-fidelity | — *(none)* |
| `LR-DI-02` edge `< 2` waypoints | warn | DI render-fidelity | — *(none)* |
| `LR-DI-03` node has no `<BPMNShape>` | warn | DI render-fidelity | — *(inverse of `no-bpmndi`)* |
| `LR-DI-04` flow has no `<BPMNEdge>` | warn | DI render-fidelity | — *(none)* |
| `LR-DI-05` DI → unknown / empty `bpmnElement` | warn | DI integrity | — *(none)* |
| `LR-REF-01` dangling `sourceRef`/`targetRef` | error | reference integrity | — *(moddle would fail to resolve; no dedicated rule)* |
| `LR-REF-02` missing `sourceRef`/`targetRef` | warn | reference integrity | — *(none dedicated)* |
| `LR-GR-01` not connected to any flow | error/warn | graph sanity | **`no-disconnected`** |
| `LR-GR-02` start event has incoming flow | warn | graph sanity | ≈ `no-implicit-*` family |
| `LR-GR-03` start event has no outgoing flow | warn | graph sanity | ≈ `no-implicit-end` |
| `LR-GR-04` end event has outgoing flow | warn | graph sanity | ≈ `no-implicit-*` family |
| `LR-GR-05` end event has no incoming flow | warn | graph sanity | ≈ `no-implicit-start` |
| `LR-GR-06` boundary event has no outgoing flow | warn | graph sanity | — |
| `LR-GR-07/08` activity missing in/out seq flow | error | graph sanity | ≈ `no-implicit-start` / `no-implicit-end` |
| `LR-GR-09/10` gateway missing in/out seq flow | error | graph sanity | ≈ `no-implicit-start` / `no-implicit-end` |
| `LR-GR-11` redundant gateway (1-in/1-out) | warn | graph sanity | **`superfluous-gateway`** |
| `LR-GR-12` intermediate event missing a flow | warn | graph sanity | ≈ `no-implicit-*` family |
| `LR-PR-01` process has no start event | warn | process | **`start-event-required`** |
| `LR-PR-02` process has no end event | warn | process | **`end-event-required`** |
| `LR-XML-01` not well-formed XML | error | parse | — *(moddle parse failure)* |

### 4.2 bpmnlint built-in rules kymo does NOT have

bpmnlint ships ~25 built-in rules (presets: `bpmnlint:recommended` = curated best-practice + BPMN
compliance; `bpmnlint:all` = every rule as error; `bpmnlint:correctness` = compliance subset). The
following have **no kymo equivalent**:

| bpmnlint rule | What it flags | kymo status |
|---------------|---------------|-------------|
| `label-required` | unlabeled flow elements | not planned (kymo allows unlabeled) |
| `no-implicit-split` | a task with multiple outgoing flows (implicit split) | **proposed — CR-BPMN-LINT-003** |
| `no-duplicate-sequence-flows` | two flows between the same pair | **proposed — CR-BPMN-LINT-003** |
| `no-implicit-start` / `no-implicit-end` | flow nodes acting as start/end without an event | partial overlap via `LR-GR-*` |
| `single-blank-start-event` | >1 blank start event in a scope | not planned |
| `sub-process-blank-start-event` | embedded sub-process start-event typing | not planned |
| `no-complex-gateway` | discourages complex gateways | not planned (kymo renders them) |
| `no-inclusive-gateway` | discourages inclusive gateways | not planned |
| `fake-join` | a gateway/task used as an implicit join | not planned |
| `no-gateway-join-fork` | a single gateway both joining and forking | not planned |
| `conditional-flows` | outgoing conditions on a gateway are valid | not planned |
| `conditional-event` | conditional event definition usage | not planned |
| `event-based-gateway` | event-based gateway target shapes | not planned |
| `event-sub-process-typed-start-event` | event sub-process start typing | not planned |
| `link-event` | matching link catch/throw pairs | not planned |
| `single-event-definition` | at most one event definition per event | not planned |
| `ad-hoc-sub-process` | ad-hoc sub-process constraints | not planned |
| `superfluous-termination` | redundant terminate end event | not planned |
| `no-overlapping-elements` | DI elements overlapping in space | not planned (a DI-layout check kymo could add) |
| `no-bpmndi` | flags presence of DI (for semantic-only files) | inverse of kymo's intent (kymo *requires* DI) |

### 4.3 What only kymo does

The `LR-DI-01..05` family — **rendering-fidelity on the DI layer** — is kymo's unique contribution.
bpmnlint, being semantic-model-first, cannot tell you a shape will not draw because it lacks bounds or
an edge has one waypoint. For a *render-as-code* pipeline this is the highest-value check, because a
"valid" BPMN file that renders to a blank or broken SVG is the exact failure kymo's importer would hide.

## 5. Strengths and gaps

**Where kymo lint wins**
- DI/render-fidelity checks (`LR-DI-*`) no other tool offers — directly tied to the kymo importer's
  silent-drop behaviour.
- Zero dependencies, Python stdlib only (`xml.etree` + `expat` for line numbers); trivial to vendor.
- ruff/gcc-style `path:line  severity  message` output — editor-jumpable, CI-friendly.
- Prefix-agnostic raw-XML scan (handles `bpmn:`/`bpmn2:` uniformly).

**Where kymo lint is behind**
- ~~Not configurable~~ **Now configurable** (CR-BPMN-LINT-002, delivered): `.kymolintrc`
  (`extends` + per-rule `off|warn|error`), presets `all`/`recommended`, and `--preset=`/`--config=`
  flags — closing the gap to bpmnlint's headline feature. Preset coverage is still narrower than
  bpmnlint's three presets, but the mechanism is at parity.
- **Smaller semantic rule set** — no `label-required`, `no-implicit-split`,
  `no-duplicate-sequence-flows`, gateway-style rules, event-typing rules. *(partly tracked:
  CR-BPMN-LINT-003.)*
- **No execution/deployment checks** — `@camunda/linting` covers Zeebe/C7 executability; out of
  kymo's scope (kymo is notation/rendering, not a process engine — see BPMN-MAP-001 scope).
- **No editor / live integration** — bpmnlint has `bpmn-js-bpmnlint` and bundler plugins; Camunda
  renders findings on canvas. kymo is CLI + Python API only. *(tracked: CR-BPMN-LINT-004 for a JS port
  + VS Code diagnostics via `bpmn-editor`.)*
- **No machine-readable output** — no `--json`; bpmnlint reports are structured objects. *(tracked:
  CR-BPMN-LINT-005, also adds a CI exit-code mode.)*
- **No plugin ecosystem** — by design (single-purpose tool).

## 6. Recommendation

Keep kymo lint positioned as a **complementary render-fidelity + graph-sanity linter**, not a bpmnlint
replacement. The DI-fidelity rules are the moat; preserve and deepen them (consider adopting bpmnlint's
`no-overlapping-elements` as a natural DI-layout extension, since kymo already parses DI geometry).
For modeling-correctness coverage, the cheapest path to parity is the already-planned change-requests
rather than re-implementing bpmnlint's full catalogue:

- **CR-BPMN-LINT-002** (configurable rules) — **done**; closed the biggest usability gap.
- **CR-BPMN-LINT-003** (`no-implicit-split`, `no-duplicate-sequence-flows`, `label-required`) closes
  the highest-value semantic gaps.
- **CR-BPMN-LINT-005** (`--json` + CI exit-code mode) reaches output parity with bpmnlint for tooling.

Execution-platform linting (Camunda's niche) should remain **explicitly out of scope**.

## Sources

- [bpmn-io/bpmnlint (repo, rules & config)](https://github.com/bpmn-io/bpmnlint)
- [bpmnlint built-in rules directory](https://github.com/bpmn-io/bpmnlint/tree/main/rules)
- [bpmnlint docs/rules](https://github.com/bpmn-io/bpmnlint/blob/main/docs/rules/README.md)
- [bpmn.io blog — Validate and Improve your BPMN Diagrams with bpmnlint](https://bpmn.io/blog/posts/2018-bpmnlint.html)
- [bpmn-io/bpmn-js-bpmnlint (editor integration)](https://github.com/bpmn-io/bpmn-js-bpmnlint)
- [@camunda/linting (npm)](https://www.npmjs.com/package/@camunda/linting)
- [camunda/linting (repo)](https://github.com/camunda/linting)
- [camunda/bpmnlint-plugin-camunda-compat](https://github.com/camunda/bpmnlint-plugin-camunda-compat)
- [Camunda 8 Docs — Custom lint rules](https://docs.camunda.io/docs/components/modeler/desktop-modeler/custom-lint-rules/)
- kymo lint internals: `packages/python/src/kymo/lint_bpmn.py`; requirements FEAT-BPMN-LINT-001 (rule registry §4).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes        |
|---------|------------|--------|----------------|
| 1.0     | 2026-06-06 | Vũ Anh | Initial comparison of kymo BPMN lint against bpmnlint, `@camunda/linting`, and `bpmnlint-plugin-camunda-compat`: positioning table, architecture/input-model contrast, rule-by-rule mapping (LR-* ↔ bpmnlint), gap analysis tied to CR-BPMN-LINT-002..005, and recommendation. |
| 1.1     | 2026-06-06 | Vũ Anh | Marked **CR-BPMN-LINT-002 delivered** — kymo lint is now configurable (`.kymolintrc`, presets `all`/`recommended`, per-rule `off\|warn\|error`, `--preset=`/`--config=`). Updated the §2 configurability row and §5/§6 gap notes accordingly. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/bpmn/modules/lint/reports/bpmn-lint-comparison.md`; authoritative
source is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the lint module; available to all repository readers.

### B.3 Change Control
On a kymo lint rule-set change or an upstream bpmnlint/Camunda linting release, revisit §4 (rule
mapping) and §5 (gaps), reconcile with FEAT-BPMN-LINT-001 and PLAN-BPMN-LINT-001, increment `version`,
and append a row to Annex A.

### B.4 Backwards Compatibility
Informative report. Rule names and preset semantics reflect bpmnlint/Camunda linting as of the issue
date; treat upstream rule catalogues as the source of truth on any discrepancy.

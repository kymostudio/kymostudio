---
title: BPMN Lint & Validation Tooling (Research)
document_id: RES-BPMN-LINT-001
version: "1.0"
issue_date: 2026-05-28
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers evolving the `kymo` BPMN importer/exporter, or considering a diagram-quality linter
review_cycle: On a bpmnlint major release, or annually (whichever first)
supersedes: null
related_documents:
  - REF-BPMNIO-001
  - BPMN-NREF-001
  - BPMN-MAP-001
  - RES-MERMAID-D2-001
  - RES-LANG-EVAL-001
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - bpmnlint
  - linting
  - validation
  - diagram-quality
  - modeling-conventions
  - prior-art
  - research
upstream:
  - project: bpmn-io/bpmnlint
    homepage: https://bpmn.io/
    repository: https://github.com/bpmn-io/bpmnlint
    license: MIT
    version_reviewed: "10.x"
    access_date: 2026-05-28
  - project: bpmn-io/bpmn-js-bpmnlint
    homepage: https://bpmn.io/
    repository: https://github.com/bpmn-io/bpmn-js-bpmnlint
    license: MIT
    access_date: 2026-05-28
  - project: bpmn-io/dmnlint
    homepage: https://bpmn.io/
    repository: https://github.com/bpmn-io/dmnlint
    license: MIT
    access_date: 2026-05-28
  - project: bpmn-io/bpmn-moddle
    homepage: https://bpmn.io/
    repository: https://github.com/bpmn-io/bpmn-moddle
    license: MIT
    access_date: 2026-05-28
---

# BPMN Lint & Validation Tooling (Research)

| Field             | Value                                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------|
| Document ID       | RES-BPMN-LINT-001                                                                                      |
| Version           | 1.0                                                                                                    |
| Issue Date        | 2026-05-28                                                                                             |
| Status            | Released                                                                                               |
| Classification    | Internal                                                                                               |
| Owner             | `diagrams/` project                                                                                    |
| Audience          | Engineers evolving the `kymo` BPMN importer/exporter, or weighing a diagram-quality linter             |
| Subjects          | [`bpmn-io/bpmnlint`](https://github.com/bpmn-io/bpmnlint) · Camunda Modeler · SAP Signavio · XSD/semantic validators |
| Licenses          | MIT (bpmnlint, bpmn-js-bpmnlint, dmnlint, bpmn-moddle)                                                  |
| Versions Reviewed | bpmnlint 10.x (2026-05-28)                                                                              |
| Related Documents | `REF-BPMNIO-001`, `BPMN-NREF-001`, `BPMN-MAP-001`, `RES-MERMAID-D2-001`, `RES-LANG-EVAL-001`           |

This is a **research note on prior art** for *linting* and *validating* BPMN models — not a specification of kymo. kymo already imports and exports BPMN (`BPMN-MAP-001`); this note surveys the tools that judge whether a BPMN diagram is *well-formed* and *well-modelled*, so the team can borrow the right rule set if it ever adds a "kymo lint" layer. No code or behaviour in this repository depends on any tool below.

A key framing used throughout: **lint ≠ schema validation**. *Schema/semantic validation* answers "is this legal BPMN 2.0 XML per the OMG spec?" (`BPMN-NREF-001`). *Linting* answers "is this a *good* diagram?" — a configurable layer of best-practice and house-style rules on top of legal XML, exactly as ESLint sits on top of a JavaScript parser.

## 1. Landscape at a glance

| Tool | Kind | Form factor | Configurable rules | License | Notes |
|---|---|---|---|---|---|
| **bpmnlint** | Lint | CLI + Node library | **Yes** (`.bpmnlintrc`, plugins) | MIT | The de-facto standard; from the bpmn.io team (`REF-BPMNIO-001`) |
| **bpmn-js-bpmnlint** | Lint (editor) | `bpmn-js` plug-in | Yes (wraps bpmnlint) | MIT | Live error markers on elements while modeling |
| **Camunda Modeler** linting | Lint (editor) | Desktop/Web Modeler | Yes (bpmnlint plugins) | — | bpmnlint embedded; adds Camunda-8/Zeebe execution-readiness rules |
| **SAP Signavio** Modeling Conventions | Governance lint | SaaS modeler | Yes (org-defined) | Commercial | Enterprise naming/glossary/structure conventions |
| **dmnlint** | Lint | CLI + library | Yes | MIT | Sibling project for DMN decision tables |
| **bpmn-moddle** | Schema | Node library | No (XSD-fixed) | MIT | Ships OMG `BPMN20.xsd` + `Semantic.xsd`; the parser kymo-style importers build on |
| **OAGIS BPMN 2.0 Validator** | Schema/semantic | Online | No | — | Validates Messages, Data Objects, Data Stores |
| **jBPM** | Schema/semantic | Java engine | No | Apache-2.0 | Validates BPMN 2.0 XML at load time before execution |

The headline conclusion: **for configurable diagram linting there is essentially one ecosystem — bpmnlint** — and everything else either embeds it (Camunda Modeler, bpmn-js), validates a different (lower) bar (XSD/semantic), or is a closed enterprise feature (Signavio).

## 2. bpmnlint — the de-facto standard

`bpmnlint` validates BPMN diagrams against a configurable set of rules and reports each finding as **error / warning / info**, modelled deliberately on the ESLint experience.

**Form factors.**
- **CLI**: `npm i -g bpmnlint` → `bpmnlint invoice.bpmn`. Output lists file path, element ID, severity, message, and the rule name that fired.
- **Library (Node)**: instantiate `Linter` with a `NodeResolver`, parse the XML to a moddle tree (via `bpmn-moddle`), then `linter.lint(definitions)` returns a structured report keyed by element.
- **In-editor**: `bpmn-js-bpmnlint` renders findings as markers directly on diagram elements — this is the mechanism behind the Camunda Modeler "Problems" panel.
- **Bundling**: webpack and rollup plugins precompile the resolved config so the linter can run in the browser.

**Configuration** — a `.bpmnlintrc` in the working directory, ESLint-style:

```json
{
  "extends": ["bpmnlint:recommended"],
  "rules": {
    "label-required": "warn",
    "no-inclusive-gateway": "off"
  }
}
```

Built-in presets:
- `bpmnlint:recommended` — opinionated best-practice rules **plus** BPMN-compliance rules.
- `bpmnlint:all` — every rule, all as errors.
- `bpmnlint:correctness` — only the compliance subset (no style opinions).

## 3. The built-in rule set (≈27 rules)

This is the part most worth borrowing — it is, in effect, a peer-reviewed checklist of "what makes a BPMN diagram bad". Grouped:

| Group | Rules | What they catch |
|---|---|---|
| **Flow integrity** | `start-event-required`, `end-event-required`, `no-disconnected`, `no-implicit-start`, `no-implicit-end`, `no-implicit-split` | every process needs explicit start/end; no orphaned elements; no split/join that is only implied by multiple flows |
| **Gateways** | `no-complex-gateway`, `no-inclusive-gateway`, `superfluous-gateway`, `no-gateway-join-fork`, `fake-join` | discourage hard-to-reason gateways; flag redundant gateways and a gateway that both forks and joins; detect a "join" that does not actually synchronise |
| **Events** | `single-blank-start-event`, `event-based-gateway`, `link-event`, `single-event-definition`, `conditional-event`, `event-sub-process-typed-start-event`, `superfluous-termination` | one blank start event; correct event-gateway/link wiring; at most one event definition per event; typed start event in event sub-processes |
| **Sequence flows** | `conditional-flows`, `no-duplicate-sequence-flows` | conditional expressions only where legal; no duplicate flow between the same two elements |
| **Sub-processes** | `ad-hoc-sub-process`, `sub-process-blank-start-event` | ad-hoc sub-process configured correctly; embedded sub-process uses a blank start |
| **Labels & DI** | `label-required`, `no-bpmndi`, `no-overlapping-elements` | every meaningful element is named; (optionally) reject DI; flag geometrically overlapping shapes |
| **Misc** | `global`, `helper` | shared infrastructure, not user-facing rules |

A new rule can be proposed upstream via GitHub issues; the rule API is small (each rule is a visitor over the moddle tree returning reports).

## 4. Extensibility — custom rules & plugins

Organisations encode house style as a **bpmnlint plugin**, named `bpmnlint-plugin-{name}`, then referenced from `.bpmnlintrc`:

```json
{
  "extends": ["bpmnlint:recommended", "plugin:acme/recommended"],
  "rules": { "acme/task-naming": "error" }
}
```

The upstream `bpmnlint-plugin-example` repo shows how to define, unit-test, and consume a rule. Because Camunda Modeler embeds bpmnlint, the same plugin mechanism is how you add Camunda-specific lint rules (e.g. Zeebe execution-readiness checks) to the desktop modeler.

## 5. Enterprise governance — SAP Signavio

A different philosophy from dev-tool linting: **Signavio Process Manager** validates models against **modeling conventions** defined centrally by a CoE, oriented at business readability and process-mining readiness rather than executability. Representative conventions:

- Task names are **verb + object** describing a concrete action ("Validate Invoice"), never a vague bucket ("Invoice Processing").
- Roles, systems and key terms come from a **central glossary/dictionary**, so a rename propagates across the whole model library.
- Every process has exactly **one defined trigger and one defined result** — clean boundaries for simulation and mining.

These are lint *intentions* expressed as enterprise policy; bpmnlint is the closest open-source way to mechanise the structural subset of them.

## 6. Schema & semantic validation (the lower bar)

Distinct from linting — these check legality against the OMG spec (`BPMN-NREF-001`), not quality:

- **bpmn-moddle** — ships the OMG `BPMN20.xsd` and `Semantic.xsd`; it is the moddle parser that BPMN importers (kymo's included, conceptually) read XML through. It enforces the metamodel rather than offering opinions.
- **OAGIS BPMN 2.0 Validator** — an online validator focused on Messages, Data Objects, Data Stores.
- **jBPM** — a Java BPMN 2.0 engine that validates XML at load time before execution.
- **Practical caveat**: validating a real-world `.bpmn` file directly against the OMG XSDs frequently fails on namespace/import issues — teams generally validate through `bpmn-moddle` (or an engine's loader) rather than raw XSD.

## 7. Relevance to kymo

kymo already round-trips BPMN — importer/exporter and a ~120-file MIWG corpus regression baseline (`BPMN-MAP-001`, `BPMN-NREF-001`). What this survey adds is the option of a **diagram-quality layer**, distinct from "does it parse / does it match the golden":

- **A "kymo lint" feature** could reuse bpmnlint's rule *catalogue* (§3) as a ready-made checklist — the highest-value, lowest-controversy rules to start with are `no-disconnected`, `label-required`, `start-event-required`, `end-event-required`, and the gateway-hygiene set. These apply equally to a hand-written `.kymo` diagram and to an imported `.bpmn`.
- **Architecture fit**: such a linter belongs *after* `resolve_alignments()` (it needs resolved positions for `no-overlapping-elements`) but is otherwise a pure read-only pass over the model — consistent with kymo's "dumb renderer, smart resolver" split. It would have a natural Python ⇄ JS parity obligation, like every other front-/back-end feature.
- **Config model to copy**: bpmnlint's `.bpmnlintrc` (`extends` + per-rule severity + plugins) is a proven, ESLint-familiar shape worth mirroring rather than inventing.
- **What *not* to copy**: bpmnlint's rules are BPMN-shaped (gateways, event definitions). kymo's DSL is broader than BPMN, so a kymo linter would need a superset — BPMN rules apply only to BPMN-derived diagrams; generic rules (disconnected nodes, missing labels, overlaps) apply to all.

This note records prior art only; any "kymo lint" work would be specified separately under `docs/specs/`.

## 8. Sources

- bpmnlint — [GitHub](https://github.com/bpmn-io/bpmnlint) · [rules dir](https://github.com/bpmn-io/bpmnlint/tree/main/rules) · [npm](https://www.npmjs.com/package/bpmnlint) · [bpmn.io blog (2018)](https://bpmn.io/blog/posts/2018-bpmnlint)
- [bpmn-io/bpmn-js-bpmnlint](https://github.com/bpmn-io/bpmn-js-bpmnlint) · [bpmnlint-plugin-example](https://github.com/bpmn-io/bpmnlint-plugin-example) · [bpmn-io/dmnlint](https://github.com/bpmn-io/dmnlint)
- [Camunda — Custom lint rules](https://docs.camunda.io/docs/components/modeler/desktop-modeler/custom-lint-rules/)
- [SAP Signavio — BPMN Modeling Conventions](https://www.signavio.com/post/bpmn-modeling-conventions/)
- [bpmn-io/bpmn-moddle (BPMN20.xsd / Semantic.xsd)](https://github.com/bpmn-io/bpmn-moddle) · [OAGIS BPMN 2.0 Validator](http://trisotech.github.io/OAGIS-BPMN-2.0-Validator/) · [OMG BPMN 2.0 spec](http://www.omg.org/spec/BPMN/2.0/)

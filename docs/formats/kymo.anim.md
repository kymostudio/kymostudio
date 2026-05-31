---
title: kymo.anim — Self-Contained BPMN Animation Format
document_id: KYMOANIM-MAP-001
version: "0.2"
issue_date: 2026-05-31
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers and authors using or maintaining the kymo.anim format, its schema, and players (SVG/viewer/WebP)
review_cycle: On format schema change
supersedes: null
related_documents:
  - FEAT-BPMN-ANIMATE-001       # bpmn-animate requirements (defines this format's role)
  - DESIGN-BPMN-ANIMATE-001     # bpmn-animate design (how the format is rendered)
  - KYMOJSON-MAP-001            # kymo.json model (the resolved-model sibling; shared id/geometry conventions)
  - BPMN-MAP-001                # BPMN element mapping (node `type` ↔ bpmn-* shapes; flow kinds)
authors:
  - Vũ Anh
language: en
keywords:
  - kymo.anim
  - animation
  - self-contained
  - json-schema
  - lottie
  - bpmn
  - validation
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# kymo.anim — Self-Contained BPMN Animation Format

| Field             | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| Document ID       | KYMOANIM-MAP-001                                                   |
| Version           | 0.2                                                                |
| Issue Date        | 2026-05-31                                                         |
| Status            | Draft                                                              |
| Classification    | Internal                                                           |
| Owner             | `diagrams/` project                                               |
| Related Documents | `FEAT-BPMN-ANIMATE-001`, `DESIGN-BPMN-ANIMATE-001`, `KYMOJSON-MAP-001`, `BPMN-MAP-001` |

`.kymo.anim.json` (the **`kymo.anim`** format) is a **versioned, schema-validated, self-contained
JSON document that defines a BPMN process diagram *and* its animation in one file** — every node
(id, **type**, **position**), every flow, and a **timeline** of animation steps. It needs **no
separate diagram file and no layout engine**: positions are explicit, so any player renders it
directly. Think **"Lottie for process diagrams"** — one portable JSON that plays everywhere — but
high-level and BPMN-semantic (its "layers" are nodes/flows; its "keyframes" are a process timeline)
and renderable as **no-JavaScript SVG**. This document is the normative schema; the feature design is
`DESIGN-BPMN-ANIMATE-001`.

## Why a self-contained format

Animation should be a **first-class, inspectable, portable artifact** — authorable by hand, diffable
in version control, validatable against a JSON Schema *before* rendering, and consumable by multiple
players. By embedding the scene (nodes + positions + flows) alongside the timeline, a `.kymo.anim`
file is fully self-describing: it does not depend on resolving a `.bpmn`/`.kymo` through the layout +
alignment passes, and it cannot drift out of sync with an external diagram. This mirrors **Lottie**'s
model (a single JSON of scene + keyframes, schema-validated, rendered by portable players) — see
§ Prior art. A starting file can be **generated** from an existing diagram (`kymo … --anim-init`,
which fills positions from the resolved geometry) and then edited.

## Envelope

```jsonc
{
  "format": "kymo.anim",   // type marker — authoritative regardless of filename
  "version": 1,            // schema version; readers ignore unknown fields (forward-compat)
  "canvas": { "width": 520, "height": 1100 },   // optional; auto-bounded from node positions if omitted
  "controls": { … },       // optional playback (below)
  "nodes": [ … ],          // the diagram's flow nodes (below)
  "flows": [ … ],          // the diagram's connections (below)
  "timeline": [ … ]        // ordered animation steps (below)
}
```

A loader **must** check `format == "kymo.anim"` and **should** tolerate a higher `version` by
ignoring unknown fields. Coordinates are `[x, y]` integer arrays in canvas space.

## `controls`

Playback defaults; consumed by the interactive viewer and as render/export defaults.

| Key | Type | Default | Notes |
|-----|------|---------|-------|
| `autoplay` | bool | `true` | start playing on load |
| `loop` | bool | `true` | restart after the last step |
| `speed` | number | `1.0` | global multiplier applied to every `duration` |
| `fr` | int | `60` | frames/sec — used by the WebP/playback exporter to map `duration` (ms) → frames (cf. Lottie's `fr`) |

## `nodes`

Each node is a flow element with an explicit position.

| Key | Type | Notes |
|-----|------|-------|
| `id` | string | unique within the file; referenced by `flows` and `timeline` |
| `type` | enum | BPMN node type (below); maps to a kymo `bpmn-*` shape per `BPMN-MAP-001` |
| `at` | `[x,y]` | **explicit centre** position |
| `size` | `[w,h]` | optional; default per `type` |
| `label` | string | optional display text |
| `marker` | string | optional sub-type for tasks/events (e.g. `user`/`service`/`message`/`timer`) |

**`type` enum** (→ `bpmn-*` shape): `start`, `end`, `end-terminate`, `intermediate`, `task`,
`gateway-xor`, `gateway-parallel`, `gateway-inclusive`, `gateway-event`, `subprocess`,
`data-object`, `data-store`, `annotation`. (Extensible; unknown types are a validation error.)

## `flows`

Each flow is a connection between two nodes, optionally with an explicit routed path.

| Key | Type | Notes |
|-----|------|-------|
| `id` | string | unique within the file; referenced by `timeline` |
| `from` | id | source node id |
| `to` | id | target node id |
| `kind` | enum | `sequence` (default) / `message` / `association` / `default` / `conditional` |
| `label` | string | optional (e.g. `"Yes"`/`"No"`) |
| `path` | `[[x,y]…]` | optional **explicit waypoints** the token travels; if omitted, the player routes orthogonally from `from.at`→`to.at` |

## `timeline`

An **ordered array of steps**. Each step addresses **one** `node` or `flow` by id.

| Key | Type | Applies to | Notes |
|-----|------|-----------|-------|
| `step` | int | all | 1-based ordinal; strictly increasing |
| `node` | id | a node | the flow node this step acts on |
| `flow` | id | a flow | the flow this step acts on |
| `duration` | int (ms) | `flow` | token travel time along the flow (before `speed`) |
| `token` | `"move"`\|`"none"` | `flow` | `move` animates a token along the path; `none` lights the trail only |
| `activate` | bool | `node` | emphasise the node while active |
| `branch` | flow id | `node` (gateway) | which outgoing flow the token takes — **illustrative**, not evaluated from data |

**Branching is illustrative.** A gateway step's `branch` records *which* flow the token takes for the
animation; a parallel gateway with no `branch` advances **all** its outgoing flows. Neither evaluates
`<conditionExpression>` or data — `kymo.anim` is a presentation artifact, not an execution trace.

## Example — `order-flow.kymo.anim.json`

The "Customer Order Fulfillment" process, self-contained (abridged nodes/flows; full timeline):

```json
{
  "format": "kymo.anim",
  "version": 1,
  "canvas": { "width": 520, "height": 1100 },
  "controls": { "autoplay": true, "loop": true, "speed": 1.0, "fr": 60 },
  "nodes": [
    { "id": "S",  "type": "start",           "at": [240, 60],   "label": "Order received" },
    { "id": "V",  "type": "task",            "at": [240, 170],  "label": "Validate order" },
    { "id": "GW", "type": "gateway-xor",     "at": [240, 300],  "label": "In stock?" },
    { "id": "P",  "type": "task",            "at": [240, 430],  "label": "Process payment" },
    { "id": "SP", "type": "gateway-parallel","at": [240, 560],  "label": "Split" },
    { "id": "Pk", "type": "task",            "at": [140, 690],  "label": "Pack items" },
    { "id": "Iv", "type": "task",            "at": [340, 690],  "label": "Generate invoice" },
    { "id": "Sy", "type": "gateway-parallel","at": [240, 820],  "label": "Sync" },
    { "id": "Sh", "type": "task",            "at": [240, 950],  "label": "Ship order" },
    { "id": "D",  "type": "end",             "at": [240, 1060], "label": "Order delivered" }
  ],
  "flows": [
    { "id": "f1", "from": "S",  "to": "V"  },
    { "id": "f2", "from": "V",  "to": "GW" },
    { "id": "f3", "from": "GW", "to": "P",  "kind": "conditional", "label": "Yes" },
    { "id": "f6", "from": "P",  "to": "SP" },
    { "id": "f7", "from": "SP", "to": "Pk", "path": [[240,560],[140,625],[140,690]] },
    { "id": "f8", "from": "SP", "to": "Iv", "path": [[240,560],[340,625],[340,690]] },
    { "id": "f9", "from": "Pk", "to": "Sy", "path": [[140,690],[140,755],[240,820]] },
    { "id": "f10","from": "Iv", "to": "Sy", "path": [[340,690],[340,755],[240,820]] },
    { "id": "f11","from": "Sy", "to": "Sh" },
    { "id": "f12","from": "Sh", "to": "D"  }
  ],
  "timeline": [
    { "step": 1,  "node": "S",  "activate": true },
    { "step": 2,  "flow": "f1", "duration": 800, "token": "move" },
    { "step": 3,  "node": "V",  "activate": true },
    { "step": 4,  "flow": "f2", "duration": 800, "token": "move" },
    { "step": 5,  "node": "GW", "branch": "f3" },
    { "step": 6,  "flow": "f3", "duration": 600, "token": "move" },
    { "step": 7,  "node": "P",  "activate": true },
    { "step": 8,  "flow": "f6", "duration": 600, "token": "move" },
    { "step": 9,  "node": "SP" },
    { "step": 10, "flow": "f7", "duration": 700, "token": "move" },
    { "step": 11, "flow": "f8", "duration": 700, "token": "move" },
    { "step": 12, "node": "Pk", "activate": true },
    { "step": 13, "node": "Iv", "activate": true },
    { "step": 14, "flow": "f9",  "duration": 700, "token": "move" },
    { "step": 15, "flow": "f10", "duration": 700, "token": "move" },
    { "step": 16, "node": "Sy", "activate": true },
    { "step": 17, "flow": "f11", "duration": 600, "token": "move" },
    { "step": 18, "node": "Sh", "activate": true },
    { "step": 19, "flow": "f12", "duration": 600, "token": "move" },
    { "step": 20, "node": "D",  "activate": true }
  ]
}
```

(`SP` is parallel — step 9 has no `branch`, so steps 10/11 advance both outgoing flows concurrently;
`GW` is exclusive — step 5 picks `f3` ("Yes").)

## JSON Schema (normative)

The shipped `kymo.anim.schema.json` (Draft 2020-12) is normative for **structure**; a semantic pass
(§ Validation) covers cross-references. Core schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kymostudio.dev/schema/kymo.anim.schema.json",
  "title": "kymo.anim",
  "type": "object",
  "required": ["format", "version", "nodes", "flows", "timeline"],
  "additionalProperties": false,
  "$defs": {
    "xy": { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 }
  },
  "properties": {
    "format": { "const": "kymo.anim" },
    "version": { "type": "integer", "minimum": 1 },
    "canvas": {
      "type": "object", "additionalProperties": false,
      "properties": { "width": { "type": "number" }, "height": { "type": "number" } }
    },
    "controls": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "autoplay": { "type": "boolean" },
        "loop": { "type": "boolean" },
        "speed": { "type": "number", "exclusiveMinimum": 0 },
        "fr": { "type": "integer", "minimum": 1 }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["id", "type", "at"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "type": { "enum": ["start","end","end-terminate","intermediate","task",
            "gateway-xor","gateway-parallel","gateway-inclusive","gateway-event",
            "subprocess","data-object","data-store","annotation"] },
          "at": { "$ref": "#/$defs/xy" },
          "size": { "$ref": "#/$defs/xy" },
          "label": { "type": "string" },
          "marker": { "type": "string" }
        }
      }
    },
    "flows": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["id", "from", "to"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "from": { "type": "string", "minLength": 1 },
          "to": { "type": "string", "minLength": 1 },
          "kind": { "enum": ["sequence","message","association","default","conditional"] },
          "label": { "type": "string" },
          "path": { "type": "array", "items": { "$ref": "#/$defs/xy" }, "minItems": 2 }
        }
      }
    },
    "timeline": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["step"],
        "properties": {
          "step": { "type": "integer", "minimum": 1 },
          "node": { "type": "string", "minLength": 1 },
          "flow": { "type": "string", "minLength": 1 },
          "duration": { "type": "integer", "minimum": 0 },
          "token": { "enum": ["move", "none"] },
          "activate": { "type": "boolean" },
          "branch": { "type": "string", "minLength": 1 }
        },
        "oneOf": [ { "required": ["node"] }, { "required": ["flow"] } ]
      }
    }
  }
}
```

## Validation

Two layers, both **dependency-free** (the repo ships no validation library; Python uses a built-in
checker, JS mirrors it — the `.schema.json` file is shipped for editors / external validators):

1. **Structural** — conforms to the schema above (required fields, enums, per-step `oneOf`,
   `additionalProperties:false`).
2. **Semantic** — **internal** cross-references resolve: every `flow.from`/`flow.to` names a `node`;
   every timeline `node`/`flow` names a defined element; `branch` is an **outgoing** flow of its
   gateway node; `step` ordinals strictly increase; all coordinates (`at`, `path`) are finite (and,
   if `canvas` is given, within it). Failures report the offending id/step (the "easy to validate"
   requirement). `validate_anim(doc)` returns the errors; players validate before rendering.

## Players, CLI & API

`kymo.anim` is a **self-contained input format** (a new front-end alongside `.bpmn` / `.kymo` /
`.kymo.json`). Players consume the one file:

- **CLI** (Python) — `kymo <file>.kymo.anim.json` renders the animated artifact (no layout pass —
  positions are explicit, like BPMN import); `kymo <diagram> --anim-init` converts an existing
  `.bpmn`/`.kymo` into a starting `kymo.anim` (positions filled from the resolved geometry) to edit.
- **Python** — `from_kymoanim.parse(text) -> AnimDoc`, `validate_anim(doc)`,
  `gen_anim(diagram) -> AnimDoc`; the SVG / WebP players read an `AnimDoc`.
- **JS** — `parseKymoAnim`, `validateAnim`, `genAnim`, and the SVG / viewer players (dependency-free).

## Round-trip & determinism

- **Generate-validate-fixpoint** — `gen_anim(d)` always validates; re-serialising a parsed doc is
  byte-stable (deterministic key/step order).
- **Render-equivalence** — a given `kymo.anim` renders deterministically and equivalently across the
  Python and JS players (gated by the conformance suite alongside `KYMOJSON-MAP-001`).
- **Golden-safety** — `kymo.anim` is **additive**: existing `.bpmn`/`.kymo`/`.kymo.json` render paths
  are untouched and stay byte-identical.

## Prior art

`kymo.anim` follows the **Lottie** model — a single self-contained JSON of *scene + animation*,
schema-validated, rendered by portable players (lottie-web / iOS / Android) — but is **higher-level
and domain-specific**: where Lottie stores generic vector layers + low-level transform keyframes
(machine-exported from After Effects, hard to hand-edit), `kymo.anim` stores **BPMN nodes/flows + a
semantic timeline** (hand-authorable, generatable), and its baseline player emits **no-JavaScript
SVG**. Declarative per-edge animation in **Mermaid** (`animate:`) and **D2** (`style.animated`), and
the interactive **bpmn-js token-simulation**, informed the timeline semantics; **CSS Motion Path**
(`offset-path` + `offset-distance`, MDN) is the no-JS token-along-path technique (SMIL
`<animateMotion>` the legacy fallback). References: airbnb/lottie + lottiefiles.com schema docs;
Mermaid flowchart docs (PR #6136); D2 styles docs; bpmn-io/bpmn-js-token-simulation; MDN
`offset-path`/`offset-distance`.

## Scope & limitations

- **Presentation, not execution** — `branch` and timings are illustrative; no condition/data
  evaluation, no BPMN engine.
- **Self-contained** — one file holds the scene + animation; it does not reference an external
  diagram (and is not embedded in a `.bpmn`). `--anim-init` is the bridge *from* a diagram.
- **No new runtime dependencies** — Python stdlib `json` + a built-in checker; JS `JSON`.

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-05-31 | Vũ Anh | Initial issue — sidecar descriptor (`target` + id-referenced `timeline`) validated by a JSON Schema. |
| 0.2     | 2026-05-31 | Vũ Anh | **Re-architected to a self-contained format** (user direction). One file now holds the scene **and** the animation: `canvas`/`controls` + **`nodes`** (id, `type`, explicit `at`) + **`flows`** (id, `from`/`to`, optional explicit `path`) + **`timeline`** (steps ref node/flow by id). Dropped `target`/sidecar; positions explicit (no layout engine); new JSON Schema; `--anim-init` now converts a diagram → `kymo.anim`; added `fr`; added the **Lottie** prior-art positioning. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo.anim.md`; authoritative source is the main-branch working
tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the feature; available to all repository readers.

### B.3 Change Control
A schema change requires: bump the envelope `version` if not backward-compatible; update this
document and `DESIGN-BPMN-ANIMATE-001`; keep the Python/JS parser+validator+players and the
conformance comparison in lockstep; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
`version` is the schema version; readers ignore unknown fields so a v1 reader tolerates a
forward-compatible v2 file. A breaking change increments `version` and is reconciled against
`FEAT-BPMN-ANIMATE-001` before release.

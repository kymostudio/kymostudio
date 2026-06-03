---
title: "Kymo DSL — Clause 10: Examples"
document_id: KYMO-DSL-EXAMPLES-001
version: "2.6"
issue_date: 2026-05-25
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers authoring or parsing `.kymo` files
review_cycle: On grammar change, or annually (whichever first)
supersedes: null
related_documents:
  - KYMO-DSL-GRAMMAR-001     # Clause 6 — Grammar
  - KYMO-DSL-SEMANTICS-001   # Clause 7 — Semantics
  - BPD-DGM-001              # Architecture-diagram best practices
authors:
  - Vũ Anh
language: en
keywords:
  - dsl
  - examples
  - samples
  - bpmn
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Kymo DSL — Clause 10: Examples

| Field             | Value                                              |
|-------------------|----------------------------------------------------|
| Document ID       | KYMO-DSL-EXAMPLES-001                             |
| Version           | 2.6                                                |
| Issue Date        | 2026-05-25                                         |
| Status            | Released                                           |
| Owner             | `diagrams/` project                                |
| Related Documents | `KYMO-DSL-GRAMMAR-001`, `KYMO-DSL-SEMANTICS-001`, `BPD-DGM-001` |

## 10. Examples

### 10.1 Minimal Diagram

```text
title: "Hello"

world outer "Hello, World" {
  greeter box/files/orange "Greeter" "" @ (100, 100)
}
```

### 10.2 Leaf With Parent Alignment

```text
orch  hex/hex-agent/green "Orchestrator" "" @ (200, 200)
child hex/hex-agent/green "Child"        "" @ orch right 60
```

### 10.3 Layout-Positioned Row

```text
row_layout horizontal pos (50, 100) gap 40 {
  one two three
}
one   box/files/orange "One"   ""
two   box/files/orange "Two"   ""
three box/files/orange "Three" ""
```

### 10.4 Nested Regions (auto-bounds enclose nested leaves)

```text
adr outer "Autonomous Deep Researcher" padding (40, 32) {
  orch       hex/hex-agent/green "Orchestrator" ""
  researcher hex/hex-agent/green "Researcher"   "Sub-Agents" @ orch right 60

  svfs inner "Shared Virtual File System" {
    fs   box/folder/orange    "File System" "Workspace" @ researcher right 100
    todo box/checklist/orange "ToDo List"   ""          @ fs right 50
  }
}
```

After parsing: `svfs.contains = ["fs", "todo"]` and `adr.contains = ["orch", "researcher", "fs", "todo"]` — the outer rect's auto-bounds envelop the inner region's leaves (clause 7.3.1).

### 10.5 Edge With Anchors and Waypoints

```text
src --> dst : "label" {
  src=bottom(0,12), dst=top(-7,0),
  via=(120,300);(220,300),
  label_offset=(0,-8), small
}
```

### 10.6 Region With Style Overrides

```text
critical inner "Critical Path"
  padding (20, 16) padding-bottom 24
  dash (0, 0) stroke #76b900
  label-position inside label-anchor middle
{
  alpha beta gamma
}
```

### 10.7 BPMN Process Block

```text
bpmn {
  start S  "Order received"
  task  V  "Validate order"
  xor   GW "In stock?"
  task  P  "Process payment"
  task  N  "Notify customer"
  end!  C  "Order cancelled"
  end   D  "Order delivered"

  S -> V -> GW
  GW -> P : "Yes"
  GW -> N : "No"
  N -> C
  P -> D
}
```

For full real-world examples, see [`aiq.kymo`](../../../samples/aiq.kymo), [`aws_1.kymo`](../../../samples/aws_1.kymo), [`data.kymo`](../../../samples/data.kymo), and [`order-flow.kymo`](../../../samples/order-flow.kymo) (a complete BPMN process with a parallel split/join).

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 2.6     | 2026-05-25 | Vũ Anh | Initial issue — extracted clause 10 (Examples) from KYMO-DSL-001 v2.5 on the split into a clause-per-file normative-reference set; sample links re-pointed to `../../../samples/`. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/kymo-dsl/10-examples.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
When the grammar changes or samples are added/renamed, update the examples here;
increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
The normative surface is `KYMO-DSL-001` (the set); examples are illustrative.
Reconcile any conflict with clause 6 before release.

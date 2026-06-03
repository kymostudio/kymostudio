---
title: "BPMN 2.0.2 — Clause 13: BPMN Execution Semantics"
document_id: BPMN-NREF-EXEC-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-PROCESS-001  # Clause 10 — Process
  - BPMN-NREF-BPEL-001     # Clause 14 — Mapping to WS-BPEL (consumes these semantics)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - execution-semantics
  - token
  - instantiation
  - process-engine
  - workflow-patterns
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Clause 13: BPMN Execution Semantics

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-EXEC-001                                         |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§13 BPMN Execution Semantics** (pp.425–444) |
| Related Documents | `BPMN-NREF-PROCESS-001`, `BPMN-NREF-BPEL-001` |

Mirrors **Clause 13 (BPMN Execution Semantics)** of the OMG BPMN 2.0.2 specification
(§13.1–§13.5, pp.425–444). Part of the normative-reference set `BPMN-NREF-001`. Where this
note and the OMG specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for §13 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §13; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## §13.1 General (p.425)
REQUIRED for **Process Execution** and **Complete** conformance; **not** required for Process
Modeling, Choreography Modeling, or BPEL Process Execution. The semantics are described
**informally (textually)**, building on prior research that formalised execution
mathematically. Each element is given through: (1) an operational-semantics description,
(2) relevant exception issues, and (3) the list of supported **Workflow Patterns**
([workflowpatterns.com](http://www.workflowpatterns.com/patterns/control/index.php)).

Some elements are **non-operational** — only a conceptual model is given, and a
Process-Execution-conformant implementation **MAY ignore** them (MAY also extend them as an
optional extension): **Manual Task**, **Abstract Task**, `DataState`, `IORules`, **Ad-Hoc
Process**, `ItemDefinition`s with `itemKind = Physical`, the `inputSetWhileExecuting`
attribute of **DataInput**, the `outputSetWhileExecuting` attribute of **DataOutput**, the
`isClosed` attribute of **Process**, and the `isImmediate` attribute of **Sequence Flow**.

## §13.2 Process Instantiation and Termination (p.426)
A **Process** is instantiated when one of its **Start Events** occurs; each occurrence creates
a new instance **unless** the Start Event participates in a **Conversation** (then a new
instance is created only if none already exists for that Conversation's correlation
information). A *global* Process MUST **not** have an empty Start Event, nor any Gateway or
Activity without *incoming* Sequence Flows — the **Event Gateway** is the only exception.

A Process may also be started via an **Event-Based Gateway** or a **Receive Task** with no
incoming Sequence Flows and `instantiate = true`. An **exclusive** Event-Based Gateway: the
first matching Event creates the instance and the others are abandoned. A **parallel**
Event-Based Gateway: the first matching Event creates the instance, then it waits for the
remaining Events. A **Multiple Parallel Start Event** specifies that instantiation waits for
several Start Events. Each Start Event places a *token* on its outgoing Sequence Flows.

A Process instance is **completed** iff: every Event of an instantiating Parallel Gateway has
occurred, **no token** remains in the instance, and **no Activity** is still active. All
tokens MUST reach an end node (a node without outgoing Sequence Flows). A token reaching a
**Terminate** End Event **abnormally terminates** the entire Process.

## §13.3 Activities (pp.426–433)

### §13.3.1 Sequence Flow Considerations (p.427)
Behaviour is defined with the *token* metaphor — a theoretical, never-drawn marker that
traverses Sequence Flows (tools are NOT required to implement tokens). An Activity that is the
target of **multiple incoming** Sequence Flows has **uncontrolled flow**: it is enabled
independently per arriving token (behaves as an **exclusive gateway**); use explicit
non-Exclusive Gateways upstream to control it. An Activity with **no incoming** Sequence Flows
is instantiated with its container — except **Compensation Activities** (specialised
instantiation). **Multiple outgoing** Sequence Flows behave as a **parallel split**;
conditional ones as an **inclusive split**; a mix combines both (Fig 13.1, p.427). The
non-operational `isImmediate` flag governs whether unmodelled Activities may run while a token
moves along a flow.

### §13.3.2 Activity (pp.428–429)
Every Activity (Task or Sub-Process) follows a lifecycle modelled as a UML state diagram
(**Fig 13.2 — The Lifecycle of a BPMN Activity**, p.428): *Inactive → Ready → Active →
Completing → Completed → (Compensating → Compensated) → Closed*, with the off-paths
*Withdrawn*, *Failing/Failed*, and *Terminating/Terminated*. The `StartQuantity` attribute
sets how many tokens are REQUIRED to activate the Activity; `CompletionQuantity` sets how many
tokens are produced on completion (an implicit Parallel Gateway when > 1). Data `InputSet`s
are evaluated in order to move *Ready → Active*; `OutputSet`s on completion (checked against
the `IORule`). An Activity may be **Withdrawn** in a race after an Event-Based Exclusive
Gateway; it **Fails** on an `error`, **Terminates** on any other interrupting Event.

### §13.3.3 Task (p.430)
Per-type execution: **Service Task** invokes the `Operation` (data from `inMessage`/to
`outMessage`; a returned *fault* is an interrupting `error`); **Send Task** sends the
associated Message; **Receive Task** waits for a Message, then completes (key-based
*correlation* ⇒ at most one instance; predicate-based ⇒ may fan out; `instantiate = true` may
start an instance); **User Task** is distributed to a person/group; **Manual Task** is a
conceptual model only (never executed by IT); **Business Rule Task** calls a business rule;
**Script Task** runs the script; **Abstract Task** completes immediately (conceptual only).

### §13.3.4 Sub-Process / Call Activity (pp.430–431)
A **Sub-Process** is instantiated when reached by a token; it has either one empty Start Event
(gets the token) or no Start Event but Activities/Gateways without incoming flows (all get a
token) — it MUST NOT have non-empty Start Events. It completes when no token remains and no
Activity is active. A *terminate* End Event abnormally terminates it; a *cancel* End Event
aborts the associated **Transaction** and leaves through a cancel boundary Event. A **Call
Activity** to a global Process shares Sub-Process instantiation/completion, but the called
global Process MAY have non-empty Start Events (ignored when called).

### §13.3.5 Ad-Hoc Sub-Process (p.431)
Contains inner Activities executed with flexible ordering — no required complete Start→End
flow. A subset is *enabled* at any time; `ordering` = sequential (one at a time) or parallel.
After each inner Activity, the `completionCondition` is evaluated: *true* ⇒ the Ad-Hoc
Sub-Process completes (with `cancelRemainingInstances` deciding whether running instances are
canceled). **Workflow patterns:** WCP-17 Interleaved Parallel Routing.

### §13.3.6 Loop Activity (p.432)
Wraps an inner Activity executed repeatedly *in sequence* while `loopCondition` holds;
`testBefore` chooses a **pre-tested** (before) or **post-tested** (after) loop; `loopMaximum`
bounds iterations (unbounded if unset). **Workflow patterns:** WCP-21 Structured Loop.

### §13.3.7 Multiple Instances (MI) Activity (pp.432–433)
Wraps an Activity spawned multiple times. `isSequential` = sequential vs parallel; the count
comes from `loopCardinality` Expression or a collection-valued data input. `completionCondition`
cancels remaining instances when *true*. `behavior` controls Event throwing on completion:
**none** (throws for all), **one** (on first), **all** (never throws), **complex**
(`complexBehaviorDefinition`s decide). In practice an MI Activity processes a data *collection*
(`loopDataInput` → `inputDataItem` per instance; `outputDataItem` → `loopDataOutput`). An MI
Activity is *compensated* only if all its instances completed successfully. **Workflow
patterns:** WCP-21 Structured Loop; Multiple-Instance Patterns WCP-13, 14, 34, 36.

## §13.4 Gateways (pp.434–439)

### §13.4.1 Parallel Gateway — Fork and Join (p.434)
Activates when **at least one token** is on **each** incoming Sequence Flow; consumes exactly
one token per incoming flow and produces exactly one per outgoing flow (excess tokens remain).
Cannot throw exceptions. (Table 13.1, p.434; Fig 13.3.) **Workflow patterns:** WCP-2 Parallel
Split, WCP-3 Synchronization.

### §13.4.2 Exclusive Gateway — data-based decision & merge (p.435)
Pass-through merge; each arriving token is routed to **exactly one** outgoing flow. Conditions
are evaluated **in order**; the first *true* wins; if none, the **default** flow is taken.
**Throws an exception** if all conditions are false and no default is specified. (Table 13.2,
p.435; Fig 13.4.) **Workflow patterns:** WCP-4 Exclusive Choice, WCP-5 Simple Merge, WCP-8
Multi-Merge.

### §13.4.3 Inclusive Gateway — decision & merge (p.436)
Synchronises a *subset* of incoming branches and fires a *subset* of outgoing branches. The
activation condition is defined over directed paths carrying tokens (Table 13.3, p.436);
on execution a token is consumed from each incoming flow that has one, and every outgoing
flow whose condition is *true* gets a token (else the default). **Throws an exception** if all
conditions are false and no default exists. (Fig 13.5.) **Workflow patterns:** WCP-6
Multi-Choice, WCP-7 Structured Synchronizing Merge, WCP-37 Acyclic Synchronizing Merge, WCP-38
General Synchronizing Merge.

### §13.4.4 Event-Based Gateway — event-based decision (p.437)
Pass-through merge; exactly one outgoing branch activates depending on which of the
configured **Events**/**Tasks** completes *first* (the rest are withdrawn). When used at a
Process start as a **Parallel Event Gateway**, only Message-based triggers are allowed, and
the triggering Messages MUST be part of a Conversation with the same correlation. Cannot throw
exceptions. (Table 13.4, p.437; Fig 13.6.) **Workflow patterns:** WCP-16 Deferred Choice.

### §13.4.5 Complex Gateway — complex condition & merge (pp.437–439)
For complex synchronisation/race behaviour (diverging like an Inclusive Gateway). Each
incoming gate has an `activationCount`; the `activationExpression` is a boolean Expression over
those counts (e.g. `x1+x2+…+xm >= 3`). The Gateway has two runtime states: `waitingForStart`
and `waitingForReset`. While *waiting for start* it waits for the `activationExpression`;
when *true* it consumes tokens, fires the *true*-conditioned outgoing flows (else the default,
else an exception), and switches to *waiting for reset*. If the activation condition never
becomes true, tokens may block indefinitely → potential **deadlock**. (Table 13.5, pp.437–439;
Fig 13.7.) **Workflow patterns:** WCP-9 Structured Discriminator, WCP-28 Blocking
Discriminator, WCP-30 Structured Partial Join, WCP-31 Blocking Partial Join.

## §13.5 Events (pp.439–443)

- **§13.5.1 Start Events** (p.439) — each occurrence starts a new instance (or routes to an
  existing instance for a Conversation). A Process may also start via an **Event-Based
  Gateway** (the only scenario where a Gateway has no incoming flows); multiple Event-Based
  Gateway groups may start a Process when they share a Conversation.
- **§13.5.2 Intermediate Events** (p.440) — handling waits for the Event to occur, then
  consumes it; *catch* Message Intermediate Events share the Receive-Task correlation
  behaviour (§13.3.3).
- **§13.5.3 Intermediate Boundary Events** (p.440) — on occurrence, the `cancelActivity`
  attribute decides whether the host Activity is **cancelled** (interrupting) or **continues**
  (non-interrupting; possible for Message/Signal/Timer/Conditional, **not** Error). Execution
  then follows the boundary Event's Sequence Flow.
- **§13.5.4 Event Sub-Processes** (pp.440–441) — handle an Event in the context of a
  Sub-Process/Process; begin with a Start Event; not instantiated by normal flow, only when
  their Start Event triggers. `isInterrupting` set ⇒ cancels the enclosing Sub-Process; unset
  ⇒ runs in parallel (multiple non-interrupting handlers possible; only one interrupting
  handler per `EventDefinition`). An error-triggered interrupting handler puts the parent into
  *Failing*; other interrupting Events into *Terminating*.
- **§13.5.5 Compensation** (pp.441–443) — undoing already-completed work. Performed by a
  *compensation handler* (a **Compensation Event Sub-Process** or an associated **Compensation
  Activity**) over the parent's **snapshot data**. Triggered by a *throw* Compensation Event
  (`waitForCompletion` defaults to synchronous). Follows a **"presumed abort" principle**:
  only completed Activities are compensated, and compensation runs in **reverse order** of
  forward execution (respecting Sequence-Flow, data, Ad-Hoc, loop/MI, and boundary-Event
  dependencies). The Sub-Process `compensable` attribute implies default compensation.
- **§13.5.6 End Events** (p.443) — *Process level*: a **terminate** End Event abnormally
  terminates the Process (other instances unaffected); other End Events perform the
  type-specific behaviour, and the instance completes iff all Start nodes were visited and no
  token remains. *Sub-Process level*: a **terminate** terminates only the affected instance; a
  **cancel** aborts the associated transaction and leaves via a cancel boundary Event.

The descriptive token-flow summary is in `REF-BPMN-001 §15`; these semantics are the reference
behaviour the WS-BPEL mapping (`BPMN-NREF-BPEL-001`) must preserve.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §13.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added the §13.1 conformance scope + non-operational element list, §13.2 instantiation/termination rules, the §13.3.2 Activity lifecycle (Fig 13.2) with `StartQuantity`/`CompletionQuantity`, per-type Task execution, Ad-Hoc/Loop/MI semantics, the five Gateway execution-semantic tables (Tables 13.1–13.5) with their Workflow-Pattern (WCP) support, the §13.5 Event-handling rules (`cancelActivity`, `isInterrupting`, presumed-abort compensation), and page/table/figure citations. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/13-execution-semantics.md`; authoritative source is
the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §13 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §13 (pp.425–444), Tables 13.1–13.5, Figures 13.1–13.7; `REF-BPMN-001 §15`.

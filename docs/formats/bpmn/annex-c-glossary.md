---
title: "BPMN 2.0.2 — Annex C: Glossary"
document_id: BPMN-NREF-ANNEXC-001
version: "1.3"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001          # Normative-reference set (index)
  - BPMN-NREF-TERMS-001    # Clause 4 — Terms and Definitions
  - REF-BPMN-001           # BPMN 2.0 research reference (glossary §3)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - glossary
  - terms
  - definitions
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

# BPMN 2.0.2 — Annex C: Glossary

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ANNEXC-001                                       |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **Annex C — Glossary** *(informative)* (pp.499–502) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-TERMS-001`, `REF-BPMN-001`        |

Mirrors **Annex C (Glossary)** — an **informative** annex — of the OMG BPMN 2.0.2
specification (pp.499–502). Part of the normative-reference set `BPMN-NREF-001`. Where this
note and the OMG specification disagree, the OMG specification is authoritative.

> **Normative wording.** This file states the **normative wording** for Annex C of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 Annex C; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

## Annex C — Glossary (pp.499–502)
The spec's alphabetical glossary lists the following **46 terms** (paraphrased below; the
spec's headings group them A, B, C, D, E, F, I, J, L, M, N, P, R, S, T, U). For the normative
running definitions see Clause 4 (`BPMN-NREF-TERMS-001`) and the bodies of the relevant
clauses.

**A** — **Activity**: work an organisation performs; atomic or compound (Process,
Sub-Process, Task). **Abstract Process**: a Process showing the interactions between a private
process and another process/participant. **Artifact**: a graphical object giving supporting
information without affecting flow. **Association**: a connecting object (dotted line, open
arrowhead) linking information/Artifacts to Flow Objects. **Atomic Activity**: an activity not
broken down further — a leaf, drawn as a Task.

**B** — **Business Analyst**: a specialist who analyses business needs and defines/manages
requirements. **Business Process**: a defined set of activities achieving a business
objective. **Business Process Management (BPM)**: the services/tools supporting process
management (analysis, definition, monitoring, administration). **BPM System**: the technology
that enables BPM.

**C** — **Choreography**: an ordered sequence of B2B Message exchanges between Participants,
with no central controller. **Collaboration**: the act of sending Messages between two
Participants (two separate processes). **Collapsed Sub-Process**: a Sub-Process hiding its
detail, marked with a small **+** square.

**D** — **Decision**: a Gateway where the Sequence Flow takes one of several alternative paths
("Or-Split").

**E** — **End Event**: an Event ending a path (no outgoing Sequence Flow); may carry a Result
(Message, Error, Compensation, Signal, Link, Multiple); drawn as a thick single-line circle.
**Event Context**: the set of activities that an Intermediate Event can interrupt. **Exception**:
an event diverting from Normal Flow (time, error, message). **Exception Flow**: a Sequence Flow
from a boundary Intermediate Event, traversed only when the Activity is interrupted.
**Expanded Sub-Process**: a Sub-Process exposing its inner Flow Objects (enlarged rounded
rectangle).

**F** — **Flow**: a directional connector (Sequence Flow within a Process/Choreography, Message
Flow between Participants). **Flow Object**: an Event, Activity or Gateway (in Choreography:
Event, Choreography Activity, Gateway). **Fork**: a point splitting one path into parallel
paths ("AND-Split"; via multiple outgoing flows or a Parallel Gateway).

**I** — **Intermediate Event**: an Event occurring after a Process has started — showing
expected messages/delays, exception handling, or compensation flow; never starts/terminates a
Process; drawn as a thin double-line circle.

**J** — **Join**: a point combining parallel paths into one ("AND-Join"; via a Parallel
Gateway).

**L** — **Lane**: a partition organising activities within a Pool, spanning its full length
(roles, systems, departments).

**M** — **Merge**: a point combining alternative paths into one with no synchronisation
("Or-Join"; via multiple incoming flows or an Exclusive Gateway). **Message**: an object
depicting the contents of a communication between two Participants. **Message Flow**: a
connecting object (dashed line) showing Messages between two Participants.

**N** — **Normal Flow**: flow from a Start Event through activities on alternative/parallel
paths to an End Event.

**P** — **Parent Process**: a Process holding a Sub-Process within its boundaries.
**Participant**: a business entity/role controlling a process (associated with one Pool;
informally "Pools"). **Pool**: the graphical container representing a Participant (may be a
"black box"). **Private Business Process**: a process internal to an organisation
("workflow"/"BPM" process). **Process**: a sequence of Activities achieving work — a graph of
Flow Elements (Activities, Events, Gateways, Sequence Flows) with finite execution semantics.

**R** — **Result**: the consequence of reaching an End Event (Message, Error, Compensation,
Signal, Link, Multiple).

**S** — **Sequence Flow**: a connecting object (solid line) showing activity order; one source
and one target; may cross Lane boundaries but not the Pool boundary. **Start Event**: an Event
beginning a Process (no incoming Sequence Flow; may have a Trigger); thin single-line circle.
**Sub-Process**: a Process included in another, viewed collapsed or expanded; shares the Task's
rounded-rectangle shape. **Swimlane**: a graphical container partitioning activities — Pool and
Lane.

**T** — **Task**: an atomic activity within a Process (work not decomposed further). **Token**:
a theoretical marker used to define a Process's behaviour as it "traverses" the structure.
**Transaction**: a Sub-Process of coordinated activities across loosely-coupled systems with an
agreed, consistent, verifiable outcome. **Trigger**: a mechanism detecting an occurrence and
causing processing (on Start/Intermediate Events; type Message, Timer, Conditional, Signal,
Link, Multiple).

**U** — **Uncontrolled Flow**: flow without dependencies/conditions — a Sequence Flow between
two activities with no conditional indicator or intervening Gateway.

The full normative term set is in Clause 4 (`BPMN-NREF-TERMS-001`); the project's running
glossary is `REF-BPMN-001 §3`.

## Annex A — Revision History

| Version | Date       | Author | Changes                       |
|---------|------------|--------|-------------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — BPMN Annex C. |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: rebuilt the term list from the actual 46 glossary entries (A–U), removing entries not in the BPMN glossary (e.g. "Conversation", "Event", "Gateway", "Orchestration") and adding the real ones (Abstract Process, Atomic/Compound Activity, Business Analyst, BPM/BPM System, Collapsed/Expanded Sub-Process, Decision, Event Context, Exception(/Flow), Fork/Join/Merge, Normal/Controlled/Uncontrolled Flow, Parent Process, Private Business Process, Result, Transaction, Trigger, …); paraphrased each gloss; added page citation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/annex-c-glossary.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 Annex C on any edition change. Increment `version`; append a
row to the Revision History above.

### B.4 References
OMG BPMN 2.0.2 Annex C (pp.499–502), §4; `REF-BPMN-001 §3`.

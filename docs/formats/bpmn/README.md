---
title: BPMN 2.0.2 — Normative Reference (Index)
document_id: BPMN-NREF-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-SCOPE-001     # Clause 1 — Scope
  - BPMN-NREF-CONF-001      # Clause 2 — Conformance
  - BPMN-NREF-NORMREF-001   # Clause 3 — Normative References
  - BPMN-NREF-TERMS-001     # Clause 4 — Terms and Definitions
  - BPMN-NREF-SYMBOLS-001   # Clause 5 — Symbols
  - BPMN-NREF-ADDINFO-001   # Clause 6 — Additional Information
  - BPMN-NREF-OVERVIEW-001  # Clause 7 — Overview
  - BPMN-NREF-CORE-001      # Clause 8 — BPMN Core Structure
  - BPMN-NREF-COLLAB-001    # Clause 9 — Collaboration
  - BPMN-NREF-PROCESS-001   # Clause 10 — Process
  - BPMN-NREF-CHOREO-001    # Clause 11 — Choreography
  - BPMN-NREF-NOTATION-001  # Clause 12 — BPMN Notation and Diagrams (BPMN DI)
  - BPMN-NREF-EXEC-001      # Clause 13 — Execution Semantics
  - BPMN-NREF-BPEL-001      # Clause 14 — Mapping to WS-BPEL
  - BPMN-NREF-EXCHANGE-001  # Clause 15 — Exchange Formats
  - BPMN-NREF-ANNEXA-001    # Annex A — Changes from v1.2
  - BPMN-NREF-ANNEXB-001    # Annex B — Diagram Interchange
  - BPMN-NREF-ANNEXC-001    # Annex C — Glossary
  - REF-BPMN-001            # BPMN 2.0 research reference (notation/semantics)
  - BPMN-MAP-001            # element mapping companion (kymo-mapping.md)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - normative-reference
  - iso-19510
  - omg
  - interchange
  - diagram-interchange
  - element-catalogue
iso_compliance:
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
upstream:
  project: OMG Business Process Model and Notation (BPMN)
  homepage: https://www.omg.org/spec/BPMN/
  specification: https://www.omg.org/spec/BPMN/2.0.2/PDF
  iso_equivalent: ISO/IEC 19510:2013
  document_number: formal/2013-12-09
  version_reviewed: "2.0.2 (OMG, December 2013) / ISO/IEC 19510:2013"
  access_date: 2026-05-24
---

# BPMN 2.0.2 — Normative Reference (Index)

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-001                                                 |
| Version           | 1.4                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Classification    | Internal                                                     |
| Owner             | `diagrams/` project                                          |
| Audience          | Engineers reading, writing, or implementing BPMN 2.0 interchange |
| Review Cycle      | On OMG BPMN release                                          |
| Supersedes        | —                                                            |
| Upstream          | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) (`formal/2013-12-09`) |
| ISO Equivalent    | ISO/IEC 19510:2013                                          |
| Related Documents | the 15 clause files + 3 annex files below, `REF-BPMN-001`, `BPMN-MAP-001` |

This folder is a **normative reference for the `.bpmn` interchange format** — the
serialisation of **BPMN 2.0** defined by the OMG *Business Process Model and Notation*
specification, version 2.0.2 (`formal/2013-12-09`), published as **ISO/IEC 19510:2013**.

Its structure is a **1:1 mirror of the OMG specification**: one file per clause and per
annex — the spec's **15 clauses** and **3 annexes** — so a reader can go straight from a
clause number in the standard to the corresponding file here. Each file cites the governing
OMG clause.

> **Authoritative source.** Object Management Group. *Business Process Model and Notation
> (BPMN), Version 2.0.2.* OMG document `formal/2013-12-09`, December 2013. PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF>. Published as **ISO/IEC 19510:2013**. The
> machine-consumable files (XSD, XMI, and XSLT — the main schema being `XSD/BPMN20.xsd`),
> published in OMG document `dtc/2010-05-04`, are normative parts of the specification
> (see Clause 15, `BPMN-NREF-EXCHANGE-001`).
>
> These files state the **normative wording** for the `.bpmn` interchange format adopted by
> this project, following the OMG standard; they do **not** reproduce the OMG specification's
> copyrighted text. The official OMG PDF (above) is the **upstream source of record** — **where
> this reference and the OMG specification disagree, the OMG specification is authoritative.**

## Contents — the 15 clauses

| Clause | File | `document_id` |
|---|---|---|
| 1 — Scope | [`01-scope.md`](01-scope.md) | `BPMN-NREF-SCOPE-001` |
| 2 — Conformance | [`02-conformance.md`](02-conformance.md) | `BPMN-NREF-CONF-001` |
| 3 — Normative References | [`03-normative-references.md`](03-normative-references.md) | `BPMN-NREF-NORMREF-001` |
| 4 — Terms and Definitions | [`04-terms-and-definitions.md`](04-terms-and-definitions.md) | `BPMN-NREF-TERMS-001` |
| 5 — Symbols | [`05-symbols.md`](05-symbols.md) | `BPMN-NREF-SYMBOLS-001` |
| 6 — Additional Information | [`06-additional-information.md`](06-additional-information.md) | `BPMN-NREF-ADDINFO-001` |
| 7 — Overview | [`07-overview.md`](07-overview.md) | `BPMN-NREF-OVERVIEW-001` |
| 8 — BPMN Core Structure | [`08-bpmn-core-structure.md`](08-bpmn-core-structure.md) | `BPMN-NREF-CORE-001` |
| 9 — Collaboration | [`09-collaboration.md`](09-collaboration.md) | `BPMN-NREF-COLLAB-001` |
| 10 — Process | [`10-process.md`](10-process.md) | `BPMN-NREF-PROCESS-001` |
| 11 — Choreography | [`11-choreography.md`](11-choreography.md) | `BPMN-NREF-CHOREO-001` |
| 12 — BPMN Notation and Diagrams (BPMN DI) | [`12-bpmn-notation-and-diagrams.md`](12-bpmn-notation-and-diagrams.md) | `BPMN-NREF-NOTATION-001` |
| 13 — BPMN Execution Semantics | [`13-execution-semantics.md`](13-execution-semantics.md) | `BPMN-NREF-EXEC-001` |
| 14 — Mapping BPMN Models to WS-BPEL | [`14-mapping-to-ws-bpel.md`](14-mapping-to-ws-bpel.md) | `BPMN-NREF-BPEL-001` |
| 15 — Exchange Formats | [`15-exchange-formats.md`](15-exchange-formats.md) | `BPMN-NREF-EXCHANGE-001` |

## Contents — the 3 annexes

| Annex | File | `document_id` |
|---|---|---|
| A — Changes from v1.2 | [`annex-a-changes-from-v1.2.md`](annex-a-changes-from-v1.2.md) | `BPMN-NREF-ANNEXA-001` |
| B — Diagram Interchange | [`annex-b-diagram-interchange.md`](annex-b-diagram-interchange.md) | `BPMN-NREF-ANNEXB-001` |
| C — Glossary | [`annex-c-glossary.md`](annex-c-glossary.md) | `BPMN-NREF-ANNEXC-001` |

## Companion documents

| File / id | What |
|---|---|
| [`kymo-mapping.md`](kymo-mapping.md) (`BPMN-MAP-001`) | The element mapping (import/export render view), kept alongside this reference. |
| `REF-BPMN-001` (`docs/diagrams/bpmn/`) | A descriptive research reference — BPMN as a notation: taxonomy, token-flow semantics, conformance classes, diagram types, ecosystem. |

## Annex A — Revision History

**Table A.1 — Document revisions**

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — index for the `docs/formats/bpmn/` BPMN 2.0.2 normative-reference set. |
| 1.1     | 2026-05-24 | Vũ Anh | Restructured the set as a **1:1 mirror of the OMG specification** — one file per clause (`01`–`15`) and per annex (`annex-a`/`-b`/`-c`). |
| 1.2     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes from the clause/annex files (the set is now a pure OMG-spec reference); the element mapping stays in `kymo-mapping.md` as a companion. |
| 1.3     | 2026-05-24 | Vũ Anh | Added an explicit "Authoritative text" pointer to the official OMG PDF in every clause/annex file; the set summarises and links to the standard rather than reproducing it. |
| 1.4     | 2026-05-24 | Vũ Anh | **Synced the whole set against the OMG BPMN 2.0.2 PDF** (read clause-by-clause): corrected sub-clause numbers/titles, enriched every clause/annex with verified element/attribute/marker/semantic detail, and added inline **printed page numbers + figure/table citations** throughout (all 15 clause files + 3 annexes bumped to 1.3). Fixed two spec-fact errors found during the sync — §15.2's machine-readable-file list (now the actual `dtc/2010-05-04` layout, here and in `BPMN-NREF-EXCHANGE-001`) and Annex A's change list (now the spec's own notational/technical changes). `kymo-mapping.md` (`BPMN-MAP-001`) cross-checked against the verified spec facts — no changes required. Reframed each clause/annex file's lead disclaimer from a "non-verbatim summary" that deferred to the PDF for the normative wording, to **the normative wording** for the `.bpmn` format adopted by this project (still not reproducing OMG's copyrighted text; OMG remains the upstream source of record). |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/README.md`; authoritative source is the main-branch
working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the repository; available to all readers.

### B.3 Change Control
Update when the BPMN edition changes, or when a clause/annex file is added or removed.
Re-verify any altered clause citation against the OMG/ISO source of record. Increment
`version` and append a row to Annex A.

### B.4 References
OMG BPMN 2.0.2 (`formal/2013-12-09`) / ISO/IEC 19510:2013; `REF-BPMN-001`.

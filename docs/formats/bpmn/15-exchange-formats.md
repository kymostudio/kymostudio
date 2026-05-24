---
title: "BPMN 2.0.2 — Clause 15: Exchange Formats"
document_id: BPMN-NREF-EXCHANGE-001
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
  - BPMN-NREF-NOTATION-001 # Clause 12 — BPMN DI (the DI namespaces)
  - BPMN-NREF-CORE-001     # Clause 8 — Core (Definitions, Import)
  - REF-BPMN-001           # BPMN 2.0 research reference (interchange §16)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - exchange-formats
  - xsd
  - xmi
  - xslt
  - xml-serialization
  - interchange
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

# BPMN 2.0.2 — Clause 15: Exchange Formats

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-EXCHANGE-001                                    |
| Version           | 1.3                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Mirrors           | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§15 Exchange Formats** (pp.475–478) |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-NOTATION-001`, `BPMN-NREF-CORE-001`, `REF-BPMN-001` |

Mirrors **Clause 15 (Exchange Formats)** of the OMG BPMN 2.0.2 specification (§15.1–§15.5,
pp.475–478) — the XML serialisation of a `.bpmn` file. Part of the normative-reference set
`BPMN-NREF-001`. Where this note and the OMG specification disagree, the OMG specification is
authoritative.

> **Normative wording.** This file states the **normative wording** for §15 of the `.bpmn`
> interchange format adopted by this project, following OMG BPMN 2.0.2 §15; it does **not**
> reproduce the copyrighted OMG text. The upstream source of record is the official OMG PDF:
> <https://www.omg.org/spec/BPMN/2.0.2/PDF> (ISO/IEC 19510:2013).

> **Edition note.** The edition reviewed here is the maintenance release **2.0.2** (OMG
> `formal/2013-12-09`), which is identical in content to **ISO/IEC 19510:2013**.

## §15.1 Interchanging Incomplete Models (p.475)
Models are commonly interchanged *before* they are complete (iterative modelling — a high-level
model passed on for refinement). An "incomplete" model is one where mandatory attributes are
unfilled or a cardinality lower-bound is unmet. XMI permits this, and BPMN extends it to XML
files based on the **BPMN XSD**; implementers support the interchange by (1) **disregarding
missing attributes** marked `required` in the XSD, and (2) **reducing the lower bound** of
elements whose `minOccurs` is greater than 0.

## §15.2 Machine Readable Files (p.475)
The normative machine-readable files (XSD, XMI, and XSLT) are published in **OMG Document
`dtc/2010-05-04`**, a zip archive:

- **XSD** files are under the `XSD/` folder; the main file is `XSD/BPMN20.xsd`.
- **XMI** files are under the `XMI/` folder; the main file is `XSD/BPMN20.cmof`.
- **XSLT** files are under the `XSLT/` folder.

## §15.3 XSD (pp.475–477)

### §15.3.1 Document Structure (pp.475–476)
A domain-specific set of model elements is interchanged in one or more BPMN files. The **root
element of each file MUST be `<bpmn:definitions>`** (§8.2, `BPMN-NREF-CORE-001`). The set of
files MUST be **self-contained**: every definition used in a file MUST be imported directly or
indirectly via `<bpmn:import>`. Each file MUST declare a `targetNamespace` (which MAY differ
between files of one model). A BPMN file MAY import **non-BPMN** files (XSDs, WSDLs) when its
elements use external definitions. The worked example splits a model into `main.bpmn` (a
`<bpmn:collaboration>` whose `<bpmn:participant processRef="s1:process1">` imports
`semantic1.bpmn` for the `<bpmn:process>` and `diagram1.bpmn` for the
`<bpmndi:BPMNDiagram>`/`<bpmndi:BPMNPlane element="main:collaboration1">`). The semantic model
namespace is `http://www.omg.org/spec/BPMN/20100524/MODEL`; the DI namespaces are specified in
Clause 12 (`BPMN-NREF-NOTATION-001`).

### §15.3.2 References within the BPMN XSD (pp.476–477)
All BPMN elements carry an `id`, and references are expressed through these IDs. The XSD
`IDREF` type — the traditional mechanism — can reference an element only **within the same
file**. To reference **across files**, the BPMN XSD uses **QNames**: an optional namespace
prefix plus a local part, where the local part is the target element's `id` (e.g. a Process
`id="Patient_Handling_Process_ID1"` is referenced as
`processRef="process_ns:Patient_Handling_Process_ID1"`). The XSD uses `IDREF`s wherever
possible and resorts to QName only when a reference can span files — in both cases the
reference is still ID-based.

## §15.4 XMI (p.477)
For serialising BPMN 2.0 models as XMI, two tags are set explicitly (others keep their
defaults): `nsURI = "http://www.omg.org/spec/BPMN/20100524/XMI"` and `nsPrefix = "bpmn"`. The
spec notes that XMI interchange of *diagram* information would be published once the OMG Diagram
Definition RFP aligned with BPMN — which it later did (the DI model is now Clause 12,
`BPMN-NREF-NOTATION-001`).

## §15.5 XSLT Transformation between XSD and XMI (p.477)
Two XSLT stylesheets transform between the XSD and XMI serialisations: `XSLT/BPMN20-ToXMI.xslt`
(XSD → XMI) and `XSLT/BPMN20-FromXMI.xslt` (XMI → XSD).

The model/diagram interchange split is discussed in `REF-BPMN-001 §16`.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §15.     |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: corrected §15.2 to the actual `dtc/2010-05-04` file layout (`XSD/BPMN20.xsd`, `XSD/BPMN20.cmof`, XSLT folder) — dropped the earlier fabricated `Semantic.xsd`/`BPMNDI.xsd`/`DI.xsd` enumeration; added §15.1 incomplete-model rules, the §15.3.1 self-containment/import/QName document structure with the worked `main.bpmn` example, §15.3.2 ID/IDREF-vs-QName referencing, §15.4 XMI tags, §15.5 XSLT filenames, and page citations; replaced the unverified "only delta is Clause 15" 2.0.2 note with a neutral edition note. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/15-exchange-formats.md`; authoritative source is the
main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §15 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §15 (pp.475–478), §12; `REF-BPMN-001 §16`.

---
title: "BPMN 2.0.2 — Clause 6: Additional Information"
document_id: BPMN-NREF-ADDINFO-001
version: "1.4"
issue_date: 2026-05-24
status: Released
classification: Internal
owner: diagrams/ project
audience: Engineers reading, writing, or implementing BPMN 2.0 (`.bpmn`) interchange
review_cycle: On OMG BPMN release
supersedes: null
related_documents:
  - BPMN-NREF-001         # Normative-reference set (index)
  - BPMN-NREF-ANNEXA-001  # Annex A — Changes from v1.2
  - REF-BPMN-001          # BPMN 2.0 research reference (history §5)
authors:
  - Vũ Anh
language: en
keywords:
  - bpmn
  - conventions
  - rfc-2119
  - cardinality
  - document-structure
  - acknowledgments
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

# BPMN 2.0.2 — Clause 6: Additional Information

| Field             | Value                                                          |
|-------------------|----------------------------------------------------------------|
| Document ID       | BPMN-NREF-ADDINFO-001                                      |
| Version           | 1.4                                                           |
| Issue Date        | 2026-05-24                                                    |
| Status            | Released                                                      |
| Owner             | `diagrams/` project                                          |
| Source            | [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF) **§6 Additional Information** (pp.16–18) / ISO/IEC 19510:2013 |
| Related Documents | `BPMN-NREF-001`, `BPMN-NREF-ANNEXA-001`, `REF-BPMN-001`       |

## 6.1 Conventions (pp.16–17)

The sub clause introduces the conventions used in this document. This includes (text) notational
conventions and notations for schema components. Also included are designated namespace
definitions.

### 6.1.1 Typographical and Linguistic Conventions and Style (pp.16–17)

This International Standard incorporates the following conventions:

- The keywords "MUST," "MUST NOT," "REQUIRED," "SHALL," "SHALL NOT," "SHOULD," "SHOULD NOT,"
  "RECOMMENDED," "MAY," and "OPTIONAL" in this document are to be interpreted as described in
  RFC-2119.
- A **term** is a word or phrase that has a special meaning. When a term is defined, the term name
  is highlighted in **bold** typeface.
- A reference to another definition, sub clause, or specification is highlighted with
  <u>underlined</u> typeface and provides a link to the relevant location in this International
  Standard.
- A reference to a graphical element is highlighted with a bold, capitalized word and will be
  presented with the **Arial** font (e.g., **Sub-Process**).
- A reference to a non-graphical element or **BPMN** concept is highlighted by being italicized
  and will be presented with the Times New Roman font (e.g., *token*).
- A reference to an attribute or model association will be presented with the Courier New font
  (e.g., `Expression`).
- A reference to a WSBPEL element, attribute, or construct is highlighted with an italic
  lower-case word, usually preceded by the word "WSBPEL" and will be presented with the Courier
  New font (e.g., WSBPEL `pick`).
- Non-normative examples are set off in boxes and accompanied by a brief explanation.
- XML and pseudo code is highlighted with `mono-spaced` typeface. Different font colors MAY be
  used to highlight the different components of the XML code.
- The cardinality of any content part is specified using the following operators:

  | Operator | Meaning |
  |---|---|
  | `<none>` | exactly once |
  | `[0..1]` | 0 or 1 |
  | `[0..*]` | 0 or more |
  | `[1..*]` | 1 or more |

- Attributes separated by `|` and grouped within `{` and `}` — alternative values; `<value>` —
  default value; `<type>` — the type of the attribute.

### 6.1.2 Abbreviations (p.17)

The following abbreviations are used throughout:

| This abbreviation | Refers to |
|---|---|
| **WSBPEL** | Web Services Business Process Execution Language (see WSBPEL). This abbreviation refers specifically to version 2.0 of this International Standard. |
| **WSDL** | Web Service Description Language (see WSDL). This abbreviation refers specifically to the W3C Technical Note, 15 March 2001, but is intended to support future versions of the WSDL specification. |

## 6.2 Structure of this Document (p.17)

Clause 1 discusses the scope of the document and provides a summary of the elements introduced in
subsequent clauses of the document.

Clause 7 introduces the **BPMN** Core that includes basic **BPMN** elements needed for
constructing various **Business Processes**, including collaborations, *orchestration*
**Processes** and **Choreographies**.

Elements needed for modeling of **Collaborations**, *orchestration* **Processes**,
**Conversations**, and **Choreographies** are introduced in Clauses 8, 9, 10 and 11,
respectively.

Clause 13 introduces the **BPMN** visual diagram model. Clause 14 defines the execution semantics
for **Process** *orchestrations* in **BPMN 2.0**. Clause 14 discusses a mapping of a **BPMN**
model to WS-BPEL that is derived by analyzing the **BPMN** objects and the relationships between
these objects. Exchange formats and an XSLT transformation between them are provided in Clause 15.

## 6.3 Acknowledgments (pp.17–18)

**Submitting Organizations.** The following companies are formal submitting members of OMG:

- Axway
- International Business Machines
- MEGA International
- Oracle
- SAP AG
- Unisys

**Supporting Organizations.** The following organizations support this International Standard but
are not formal submitters:

- Accenture
- Adaptive
- BizAgi
- Bruce Silver Associates
- Capgemini
- Enterprise Agility
- France Telecom
- IDS Scheer
- Intalio
- Metastorm
- Model Driven Solutions
- Nortel
- Red Hat Software
- Software AG
- TIBCO Software
- Vangent

**Special Acknowledgments.** The following persons were members of the core teams that
contributed to the content of this International Standard: Anurag Aggarwal, Mike Amend, Sylvain
Astier, Alistair Barros, Rob Bartel, Mariano Benitez, Conrad Bock, Gary Brown, Justin Brunt, John
Bulles, Martin Chapman, Fred Cummins, Rouven Day, Maged Elaasar, David Frankel, Denis Gagné, John
Hall, Reiner Hille-Doering, Dave Ings, Pablo Irassar, Oliver Kieselbach, Matthias Kloppmann, Jana
Koehler, Frank Michael Kraft, Tammo van Lessen, Frank Leymann, Antoine Lonjon, Sumeet Malhotra,
Falko Menge, Jeff Mischkinsky, Dale Moberg, Alex Moffat, Ralf Mueller, Sjir Nijssen, Karsten
Ploesser, Pete Rivett, Michael Rowley, Bernd Ruecker, Tom Rutt, Suzette Samoojh, Robert Shapiro,
Vishal Saxena, Scott Schanel, Axel Scheithauer, Bruce Silver, Meera Srinivasan, Antoine Toulme,
Ivana Trickovic, Hagen Voelzer, Franz Weber, Andrea Westerinen and Stephen A. White.

In addition, the following persons contributed valuable ideas and feedback that improved the
content and the quality of this International Standard: im Amsden, Mariano Belaunde, Peter Carlson,
Cory Casanave, Michele Chinosi, Manoj Das, Robert Lario, Sumeet Malhotra, Henk de Man, David
Marston, Neal McWhorter, Edita Mileviciene, Vadim Pevzner, Pete Rivett, Jesus Sanchez, Markus
Schacher, Sebastian Stein, and Prasad Yendluri.

## Annex A — Revision History

| Version | Date       | Author | Changes                  |
|---------|------------|--------|--------------------------|
| 1.0     | 2026-05-24 | Vũ Anh | Initial issue — §6.      |
| 1.1     | 2026-05-24 | Vũ Anh | Removed implementation-specific notes (pure OMG-spec reference). |
| 1.2     | 2026-05-24 | Vũ Anh | Added an authoritative-source pointer to the official OMG PDF; clarified that this file summarises (does not reproduce) the spec. |
| 1.3     | 2026-05-24 | Vũ Anh | Synced against the OMG PDF: added the RFC-2119 keyword set + typography + cardinality operators (§6.1.1); corrected §6.1.2 to the two abbreviations actually tabled; listed the §6.3 submitting organisations; added page citations. |
| 1.4     | 2026-05-24 | Vũ Anh | Removed the "Mirrors §6" intro paragraph and the lead disclaimer; replaced the summary with a **full extraction of §6 (§6.1–§6.3, pp.16–18)** from the OMG PDF — the full conventions/abbreviations/cardinality text, the §6.2 document-structure prose (verbatim, including its own clause cross-references), and the complete §6.3 acknowledgments lists. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/formats/bpmn/06-additional-information.md`; authoritative source
is the main-branch working tree.

### B.2 Distribution
Implicit — checked in with the repository.

### B.3 Change Control
Re-verify against OMG BPMN 2.0.2 §6 on any edition change. Increment `version`; append a
row to Annex A.

### B.4 References
OMG BPMN 2.0.2 §6 (pp.16–18); `REF-BPMN-001 §4, §5`.

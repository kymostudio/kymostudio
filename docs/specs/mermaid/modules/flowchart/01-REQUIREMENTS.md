---
title: Mermaid Flowchart — Requirements (module)
document_id: FEAT-MERMAID-FLOWCHART-001
version: "0.1"
issue_date: 2026-06-07
status: Draft
classification: Internal
owner: packages/rust/kymostudio-core (shared engine)
audience: Engineers implementing the Mermaid flowchart importer
review_cycle: On flowchart-grammar or mapping change
supersedes: null
related_documents:
  - FEAT-MERMAID-001
  - DESIGN-MERMAID-FLOWCHART-001
  - TEST-MERMAID-FLOWCHART-001
  - PLAN-MERMAID-FLOWCHART-001
  - MERMAID-MAP-001
authors:
  - Vũ Anh
language: en
keywords:
  - mermaid
  - flowchart
  - requirements
---

# Mermaid Flowchart — Requirements (module)

The implemented Phase-1 module. Imports Mermaid `graph` / `flowchart` source into a
resolved kymo `.kymo.json`. Element semantics are normative in MERMAID-MAP-001;
this document states the module's functional requirements.

- **FR-FC-1** Accept headers `graph`/`flowchart` with optional direction
  `TD`/`TB`/`BT`/`LR`/`RL` (default `TB`); reject other diagram types.
- **FR-FC-2** Parse node declarations with shape wrappers `[]`, `()`, `([])`,
  `[[]]`, `[()]`, `(())`, `{}`, `{{}}`, `>]`; strip surrounding quotes from labels;
  default a bare node to a `box` labelled with its id.
- **FR-FC-3** Parse edge operators `-->`, `---`, `-.->`, `-.-`, `==>`, `===`,
  bidirectional `<-->`, and optional `|label|`; set `dashed`/`no_arrow`/`label`.
- **FR-FC-4** Parse chains (`A --> B --> C`), forward references, `;`-separated
  statements, `%%` comments, and `%%{init}%%` directives.
- **FR-FC-5** Parse `subgraph <id> [Title] … end` into a `cluster` region with its
  members; assign nodes to the innermost block.
- **FR-FC-6** Lay out deterministically and emit positioned components, point-less
  edges, sized regions, and canvas dimensions.
- **FR-FC-7** Report syntax errors with a 1-based line number.

**Known gaps:** see MERMAID-MAP-001 §6 (thick-edge weight, inline `-- text --`,
loose subgraph boxes, nested-region nesting, head decorations).

# Software Prior-Art Notes — Index

This folder collects **prior-art reference notes** on the diagramming and
process-modelling tools kymo is measured against. Nothing here is a kymo
specification and no code in this repo depends on these tools — the notes exist so
the team can borrow good ideas while evolving kymo's DSL, layout, and render
pipeline.

## How the folder is organised

**Each tool is a pair of files:**

| File | Purpose |
|------|---------|
| `<tier>.<tool>.md` | **Factual reference** — what the tool is, syntax/feature catalog, rendering model, ecosystem. Carries a `document_id` like `REF-<TOOL>-001`. |
| `<tier>.<tool>.comparision.md` | **Scored comparison vs kymo** — at-a-glance matrix, headline tradeoffs, a 5-category / 15-criterion scoring, and open questions for kymo. `document_id` `REF-<TOOL>-CMP-001`. |

**Filename prefix = popularity tier** (not capability ranking):

- **`a.`** — most popular / most likely to be reached for first.
- **`b.`** — widely used, second tier.
- **`z.`** — default bucket; everything else (mostly niche or enterprise-specific).

## The catalog

### Tier `a.` — most popular

| Tool | `document_id` | One-line |
|------|---------------|----------|
| [draw.io / diagrams.net](./a.drawio.md) | `REF-DRAWIO-001` | Free, open-source WYSIWYG diagramming; deep Google/Confluence/Notion integration. |
| [Figma / FigJam](./a.figma.md) | `REF-FIGMA-001` | Collaborative design + online whiteboard; real-time co-editing. |
| [Lucidchart](./a.lucidchart.md) | `REF-LUCIDCHART-001` | Enterprise web diagramming with a large template library and smooth co-editing. |
| [Visual Paradigm](./a.visual-paradigm.md) | `REF-VISUAL-PARADIGM-001` | Rigorous modelling suite — UML / BPMN / SysML, round-trip engineering. |
| [Mermaid](./a.mermaid.md) | `REF-MERMAID-001` | Markdown-native diagram-as-code; client-side SVG, ubiquitous in GitHub/GitLab. |
| [PlantUML](./a.plantuml.md) | `REF-PLANTUML-001` | Java, UML-first diagram-as-code; GraphViz-backed, real preprocessor. |

### Tier `b.` — widely used (second tier)

| Tool | `document_id` | One-line |
|------|---------------|----------|
| [Camunda](./b.camunda.md) | `REF-CAMUNDA-001` | BPMN/DMN process-orchestration engine (maintainer of bpmn.io). |
| [bpmn.io / bpmn-js](./b.bpmn-io.md) | `REF-BPMNIO-001` | Embeddable JavaScript BPMN renderer/editor behind many products. |
| [D2](./b.d2.md) | `REF-D2-001` | Modern text-to-diagram language; pluggable layout (Dagre/ELK/TALA). |
| [Kroki](./b.kroki.md) | `REF-KROKI-001` | Unified render service fronting many diagram-as-code languages. |
| [diagrams (mingrammer)](./b.diagrams.mingrammer.md) | `REF-DIAGRAMS-MINGRAMMER-001` | Python-API "diagrams as code" for cloud-architecture diagrams. |

### Tier `z.` — default bucket (niche / enterprise)

| Tool | `document_id` | One-line |
|------|---------------|----------|
| [Activiti](./z.activiti.md) | `REF-ACTIVITI-001` | Java BPMN 2.0 execution engine. |
| [Bizagi](./z.bizagi.md) | `REF-BIZAGI-001` | BPMN modeler plus low-code process automation. |
| [Flowable](./z.flowable.md) | `REF-FLOWABLE-001` | BPMN / CMMN / DMN engine (Activiti fork). |
| [jBPM](./z.jbpm.md) | `REF-JBPM-001` | Red Hat business-process management suite. |
| [SAP Signavio](./z.signavio.md) | `REF-SIGNAVIO-001` | Enterprise process management / mining (SAP). |
| [Sparx Enterprise Architect](./z.sparx-enterprise-architect.md) | `REF-SPARX-EA-001` | Comprehensive UML/SysML modelling with a shared repository. |

## Reading the comparison scores

Each `*.comparision.md` scores the tool against kymo on the same rubric
(A DSL & Syntax · B Layout & Edges · C Icons & Catalog · D Output & Interop ·
E Tooling & Ecosystem; 15 criteria, equal weight, out of 150).

**The `kymo` column is calibrated by *tool class*, not by tier prefix**, and is held
identical within each class so the comparisons stay consistent:

- **vs diagram-as-code peers** (`b.d2`, `b.diagrams.mingrammer`, `b.kroki`,
  `a.mermaid`, `a.plantuml`) → kymo = **89/150** (Category-A total **26**); kymo gets
  no "text source" bonus against another text tool.
- **vs WYSIWYG / BPMN tools** (the rest) → kymo's Category-A total is **30** — the
  plain-text-source advantage over click-to-draw editors.

## Conventions

- **Cite sibling docs by `document_id`** (e.g. `REF-D2-CMP-001`) in prose and the
  doc-control tables; IDs are stable across file moves. Navigational links in this
  index use relative paths for convenience.
- Adding a tool to one implementation's survey doesn't change kymo's behaviour —
  these are notes, not requirements. Keep the **Why** column in every comparison;
  a score without its rationale is worthless.

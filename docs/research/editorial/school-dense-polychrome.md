# Editorial Diagram Schools — I. Dense-Polychrome Newsletters (Research)

| Field             | Value                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-003                                                                          |
| Version           | 1.0                                                                                        |
| Issue Date        | 2026-06-12                                                                                 |
| Status            | Draft                                                                                      |
| Classification    | Internal                                                                                   |
| Owner             | `diagrams/` project                                                                        |
| Audience          | Engineers mining the genre's conventions for the kymo editorial layer                      |
| Subjects          | ByteByteGo · SwirlAI · Architecture Notes · numbered-step flows · subsystem color coding   |
| Related Documents | `RES-EDITORIAL-001`, `RES-EDITORIAL-002`                                                   |

One of four source-survey notes extending `RES-EDITORIAL-001` §2. This school is the **dense-polychrome newsletter**: single, information-dense graphics built for social feeds, one pastel color per subsystem, a numbered narrative riding the connectors. ByteByteGo defined the commercial formula; a cohort of newsletters now runs the same playbook across sub-domains.

## 1. Defining traits

- **One color per subsystem** (client / network / service / data), pastel fill + darker same-hue stroke — color is a *legend*, not decoration.
- **Numbered step badges on edges** — the device that lets a static image narrate a request's journey in time.
- **Real brand icons** (Kafka, Redis, Postgres, K8s) as first-class node content.
- **High density, mobile-portrait or square canvases**, large type — built for LinkedIn/X feed legibility, not print.
- **Composite panels**: comparison grids ("Top 8 X"), layer cakes, lifecycle loops sharing one canvas.
- Hand-drawn in design tools (Figma/Sketch-class); video versions animated in After Effects. No diagram-as-code production despite the authors' familiarity with those tools.

## 2. Sources

| Source | Author | Domain | Notes |
|---|---|---|---|
| ByteByteGo — <https://bytebytego.com/guides/>, <https://github.com/ByteByteGoHq/system-design-101> | Alex Xu | System design | Genre archetype; analyzed in depth in `RES-EDITORIAL-001` Part I |
| SwirlAI — <https://www.newsletter.swirlai.com/> | Aurimas Griciūnas | Data / ML engineering | The "ByteByteGo of MLOps"; heaviest annotation density in the school; numbered sub-steps inside numbered steps |
| Daily Dose of Data Science — <https://www.dailydoseofds.com/> | Avi Chawla | Data science / ML | Daily cadence; same formula at smaller scope per graphic |
| Architecture Notes — <https://architecturenotes.co/> | Mahdi Yusuf | System design | Lower volume, arguably the highest polish in the school; distinctive typography and texture |
| Quastor — <https://www.quastor.org/> | Arpan Garg | Big-tech engineering summaries | Diagrams summarize other companies' postmortems/architectures |
| System Design Newsletter — <https://newsletter.systemdesign.one/> | Neo Kim | System design | ByteByteGo-adjacent formula |
| Sketech — <https://sketech.substack.com/> | Nina Durann | General software | Hand-drawn aesthetic inside the same dense-polychrome formula; LinkedIn-native |
| roadmap.sh — <https://roadmap.sh/> | Kamran Ahmed | Learning paths | The taxonomy-tree branch of the genre at its largest scale |

## 3. What kymo takes from this school

| Convention | Editorial-layer feature (`RES-EDITORIAL-001`) |
|---|---|
| Numbered step badges on edges | F1 (`step=`) — the school's signature device |
| Per-subsystem color legend | F5 theme roles — author-named roles, hex only in the `theme {}` block |
| Brand icons in nodes | Existing `packages/icons` catalogue (the moat vs Mermaid) |
| Dense composite panels / comparison grids | Out of scope v1 — composition of multiple diagrams on one canvas is a layout-level capability, recorded for the backlog |
| Feed-portrait canvases | Existing `canvas:` directive covers it |

The school is also the **business evidence**: these are paid newsletters whose product *is* the diagram — the demand side of "ByteByteGo style, as code" (`RES-EDITORIAL-001` §13).

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial issue: dense-polychrome school survey (8 sources), trait list, mapping onto F1/F5/icons. |

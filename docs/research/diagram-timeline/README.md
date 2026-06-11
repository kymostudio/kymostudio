# 30 Years of Diagrams — A Timeline (1995–2025) (Research)

| Field             | Value                                                                                                                    |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-DIAGRAM-TIMELINE-001                                                                                                  |
| Version           | 1.2                                                                                                                      |
| Issue Date        | 2026-06-11                                                                                                               |
| Status            | Draft                                                                                                                    |
| Classification    | Internal                                                                                                                |
| Owner             | `diagrams/` project                                                                                                      |
| Audience          | Engineers and designers who want to understand how diagramming evolved (1995–2025) and where kymo sits in that lineage   |
| Subjects          | UML · BPMN · ArchiMate · C4 · SVG · Graphviz · Visio · PlantUML · draw.io · Mermaid · Figma · Excalidraw · tldraw · D2 · AI-native diagramming |
| Related Documents | `RES-MERMAID-D2-001`, `REF-DRAWIO-001`, `REF-PLANTUML-001`, `REF-D2-001` · per-year pages `RES-DIAGRAM-TIMELINE-1995` … `RES-DIAGRAM-TIMELINE-2025` |

This is a **research note on the history of diagramming** (1995–2025), not a specification of kymo. Each year gets its own page carrying **three highlights** — tools, notations/standards, or enabling technologies — plus two ranked snapshots: the **top 10 diagram types** and **top 10 tools** in use that year, each row carrying its **rank change (Δ) vs the previous year**. The aim is to show the major inflection points and competing paradigms that shaped how diagrams are authored, rendered, and shared, and to position kymo in that lineage.

Dates were verified against primary sources where possible (W3C, OMG, official sites, project repositories, funding announcements). The top-10 rankings are **evidence-based estimates** — no per-year market-share survey of diagramming exists — anchored to contemporary press, buyer's guides, SEC filings, funding rounds, user-count claims, and GitHub/npm statistics. Where a year had no single dominant event, the page says so plainly.

**The rankings are managed in [`docs/data/database.sqlite`](../../data/database.sqlite)** — entity tables `diagrams(key, name)` and `tools(key, name)` hold the canonical identities across years, while `diagram_rankings` / `tool_rankings(year, rank, key → FK, label, evidence)` hold the per-year top-10s and `timeline(year, remark)` the per-year remarks. The per-page tables — including the Δ column and the dropped-out lists — are generated from it by [`render_tables.py`](render_tables.py); edit the DB, then run `python3 render_tables.py` to refresh all 31 pages. The DB schema is documented in [`docs/data/database.dbml`](../../data/database.dbml), regenerated via `uv run generate_schema.py` inside the `docs/data` uv project.

## 1. Three eras

Diagramming over these 30 years moves through three overlapping eras, each defined by *where the diagram lives*.

| Era | Years | Defining shift | Representative highlights |
|---|---|---|---|
| **A — Desktop & standardization** | 1995–2004 | Diagrams gain *standard notations* and a *vector substrate*; authoring is a desktop app | UML, Visio-on-the-desktop, SVG, BPMN |
| **B — Web & SaaS** | 2005–2014 | Diagrams move *into the browser*; "diagram-as-code" emerges | Gliffy, PlantUML, Lucidchart, draw.io, Mermaid |
| **C — Collaborative & AI-native** | 2015–2025 | Diagrams become *multiplayer canvases* and *agent-operable* | Figma, Excalidraw, tldraw, D2, GitHub-native Mermaid, AI/MCP |

The throughline: a diagram starts as a drawing locked in one person's desktop file, becomes a standardized artifact, then a web document, then a shared canvas, and finally a piece of structured data that both humans and AI agents can read and rewrite. **kymo** — diagram-as-code compiling a declarative DSL to animated SVG — is a direct descendant of Era B's text-to-diagram lineage, aimed at Era C's expectations (web rendering, version control, programmatic/agent editing).

## 2. Timeline — three highlights per year

| Year | Highlights |
|---|---|
| [1995](1995.md) | Unified Method 0.8 at OOPSLA · Visio 4.0 + Visio Corp IPO · Rational acquires Objectory (Jacobson joins) |
| [1996](1996.md) | UML 0.9 + Three Amigos / UML Partners · Visio Technical 4.1 · BPR flowcharting boom peaks (23-product market) |
| [1997](1997.md) | UML 1.1 adopted by OMG · Visio 5.0 line ships · Fowler's *UML Distilled* |
| [1998](1998.md) | PGML vs VML → SVG Working Group · open-source diagramming begins (Dia, ArgoUML) · *Graph Drawing* textbook |
| [1999](1999.md) | First SVG Working Draft · Visio 2000 + Microsoft acquisition announced · XMI 1.0 + UML 1.3 |
| [2000](2000.md) | Microsoft closes Visio deal + Graphviz open-sourced · Enterprise Architect 1.0 · GraphML initiated, yWorks founded |
| [2001](2001.md) | SVG 1.0 Recommendation · OmniGraffle 1.0 on Mac OS X · OMG launches MDA |
| [2002](2002.md) | OmniGraffle 2.0 / macOS wave · IBM agrees to buy Rational ($2.1B) · Borland acquires TogetherSoft |
| [2003](2003.md) | SVG 1.1 Recommendation + UML 2.0 adopted · Inkscape forks from Sodipodi · UML-tools consolidation completes |
| [2004](2004.md) | BPMN 1.0 by BPMI · Eclipse UML2 1.0 · concept mapping institutionalizes (CMC 2004, CmapTools) |
| [2005](2005.md) | Gliffy founded (browser diagramming) · UML 2.0 formally published · BPMI merges into OMG |
| [2006](2006.md) | BPMN becomes an OMG standard · mxGraph — first JS diagramming library · Eclipse GMF 1.0 |
| [2007](2007.md) | Visio 2007 data-driven diagrams · MindMeister web mind mapping · XMind 1.0 |
| [2008](2008.md) | WebSequenceDiagrams (text-to-diagram service) · Balsamiq Mockups launches · Raphaël.js |
| [2009](2009.md) | PlantUML first release · Signavio founded · Cacoo launches |
| [2010](2010.md) | Lucidchart launches (HTML5 + realtime) · Visio 2010 validation/containers · Google Drawings |
| [2011](2011.md) | draw.io (Diagramly) + BPMN 2.0 · D3.js released · RealtimeBoard (Miro) founded |
| [2012](2012.md) | ArchiMate 2.0 (+ C4 ~2011) · Diagramly → draw.io, fully JS · GoJS released |
| [2013](2013.md) | Browser diagramming inside the cloud office · Visio 2013 + .vsdx format · Camunda forks Activiti |
| [2014](2014.md) | Mermaid created · bpmn.io announced · nomnoml |
| [2015](2015.md) | Figma invite-only preview · UML 2.5 published · Visio 2016 (desktop high-water mark) |
| [2016](2016.md) | Figma public launch · ArchiMate 3.0 · Lucid $36M Series B |
| [2017](2017.md) | Whimsical founded · GitLab native Mermaid rendering · draw.io desktop app |
| [2018](2018.md) | Figma public API · Miro (RealtimeBoard) $25M Series A · C4-PlantUML + PlantUML stdlib |
| [2019](2019.md) | RealtimeBoard → Miro rebrand · Kroki launches · Mermaid wins JS Open Source Award |
| [2020](2020.md) | Excalidraw born + draw.io → diagrams.net · `diagrams` (mingrammer) · Miro $50M as remote work explodes |
| [2021](2021.md) | FigJam + tldraw open-sourced · Visio bundled into Microsoft 365 · Excalidraw+ launches |
| [2022](2022.md) | GitHub renders Mermaid natively + D2 open-sourced · Miro $400M at $17.5B · Apple Freeform |
| [2023](2023.md) | AI text-to-diagram wave (DiagramGPT, Make Real) · Mermaid v10 ESM · Figma Dev Mode |
| [2024](2024.md) | Mermaid Chart $7.5M + Figma AI · tldraw SDK 2.0 · Claude Artifacts renders Mermaid |
| [2025](2025.md) | Agent-operable diagrams (tldraw Series A, MCP) · Figma IPO · Figma Make |

## 3. Cross-cutting threads

Reading the timeline *down columns* rather than year-by-year reveals four threads that recur across all three eras:

- **Text-to-diagram (diagram-as-code).** Graphviz/DOT (2000) → WebSequenceDiagrams (2008) → PlantUML (2009) → Mermaid (2014) → D2 (2022). A 25-year arc from "describe the graph, let the layout engine draw it" to "diagrams live in version control next to code." kymo is the latest link in this chain.
- **Standardized notation.** UML (1997) → BPMN (2004/2006) → ArchiMate 2.0/3.0 (2012/2016) → C4 (~2011). The push to give each domain (software, process, enterprise architecture) an agreed visual vocabulary, so diagrams mean the same thing across tools and teams.
- **A web-native substrate.** PGML/VML (1998) → SVG 1.0 (2001) → SVG 1.1 (2003) → HTML5 canvases (Lucidchart 2010) → real-time multiplayer (Figma 2015). The slow victory of vector graphics and the browser as the place diagrams are rendered and edited. kymo compiles straight to **animated SVG** — the format this thread produced.
- **The AI wave.** DiagramGPT and "Make Real" (2023) → Mermaid Chart AI, Claude Artifacts, and Figma AI (2024) → MCP-operable diagram files (2025). Diagrams shift from human-only artifacts to things agents generate, inspect, and iteratively edit — exactly the surface kymo's MCP tooling targets.

The top-10 tables tell their own story: **flowchart holds #1 for all 31 years**, while everything beneath it churns — UML rises and falls with the CASE era, wireframes spike with the mobile gold rush, cloud architecture arrives with AWS, and AI-generated diagrams claim a slot from 2023. On the tool side, Visio holds #1 for 27 straight years until Miro takes it in 2022 — and by 2024 Visio is out of the top 5 entirely. The 6–10 tail is where eras turn over: heavyweight desktop modeling (MagicDraw, ERwin, Together) gives way to the UX wave (Balsamiq, Axure), then to SaaS survivors and demoted incumbents, and finally to AI generators (ChatGPT/Claude enter the tool list in 2023).

## References

Each per-year page carries its own verified sources. Anchor primary sources used across the timeline:

- W3C SVG — <https://www.w3.org/Graphics/SVG/> · SVG 1.0 Recommendation <https://www.w3.org/TR/2001/REC-SVG-20010904/>
- OMG UML — <https://www.omg.org/spec/UML/> · BPMN — <https://www.omg.org/spec/BPMN/>
- Graphviz — <https://graphviz.org/> · PlantUML — <https://plantuml.com/>
- Mermaid — <https://mermaid.js.org/> · D2 — <https://github.com/terrastruct/d2>
- Figma — <https://www.figma.com/> · Excalidraw — <https://excalidraw.com/> · tldraw — <https://tldraw.dev/> · diagrams.net — <https://www.drawio.com/>
- Quality Digest flowcharting buyer's guide (1996) — <https://www.qualitydigest.com/static/magazine/mar/flowchrt.html> · Visio/Microsoft merger filing — <https://www.sec.gov/Archives/edgar/data/0000946665/000103221099001347/0001032210-99-001347.txt/seq-4>

---

*Maintenance: re-review annually; add the new "highlight of the year" page and extend §2. Restate the *why* for each entry, not just the *what* — a future reader needs the reasoning to judge whether a pick still holds.*

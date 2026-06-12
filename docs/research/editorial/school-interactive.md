# Editorial Diagram Schools — IV. Interactive & Scholarly Explainers (Research)

| Field             | Value                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-006                                                                          |
| Version           | 1.0                                                                                        |
| Issue Date        | 2026-06-12                                                                                 |
| Status            | Draft                                                                                      |
| Classification    | Internal                                                                                   |
| Owner             | `diagrams/` project                                                                        |
| Audience          | Engineers mining the genre's conventions for the kymo editorial layer                      |
| Subjects          | Distill · Bartosz Ciechanowski · explorable explanations · animation as explanation        |
| Related Documents | `RES-EDITORIAL-001`, `RES-STRATEGY-001`                                                    |

One of four source-survey notes extending `RES-EDITORIAL-001` §2. This school is the **interactive/scholarly explainer**: publications where the diagram moves — animation, scrubbing, and simulation carry the explanation. It is the genre's quality ceiling and its cost ceiling: every artifact is bespoke code (D3, hand-rolled WebGL/canvas), taking weeks to months per piece.

## 1. Defining traits

- **Motion is the explanation**: state propagates through the figure over time (a gear turns, gradients flow, packets traverse) rather than being frozen into badges (school I) or frame series (school III).
- **Reader-driven**: scrubbers, draggable parameters, embedded simulations — "explorable explanations" (Victor/Case lineage).
- **Scholarly production values**: vector-precise, consistent metrics, captions and notation handled like a journal (Distill's stated workflow: static figures in Illustrator/Sketch/Inkscape, dynamic ones in D3).
- **Extreme cost**: the school has no commercial cadence — Distill went on hiatus; Ciechanowski ships a handful of pieces per year. The cost is exactly why no newsletter operates here.

## 2. Sources

| Source | Author/Publisher | Notes |
|---|---|---|
| Distill — <https://distill.pub/> | Distill working group | The gold standard for editorial+interactive ML publication; CC-licensed diagram corpus |
| Mechanical/physics explainers — <https://ciechanow.ski/> | Bartosz Ciechanowski | Best-in-class interactive explainers (gears, GPS, sound); fully hand-coded |
| Explorable explanations — <https://ncase.me/> | Nicky Case | The genre's manifesto-carrier (parable of the polygons, loopy) |
| Red Blob Games — <https://www.redblobgames.com/> | Amit Patel | Interactive algorithm explainers (A*, hex grids); 20+ years of the craft |
| The Pudding — <https://pudding.cool/> | The Pudding | Data-journalism branch; scrollytelling rather than simulation |

## 3. What kymo takes from this school

This school defines the **axis that positions kymo**. Order the four schools by motion: I–III are static (hand-drawn, cheap to consume, expensive to produce); IV is dynamic (hand-coded, prohibitively expensive to produce). Nothing occupies the middle: **declaratively authored motion**.

| Observation | Kymo relevance |
|---|---|
| Animation is the genre's quality ceiling, and it is gated on bespoke code | Kymo's **animated SVG is the default output** — motion from a declarative source, no D3/After Effects. This is the differentiator `RES-STRATEGY-001` names, restated as a genre position: kymo is the only path to school-IV motion at school-I authoring cost |
| Motion-as-state-propagation (flow along edges) | Existing `flow` animation preset already implements the school's core device for the architecture-diagram case |
| Reader interactivity (scrubbing, parameters) | Out of scope for a renderer — belongs to the editor/canvas products if ever; explicitly a non-goal of the editorial layer |

Practical consequence for the roadmap (`RES-EDITORIAL-001` §13): once F1–F5 land, the same `.kymo` source that renders a school-I/II static graphic *also* ships school-IV motion for free — the marketing demo for the editorial layer should lead with that pairing (one source → ByteByteGo-style PNG for the feed + animated SVG for the post).

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial issue: interactive/scholarly school survey (5 sources), trait list, positioning conclusion (declarative motion as kymo's unoccupied middle). |

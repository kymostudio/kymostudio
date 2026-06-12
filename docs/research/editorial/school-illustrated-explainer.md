# Editorial Diagram Schools — III. Illustrated Explainers (Research)

| Field             | Value                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-005                                                                          |
| Version           | 1.0                                                                                        |
| Issue Date        | 2026-06-12                                                                                 |
| Status            | Draft                                                                                      |
| Classification    | Internal                                                                                   |
| Owner             | `diagrams/` project                                                                        |
| Audience          | Engineers mining the genre's conventions for the kymo editorial layer                      |
| Subjects          | Jay Alammar · Maarten Grootendorst · Julia Evans · figure series · annotated ML explainers |
| Related Documents | `RES-EDITORIAL-001`, `RES-EDITORIAL-002`                                                   |

One of four source-survey notes extending `RES-EDITORIAL-001` §2. This school is the **single-author illustrated explainer**: long-form posts where the figures *are* the content — a hand-drawn sequence of frames walking one concept (a transformer pass, a TCP handshake) step by step. Where schools I–II compress a system into one panel, this school *serializes* it across many.

## 1. Defining traits

- **Figure series, not single figures**: the same scene redrawn 10–30 times with one element changed per frame — flipbook pedagogy. The step number lives in the *prose sequence*, not on edges.
- **Annotation-first**: arrows, underbraces, inline callouts pointing into the figure; tensors/packets drawn as labeled colored blocks.
- **One-author visual identity**: each author's style is a recognizable brand (Alammar's soft gradients, Grootendorst's crisp flat vectors, Evans' hand-lettered comics).
- **Anthropomorphization** (Evans branch): systems become characters that talk — diagrams as comic panels.
- Tooling is generic (Keynote/Illustrator/Excalidraw/procreate); zero as-code production; enormous per-figure labor — posts take weeks.

## 2. Sources

| Source | Author | Notes |
|---|---|---|
| *The Illustrated Transformer* and successors — <https://jalammar.github.io/illustrated-transformer/> | Jay Alammar | The canonical artifact of the school; now the *Hands-On Large Language Models* book |
| "A Visual Guide to …" series — <https://newsletter.maartengrootendorst.com/> | Maarten Grootendorst | Quantization / Mamba / MoE guides; the school's current high-water mark for polish |
| Lil'Log — <https://lilianweng.github.io/> | Lilian Weng | Academic-editorial hybrid; figures since adopted into countless slide decks |
| Ahead of AI — <https://magazine.sebastianraschka.com/> | Sebastian Raschka | Annotated architecture/training figures at newsletter cadence |
| Wizard Zines / blog — <https://wizardzines.com/>, <https://jvns.ca/teach-tech-with-cartoons/> | Julia Evans | The comic/zine branch: hand-lettering, personified systems |

## 3. What kymo takes from this school

Mostly **scope discipline**: free-form illustration (curved annotation arrows into arbitrary points, hand-lettering, character art) is *not* a renderer feature and the editorial layer should not chase it.

Two transferable ideas:

| Convention | Kymo relevance |
|---|---|
| Frame-series pedagogy (same scene, one delta per frame) | Maps naturally onto kymo's **animated SVG**: a step sequence that schools I–II encode as badges and this school as N static frames can be *one* kymo diagram whose edges/nodes reveal in sequence (existing `flow`/`reveal` animation presets; a future `step`-driven reveal order would unify F1 badges with animation — recorded as a v2 idea for `FEAT-EDGE-BADGES-001`) |
| Labeled-block annotation (tensors as colored cells) | Adjacent to F2 code cards; a `table`/`cells` node content type is a possible future content extension, deliberately not in v1 |

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial issue: illustrated-explainer school survey (5 sources), trait list, scope-discipline conclusions + two transferable ideas (step-driven reveal, cell annotation). |

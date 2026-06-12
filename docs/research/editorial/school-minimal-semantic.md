# Editorial Diagram Schools — II. Minimal-Semantic Lab/Vendor Style (Research)

| Field             | Value                                                                                  |
|-------------------|------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-004                                                                          |
| Version           | 1.0                                                                                        |
| Issue Date        | 2026-06-12                                                                                 |
| Status            | Draft                                                                                      |
| Classification    | Internal                                                                                   |
| Owner             | `diagrams/` project                                                                        |
| Audience          | Engineers mining the genre's conventions for the kymo editorial layer                      |
| Subjects          | Anthropic · OpenAI · Stripe · agent-architecture figures · semantic palettes · code cards  |
| Related Documents | `RES-EDITORIAL-001`, `RES-EDITORIAL-002`                                                   |

One of four source-survey notes extending `RES-EDITORIAL-001` §2. This school is the **minimal-semantic lab/vendor style**: figures published by AI labs and infrastructure vendors whose restraint *is* the brand — two or three colors with fixed meaning, generous whitespace, monospace typography, real payloads embedded in nodes. The school supplies the canonical agent-architecture vocabulary that `RES-EDITORIAL-002`'s prototypes A and C reproduce.

## 1. Defining traits

- **Tiny semantic palette**: every color has a fixed *meaning* (terminal / LLM step / non-LLM control; environment / model / action), never a subsystem identity. 2–3 roles, not 4–8.
- **Whitespace as a feature**: nodes sized for rhythm (a "Gate" box far wider than its text), long calm connectors, low density — one idea per figure.
- **Monospace, letter-spaced typography**; branded faces (OpenAI: Söhne Mono).
- **Embedded payloads**: actual JSON tool calls / commands in dark code blocks inside nodes — the figure doubles as an API example.
- **Texture fills** (dot-grid boxes) and stadium terminals (In/Out pills).
- **Pattern canon**: a handful of named figures (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer; the CUA perception→reasoning→action loop) are redrawn across the industry — the closest thing the genre has to a standard notation.

## 2. Sources

| Source | Publisher | Notes |
|---|---|---|
| *Building Effective Agents* — <https://www.anthropic.com/research/building-effective-agents> | Anthropic | The five workflow-pattern figures; the school's most-copied artifacts (Spring AI re-implements them 1:1 — <https://docs.spring.io/spring-ai/reference/api/effective-agents.html>) |
| Computer-Using Agent / Operator figures | OpenAI | The CUA loop — subject of the `RES-EDITORIAL-001` §4 pixel-fidelity experiment (4.95% diff via HTML/CSS) |
| Stripe documentation diagrams — <https://docs.stripe.com/> | Stripe | The industry benchmark for restraint in *docs* diagrams: sequence/flow figures with one accent color |
| Tailscale blog — <https://tailscale.com/blog/> | Tailscale | Networking explainers with a consistent in-house visual identity |
| Fly.io / Cloudflare blogs — <https://fly.io/blog/>, <https://blog.cloudflare.com/> | Fly.io, Cloudflare | Each maintains a recognizable house style; Cloudflare at volume |
| LangGraph documentation — <https://langchain-ai.github.io/langgraph/> | LangChain | Node/edge agent-graph notation; the runtime-graph branch of the school |

## 3. What kymo takes from this school

| Convention | Editorial-layer feature (`RES-EDITORIAL-001`) |
|---|---|
| Semantic 2–3-role palettes | F5 theme roles (the same mechanism serves both schools — only the role *naming* differs) |
| Embedded JSON/command payloads | F2 code cards (`code lang=json` + `\|` lines) |
| Dot-grid box textures | F3 `fill=dots` |
| Deliberate node sizing / whitespace rhythm | F4 `size=` / `pad=` / `spacing:` |
| Stadium terminals, icon-less labeled boxes | `RES-EDITORIAL-002` §6 gaps 5–6 (`stadium` shape, `none` icon sentinel) |
| The five Anthropic patterns + CUA loop as a test corpus | `RES-EDITORIAL-002` prototypes A and C; candidates for a future sample/template gallery |

This school is kymo's **nearest-term render target**: its artifacts are parametric and low-density (no composite panels), so the F1–F5 set covers them essentially completely — which is why both pixel-level experiments in `RES-EDITORIAL-001` §4 were drawn from it.

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial issue: minimal-semantic school survey (6 sources), trait list, mapping onto F2/F3/F4/F5 and the prototype corpus. |

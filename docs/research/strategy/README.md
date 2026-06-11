# Diagram-Tool Landscape & kymostudio Build Direction (Research)

| Field             | Value                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-STRATEGY-001                                                                                                 |
| Version           | 0.1                                                                                                              |
| Issue Date        | 2026-06-11                                                                                                       |
| Status            | Draft                                                                                                            |
| Classification    | Internal                                                                                                         |
| Owner             | `diagrams/` project                                                                                              |
| Audience          | Maintainers deciding where to invest the next releases of kymostudio                                             |
| Subjects          | Survey of leading open-source diagram tools (mid-2026), trend synthesis, and a recommended build direction for kymostudio (adoption-first, AI/MCP distribution) |
| Licenses          | Each surveyed project under its own license (linked inline); no third-party code is used in this repository      |
| Access Date       | 2026-06-11 (star counts, version numbers, and "official" claims are point-in-time)                               |
| Related Documents | `RES-MCP-001`, `RES-SKILLS-001`, `REF-MERMAID-001`, `REF-D2-001`, `REF-DRAWIO-001`, `REF-PLANTUML-001`, `REF-KROKI-001`, `REF-DIAGRAMS-MINGRAMMER-001`, `FEAT-FLOWCHART-001`, `FEAT-KEDITOR-001` |

This is a **research note with a recommendation** — a survey of the open-source diagramming
landscape as of mid-2026, and a proposed build direction derived from it. It is **not a
specification**: nothing in this repository depends on it, and none of the workstreams in §5 are
committed work. When a workstream is picked up, it gets its own spec under `docs/specs/<id>/`.

The framing thesis: **the diagram-as-code paradigm has won culturally, and the next distribution
battle is being fought over AI agents, not humans.** Mermaid owns the human channel
(GitHub-markdown rendering). The agent channel — MCP servers, installable agent skills,
LLM-friendly DSLs — is still open, and kymostudio's existing assets (animated SVG output, the
multi-format flowchart hub, a shipped MCP server with a live shared canvas) line up unusually
well with it.

## 1. Scope and method

Two parallel sweeps, both performed 2026-06-11:

1. **Repo state** — what kymostudio ships today (v0.4.3), what is specced, and what prior art is
   already documented in `docs/softwares/` (15 tools, each with a `REF-*-001` reference and a
   `REF-*-CMP-001` scored comparison) and `docs/research/` (`RES-MCP-001` MCP-server survey,
   `RES-SKILLS-001` agent-skills survey, and siblings).
2. **Web landscape** — current stars/momentum, 2025–26 feature moves, monetization, and AI
   integration for the top open-source diagram projects, plus emerging entrants.

This note deliberately keeps per-project profiles short (§2): depth on each tool lives in the
corresponding `REF-*-001` document; depth on the MCP ecosystem lives in `RES-MCP-001`. What is
new here is the cross-cutting trend synthesis (§3) and the direction it implies (§5).

## 2. Landscape survey

Grouped by tool class. Stars and versions are point-in-time (see Access Date).

### 2.1 Diagram-as-code / text-to-diagram

**[Mermaid](https://github.com/mermaid-js/mermaid)** (~88.6k★, dominant; see `REF-MERMAID-001`)

- Native rendering in GitHub/GitLab markdown is the single strongest distribution moat in the
  category; teams default to it because it "just works" in READMEs, issues, and PRs.
- The de-facto DSL that LLMs emit: standard in Claude artifacts, ChatGPT, and most AI chat UIs.
- 2025–26: Wardley maps, "neo" styling, deeper editor integrations (Cursor, Windsurf); official
  [Mermaid Chart MCP server](https://mermaid.ai/docs/ai/mcp-server).
- Monetizes via the Mermaid Chart SaaS; the OSS core stays the on-ramp.

**[D2](https://github.com/terrastruct/d2)** (~23.8k★, strong momentum; see `REF-D2-001`)

- The modern architecture-diagram DSL; clean syntax, explicit styling, strong developer affinity.
- Layout quality is its differentiator — and its best engine (TALA) is **proprietary**, a
  recurring community complaint and an open gap (§3.3).
- Monetizes via the Terrastruct SaaS; OSS CLI + playground drive adoption.

**[PlantUML](https://github.com/plantuml/plantuml)** (mature, stable; see `REF-PLANTUML-001`)

- The enterprise UML standard; broadest diagram-type coverage in the category.
- Active in 2026 (1.2026.x line; charts, timing, font pipeline) and ships a Node-based MCP server.
- Volunteer-sustained, no SaaS; community frustration centers on verbosity and layout control.

**[Graphviz](https://graphviz.org/)** (foundational)

- 40+ years of layout algorithms; DOT is the de-facto graph interchange format, embedded in
  PlantUML, Kroki, and countless tools. Stable rather than growing; no monetization.

**[Kroki](https://github.com/yuzutech/kroki)** (~4k★, integration play; see `REF-KROKI-001`)

- One HTTP API fronting 20+ diagram engines; the polyglot gateway for documentation platforms.
- Community MCP server exists ([kroki-mcp](https://github.com/utain/kroki-mcp)); becoming a Kroki
  backend is a cheap distribution channel for any new engine.

**[Diagrams (mingrammer)](https://github.com/mingrammer/diagrams)** (~42k★; see `REF-DIAGRAMS-MINGRAMMER-001`)

- Python API for cloud-architecture diagrams; wins on provider icon coverage and the Python
  ecosystem. Proof that **a big curated icon library is itself a draw** — kymo's 2,460-icon
  catalogue plays in the same space with an external DSL instead of a host-language API.

**[Structurizr](https://structurizr.com/)** and **[LikeC4](https://github.com/likec4/likec4)** (~2.9k★, growing)

- The C4-model corner: Structurizr is the enterprise reference (2026 roadmap: AI-assisted layout,
  collaborative editing, an MCP server); LikeC4 is the fast-moving OSS challenger (live
  code-to-diagram sync, experimental AI semantic layout, MCP tool, JetBrains plugin).
- Both demonstrate that "architecture-as-code + AI assist + MCP" is now table stakes messaging.

**Niche but notable:** [Pintora](https://github.com/hikerpig/pintora) (modular Mermaid
alternative, Obsidian/Typst integrations), [nomnoml](https://github.com/skanaar/nomnoml) (compact
UML), [CeTZ](https://github.com/cetz-package/cetz) (Typst's TikZ — riding Typst adoption in
academic publishing), [markmap](https://github.com/markmap/markmap) (markdown → mindmap, with a
community MCP server).

### 2.2 Canvas / whiteboard / SDK

**[Excalidraw](https://github.com/excalidraw/excalidraw)** (thriving)

- Hand-drawn aesthetic, zero-login local-first UX, E2E-encrypted multiplayer.
- MCP integration via community servers (e.g. [kamiazya/whiteboard](https://github.com/kamiazya/whiteboard))
  pioneered the **live-canvas pattern**: the agent draws and the human watches in real time —
  the same pattern `FEAT-KEDITOR-001` ships for kymo (see `RES-MCP-001` §2).
- kymo already exports Excalidraw scenes — a complementary, not competitive, relationship.

**[tldraw](https://github.com/tldraw/tldraw)** (~40k★, platform trajectory)

- Infinite-canvas SDK; "make real" (sketch → working UI via LLM) defined the canvas+AI genre.
- 2025–26: theme system, `@tldraw/driver` (imperative editor control), `@tldraw/mermaid`
  (Mermaid → native shapes). VC-backed; SDK licensing + cloud.
- kymo's website canvas editor (`FEAT-CANVAS-001`) already builds on tldraw.

**[React Flow / xyflow](https://github.com/xyflow/xyflow)** (~24k★)

- The production-grade node-UI library; first pro subscribers and a full-time maintainer hired in
  2026. The default substrate when products need node-based editors (including AI-workflow UIs).

**[draw.io](https://github.com/jgraph/drawio)** (ubiquitous; see `REF-DRAWIO-001`)

- Enterprise default via Confluence/Jira lock-in; desktop re-licensed Apache-2.0.
- Ships an **official MCP server** ([drawio-mcp](https://github.com/jgraph/drawio-mcp)) supporting
  the MCP Apps protocol (interactive diagrams inline in chat) — evidence that even legacy tools
  treat MCP as a first-class channel. kymo exports draw.io XML as of v0.4.3.

**[JointJS](https://www.jointjs.com/)** (mature freemium SDK) and
**[Penpot](https://github.com/penpot/penpot)** (open Figma alternative; first design tool with
native design tokens) round out the class — both relevant as references, not competitors.

### 2.3 Animation / programmatic video

**[Motion Canvas](https://github.com/motion-canvas/motion-canvas)** (~18.4k★)

- Code-driven technical animation (TypeScript, keyframes, video export). Powerful but a
  full programming model — far heavier than a diagram DSL.

**[Remotion](https://github.com/remotion-dev/remotion)** (major, AI-driven surge)

- React → MP4; 2026 growth is driven by AI: **installable skills for Claude Code and other
  coding agents** so the agent writes Remotion code directly (see `RES-SKILLS-001`). This is the
  distribution playbook §5 borrows.

**The gap between them:** nothing occupies the space between a static Mermaid render and a
full Motion Canvas/Remotion production — i.e. *a diagram DSL whose output is animated by
default*. That is exactly kymo's founding feature.

## 3. Trends

### 3.1 AI/MCP is the fastest-rising distribution channel

Official or community MCP servers now exist for Mermaid, draw.io, Excalidraw, Kroki, PlantUML,
Structurizr, LikeC4, and markmap (inventory in `RES-MCP-001`). Remotion distributes via
installable agent skills. The pattern: **an LLM-friendly text grammar plus a deterministic
renderer is a perfect MCP tool**, and tools that show up where agents work get chosen by agents —
a channel where incumbency is *not yet* decided, unlike §3.2.

### 3.2 GitHub-markdown rendering is Mermaid's moat — don't fight it, ride it

No competitor has dislodged native Mermaid rendering in GitHub/GitLab, and none is likely to.
The viable counter-positions are (a) complementary niches (D2 for architecture, Structurizr for
C4) and (b) **interop** — accepting Mermaid as input. kymo already does (b): the v0.4.3
flowchart hub (`FEAT-FLOWCHART-001`) imports Mermaid/D2/DOT into a shared IR and renders or
transpiles it. An LLM that "speaks Mermaid" can therefore already drive kymo.

### 3.3 Layout quality is a differentiator; the open-source ceiling is unclaimed

Mermaid's layout pain on complex flowcharts is a chronic complaint; D2's best answer (TALA) is
proprietary; Structurizr and LikeC4 are betting on AI-assisted layout. An open TALA-equivalent
remains unbuilt — a high-payoff, high-cost research bet (deferred here, §5.6).

### 3.4 The animation gap is real and unfilled

"Animated/presentable diagrams as code" sits between Mermaid (static) and Remotion (full video)
with no occupant. kymo's flowing-edge animated SVG is, today, a unique default in the
diagram-as-code class. Every diagram MCP server surveyed returns a **static** image.

### 3.5 Canvas + code hybrids are the momentum winners

tldraw, Excalidraw, Penpot, and Eraser all converge on "visual canvas with a text/code
counterpart". kymo's editor + canvas work (`FEAT-KEDITOR-001`, `FEAT-CANVAS-001`) is aligned,
but a full collaborative canvas (Canvas Jam/Studio specs) is a backend-heavy product bet that
the adoption goal does not require yet.

### 3.6 BPMN open tooling stays fragmented

bpmn.io, Yaoqiang, Open BPMN, Camunda tooling — functional, none delightful, no Mermaid-level
winner. kymo's Rust BPMN stack is a genuine asset, but modern-BPMN-editor is a separate product
push; deferred (§5.6).

### 3.7 Monetization norm: adoption-first, freemium later

Mermaid Chart, Terrastruct, tldraw, Excalidraw+, Remotion.pro — every healthy project in the
space rode OSS adoption first. The user-selected goal for kymo (adoption / stars) matches the
proven sequence.

## 4. Where kymo stands

| Asset | Status vs. landscape |
| --- | --- |
| Animated SVG by default | **Unique** in the diagram-as-code class; directly fills gap §3.4 |
| Flowchart hub (Mermaid/D2/DOT import, transpile, pure-Rust render) | Shipped v0.4.3; the "pandoc of diagrams" capability others lack (`FEAT-FLOWCHART-001`) |
| MCP server + live shared canvas (editor.kymo.studio) | Shipped v1 (`FEAT-KEDITOR-001`); the live-canvas pattern only Excalidraw-adjacent servers have |
| 2,460-icon catalogue (AWS/Azure/GCP/K8s/…) | Competitive with mingrammer, attached to an external DSL |
| One Rust core, three language surfaces (PyO3, wasm, CLI) | Embeddable everywhere; "Kroki in a binary" |
| BPMN import/export/render, byte-parity across languages | Strong, niche; no OSS leader exists to displace |
| Distribution / awareness | **Near zero** — no markdown moat, no registry presence, no launch motion yet |
| Layout engine | Single algorithm; below D2/TALA on hard graphs |

The asymmetry is stark: the *product* gaps the market complains about are largely already built;
the *distribution* work has barely started.

## 5. Recommended direction

**Positioning: kymostudio is the diagram renderer for AI agents.** Agents already speak Mermaid;
kymo accepts what they emit and returns something better — an animated, icon-rich SVG (or PNG,
PDF, Figma, Excalidraw, draw.io, BPMN), optionally streamed onto a live canvas the user watches.
Goal: adoption (users, stars, registry installs). Primary bet: the AI/MCP channel (§3.1), where
no incumbent has locked distribution yet.

Four workstreams, ordered by expected adoption-per-effort:

### 5.1 W1 — MCP server v2

Extend `kymo-mcp` (the Cloudflare Worker + stdio server from `FEAT-KEDITOR-001`) from the single
`render_flowchart` tool to the full engine surface:

- Render every supported input: `.kymo`, Mermaid, D2, DOT, BPMN, `.kymo.json` → SVG/PNG.
- Trivial local install (`npx kymostudio-mcp`-style, stdio) alongside the hosted Worker.
- Keep the live-canvas tool (`set_diagram` → all open editor tabs update) as the headline demo:
  *the agent draws, you watch*. Only Excalidraw-bridge servers offer anything similar
  (`RES-MCP-001` §2.4), and none of them animate.
- List in the MCP registries/directories that agents and users actually browse.

### 5.2 W2 — Agent skill + agent-facing docs

The Remotion playbook (`RES-SKILLS-001`): meet the agent in its own harness.

- An installable Claude Code skill that teaches the `.kymo` DSL, the animation directives, and
  the icon catalogue, with worked examples — so an agent produces idiomatic `.kymo`, not just
  recycled Mermaid.
- `llms.txt` + LLM-oriented reference pages on kymo.studio (grammar, icon addressing, common
  errors and fixes).

### 5.3 W3 — LLM-friendly DSL hardening

- **Ride the Mermaid on-ramp**: the zero-learning path is "agent emits Mermaid, kymo renders it
  with icons + animation + multi-format export". Make that path flawless before asking any model
  to learn `.kymo`.
- Benchmark how reliably frontier models emit valid `.kymo` from a prompt; let the failure modes
  drive grammar and docs fixes.
- Invest in recoverable, *actionable* parse errors (line, expectation, suggestion) — agents
  self-correct when the error message tells them how.

### 5.4 W4 — Showcase and launch

- Reposition README/website around the agent story; animated SVGs in the README are the wow
  asset (a static screenshot undersells the differentiator).
- Launch motions: Show HN, MCP directory listings, and a Kroki engine submission (§2.1 — cheap
  reach into every Kroki-integrated docs platform).

### 5.5 Supporting bet — animation as the signature

Whatever the entry point (MCP render, CLI, editor), the output that circulates should animate.
Every competitor's MCP server returns a static image; "the diagram moved" is the screenshot-able
difference. Polish here (step/reveal sequencing, presentation-friendly export) compounds W1–W4
rather than competing with them.

### 5.6 Explicitly deferred

- **Canvas Jam / Canvas Studio** (`FEAT-CANVAS-JAM-001`, `FEAT-CANVAS-STUDIO-001`) — collaborative
  backend product; revisit after distribution traction.
- **BPMN modern-editor push** (§3.6) — real gap, separate product; the BPMN engine keeps earning
  its keep inside W1 meanwhile.
- **Open TALA-grade layout research** (§3.3) — highest-cost bet in the space; sequence after the
  channel exists to show it off.

## 6. Proposed sequencing (indicative)

| Release | Focus |
| --- | --- |
| v0.5 | W1 (MCP v2) + W2 (skill, llms.txt) |
| v0.5.x | W3 (Mermaid-path polish, error messages, model benchmark) + W4 (reposition, launch) |
| later | §5.5 animation polish ongoing; revisit deferred bets against traction data |

Indicative only — each workstream that proceeds gets its own `docs/specs/<id>/` spec with
requirements, design, test, and plan documents before implementation.

## 7. Sources

Point-in-time (2026-06-11). Repos: [Mermaid](https://github.com/mermaid-js/mermaid) ·
[D2](https://github.com/terrastruct/d2) · [PlantUML](https://github.com/plantuml/plantuml) ·
[Graphviz](https://graphviz.org/) · [Kroki](https://github.com/yuzutech/kroki) ·
[Diagrams](https://github.com/mingrammer/diagrams) · [LikeC4](https://github.com/likec4/likec4) ·
[Structurizr](https://structurizr.com/) · [Pintora](https://github.com/hikerpig/pintora) ·
[nomnoml](https://github.com/skanaar/nomnoml) · [CeTZ](https://github.com/cetz-package/cetz) ·
[markmap](https://github.com/markmap/markmap) ·
[Excalidraw](https://github.com/excalidraw/excalidraw) ·
[tldraw](https://github.com/tldraw/tldraw) · [xyflow](https://github.com/xyflow/xyflow) ·
[draw.io](https://github.com/jgraph/drawio) · [JointJS](https://www.jointjs.com/) ·
[Penpot](https://github.com/penpot/penpot) ·
[Motion Canvas](https://github.com/motion-canvas/motion-canvas) ·
[Remotion](https://github.com/remotion-dev/remotion).
MCP/AI: [Mermaid Chart MCP](https://mermaid.ai/docs/ai/mcp-server) ·
[drawio-mcp](https://github.com/jgraph/drawio-mcp) ·
[kamiazya/whiteboard](https://github.com/kamiazya/whiteboard) ·
[kroki-mcp](https://github.com/utain/kroki-mcp) ·
[mindmap-mcp-server](https://github.com/YuChenSSR/mindmap-mcp-server) ·
[Eraser DiagramGPT](https://www.eraser.io/diagramgpt) ·
[tldraw "make real"](https://tldraw.substack.com/p/make-real-the-story-so-far) ·
[GitHub Mermaid rendering](https://github.blog/developer-skills/github/include-diagrams-markdown-files-mermaid/).

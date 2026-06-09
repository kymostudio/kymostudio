# Diagram Claude Skills — Landscape Survey (Research)

| Field             | Value                                                                                                            |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-SKILLS-001                                                                                                  |
| Version           | 0.1                                                                                                            |
| Issue Date        | 2026-06-09                                                                                                     |
| Status            | Draft                                                                                                          |
| Classification    | Internal                                                                                                       |
| Owner             | `diagrams/` project                                                                                            |
| Audience          | Engineers evaluating whether (and how) to ship a `kymo-diagram` Agent Skill                                     |
| Subjects          | Community **Agent Skills** (Claude Code / Cursor / Codex) that produce diagrams — Mermaid, Excalidraw, draw.io, hand-drawn — plus Anthropic's official skills repo |
| Licenses          | Each surveyed project under its own license (linked inline); no third-party code is used in this repository    |
| Access Date       | 2026-06-09 (star counts, feature lists, and "official" claims are point-in-time)                               |
| Related Documents | `RES-MCP-001`, `RES-CLI-001`, `REF-DRAWIO-001`, `REF-D2-001`                                                   |

This is a **research note on prior art** — a survey of how the Agent Skills ecosystem teaches AI
agents to draw diagrams. It is **not a specification**: nothing in this repository depends on it, and
no `kymo-diagram` skill is committed work. It is the companion to the MCP survey (`RES-MCP-001`): MCP
is the *server* side of giving an agent diagram powers, **Agent Skills are the prompt side**.

The framing thesis: a **Skill** is just instructions + scripts + resources in a folder (`SKILL.md`)
that the agent loads on demand — no server, no protocol. For diagrams, the best community skills
converge on one technique that the raw MCP servers (`RES-MCP-001`) mostly skip: a **render-then-look
loop** where the agent renders a draft, *looks at the image*, and fixes layout before delivering.

## 1. What an Agent Skill is, and how it differs from an MCP server

**Agent Skills** are organized folders — instructions, scripts, optional bundled assets — that an
agent discovers from its system prompt and loads dynamically to do a task better. Anthropic released
the format as an **open standard** (spec + reference SDK at `agentskills.io`) in October 2025 and
launched a partner directory (Figma, Canva, Atlassian, Notion, Stripe, …).

The distinction that matters for diagrams:

| | **Agent Skill** (`RES-SKILLS-001`) | **MCP server** (`RES-MCP-001`) |
|---|---|---|
| Shape | Folder of instructions + scripts (`SKILL.md`) | A running tool server (JSON-RPC) |
| State | Stateless; the agent executes the steps | Can hold session/canvas state |
| Install | Drop in a folder; zero infra | Configure & run a process |
| Best at | *Teaching* the agent a grammar + a render/verify recipe | *Exposing* a live tool surface (add-node, inline render) |

They are complementary, not competing: a skill can drive an MCP server, or call a CLI directly.

## 2. The official Anthropic skills repo

[`anthropics/skills`](https://github.com/anthropics/skills) is overwhelmingly **document skills**
(`docx`, `pptx`, `xlsx`, `pdf`) — which *can* embed charts inside Office files — plus
Creative/Development/Enterprise categories. As of the access date it ships **no dedicated
diagram/Mermaid/SVG skill**. The diagram space below is therefore almost entirely community-built.

## 3. The landscape

Grouped by target format. "Render + verify" is the axis that separates a good diagram skill from a
text generator.

### 3.1 Mermaid skills (most common — LLMs write Mermaid most reliably)

| Skill | Author | Render + verify | Notable trait |
|---|---|---|---|
| [mermaid-diagram-skill](https://github.com/mgranberry/mermaid-diagram-skill) | `mgranberry` | render loop | "Beautiful and practical" Mermaid for any coding agent. |
| [mermaid-skill](https://github.com/WH-2099/mermaid-skill) | `WH-2099` | — | Supports **all 23** Mermaid diagram types. |
| [veelenga / ccheney / agents365-ai variants](https://www.skillsdirectory.com/skills/veelenga-mermaid-diagrams) | community | render → self-fix loop | Marketplace copies; decision tree for picking the right diagram type. |

A recurring insight ([MindStudio](https://www.mindstudio.ai/blog/mermaid-diagrams-claude-code-skills-context-compression)):
embedding Mermaid *inside* skill files is a **context-compression** technique — a diagram conveys a
complex process in hundreds of tokens instead of thousands.

### 3.2 Excalidraw skills (hand-drawn aesthetic)

| Skill | Author | Render + verify | Notable trait |
|---|---|---|---|
| [excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill) | `coleam00` | — | NL → polished `.excalidraw`. |
| [excalidraw-skill](https://github.com/Agents365-ai/excalidraw-skill) | `Agents365-ai` | Kroki API or local CLI | 5 patterns, 8-color semantic palette, PNG/SVG, multi-agent. |
| [excalidraw-diagrams](https://github.com/robtaylor/excalidraw-diagrams) | `robtaylor` | — | Programmatic flowcharts/architecture without ASCII art. |
| [excalidraw-toolkit](https://github.com/edwingao28/excalidraw-toolkit) | `edwingao28` | live canvas | "diagram this repo" → architecture on a **live Excalidraw canvas**. |

### 3.3 draw.io skill (most feature-rich — worth studying)

[`Agents365-ai/drawio-skill`](https://github.com/Agents365-ai/drawio-skill):

- 6 presets (ERD, UML Class, Sequence, Architecture, ML/DL, Flowchart); exports PNG/SVG/PDF/JPG via
  the native draw.io desktop CLI.
- **Vision self-check**: render a draft PNG → the model *looks at it* → detects overlaps, clipped
  labels, stacked edges → auto-fixes up to 2 rounds, plus a 5-round user-feedback refinement loop.
- **Codebase-to-diagram**: parses import graphs (Python/JS-TS/Go/Rust) and class hierarchies, lays
  out with Graphviz (orthogonal routing, transitive reduction, nested containers per package).
- 10,000+ official shapes (AWS/Azure/GCP/K8s/UML) + 321 AI/LLM brand logos; a **deterministic
  validator** lints structure before the visual check.

### 3.4 Hand-drawn / misc

| Skill | Author | Notable trait |
|---|---|---|
| [hand-drawn-diagrams](https://github.com/muthuishere/hand-drawn-diagrams) | `muthuishere` | Monochrome architecture/workflow/UX blueprints as PNG; runs on Claude Code **and** Codex. |

## 4. Patterns worth borrowing

1. **Render-then-look (vision self-check).** Almost every *good* diagram skill renders a draft, has
   the model inspect the image, and corrects layout before delivering. This is the single biggest
   quality lever — and the thing the plain MCP render servers in `RES-MCP-001` mostly omit.
2. **Codebase-to-diagram.** "diagram this repo" is the use case closest to a coding agent's daily
   work; it pairs an import-graph parser with an auto-layout engine (often Graphviz).
3. **Deterministic validate before visual check.** Lint the structured file first (cheap, exact),
   then spend a vision pass only on what lint can't catch (overlap, spacing).
4. **Context compression.** A diagram embedded in a skill is a token-efficient way to carry process
   knowledge — a reason to make kymo output legible to the agent, not just the human.

## 5. Lessons for a possible `kymo-diagram` skill

Kept deliberately short — a pointer, not a spec. Read alongside `RES-MCP-001` §5.

- **Skill and MCP are complementary, not either/or.** kymostudio already merged a web-app MCP server
  (`packages/web-app/mcp-server.js`). A `kymo-diagram` *skill* would sit on top: teach the agent to
  write kymo DSL, render via the `kymo` CLI (`RES-CLI-001`), and self-verify — calling the MCP server
  or the CLI underneath.
- **Vision self-check is kymo's missing lever.** kymo already renders to SVG/WebP; a skill that
  renders a draft, looks at it, and fixes layout would close the quality gap with the draw.io skill —
  and is cheap to add as a `SKILL.md` recipe, not engine work.
- **Codebase-to-diagram fits the Rust core.** kymostudio-core already has BPMN/flowchart import; a
  skill that maps a repo's structure to a kymo diagram is a natural extension of that.
- **Beat the familiarity tax with the skill itself.** kymo DSL is unknown to models. A skill is the
  *right* place to fix this: bundle few-shot examples and a grammar cheat-sheet in `SKILL.md` so the
  model emits valid kymo without a giant inline system prompt (the `RES-MCP-001` §5 concern, solved on
  the prompt side).

## References

Accessed 2026-06-09.

- Standard: [Anthropic — Equipping agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) ·
  [anthropics/skills](https://github.com/anthropics/skills) · [agentskills.io](https://agentskills.io/home)
- Mermaid: [mgranberry/mermaid-diagram-skill](https://github.com/mgranberry/mermaid-diagram-skill) ·
  [WH-2099/mermaid-skill](https://github.com/WH-2099/mermaid-skill) ·
  [MindStudio — context compression](https://www.mindstudio.ai/blog/mermaid-diagrams-claude-code-skills-context-compression)
- Excalidraw: [coleam00/excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill) ·
  [Agents365-ai/excalidraw-skill](https://github.com/Agents365-ai/excalidraw-skill) ·
  [robtaylor/excalidraw-diagrams](https://github.com/robtaylor/excalidraw-diagrams) ·
  [edwingao28/excalidraw-toolkit](https://github.com/edwingao28/excalidraw-toolkit)
- draw.io: [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill)
- Hand-drawn: [muthuishere/hand-drawn-diagrams](https://github.com/muthuishere/hand-drawn-diagrams)

## Annex A — Revision history

| Version | Date       | Author        | Change                                    |
|---------|------------|---------------|-------------------------------------------|
| 0.1     | 2026-06-09 | `diagrams/`   | Initial landscape survey of diagram Agent Skills. |

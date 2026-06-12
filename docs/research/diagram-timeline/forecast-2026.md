# 2026 — The agent default: most diagrams start as a prompt

| Field       | Value                                            |
|-------------|--------------------------------------------------|
| Document ID | RES-DIAGRAM-TIMELINE-2026                        |
| Version     | 1.0                                              |
| Issue Date  | 2026-06-12                                       |
| Status      | Forecast (speculative)                           |
| Era         | D — Agent-native (2026–2035)                     |
| Related     | [Index](README.md) · prev [2025](2025.md) · next [2027](forecast-2027.md) |

> **This page is a forecast** — an authored extrapolation of trajectories visible through early 2026, not a record of events (METHOD §6). 2026 is the year in progress as this is written (2026-06-12): the setup is real, the year-end picture is projected. Projected events carry no citations; [Signals](#signals) lists the real sources being extrapolated.

## Highlights (projected)

### 1. MCP-grade diagram access becomes table stakes

What 2025 demonstrated — assistants creating and editing live diagrams through Model Context Protocol servers — stops being a differentiator and becomes a checklist item. By year-end every major diagramming surface either ships an official MCP server or exposes an equivalent structured API, because a tool agents cannot operate is a tool that quietly stops being chosen.

### 2. Mermaid takes #1: the interchange format outranks the canvases

The bulk of new diagrams are now emitted by assistants, and what assistants emit is overwhelmingly Mermaid — the measured npm curve (74.7M downloads in 2025) was already saying this. The #1 slot, held by a human-facing canvas every year since 1995, goes for the first time to a text format most of whose "users" never see its syntax.

### 3. Diagram checks enter CI

Teams that adopted agent-generated architecture diagrams in 2024–2025 hit the staleness problem at scale, and the fix is borrowed from code: diagrams as reviewed artifacts, regenerated and diffed in CI, failing the build when they drift from the system they describe. "Diagram-as-code" completes its 25-year arc by inheriting code's tooling, not just its syntax.

## Top 10 diagram types

| # | Δ | Type | Evidence / why |
|---|---|------|----------------|
| 1 | = | Flowchart | Default |
| 2 | = | System / agent architecture | Steady |
| 3 | = | AI-generated diagrams | Steady |
| 4 | ↑6 | State machine / agent-state graph | Agent workflow graphs surge with multi-agent systems |
| 5 | ↓1 | UML sequence | Slips |
| 6 | ↓1 | ER diagram | Slips |
| 7 | ↓1 | C4 | Slips |
| 8 | ↓1 | Data-pipeline / DAG | Slips |
| 9 | ↓1 | Mind map / canvas boards | Slips |
| 10 | ↓1 | User journey | Slips |

## Top 10 tools

| # | Δ | Tool | Evidence / why |
|---|---|------|----------------|
| 1 | ↑1 | Mermaid | Becomes the de-facto agent interchange format; takes #1 from Miro |
| 2 | ↓1 | Miro | Yields #1 after four years; the human-canvas franchise plateaus |
| 3 | ↑4 | ChatGPT / Claude as diagram generators | Assistants draw more diagrams than any canvas hosts |
| 4 | = | Excalidraw | Steady |
| 5 | ↓2 | Lucid | Slips |
| 6 | ↓1 | diagrams.net | Slips |
| 7 | ↑1 | FigJam | Rising |
| 8 | ↓2 | Microsoft Visio | Legacy floor keeps eroding |
| 9 | new | tldraw | Canvas-as-SDK: embedded whiteboards spread through other products |
| 10 | = | Eraser | Steady |

*Rankings are scenario projections, not evidence — an authored extrapolation (METHOD §6); Δ is the rank change vs the previous year (new = first appearance, back = re-entry). Dropped out vs 2025: PlantUML (tools). PlantUML exits after 12 years as assistants subsume text-to-UML.*

## Context

Era D opens here: the question of 2025 — "how do humans *and agents* share a visual model?" — gets its first production answers. Nothing in this year is exotic; it is the 2025 inflection running one more year at the same slope. The forecast risk is timing, not direction.

## Signals

- MCP specification and ecosystem — <https://modelcontextprotocol.io>
- Mermaid MCP server — <https://mermaid.ai/docs/ai/mcp-server>
- Mermaid's measured adoption curve (npm, 2015–2025) — `docs/data/database.sqlite`, `tool_metric_history`
- tldraw Series A / canvas-as-SDK — <https://tldraw.dev/blog/announcing-tldraw-series-a>

---

← prev [2025](2025.md) · [Index](README.md) · next [2027](forecast-2027.md) →

# Loop Engineering — Survey of the Agentic Loop Discipline (Research)

| Field             | Value                                                                                                            |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-LOOP-001                                                                                                    |
| Version           | 0.1                                                                                                            |
| Issue Date        | 2026-06-21                                                                                                     |
| Status            | Draft                                                                                                          |
| Classification    | Internal                                                                                                       |
| Owner             | `kymostudio` project                                                                                           |
| Audience          | Engineers using AI coding agents (Claude Code, Codex) on this monorepo who want to automate recurring, verifiable work |
| Subjects          | "Loop engineering" — designing systems that autonomously prompt AI agents in iterative cycles, vs. prompt/context engineering |
| Access Date       | 2026-06-21 (a fast-moving topic; URLs and tool feature names are point-in-time)                                |
| Related Documents | `RES-MCP-001`, `RES-SKILLS-001`, `RES-CLI-001`                                                                  |

This is a **research note on prior art** — a survey of how the agent-tooling community frames
"loop engineering" as the next discipline after prompt and context engineering. It is **not a
specification**: nothing in this repository depends on it. It is an evidence base and a map of
patterns worth borrowing for how we drive Claude Code / Codex against this monorepo.

The framing thesis: **leverage has moved from the prompt to the loop.** The skill that matters is no
longer phrasing a single request well, but *architecting the system that prompts the agent* — one that
finds work, does it, verifies completion, and retains context across runs without a human in the chair.

> **Companion note:** [`application-kymostudio.md`](application-kymostudio.md) (`RES-LOOP-002`) applies
> this survey to *this* repository — concrete loop designs mapped onto kymostudio's CI, golden tests,
> conformance suite, MCP servers, and the existing `mermaid-hillclimb` loop.

## 1. Definition

**Loop engineering** is the practice of designing systems that **autonomously prompt an AI agent**,
rather than a human typing each prompt. The agent runs an **iterative cycle** — *act → observe result
→ reason → repeat* — until a goal is met, instead of producing one single-shot answer.

> "You stop being the person who prompts the agent and start being the person who designs the system
> that prompts it." — Lushbinary

## 2. Where it sits in the evolution

| Era | Core question | Where the leverage lives |
|---|---|---|
| **Prompt engineering** | "What should I *say*?" | Skill at phrasing one prompt |
| **Context engineering** | "What does the agent need to *know*?" | Managing context / memory |
| **Loop engineering** | "What *system* do I build so the agent finds work, does it, verifies, and keeps context — with no human in the loop?" | Orchestration architecture |

This is **evolution, not replacement**: "Prompt engineering isn't dead — it's table stakes."

## 3. Loop ≠ chain

- **Chain:** linear — A → B → C.
- **Loop:** dynamic — A → B, discover B failed, **retry with a modified approach**.

The feedback edge (observe → reason → revise) is what distinguishes a loop from a pipeline.

## 4. The five core components of a loop

1. **Trigger** — automated initiation (schedule, event, or another agent finishing).
2. **Goal** — a **verifiable** end state, not a vague objective.
3. **Actions / tools** — what the agent can do (read/write files, run commands, call APIs, spawn sub-agents).
4. **Verification** — confirmation that the goal is met (tests, a supervisor agent, an audit pass).
5. **Memory** — durable context (markdown files, an issue board) that **survives between runs** even when the model's context window resets.

Supporting mechanics: explicit **termination conditions**, **error-handling logic** (recoverable error
vs. hard blocker), and a **tool-call budget per iteration** to prevent infinite loops.

## 5. Architecture patterns

| Pattern | Best for |
|---|---|
| **Retry loop** | Atomic, pass/fail tasks (e.g. write a function until tests pass) |
| **Plan-Execute-Verify** | Multi-step work where order matters and early mistakes compound |
| **Explore-Narrow** | Debugging or unfamiliar APIs where the solution path is unknown |
| **Human-in-the-loop** | High-stakes or ambiguous decisions needing human judgment |
| **ReAct** | The canonical coding loop: understand → write code → run & observe → reason → revise → repeat |

## 6. Origin: the "Ralph" technique

Geoffrey Huntley's **"Ralph"** loop (named after the Simpsons character) was the proof of concept: a
plain `while` loop that feeds the same prompt repeatedly with **fresh context each iteration**, reads
the spec from disk, commits one task, then resets. The lesson: capability comes from **"clear, granular
specifications and verifiable outcomes"** plus external state files — *not* from one heroic long session.
Modern loop engineering is, in effect, the **productization of Ralph** — moving scheduling, isolation,
and verification inside the tools.

## 7. Six practical building blocks

1. **Automations** — recurring triggers that surface work without manual kickoff.
2. **Worktrees** — isolated git checkouts so parallel agents don't collide on files.
3. **Skills** — documented project knowledge/conventions so the agent isn't re-taught each run.
4. **Sub-agents** — separate roles (maker vs. verifier) to prevent an agent grading its own work.
5. **Connectors (MCP)** — integrations to issue trackers, APIs, Slack, etc.
6. **Memory** — state held outside the context window.

**Tooling:** both **Claude Code** (`/loop`, `/goal`, hooks, sub-agents, worktree isolation) and
**OpenAI Codex** (Automations tab, `/goal`, worktrees, TOML sub-agents, skills) ship these primitives,
both using **MCP** for connectors — which keeps loops portable between the two.

## 8. Maturity ladder (earn trust incrementally)

| Level | Behavior |
|---|---|
| **0** | Manual prompting |
| **1** | Triage automation that only writes findings |
| **2** | Loop drafts fixes on branches; human reviews PRs |
| **3** | Verifier sub-agent gates changes before human review |
| **4** | Auto-merge for low-risk categories with human audit |

A goal is a **contract** — end state, the evidence that proves success, constraints, and a budget
ceiling — not a wish. "A goal is only as good as the evidence that proves it."

## 9. Risks

- **Verification debt** — an unattended loop makes mistakes unattended; human review of merged code stays essential.
- **Comprehension debt** — code ships faster than understanding grows.
- **Cognitive surrender** — accepting loop output without judgment erodes the engineering mindset.

> Loop engineering does not remove the engineer; it **accelerates both good and bad decisions**. Treat
> autonomous loops as augmentation of engineering rigor, not a replacement for it.

## 10. Relevance to this monorepo

kymostudio already exposes most loop-engineering primitives, so the patterns above map directly:

- **Verification is cheap and strict here** — the byte-for-byte golden SVG tests, the BPMN corpus
  regression baselines, and the Python↔JS conformance suite (see `CLAUDE.md`) are exactly the kind of
  **verifiable stop conditions** a good loop needs. A loop's `/goal` can be "pytest green + conformance
  unchanged" with the failing diff as evidence.
- **Skills + connectors** already exist (`/kymo-bump`, `/github`, the `kymostudio` MCP server — see
  `RES-MCP-001`, `RES-SKILLS-001`).
- **Sub-agents and worktree isolation** are available for maker/verifier separation on parallel changes.

Candidate loops worth designing (none committed): regenerate-and-verify goldens after an intentional
renderer change; nightly BPMN corpus drift triage; a parity-watcher that flags when a feature lands in
`packages/python` but not `packages/js`. Each should start at maturity Level 1–2 (findings / draft PRs)
before earning more autonomy.

## Sources

- [MindStudio — *What Is Loop Engineering? The New Meta for AI Coding Agents*](https://www.mindstudio.ai/blog/what-is-loop-engineering-ai-coding-agents)
- [Explainx.ai — *What Is Loop Engineering? Beyond Prompt Engineering in 2026*](https://explainx.ai/blog/what-is-loop-engineering-ai-agents-2026)
- [Lushbinary — *Loop Engineering: The Guide for AI Agents*](https://lushbinary.com/blog/loop-engineering-ai-coding-agents-guide/)
- [GitHub — *cobusgreyling/loop-engineering*](https://github.com/cobusgreyling/loop-engineering)
- [Mem0.ai — *Loop Engineering for AI Agents: Memory-First Design*](https://mem0.ai/blog/loop-engineering-for-ai-agents-memory-first-design)
- Background: Geoffrey Huntley, the "Ralph" loop technique (referenced widely in the above).

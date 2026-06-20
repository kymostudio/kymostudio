# Loop Engineering for kymostudio (Research)

| Field             | Value                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-LOOP-001                                                                                                     |
| Version           | 0.1                                                                                                              |
| Issue Date        | 2026-06-20                                                                                                       |
| Status            | Draft                                                                                                            |
| Classification    | Internal                                                                                                         |
| Owner             | `diagrams/` project                                                                                              |
| Audience          | Maintainers deciding how to run autonomous coding-agent loops against this monorepo                              |
| Subjects          | Definition of "loop engineering" (the 2026 successor to prompt/context engineering), and a concrete mapping onto kymostudio's verifiable-goal surface (golden SVG, BPMN conformance, render-regression, lockstep release) |
| Access Date       | 2026-06-20 (external definitions are point-in-time; the term was coined ~June 2026)                              |
| Related Documents | `RES-STRATEGY-001`, `RES-MCP-001`, `RES-SKILLS-001`                                                              |

This is a **research note with a recommendation** — it defines loop engineering and proposes how
to apply it to this repository. It is **not a specification**: nothing in this repository depends
on it, and none of the workstreams in §5 are committed work. When a workstream is picked up, it
gets its own spec under `docs/specs/<id>/`.

The framing thesis: **kymostudio is unusually well-suited to loop engineering because it is
saturated with machine-checkable goals.** Byte-for-byte golden SVGs, the BPMN conformance corpus,
the render-count regression guard, and lockstep multi-registry releases all give an autonomous
agent a *verifiable* stop condition — which is the single hardest prerequisite for a safe loop.

## 1. What "loop engineering" is

Loop engineering is the practice of **designing the system that prompts the agent**, rather than
prompting the agent yourself. You give the agent a *goal* (not a one-shot prompt) plus a *trigger*
(event, schedule, or command); the agent then assembles context, reasons, acts, observes the
result, and repeats until the goal is met or a stop condition fires.

It is the third wave in a progression:

| Wave | Unit of work | What you author |
|------|--------------|-----------------|
| Prompt engineering | a single request | the prompt |
| Context engineering | the model's working set | what information the model sees |
| **Loop engineering** | an autonomous, bounded workflow | the goal, the trigger, the guardrails |

Lineage: the loop itself descends from the **ReAct** pattern (Reason + Act, Princeton/Google,
2022) — interleaving a reasoning trace with a concrete action so the agent learns from unexpected
results instead of blindly retrying — through Reflexion, Plan-and-Execute, OODA and dual-loop
architectures, to 2025–26 practices like file-based state resets and goal-driven commands. Loop
*engineering* is the discipline layered on top: turning loose autonomy into a **bounded, reproducible
system** with explicit termination, iteration caps, and human checkpoints.

### The non-negotiable prerequisite

A loop is only as safe as its **stop condition is verifiable**. If "done" cannot be checked by a
machine, the loop either halts too early or runs away. This is why kymostudio is a good fit, and
why §3 anchors every proposed loop on an existing automated check.

## 2. The agent loop, concretely

```
trigger ─▶ assemble context ─▶ reason / plan ─▶ act (tool call) ─▶ observe result
              ▲                                                          │
              └──────────────── goal not yet met ◀───────────────────────┘
                                       │
                                  goal met / cap hit / no progress ─▶ stop + report
```

For a kymostudio coding loop the "act → observe" step is almost always: *edit code → run the
relevant gate (cargo test / pytest / playwright / golden diff) → read pass/fail → revise*.

## 3. Where the loops live in this repo

Every row below is anchored on an **existing** automated, verifiable goal, ordered by
value-to-risk.

| Loop | Trigger | Verifiable goal | Existing substrate |
|------|---------|-----------------|--------------------|
| **CI babysit** | PR CI failure (webhook) | `test.yml` / `rust.yml` / `playwright.yml` all green | Claude Code on the web + PR activity events |
| **BPMN regression triage** | nightly `bpmn-regression.yml` failure | diff vs `tests/corpus_bpmn/baseline_full.json` is empty | `.github/workflows/bpmn-regression.yml`, vendored corpus |
| **Golden / conformance fixer** | golden or conformance test failure | goldens match byte-for-byte | `conformance/`, `.gitattributes` EOL pinning |
| **Icon library maintenance** | new icon request | manifest valid + icons-site builds | `packages/icons`, `deploy-icons.yml` |
| **Recurring chores** | weekly schedule | e.g. Node 24 migration, dependency bumps stay green | the `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` pattern already in workflows |
| **Self-dogfooding render loop** | new/edited diagram source | render succeeds + visual check via the project's own MCP | `packages/mcp` (`mcp.kymo.studio`), live shared canvas |

**Recommended first loop: CI babysit**, then **BPMN regression triage** — both have binary
green/red goals, low blast radius, and rich existing signal.

## 4. The five components, mapped to kymostudio

Following the now-standard decomposition (Osmani, 2026):

1. **Skills** (`.claude/skills/`) — encode monorepo knowledge so the agent does not re-derive it
   each cycle. Highest priority given the polyglot layout:
   - `build-and-test` — how to build the wasm core, run `pytest`, `cargo test`, and Playwright per
     package.
   - `golden-tests` — how to regenerate/diff golden SVGs and why `.gitattributes` EOL pinning
     matters (the goldens are byte-for-byte).
   - `release` — the lockstep PyPI / npm / crates / VS Code flow (from `docs/RELEASING.md`).
2. **Automations** — schedule-driven loops: turn a nightly `bpmn-regression.yml` failure into an
   auto-filed issue or fix PR; daily issue triage.
3. **Worktrees** — isolated parallel work so concurrent agents don't collide on shared build
   artifacts (the wasm core is consumed by several packages).
4. **Plugins / connectors (MCP)** — the repo *ships its own* MCP server (`packages/mcp`), so a
   loop can dogfood the product: generate a diagram, render it, verify it, iterate.
5. **Sub-agents** — exploit the strong verification surface: one agent writes code, a separate
   agent verifies goldens/conformance before anything ships.

Plus **persistent state** — a markdown checklist or the PR description as a live status board,
because the model forgets between runs.

## 5. Candidate workstreams (not committed)

- **LOOP-WS-1** — Lay the foundation: a root `CLAUDE.md` (monorepo map: which package builds/tests
  how) + a SessionStart hook so web sessions can run the gates.
- **LOOP-WS-2** — Author the three skills in §4.1.
- **LOOP-WS-3** — Stand up the CI-babysit loop on a real PR (subscribe to PR activity).
- **LOOP-WS-4** — Convert nightly BPMN regression into an auto-triage loop.

Each, if picked up, graduates to `docs/specs/<id>/`.

## 6. Guardrails (mandatory for any loop here)

- **Iteration cap + token budget** per loop.
- **No-progress detection** — if golden/conformance fails identically across N iterations, stop
  and escalate to a human (a stuck loop must not keep editing).
- **Human checkpoint for irreversible actions** — releasing/publishing to any registry, pushing to
  `main`, and Cloudflare deploys are the hard boundary; these always require human approval.
- **Verification stays human** — when an agent "fixes" a golden, a person must confirm the new
  golden is *visually correct*, not merely that the test is green. A green test on a wrong golden
  is the canonical loop-engineering failure mode.

## 7. References (external, point-in-time)

The term and its decomposition are 2026-era; definitions are point-in-time as of the access date.

- Addy Osmani — *Loop Engineering* — <https://addyosmani.com/blog/loop-engineering/>
- Data Science Dojo — *Agentic Loops: From ReAct to Loop Engineering (2026 Guide)* —
  <https://datasciencedojo.com/blog/agentic-loops-explained-from-react-to-loop-engineering-2026-guide/>
- MindStudio — *What Is Loop Engineering? The New Meta for AI Coding Agents* —
  <https://www.mindstudio.ai/blog/what-is-loop-engineering-ai-coding-agents>
- Oracle Developers — *What Is the AI Agent Loop?* —
  <https://blogs.oracle.com/developers/what-is-the-ai-agent-loop-the-core-architecture-behind-autonomous-ai-systems>
- Yao et al. — *ReAct: Synergizing Reasoning and Acting in Language Models* (2022) —
  <https://arxiv.org/abs/2210.03629>

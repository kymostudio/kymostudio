---
name: loop-design
description: Design an autonomous agent loop for the kymostudio repo — pick a verifiable goal contract, wire trigger/actions/verification/memory, and pick a safe maturity level. Use when the user wants to automate recurring work here ("automate X", "set up a loop", "run this nightly", "keep checking Y"), or before writing a /loop, /goal, or .claude/workflows script. Loop engineering = designing the system that prompts the agent, not prompting by hand.
when_to_use: Triggered by requests to automate a recurring, verifiable task on this monorepo, or to scaffold a new loop / workflow / scheduled agent.
argument-hint: "[task to automate]"
allowed-tools: Read Bash Grep
---

The entry point for loop engineering on kymostudio. Background: the concept survey is
`docs/research/engineering/loop-engineering/README.md` (`RES-LOOP-001`); the repo-specific
designs are `application-kymostudio.md` (`RES-LOOP-002`). Read the latter when the task is
non-trivial — it has the full goal-contract menu, the five candidate loops, and the substrate.

## A loop here = five parts. Fill all five before writing any script.

1. **Trigger** — what starts it. Manual (`/loop`), schedule (cron / `bpmn-regression.yml`
   already runs nightly), or an event (a PR diff touching certain paths).
2. **Goal** — a *verifiable contract*, not a wish. **This repo hands you ready ones** — pick
   from the menu below. The goal is "this command exits 0", nothing vaguer.
3. **Actions** — the tools the loop may use (edit files, run a regen flag, call a skill,
   `gh` for PRs, MCP). Prefer existing skills as actions: `/kymo-golden`, `/kymo-parity`.
4. **Verification** — how "done" is proven. Almost always `/kymo-verify`.
5. **Memory** — state that survives a context reset: the goldens/baselines themselves, a
   markdown ledger, or a `gh` issue/label. Name it explicitly.

## Goal-contract menu (the verifiable surfaces)

| Want to guard… | Contract (exits 0 = done) | Regen-on-intent |
|---|---|---|
| renderer/layout output | `cd packages/python && uv run --group dev python -m pytest -q` | `/kymo-golden` |
| Python↔JS parity | `cd packages/js && npm test` (asserts JS == Python goldens) | `/kymo-parity` |
| BPMN corpus (per-build) | part of pytest above (`test_bpmn_corpus.py`) | `KYMO_UPDATE_BPMN_BASELINE=1` |
| full MIWG corpus (nightly) | `tests/_bpmn_regress.py --baseline …/baseline_full.json` | CLI `--update` |
| mermaid visual gap | `benches/mermaid-format/worst10-grid.mjs` (`kScore` drops) | re-run bench |
| icon manifest fresh | `node scripts/build-manifest.mjs && git diff --exit-code` | rebuild + commit |

Full verdict = `/kymo-verify all`.

## Pattern (pick one)

Retry (atomic pass/fail) · Plan-Execute-Verify (multi-step, order matters) ·
Explore-Narrow (debug / unknown path) · Human-in-the-loop (judgment) ·
Hill-climb (narrow a numeric gap — see the working example `.claude/workflows/mermaid-hillclimb.js`).

## Maturity — start low, earn autonomy

- **L1 findings-only** — writes a report / draft PR, changes nothing. Start every new loop here.
- **L2 drafts on a branch** — human reviews the PR (the golden reconciler lives here).
- **L3 verifier sub-agent gates** before human review.
- **L4 auto-merge** — narrowest, most mechanical category only, if ever.

Never start at auto-merge. Guard the three debts (`RES-LOOP-001` §9): a loop that refreshes
baselines faster than a human understands *why the pixels moved* is the real risk — every
baseline-touching PR must still answer "why did this change?".

## Output: a concrete proposal

Given the task, produce:
1. the filled five-part table (trigger / goal-command / actions / verify / memory);
2. the chosen pattern + maturity level (justified);
3. **the artifact to create** — either a ready `/loop … --schedule "<cron>"` invocation, or a
   `.claude/workflows/<name>.js` skeleton modeled on `mermaid-hillclimb.js` (worktree-isolated,
   schema-typed, regression-gated, diffs-for-review). Do not implement until the user okays it.

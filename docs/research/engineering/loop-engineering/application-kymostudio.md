# Applying Loop Engineering to kymostudio (Research)

| Field             | Value                                                                                                            |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-LOOP-002                                                                                                    |
| Version           | 0.1                                                                                                            |
| Issue Date        | 2026-06-21                                                                                                     |
| Status            | Draft                                                                                                          |
| Classification    | Internal                                                                                                       |
| Owner             | `kymostudio` project                                                                                           |
| Audience          | Maintainers driving Claude Code / Codex against this monorepo who want to automate recurring, verifiable work  |
| Subjects          | Concrete loop designs grounded in kymostudio's actual CI, test, conformance, MCP and skill infrastructure      |
| Related Documents | `RES-LOOP-001` (the concept survey), `RES-MCP-001`, `RES-SKILLS-001`, `RES-CLI-001`                            |

This note operationalizes `RES-LOOP-001` for *this* repository. It is **not a specification and nothing
depends on it** — it is a design study mapping the loop-engineering primitives (trigger, goal, actions,
verification, memory) onto kymostudio's existing machinery, and proposing a small set of high-value loops
with explicit, runnable **goal contracts**.

The central observation: **kymostudio is unusually well-suited to loop engineering because its
verification is already cheap, strict, and machine-checkable.** Byte-for-byte golden SVGs, the BPMN
corpus baseline, and the Python↔JS conformance suite are exactly the "verifiable stop conditions" that a
good loop needs (`RES-LOOP-001` §4). A loop here rarely has to *invent* a success metric — it inherits one.

## 1. We already run a loop — name it, then generalize it

The repo ships a working loop-engineering artifact: **`.claude/workflows/mermaid-hillclimb.js`**. Its own
header comment calls it *"Loop B: the hill-climbing loop from the loop-engineering design."* Read through
the `RES-LOOP-001` §4 lens it is a textbook loop:

| Loop component | How `mermaid-hillclimb` realizes it |
|---|---|
| **Trigger** | Manual / on-demand (a `Workflow` run) |
| **Goal** | A worst-10 fixture's `kScore` (pixel-diff ×100 vs the mmdc reference) **strictly drops** |
| **Actions** | Edit the `kymo-mermaid` Rust crate, rebuild to wasm, re-score via `benches/mermaid-format/worst10-grid.mjs` |
| **Verification** | Reward improves **AND** no other fixture regresses > `EPS=0.2` **AND** `cargo test -p kymo-mermaid` green |
| **Memory** | `scores.json` baseline on disk; per-round structured outputs (`SCORE_SCHEMA`, `FIX_SCHEMA`) |
| **Termination** | `MAX_DRY = 2` consecutive rounds with no kept fix → converged |
| **Isolation / safety** | Every hypothesis runs in `isolation:'worktree'`; **never** touches the main tree; emits diffs for human review (maturity Level 2, `RES-LOOP-001` §8) |

**Takeaway:** the patterns below are not speculative for this repo — they are *the same shape* as a loop
that already exists. The work is to instantiate that shape against the other verifiable surfaces.

## 2. The verification surface = the menu of goal contracts

Every loop needs a goal that is "a contract, not a wish" (`RES-LOOP-001` §8). kymostudio hands us a ready
catalogue of contracts. Each row is a self-contained, runnable stop condition.

| Verifiable surface | Pass condition (the contract) | Regenerate-on-intent flag | Tier |
|---|---|---|---|
| Golden SVGs (`tests/test_diagrams.py`, `test_layout.py`, `test_edges.py`) | byte-for-byte vs committed `output.svg` | `KYMO_UPDATE_GOLDEN=1` | per-build gate |
| BPMN corpus (`tests/test_bpmn_corpus.py`, ~120 MIWG files) | `(status, n_nodes, n_edges, sha)` == `baseline.json` | `KYMO_UPDATE_BPMN_BASELINE=1` | per-build gate |
| Model conformance (`tests/test_conformance.py`) | resolved-model JSON == `conformance/golden/*.model.json` | `KYMO_UPDATE_CONFORMANCE=1` | per-build gate |
| BPMN conformance (`tests/test_bpmn_conformance.py`) | import/export digests == `conformance/golden/bpmn_{import,export}.json` + interop XML | `KYMO_UPDATE_CONFORMANCE=1` | per-build gate |
| **JS parity** (`packages/js` `npm test` → `conformance.test.js`, `bpmn-conformance.test.js`) | JS models == the **Python-written** goldens (JS is read-only) | *(none — Python is sole golden writer)* | per-build gate |
| Full MIWG regression (`tests/_bpmn_regress.py` → `baseline_full.json`) | no drift over ~840 files | CLI `--update` | **nightly** (`bpmn-regression.yml`, 02:17 UTC) |
| Mermaid visual accuracy (`benches/mermaid-format/worst10-grid.mjs`) | `kScore` drops, no regression | re-run bench | bench / offline |
| Icon manifest freshness (`scripts/build-manifest.mjs`) | `git diff --exit-code` clean after rebuild | rebuild + commit | per-build gate (JS job) |

**Key asymmetry to respect in any loop:** *Python is the reference implementation and the sole golden
writer.* JS never writes goldens — it must be **reconciled toward Python** (the documented root cause of
every past divergence was JS rounding; fix with `pyRound` in `src/round.ts`, never by loosening the test).
Any loop that touches both impls must regenerate from Python, then make JS pass — not the reverse.

## 3. Candidate loops, ranked by value × safety

Each is specified as `RES-LOOP-001` recommends: trigger, goal *contract*, actions, verification, memory,
maturity level. Ordered by recommended adoption order.

### Loop 1 — Intentional-change golden reconciler  ·  pattern: Plan-Execute-Verify  ·  start at Level 2

The single most common friction in this repo: an intentional renderer/layout change churns dozens of
golden files, and you must regenerate the *right* baselines, in the right order, then prove parity held.

- **Trigger:** on-demand, after a deliberate change under `packages/python/src/kymo/` (or the JS mirror).
- **Goal contract:**
  1. `uv run --group dev python -m pytest -q` green;
  2. `cd packages/js && npm test` green (parity preserved);
  3. the only changed committed files are goldens + the source change — **no unrelated golden churn**
     (the "keep unaffected diagrams byte-identical" rule from `CLAUDE.md`).
- **Actions:** run pytest → if golden tests fail, classify each failure as *intended* (matches the change)
  or *collateral*; regenerate **only** the intended tier via the matching flag (`KYMO_UPDATE_GOLDEN` /
  `_BPMN_BASELINE` / `_CONFORMANCE`); re-run; then run the JS suite.
- **Verification:** the three contract clauses above; plus `git diff --stat` reviewed for scope.
- **Memory:** the diff itself + a short run log of which tiers were regenerated and why.
- **Why Level 2:** it regenerates committed baselines — a verifier sub-agent should gate before a human
  reviews the PR (escalate to Level 3 once trusted). **Never** let it regenerate to make a *failing*
  test pass without classifying the failure first — that is how a real regression gets blessed into a baseline.

### Loop 2 — Python↔JS parity watcher  ·  pattern: Explore-Narrow  ·  start at Level 1

`CLAUDE.md`'s headline constraint is "two independent implementations at parity." The conformance suite
enforces parity *only for what is in the corpus* — a brand-new feature with no corpus case is invisible to it.

- **Trigger:** a change landing in one impl's front-end/layout/renderer without a sibling change in the
  other (detectable from the diff: `packages/python/src/kymo/**` touched, `packages/js/src/**` not, or vice-versa).
- **Goal contract:** for any new behavior, a corpus case exists in `conformance/corpus/` **and** both
  `python -m pytest tests/test_conformance.py` and JS `conformance.test.js` pass on it.
- **Actions:** add a minimal `.kymo`/`.bpmn` corpus case exercising the new behavior → regenerate goldens
  from Python (`KYMO_UPDATE_CONFORMANCE=1`) → run JS suite → if JS diverges, surface the gap (often a
  `pyRound` site or an unported feature) as findings.
- **Verification:** conformance green on both sides for the new case.
- **Memory:** `conformance/known_divergences.json` (currently `{}`) for any *tracked-but-unreconciled* gap.
- **Why Level 1 first:** it should **only write findings/issues** at first ("feature X in Python lacks a JS
  counterpart; here's a failing corpus case"), letting a human decide the port. Auto-porting across two
  hand-mirrored codebases is high-risk; earn trust before automating the fix.

### Loop 3 — Nightly BPMN-drift triager  ·  pattern: Explore-Narrow  ·  start at Level 1

`bpmn-regression.yml` already runs nightly and *fails* on drift over the 840-file corpus — but a red run
is just a signal; a human still has to diagnose it. This loop turns the signal into a triaged report.

- **Trigger:** the nightly `bpmn-regression.yml` run concludes red (poll via `gh run list`).
- **Goal contract:** every drifted file in `baseline_full.json` is classified *intended* (renderer change →
  baseline refresh needed) vs *regression* (bug), with the responsible commit identified.
- **Actions:** diff `baseline_full.json` keys `(status, n_nodes, n_edges, sha)`; for the changed set, bisect
  recent `main` commits touching `to_svg.py` / `bpmn_shapes.py` / `from_bpmn.py`; group by cause.
- **Verification:** the triage reproduces — re-running `_bpmn_regress.py` on the named commit shows the
  flip. For *intended* drift, propose the `--update` baseline-refresh PR **and** the paired
  `baseline.json` + conformance refresh (they move together per `CLAUDE.md`).
- **Memory:** a dated triage note; the `gh` issue/PR it opens.
- **Why Level 1:** classification + draft PR only; a human merges any baseline change.

### Loop 4 — Mermaid visual hill-climb  ·  *already built* (`mermaid-hillclimb.js`)  ·  Level 2

Documented in §1. The generalization worth extracting: its harness (worktree-isolated hypothesis →
rebuild → re-score → regression-gated keep) is a **reusable template** for any "narrow a numeric gap
against a reference" loop — e.g. the same shape could hill-climb BPMN layout fidelity if a comparable
reference metric were defined.

### Loop 5 — Docs/grammar lockstep guard  ·  pattern: Retry  ·  start at Level 1

`CLAUDE.md`: "The DSL spec is normative and dual-sourced" — `dsl.py` (reference impl) and `docs/DSL.md`
(EBNF) must change in lockstep; likewise `docs/BPMN.md` for the importer.

- **Trigger:** a diff touches `packages/python/src/kymo/dsl.py` (grammar) or `from_bpmn.py` (mapping).
- **Goal contract:** the corresponding spec doc (`docs/DSL.md` / `docs/BPMN.md`) is updated in the same
  change, and cross-doc citations use `document_id` not paths (the `CLAUDE.md` convention).
- **Actions:** detect grammar-affecting diffs; check whether the spec doc moved; if not, draft the EBNF/mapping update.
- **Verification:** human review (docs correctness isn't machine-checkable here) — so findings-only.
- **Why Level 1:** advisory; it flags drift, it does not author normative spec unattended.

## 4. Implementation substrate — what exists vs. what's missing

**Already present (reuse these):**
- **Loop-engineering skills (this folder's companion):** committed under `.claude/skills/` —
  `/loop-design` (the entry point: fill trigger/goal/actions/verify/memory, pick a maturity level),
  `/kymo-verify` (the goal-contract runner = pytest + JS parity), `/kymo-golden` (the Loop 1
  reconciler), `/kymo-parity` (the Loop 2 watcher). These encode the menu and rules below so a loop
  doesn't re-derive them each run.
- **Skills as loop steps:** `/kymo-bump` (full release orchestration), `/github` (PR flow) — invokable as
  actions inside a loop. (`RES-SKILLS-001`.)
- **MCP connectors:** the hosted `mcp.kymo.studio` server (18 tools — diagram CRUD, live UI sync,
  `wait_for_user_message` long-poll) and the local editor stdio server (`render_flowchart`, `set_diagram`,
  `get_diagram`). These are the "Connectors" building block (`RES-LOOP-001` §7); see `RES-MCP-001`.
- **Worktree isolation:** proven in `mermaid-hillclimb.js` (`isolation:'worktree'`) — the safe substrate
  for any loop that mutates files while exploring.
- **Sub-agents:** `Explore` / `Plan` agent types for maker-vs-verifier separation.
- **A nightly trigger already exists** (`bpmn-regression.yml`) — Loop 3 rides on it rather than adding cron.

**Missing (the gaps to close before scaling autonomy):**
- **No `.claude/settings.json` hooks (yet).** The skills above supply the *actions* and *verification*;
  what is still absent is automated *triggers* — there is no before/after/on-event hook configured, so
  Loops 1–2 still start manually or via the one GitHub cron. A `/loop … --schedule` invocation or a
  settings hook is the cheapest way to add the "Trigger" component.
- **No shared reward/guard library.** `mermaid-hillclimb.js` hand-rolls its regression gate (`EPS`,
  `MAX_DRY`). If a second numeric-gap loop appears, factor the keep/regress/converge logic out so loops
  don't each reinvent it.
- **No persisted cross-run memory store** beyond the goldens/baselines themselves. For multi-run loops
  (drift triage history, parity backlog), a markdown ledger or a label on GitHub issues is the
  `RES-LOOP-001` §4 "Memory" piece — pick one explicitly rather than relying on context that resets.

## 5. Recommended rollout (the maturity ladder, applied)

Per `RES-LOOP-001` §8, earn autonomy incrementally — do **not** start any of these at auto-merge:

1. **Start with Loop 1 (golden reconciler) at Level 2** — highest day-to-day friction, strongest machine
   verification, and the change set is always human-reviewed as a PR. Biggest payoff, lowest risk.
2. **Add Loop 2 + Loop 3 at Level 1 (findings only)** — let them surface parity gaps and BPMN drift as
   issues/draft-PRs for a quarter; measure how often their classification is right before granting more.
3. **Keep Loop 4 as-is** (it already self-limits to diffs-for-review).
4. **Promote a loop to Level 3** (verifier sub-agent gates before human) only once its Level-1/2 track
   record is clean — and reserve Level 4 (auto-merge) for the narrowest, most mechanical category, if ever.

**Guard against the three debts** (`RES-LOOP-001` §9) explicitly here: the byte-exact goldens make
*verification debt* visible (a wrong change can't pass silently) — but only if loops **classify failures
before regenerating baselines**, never regenerate to turn a test green. *Comprehension debt* is the real
risk: a loop that refreshes baselines faster than a human understands why the pixels moved. Treat every
baseline-touching PR as a place where a human must still answer "why did this change?".

## Sources

- `RES-LOOP-001` — the loop-engineering concept survey (sibling note in this folder).
- In-repo grounding: `.claude/workflows/mermaid-hillclimb.js`; `.github/workflows/test.yml`,
  `bpmn-regression.yml`; `packages/python/tests/` golden + conformance suites; `conformance/README.md`;
  `packages/mcp/` + `packages/editor/mcp-server.js`; project `CLAUDE.md`.

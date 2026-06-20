---
name: kymo-golden
description: Reconcile kymostudio's golden/baseline fixtures after an INTENTIONAL renderer, layout, or grammar change — classify each failing gate as intended vs a real regression, regenerate only the right tier, then prove parity held. Use when golden SVG tests, the BPMN corpus baseline, or the conformance suite fail because you deliberately changed output. Do NOT use to silence an unexplained red test.
argument-hint: "[golden|bpmn|conformance|auto]"
disable-model-invocation: true
allowed-tools: Bash Read Edit
---

This is the **Loop 1 reconciler** from `docs/research/engineering/loop-engineering/application-kymostudio.md`.
It regenerates committed baselines — the one action in this repo that can bless a bug
into a fixture if run carelessly. The discipline below is the whole point.

## Hard rule (read first)

**Classify every failure before regenerating.** A golden test failing means *rendered
bytes changed*. Either you intended that change, or it is a regression. Regenerating turns
red green either way — so regenerating without classifying is how a real bug gets locked in
as the new "correct" output. If you cannot explain *why* the bytes moved, stop and surface it.

## Steps

1. **See the damage.** Run the verify command to get the failing set:
   ```bash
   cd packages/python && uv run --group dev python -m pytest -q
   ```

2. **Classify.** For each failing fixture, decide:
   - *Intended* — the diff matches the change you just made (e.g. you adjusted edge
     staggering and the staggered edges moved). Eligible for regeneration.
   - *Collateral* — a fixture you did **not** mean to touch changed. `CLAUDE.md` requires
     unaffected diagrams stay byte-identical. This is a bug in your change (you forgot to
     gate new CSS/defs conditionally, etc.) — **fix the source, do not regenerate.**

3. **Regenerate only the intended tier** (`$1`, default `auto` = pick from what failed):

   | `$1` | Command |
   |---|---|
   | `golden` | `KYMO_UPDATE_GOLDEN=1 uv run --group dev python -m pytest tests/test_diagrams.py tests/test_layout.py tests/test_edges.py` |
   | `bpmn` | `KYMO_UPDATE_BPMN_BASELINE=1 uv run --group dev python -m pytest tests/test_bpmn_corpus.py` |
   | `conformance` | `KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest tests/test_conformance.py tests/test_bpmn_conformance.py` |

   All run from `packages/python`. Note: a BPMN-renderer change usually moves **both** the
   `bpmn` baseline **and** `conformance` — refresh them together, and remember the nightly
   full-corpus `baseline_full.json` (`tests/_bpmn_regress.py … --update`) when relevant.

4. **Re-verify the whole contract**, including JS parity:
   ```bash
   cd packages/python && uv run --group dev python -m pytest -q
   cd ../js && npm test
   ```
   Python is the sole golden writer; once it is green, JS must pass against the *same*
   regenerated goldens. If JS now diverges, that is a parity gap → `/kymo-parity`.

5. **Review scope before committing.** `git diff --stat` should show only the source change
   + the goldens you intended. Any surprise file in the diff is the collateral from step 2.

## Output

Report: which tier(s) regenerated and why (one line each, tied to the source change),
the `git diff --stat`, and the final `/kymo-verify` verdict. Flag any fixture you
regenerated that you were not 100% sure was intended — that is the human's call.

---
name: kymo-parity
description: Check or close Python↔JS feature parity in kymostudio via the conformance suite. Use when adding a feature to one impl (Python or JS) that the other needs, when a JS conformance test diverges from Python's golden, or to confirm a new behavior is locked in both languages. Encodes the rule that Python is the reference impl and JS reconciles toward it.
argument-hint: "[feature-or-stem]"
allowed-tools: Bash Read Edit Grep
---

This is the **Loop 2 parity watcher** from `docs/research/engineering/loop-engineering/application-kymostudio.md`.
`CLAUDE.md`'s headline constraint: `packages/python` and `packages/js` are two independent
impls kept at parity. The conformance suite enforces it — but **only for behaviors that have
a corpus case.** A new feature with no case is invisible to the gate until you add one.

## The asymmetry (non-negotiable)

**Python is the reference implementation and the sole golden writer.** JS is read-only against
`conformance/golden/`. So parity is always restored by *reconciling JS toward Python*, never by
editing the golden or loosening the JS test. The documented root cause of every past divergence
was JS rounding — fix it with `pyRound` (`packages/js/src/round.ts`, half-to-even) wherever
Python uses `int(round(...))`: hot spots are `alignment.ts`, `bpmn-layout.ts`, `from-bpmn.ts`,
`to-bpmn.ts`.

## Two modes

### A. Diagnose a divergence (a JS conformance test is red)

1. Run `cd packages/js && npm test` and read the `deepEqual` diff — it names the field and the
   two values.
2. Locate where Python computes that field vs where JS does (`Grep` the field name in both
   `packages/python/src/kymo/` and `packages/js/src/`).
3. If the values differ by a rounding boundary (`.5` cases, off-by-one px), it's a `pyRound`
   site in JS. Apply `pyRound`; re-run. If it's a genuinely unported feature, port it to JS.
4. Never touch `conformance/golden/*` to "fix" this — that inverts the reference direction.

### B. Lock a new behavior into both impls

1. Add a minimal corpus case exercising the behavior to `conformance/corpus/<name>.kymo`
   (or a `.bpmn` fixture under the BPMN corpus).
2. Regenerate the golden **from Python** (the writer):
   ```bash
   cd packages/python && KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest tests/test_conformance.py tests/test_bpmn_conformance.py
   ```
3. Run the JS suite against the new golden:
   ```bash
   cd packages/js && npm test
   ```
4. If JS passes → parity is locked. If it diverges → mode A (port/reconcile JS).
5. A genuinely tracked-but-unreconciled `.bpmn` gap goes in `conformance/known_divergences.json`
   with a reason — but treat that as a last resort, not a shortcut.

## Output

State: the field/feature, which impl was behind, the reconciliation (pyRound site or port),
and the final cross-impl `/kymo-verify all` verdict. If you added a corpus case, name it.

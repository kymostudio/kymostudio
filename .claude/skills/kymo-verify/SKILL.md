---
name: kymo-verify
description: Run kymostudio's verifiable stop condition — Python pytest + JS conformance parity — and report a clear PASS/FAIL with the failing output. Use as the goal check for any /loop or /goal on this repo, or to confirm a change is green before committing. Trigger phrases - "is it green", "verify the build", "check parity", "did the change break anything".
argument-hint: "[python|js|all]"
allowed-tools: Bash Read
---

The single "is the goal contract satisfied?" command for this monorepo. A loop's
`/goal` should call this; everything else is an action that runs *until this passes*.

## Scope

`$1` selects what to run (default `all`):

- `python` — the Python reference impl + all golden/baseline/conformance gates.
- `js` — the JS impl, including the read-only parity check against Python's goldens.
- `all` — both (this is the real contract; JS parity is meaningless without Python green).

## Run

From the repo root. Stream output; do not summarize away failures.

**Python** (run when scope is `python` or `all`):
```bash
cd packages/python && uv run --group dev python -m pytest -q
```
This single command gates: golden SVGs (`test_diagrams.py`, `test_layout.py`,
`test_edges.py`, byte-for-byte), the BPMN corpus baseline (`test_bpmn_corpus.py`),
and Python↔JS conformance goldens (`test_conformance.py`, `test_bpmn_conformance.py`).

**JS** (run when scope is `js` or `all`):
```bash
cd packages/js && npm test
```
This builds TS → `dist/` then runs `node --test`, including `conformance.test.js` and
`bpmn-conformance.test.js` which assert JS models equal the **Python-written** goldens.

## Report

Emit a verdict block, nothing fancier:

```
GOAL: <PASS|FAIL>
  python: <pass|fail|skipped>   (<n passed, m failed>)
  js:     <pass|fail|skipped>   (<n passed, m failed>)
```

On FAIL, quote the first failing test name + its assertion diff. **Do not** regenerate
any golden to make a test pass — that is a separate, deliberate action: use `/kymo-golden`,
which first requires classifying the failure as intended vs a real regression.

If the failure is a JS conformance divergence, it is almost always a rounding mismatch —
see `/kymo-parity` (fix JS toward Python with `pyRound`, never loosen the test).

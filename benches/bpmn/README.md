# benches/bpmn — BPMN module quality bench

How good is the BPMN importer/exporter? This bench answers it on two axes and
renders a single scorecard: [`results/REPORT.md`](results/REPORT.md).

- **Correctness** (`quality.py`) — render pass-rate over the MIWG corpus,
  Python↔JS parity, element coverage, error rate.
- **Performance** (`perf.py`) — parse + render timing over the vendored corpus.

## Run

```bash
cd benches/bpmn && uv sync         # one-time
uv run python run.py                # writes results/{quality,perf}.json + REPORT.md
uv run python run.py --reps 11      # more reps → steadier timing
uv run python quality.py            # correctness only (pure stdlib, no kymo)
uv run python perf.py --reps 5      # timing only
```

## What it reads (read-only — never re-baselines)

| Source | Gives |
|--------|-------|
| `packages/python/tests/corpus_bpmn/baseline_full.json` (840) · `baseline.json` (120) | render pass / empty / error counts |
| `conformance/golden/bpmn_import.json` · `bpmn_export.json` | parity stem counts |
| `conformance/known_divergences.json` | tracked Python↔JS divergences |
| `docs/formats/bpmn/kymo-mapping.md` (BPMN-MAP-001) | element-type coverage |
| `packages/python/tests/corpus_bpmn/*.bpmn` (read in place) | the perf corpus |

## Notes

- **Correctness numbers are deterministic** — they roll up committed snapshots,
  so they reflect those snapshots exactly. To move them, regenerate the
  snapshots first (the suites' `KYMO_UPDATE_BPMN_BASELINE=1` /
  `KYMO_UPDATE_CONFORMANCE=1` flags), then re-run this bench.
- **Performance numbers are machine-dependent** — `results/perf.json` is stamped
  with the host environment and is a same-machine reference, not a gate.
- This bench mirrors, and folds into, the BPMN test spec as
  `docs/specs/bpmn/03-TEST.md` → *Annex C — Benchmark*.

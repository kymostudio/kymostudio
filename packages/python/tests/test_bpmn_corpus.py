"""Tier-2 (gate): kymo render-regression over a vendored MIWG subset (~120
real tool exports). Per-build, in-process, no external tools (~0.5s).

Each file's (status, node/edge counts, SVG hash) must match the committed
`corpus_bpmn/baseline.json`. This is the corpus-scale analogue of the
golden-SVG tests; after an INTENTIONAL renderer change, regenerate with:

    KYMO_UPDATE_BPMN_BASELINE=1 uv run --group dev python -m pytest tests/test_bpmn_corpus.py

The full 840-file MIWG sweep runs nightly in CI (see
.github/workflows/bpmn-regression.yml) against `corpus_bpmn/baseline_full.json`.
Vendored files are OMG BPMN MIWG test cases — see corpus_bpmn/NOTICE.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

import _bpmn_regress as R

HERE = Path(__file__).resolve().parent
CORPUS = HERE / "corpus_bpmn"
BASELINE = CORPUS / "baseline.json"
FILES = sorted(CORPUS.glob("*.bpmn"))
BASE = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
UPDATE = os.environ.get("KYMO_UPDATE_BPMN_BASELINE") == "1"


def test_corpus_present():
    assert len(FILES) >= 100, "vendored BPMN corpus is missing or too small"


@pytest.mark.skipif(not UPDATE, reason="set KYMO_UPDATE_BPMN_BASELINE=1 to regenerate")
def test_regenerate_baseline():
    snap = R.snapshot({p.stem: str(p) for p in FILES})
    BASELINE.write_text(json.dumps(snap, indent=1, sort_keys=True))
    pytest.skip(f"regenerated baseline for {len(snap)} files")


@pytest.mark.skipif(UPDATE, reason="regenerating baseline")
@pytest.mark.parametrize("path", FILES, ids=[p.stem for p in FILES])
def test_no_render_regression(path: Path):
    fid = path.stem
    assert fid in BASE, f"{fid} missing from baseline (regen with KYMO_UPDATE_BPMN_BASELINE=1)"
    now, exp = R.render_one(str(path)), BASE[fid]
    got = tuple(now[k] for k in R.KEY)
    want = tuple(exp[k] for k in R.KEY)
    assert got == want, (f"render regression for {fid}: "
                         f"got {dict(zip(R.KEY, got))} vs baseline {dict(zip(R.KEY, want))}")

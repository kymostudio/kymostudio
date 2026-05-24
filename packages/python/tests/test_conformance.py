"""Python↔JS conformance: assert the resolved model + BPMN export of every
corpus `.kymo` matches the committed golden under ``conformance/golden/``.

Python is the reference implementation and the sole writer of the goldens.
Regenerate after an intentional change:

    KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest tests/test_conformance.py

The JS suite (`packages/js/tests/conformance.test.js`) asserts against the same
goldens, so a green run on both sides locks parity. See ``conformance/README.md``.
"""
from __future__ import annotations

import json
import os

import _conformance as C
import pytest

UPDATE = os.environ.get("KYMO_UPDATE_CONFORMANCE") == "1"

_CORPUS = C.corpus_files()
_IDS = [p.stem for p in _CORPUS]


def _write_golden(path, payload: dict) -> None:
    C.GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


@pytest.mark.parametrize("path", _CORPUS, ids=_IDS)
def test_model_matches_golden(path) -> None:
    actual = C.canonical_model(C.resolve(path))
    golden = C.GOLDEN_DIR / f"{path.stem}.model.json"
    if UPDATE:
        _write_golden(golden, actual)
        pytest.skip(f"regenerated model golden for {path.stem}")
    assert golden.exists(), (
        f"missing golden {golden.name} — run KYMO_UPDATE_CONFORMANCE=1 to generate"
    )
    assert actual == json.loads(golden.read_text(encoding="utf-8")), (
        f"canonical model for {path.stem!r} differs from {golden.name}.\n"
        f"Re-run with KYMO_UPDATE_CONFORMANCE=1 if the change is intentional."
    )


@pytest.mark.parametrize("path", _CORPUS, ids=_IDS)
def test_bpmn_export_matches_golden(path) -> None:
    diagram = C.resolve(path)
    golden = C.GOLDEN_DIR / f"{path.stem}.bpmn.json"
    if not C.is_bpmn(diagram):
        if UPDATE and golden.exists():
            golden.unlink()  # keep the golden dir clean if a case stops being BPMN
        pytest.skip(f"{path.stem} is not a BPMN diagram")
    actual = C.bpmn_digest(diagram)
    if UPDATE:
        _write_golden(golden, actual)
        pytest.skip(f"regenerated bpmn golden for {path.stem}")
    assert golden.exists(), (
        f"missing golden {golden.name} — run KYMO_UPDATE_CONFORMANCE=1 to generate"
    )
    assert actual == json.loads(golden.read_text(encoding="utf-8")), (
        f"BPMN export digest for {path.stem!r} differs from {golden.name}.\n"
        f"Re-run with KYMO_UPDATE_CONFORMANCE=1 if the change is intentional."
    )

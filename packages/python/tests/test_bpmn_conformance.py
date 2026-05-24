"""Python↔JS BPMN *format* conformance — bidirectional.

Locks two directions of the BPMN interchange format across the two
implementations, over the repo `.bpmn` samples, the minimal fixtures, and the
full vendored MIWG corpus (`tests/corpus_bpmn/`):

  • IMPORT  (.bpmn → model): same file imports to the same canonical model.
  • EXPORT  (model → .bpmn): each language's export, re-imported, yields the
            same digest; and Python's committed export XML re-imports to that
            same digest (so the JS suite reading it is a true cross-language
            interop check).

Python is the reference impl and the sole golden writer. Regenerate with:

    KYMO_UPDATE_CONFORMANCE=1 uv run --group dev python -m pytest tests/test_bpmn_conformance.py

Goldens are consolidated snapshots (like `baseline.json`) because the corpus is
large: `conformance/golden/bpmn_import.json`, `…/bpmn_export.json`, plus the
committed interop XML under `…/export_bpmn/`. Stems still diverging between the
two importers are tracked in `conformance/known_divergences.json` (skipped by
the JS suite, never hidden). See `conformance/README.md`.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache

import _conformance as C
import pytest

UPDATE = os.environ.get("KYMO_UPDATE_CONFORMANCE") == "1"

_BPMN = C.bpmn_corpus_files()
_STEMS = [p.stem for p in _BPMN]
_BY_STEM = {p.stem: p for p in _BPMN}

# Small, reviewable .bpmn-sourced models (incl. pools/lanes + a no-DI file) whose
# Python export XML is committed for the cross-language interop check.
INTEROP_STEMS = ["collaboration", "events", "gateways", "no_di", "order", "order-fulfillment"]

_IMPORT_GOLDEN = C.GOLDEN_DIR / "bpmn_import.json"
_EXPORT_GOLDEN = C.GOLDEN_DIR / "bpmn_export.json"


def _read(path) -> str:
    # A few MIWG files are Latin-1; match the existing corpus tooling and Node's
    # readFileSync(…, "utf8") — decode as UTF-8, replacing invalid bytes.
    return path.read_text(encoding="utf-8", errors="replace")


def _write_json(path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _export_models() -> dict:
    """{stem: Diagram} for corpus files that import to a non-empty model — the
    set worth re-exporting (empty/erroring imports have nothing to export)."""
    out = {}
    for path in _BPMN:
        try:
            diagram = C.parse_bpmn(_read(path))
        except Exception:  # noqa: BLE001 — un-importable: skip from export set
            continue
        if diagram.components:
            out[path.stem] = diagram
    return out


@lru_cache(maxsize=1)
def _import_golden() -> dict:
    return json.loads(_IMPORT_GOLDEN.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _export_golden() -> dict:
    return json.loads(_EXPORT_GOLDEN.read_text(encoding="utf-8"))


# ── Regeneration (Python is the sole writer) ──────────────────────────────────
def test_regenerate_bpmn_goldens() -> None:
    if not UPDATE:
        pytest.skip("set KYMO_UPDATE_CONFORMANCE=1 to regenerate BPMN goldens")
    _write_json(_IMPORT_GOLDEN, {p.stem: C.import_model(_read(p)) for p in _BPMN})
    _write_json(_EXPORT_GOLDEN, {s: C.bpmn_digest(d) for s, d in _export_models().items()})
    C.EXPORT_BPMN_DIR.mkdir(parents=True, exist_ok=True)
    for stem in INTEROP_STEMS:
        xml = C.export_xml(C.parse_bpmn(_read(_BY_STEM[stem])))
        (C.EXPORT_BPMN_DIR / f"{stem}.bpmn").write_text(xml, encoding="utf-8")


# ── Import direction (.bpmn → model) ──────────────────────────────────────────
@pytest.mark.parametrize("stem", _STEMS)
def test_bpmn_import(stem: str) -> None:
    if UPDATE:
        pytest.skip("regenerated")
    golden = _import_golden()
    assert stem in golden, f"{stem} missing from bpmn_import.json — regenerate"
    assert C.import_model(_read(_BY_STEM[stem])) == golden[stem]


# ── Export direction (model → .bpmn → re-import digest) ───────────────────────
@pytest.mark.parametrize("stem", sorted(_export_models()))
def test_bpmn_export(stem: str) -> None:
    if UPDATE:
        pytest.skip("regenerated")
    golden = _export_golden()
    assert stem in golden, f"{stem} missing from bpmn_export.json — regenerate"
    assert C.bpmn_digest(C.parse_bpmn(_read(_BY_STEM[stem]))) == golden[stem]


# ── Export interop (committed Python XML re-imports to the same digest) ───────
@pytest.mark.parametrize("stem", INTEROP_STEMS)
def test_bpmn_export_interop(stem: str) -> None:
    if UPDATE:
        pytest.skip("regenerated")
    xml_path = C.EXPORT_BPMN_DIR / f"{stem}.bpmn"
    assert xml_path.exists(), f"missing export_bpmn/{stem}.bpmn — regenerate"
    fresh = C.bpmn_digest(C.parse_bpmn(_read(_BY_STEM[stem])))
    assert C.digest_of_xml(_read(xml_path)) == fresh


# ── Allowlist hygiene ─────────────────────────────────────────────────────────
def test_known_divergences_are_not_stale() -> None:
    stale = sorted(set(C.load_known_divergences()) - set(_STEMS))
    assert not stale, f"known_divergences.json lists non-corpus stems: {stale}"

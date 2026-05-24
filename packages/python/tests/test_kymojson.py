"""`.kymo.json` round-trip + envelope tests (to_kymojson / from_kymojson).

`.kymo.json` is the bidirectional serialized resolved-model IR (KYMOJSON-MAP-001).
These cover the load-fixpoint, render-equivalence, the versioned envelope, and that
`layout_trees` survive the round-trip (the Figma back-end needs them). Cross-language
Python↔JS parity of `.kymo.json` is covered by the conformance suite.
"""
from __future__ import annotations

import json

import _conformance as C
import pytest

from kymo.from_kymojson import parse as load
from kymo.to_kymojson import FORMAT, VERSION, export
from kymo.to_svg import render

_KYMO = C.corpus_files()
_KYMO_IDS = [p.stem for p in _KYMO]


def _resolved(path):
    if path.suffix == ".kymo":
        return C.resolve(path)
    return C.parse_bpmn(path.read_text(encoding="utf-8", errors="replace"))


@pytest.mark.parametrize("path", _KYMO, ids=_KYMO_IDS)
def test_roundtrip_fixpoint_and_render(path) -> None:
    d1 = _resolved(path)
    j1 = export(d1)
    d2 = load(j1)
    assert export(d2) == j1, "export∘parse∘export must be a byte-stable fixpoint"
    assert render(d2) == render(d1), "loaded .kymo.json must render byte-identically"


def test_envelope_shape() -> None:
    payload = json.loads(export(_resolved(_KYMO[0])))
    assert payload["format"] == FORMAT == "kymo.json"
    assert payload["version"] == VERSION == 1
    assert set(payload["diagram"]) == {
        "width", "height", "title", "subtitle",
        "components", "regions", "edges", "layout_trees",
    }


def test_layout_trees_preserved() -> None:
    """A `layout { }` diagram carries `layout_trees`; the round-trip must keep them
    (in native form) so the Figma back-end stays on its hybrid path."""
    cand = [p for p in _KYMO if _resolved(p).layout_trees]
    if not cand:
        pytest.skip("no corpus file exercises layout { } trees")
    d1 = _resolved(cand[0])
    d2 = load(export(d1))
    assert d2.layout_trees == d1.layout_trees


def test_rejects_foreign_json() -> None:
    with pytest.raises(ValueError):
        load('{"format": "not-kymo", "version": 1, "diagram": {}}')

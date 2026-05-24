"""Shared helpers for the Python↔JS conformance suite (`test_conformance.py`).

Python is the reference implementation and the sole writer of the goldens
under ``conformance/golden/``. This module turns a resolved ``Diagram`` into
the canonical, language-neutral JSON form (and a BPMN export digest) that both
implementations compare against. See ``conformance/README.md`` for the contract.

The JS mirror is ``packages/js/tests/_conformance.mjs`` — keep the two in sync.
"""
from __future__ import annotations

import json
from pathlib import Path

from kymo.alignment import resolve_alignments
from kymo.bpmn_layout import layout as layout_bpmn
from kymo.dsl import parse as parse_dsl
from kymo.from_bpmn import parse as parse_bpmn
from kymo.layout import layout as apply_grid_layout
from kymo.model import Diagram
from kymo.to_bpmn import export as export_bpmn

# The canonical model serializer is the `.kymo.json` body (single source of truth);
# `model_dict` includes `layout_trees`, so the cross-language model comparison now
# covers them too. See `kymo.to_kymojson` / `docs/formats/kymo.json.md`.
from kymo.to_kymojson import model_dict as canonical_model

# conformance/ lives at the repo root, three levels above packages/python/tests.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_TESTS_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = _REPO_ROOT / "samples"
CORPUS_DIR = _REPO_ROOT / "conformance" / "corpus"
GOLDEN_DIR = _REPO_ROOT / "conformance" / "golden"
# .bpmn import corpus: repo samples + minimal fixtures + the vendored MIWG corpus.
FIXTURES_BPMN_DIR = _TESTS_DIR / "fixtures" / "bpmn"
CORPUS_BPMN_DIR = _TESTS_DIR / "corpus_bpmn"
EXPORT_BPMN_DIR = GOLDEN_DIR / "export_bpmn"  # committed Python-export XML (interop set)
# Stems whose Python↔JS BPMN import still diverges — skipped by the JS suite,
# tracked (with a reason) to burn down. Hand-maintained, not generated.
KNOWN_DIVERGENCES_PATH = _REPO_ROOT / "conformance" / "known_divergences.json"


def load_known_divergences() -> dict:
    """{stem: reason} of tracked, not-yet-reconciled BPMN import divergences."""
    if KNOWN_DIVERGENCES_PATH.is_file():
        return json.loads(KNOWN_DIVERGENCES_PATH.read_text(encoding="utf-8"))
    return {}


# ── Corpus discovery ────────────────────────────────────────────────────────
def corpus_files() -> list[Path]:
    """All `.kymo` corpus files: repo `samples/` + curated `conformance/corpus/`,
    de-duplicated by filename stem, sorted by stem."""
    by_stem: dict[str, Path] = {}
    for directory in (SAMPLES_DIR, CORPUS_DIR):
        if directory.is_dir():
            for path in sorted(directory.glob("*.kymo")):
                by_stem[path.stem] = path
    return [by_stem[stem] for stem in sorted(by_stem)]


def bpmn_corpus_files() -> list[Path]:
    """All `.bpmn` import-corpus files: repo `samples/`, the minimal
    `tests/fixtures/bpmn/`, and the vendored MIWG `tests/corpus_bpmn/`,
    de-duplicated by filename stem, sorted by stem."""
    by_stem: dict[str, Path] = {}
    for directory in (SAMPLES_DIR, FIXTURES_BPMN_DIR, CORPUS_BPMN_DIR):
        if directory.is_dir():
            for path in sorted(directory.glob("*.bpmn")):
                by_stem[path.stem] = path
    return [by_stem[stem] for stem in sorted(by_stem)]


def resolve(path: Path) -> Diagram:
    """Run the full front-end pipeline, mirroring ``cli.main`` /
    JS ``parseDiagram`` exactly: parse → [bpmn layout] → [grid layout] →
    [alignment resolution]."""
    diagram, layout_spec, external = parse_dsl(path.read_text(encoding="utf-8"))
    had_bpmn = bool(getattr(diagram, "bpmn_blocks", None))
    if had_bpmn:
        layout_bpmn(diagram)
    if layout_spec:
        apply_grid_layout(diagram, layout_spec, external)
    if not had_bpmn:
        resolve_alignments(diagram)
    return diagram


# ── Canonical model ──────────────────────────────────────────────────────────
def _norm(value):
    """JSON-neutral normalisation: tuples→lists, integral floats→ints
    (``5.0``→``5``), ``-0``→``0``; genuine fractions are kept so a real
    divergence surfaces instead of being rounded away."""
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else value
    if isinstance(value, (list, tuple)):
        return [_norm(v) for v in value]
    return value  # str | None


# `canonical_model` is imported from `kymo.to_kymojson` (the `.kymo.json` body) — the
# single source of truth, with its own field-completeness guardrail. `_norm` is kept
# here only for the BPMN digest below.


# ── BPMN import (.bpmn → model) ───────────────────────────────────────────────
def is_bpmn(diagram: Diagram) -> bool:
    return any(c.shape.startswith("bpmn-") for c in diagram.components)


def import_model(xml_text: str) -> dict:
    """Canonical model of a `.bpmn` import (already fully resolved, no layout
    pass). An importer that raises is recorded as ``{"status": "error"}`` — no
    type/message (those are language-specific), so both-error counts as a match
    while error-vs-success is a tracked divergence."""
    try:
        return canonical_model(parse_bpmn(xml_text))
    except Exception:  # noqa: BLE001 — any importer failure → uniform marker
        return {"status": "error"}


# ── BPMN export digest (model → .bpmn → re-import) ─────────────────────────────
def _edge_key(edge: dict) -> str:
    points = json.dumps(edge["points"], separators=(",", ":"))
    return "\x00".join([edge["src"], edge["dst"], edge["bpmn_flow"] or "", points])


def _digest(diagram: Diagram) -> dict:
    """Sorted, BPMN-relevant subset of a (re-imported) diagram. Sorted by id so
    re-import order — not guaranteed stable cross-language — never matters."""
    comps = sorted(
        ({"id": c.id, "shape": c.shape, "icon": c.icon,
          "size": _norm(c.size), "pos": _norm(c.pos)} for c in diagram.components),
        key=lambda c: c["id"],
    )
    regs = sorted(
        ({"id": r.id, "style": r.style, "label": r.label, "bounds": _norm(r.bounds)}
         for r in diagram.regions),
        key=lambda r: r["id"],
    )
    edges = sorted(
        ({"src": e.src, "dst": e.dst, "bpmn_flow": e.bpmn_flow, "points": _norm(e.points)}
         for e in diagram.edges),
        key=_edge_key,
    )
    return {
        "width": _norm(diagram.width),
        "height": _norm(diagram.height),
        "components": comps,
        "regions": regs,
        "edges": edges,
    }


def digest_of_xml(xml_text: str) -> dict:
    """Digest of a BPMN XML string, via the real importer. Used to compare a
    language's own export AND the committed Python export (cross-import interop)."""
    return _digest(parse_bpmn(xml_text))


def export_xml(diagram: Diagram) -> str:
    """Raw BPMN 2.0 XML from the real exporter (committed for the interop set)."""
    return export_bpmn(diagram)


def bpmn_digest(diagram: Diagram) -> dict:
    """Round-trip the diagram through the real exporter + importer, then digest.
    Exercises `to_bpmn.export`; robust to XML-formatting noise."""
    return digest_of_xml(export_xml(diagram))

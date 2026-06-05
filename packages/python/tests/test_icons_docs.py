"""kymo Icons v2 — P5 doc-lint (CR-ICONS-006). Citation integrity: every
ICONS-family `document_id` referenced anywhere under docs/specs/icons/** (and
docs/formats/icons.md) resolves to a defined document. RES-ICONS-001 is the
external prior-art research base (lives under docs/research), allow-listed.
"""
from __future__ import annotations

import re

import pytest

from kymo import icons

_DOCS = icons._REPO_ROOT / "docs"
_ID_TOKEN = re.compile(r"\b(?:FEAT|DESIGN|TEST|PLAN|CR|RES)-ICONS-(?:CR)?\d{3}\b|\bICONS-MAP-001\b")
_DEFINES = re.compile(r"^document_id:\s*(\S+)\s*$", re.MULTILINE)
_EXTERNAL = {"RES-ICONS-001"}     # prior-art research, lives outside docs/specs/icons


def _icon_doc_files() -> list:
    files = list((_DOCS / "specs" / "icons").rglob("*.md"))
    fmt = _DOCS / "formats" / "icons.md"
    if fmt.is_file():
        files.append(fmt)
    return files


def test_no_dangling_icon_citations() -> None:
    files = _icon_doc_files()
    if not files:
        pytest.skip("icon spec docs absent")
    defined: set[str] = set()
    referenced: set[str] = set()
    for f in files:
        text = f.read_text(encoding="utf-8")
        defined.update(_DEFINES.findall(text))
        referenced.update(_ID_TOKEN.findall(text))
    dangling = referenced - defined - _EXTERNAL
    assert not dangling, f"dangling document_id citations: {sorted(dangling)}"


def test_all_six_crs_plus_baseline_defined() -> None:
    files = _icon_doc_files()
    if not files:
        pytest.skip("icon spec docs absent")
    defined: set[str] = set()
    for f in files:
        defined.update(_DEFINES.findall(f.read_text(encoding="utf-8")))
    expected = {
        "FEAT-ICONS-001", "DESIGN-ICONS-001", "TEST-ICONS-001", "PLAN-ICONS-001",
        "ICONS-MAP-001",
        "CR-ICONS-001", "CR-ICONS-002", "CR-ICONS-003",
        "CR-ICONS-004", "CR-ICONS-005", "CR-ICONS-006",
    }
    assert expected <= defined, f"missing: {sorted(expected - defined)}"

"""kymo Icons v2 — P1 unit tests (CR-ICONS-002 / TEST-ICONS-CR002).

Covers TC-1 (no unreachable icons), TC-3 (alias resolution + cycle guard),
TC-10 (legacy `<provider>-<name>` keys still resolve, byte-identically).
"""
from __future__ import annotations

import pytest

from kymo import icons


def _source_files() -> list:
    if not icons._ICONS_DIR.exists():
        return []
    return [
        p for p in icons._ICONS_DIR.rglob("*")
        if p.is_file() and p.suffix.lower() in (".png", ".svg")
    ]


# ── TC-1 — No unreachable icons (FR-1) ────────────────────────────────────
def test_every_source_icon_is_addressable() -> None:
    sources = _source_files()
    if not sources:
        pytest.skip("icons/ dir absent (pip-installed tree)")
    # One unique prefix:name address per source file → nothing shadowed.
    assert len(icons.icon_addresses()) == len(sources)
    assert len(set(icons._NS_ICONS.values())) == len(sources)


def test_addresses_are_well_formed() -> None:
    if not icons.icon_addresses():
        pytest.skip("icons/ dir absent")
    for addr in icons.icon_addresses():
        assert icons.is_address(addr), f"malformed address: {addr!r}"


def test_namespacing_recovers_legacy_collisions() -> None:
    """The flat key has fewer entries than sources (collisions); the
    namespaced map has exactly one per source (TC-1 / RES-ICONS-001 §6)."""
    sources = _source_files()
    if not sources:
        pytest.skip("icons/ dir absent")
    assert len(icons._NS_ICONS) >= len(icons._FILE_ICONS)
    assert len(icons._NS_ICONS) == len(sources)


# ── TC-3 — Alias resolution (FR-4) ────────────────────────────────────────
def test_alias_synonym_resolves_to_parent() -> None:
    icons.register_alias("test:syn", "user")
    try:
        assert icons.get_icon("test:syn") == icons.get_icon("user")
    finally:
        icons._ALIASES.pop("test:syn", None)
        icons._RENDER_CACHE.pop("test:syn", None)


def test_alias_transform_wraps_parent() -> None:
    icons.register_alias("test:flip", "user", hflip=True)
    try:
        out = icons.get_icon("test:flip")
        assert "scale(-1,1)" in out
        assert icons.get_icon("user") in out
    finally:
        icons._ALIASES.pop("test:flip", None)
        icons._RENDER_CACHE.pop("test:flip", None)


def test_alias_cycle_is_rejected_not_looped() -> None:
    icons._ALIASES["test:a"] = {"parent": "test:b"}
    icons._ALIASES["test:b"] = {"parent": "test:a"}
    try:
        with pytest.raises(ValueError, match="alias cycle"):
            icons.get_icon("test:a")
    finally:
        icons._ALIASES.pop("test:a", None)
        icons._ALIASES.pop("test:b", None)


# ── TC-10 — Legacy keys still resolve, byte-identically (FR-11) ───────────
def test_builtin_keys_unchanged() -> None:
    # Hand-coded builtins resolve from ICONS, never touched by re-addressing.
    for key in ("user", "aws-lambda", "folder", "hex-agent"):
        assert icons.get_icon(key) == icons.ICONS[key]


def test_legacy_file_key_matches_direct_file_render() -> None:
    """A legacy `<provider>-<name>` key resolves to the exact same bytes the
    pre-v2 loader produced (last-write-wins file → same fragment)."""
    legacy_only = {k: v for k, v in icons._FILE_ICONS.items() if k not in icons.ICONS}
    if not legacy_only:
        pytest.skip("no file-backed icons (icons/ dir absent)")
    key, path = next(iter(sorted(legacy_only.items())))
    expected = (
        icons._png_as_image_tag(path) if path.suffix.lower() == ".png"
        else icons._svg_as_inline(path)
    )
    assert icons.get_icon(key) == expected


def test_legacy_map_points_at_a_real_address() -> None:
    if not icons._LEGACY_MAP:
        pytest.skip("icons/ dir absent")
    for legacy, addr in icons._LEGACY_MAP.items():
        assert addr in icons._NS_ICONS


# ── TC-7 — One source of truth (FR-8, NFR-1) ──────────────────────────────
def test_python_consumes_the_generated_manifest() -> None:
    """Python no longer scans icons/ — it reads the single generated artifact,
    so its registries equal the manifest exactly (parity by construction)."""
    import json

    if not icons._MANIFEST_PATH.is_file():
        pytest.skip("generated manifest absent")
    data = json.loads(icons._MANIFEST_PATH.read_text(encoding="utf-8"))
    assert set(icons.icon_addresses()) == set(data["icons"])
    assert icons._LEGACY_MAP == data["legacy"]


def test_no_second_scanner() -> None:
    """The hand-maintained Python scanner is retired (FR-8)."""
    assert not hasattr(icons, "_scan_icons_dir")
    assert hasattr(icons, "_load_catalogue")


# ── TC-2 — IconifyJSON shape + sparse records (FR-2, FR-3) ────────────────
def test_per_set_iconifyjson_shape() -> None:
    cols = icons.collections()
    if not cols:
        pytest.skip("per-set artifacts absent")
    prefix = sorted(cols)[0]
    s = icons.load_set(prefix)
    assert s["prefix"] == prefix
    assert s["width"] == 64 and s["height"] == 64          # root defaults
    assert isinstance(s["icons"], dict) and s["icons"]
    assert "aliases" in s and "info" in s
    # Sparse: records inherit root dims (no per-icon width/height yet, pre-P4).
    rec = next(iter(s["icons"].values()))
    assert "width" not in rec and "height" not in rec


# ── TC-4 — Searchable metadata (FR-5) ─────────────────────────────────────
def test_set_carries_searchable_metadata() -> None:
    cols = icons.collections()
    if not cols:
        pytest.skip("per-set artifacts absent")
    prefix = "aws" if "aws" in cols else sorted(cols)[0]
    s = icons.load_set(prefix)
    assert s["info"]["total"] == len(s["icons"])
    assert s["info"]["total"] == cols[prefix]["total"]      # index agrees with set
    # categories are queryable (info.categories + per-icon category)
    assert isinstance(s["info"]["categories"], dict)
    assert isinstance(cols[prefix]["categories"], list)


def test_load_set_is_cached() -> None:
    cols = icons.collections()
    if not cols:
        pytest.skip("per-set artifacts absent")
    prefix = sorted(cols)[0]
    assert icons.load_set(prefix) is icons.load_set(prefix)   # same cached object

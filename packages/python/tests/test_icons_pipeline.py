"""kymo Icons v2 — P4 pipeline + vector rendering (CR-ICONS-005 / TC-2,5,6,11)."""
from __future__ import annotations

from kymo import icons
from kymo.icons_pipeline import make_ids_safe, parse_colors, to_record

_SAMPLE = (
    '<?xml version="1.0"?><!-- editor cruft -->'
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
    '<title>home</title><style>.x{}</style>'
    '<path fill="#ff0000" d="M3 12l9-9 9 9"/>'
    '<rect id="bg" fill="#fff" width="4" height="4"/>'
    '<use href="#bg"/></svg>'
)


# ── TC-2 — sparse record (FR-3) ───────────────────────────────────────────
def test_to_record_is_body_only_with_dims() -> None:
    rec = to_record(_SAMPLE)
    assert rec["width"] == 24 and rec["height"] == 24
    assert "<svg" not in rec["body"] and "</svg>" not in rec["body"]
    assert "<path" in rec["body"]
    # cleanup dropped the editor/style/title cruft
    assert "<style" not in rec["body"] and "<title" not in rec["body"]
    assert "<?xml" not in rec["body"] and "<!--" not in rec["body"]


# ── TC-5 — render & recolour (FR-6) ───────────────────────────────────────
def test_parse_colors_recolours_to_currentcolor() -> None:
    out = parse_colors('<path fill="#ff0000" stroke="none"/>')
    assert 'fill="currentColor"' in out
    assert 'stroke="none"' in out          # none left untouched


def test_render_record_assembles_viewbox_svg() -> None:
    rec = to_record(_SAMPLE)
    svg = icons.render_record(rec, size=64)
    assert svg.startswith("<svg ")
    assert 'viewBox="0 0 24 24"' in svg
    assert 'width="64" height="64"' in svg
    assert "currentColor" in svg           # themeable


# ── TC-6 — id/defs-safe inlining (FR-7) ───────────────────────────────────
def test_make_ids_safe_namespaces_ids_and_refs() -> None:
    body = '<rect id="bg"/><use href="#bg"/><path fill="url(#bg)"/>'
    out = make_ids_safe(body, "u1")
    assert 'id="bg-u1"' in out
    assert 'href="#bg-u1"' in out
    assert "url(#bg-u1)" in out
    assert 'id="bg"' not in out


def test_repeated_record_inlines_get_distinct_ids() -> None:
    icons.register_record("test:rec", to_record(_SAMPLE))
    try:
        a = icons.get_icon("test:rec")
        b = icons.get_icon("test:rec")
        import re
        ids_a = set(re.findall(r'id="([^"]+)"', a))
        ids_b = set(re.findall(r'id="([^"]+)"', b))
        assert ids_a and ids_b and ids_a.isdisjoint(ids_b)   # no collision across uses
    finally:
        icons._RECORD_ICONS.pop("test:rec", None)


# ── TC-11 — byte-stable goldens (NFR-2) ───────────────────────────────────
def test_png_path_untouched_by_p4() -> None:
    """No golden uses file/vector icons; the PNG `<image>` path is unchanged,
    so golden SVG output cannot churn from P4."""
    legacy_only = {k: v for k, v in icons._FILE_ICONS.items() if k not in icons.ICONS}
    if not legacy_only:
        import pytest
        pytest.skip("icons/ dir absent")
    key, path = next(iter(sorted(legacy_only.items())))
    if path.suffix.lower() == ".png":
        assert icons.get_icon(key) == icons._png_as_image_tag(path)

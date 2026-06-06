"""Vendored inline IconifyJSON sets — the `ai` brand-logo set (CR-ICONS-007).

The `ai` set is hand-authored `sets/ai.json` with inline SVG `body` art (no
`icons/ai/` source files), exactly how `@iconify-json/<prefix>` ships. It is
resolved on demand and rendered crisp + recolour-safe, mirroring the JS loader.
"""
from __future__ import annotations

import re

import pytest

from kymo import icons

_AI = ("ai:openai", "ai:anthropic", "ai:gemini")


def _have_ai() -> bool:
    return "ai" in icons.collections()


def test_ai_set_is_indexed_and_inline() -> None:
    if not _have_ai():
        pytest.skip("ai set absent (run npm run build-manifest)")
    cols = icons.collections()
    assert cols["ai"]["total"] == 3
    assert cols["ai"]["categories"] == ["provider"]
    s = icons.load_set("ai")
    assert s["prefix"] == "ai"
    assert sorted(s["icons"]) == ["anthropic", "gemini", "openai"]
    # Inline: each record ships a `body`, not a file `path`.
    for rec in s["icons"].values():
        assert "body" in rec and "path" not in rec
    assert s["info"]["license"]["spdx"] == "CC0-1.0"


def test_ai_icons_render_as_inline_svg() -> None:
    if not _have_ai():
        pytest.skip("ai set absent")
    for addr in _AI:
        out = icons.get_icon(addr)
        assert out.startswith("<svg ") and out.rstrip().endswith("</svg>")
        assert "viewBox=" in out and "<path" in out


def test_ai_brand_colours_are_preserved() -> None:
    """Unlike monochrome sets, brand logos keep their own fills/gradients
    (the `currentColor` recolour is NOT applied to vendored inline art)."""
    if not _have_ai():
        pytest.skip("ai set absent")
    assert "#181818" in icons.get_icon("ai:anthropic")     # Anthropic wordmark fill
    gemini = icons.get_icon("ai:gemini")
    assert "#076eff" in gemini and "radialGradient" in gemini


def test_ai_records_carry_own_viewbox_dims() -> None:
    if not _have_ai():
        pytest.skip("ai set absent")
    assert 'viewBox="0 0 256 260"' in icons.get_icon("ai:openai")
    assert 'viewBox="0 0 256 176"' in icons.get_icon("ai:anthropic")
    assert 'viewBox="0 0 512 188"' in icons.get_icon("ai:gemini")


def test_repeated_ai_inline_gets_distinct_ids() -> None:
    """Gemini has gradient `id`s; inlined twice in one document they must not
    collide (FR-7) — records render fresh per use, never cached."""
    if not _have_ai():
        pytest.skip("ai set absent")
    a = icons.get_icon("ai:gemini")
    b = icons.get_icon("ai:gemini")
    ids_a = set(re.findall(r'id="([^"]+)"', a))
    ids_b = set(re.findall(r'id="([^"]+)"', b))
    assert ids_a and ids_b and ids_a.isdisjoint(ids_b)


def test_unknown_ai_icon_raises() -> None:
    if not _have_ai():
        pytest.skip("ai set absent")
    with pytest.raises(KeyError):
        icons.get_icon("ai:no-such-model")

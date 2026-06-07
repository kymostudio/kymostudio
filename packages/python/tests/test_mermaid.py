"""Mermaid flowchart → kymo render tests (Phase 2).

The import + layout live in the Rust core (`mermaid_to_kymojson`), exposed via
PyO3. These tests exercise the Python side: rendering the imported model
(icon-less outline nodes + the `diamond` glyph) and the native `flowchart { }`
DSL block. The Rust core's byte-exact `.kymo.json` goldens already pin the
import; here we assert the *render* is sane and crash-free (structural, not
byte-golden, since the two impls render independently).

Skipped when the installed core predates the Mermaid binding (the published
wheel may lag a release behind the in-repo Rust source — see the core rollout
convention). Build the local core to run these:

    uv run maturin develop --manifest-path ../rust/kymostudio-core/Cargo.toml \\
        --features python --release
"""
from __future__ import annotations

from pathlib import Path

import pytest

try:
    import _kymostudio_core as _core
    _HAS_MERMAID = hasattr(_core, "mermaid_to_kymojson")
except ModuleNotFoundError:  # pragma: no cover - no wheel at all
    _HAS_MERMAID = False

pytestmark = pytest.mark.skipif(
    not _HAS_MERMAID,
    reason="installed kymostudio-core lacks mermaid_to_kymojson (pre-release wheel)",
)

SAMPLES = Path(__file__).resolve().parents[3] / "samples"


def _render_mmd(src: str) -> str:
    from kymo._core import import_mermaid
    from kymo.to_svg import render
    return render(import_mermaid(src))


@pytest.mark.parametrize("name", ["approval", "pipeline"])
def test_sample_mmd_renders(name: str) -> None:
    """Each bundled `.mmd` sample imports + renders without raising (the empty
    icon no longer crashes `get_icon`) and emits flowchart-node markup."""
    svg = _render_mmd((SAMPLES / f"{name}.mmd").read_text(encoding="utf-8"))
    assert svg.startswith("<?xml")
    assert "fc-shape" in svg and "fc-label" in svg


def test_decision_shapes_and_labels() -> None:
    """A decision flowchart renders a diamond (polygon), a circle (ellipse),
    boxes (rect), and every node label, with point-less edges routed."""
    from kymo._core import import_mermaid
    src = (
        "flowchart TD\n"
        "A((Start)) --> B[Work]\n"
        "B --> C{ok?}\n"
        "C -->|yes| D([Done])\n"
        "C -->|no| E[(Store)]\n"
    )
    d = import_mermaid(src)
    assert {c.shape for c in d.components} == {"circle", "box", "diamond", "badge", "cylinder"}
    assert all(c.icon == "" and c.size is not None for c in d.components)
    svg = _render_mmd(src)
    for label in ("Start", "Work", "ok?", "Done", "Store"):
        assert label in svg
    assert "<polygon" in svg and "<ellipse" in svg


def test_flowchart_dsl_block() -> None:
    """A native `flowchart { }` block resolves through the core into positioned
    components/edges (mirrors the `bpmn { }` flow)."""
    from kymo._core import resolve_flowchart_blocks
    from kymo.dsl import parse as parse_dsl
    dsl = (
        "flowchart LR {\n"
        "  A[Collect] --> B{Valid?}\n"
        "  B -->|yes| C([Store])\n"
        "  B -->|no| D[(Archive)]\n"
        "}\n"
    )
    diagram, _layout, _ext = parse_dsl(dsl)
    assert len(diagram.flowchart_blocks) == 1
    resolve_flowchart_blocks(diagram)
    assert diagram.flowchart_blocks == []
    assert {c.id for c in diagram.components} == {"A", "B", "C", "D"}
    assert any(c.shape == "diamond" for c in diagram.components)
    assert diagram.width > 0 and diagram.height > 0


_HAS_CONVERT = _HAS_MERMAID and hasattr(_core, "mermaid_to_d2")


@pytest.mark.skipif(not _HAS_CONVERT, reason="core lacks mermaid convert bindings")
def test_convert_to_d2_dot_mermaid() -> None:
    """mmd → {d2, dot, mmd} via the flowchart IR — shapes + edges carry over."""
    from kymo._core import mermaid_to_d2, mermaid_to_dot, normalize_mermaid
    src = "flowchart TD\nA[Start] --> B{ok?}\nB -.->|no| C([Done])\n"

    d2 = mermaid_to_d2(src)
    assert d2.startswith("direction: down")
    assert 'B: "ok?" { shape: diamond }' in d2
    assert "style.stroke-dash" in d2          # dashed edge

    dot = mermaid_to_dot(src)
    assert dot.startswith("digraph G {") and "rankdir=TB;" in dot
    assert "shape=diamond" in dot and "style=dashed" in dot

    mmd = normalize_mermaid(src)
    assert mmd.startswith("flowchart TD")
    assert 'B{"ok?"}' in mmd and "-.->|no|" in mmd


def test_iconless_component_renders_outline() -> None:
    """A bare icon-less component renders a shape outline + interior label
    instead of fetching an icon (which would KeyError on the empty key)."""
    from kymo.model import Component
    from kymo.to_svg import render_component
    c = Component(id="n", name="Hi", subtitle="", icon="", shape="diamond",
                  accent="blue", pos=(50, 50), size=(80, 60))
    out = render_component(c)
    assert "<polygon" in out and "fc-shape" in out and ">Hi<" in out

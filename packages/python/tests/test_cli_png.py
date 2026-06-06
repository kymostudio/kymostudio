"""`kymo … out.png` rasterization path (SVG→PNG and source→PNG).

Skipped when no resvg backend is installed (`resvg-py` or the in-repo
`_kymostudio_core` wheel) — PNG output is binary/engine-dependent and not part
of the golden conformance suites.
"""
import struct
import sys

import pytest


def _has_backend() -> bool:
    for mod in ("_kymostudio_core", "resvg_py"):
        try:
            __import__(mod)
            return True
        except ModuleNotFoundError:
            continue
    return False


pytestmark = pytest.mark.skipif(
    not _has_backend(), reason="no resvg backend (install resvg-py or kymostudio-core)"
)

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
    '<rect width="10" height="10" fill="#0a0"/></svg>'
)


def _run(monkeypatch, *argv: str) -> None:
    from kymo import cli

    monkeypatch.setattr(sys, "argv", ["kymo", *argv])
    cli.main()


def _png_dims(path) -> tuple[int, int]:
    w, h = struct.unpack(">II", path.read_bytes()[16:24])  # IHDR width/height
    return w, h


def test_svg_to_png(tmp_path, monkeypatch) -> None:
    svg = tmp_path / "in.svg"
    svg.write_text(SVG)
    out = tmp_path / "out.png"
    _run(monkeypatch, str(svg), str(out))
    assert out.read_bytes()[:8] == PNG_MAGIC


def test_svg_default_output_name(tmp_path, monkeypatch) -> None:
    """`kymo pic.svg` (no output arg) → pic.png next to the input."""
    svg = tmp_path / "pic.svg"
    svg.write_text(SVG)
    _run(monkeypatch, str(svg))
    assert (tmp_path / "pic.png").read_bytes()[:8] == PNG_MAGIC


def test_kymo_source_to_png(tmp_path, monkeypatch) -> None:
    """A `.kymo` source is rendered then rasterized when the output is `.png`."""
    src = tmp_path / "d.kymo"
    src.write_text("agent hex/hex-agent/green\n")
    out = tmp_path / "d.png"
    _run(monkeypatch, str(src), str(out))
    assert out.read_bytes()[:8] == PNG_MAGIC


def test_integer_scale_doubles_dimensions(tmp_path, monkeypatch) -> None:
    svg = tmp_path / "in.svg"
    svg.write_text(SVG)
    out1 = tmp_path / "x1.png"
    out2 = tmp_path / "x2.png"
    _run(monkeypatch, str(svg), str(out1))
    _run(monkeypatch, str(svg), str(out2), "-s", "2")
    w1, h1 = _png_dims(out1)
    w2, h2 = _png_dims(out2)
    assert (w2, h2) == (w1 * 2, h1 * 2)


def test_non_png_second_positional_rejected(tmp_path, monkeypatch) -> None:
    """A `.svg` source with a non-.png output path is an error (only PNG out)."""
    svg = tmp_path / "in.svg"
    svg.write_text(SVG)
    with pytest.raises(SystemExit) as exc:
        _run(monkeypatch, str(svg), str(tmp_path / "out.jpg"))
    assert exc.value.code == 1

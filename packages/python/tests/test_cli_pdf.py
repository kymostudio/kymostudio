"""`kymo … out.pdf` vector-PDF path (SVG→PDF and source→PDF).

Skipped unless the in-repo `_kymostudio_core` engine exposes `svg_to_pdf`
(kymostudio-core >= 0.4). Unlike PNG there is no `resvg-py` fallback, and PDF
output is binary/engine-dependent — so this asserts the `%PDF-` magic and the
dispatch behaviour, not byte-exact bytes.
"""
import sys

import pytest


def _has_pdf_backend() -> bool:
    try:
        import _kymostudio_core as core
    except ModuleNotFoundError:
        return False
    return hasattr(core, "svg_to_pdf")


pytestmark = pytest.mark.skipif(
    not _has_pdf_backend(),
    reason="kymostudio-core >= 0.4 with svg_to_pdf not installed",
)

PDF_MAGIC = b"%PDF-"
SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
    '<rect width="10" height="10" fill="#0a0"/></svg>'
)


def _run(monkeypatch, *argv: str) -> None:
    from kymo import cli

    monkeypatch.setattr(sys, "argv", ["kymo", *argv])
    cli.main()


def test_svg_to_pdf(tmp_path, monkeypatch) -> None:
    svg = tmp_path / "in.svg"
    svg.write_text(SVG)
    out = tmp_path / "out.pdf"
    _run(monkeypatch, str(svg), str(out))
    assert out.read_bytes()[:5] == PDF_MAGIC


def test_kymo_source_to_pdf(tmp_path, monkeypatch) -> None:
    """A `.kymo` source is rendered then converted when the output is `.pdf`."""
    src = tmp_path / "d.kymo"
    src.write_text("agent hex/hex-agent/green\n")
    out = tmp_path / "d.pdf"
    _run(monkeypatch, str(src), str(out))
    assert out.read_bytes()[:5] == PDF_MAGIC


def test_pdf_output_takes_precedence_over_png_default(tmp_path, monkeypatch) -> None:
    """`kymo x.svg y.pdf` emits PDF even though a bare `.svg` source defaults to PNG."""
    svg = tmp_path / "in.svg"
    svg.write_text(SVG)
    out = tmp_path / "out.pdf"
    _run(monkeypatch, str(svg), str(out))
    assert out.read_bytes()[:5] == PDF_MAGIC
    assert not (tmp_path / "in.png").exists()

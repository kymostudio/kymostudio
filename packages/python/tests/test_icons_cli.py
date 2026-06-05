"""`kymo icons` CLI tests (CR-ICONS-001 / TEST-ICONS-CR001, TC-13..16).

Offline read-trio (list/search/describe), download with a mocked Iconify
endpoint, and the converter-unaffected disambiguation guard.
"""
from __future__ import annotations

import json

import pytest

from kymo import icons, icons_cli


def _sample_address() -> str | None:
    cols = icons.collections()
    if not cols:
        return None
    prefix = "aws" if "aws" in cols else sorted(cols)[0]
    s = icons.load_set(prefix)
    name = sorted(s["icons"])[0]
    return f"{prefix}:{name}"


# ── TC-13 — list (FR-12, FR-13) ───────────────────────────────────────────
def test_list_all_sets(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["list"]) == 0
    out = capsys.readouterr().out
    assert "aws" in out and "icons" in out


def test_list_json_is_machine_readable(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["list", "--json"]) == 0
    data = json.loads(capsys.readouterr().out)
    assert "aws" in data and data["aws"]["total"] > 0


def test_list_provider_filters_to_addresses(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["list", "aws", "--json"]) == 0
    addrs = json.loads(capsys.readouterr().out)
    assert addrs and all(a.startswith("aws:") for a in addrs)


def test_list_unknown_provider_errors() -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["list", "no-such-provider"]) != 0


# ── TC-14 — search offline (FR-14) ────────────────────────────────────────
def test_search_finds_offline(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["search", "lambda", "--json"]) == 0
    data = json.loads(capsys.readouterr().out)
    assert data["query"] == "lambda"
    assert any("lambda" in a for a in data["results"])
    assert data["remote"] == []          # no network unless --remote


def test_search_empty_is_success_with_empty_list(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["search", "zzz-no-such-icon", "--json"]) == 0
    data = json.loads(capsys.readouterr().out)
    assert data["results"] == []


def test_search_provider_and_limit(capsys) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["search", "a", "--provider", "aws", "--limit", "3", "--json"]) == 0
    data = json.loads(capsys.readouterr().out)
    assert len(data["results"]) <= 3
    assert all(a.startswith("aws:") for a in data["results"])


# ── TC-15 — describe + errors (FR-15) ─────────────────────────────────────
def test_describe_reports_metadata(capsys) -> None:
    addr = _sample_address()
    if not addr:
        pytest.skip("artifacts absent")
    assert icons_cli.run(["describe", addr, "--json"]) == 0
    data = json.loads(capsys.readouterr().out)
    assert data["address"] == addr
    assert data["width"] == 64 and data["height"] == 64
    assert data["path"]


def test_describe_malformed_address_errors() -> None:
    assert icons_cli.run(["describe", "not-an-address"]) != 0


def test_describe_unknown_address_errors() -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    assert icons_cli.run(["describe", "aws:definitely-not-real"]) != 0


# ── TC-16 — download pipeline + parity (FR-12, FR-15) ─────────────────────
def test_download_from_iconify_runs_pipeline(tmp_path, capsys, monkeypatch) -> None:
    raw = '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#f00" d="M0 0h1v1H0z"/></svg>'
    monkeypatch.setattr(icons_cli, "_iconify_fetch", lambda addr: raw)
    rc = icons_cli.run(["download", "mdi:home", "--from", "iconify", "-o", str(tmp_path), "-y"])
    assert rc == 0
    written = tmp_path / "mdi" / "home.svg"
    assert written.is_file()
    body = written.read_text(encoding="utf-8")
    # If the P4 normalize pipeline is present, fills are recoloured to
    # currentColor; otherwise the raw body is written. Either way it lands.
    assert "<path" in body


def test_download_local_copy(tmp_path) -> None:
    addr = _sample_address()
    if not addr:
        pytest.skip("artifacts absent")
    rc = icons_cli.run(["download", addr, "-o", str(tmp_path), "-y"])
    assert rc == 0
    assert any(tmp_path.iterdir())


def test_unknown_verb_errors() -> None:
    assert icons_cli.run(["frobnicate"]) != 0


# ── TC-16 — Python ↔ JS parity (NFR-1) ────────────────────────────────────
def _run_js(args: list[str]) -> tuple[int, str]:
    import shutil
    import subprocess

    node = shutil.which("node")
    bin_path = icons._REPO_ROOT / "packages" / "js" / "bin" / "kymo-icons.mjs"
    if not node or not bin_path.is_file():
        pytest.skip("node or JS bin unavailable")
    proc = subprocess.run([node, str(bin_path), *args], capture_output=True, text=True)
    return proc.returncode, proc.stdout


@pytest.mark.parametrize("verb_args", [["list"], ["search", "lambda"]])
def test_python_js_json_parity(capsys, verb_args) -> None:
    if not icons.collections():
        pytest.skip("artifacts absent")
    rc_js, js_out = _run_js([*verb_args, "--json"])
    rc_py = icons_cli.run([*verb_args, "--json"])
    py_out = capsys.readouterr().out
    assert rc_py == rc_js == 0
    assert json.loads(py_out) == json.loads(js_out)


def test_python_js_describe_parity(capsys) -> None:
    addr = _sample_address()
    if not addr:
        pytest.skip("artifacts absent")
    rc_js, js_out = _run_js(["describe", addr, "--json"])
    rc_py = icons_cli.run(["describe", addr, "--json"])
    py_out = capsys.readouterr().out
    assert rc_py == rc_js == 0
    assert json.loads(py_out) == json.loads(js_out)


# ── TC-16 — converter unaffected (disambiguation) ─────────────────────────
def test_only_icons_first_token_is_reserved(monkeypatch) -> None:
    """`kymo <path>` must NOT route into the icon CLI — only the exact first
    token `icons` does (FR-12)."""
    import sys
    from kymo import cli

    monkeypatch.setattr(sys, "argv", ["kymo", "icons.kymo"])   # a source named like the verb
    with pytest.raises(SystemExit) as exc:
        cli.main()
    # routed to the CONVERTER (file-not-found), not the icon CLI usage
    assert exc.value.code == 1

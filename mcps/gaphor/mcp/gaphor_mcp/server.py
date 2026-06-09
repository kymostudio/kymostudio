#!/usr/bin/env python3
"""Gaphor MCP server — generate, inspect, render, validate and export Gaphor
(`.gaphor`) sequence diagrams.

Design follows MCP best practices (see Anthropic, "Writing effective tools for
agents"):
  * a high-level *generate-from-DSL* happy path (`generate_sequence_diagram`);
  * cheap **structured** reads (`get_model_info`) preferred over pixels — the
    diagram's "accessibility tree";
  * an **image-on-demand** tool (`render_diagram`) returning a PNG only when the
    agent needs to *see* the result;
  * **actionable** validation errors (`validate_mermaid`);
  * a separate **export** tool for files.

It has two layers:

* **File mode** — a thin bridge over two command-line tools, so it needs **no
  GTK / PyGObject build** (the usual Gaphor-on-macOS pain):
    * ``kymo`` (kymostudio): Mermaid ``sequenceDiagram`` -> ``.gaphor``, SVG -> PNG.
    * Gaphor's own headless renderer (``gaphor export``): ``.gaphor`` -> SVG/PNG/PDF.
* **Live mode** (``live_*`` tools) — talks to the running Gaphor app via the
  companion ``gaphor-remote`` plugin (``../plugin``), an in-app HTTP server. Lets
  you list/open/render the diagrams *currently shown* in the GUI.

Configuration (env vars, all optional):
  * ``KYMO_BIN``           path to the ``kymo`` binary (else PATH, else the
                           kymostudio debug build).
  * ``GAPHOR_BIN``         path to Gaphor's CLI (default: the macOS app bundle).
  * ``GAPHOR_MCP_WORKDIR`` where generated ``.gaphor`` files are written
                           (default: ``~/.gaphor-mcp``).
  * ``GAPHOR_REMOTE_URL``  base URL of the gaphor-remote plugin
                           (default ``http://127.0.0.1:9899``).
"""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from mcp.server.fastmcp import FastMCP, Image

mcp = FastMCP("gaphor")

# ── Tool discovery (configurable, with sensible local defaults) ──────────────
_DEFAULT_KYMO = (
    Path.home()
    / "projects/workspace_kymostudio/k2/packages/rust/kymostudio/target/debug/kymo"
)
KYMO_BIN = os.environ.get("KYMO_BIN") or shutil.which("kymo") or str(_DEFAULT_KYMO)
GAPHOR_BIN = os.environ.get(
    "GAPHOR_BIN", "/Applications/Gaphor.app/Contents/MacOS/gaphor"
)
WORKDIR = Path(os.environ.get("GAPHOR_MCP_WORKDIR", Path.home() / ".gaphor-mcp"))
WORKDIR.mkdir(parents=True, exist_ok=True)
GAPHOR_REMOTE_URL = os.environ.get("GAPHOR_REMOTE_URL", "http://127.0.0.1:9899").rstrip("/")

_NS = "{http://gaphor.sourceforge.net/model}"


# ── Subprocess + .gaphor parsing helpers ─────────────────────────────────────
def _run(cmd: list[str]) -> tuple[int, str, str]:
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def _kymo_error(stderr: str) -> str:
    """Turn kymo's stderr into a single actionable line."""
    for line in stderr.splitlines():
        line = line.strip()
        if line.startswith("kymo:"):
            return line[len("kymo:") :].strip()
    return stderr.strip() or "conversion failed"


def _safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_")
    return cleaned or "diagram"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child(el: ET.Element, prop: str) -> ET.Element | None:
    for c in el:
        if _local(c.tag) == prop:
            return c
    return None


def _val(el: ET.Element, prop: str) -> str | None:
    c = _child(el, prop)
    if c is None:
        return None
    for v in c:
        if _local(v.tag) == "val":
            return v.text or ""
    return None


def _ref(el: ET.Element, prop: str) -> str | None:
    c = _child(el, prop)
    if c is None:
        return None
    for r in c:
        if _local(r.tag) == "ref":
            return r.get("refid")
    return None


def _parse_gaphor(path: Path) -> dict:
    """Extract the structured model from a .gaphor file: diagrams, lifelines and
    messages (resolved from -> to via their occurrence specifications)."""
    root = ET.parse(path).getroot()
    lifelines: dict[str, str] = {}
    diagrams: list[str] = []
    mos_covered: dict[str, str] = {}
    raw_messages: list[dict] = []

    for el in root:
        kind = _local(el.tag)
        eid = el.get("id")
        if kind == "Lifeline":
            lifelines[eid] = _val(el, "name") or eid
        elif kind == "Diagram":
            diagrams.append(_val(el, "name") or "(unnamed)")
        elif kind == "MessageOccurrenceSpecification":
            mos_covered[eid] = _ref(el, "covered")
        elif kind == "Message":
            raw_messages.append(
                {
                    "name": _val(el, "name") or "",
                    "sort": _val(el, "messageSort") or "synchCall",
                    "send": _ref(el, "sendEvent"),
                    "recv": _ref(el, "receiveEvent"),
                }
            )

    messages = []
    for m in raw_messages:
        frm = lifelines.get(mos_covered.get(m["send"]))
        to = lifelines.get(mos_covered.get(m["recv"]))
        messages.append(
            {"from": frm, "to": to, "sort": m["sort"], "name": m["name"]}
        )

    return {
        "diagrams": diagrams,
        "lifelines": list(lifelines.values()),
        "messages": messages,
        "counts": {"lifelines": len(lifelines), "messages": len(messages)},
    }


def _gaphor_render(gaphor_path: Path, fmt: str, diagram: str | None, outdir: Path) -> list[Path]:
    """Run `gaphor export`; return the written files."""
    cmd = [GAPHOR_BIN, "export", "-u", "-f", fmt, "-o", str(outdir)]
    if diagram:
        cmd += ["-r", re.escape(diagram)]
    cmd.append(str(gaphor_path))
    rc, _out, err = _run(cmd)
    files = sorted(outdir.rglob(f"*.{fmt}"))
    if rc != 0 and not files:
        raise RuntimeError(
            "gaphor export failed: "
            + (
                "\n".join(
                    ln for ln in err.splitlines() if "WARNING" not in ln and ln.strip()
                )[-1:]
                or "unknown error"
            )
        )
    return files


# ── Tools ────────────────────────────────────────────────────────────────────
@mcp.tool()
def generate_sequence_diagram(mermaid: str, name: str = "diagram") -> dict:
    """Generate a Gaphor `.gaphor` sequence diagram from Mermaid `sequenceDiagram`
    source and save it under the work directory.

    Returns the saved file path plus a structured summary (lifelines, messages).
    Open the file in Gaphor (File -> Open) or call `render_diagram` to see it.

    Limitation: Gaphor cannot represent combined fragments — `alt`/`loop`/`opt`/
    `par` are FLATTENED (their messages still appear, the box/guards are dropped).
    On a syntax/unsupported error, returns `{ok: false, error: "<message>"}`.
    """
    safe = _safe_name(name)
    mmd = WORKDIR / f"{safe}.mmd"
    out = WORKDIR / f"{safe}.gaphor"
    mmd.write_text(mermaid, encoding="utf-8")
    rc, _o, err = _run([KYMO_BIN, str(mmd), str(out)])
    if rc != 0:
        return {"ok": False, "error": _kymo_error(err)}
    info = _parse_gaphor(out)
    return {
        "ok": True,
        "path": str(out),
        "note": "combined fragments (alt/loop/opt/par) are flattened in Gaphor",
        **info,
    }


@mcp.tool()
def validate_mermaid(mermaid: str) -> dict:
    """Validate Mermaid `sequenceDiagram` source without leaving a file behind.

    Returns `{valid: true, lifelines, messages, counts}` on success, or
    `{valid: false, error: "<line N: ...>"}` with an actionable message.
    Use this to check source before `generate_sequence_diagram`.
    """
    with tempfile.TemporaryDirectory() as d:
        mmd = Path(d) / "v.mmd"
        out = Path(d) / "v.gaphor"
        mmd.write_text(mermaid, encoding="utf-8")
        rc, _o, err = _run([KYMO_BIN, str(mmd), str(out)])
        if rc != 0:
            return {"valid": False, "error": _kymo_error(err)}
        return {"valid": True, **_parse_gaphor(out)}


@mcp.tool()
def get_model_info(gaphor_path: str) -> dict:
    """Return the STRUCTURED model of a `.gaphor` file — the cheap 'snapshot'.

    Prefer this over `render_diagram` whenever you need to reason about the
    diagram (names, message order, who talks to whom): it is small and text-only.
    Returns diagrams, lifelines, and messages (`from` -> `to`, `sort`, `name`).
    """
    p = Path(gaphor_path).expanduser()
    if not p.exists():
        return {"ok": False, "error": f"file not found: {p}"}
    try:
        return {"ok": True, **_parse_gaphor(p)}
    except ET.ParseError as e:
        return {"ok": False, "error": f"not a valid .gaphor XML file: {e}"}


@mcp.tool()
def render_diagram(gaphor_path: str, diagram: str | None = None) -> Image:
    """Render a `.gaphor` diagram to a PNG image for VISUAL confirmation.

    Uses Gaphor's own headless renderer, so it matches what Gaphor draws. If the
    file has several diagrams, pass `diagram` (its name) to choose one; otherwise
    the first is rendered. For reasoning about structure, prefer `get_model_info`
    (cheaper) — only render when you must see the layout.
    """
    p = Path(gaphor_path).expanduser()
    if not p.exists():
        raise FileNotFoundError(f"file not found: {p}")
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        svgs = _gaphor_render(p, "svg", diagram, d)
        if not svgs:
            raise RuntimeError("no diagram was rendered (empty model?)")
        png = d / "out.png"
        rc, _o, err = _run([KYMO_BIN, str(svgs[0]), str(png)])
        if rc != 0:
            raise RuntimeError(f"SVG->PNG failed: {_kymo_error(err)}")
        return Image(data=png.read_bytes(), format="png")


@mcp.tool()
def export_diagram(gaphor_path: str, fmt: str = "svg", out_dir: str | None = None) -> dict:
    """Export `.gaphor` diagram(s) to files. `fmt` is one of `svg`, `png`, `pdf`.

    Writes into `out_dir` (default: alongside the source) and returns the written
    paths. Use `render_diagram` instead when you just want to look at the result.
    """
    p = Path(gaphor_path).expanduser()
    if not p.exists():
        return {"ok": False, "error": f"file not found: {p}"}
    if fmt not in ("svg", "png", "pdf"):
        return {"ok": False, "error": f"unsupported format {fmt!r} (use svg|png|pdf)"}
    target = Path(out_dir).expanduser() if out_dir else p.parent / f"{p.stem}_export"
    target.mkdir(parents=True, exist_ok=True)
    try:
        files = _gaphor_render(p, fmt, None, target)
    except RuntimeError as e:
        return {"ok": False, "error": str(e)}
    return {"ok": True, "files": [str(f) for f in files]}


# ── Live mode — talk to the running Gaphor app via the gaphor-remote plugin ──
def _remote(method: str, params: dict | None = None) -> dict:
    """POST a command to the in-app gaphor-remote plugin; return its `result`."""
    body = json.dumps({"method": method, "params": params or {}}).encode()
    req = urllib.request.Request(
        GAPHOR_REMOTE_URL, data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read())
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"cannot reach Gaphor at {GAPHOR_REMOTE_URL} ({e.reason}). "
            "Is Gaphor running with the gaphor-remote plugin installed? "
            "See ../plugin/README.md."
        ) from e
    if not payload.get("ok"):
        raise RuntimeError(payload.get("error", "remote call failed"))
    return payload.get("result")


@mcp.tool()
def live_status() -> dict:
    """Check whether the running Gaphor app is reachable (gaphor-remote plugin).

    Returns `{connected: true}` if the in-app HTTP API answers, else
    `{connected: false, error}` — call this before the other `live_*` tools.
    """
    try:
        return {"connected": True, **(_remote("status") or {})}
    except RuntimeError as e:
        return {"connected": False, "error": str(e)}


@mcp.tool()
def live_list_diagrams() -> dict:
    """List the diagrams in the **currently open** Gaphor model (live app).

    Returns each diagram's `id` and `name`. Use an `id` with `live_open_diagram`
    or `live_render_diagram`.
    """
    return {"diagrams": _remote("list_diagrams")}


@mcp.tool()
def live_open_diagram(diagram_id: str) -> dict:
    """Switch the Gaphor GUI to show the diagram with `diagram_id` (live app).

    Opens it as a tab if not already open. Get ids from `live_list_diagrams`.
    """
    return _remote("open_diagram", {"id": diagram_id})


@mcp.tool()
def live_render_diagram(diagram_id: str | None = None) -> Image:
    """Render a diagram from the **running** Gaphor app to a PNG image.

    With no `diagram_id`, renders the diagram currently shown in the GUI;
    otherwise renders the one with that id. Matches exactly what Gaphor draws.
    """
    res = _remote("render_diagram", {"id": diagram_id, "format": "png"})
    return Image(data=base64.b64decode(res["base64"]), format="png")


@mcp.tool()
def live_find_elements(name: str) -> dict:
    """Find model elements by (substring of) name in the running Gaphor model.

    Returns `[{id, type, name}]` — e.g. to locate a Lifeline or Message id.
    """
    return {"elements": _remote("find_elements", {"name": name})}


@mcp.tool()
def live_rename(element_id: str, name: str) -> dict:
    """Rename a model element (lifeline, message, …) in the running Gaphor app.

    A layout-free edit (position is preserved). To build a whole diagram, use
    `generate_sequence_diagram` (file mode) — it lays elements out properly;
    Gaphor has no good programmatic layout for freshly-added sequence items.
    """
    return _remote("rename", {"id": element_id, "name": name})


@mcp.tool()
def live_delete(element_id: str) -> dict:
    """Delete a model element and its diagram presentations in the live app."""
    return _remote("delete", {"id": element_id})


def main() -> int:
    mcp.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

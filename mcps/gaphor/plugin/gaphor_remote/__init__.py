"""Gaphor remote-control plugin — a live HTTP/JSON API into the running app.

This is a Gaphor **service plugin** (registered via the ``gaphor.services``
entry point). Gaphor injects the live services into ``__init__`` by parameter
name; the plugin starts a small HTTP server on a background thread that lets an
external process (e.g. the `gaphor` MCP server in `../mcp`) query the live
model, switch the displayed diagram, and render the current view — the same
pattern as StarUML's HTTP API and Blender's socket addon.

Thread-safety: the HTTP server runs on a background thread, but the Gaphor model
and GTK objects may only be touched on the GTK main loop. Every handler is
marshalled onto the main loop with ``GLib.idle_add`` and the worker thread
blocks on a ``threading.Event`` for the result.

Install (into Gaphor's plugin dir) then restart Gaphor:

    pip install --no-deps --target "$HOME/.local/gaphor/plugins-2" .

Configure the port with ``GAPHOR_REMOTE_PORT`` (default 9899).
"""

from __future__ import annotations

import base64
import json
import logging
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from gi.repository import GLib

from gaphor.abc import Service
from gaphor.core import Transaction
from gaphor.core.modeling import Diagram
from gaphor.diagram.export import save_png, save_svg

log = logging.getLogger(__name__)

HOST = "127.0.0.1"
PORT = int(os.environ.get("GAPHOR_REMOTE_PORT", "9899"))


def _call_on_main(fn, timeout: float = 15.0):
    """Run ``fn`` on the GTK main loop and return its result (or raise)."""
    done = threading.Event()
    box: dict = {}

    def runner():
        try:
            box["result"] = fn()
        except Exception as e:  # noqa: BLE001 — capture, never crash the loop
            box["error"] = e
        finally:
            done.set()
        return GLib.SOURCE_REMOVE

    GLib.idle_add(runner)
    if not done.wait(timeout):
        raise TimeoutError("Gaphor main-loop call timed out")
    if "error" in box:
        raise box["error"]
    return box.get("result")


class RemoteControl(Service):
    """A live JSON API into the running Gaphor session."""

    # Parameter names are matched to registered services and injected by Gaphor.
    def __init__(self, element_factory, event_manager, diagrams, main_window=None):
        self.element_factory = element_factory
        self.event_manager = event_manager
        self.diagrams = diagrams
        self.main_window = main_window
        self._server: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None
        self._start()

    # ── lifecycle ────────────────────────────────────────────────────────────
    def _start(self) -> None:
        plugin = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_a):  # silence default stderr logging
                pass

            def do_GET(self):  # health check
                self._reply(200, {"ok": True, "result": {"status": "ready"}})

            def do_POST(self):
                length = int(self.headers.get("Content-Length", 0))
                raw = self.rfile.read(length) if length else b"{}"
                try:
                    req = json.loads(raw or b"{}")
                    result = plugin.dispatch(req.get("method"), req.get("params") or {})
                    self._reply(200, {"ok": True, "result": result})
                except Exception as e:  # noqa: BLE001
                    self._reply(400, {"ok": False, "error": str(e)})

            def _reply(self, code: int, obj: dict):
                payload = json.dumps(obj).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

        try:
            self._server = ThreadingHTTPServer((HOST, PORT), Handler)
        except OSError as e:
            log.error("gaphor-remote: cannot bind %s:%d (%s)", HOST, PORT, e)
            return
        self._thread = threading.Thread(
            target=self._server.serve_forever, name="gaphor-remote", daemon=True
        )
        self._thread.start()
        log.info("gaphor-remote: listening on http://%s:%d", HOST, PORT)

    def shutdown(self) -> None:
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)

    # ── dispatch (worker thread) — every handler hops to the main loop ───────
    def dispatch(self, method: str, params: dict):
        if method == "status":
            return {"status": "ready"}
        if method == "list_diagrams":
            return _call_on_main(self._list_diagrams)
        if method == "get_current_diagram":
            return _call_on_main(self._get_current)
        if method == "open_diagram":
            return _call_on_main(lambda: self._open(params["id"]))
        if method == "render_diagram":
            return _call_on_main(
                lambda: self._render(params.get("id"), params.get("format", "png"))
            )
        if method == "find_elements":
            return _call_on_main(lambda: self._find(params.get("name", "")))
        # ── mutate (in a Transaction on the main thread) — layout-free edits
        # only. Building whole diagrams (add lifeline/message) lives in the file
        # generator (`kymo`), which lays them out properly; Gaphor has no good
        # programmatic layout for fresh sequence items, so it's not exposed here.
        if method == "rename":
            return _call_on_main(lambda: self._rename(params["id"], params["name"]))
        if method == "delete":
            return _call_on_main(lambda: self._delete(params["id"]))
        raise ValueError(f"unknown method: {method!r}")

    # ── handlers (GTK main thread) ───────────────────────────────────────────
    def _list_diagrams(self):
        return [
            {"id": d.id, "name": d.name or "(unnamed)"}
            for d in self.element_factory.lselect(Diagram)
        ]

    def _get_current(self):
        d = self.diagrams.get_current_diagram()
        return None if d is None else {"id": d.id, "name": d.name or "(unnamed)"}

    def _open(self, diagram_id: str):
        d = self.element_factory.lookup(diagram_id)
        if not isinstance(d, Diagram):
            raise ValueError(f"no diagram with id {diagram_id!r}")
        # Switch to the tab if open, else open a new one.
        if not self.diagrams.set_current_diagram(d):
            self.diagrams.create_diagram_page(d)
        return {"id": d.id, "name": d.name or "(unnamed)"}

    def _render(self, diagram_id, fmt: str):
        if diagram_id is not None:
            d = self.element_factory.lookup(diagram_id)
            if not isinstance(d, Diagram):
                raise ValueError(f"no diagram with id {diagram_id!r}")
        else:
            d = self.diagrams.get_current_diagram()
            if d is None:
                raise ValueError("no current diagram (open one or pass an id)")
        if fmt not in ("png", "svg"):
            raise ValueError(f"unsupported format {fmt!r} (use png|svg)")
        # Render via Gaphor's own save helpers to a temp file, then read back —
        # byte-identical to File -> Export.
        suffix = f".{fmt}"
        handle, path = tempfile.mkstemp(suffix=suffix)
        os.close(handle)
        try:
            (save_png if fmt == "png" else save_svg)(path, d)
            data = open(path, "rb").read()  # noqa: SIM115
        finally:
            os.unlink(path)
        mime = "image/png" if fmt == "png" else "image/svg+xml"
        return {
            "id": d.id,
            "name": d.name or "(unnamed)",
            "mime": mime,
            "format": fmt,
            "base64": base64.b64encode(data).decode(),
        }

    def _find(self, name: str):
        n = name.lower()
        hits = self.element_factory.select(
            lambda e: getattr(e, "name", None) and n in e.name.lower()
        )
        return [
            {"id": e.id, "type": type(e).__name__, "name": e.name} for e in hits
        ]

    # ── mutate handlers (GTK main thread, in a Transaction) — layout-free ────
    def _rename(self, element_id: str, name: str):
        el = self.element_factory.lookup(element_id)
        if el is None:
            raise ValueError(f"no element with id {element_id!r}")
        with Transaction(self.event_manager):
            el.name = name
        return {"id": el.id, "name": name}

    def _delete(self, element_id: str):
        el = self.element_factory.lookup(element_id)
        if el is None:
            raise ValueError(f"no element with id {element_id!r}")
        with Transaction(self.event_manager):
            for pres in list(getattr(el, "presentation", ()) or ()):
                pres.unlink()
            el.unlink()
        return {"deleted": element_id}

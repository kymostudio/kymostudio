"""kymo showcase + playground — single-file HTTP server.

Serves both the static landing page (`showcase/index.html`) at `/` and
the interactive playground at `/play`. The playground auto-renders the
.diagram source on every edit (300 ms debounce) and keeps the current
script in the URL's `?script=` query param (URL-safe base64 of UTF-8
bytes) so links are shareable.

Run:
    uv run playground/server.py [--port 8765]

Open http://localhost:8765 (landing) or http://localhost:8765/play
(editor).
"""
from __future__ import annotations

import argparse
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


# Make the kymo package importable without installing it.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "packages" / "python" / "src"))

from kymo.alignment import resolve_alignments       # noqa: E402
from kymo.dsl import parse as parse_dsl              # noqa: E402
from kymo.layout import layout as apply_grid_layout  # noqa: E402
from kymo.to_svg import render as render_svg         # noqa: E402


# ── Embedded UI ───────────────────────────────────────────────────────
HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>kymo playground</title>
<style>
  :root {
    --bg: #0d1117;
    --panel: #161b22;
    --border: #30363d;
    --green: #7ee787;
    --green-dim: #56a368;
    --text: #e6edf3;
    --muted: #8b949e;
    --err: #ff7b72;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: var(--bg); color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header {
    height: 48px; display: flex; align-items: center; gap: 16px;
    padding: 0 16px; border-bottom: 1px solid var(--border);
    font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px;
    background: var(--panel);
  }
  .title { color: var(--green); font-weight: 600; letter-spacing: 0.05em; }
  .tag { color: var(--muted); font-size: 11px; }
  .grow { flex: 1; }
  .btn {
    background: transparent; border: 1px solid var(--border); color: var(--muted);
    padding: 6px 12px; border-radius: 6px; font-family: inherit; font-size: 12px;
    cursor: pointer; transition: all 0.15s;
  }
  .btn:hover { color: var(--text); border-color: var(--green-dim); }
  select.btn { padding-right: 24px; }
  main { display: flex; height: calc(100vh - 48px); }
  .pane { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .pane + .pane { border-left: 1px solid var(--border); }
  .pane-head {
    height: 32px; display: flex; align-items: center; padding: 0 14px;
    background: var(--panel); border-bottom: 1px solid var(--border);
    font-family: ui-monospace, monospace; font-size: 11px;
    color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase;
  }
  textarea#dsl {
    flex: 1; background: var(--bg); color: var(--text); border: 0;
    padding: 16px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 13.5px; line-height: 1.55; resize: none; outline: none;
    tab-size: 2;
  }
  #preview {
    flex: 1; overflow: auto; padding: 24px;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(126,231,135,0.04), transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(126,231,135,0.03), transparent 50%);
    display: flex; align-items: flex-start; justify-content: center;
  }
  #preview svg { max-width: 100%; height: auto; }
  #preview .error {
    color: var(--err); font-family: ui-monospace, monospace; font-size: 12.5px;
    white-space: pre-wrap; align-self: stretch;
    background: rgba(255,123,114,0.05); padding: 16px; border-radius: 8px;
    border: 1px solid rgba(255,123,114,0.2);
  }
  .status { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); }
  .status.ok  { color: var(--green-dim); }
  .status.err { color: var(--err); }
</style>
</head>
<body>
<header>
  <span class="title">kymo</span>
  <span class="tag">playground</span>
  <select class="btn" id="examples" title="Load example">
    <option value="">examples…</option>
  </select>
  <div class="grow"></div>
  <span class="status" id="status">ready</span>
  <button class="btn" id="copy" title="Copy share URL">copy link</button>
</header>
<main>
  <div class="pane">
    <div class="pane-head">source · .diagram</div>
    <textarea id="dsl" spellcheck="false" autocorrect="off"></textarea>
  </div>
  <div class="pane">
    <div class="pane-head">rendered · svg</div>
    <div id="preview"></div>
  </div>
</main>
<script>
const dsl = document.getElementById('dsl');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const copyBtn = document.getElementById('copy');
const examplesSel = document.getElementById('examples');

const DEFAULT = `# kymo playground — edit on the left, see the SVG on the right.
# URL updates with each edit so links stay shareable.

orch hex/hex-agent/green
a    hex/hex-agent/green
b    hex/hex-agent/green
c    hex/hex-agent/green

layout { orch | { a , b , c } }

orch --> a
orch --> b
orch --> c
`;

// ─── URL <-> source encoding (base64url of UTF-8 bytes) ───────────────
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ─── Render via /render endpoint ──────────────────────────────────────
let renderTimer = null;
let inFlight = false;
async function render() {
  if (inFlight) return;
  inFlight = true;
  status.className = 'status'; status.textContent = 'rendering…';
  try {
    const res = await fetch('/render', { method: 'POST', body: dsl.value });
    const text = await res.text();
    if (res.ok) {
      preview.innerHTML = text;
      status.className = 'status ok'; status.textContent = 'ok';
    } else {
      preview.innerHTML = `<div class="error">${escapeHtml(text)}</div>`;
      status.className = 'status err'; status.textContent = 'error';
    }
  } catch (e) {
    preview.innerHTML = `<div class="error">${escapeHtml(String(e))}</div>`;
    status.className = 'status err'; status.textContent = 'offline';
  } finally {
    inFlight = false;
  }
}
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function syncURL() {
  const q = '?script=' + b64urlEncode(dsl.value);
  history.replaceState(null, '', q);
}
dsl.addEventListener('input', () => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { syncURL(); render(); }, 300);
});

// ─── Share link ───────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyBtn.textContent = 'copied!';
    setTimeout(() => copyBtn.textContent = 'copy link', 1200);
  } catch {
    copyBtn.textContent = 'select-copy URL';
  }
});

// ─── Examples dropdown (lazy-fetched from /examples) ─────────────────
fetch('/examples').then(r => r.json()).then(list => {
  for (const name of list) {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    examplesSel.appendChild(opt);
  }
});
examplesSel.addEventListener('change', async () => {
  const name = examplesSel.value;
  if (!name) return;
  const res = await fetch('/examples/' + encodeURIComponent(name));
  if (res.ok) {
    dsl.value = await res.text();
    syncURL(); render();
  }
  examplesSel.value = '';
});

// ─── Bootstrap ───────────────────────────────────────────────────────
const initial = new URLSearchParams(location.search).get('script');
if (initial) {
  try { dsl.value = b64urlDecode(initial); }
  catch { dsl.value = DEFAULT; }
} else {
  dsl.value = DEFAULT;
}
render();
</script>
</body>
</html>
"""


# ── Examples discovery (lazy) ─────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_ROOTS = (
    _ROOT / "packages" / "python" / "tests" / "diagrams",
    _ROOT / "packages" / "python" / "tests" / "edges",
    _ROOT / "packages" / "python" / "tests" / "layout",
    _ROOT / "samples",
)


def list_examples() -> list[str]:
    names: list[str] = []
    for root in EXAMPLES_ROOTS:
        if not root.exists():
            continue
        for path in sorted(root.iterdir()):
            if path.is_dir() and (path / "input.diagram").exists():
                names.append(f"{root.name}/{path.name}")
            elif path.suffix == ".diagram":
                names.append(f"{root.name}/{path.stem}")
    return names


def load_example(name: str) -> str | None:
    """`<group>/<case>` → diagram source text, or None when not found."""
    group, _, case = name.partition("/")
    if not case:
        return None
    for root in EXAMPLES_ROOTS:
        if root.name != group:
            continue
        sub = root / case
        if sub.is_dir() and (sub / "input.diagram").exists():
            return (sub / "input.diagram").read_text(encoding="utf-8")
        flat = root / f"{case}.diagram"
        if flat.exists():
            return flat.read_text(encoding="utf-8")
    return None


# ── HTTP handler ──────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "kymo-playground/0.1"

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write(f"  {self.address_string()} {fmt % args}\n")

    def _respond(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        # Interactive playground.
        if path == "/play" or path == "/play/":
            self._respond(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
            return
        # API.
        if path == "/examples":
            import json
            body = json.dumps(list_examples()).encode("utf-8")
            self._respond(200, body, "application/json; charset=utf-8")
            return
        if path.startswith("/examples/"):
            name = path[len("/examples/"):]
            from urllib.parse import unquote
            src = load_example(unquote(name))
            if src is None:
                self._respond(404, b"not found", "text/plain")
                return
            self._respond(200, src.encode("utf-8"), "text/plain; charset=utf-8")
            return
        # Static landing page + assets (showcase/, samples/).
        served = self._serve_static(path)
        if not served:
            self._respond(404, b"not found", "text/plain")

    # ── Static file serving (showcase landing + sample assets) ───────
    _STATIC_ROOTS = (
        ("/",        Path(__file__).resolve().parent.parent / "showcase"),
        ("/samples/", Path(__file__).resolve().parent.parent / "samples"),
    )
    _MIME = {
        ".html": "text/html; charset=utf-8",
        ".css":  "text/css; charset=utf-8",
        ".js":   "application/javascript; charset=utf-8",
        ".svg":  "image/svg+xml; charset=utf-8",
        ".png":  "image/png",
        ".jpg":  "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif":  "image/gif",
        ".ico":  "image/x-icon",
        ".woff": "font/woff", ".woff2": "font/woff2",
        ".json": "application/json; charset=utf-8",
    }

    def _serve_static(self, path: str) -> bool:
        for prefix, root in self._STATIC_ROOTS:
            if not path.startswith(prefix):
                continue
            rel = path[len(prefix):] or "index.html"
            target = (root / rel).resolve()
            try:
                target.relative_to(root.resolve())   # prevent path escape
            except ValueError:
                return False
            if target.is_dir():
                target = target / "index.html"
            if not target.is_file():
                continue
            ctype = self._MIME.get(target.suffix.lower(), "application/octet-stream")
            self._respond(200, target.read_bytes(), ctype)
            return True
        return False

    def do_POST(self):
        if self.path != "/render":
            self._respond(404, b"not found", "text/plain")
            return
        length = int(self.headers.get("Content-Length", "0"))
        dsl_text = self.rfile.read(length).decode("utf-8", errors="replace")
        try:
            diagram, layout_spec, external = parse_dsl(dsl_text)
            if layout_spec:
                apply_grid_layout(diagram, layout_spec, external)
            resolve_alignments(diagram)
            svg = render_svg(diagram)
            self._respond(200, svg.encode("utf-8"), "image/svg+xml; charset=utf-8")
        except Exception as e:
            # Surface a concise error to the editor (full traceback on server stderr).
            traceback.print_exc()
            msg = f"{type(e).__name__}: {e}"
            self._respond(400, msg.encode("utf-8"), "text/plain; charset=utf-8")


# ── Entry point ───────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser(description="kymo playground")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"kymo playground → http://{args.host}:{args.port}")
    print(f"  {len(list_examples())} examples available")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down")
        server.server_close()


if __name__ == "__main__":
    main()

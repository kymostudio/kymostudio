#!/usr/bin/env python3
"""
drive_req1.py — drive the guest "paste → render" editor demo with Playwright.

This is NOT a test suite. It's a small automation *tool* that opens
`index-2-req1.html` and operates it the way a person would: it puts diagram
source on the clipboard, pastes it (⌘V / Ctrl-V), lets the demo auto-detect the
language, and shows what renders.

Default (headed) run **injects a scene controller** into the page — a floating
bar with play/pause, prev/next, one chip per scene, and a Step 1/2/3 list — so you
can pick a scene OR a single step and auto-play/pause the tour from inside the
browser. The chips just signal intent; this script executes them. Every scene plays
in three steps — (1) initial empty state, (2) a "copy" step where the source lands
in the editor, (3) the rendered diagram — and you can jump to any step like a scene.

The demo is static, so the script serves ../src/editor/guest over loopback HTTP
(the clipboard API needs a real http(s) origin — it's blocked on file://).

Run it from this uv project (isolated env — no global installs):

    cd packages/docs/demos/runs
    uv run playwright install chromium      # one-time: fetch the browser
    uv run python drive_req1.py             # headed + injected scene controller
    uv run python drive_req1.py --auto      # scripted walkthrough + screenshots
    uv run python drive_req1.py --headless  # walkthrough, no window (capture only)
    pbpaste | uv run python drive_req1.py --paste -   # paste your own source

Options:
    --headless     run the walkthrough without a window (implies --auto)
    --auto         run the scripted walkthrough (no controller) + screenshots
    --shots DIR    screenshot output dir for --auto (default ./req1-shots)
    --slowmo MS    delay between Playwright actions (default 250)
    --interval MS  auto-play dwell per scene in the controller (default 2200)
    --paste FILE   feed one source from FILE ('-' = stdin) and stop
"""
from __future__ import annotations

import argparse
import functools
import http.server
import sys
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent                  # demos/runs/
DEMOS = HERE.parent / "src" / "editor" / "guest"        # demos/src/editor/guest/
DEMO = "index-2-req1.html"

_MERMAID = (
    "flowchart TD\n"
    "  A[Receive order] --> B{In stock?}\n"
    "  B -->|Yes| C[Take payment]\n"
    "  B -->|No| D[Notify customer]\n"
    "  C --> E[Pack items]\n"
    "  E --> F((Ship order))\n"
    "  D --> G[Cancel order]\n"
)

# Each scene = (label shown on the chip, source fed into the demo). The last one
# is unrecognised on purpose, to show the graceful "Text" fallback.
SCENES: list[tuple[str, str]] = [
    ("Mermaid",    _MERMAID),
    ("PlantUML",   "@startuml\nAlice -> Bob: Authentication Request\nBob --> Alice: OK\n@enduml\n"),
    ("DBML",       "Table users {\n  id integer [primary key]\n  email varchar\n}\n"),
    ("GraphViz",   "digraph G {\n  rankdir=LR;\n  Start -> Parse -> Render;\n}\n"),
    ("Kymo",       "flowchart TD {\n  A[Start] --> B[End]\n}\n"),
    ("Plain text", "just some notes, not a diagram at all"),
]

# Injected into the page: a floating scene controller (play/pause · prev/next ·
# one chip per scene · Step 1/2/3 chips · quit). Buttons only push intents to
# window.__ctl.q — the Python loop drains the queue and runs each scene or step.
# Styled after the brand "scenebar" (docs/brand/screenshots).
INJECT_CONTROLLER = r"""
(scenes) => {
  if (document.getElementById('__ctl')) return;
  const C = window.__ctl = { q: [] };
  const css = `
    #__ctl{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;user-select:none;
      display:flex;align-items:center;gap:5px;background:#fff;border-radius:14px;padding:6px;
      box-shadow:0 10px 30px -8px rgba(0,0,0,.34),0 0 0 .5px rgba(0,0,0,.08);
      font:600 12.5px -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,sans-serif;color:#3a3a3c}
    #__ctl .grip{width:24px;height:30px;display:flex;align-items:center;justify-content:center;
      color:#8a8a8e;background:#f1f1f3;cursor:grab;touch-action:none;border-radius:8px}
    #__ctl .grip:hover{background:#e3e3e7;color:#3a3a3c}
    #__ctl .grip:active{cursor:grabbing}
    #__ctl button{border:0;background:#f1f1f3;color:#5a5a5f;border-radius:9px;height:30px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;padding:0 11px;gap:7px;font:inherit;white-space:nowrap}
    #__ctl button:hover{background:#e9e9ec}
    #__ctl .ic{width:30px;padding:0}
    #__ctl .play.on{background:#fde7ef;color:#e0095f}
    #__ctl .sep{width:1px;height:22px;background:#e9e9ec;margin:0 3px}
    #__ctl .scene.active,#__ctl .step.active{background:#fde7ef;color:#e0095f}
    #__ctl .n{width:18px;height:18px;border-radius:50%;background:#ececef;color:#6f6f74;font-size:10px;
      font-weight:800;display:flex;align-items:center;justify-content:center}
    #__ctl .scene.active .n,#__ctl .step.active .n{background:#e0095f;color:#fff}
    #__ctl .step .n{background:#e3e3e7}   /* steps read as a distinct sub-list */
    #__ctl .grp{font-size:10px;font-weight:800;letter-spacing:.05em;color:#a0a0a6;text-transform:uppercase;padding:0 3px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const SVG = {
    play: '<svg width=15 height=15 viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause:'<svg width=15 height=15 viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    prev: '<svg width=15 height=15 viewBox="0 0 24 24" fill="currentColor"><path d="M8 5h2v14H8zM20 5v14L9 12z"/></svg>',
    next: '<svg width=15 height=15 viewBox="0 0 24 24" fill="currentColor"><path d="M14 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    x:    '<svg width=14 height=14 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const mk = (html, cls, on) => { const b = document.createElement('button'); b.className = cls; b.innerHTML = html; b.onclick = on; return b; };
  const bar = document.createElement('div'); bar.id = '__ctl';

  // drag handle — grab the grip to reposition the whole bar anywhere
  const grip = document.createElement('div'); grip.className = 'grip'; grip.title = 'Drag to move';
  grip.innerHTML = '<svg width="13" height="15" viewBox="0 0 16 20" fill="currentColor"><circle cx="5" cy="4" r="1.7"/><circle cx="11" cy="4" r="1.7"/><circle cx="5" cy="10" r="1.7"/><circle cx="11" cy="10" r="1.7"/><circle cx="5" cy="16" r="1.7"/><circle cx="11" cy="16" r="1.7"/></svg>';
  let drag = null;
  grip.addEventListener('pointerdown', (e) => {
    const r = bar.getBoundingClientRect();
    bar.style.left = r.left + 'px'; bar.style.top = r.top + 'px';   // pin top/left, drop the centering transform
    bar.style.bottom = 'auto'; bar.style.transform = 'none';
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const x = Math.max(6, Math.min(innerWidth  - bar.offsetWidth  - 6, e.clientX - drag.dx));
    const y = Math.max(6, Math.min(innerHeight - bar.offsetHeight - 6, e.clientY - drag.dy));
    bar.style.left = x + 'px'; bar.style.top = y + 'px';
  });
  const endDrag = (e) => { drag = null; try { grip.releasePointerCapture(e.pointerId); } catch (_) {} };
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);

  bar.append(
    grip,
    mk(SVG.prev, 'ic',        () => C.q.push('prev')),
    (C.playBtn = mk(SVG.play, 'ic play', () => C.q.push('toggle'))),
    mk(SVG.next, 'ic',        () => C.q.push('next')),
  );
  const sep = () => { const d = document.createElement('div'); d.className = 'sep'; return d; };
  const grp = (t) => { const d = document.createElement('div'); d.className = 'grp'; d.textContent = t; return d; };

  // scene list — one chip per scene
  bar.appendChild(sep());
  bar.appendChild(grp('Scene'));
  scenes.forEach((s, i) => {
    const b = mk('<span class="n">' + (i + 1) + '</span>' + s.label, 'scene', () => C.q.push('scene:' + i));
    b.dataset.i = i; bar.appendChild(b);
  });

  // step list — selectable just like the scenes; jumps the current scene to a step
  bar.appendChild(sep());
  bar.appendChild(grp('Step'));
  ['Initial', 'Copy', 'Render'].forEach((name, k) => {
    const n = k + 1;
    const b = mk('<span class="n">' + n + '</span>' + name, 'step', () => C.q.push('step:' + n));
    b.dataset.s = n; bar.appendChild(b);
  });

  bar.appendChild(sep());
  bar.appendChild(mk(SVG.x, 'ic', () => C.q.push('quit')));
  document.body.appendChild(bar);

  C.setActive  = (i) => bar.querySelectorAll('.scene').forEach((b) => b.classList.toggle('active', +b.dataset.i === i));
  C.setPlaying = (p) => { C.playBtn.classList.toggle('on', p); C.playBtn.innerHTML = p ? SVG.pause : SVG.play; };
  C.setStep    = (n) => bar.querySelectorAll('.step').forEach((b) => b.classList.toggle('active', +b.dataset.s === n));
}
"""


def serve(directory: Path) -> tuple[http.server.ThreadingHTTPServer, int]:
    """Serve `directory` on a free loopback port in a background thread."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def feed(page, text: str) -> tuple[str, str]:
    """Put `text` on the clipboard and paste it into the demo (the ⌘V path).

    Returns (detected_label, chip_text). The document-level paste handler stays
    live after the empty-state hides, so this keeps working across scenes.
    """
    page.evaluate("(t) => navigator.clipboard.writeText(t)", text)
    page.focus("#pasteCatcher")          # an editable target so the paste fires
    page.keyboard.press("ControlOrMeta+V")
    page.wait_for_selector("#center", state="visible", timeout=5_000)
    label = page.locator("#kindLabel").inner_text().strip()
    chip = page.locator("#detectChip")
    return label, (chip.inner_text().strip() if chip.is_visible() else "(no chip — unrecognised)")


def interactive(page, interval_ms: int) -> None:
    """Inject the scene controller and run the play/pause/select loop."""
    page.evaluate(INJECT_CONTROLLER, [{"label": label} for label, _ in SCENES])
    print("· controller injected — pick a scene or ▶ play; ✕ to quit", flush=True)
    playing = False
    idx = -1
    last = time.monotonic()
    interval = interval_ms / 1000

    sub = max(600, interval_ms // 2)  # dwell between each scene's three steps (ms)

    def show_step(n: int) -> None:
        """Render step n of the current scene and highlight its chip.

        1 — initial empty state · 2 — visualize the copy (source lands in the
        editor) · 3 — render the final diagram. Steps 2 and 3 (re)load the source
        so a step can be selected directly, in any order.
        """
        src = SCENES[idx][1]
        page.evaluate("(n) => window.__ctl.setStep(n)", n)
        if n == 1:
            page.evaluate("() => window.__demo.reset()")
        elif n == 2:
            page.evaluate("(t) => navigator.clipboard.writeText(t)", src)  # authentic clipboard
            page.evaluate("(t) => window.__demo.showSource(t)", src)
        else:
            page.evaluate("(t) => window.__demo.showSource(t)", src)  # ensure source before render
            page.evaluate("() => window.__demo.showRender()")

    def run(i: int) -> None:
        """Select scene i and play its three steps in sequence."""
        nonlocal idx
        idx = i % len(SCENES)
        page.evaluate("(i) => window.__ctl.setActive(i)", idx)
        show_step(1); page.wait_for_timeout(sub)
        show_step(2); page.wait_for_timeout(sub)
        show_step(3)
        print(f"· scene {idx + 1} · {SCENES[idx][0]:11} → step 1 initial · 2 copy · 3 render", flush=True)

    def go_step(n: int) -> None:
        """Jump the current scene straight to step n (manual step selection)."""
        nonlocal idx
        if idx < 0:
            idx = 0
            page.evaluate("(i) => window.__ctl.setActive(i)", idx)
        show_step(n)
        print(f"· scene {idx + 1} · {SCENES[idx][0]:11} → step {n}", flush=True)

    try:
        while not page.is_closed():
            for ev in page.evaluate("() => { const q = window.__ctl.q; window.__ctl.q = []; return q; }"):
                if ev == "quit":
                    print("· quit", flush=True)
                    return
                if ev == "toggle":
                    playing = not playing
                    page.evaluate("(p) => window.__ctl.setPlaying(p)", playing)
                    last = time.monotonic() - interval  # play → advance on the next tick
                elif ev == "next":
                    run(idx + 1); last = time.monotonic()
                elif ev == "prev":
                    run(idx - 1); last = time.monotonic()
                elif ev.startswith("scene:"):
                    run(int(ev.split(":", 1)[1])); last = time.monotonic()
                elif ev.startswith("step:"):
                    go_step(int(ev.split(":", 1)[1])); last = time.monotonic()
            if playing and time.monotonic() - last >= interval:
                run(idx + 1); last = time.monotonic()
            page.wait_for_timeout(120)
    except Exception:
        pass  # browser/page closed by the user → leave quietly


def run_auto(page, shots: Path) -> None:
    """Scripted walkthrough: try-a-sample, then paste every scene, + screenshots."""
    shots.mkdir(parents=True, exist_ok=True)
    page.click("#sampleBtn")
    page.wait_for_selector("#center", state="visible")
    print(f"· try-a-sample → {page.locator('#kindLabel').inner_text()}", flush=True)
    page.screenshot(path=str(shots / "00-sample.png"))
    for i, (label, src) in enumerate(SCENES[1:], 1):  # 0 is the sample we just ran
        det, chip = feed(page, src)
        print(f"· fed {label:11} → {det:10} {chip}", flush=True)
        page.screenshot(path=str(shots / f"{i:02d}-{det.lower().replace(' ', '-')}.png"))
    page.click('[data-zoom="in"]'); page.click('[data-zoom="in"]')
    page.click(".share-btn"); page.wait_for_selector(".share-pop", state="visible")
    page.screenshot(path=str(shots / "99-zoom-share.png"))
    print(f"· screenshots → {shots}", flush=True)


def run(headless: bool, auto: bool, shots: Path, slowmo: int, interval: int, paste: str | None) -> None:
    httpd, port = serve(DEMOS)
    base = f"http://127.0.0.1:{port}"
    print(f"· serving {DEMOS} at {base}", flush=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless, slow_mo=slowmo)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin=base)
        page = ctx.new_page()
        page.goto(f"{base}/{DEMO}", wait_until="domcontentloaded")
        page.wait_for_selector("#pasteZone")

        if paste is not None:
            src = sys.stdin.read() if paste == "-" else Path(paste).read_text()
            label, chip = feed(page, src)
            print(f"· pasted {len(src)} chars → {label}   {chip}", flush=True)
            shots.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(shots / "paste.png"))
        elif headless or auto:
            run_auto(page, shots)
        else:
            interactive(page, interval)

        if not page.is_closed():
            browser.close()
    httpd.shutdown()


def main() -> None:
    ap = argparse.ArgumentParser(description="Drive the guest paste→render demo (index-2-req1.html).")
    ap.add_argument("--headless", action="store_true", help="walkthrough with no window (implies --auto)")
    ap.add_argument("--auto", action="store_true", help="scripted walkthrough (no controller) + screenshots")
    ap.add_argument("--shots", type=Path, default=HERE / "req1-shots", help="screenshot output dir")
    ap.add_argument("--slowmo", type=int, default=250, help="ms between Playwright actions")
    ap.add_argument("--interval", type=int, default=2200, help="auto-play dwell per scene (ms)")
    ap.add_argument("--paste", metavar="FILE", help="feed one source from FILE ('-' = stdin) and stop")
    a = ap.parse_args()
    run(a.headless, a.auto, a.shots, a.slowmo, a.interval, a.paste)


if __name__ == "__main__":
    main()

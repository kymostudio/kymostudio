#!/usr/bin/env python3
"""render-api bench — latency of https://render.kymo.studio vs https://kroki.io.

One pass, one report. For every case the same diagram source is POSTed
(text/plain, kroki wire format) to both services and timed end-to-end:

  • cache-busted — a per-language comment with a random token is appended so
                   every repetition is a REAL render (worker wasm vs kroki's
                   server-side engines), never an edge-cache hit;
  • cache hit    — the identical source every time, measuring what a repeat
                   visitor (e.g. a share-link reload) pays: one edge round-trip.
                   The `x-render-cache` response header confirms hit vs miss.

Writes `results/perf.json` and the human-readable `results/REPORT.md`.

This bench is ONLINE (live render.kymo.studio + live kroki.io) — numbers move
with the network, the vantage point and kroki's queue. Treat `results/` as a
dated snapshot, never a gate; run it after a render-api deploy and write up
the round in `research/` if anything moved.

Run:  cd benches && uv run python render-api/run.py [--reps N] [--mine URL]
      (stdlib only — plain `python3 render-api/run.py` works too)
"""
from __future__ import annotations

import argparse
import base64
import json
import platform
import random
import socket
import statistics
import time
import urllib.error
import urllib.request
import zlib
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
KROKI = "https://kroki.io"

MMD = "flowchart TD\n  A[Client] --> B{Cache?}\n  B -->|hit| C[Edge]\n  B -->|miss| D[Render]\n  D --> E[(Store)]\n  E --> C"
DOT = "digraph G { rankdir=LR; client -> lb -> app1; lb -> app2; app1 -> db; app2 -> db; }"
PUML = "@startuml\nAlice -> Bob: request\nBob --> Alice: response\n@enduml"
KYMO = (HERE / "../../samples/order-flow.kymo").resolve().read_text()
NOMNOML = "[Pirate|eyeCount: Int|raid();pillage()|\n  [beard]--[parrot]\n]\n[<abstract>Marauder]<:--[Pirate]"
MMDSEQ = "sequenceDiagram\n  Alice->>Bob: request\n  Bob-->>Alice: response\n  Alice->>Bob: again"
DBML = "Table users {\n  id integer [primary key]\n  username varchar\n}\nTable posts {\n  id integer\n  user_id integer\n}\nRef: posts.user_id > users.id"
BYTEFIELD = '(draw-column-headers)\n(draw-box "Address" {:span 4})\n(draw-box "Size" {:span 2})\n(draw-gap "Payload")\n(draw-bottom)'
WAVEDROM = '{ "signal": [\n  { "name": "clk",  "wave": "p......" },\n  { "name": "bus",  "wave": "x.34.5x", "data": ["head", "body", "tail"] }\n]}'
VEGALITE = '{"data":{"values":[{"m":"Jan","v":28},{"m":"Feb","v":55},{"m":"Mar","v":43}]},"mark":"bar","encoding":{"x":{"field":"m","type":"nominal","sort":null},"y":{"field":"v","type":"quantitative"}}}'
SVGBOB = "       +-------+      .-------.\n       |  Box  |----->| Round |\n       +-------+      '-------'"
PIKCHR = 'arrow right 200% "Markdown" "Source"\nbox rad 10px "Markdown" "Formatter" fit\narrow right 200% "HTML+SVG" "Output"' 

# (name, kind, format, source, bust, also-on-kroki). bust is a comment prefix
# for the random token line, or "ws" for syntaxes with no comments (strict
# JSON: trailing whitespace changes the cache key, not the parse; svgbob: the
# token renders as a stray text line — fine for a latency probe).
# `kymo` exists only on render.kymo.studio; everything else is rendered by
# both services. plantuml is the PROXIED control: render.kymo.studio forwards
# it to kroki.io, so its busted delta is the cost of the extra hop.
CASES = [
    ("mermaid/svg (self)", "mermaid", "svg", MMD, "%%", True),
    ("mermaid-seq/svg (self)", "mermaid", "svg", MMDSEQ, "%%", True),
    ("dbml/svg (self)", "dbml", "svg", DBML, "//", True),
    ("graphviz/svg (self)", "graphviz", "svg", DOT, "//", True),
    ("graphviz/png (self)", "graphviz", "png", DOT, "//", True),
    ("kymo/svg (self)", "kymo", "svg", KYMO, "#", False),
    ("nomnoml/svg (self)", "nomnoml", "svg", NOMNOML, "//", True),
    ("bytefield/svg (self)", "bytefield", "svg", BYTEFIELD, ";;", True),
    ("wavedrom/svg (self)", "wavedrom", "svg", WAVEDROM, "//", True),
    ("vegalite/svg (self)", "vegalite", "svg", VEGALITE, "ws", True),
    ("svgbob/svg (self)", "svgbob", "svg", SVGBOB, "", True),
    ("pikchr/svg (self)", "pikchr", "svg", PIKCHR, "#", True),
    ("plantuml/svg (proxy)", "plantuml", "svg", PUML, "'", True),
]

HIT_CASES = [
    ("mermaid/svg", "mermaid", "svg", MMD),
    ("plantuml/svg", "plantuml", "svg", PUML),
]


def _share_payload(source: str) -> str:
    """The editor's share encoding: deflate (zlib) + base64url, padding stripped."""
    return base64.urlsafe_b64encode(zlib.compress(source.encode(), 9)).decode().rstrip("=")


def _post(base: str, kind: str, fmt: str, source: str, get_url: str | None = None) -> tuple[float, int, str]:
    """POST one render (or GET `get_url`); return (elapsed_ms, http_status, x-render-cache|'')."""
    req = urllib.request.Request(
        get_url or f"{base}/{kind}/{fmt}",
        data=None if get_url else source.encode(),
        # A real UA: Cloudflare's bot protection 403s the default Python-urllib one.
        headers={"content-type": "text/plain", "user-agent": "kymo-bench/1.0 (+https://github.com/kymostudio/kymostudio)"},
        method="GET" if get_url else "POST",
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            res.read()
            return (time.perf_counter() - t0) * 1000, res.status, res.headers.get("x-render-cache", "")
    except urllib.error.HTTPError as e:
        e.read()
        return (time.perf_counter() - t0) * 1000, e.code, ""


def _bust(source: str, bust: str, i: int) -> str:
    token = f"bust-{random.randrange(1 << 30)}-{i}"
    if bust == "ws":  # strict-JSON kinds: whitespace changes the hash, not the parse
        return source + "\n" * (1 + i) + " " * random.randrange(1, 80)
    return f"{source}\n{bust} {token}" if bust else f"{source}\n{token}"


def _series(base: str, kind: str, fmt: str, source: str, reps: int, bust: str | None) -> dict:
    times, hits, failed = [], 0, 0
    for i in range(reps):
        body = _bust(source, bust, i) if bust is not None else source
        try:
            ms, status, cache = _post(base, kind, fmt, body)
        except Exception:
            failed += 1
            continue
        if status != 200:
            failed += 1
            continue
        times.append(ms)
        hits += cache == "hit"
    out = {"reps": reps, "failed": failed, "cache_hits": hits}
    if times:
        out |= {
            "median_ms": round(statistics.median(times)),
            "min_ms": round(min(times)),
            "max_ms": round(max(times)),
        }
    return out


def _cell(s: dict) -> str:
    if "median_ms" not in s:
        return f"all {s['reps']} failed ❌"
    note = f", {s['failed']} failed" if s["failed"] else ""
    return f"**{s['median_ms']:,} ms** ({s['min_ms']:,}–{s['max_ms']:,}{note})"


def _report(data: dict) -> str:
    m = data["meta"]
    lines = [
        "# render-api bench — render latency vs kroki.io",
        "",
        f"*{m['timestamp']} · {m['mine']} vs {KROKI} · {m['host']} ({m['platform']}) · "
        f"{m['reps']} reps/case, medians*",
        "",
        "Snapshot, not a gate: both endpoints are live deployed software — numbers",
        "move with the network, the vantage point and kroki's queue.",
        "",
        "## Real renders (cache-busted every repetition)",
        "",
        "| Case | render.kymo.studio | kroki.io | × kroki |",
        "|---|---|---|---|",
    ]
    for c in data["busted"]:
        mine, kroki = c["mine"], c.get("kroki")
        ratio = "—"
        if kroki and "median_ms" in mine and "median_ms" in kroki and mine["median_ms"]:
            ratio = f"{kroki['median_ms'] / mine['median_ms']:.1f}×"
        lines.append(f"| {c['name']} | {_cell(mine)} | {_cell(kroki) if kroki else '—'} | {ratio} |")
    lines += [
        "",
        "`(self)` renders inside the worker (kymostudio JS engine + kymostudio-core",
        "wasm); `(proxy)` is forwarded to kroki.io, so its busted row prices the",
        "extra hop a cache miss pays.",
        "",
        "## Share-embed GET — first fetch of a Copy-Markdown-image URL",
        "",
        "| Case | render.kymo.studio | hit rate |",
        "|---|---|---|",
    ]
    for c in data.get("share_get", []):
        s = c["mine"]
        rate = f"{s['cache_hits']}/{s['reps'] - s['failed']}"
        lines.append(f"| {c['name']} | {_cell(s)} | {rate} |")
    lines += [
        "",
        "Fresh content per repetition. `(pre-warmed)` runs the editor's",
        "warm-on-share POST first (untimed): opening the Share menu renders the",
        "diagram into the content-addressed cache, so the embed's first fetch is",
        "already a hit.",
        "",
        "## Edge cache hits (identical source every repetition)",
        "",
        "| Case | render.kymo.studio | hit rate |",
        "|---|---|---|",
    ]
    for c in data["hits"]:
        s = c["mine"]
        rate = f"{s['cache_hits']}/{s['reps'] - s['failed']}"
        lines.append(f"| {c['name']} | {_cell(s)} | {rate} |")
    lines += [
        "",
        "Hits are content-addressed (SHA-256 of kind+format+scale+source) with an",
        "immutable 1-year TTL — a repeat render costs one round-trip to the nearest",
        "Cloudflare PoP, independent of diagram kind or engine.",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--reps", type=int, default=10)
    ap.add_argument("--mine", default="https://render.kymo.studio")
    args = ap.parse_args()

    busted = []
    for name, kind, fmt, src, bust, on_kroki in CASES:
        row = {"name": name, "kind": kind, "format": fmt,
               "mine": _series(args.mine, kind, fmt, src, args.reps, bust)}  # bust="" → raw-line token
        if on_kroki:
            row["kroki"] = _series(KROKI, kind, fmt, src, args.reps, bust)
        busted.append(row)
        print(f"  busted  {name}: mine {row['mine'].get('median_ms', '×')} ms"
              + (f", kroki {row['kroki'].get('median_ms', '×')} ms" if on_kroki else ""))

    # Share-embed GET: what GitHub pays on its FIRST fetch of a
    # Copy-Markdown-image URL — cold (nobody rendered this content yet) vs
    # pre-warmed (the editor's warm-on-share POST already populated the
    # content-addressed cache entry the GET hashes to).
    share_get = []
    for warmed in (False, True):
        times, hit_count, failed = [], 0, 0
        for i in range(args.reps):
            src = f"{MMD}\n%% share-{random.randrange(1 << 30)}-{i}"
            url = f"{args.mine}/mermaid/svg/{_share_payload(src)}"
            try:
                if warmed:
                    _post(args.mine, "mermaid", "svg", src)  # the warm-on-share POST (untimed)
                ms, status, cache = _post(args.mine, "mermaid", "svg", src, get_url=url)
            except Exception:
                failed += 1
                continue
            if status != 200:
                failed += 1
                continue
            times.append(ms)
            hit_count += cache == "hit"
        share_get.append({
            "name": "mermaid/svg GET " + ("(pre-warmed)" if warmed else "(cold)"),
            "warmed": warmed,
            "mine": {
                "reps": args.reps, "failed": failed, "cache_hits": hit_count,
                **({"median_ms": round(statistics.median(times)),
                    "min_ms": round(min(times)), "max_ms": round(max(times))} if times else {}),
            },
        })
        print(f"  shareGET {'warmed' if warmed else 'cold  '}: {share_get[-1]['mine'].get('median_ms', '×')} ms")

    hits = []
    for name, kind, fmt, src in HIT_CASES:
        _post(args.mine, kind, fmt, src)  # warm the cache so rep 1 isn't the miss
        row = {"name": name, "kind": kind, "format": fmt,
               "mine": _series(args.mine, kind, fmt, src, args.reps, None)}
        hits.append(row)
        print(f"  hit     {name}: {row['mine'].get('median_ms', '×')} ms")

    data = {
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "mine": args.mine,
            "kroki": KROKI,
            "reps": args.reps,
            "host": socket.gethostname(),
            "platform": platform.platform(),
        },
        "busted": busted,
        "share_get": share_get,
        "hits": hits,
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "perf.json").write_text(json.dumps(data, indent=2) + "\n")
    (RESULTS / "REPORT.md").write_text(_report(data))
    print(f"wrote {RESULTS / 'perf.json'} and {RESULTS / 'REPORT.md'}")


if __name__ == "__main__":
    main()

"""Shared BPMN render-regression core (NOT a test module — underscore-prefixed
so pytest does not collect it).

Used by:
  - tests/test_bpmn_corpus.py  — per-build gate over the vendored subset.
  - CI nightly workflow        — full MIWG corpus (run as a CLI, see __main__).

A "snapshot" maps each file id to (status, node/edge counts, SVG hash). Any
change vs the committed baseline is a regression — the corpus-scale analogue
of the golden-SVG tests.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import traceback
from pathlib import Path

from kymo import parse_bpmn, render

KEY = ("status", "n_nodes", "n_edges", "sha")


def slug(rel: str) -> str:
    """File id from a path relative to the corpus root (matches the bench's
    corpus.py so baselines are interchangeable)."""
    s = rel[:-5] if rel.lower().endswith(".bpmn") else rel
    return re.sub(r"[^A-Za-z0-9._-]+", "_", s).strip("_")


def render_one(path: str | Path) -> dict:
    rec = {"status": "error", "n_nodes": 0, "n_edges": 0, "sha": "", "err": ""}
    try:
        d = parse_bpmn(Path(path).read_text(encoding="utf-8", errors="replace"))
        rec["n_nodes"], rec["n_edges"] = len(d.components), len(d.edges)
        if not d.components and not d.edges:
            rec["status"] = "empty-output"
        else:
            svg = render(d)
            rec["status"] = "ok"
            rec["sha"] = hashlib.sha1(svg.encode("utf-8")).hexdigest()[:12]
    except Exception:
        rec["err"] = traceback.format_exc()[-200:]
    return rec


def snapshot(id_to_path: dict[str, str]) -> dict[str, dict]:
    return {fid: render_one(p) for fid, p in sorted(id_to_path.items())}


def regressions(base: dict, snap: dict) -> list[tuple[str, dict, dict]]:
    return [(fid, base[fid], snap[fid]) for fid in snap
            if fid in base and tuple(snap[fid][k] for k in KEY) != tuple(base[fid][k] for k in KEY)]


def _main() -> None:
    """CLI for the nightly full-corpus run."""
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", required=True, help="dir to glob for **/*.bpmn")
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--update", action="store_true")
    a = ap.parse_args()
    root = Path(a.corpus)
    files = {slug(p.relative_to(root).as_posix()): str(p) for p in sorted(root.rglob("*.bpmn"))}
    snap = snapshot(files)
    n_ok = sum(1 for r in snap.values() if r["status"] == "ok")
    n_empty = sum(1 for r in snap.values() if r["status"] == "empty-output")
    n_err = sum(1 for r in snap.values() if r["status"] == "error")
    if a.update:
        Path(a.baseline).write_text(json.dumps(snap, indent=1, sort_keys=True))
        print(f"baseline written: {len(snap)} files (ok={n_ok} empty={n_empty} error={n_err})")
        return
    base = json.loads(Path(a.baseline).read_text())
    reg = regressions(base, snap)
    print(f"{len(snap)} files (ok={n_ok} empty={n_empty} error={n_err}) vs baseline ({len(base)})")
    if not reg:
        print("OK no regressions")
        return
    print(f"FAIL {len(reg)} regression(s):")
    for fid, old, now in reg[:50]:
        print(f"  {fid}: was {old['status']} {old['n_nodes']}/{old['n_edges']} {old['sha']} "
              f"-> now {now['status']} {now['n_nodes']}/{now['n_edges']} {now['sha']}")
    sys.exit(1)


if __name__ == "__main__":
    _main()

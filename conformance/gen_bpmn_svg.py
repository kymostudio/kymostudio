#!/usr/bin/env python3
"""Generate the BPMN SVG-render goldens for the Rust renderer.

The Rust BPMN SVG back-end (`packages/rust/kymostudio-core/src/bpmn/{shapes,to_svg}.rs`)
aims to be **byte-identical** to Python's `to_svg.render` for BPMN inputs (the
formatting is fully deterministic). Python — the reference impl — writes:

  * `conformance/golden/bpmn_svg/<stem>.svg`  — a small, reviewable curated set,
    byte-compared by the Rust test (readable diffs when something drifts);
  * `conformance/golden/bpmn_svg.json`        — `{stem: sha256}` over the FULL
    `.bpmn` corpus, so the Rust test gets comprehensive coverage cheaply.

Run from the repo root:

    cd packages/python && uv run python ../../conformance/gen_bpmn_svg.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, "tests")
import _conformance as C  # noqa: E402

from kymo.from_bpmn import parse as parse_bpmn  # noqa: E402
from kymo.to_svg import render  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
SVG_DIR = REPO_ROOT / "conformance" / "golden" / "bpmn_svg"
HASH_JSON = REPO_ROOT / "conformance" / "golden" / "bpmn_svg.json"

# Small, reviewable set committed as full SVG (pools/lanes, tasks, events, gateways).
CURATED = ["collaboration", "order", "order-fulfillment", "events", "gateways", "no_di"]


def render_xml(path: Path) -> str | None:
    xml = path.read_text(encoding="utf-8", errors="replace")
    try:
        return render(parse_bpmn(xml))
    except Exception:  # noqa: BLE001 — un-renderable: drop from the goldens
        return None


def main() -> None:
    files = {p.stem: p for p in C.bpmn_corpus_files()}
    SVG_DIR.mkdir(parents=True, exist_ok=True)

    hashes: dict[str, str] = {}
    for stem, path in files.items():
        svg = render_xml(path)
        if svg is None:
            continue
        hashes[stem] = hashlib.sha256(svg.encode("utf-8")).hexdigest()

    for stem in CURATED:
        if stem in files:
            svg = render_xml(files[stem])
            if svg is not None:
                (SVG_DIR / f"{stem}.svg").write_text(svg, encoding="utf-8")

    HASH_JSON.write_text(
        json.dumps(hashes, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(hashes)} hashes to {HASH_JSON.name} and {len(CURATED)} curated SVGs")


if __name__ == "__main__":
    main()

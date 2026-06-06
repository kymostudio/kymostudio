#!/usr/bin/env python3
"""Generate `conformance/golden/bpmn_layout.json` — the Rust layout fixtures.

The Rust BPMN layout engine (`packages/rust/kymostudio-core/src/bpmn/bpmn_layout.rs`)
is validated against Python, the reference impl. But its input is the positionless
`bpmn { }` block AST produced by the DSL parser, and Rust has no DSL front-end yet
— so we can't drive it from `.kymo` like the Python/JS suites do.

Instead this script (Python, the sole golden writer) parses a set of `bpmn { }`
snippets, serializes BOTH the block AST (the Rust layout *input*) and the resolved
canonical model (the expected *output*), and writes them to the golden. The Rust
test deserializes the blocks, runs its layout, and compares its canonical model to
the expected one. Full `.kymo`-driven validation lands when a Rust DSL parser does.

Run from the repo root:

    cd packages/python && uv run python ../../conformance/gen_bpmn_layout.py
"""
from __future__ import annotations

import json
from pathlib import Path

from kymo.bpmn_layout import layout as layout_bpmn
from kymo.dsl import parse as parse_dsl
from kymo.to_kymojson import model_dict as canonical_model

REPO_ROOT = Path(__file__).resolve().parent.parent
GOLDEN = REPO_ROOT / "conformance" / "golden" / "bpmn_layout.json"

# ── Fixtures: name → bpmn-block .kymo source ─────────────────────────────────
# Each exercises a distinct layout path: linear trunk, split/join branches, a
# back-edge cycle, multi-segment (dummy node) edges, pins, message/association
# flows, and multiple stacked blocks. The repo sample is included verbatim.
FIXTURES: dict[str, str] = {
    "linear": """
bpmn {
  start S "Start"
  task  A "A"
  task  B "B"
  end   E "End"
  S -> A -> B -> E
}
""",
    "split_join": """
bpmn {
  start S "Start"
  xor   G "Branch?"
  task  A "Yes path"
  task  B "No path"
  and   J "Join"
  end   E "End"
  S -> G
  G -> A : "yes"
  G -> B : "no"
  A -> J ; B -> J
  J -> E
}
""",
    "cycle": """
bpmn {
  start S "Start"
  task  A "A"
  task  B "B"
  task  C "C"
  end   E "End"
  S -> A -> B -> C -> E
  C -> A
}
""",
    "long_edge": """
bpmn {
  start S "Start"
  task  A "A"
  task  B "B"
  task  C "C"
  end   E "End"
  S -> A -> B -> C -> E
  S -> E
}
""",
    "pins": """
bpmn {
  start S "Start"
  task  A "Pinned" @ (500,300)
  end   E "End"
  S -> A -> E
}
""",
    "flows": """
bpmn {
  start S "Start"
  task  A "A"
  note  N "Annotation"
  end   E "End"
  S -> A -> E
  A ~> N
  A ..> N
}
""",
    "multi_block": """
bpmn {
  start S1 "Start 1"
  task  A1 "A1"
  end   E1 "End 1"
  S1 -> A1 -> E1
}
bpmn {
  start S2 "Start 2"
  task  A2 "A2"
  end   E2 "End 2"
  S2 -> A2 -> E2
}
""",
}


def serialize_block(block) -> dict:
    return {
        "nodes": [
            {
                "id": n.id,
                "label": n.label,
                "shape": n.shape,
                "marker": n.marker,
                "pin": list(n.pin) if n.pin is not None else None,
            }
            for n in block.nodes
        ],
        "flows": [
            {"src": f.src, "dst": f.dst, "flow": f.flow, "label": f.label}
            for f in block.flows
        ],
    }


def build_entry(source: str) -> dict:
    diagram, layout_spec, _ = parse_dsl(source)
    blocks = [serialize_block(b) for b in diagram.bpmn_blocks]
    assert blocks, "fixture has no bpmn { } block"
    layout_bpmn(diagram)  # resolves blocks → positioned components/edges, in place
    return {"blocks": blocks, "model": canonical_model(diagram)}


def main() -> None:
    out: dict[str, dict] = {}
    for name, source in FIXTURES.items():
        out[name] = build_entry(source)
    # The repo sample, read in place.
    sample = (REPO_ROOT / "samples" / "order-flow.kymo").read_text(encoding="utf-8")
    out["order-flow"] = build_entry(sample)

    GOLDEN.parent.mkdir(parents=True, exist_ok=True)
    GOLDEN.write_text(
        json.dumps(out, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {GOLDEN} ({len(out)} fixtures)")


if __name__ == "__main__":
    main()

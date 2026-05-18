"""Entry point: `uv run generate.py [target] [--animate]`

Targets:
  container  (default) → ./out/container-diagram.svg
  aiq                  → ../diagrams/references/nvidia-aiq.svg  (AIQ replica)

Flags:
  --animate            Emit a `-animated.svg` companion with flowing edge
                       dashes (CSS `stroke-dashoffset` animation). Static
                       SVG (no JS); animation runs in any modern browser.
"""
import sys
from importlib import import_module
from pathlib import Path

from alignment import resolve_alignments
from layout import layout
from render import render


TARGETS = {
    "container": {
        "module":  "data",
        "out":     "out/container-diagram.svg",
    },
    "aiq": {
        "module":  "aiq",
        "out":     "references/nvidia-aiq.svg",
    },
    "aws": {
        "module":  "aws",
        "out":     "references/aws-1.svg",
    },
    "aws-region": {
        "module":  "aws_region",
        "out":     "out/aws-region.svg",
    },
}


def main() -> None:
    args     = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags    = {a for a in sys.argv[1:] if a.startswith("--")}
    target   = args[0] if args else "container"
    animate  = "--animate" in flags

    if target not in TARGETS:
        print(f"unknown target: {target!r}; choose from {list(TARGETS)}")
        sys.exit(1)

    spec = TARGETS[target]
    mod = import_module(spec["module"])

    # 1. Auto-layout (if a LAYOUT spec is provided)
    if getattr(mod, "LAYOUT", None):
        layout(mod.DIAGRAM, mod.LAYOUT, getattr(mod, "EXTERNAL_LAYOUT", None))

    # 2. Resolve local parent/child alignment — runs in both modes
    resolve_alignments(mod.DIAGRAM)

    svg = render(mod.DIAGRAM, animate=animate)

    # `--animate` writes a sibling file `<stem>-animated.svg` so the
    # static and animated versions can co-exist.
    out_rel = spec["out"]
    if animate:
        p = Path(out_rel)
        out_rel = str(p.with_stem(p.stem + "-animated"))
    out = Path(__file__).parent / out_rel
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg, encoding="utf-8")

    rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
    suffix = " (animated)" if animate else ""
    print(f"✓ [{target}{suffix}] wrote {rel}  ({mod.DIAGRAM.width}×{mod.DIAGRAM.height}, {len(svg):,} bytes)")


if __name__ == "__main__":
    main()

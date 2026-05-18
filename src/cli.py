"""Entry point: `axo <path> [--animate]`

Argument is a path to a `.diagram` (DSL) or `.py` (Python form) source.
Output is a SVG written next to the input file:

    axo samples/aws_1.diagram             → samples/aws_1.svg
    axo samples/aws_1.diagram --animate   → samples/aws_1-animated.svg

`--animate` emits a `-animated.svg` companion with flowing edge dashes
(CSS `stroke-dashoffset` animation). Static SVG (no JS); animation runs
in any modern browser.
"""
import sys
from importlib import import_module
from pathlib import Path

from alignment import resolve_alignments
from dsl import parse as parse_dsl
from layout import layout
from to_svg import render


def load(source: Path) -> tuple[object, object | None, object | None]:
    """Load a diagram source. Returns (DIAGRAM, LAYOUT, EXTERNAL_LAYOUT)."""
    if source.suffix == ".diagram":
        return parse_dsl(source.read_text(encoding="utf-8"))
    # For .py sources, the file's parent directory must be on sys.path so the
    # module can import its siblings (e.g. samples/data.py importing model).
    sys.path.insert(0, str(source.parent))
    mod = import_module(source.stem)
    return mod.DIAGRAM, getattr(mod, "LAYOUT", None), getattr(mod, "EXTERNAL_LAYOUT", None)


def main() -> None:
    args  = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}

    if not args or "--help" in flags or "-h" in flags:
        print(__doc__)
        sys.exit(0 if args else 1)

    src = Path(args[0])
    if not src.exists():
        print(f"not found: {src}")
        sys.exit(1)
    if src.suffix not in (".diagram", ".py"):
        print(f"unsupported source: {src} (expected .diagram or .py)")
        sys.exit(1)

    animate = "--animate" in flags

    diagram, layout_spec, external_layout = load(src)
    if layout_spec:
        layout(diagram, layout_spec, external_layout)
    resolve_alignments(diagram)

    svg = render(diagram, animate=animate)

    out = src.with_suffix(".svg")
    if animate:
        out = out.with_stem(out.stem + "-animated")
    out.write_text(svg, encoding="utf-8")

    rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
    suffix = " (animated)" if animate else ""
    print(f"✓ wrote {rel}{suffix}  ({diagram.width}×{diagram.height}, {len(svg):,} bytes)")


if __name__ == "__main__":
    main()

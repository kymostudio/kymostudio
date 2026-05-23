"""Entry point: `kymo <path> [--animate] [--figma] [--excalidraw]`

Argument is a path to a `.kymo` (DSL), `.bpmn` (BPMN 2.0 XML), or
`.py` (Python form) source. Output is a SVG (or Figma Plugin JS /
Excalidraw scene) written next to the input file:

    kymo samples/aws_1.kymo                → samples/aws_1.svg
    kymo samples/aws_1.kymo --animate      → samples/aws_1-animated.svg
    kymo samples/aws_1.kymo --figma        → samples/aws_1.figma.js
    kymo samples/aws_1.kymo --excalidraw   → samples/aws_1.excalidraw
    kymo samples/order.bpmn                    → samples/order.svg

`.bpmn` files are imported via their Diagram-Interchange geometry
(`from_bpmn.py`), so positions come straight from the file — no layout
pass is run.

`--animate` emits a `-animated.svg` companion with flowing edge dashes
(CSS `stroke-dashoffset` animation). Static SVG (no JS); animation runs
in any modern browser.

`--figma` emits Figma Plugin API JavaScript. Pass it as the `code`
argument to the `use_figma` MCP tool, OR paste it into Figma's plugin
dev console (Plugins menu → Development → Open console).

`--excalidraw` emits an Excalidraw scene v2 JSON; open it directly in
excalidraw.com (Menu → Open) or the Excalidraw desktop app.
"""
import sys
from importlib import import_module
from pathlib import Path

from .alignment import resolve_alignments
from .dsl import parse as parse_dsl
from .layout import layout
from .to_excalidraw import render as render_excalidraw
from .to_figma import render as render_figma
from .to_svg import render


def load(source: Path) -> tuple[object, object | None, object | None]:
    """Load a diagram source. Returns (DIAGRAM, LAYOUT, EXTERNAL_LAYOUT)."""
    if source.suffix == ".bpmn":
        from .from_bpmn import parse as parse_bpmn
        # BPMN files carry their own geometry — already resolved, no layout.
        return parse_bpmn(source.read_text(encoding="utf-8")), None, None
    if source.suffix == ".kymo":
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
    if src.suffix not in (".kymo", ".py", ".bpmn"):
        print(f"unsupported source: {src} (expected .kymo, .bpmn or .py)")
        sys.exit(1)

    animate    = "--animate"    in flags
    figma      = "--figma"      in flags
    excalidraw = "--excalidraw" in flags

    diagram, layout_spec, external_layout = load(src)
    had_bpmn = bool(getattr(diagram, "bpmn_blocks", None))
    if had_bpmn:
        from .bpmn_layout import layout as layout_bpmn
        layout_bpmn(diagram)
    if layout_spec:
        layout(diagram, layout_spec, external_layout)
    # BPMN diagrams arrive fully positioned — from DI geometry (`.bpmn`) or our
    # `bpmn { }` block layout. The alignment/auto-size passes assume
    # DSL-authored nodes and would perturb the already-absolute geometry
    # (and `_auto_size_canvas` ignores `Edge.points`), so skip them.
    if src.suffix != ".bpmn" and not had_bpmn:
        resolve_alignments(diagram)

    if excalidraw:
        payload = render_excalidraw(diagram)
        out = src.with_suffix(".excalidraw")
        out.write_text(payload, encoding="utf-8")
        rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
        print(f"✓ wrote {rel} (excalidraw)  ({diagram.width}×{diagram.height}, {len(payload):,} bytes)")
        return

    if figma:
        payload = render_figma(diagram)
        out = src.with_suffix(".figma.js")
        out.write_text(payload, encoding="utf-8")
        rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
        print(f"✓ wrote {rel} (figma plugin js)  ({diagram.width}×{diagram.height}, {len(payload):,} bytes)")
        return

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

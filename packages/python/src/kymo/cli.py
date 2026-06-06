"""Entry point: `kymo <path> [out.png] [--animate] [--figma] [--excalidraw]`

Argument is a path to a `.kymo` (DSL), `.bpmn` (BPMN 2.0 XML), `.py`
(Python form), or `.svg` source. Output is a SVG (or Figma Plugin JS /
Excalidraw scene / PNG) written next to the input file:

    kymo samples/aws_1.kymo                → samples/aws_1.svg
    kymo samples/aws_1.kymo --animate      → samples/aws_1-animated.svg
    kymo samples/aws_1.kymo --figma        → samples/aws_1.figma.js
    kymo samples/aws_1.kymo --excalidraw   → samples/aws_1.excalidraw
    kymo samples/aws_1.kymo --json         → samples/aws_1.kymo.json
    kymo samples/aws_1.kymo.json               → samples/aws_1.svg
    kymo samples/order.bpmn                    → samples/order.svg

A second positional `*.png` path (or a `.svg` source) rasterizes to PNG
via resvg (kymostudio-core); optional `--scale N` / `-s N` (1.0 = intrinsic):

    kymo in.svg out.png                        → rasterize an existing SVG
    kymo in.svg                                → in.png (default name)
    kymo samples/aws_1.kymo out.png            → render then rasterize
    kymo samples/aws_1.kymo out.png -s 2       → 2× resolution

`.bpmn` files are imported via their Diagram-Interchange geometry
(`from_bpmn.py`), so positions come straight from the file — no layout
pass is run. `.kymo.json` files (the serialized resolved model, see
`from_kymojson.py`) are likewise already resolved — no layout pass.

`--json` emits a `.kymo.json` file: a versioned, lossless JSON serialization
of the resolved `Diagram` (the model both the DSL parser and the BPMN
importer produce). It can be re-loaded as a source and rendered to any target.

`--animate` emits a `-animated.svg` companion with flowing edge dashes
(CSS `stroke-dashoffset` animation). Static SVG (no JS); animation runs
in any modern browser.

`--figma` emits Figma Plugin API JavaScript. Pass it as the `code`
argument to the `use_figma` MCP tool, OR paste it into Figma's plugin
dev console (Plugins menu → Development → Open console).

`--excalidraw` emits an Excalidraw scene v2 JSON; open it directly in
excalidraw.com (Menu → Open) or the Excalidraw desktop app.

`kymo lint <file.bpmn> [...]` runs the BPMN linter instead of rendering:
it reports import-fidelity problems (shapes with no DI bounds, edges with
too few waypoints, dangling source/target refs, nodes/flows with no DI)
and BPMN structural issues (start with an incoming flow, end with an
outgoing flow, activities/gateways missing a flow, disconnected nodes,
processes with no start/end). It is informational and always exits 0.

The lint rule set is configurable: `--preset=all|recommended` picks a
preset, `--config=<.kymolintrc>` points at a JSON rc-file (bpmnlint-style
`extends` + `rules`, each rule `off|warn|error`); with neither flag, the
nearest `.kymolintrc` from the cwd upward is used, else every rule runs.
"""
import sys
from importlib import import_module
from pathlib import Path

from .alignment import resolve_alignments
from .dsl import parse as parse_dsl
from .layout import layout
from .to_bpmn import export as render_bpmn
from .to_excalidraw import render as render_excalidraw
from .to_figma import render as render_figma
from .to_kymojson import export as render_kymojson
from .to_svg import render


def load(source: Path) -> tuple[object, object | None, object | None]:
    """Load a diagram source. Returns (DIAGRAM, LAYOUT, EXTERNAL_LAYOUT)."""
    if source.suffix == ".bpmn":
        from .from_bpmn import parse as parse_bpmn
        # BPMN files carry their own geometry — already resolved, no layout.
        return parse_bpmn(source.read_text(encoding="utf-8")), None, None
    if source.suffix == ".json":
        from .from_kymojson import parse as parse_kymojson
        # .kymo.json holds a fully-resolved model — already positioned, no layout.
        return parse_kymojson(source.read_text(encoding="utf-8")), None, None
    if source.suffix == ".kymo":
        return parse_dsl(source.read_text(encoding="utf-8"))
    # For .py sources, the file's parent directory must be on sys.path so the
    # module can import its siblings (e.g. samples/data.py importing model).
    sys.path.insert(0, str(source.parent))
    mod = import_module(source.stem)
    return mod.DIAGRAM, getattr(mod, "LAYOUT", None), getattr(mod, "EXTERNAL_LAYOUT", None)


def _flag_value(flags: set[str], name: str) -> str | None:
    """Return the value of a ``--name=value`` flag, or None if absent.

    A bare ``--name`` (no ``=value``) is a usage error and exits 1.
    """
    for f in flags:
        if f == name:
            print(f"usage: {name}=<value>")
            sys.exit(1)
        if f.startswith(name + "="):
            return f.split("=", 1)[1]
    return None


def _lint_config(flags: set[str]):
    """Resolve the lint `Config` from --config=/--preset= flags or a .kymolintrc.

    Precedence: explicit ``--config=PATH`` > ``--preset=NAME`` > nearest
    ``.kymolintrc`` discovered from the cwd upward > default (every rule on).
    """
    from .lint_bpmn import (
        ConfigError,
        default_config,
        find_config,
        load_config,
        preset_config,
    )

    try:
        cfg_path = _flag_value(flags, "--config")
        preset = _flag_value(flags, "--preset")
        if cfg_path is not None:
            src = Path(cfg_path)
            if not src.is_file():
                print(f"config not found: {src}")
                sys.exit(1)
            return load_config(src)
        if preset is not None:
            return preset_config(preset)
        found = find_config(Path.cwd())
        return load_config(found) if found else default_config()
    except ConfigError as exc:
        print(f"lint config error: {exc}")
        sys.exit(1)


def _load_resolved(src: Path):
    """Load a source and run the layout/alignment passes → a positioned Diagram.

    Mirrors the back-end of the render flow: `.bpmn`/`.kymo.json` (and a
    resolved `bpmn { }` block) arrive already positioned, so the
    alignment/auto-size passes are skipped for them.
    """
    diagram, layout_spec, external_layout = load(src)
    had_bpmn = bool(getattr(diagram, "bpmn_blocks", None))
    if had_bpmn:
        from .bpmn_layout import layout as layout_bpmn
        layout_bpmn(diagram)
    if layout_spec:
        layout(diagram, layout_spec, external_layout)
    if src.suffix not in (".bpmn", ".json") and not had_bpmn:
        resolve_alignments(diagram)
    return diagram


def _extract_scale(argv: list[str]) -> tuple[float, list[str]]:
    """Pull a `--scale`/`-s` value out of argv (supports `--scale N`, `-s N`,
    `--scale=N`, `-s=N`); returns (scale, remaining-args). Default scale is 1.0."""
    def _parse(v: str) -> float:
        try:
            s = float(v)
        except ValueError:
            print(f"invalid scale: {v}")
            sys.exit(1)
        if s <= 0 or s != s or s == float("inf"):
            print(f"scale must be a positive number, got {v}")
            sys.exit(1)
        return s

    scale = 1.0
    out: list[str] = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--scale", "-s"):
            if i + 1 >= len(argv):
                print("missing value for --scale")
                sys.exit(1)
            scale = _parse(argv[i + 1])
            i += 2
            continue
        if a.startswith("--scale=") or a.startswith("-s="):
            scale = _parse(a.split("=", 1)[1])
            i += 1
            continue
        out.append(a)
        i += 1
    return scale, out


def _lint(paths: list[str], flags: set[str]) -> None:
    """`kymo lint <file.bpmn> ...` — report BPMN issues; always exit 0."""
    from .lint_bpmn import format_report, lint_file

    if not paths:
        print("usage: kymo lint [--config=<rc>] [--preset=all|recommended] <file.bpmn> [...]")
        sys.exit(1)
    config = _lint_config(flags)
    reports: list[str] = []
    for p in paths:
        src = Path(p)
        if not src.exists():
            print(f"not found: {src}")
            sys.exit(1)
        if src.suffix != ".bpmn":
            print(f"lint only supports .bpmn sources (got {src})")
            sys.exit(1)
        reports.append(format_report(str(src), lint_file(src, config)))
    print("\n\n".join(reports))
    sys.exit(0)


def main() -> None:
    # `kymo icons <verb>` — the icon command group (CR-ICONS-001 / FR-12).
    # `icons` is the ONLY reserved first token; every other first token is a
    # converter source path, so the verb-less converter grammar is unchanged.
    if sys.argv[1:2] == ["icons"]:
        from .icons_cli import run as run_icons
        sys.exit(run_icons(sys.argv[2:]))

    scale, rest = _extract_scale(sys.argv[1:])
    args  = [a for a in rest if not a.startswith("--")]
    flags = {a for a in rest if a.startswith("--")}

    if args and args[0] == "lint":
        _lint(args[1:], flags)
        return

    if not args or "--help" in flags or "-h" in flags:
        print(__doc__)
        sys.exit(0 if args else 1)

    src = Path(args[0])
    if not src.exists():
        print(f"not found: {src}")
        sys.exit(1)
    if src.suffix not in (".kymo", ".py", ".bpmn", ".json", ".svg"):
        print(f"unsupported source: {src} (expected .kymo, .kymo.json, .bpmn, .py or .svg)")
        sys.exit(1)

    # PNG rasterization path: `kymo in.svg out.png` or `kymo in.kymo out.png`.
    # Triggered by a `.svg` input (only rasterization makes sense for it) or by a
    # second positional output path ending in `.png`. A `.svg` source renders
    # directly; any other source is loaded + resolved + rendered to SVG first.
    out_arg = args[1] if len(args) > 1 else None
    png_mode = src.suffix == ".svg" or (out_arg is not None and out_arg.lower().endswith(".png"))
    if png_mode:
        if out_arg is not None and not out_arg.lower().endswith(".png"):
            print(f"PNG output expects a .png output path (got {out_arg})")
            sys.exit(1)
        try:
            from .to_png import render_png
        except ModuleNotFoundError:
            print("PNG output requires the kymostudio-core rasterizer. "
                  "Try: pip install --force-reinstall kymostudio-core")
            sys.exit(1)
        if src.suffix == ".svg":
            svg = src.read_text(encoding="utf-8")
            dims = ""
        else:
            diagram = _load_resolved(src)
            svg = render(diagram, animate=False)
            dims = f"{diagram.width}×{diagram.height}, "
        try:
            png = render_png(svg, scale)
        except ValueError as e:
            print(f"kymo: {e}")
            sys.exit(1)
        out = Path(out_arg) if out_arg else src.with_suffix(".png")
        out.write_bytes(png)
        rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
        sfx = f" scale {scale:g}" if scale != 1.0 else ""
        print(f"✓ wrote {rel} (png{sfx})  ({dims}{len(png):,} bytes)")
        return

    if src.suffix == ".svg":
        # Unreachable (a .svg source always sets png_mode) — guard for clarity.
        print("a .svg source can only be rendered to .png")
        sys.exit(1)

    animate    = "--animate"    in flags
    figma      = "--figma"      in flags
    excalidraw = "--excalidraw" in flags
    bpmn       = "--bpmn"       in flags
    json_out   = "--json"       in flags

    diagram = _load_resolved(src)

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

    if bpmn:
        payload = render_bpmn(diagram)
        out = src.with_suffix(".bpmn")
        if out.resolve() == src.resolve():            # don't clobber a .bpmn input
            out = src.with_name(src.stem + ".export.bpmn")
        out.write_text(payload, encoding="utf-8")
        rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
        print(f"✓ wrote {rel} (bpmn 2.0 xml)  ({diagram.width}×{diagram.height}, {len(payload):,} bytes)")
        return

    if json_out:
        payload = render_kymojson(diagram)
        out = src.with_name(src.stem + ".kymo.json")   # aiq.kymo / order.bpmn → *.kymo.json
        if out.resolve() == src.resolve():             # don't clobber a .kymo.json input
            out = src.with_name(src.stem + ".reexport.kymo.json")
        out.write_text(payload, encoding="utf-8")
        rel = out.relative_to(Path.cwd()) if out.is_relative_to(Path.cwd()) else out
        print(f"✓ wrote {rel} (kymo.json)  ({diagram.width}×{diagram.height}, {len(payload):,} bytes)")
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

/**
 * `kymo` executable — render a diagram source to SVG, or rasterize to PNG.
 * JS mirror of packages/python/src/kymo/cli.py's converter grammar (the PNG
 * subset). Hand-rolled parser, ZERO *required* runtime dependencies (NFR-3):
 * SVG output uses only this package + node built-ins.
 *
 *   kymo in.kymo                  → in.svg
 *   kymo in.bpmn out.svg          → render BPMN to SVG
 *   kymo in.kymo out.png          → render then rasterize to PNG
 *   kymo in.svg  out.png          → rasterize an existing SVG
 *   kymo in.svg                   → in.png
 *   kymo in.kymo out.png -s 2     → 2× resolution
 *
 * PNG output rasterizes via the `kymostudio-core` package (the wasm build of
 * the shared resvg engine — same output as the Python/Rust CLIs).
 */
import { readFileSync, writeFileSync } from "node:fs";

const USAGE = [
  "usage: kymo <input> [output] [--scale N]",
  "  <input>   .svg | .kymo | .bpmn | .kymo.json",
  "  <output>  .svg or .png; omitted → input name with .svg",
  "            (or .png when the input is a .svg)",
  "  -s, --scale N   PNG scale factor, 1.0 = intrinsic size (PNG output only)",
  "  -h, --help",
].join("\n");

/** Pop a `--scale`/`-s` value (supports `--scale N`, `-s N`, `--scale=N`). */
function popScale(argv) {
  let scale = 1.0;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scale" || a === "-s") {
      const v = argv[++i];
      if (v === undefined) throw new Error("missing value for --scale");
      scale = parseScale(v);
    } else if (a.startsWith("--scale=") || a.startsWith("-s=")) {
      scale = parseScale(a.slice(a.indexOf("=") + 1));
    } else {
      out.push(a);
    }
  }
  return { scale, rest: out };
}

function parseScale(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`scale must be a positive number, got ${v}`);
  return n;
}

/** Source → SVG string, dispatching by input extension. */
async function renderToSvg(input) {
  const lib = await import("../dist/index.js");
  const text = readFileSync(input, "utf-8");
  const low = input.toLowerCase();
  let diagram;
  if (low.endsWith(".bpmn")) diagram = lib.parseBpmn(text);
  else if (low.endsWith(".json")) diagram = lib.parseKymoJson(text);
  else if (low.endsWith(".kymo")) diagram = lib.parseDiagram(text);
  else throw new Error(`unsupported source: ${input} (expected .kymo, .kymo.json, .bpmn or .svg)`);
  return lib.renderSVG(diagram);
}

/**
 * Load the wasm rasterizer (`kymostudio-core`, a runtime dependency).
 * Returns `(svg, scale) => Uint8Array`; throws if the package can't be loaded.
 */
async function loadRaster() {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("kymostudio-core/kymostudio_core_bg.wasm");
  const mod = await import("kymostudio-core");
  await mod.default({ module_or_path: readFileSync(wasmPath) }); // __wbg_init
  return (svg, scale) => mod.svgToPng(new TextEncoder().encode(svg), scale);
}

export async function run(argv) {
  if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
    console.log(USAGE);
    return argv.length === 0 ? 1 : 0;
  }

  let scale, rest;
  try {
    ({ scale, rest } = popScale(argv));
  } catch (e) {
    console.error(`kymo: ${e.message}`);
    return 1;
  }
  const [input, output] = rest;
  if (!input) {
    console.error("kymo: missing input file\n\n" + USAGE);
    return 1;
  }

  const low = input.toLowerCase();
  const isSvgInput = low.endsWith(".svg");
  const pngMode = isSvgInput || (output !== undefined && output.toLowerCase().endsWith(".png"));

  // Produce the SVG string (read .svg directly, else render the source).
  let svg;
  try {
    svg = isSvgInput ? readFileSync(input, "utf-8") : await renderToSvg(input);
  } catch (e) {
    console.error(`kymo: ${e.message}`);
    return 1;
  }

  if (pngMode) {
    if (output !== undefined && !output.toLowerCase().endsWith(".png")) {
      console.error(`kymo: PNG output expects a .png output path (got ${output})`);
      return 1;
    }
    let raster;
    try {
      raster = await loadRaster();
    } catch (e) {
      console.error(`kymo: could not load the PNG rasterizer (kymostudio-core): ${e.message}`);
      return 1;
    }
    const png = raster(svg, scale);
    const out = output ?? input.replace(/\.svg$/i, ".png");
    writeFileSync(out, png);
    console.error(`${input} -> ${out} (${png.length} bytes${scale !== 1 ? `, scale ${scale}` : ""})`);
    return 0;
  }

  const out = output ?? input.replace(/\.[^.]+$/, ".svg");
  writeFileSync(out, svg);
  console.error(`${input} -> ${out} (${Buffer.byteLength(svg)} bytes)`);
  return 0;
}

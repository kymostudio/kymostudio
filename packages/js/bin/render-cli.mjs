/**
 * `kymo` executable — render a diagram source to SVG, or convert to PNG / PDF.
 * JS mirror of packages/python/src/kymo/cli.py's converter grammar. Hand-rolled
 * parser, ZERO *required* runtime dependencies (NFR-3): SVG output uses only
 * this package + node built-ins.
 *
 *   kymo in.kymo                  → in.svg
 *   kymo in.bpmn out.svg          → render BPMN to SVG
 *   kymo in.kymo out.png          → render then rasterize to PNG
 *   kymo in.svg  out.png          → rasterize an existing SVG
 *   kymo in.svg                   → in.png
 *   kymo in.kymo out.png -s 2     → 2× resolution
 *   kymo in.kymo out.pdf          → render then convert to vector PDF
 *   kymo in.svg  out.pdf          → convert an existing SVG to PDF
 *
 * The output format follows the output path's extension (`.pdf` → vector PDF,
 * otherwise PNG). Both go through the `kymostudio-core` package (the wasm build
 * of the shared resvg/svg2pdf engine — same output as the Python/Rust CLIs).
 */
import { readFileSync, writeFileSync } from "node:fs";

const USAGE = [
  "usage: kymo <input> [output] [--scale N]",
  "  <input>   .svg | .kymo | .bpmn | .kymo.json | .mmd",
  "  <output>  .svg, .png or .pdf; omitted → input name with .svg",
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

/** Initialize the wasm core synchronously (BPMN import/layout/render delegate to it). */
async function initCore(lib) {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("kymostudio-core/kymostudio_core_bg.wasm");
  lib.initSync(readFileSync(wasmPath));
}

/** Source → SVG string, dispatching by input extension. */
async function renderToSvg(input) {
  const lib = await import("../dist/index.js");
  const text = readFileSync(input, "utf-8");
  const low = input.toLowerCase();
  // BPMN import + `bpmn { }` layout (in .bpmn / .kymo) delegate to the wasm core,
  // which must be initialized before the synchronous parse calls.
  const isMermaid = low.endsWith(".mmd") || low.endsWith(".mermaid");
  if (low.endsWith(".bpmn") || low.endsWith(".kymo") || isMermaid) await initCore(lib);
  let diagram;
  if (low.endsWith(".bpmn")) diagram = lib.parseBpmn(text);
  else if (low.endsWith(".json")) diagram = lib.parseKymoJson(text);
  else if (isMermaid) diagram = lib.parseMermaid(text);
  else if (low.endsWith(".kymo")) diagram = lib.parseDiagram(text);
  else throw new Error(`unsupported source: ${input} (expected .kymo, .kymo.json, .bpmn, .mmd or .svg)`);
  return lib.renderSVG(diagram);
}

/**
 * Load and initialize the wasm core (`kymostudio-core`, a runtime dependency).
 * Returns the initialized module (with `svgToPng`, and `svgToPdf` on core
 * >= 0.4); throws if the package can't be loaded.
 */
async function loadCore() {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("kymostudio-core/kymostudio_core_bg.wasm");
  const mod = await import("kymostudio-core");
  await mod.default({ module_or_path: readFileSync(wasmPath) }); // __wbg_init
  return mod;
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
  const outLow = output?.toLowerCase();
  const pdfMode = outLow !== undefined && outLow.endsWith(".pdf");
  // A bare `.svg` source defaults to PNG; a `.pdf` output path overrides that.
  const pngMode = !pdfMode && (isSvgInput || (outLow !== undefined && outLow.endsWith(".png")));

  // Produce the SVG string (read .svg directly, else render the source).
  let svg;
  try {
    svg = isSvgInput ? readFileSync(input, "utf-8") : await renderToSvg(input);
  } catch (e) {
    console.error(`kymo: ${e.message}`);
    return 1;
  }

  if (pdfMode) {
    let mod;
    try {
      mod = await loadCore();
    } catch (e) {
      console.error(`kymo: could not load the SVG engine (kymostudio-core): ${e.message}`);
      return 1;
    }
    if (typeof mod.svgToPdf !== "function") {
      console.error("kymo: PDF output requires kymostudio-core >= 0.4 (svgToPdf missing)");
      return 1;
    }
    const pdf = mod.svgToPdf(new TextEncoder().encode(svg));
    writeFileSync(output, pdf);
    console.error(`${input} -> ${output} (${pdf.length} bytes)`);
    return 0;
  }

  if (pngMode) {
    if (output !== undefined && !outLow.endsWith(".png")) {
      console.error(`kymo: PNG output expects a .png output path (got ${output})`);
      return 1;
    }
    let mod;
    try {
      mod = await loadCore();
    } catch (e) {
      console.error(`kymo: could not load the PNG rasterizer (kymostudio-core): ${e.message}`);
      return 1;
    }
    const png = mod.svgToPng(new TextEncoder().encode(svg), scale);
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

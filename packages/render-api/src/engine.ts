// The self-hosted render engine: kymostudio JS (kymo DSL → SVG) + the
// kymostudio-core wasm (mermaid/d2/dot/bpmn → SVG, SVG → PNG/PDF).
//
// workerd cannot compile wasm at runtime — the import below hands us a
// deploy-time-compiled WebAssembly.Module (wrangler's CompiledWasm rule), and
// initSync only instantiates it. Never call the glue's async init(): its
// default path fetches a relative URL, which has nothing to resolve against
// here. kymostudio's initSync marks the JS lib ready AND instantiates the
// same core glue (one shared node_modules copy), so one call powers both.
import mermanWasm from "kymo-mermaid/kymo_mermaid_bg.wasm";
import { initSync as mermanInit, mermaidToSvgAuto } from "kymo-mermaid";
import svgbobWasm from "kymo-svgbob/kymo_svgbob_bg.wasm";
import { initSync as svgbobInit, svgbobToSvg } from "kymo-svgbob";
import wasmModule from "kymostudio-core/kymostudio_core_bg.wasm";
import {
  bpmnImport,
  bpmnRender,
  d2ToSvg,
  mermaidToSvg,
  mermaidToSvgDagre,
  mermaidSequenceToSvg,
  mermaidStateToSvg,
  mermaidClassToSvg,
  mermaidErToSvg,
  mermaidBlockToSvg,
  mermaidMindmapToSvg,
  mermaidKanbanToSvg,
  mermaidRequirementToSvg,
  registerFont,
  svgToPdf,
  svgToPng,
} from "kymostudio-core";
import { initSync, parseDiagram, renderSVG, setIconBaseURL, setManifest } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";

import fontRegular from "../fonts/Roboto-Regular.ttf";
import fontBold from "../fonts/Roboto-Bold.ttf";
import { HttpError } from "./http.js";

const ICON_BASE = "https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons";

let ready = false;

/** Lazy, idempotent, synchronous engine init (per isolate). */
export function ensure(): void {
  if (ready) return;
  initSync(wasmModule);
  svgbobInit({ module: svgbobWasm });
  mermanInit({ module: mermanWasm });
  // The wasm build has no system fonts and resvg ignores @font-face — without
  // these, PNG/PDF output silently drops every <text>. Roboto is named in the
  // renderers' font stacks, and the first face also becomes the generic
  // sans-serif fallback (lib.rs load_extra_fonts).
  registerFont(new Uint8Array(fontRegular));
  registerFont(new Uint8Array(fontBold));
  setManifest(manifest as Parameters<typeof setManifest>[0]);
  setIconBaseURL(ICON_BASE);
  ready = true;
}

// First non-comment keyword of a mermaid source (after optional `---` YAML
// front-matter) — routes grammars kymo renders itself away from merman.
function mermaidGrammar(source: string): string {
  const lines = source.split("\n");
  let i = 0;
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%")) continue;
    return t.split(/[\s{(:]/)[0].toLowerCase();
  }
  return "";
}

/** kind → local SVG renderer. Throws the engine's message on bad source. */
export const SELF_RENDERERS: Record<string, (source: string) => string | Promise<string>> = {
  // renderSVG is async: kymo sources can reference icon sets, fetched from
  // the CDN on first use and cached in-isolate.
  kymo: (source) => {
    ensure();
    return renderSVG(parseDiagram(source));
  },
  // Flowcharts render through kymo's own Rust engine (mermaidToSvgDagre: dagre
  // layout + mermaid-faithful style, ~0.2% pixel-overlay vs mermaid.js): text-based
  // SVG, so PNG/PDF keep their labels — merman emits HTML labels in
  // <foreignObject>, which the rasterizer (resvg/svg2pdf) silently drops. Every
  // other grammar still goes through merman's full engine; if kymo cannot parse
  // a given flowchart (e.g. the A-->B&C fan syntax), fall through to merman too.
  mermaid: (source) => {
    ensure();
    const grammar = mermaidGrammar(source);
    try {
      if (grammar === "flowchart" || grammar === "graph") return mermaidToSvgDagre(source);
      if (grammar === "sequencediagram") return mermaidSequenceToSvg(source);
      if (grammar === "statediagram" || grammar === "statediagram-v2")
        return mermaidStateToSvg(source);
      if (grammar === "classdiagram" || grammar === "classdiagram-v2")
        return mermaidClassToSvg(source);
      if (grammar === "erdiagram") return mermaidErToSvg(source);
      if (grammar === "block" || grammar === "block-beta") return mermaidBlockToSvg(source);
      if (grammar === "mindmap") return mermaidMindmapToSvg(source);
      if (grammar === "kanban") return mermaidKanbanToSvg(source);
      if (grammar === "requirement" || grammar === "requirementdiagram")
        return mermaidRequirementToSvg(source);
    } catch {
      // unsupported syntax for kymo's engine → fall through to merman
    }
    return mermaidToSvgAuto(source);
  },
  d2: (source) => {
    ensure();
    return d2ToSvg(source);
  },
  bpmn: (source) => {
    ensure();
    return bpmnRender(bpmnImport(source), false, null);
  },
  // The same Rust crate kroki runs natively, compiled to wasm
  // (packages/rust/kymo-svgbob) — authoritative.
  svgbob: (source) => {
    ensure();
    return svgbobToSvg(source);
  },
};

// CPU/memory guard for the rasterizer: reject raster targets beyond this many
// pixels per side before handing resvg a giant pixmap.
const MAX_RASTER_SIDE = 8192;

function intrinsicSize(svg: string): { width: number; height: number } | null {
  const m = svg.match(/<svg[^>]*?\swidth="([\d.]+)(?:px)?"[^>]*?\sheight="([\d.]+)(?:px)?"/);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

export function toPng(svg: string, scale: number): Uint8Array {
  ensure();
  const size = intrinsicSize(svg);
  if (size && (size.width * scale > MAX_RASTER_SIDE || size.height * scale > MAX_RASTER_SIDE)) {
    throw new HttpError(400, `raster output too large (max ${MAX_RASTER_SIDE}px per side — lower ?scale=)`);
  }
  return svgToPng(new TextEncoder().encode(svg), scale);
}

export function toPdf(svg: string): Uint8Array {
  ensure();
  return svgToPdf(new TextEncoder().encode(svg));
}

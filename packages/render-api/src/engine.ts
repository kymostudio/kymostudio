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
import { initSync as mermanInit, mermaidRenderSvg } from "kymo-mermaid";
import svgbobWasm from "kymo-svgbob/kymo_svgbob_bg.wasm";
import { initSync as svgbobInit, svgbobToSvg } from "kymo-svgbob";
import wasmModule from "kymostudio-core/kymostudio_core_bg.wasm";
import {
  bpmnImport,
  bpmnRender,
  d2ToSvg,
  dotToSvg,
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

/** kind → local SVG renderer. Throws the engine's message on bad source. */
export const SELF_RENDERERS: Record<string, (source: string) => string | Promise<string>> = {
  // renderSVG is async: kymo sources can reference icon sets, fetched from
  // the CDN on first use and cached in-isolate.
  kymo: (source) => {
    ensure();
    return renderSVG(parseDiagram(source));
  },
  // merman's full engine (all grammars, mermaid-11 look) — the core's
  // flowchart-only mermaidToSvg is superseded here; kroki fallback stays for
  // anything merman still rejects.
  mermaid: (source) => {
    ensure();
    return mermaidRenderSvg(source);
  },
  d2: (source) => {
    ensure();
    return d2ToSvg(source);
  },
  graphviz: (source) => {
    ensure();
    return dotToSvg(source);
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

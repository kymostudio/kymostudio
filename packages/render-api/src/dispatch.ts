// kind → self-render or kroki.io. The local engine covers the kymo DSL plus
// the flowchart slices of mermaid/d2/graphviz and full BPMN; when it rejects a
// source (e.g. a mermaid sequenceDiagram — the local grammar is flowchart-only)
// the request falls through to kroki, which renders every grammar. So local
// coverage is a latency/cost win, never a compatibility loss.
import { SELF_RENDERERS as WASM_RENDERERS, toPdf, toPng } from "./engine.js";
import { CONTENT_TYPES, HttpError, type Format } from "./http.js";
import { JS_RENDERERS } from "./js-engines.js";
import type { RenderRequest } from "./kroki.js";
import { proxyKroki } from "./proxy.js";

const SELF_RENDERERS = { ...WASM_RENDERERS, ...JS_RENDERERS };

// Kinds whose local engine IS the engine kroki runs (the upstream package,
// bundled). A source it rejects would be rejected by kroki identically, so
// the error is final — no fallback round-trip. The wasm kinds stay out of
// this set: their grammars are subsets (mermaid = flowchart only, …) and
// kroki may accept what they reject.
const AUTHORITATIVE = new Set(["bytefield", "nomnoml", "svgbob", "vega", "vegalite", "wavedrom"]);

/** Kinds rendered in this worker — exported for the usage doc. */
export const SELF_KINDS = Object.keys(SELF_RENDERERS).sort();

// Every kind the editor offers (packages/editor/web/kroki.ts KINDS) renders
// through kroki.io except kymo, which only exists here.
const PROXY_KINDS = new Set([
  "actdiag",
  "blockdiag",
  "bpmn",
  "bytefield",
  "c4plantuml",
  "d2",
  "dbml",
  "ditaa",
  "erd",
  "excalidraw",
  "graphviz",
  "mermaid",
  "nomnoml",
  "nwdiag",
  "packetdiag",
  "pikchr",
  "plantuml",
  "rackdiag",
  "seqdiag",
  "structurizr",
  "svgbob",
  "symbolator",
  "tikz",
  "umlet",
  "vega",
  "vegalite",
  "wavedrom",
  "wireviz",
]);

export function isKnownKind(kind: string): boolean {
  return kind in SELF_RENDERERS || PROXY_KINDS.has(kind);
}

export async function render({ kind, format, source, scale }: RenderRequest): Promise<Response> {
  const self = SELF_RENDERERS[kind];

  if (!self) {
    if (!PROXY_KINDS.has(kind)) throw new HttpError(400, `unsupported diagram type "${kind}"`);
    return proxyKroki(kind, format, source);
  }

  let svg: string;
  try {
    svg = await self(source);
  } catch (e) {
    // kymo only exists here and AUTHORITATIVE kinds run kroki's own engine —
    // those parse errors are final. For the subset grammars (mermaid
    // flowchart, d2, dot), kroki may still accept what the local engine
    // rejected, so fall through.
    if (!PROXY_KINDS.has(kind) || AUTHORITATIVE.has(kind)) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
    return proxyKroki(kind, format, source);
  }

  const body = format === "svg" ? svg : format === "png" ? toPng(svg, scale) : toPdf(svg);
  return new Response(body as BodyInit, { headers: { "content-type": CONTENT_TYPES[format] } });
}

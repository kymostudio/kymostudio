// kind → self-render or kroki.io. The local engine covers the kymo DSL plus
// the flowchart slices of mermaid/d2/graphviz and full BPMN; when it rejects a
// source (e.g. a mermaid sequenceDiagram — the local grammar is flowchart-only)
// the request falls through to kroki, which renders every grammar. So local
// coverage is a latency/cost win, never a compatibility loss.
import { SELF_RENDERERS, toPdf, toPng } from "./engine.js";
import { CONTENT_TYPES, HttpError, type Format } from "./http.js";
import type { RenderRequest } from "./kroki.js";
import { proxyKroki } from "./proxy.js";

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
    // kymo only exists here — its parse errors are final. For the shared
    // kinds, kroki may still accept what the local subset rejected.
    if (!PROXY_KINDS.has(kind)) {
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
    return proxyKroki(kind, format, source);
  }

  const body = format === "svg" ? svg : format === "png" ? toPng(svg, scale) : toPdf(svg);
  return new Response(body as BodyInit, { headers: { "content-type": CONTENT_TYPES[format] } });
}

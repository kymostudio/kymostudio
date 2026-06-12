import DOMPurify from "dompurify";
import { RENDER_API } from "./const";

// Diagram kinds: "kymo" renders locally (wasm); everything else goes through
// the free https://kroki.io render API (POST source, get SVG back).
export const KINDS: { value: string; label: string }[] = [
  { value: "kymo", label: "Kymo" },
  { value: "actdiag", label: "ActDiag" },
  { value: "blockdiag", label: "BlockDiag" },
  { value: "bpmn", label: "BPMN" },
  { value: "bytefield", label: "Bytefield" },
  { value: "c4plantuml", label: "C4 (PlantUML)" },
  { value: "d2", label: "D2" },
  { value: "dbml", label: "DBML" },
  { value: "ditaa", label: "Ditaa" },
  { value: "erd", label: "Erd" },
  { value: "excalidraw", label: "Excalidraw" },
  { value: "graphviz", label: "GraphViz" },
  { value: "mermaid", label: "Mermaid" },
  { value: "nomnoml", label: "Nomnoml" },
  { value: "nwdiag", label: "NwDiag" },
  { value: "packetdiag", label: "PacketDiag" },
  { value: "pikchr", label: "Pikchr" },
  { value: "plantuml", label: "PlantUML" },
  { value: "rackdiag", label: "RackDiag" },
  { value: "seqdiag", label: "SeqDiag" },
  { value: "structurizr", label: "Structurizr" },
  { value: "svgbob", label: "Svgbob" },
  { value: "symbolator", label: "Symbolator" },
  { value: "tikz", label: "TikZ" },
  { value: "umlet", label: "UMlet" },
  { value: "vega", label: "Vega" },
  { value: "vegalite", label: "Vega-Lite" },
  { value: "wavedrom", label: "WaveDrom" },
  { value: "wireviz", label: "WireViz" },
];

export function kindLabel(kind: string): string {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

// Kroki SVG is rendered from source we don't control (share links put the source
// in the URL, so it can be an attacker's). Strip scripts, event handlers and
// javascript: URLs before the markup is injected into the page. foreignObject
// must stay: Mermaid (htmlLabels) puts every node/edge label in HTML inside one,
// so its content is sanitized with the html profile instead of being dropped —
// DOMPurify only treats SVG→HTML transitions as valid at HTML_INTEGRATION_POINTS,
// which by default excludes foreignObject.
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    ADD_TAGS: ["use", "foreignObject"],
    HTML_INTEGRATION_POINTS: { "annotation-xml": true, foreignobject: true },
  });
}

declare global {
  interface Window {
    __earlyKroki?: Promise<{ kind: string; src: string; res: Promise<Response> }>;
  }
}

// (Also consumed by web/mermaid.ts, which races this warm-up against a local
// mermaid.js render.)
// index.html fires the first share-link render at kroki before this bundle has
// even downloaded (inline script there). Adopt that in-flight response when the
// first real render asks for exactly the same diagram; on any mismatch leave it
// in place — a later render with the matching source may still claim it.
export async function earlyResponse(kind: string, source: string): Promise<Response | null> {
  const early = window.__earlyKroki;
  if (!early) return null;
  try {
    const e = await early;
    if (e.kind !== kind || e.src !== source) return null;
    window.__earlyKroki = undefined; // single use: a re-render must hit kroki again
    return await e.res;
  } catch {
    window.__earlyKroki = undefined; // dead warm-up — fall back to a fresh request
    return null;
  }
}

function postRender(base: string, kind: string, source: string): Promise<Response> {
  return fetch(`${base}/${encodeURIComponent(kind)}/svg`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: source,
  });
}

export async function renderKroki(kind: string, source: string): Promise<string> {
  // Proxy first (edge-cached by content hash — repeat share-link loads skip
  // kroki's server render); fall back to kroki.io directly if the proxy is
  // unreachable or broken, so the worker is never a single point of failure.
  let r = await earlyResponse(kind, source);
  if (r && r.status >= 500) r = null; // dead upstream on the warm-up — retry through the fallback chain
  if (!r) {
    try {
      r = await postRender(RENDER_API, kind, source);
      if (r.status >= 500) throw new Error(`proxy ${r.status}`);
    } catch {
      r = await postRender("https://kroki.io", kind, source);
    }
  }
  const text = await r.text();
  if (!r.ok) throw new Error(text.trim() || `kroki ${r.status}`);
  return text;
}

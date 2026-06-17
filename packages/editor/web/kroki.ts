import DOMPurify from "dompurify";
import { DOCS_URL, RENDER_API } from "./const";

// Diagram kinds: "kymo" renders locally (wasm); everything else goes through
// the render API (render.kymo.studio, kroki-compatible — POST source, get SVG
// back; kinds the worker doesn't self-render are relayed to kroki.io).
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

// File extension per diagram kind, so Explorer/Recent read like real files
// (hello.kymo, order.bpmn, flow.mmd). Unmapped kinds fall back to the kind name.
const KIND_EXT: Record<string, string> = {
  kymo: "kymo", mermaid: "mmd", bpmn: "bpmn",
  c4plantuml: "puml", plantuml: "puml", structurizr: "dsl",
  d2: "d2", dbml: "dbml", erd: "er", graphviz: "dot", excalidraw: "excalidraw",
  vega: "vega.json", vegalite: "vl.json", wavedrom: "json",
  actdiag: "diag", blockdiag: "diag", nwdiag: "diag", rackdiag: "diag", packetdiag: "diag", seqdiag: "diag",
};
export function extFor(kind?: string): string {
  return (kind && KIND_EXT[kind]) || kind || "kymo";
}

// Syntax help for a kind: kymo/bpmn → our own docs; the rest → the format's
// canonical upstream reference, so a stuck user always has a working exit.
const UPSTREAM_DOCS: Record<string, string> = {
  mermaid: "https://mermaid.js.org/intro/",
  plantuml: "https://plantuml.com/",
  c4plantuml: "https://github.com/plantuml-stdlib/C4-PlantUML",
  d2: "https://d2lang.com/tour/intro/",
  graphviz: "https://graphviz.org/doc/info/lang.html",
  dbml: "https://dbml.dbdiagram.io/docs/",
  excalidraw: "https://docs.excalidraw.com/",
  vega: "https://vega.github.io/vega/docs/",
  vegalite: "https://vega.github.io/vega-lite/docs/",
  wavedrom: "https://wavedrom.com/tutorial.html",
  structurizr: "https://docs.structurizr.com/dsl",
  nomnoml: "https://www.nomnoml.com/",
  pikchr: "https://pikchr.org/home/doc/trunk/doc/userman.md",
};
export function docHref(kind: string): string {
  if (kind === "kymo" || kind === "bpmn") return DOCS_URL;
  // Every kroki-relayed kind (actdiag, nwdiag, erd, ditaa, …) is documented at kroki.io.
  return UPSTREAM_DOCS[kind] ?? "https://kroki.io/#support";
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
  const headers: Record<string, string> = { "content-type": "text/plain" };
  // Signed-in callers get the higher rate-limit tier via the session cookie
  // (CR-KEDITOR-002) — only ever to our own render API (same-site kymo.studio),
  // never the kroki.io fallback. The render output is identical for everyone, so
  // a missing/anonymous cookie just falls back to the per-IP tier.
  const init: RequestInit = { method: "POST", headers, body: source };
  if (base === RENDER_API) init.credentials = "include";
  return fetch(`${base}/${encodeURIComponent(kind)}/svg`, init);
}

export async function renderKroki(kind: string, source: string): Promise<string> {
  // Render API first (edge-cached by content hash, self-renders the kinds it
  // covers); fall back to kroki.io directly if it is unreachable or broken,
  // so the worker is never a single point of failure.
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

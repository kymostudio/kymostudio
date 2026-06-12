import DOMPurify from "dompurify";

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
// foreignObject before the markup is injected into the page.
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ["use"] });
}

export async function renderKroki(kind: string, source: string): Promise<string> {
  const r = await fetch(`https://kroki.io/${encodeURIComponent(kind)}/svg`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: source,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text.trim() || `kroki ${r.status}`);
  return text;
}

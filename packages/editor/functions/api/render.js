// Cloudflare Pages Function — POST /api/render { source } -> { svg } | { error }
// Replaces the Python render server. parseDiagram() parses the kymo DSL and, for
// flowchart { } blocks, resolves them via the kymostudio-core wasm (it calls
// coreResolveFlowchart internally); renderSVG() produces the SVG. The wasm is
// initialised synchronously from the bundled module. Icon glyphs resolve via
// fetch() to the jsDelivr CDN (available in the Worker runtime).
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasm from "kymostudio-core/kymostudio_core_bg.wasm";

initSync(wasm);
setManifest(manifest);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");

export async function onRequestPost({ request }) {
  let source = "";
  try { ({ source = "" } = await request.json()); } catch {}
  if (!source.trim()) return Response.json({ error: "empty source" }, { status: 400 });
  try {
    const diagram = parseDiagram(source);
    const svg = await renderSVG(diagram);
    return Response.json({ svg });
  } catch (e) {
    return Response.json({ error: String(e?.message ?? e) }, { status: 400 });
  }
}

// Dynamically imported (code-split) so the 8 MB wasm only loads on the editor route.
import { initSync, setManifest, setIconBaseURL, parseDiagram, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmBytes from "kymostudio-core/kymostudio_core_bg.wasm";

let ready = false;
function ensure() {
  if (ready) return;
  initSync(wasmBytes as any);
  setManifest(manifest as any);
  setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");
  ready = true;
}
export async function renderDiagram(source: string): Promise<string> {
  ensure();
  return await renderSVG(parseDiagram(source));
}

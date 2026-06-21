// Dynamically imported (code-split) so the wasm engine only loads when a kymo
// diagram actually renders. The .wasm itself is NOT bundled into this chunk:
// esbuild's file loader emits it as a separate immutable asset (build.sh) and
// we hand its URL to init() — the browser fetches it in parallel with this
// chunk and compiles it while it downloads (instantiateStreaming; Pages serves
// application/wasm). Embedding the bytes in JS cost ~1 MB extra on the wire.
import { init, setManifest, setIconBaseURL, parseDiagram, parseDbml, renderSVG } from "kymostudio";
import manifest from "kymostudio/icons-manifest.json";
import wasmUrl from "kymostudio-core/kymostudio_core_bg.wasm";

let ready: Promise<void> | null = null;
function ensure(): Promise<void> {
  // wasm-bindgen wants the URL via the object form ({ module_or_path }); the
  // positional-arg form still works but logs a deprecation warning.
  return (ready ??= init({ module_or_path: wasmUrl } as unknown as Parameters<typeof init>[0]).then(() => {
    setManifest(manifest as any);
    setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main/packages/icons");
  }));
}
export async function renderDiagram(source: string): Promise<string> {
  await ensure();
  return await renderSVG(parseDiagram(source));
}

// DBML (dbdiagram.io syntax) → ER diagram, rendered locally by the same JS
// engine. ER tables carry no icons and don't touch the wasm core, so this
// skips ensure() entirely — it renders offline and instantly.
// `positions` overrides table centres (drag-to-move state persisted per file).
export async function renderDbml(
  source: string,
  positions?: Record<string, [number, number]>,
): Promise<string> {
  return await renderSVG(parseDbml(source, positions));
}

// The parsed ER model (tables + field rows + FK edges), no wasm — used by the
// ghost-cursor simulate engine (er-simulate.ts) to diff old → new source.
export function parseDbmlModel(source: string, positions?: Record<string, [number, number]>): any {
  return parseDbml(source, positions);
}

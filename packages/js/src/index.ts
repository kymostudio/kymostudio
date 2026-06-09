/**
 * kymostudio — an independent TypeScript implementation of the diagram-as-code
 * toolkit (data model + icon library + SVG renderer + BPMN importer). It is
 * developed in parallel with the Python package at `packages/python/src/kymo/`
 * and kept at feature parity — not a port of it. The library is dependency-free;
 * the `kymo` CLI's PNG output rasterizes via the `kymostudio-core` wasm package.
 *
 * Public surface:
 *   - data model: `makeComponent`, `makeEdge`, `makeRegion`, `makeDiagram`,
 *     `anchor`, `resolveAnchors`, …
 *   - icons: `ICONS`, `getIcon`, `setIconBaseURL`, `setManifest`, `registerIcon`
 *   - renderer: `renderSVG`
 *   - DSL: `parse` (.kymo → Diagram + layout/external specs),
 *     `parseDiagram` (full pipeline → positioned Diagram), `layout`,
 *     `resolveAlignments`
 *   - BPMN import: `parseBpmn` (BPMN 2.0 `.bpmn` XML → Diagram)
 *   - BPMN export: `toBpmn` (Diagram → BPMN 2.0 `.bpmn` XML; inverse of import)
 *   - kymo.json: `toKymoJson` / `parseKymoJson` (resolved Diagram ⇄ `.kymo.json` IR)
 */
export * from "./model.js";
export * from "./icons-loader.js"; // ICONS, getIcon, setIconBaseURL, setManifest, registerIcon
export * from "./render.js";       // renderSVG
export { parse, parseDiagram, type ParseResult } from "./dsl.js";
export {
  layout, applyLayoutTree, minimizeCrossings, cellSize,
  type LayoutNode, type RegionLayout, type ExternalSpec, type LayoutOptions, type Cell,
} from "./layout.js";
export { resolveAlignments } from "./alignment.js";
// BPMN import/export/layout delegate to the Rust core (the single source of truth).
// Call `init()` (browser) or `initSync(bytes)` (Node) once before these synchronous
// functions; `renderSVG` auto-initializes its own BPMN path.
export {
  init, initSync,
  coreParseBpmn as parseBpmn,
  coreMermaidImport as parseMermaid,   // Mermaid flowchart source → Diagram
  coreMermaidToD2 as mermaidToD2,
  coreMermaidToDot as mermaidToDot,
  coreNormalizeMermaid as normalizeMermaid,
  coreMermaidToDrawio as mermaidToDrawio,
  coreDiagramToDrawio as diagramToDrawio,
  coreToBpmn as toBpmn,
  coreApplyLayout as bpmnLayout,
} from "./core.js";
export { toKymoJson, modelDict } from "./to-kymojson.js";  // Diagram → .kymo.json
export { parseKymoJson } from "./from-kymojson.js";          // .kymo.json → Diagram

/**
 * kymostudio — an independent TypeScript implementation of the diagram-as-code
 * toolkit (data model + icon library + SVG renderer + BPMN importer). It is
 * developed in parallel with the Python package at `packages/python/src/kymo/`
 * and kept at feature parity — not a port of it. Dependency-free.
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
export { parseBpmn } from "./from-bpmn.js";

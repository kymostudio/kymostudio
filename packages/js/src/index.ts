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
 *   - BPMN import: `parseBpmn` (BPMN 2.0 `.bpmn` XML → Diagram)
 */
export * from "./model.js";
export * from "./icons-loader.js"; // ICONS, getIcon, setIconBaseURL, setManifest, registerIcon
export * from "./render.js";       // renderSVG
export { parseBpmn } from "./from-bpmn.js";

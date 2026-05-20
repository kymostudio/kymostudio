/**
 * kymo — browser/Node port of the diagram-as-code model + icon library,
 * plus a standalone SVG renderer (`renderSVG`).
 *
 * Mirrors the Python source-of-truth at `packages/python/src/kymo/` for the
 * data model (`makeComponent`, `makeEdge`, `anchor`, `resolveAnchors`, …)
 * and the icon registry/loader (`ICONS`, `getIcon`, `setIconBaseURL`, …).
 *
 * The DSL parser and layout engine remain Python-only. `renderSVG` is an
 * independent TypeScript renderer (not a port of the Python one): give it a
 * Diagram with positioned components and it returns an SVG document.
 */
export * from "./model.js";
export * from "./icons-loader.js"; // re-exports ICONS, getIcon, setIconBaseURL, setManifest, registerIcon
export * from "./render.js";       // renderSVG

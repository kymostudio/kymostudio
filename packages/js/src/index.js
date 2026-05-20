/**
 * kymo — browser/Node port of the diagram-as-code model + icon library.
 *
 * Mirrors the Python source-of-truth at `packages/python/src/kymo/`. This entry
 * point re-exports the data model (`makeComponent`, `makeEdge`, `anchor`,
 * `resolveAnchors`, …) and the icon registry/loader (`ICONS`, `getIcon`,
 * `setIconBaseURL`, …).
 *
 * Note: the DSL parser, layout engine and SVG renderer are currently
 * Python-only; this package ships the shared model + icons.
 */
export * from "./model.js";
export * from "./icons-loader.js"; // re-exports ICONS, getIcon, setIconBaseURL, setManifest, registerIcon

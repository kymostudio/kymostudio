// Build-time stub. dbml-renderer lazily requires @aduh95/viz.js/sync for its
// "svg" output; we only ever ask it for "dot" (the real render goes through
// @viz-js/viz), so the 1.9 MB legacy engine is aliased to this throw.
export default function vizRenderStringSync(): never {
  throw new Error("unreachable: dbml renders dot via @viz-js/viz");
}

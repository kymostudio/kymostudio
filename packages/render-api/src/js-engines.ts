// Pure-JS upstream engines — the very packages kroki's own companions run,
// bundled into the worker instead of reached over the network. No wasm, no
// init step; each takes diagram source and returns an SVG string.
//
// Because these ARE kroki's engines, a source they reject would be rejected
// by kroki identically — so dispatch treats them as authoritative (errors are
// final 400s, no fallback hop).
import renderBytefield from "bytefield-svg";
import { renderSvg } from "nomnoml";

export const JS_RENDERERS: Record<string, (source: string) => string | Promise<string>> = {
  bytefield: (source) => renderBytefield(source),
  nomnoml: (source) => renderSvg(source),
};

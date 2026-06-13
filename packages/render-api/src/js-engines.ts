// Pure-JS upstream engines — the very packages kroki's own companions run,
// bundled into the worker instead of reached over the network. No wasm, no
// init step; each takes diagram source and returns an SVG string.
//
// Because these ARE kroki's engines, a source they reject would be rejected
// by kroki identically — so dispatch treats them as authoritative (errors are
// final 400s, no fallback hop).
import renderBytefield from "bytefield-svg";
import JSON5 from "json5";
import { renderSvg } from "nomnoml";
import onml from "onml";
import wavedrom from "wavedrom";

export const JS_RENDERERS: Record<string, (source: string) => string | Promise<string>> = {
  bytefield: (source) => renderBytefield(source),
  nomnoml: (source) => renderSvg(source),
  // The wavedrom-cli pipeline: JSON5 source → onml tree → SVG string. Index 0
  // namespaces the element ids, same as kroki's companion.
  wavedrom: (source) => onml.s(wavedrom.renderAny(0, JSON5.parse(source), wavedrom.waveSkin)),
};

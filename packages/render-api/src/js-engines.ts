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
import { parse as vegaParse, View as VegaView } from "vega";
import { expressionInterpreter } from "vega-interpreter";
import { compile as vegaLiteCompile } from "vega-lite";
import wavedrom from "wavedrom";

// workerd forbids new Function(), which vega's default expression compiler
// uses — parse to an AST and evaluate with vega-interpreter instead (vega's
// own CSP mode). renderer "none" + toSVG keeps it canvas-free.
async function vegaToSvg(spec: Record<string, unknown>): Promise<string> {
  const view = new VegaView(vegaParse(spec, undefined, { ast: true }), {
    renderer: "none",
    expr: expressionInterpreter,
  });
  return view.toSVG();
}

function parseSpec(source: string): Record<string, unknown> {
  try {
    return JSON.parse(source);
  } catch (e) {
    throw new Error(`invalid JSON spec: ${e instanceof Error ? e.message : e}`);
  }
}

export const JS_RENDERERS: Record<string, (source: string) => string | Promise<string>> = {
  bytefield: (source) => renderBytefield(source),
  nomnoml: (source) => renderSvg(source),
  vega: (source) => vegaToSvg(parseSpec(source)),
  vegalite: (source) => vegaToSvg(vegaLiteCompile(parseSpec(source) as never).spec as Record<string, unknown>),
  // The wavedrom-cli pipeline: JSON5 source → onml tree → SVG string. Index 0
  // namespaces the element ids, same as kroki's companion.
  wavedrom: (source) => onml.s(wavedrom.renderAny(0, JSON5.parse(source), wavedrom.waveSkin)),
};

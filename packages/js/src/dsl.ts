/**
 * D2-style DSL parser — JS port of `packages/python/src/kymo/dsl.py`.
 *
 * Line-based, brace-delimited surface for {@link Diagram}. There is no
 * `component` / `region` keyword — lines are disambiguated by shape:
 *
 *   • line ending in `{`, second token ∈ outer|inner|cluster → region
 *   • line ending in `{`, second token ∈ horizontal|vertical  → layout frame
 *   • `id arrow id …`                              → edge
 *   • `id shape/icon/accent "Name" "Sub" [@ …]`    → leaf component
 *   • bare ids (inside a container body)            → membership refs
 *   • `row id1 id2 …` (inside a region body)        → grid row
 *
 * `parse()` returns the unresolved diagram plus the grid-layout / external
 * specs (mirroring the Python tuple). `parseDiagram()` runs the full CLI
 * pipeline (parse → layout → resolveAlignments) and returns a positioned
 * {@link Diagram} ready for {@link renderSVG}.
 *
 * Independent implementation kept at parity with the Python parser, which
 * remains the normative reference alongside `docs/DSL.md`.
 */
import {
  makeComponent, makeEdge, makeRegion, makeDiagram,
  type Component, type Diagram, type Edge, type Region, type Point, type Shape, type Side,
  type BpmnBlock, type BpmnNode, type BpmnFlow,
} from "./model.js";
import {
  layout, applyLayoutTree, minimizeCrossings, idNode, groupNode,
  type LayoutNode, type RegionLayout, type ExternalSpec,
} from "./layout.js";
import { resolveAlignments } from "./alignment.js";
import { bpmnLayout } from "./bpmn-layout.js";

// ── Top-level directives ───────────────────────────────────────────────
const CANVAS_RE = /^canvas\s*:?\s+(\d+)\s*x\s*(\d+)\s*$/;
const TITLE_RE = /^title\s*:\s*"([^"]*)"\s*$/;
const SUBTITLE_RE = /^subtitle\s*:\s*"([^"]*)"\s*$/;
const EXTERNAL_RE = /^external\s+(\w+)\s+above\s+(\w+)(?:\s+gap\s+(\d+))?\s*$/;

// ── Containers ──────────────────────────────────────────────────────────
const REGION_RE = /^(\w+)\s+(outer|inner|cluster)\s+"([^"]*)"(?:\s+(.+?))?\s*\{\s*$/;
const LAYOUT_RE =
  /^(\w+)\s+(horizontal|vertical)\s+pos\s+\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s+gap\s+(\d+)(?:\s+align\s+(start|center|end))?\s*\{\s*$/;
const CLOSE_RE = /^\s*\}\s*$/;
const LAYOUT_TREE_RE = /^layout\s*\{(.+)\}\s*$/;

// ── Region option tokens ────────────────────────────────────────────────
const PADDING_OPT_RE = /\bpadding\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)/;
const PADDING_BOT_OPT_RE = /\bpadding-bottom\s+(\d+)/;
const DASH_OPT_RE = /\bdash\s+\(\s*(\d+)\s*,\s*(\d+)\s*\)/;
const STROKE_OPT_RE = /\bstroke\s+(#[0-9a-fA-F]{3,8})/;
const LABEL_ANCHOR_RE = /\blabel-anchor\s+(start|middle|end)/;
const LABEL_POS_RE = /\blabel-position\s+(above|inside)/;
const ICON_OPT_RE = /\bicon\s+([\w-]+)/;
const DIRECTION_OPT_RE = /\b(horizontal|vertical)\b/;

// ── Leaf component ──────────────────────────────────────────────────────
const LEAF_RE =
  /^(\w+)\s+([\w-]+)\/([\w-]+)\/(\w+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?(?:\s+@\s+(.+?))?\s*$/;
const POS_LITERAL_RE = /^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/;
const PARENT_REF_RE = /^(\w+)\s+(top|right|bottom|left)(?:\s+(-?\d+))?$/;

// ── Edge ────────────────────────────────────────────────────────────────
const EDGE_RE = /^(\w+)\s+(-->|==>|---)\s+(\w+)(?:\s+:\s+"([^"]*)")?(?:\s+\{(.*)\})?\s*$/;
const ANCHOR_SPEC_RE = /^(top|right|bottom|left|center)(?:\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\))?$/;
const TUPLE_RE = /^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/;
const VIA_PT_RE = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;

// ── Grid rows / bare-id lists ───────────────────────────────────────────
const ROW_RE = /^row(?:\s+(.+))?$/;
const BARE_IDS_RE = /^[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s*$/;

// ── BPMN block (`bpmn { … }`) — mirrors the Python parser ───────────────
const BPMN_OPEN_RE = /^bpmn\s*\{\s*$/;
// <kind> <id> ["Label"] [type=<subtype>] [@ (x,y)]   (`end!` before `end`)
const BPMN_NODE_RE =
  /^(start|end!|end|task|xor|and|or|event|subprocess|note|data|store)\s+(\w+)(?:\s+"([^"]*)")?(?:\s+type=(\w+))?(?:\s+@\s*(\(\s*-?\d+\s*,\s*-?\d+\s*\)))?\s*$/;
const BPMN_ARROW_SPLIT_RE = /\s*(->|\.\.>|~>)\s*/;
const BPMN_LABEL_RE = /\s*:\s*"([^"]*)"\s*$/;
// kind → [shape, default marker] (FR-3); arrow → flow kind (FR-6).
const BPMN_KIND: Record<string, [Shape, string]> = {
  "start": ["bpmn-start", ""], "end": ["bpmn-end", ""], "end!": ["bpmn-end", "terminate"],
  "task": ["bpmn-task", ""], "xor": ["bpmn-gateway", "exclusive"],
  "and": ["bpmn-gateway", "parallel"], "or": ["bpmn-gateway", "inclusive"],
  "event": ["bpmn-intermediate", ""], "subprocess": ["bpmn-subprocess", ""],
  "note": ["bpmn-annotation", ""], "data": ["bpmn-data-object", ""], "store": ["bpmn-data-store", ""],
};
const BPMN_ARROW: Record<string, string> = { "->": "sequence", "~>": "message", "..>": "association" };

export interface ParseResult {
  diagram: Diagram;
  layout: RegionLayout | null;
  external: ExternalSpec | null;
}

// ── Public API ──────────────────────────────────────────────────────────
export function parse(dsl: string): ParseResult {
  const state = new State();
  const lines = dsl.split(/\r\n|\r|\n/);
  const consumed = parseBlock(state, lines, 0, null);
  if (consumed !== lines.length) {
    throw new SyntaxError(`line ${consumed + 1}: unexpected \`}\` at file scope`);
  }
  return state.finalize();
}

/** Full front-end pipeline: parse → grid layout → alignment resolution.
 *  Returns a positioned {@link Diagram} ready for `renderSVG`. */
export function parseDiagram(dsl: string): Diagram {
  const { diagram, layout: layoutSpec, external } = parse(dsl);
  const hadBpmn = (diagram.bpmnBlocks?.length ?? 0) > 0;
  if (hadBpmn) bpmnLayout(diagram);
  if (layoutSpec) layout(diagram, layoutSpec, external);
  // bpmn-block diagrams arrive fully positioned (like `.bpmn`) — skip alignment.
  if (!hadBpmn) resolveAlignments(diagram);
  return diagram;
}

// ── Internal state ──────────────────────────────────────────────────────
class State {
  components: Component[] = [];
  regions: Region[] = [];
  edges: Edge[] = [];
  layoutDict: RegionLayout = {};
  externalDict: ExternalSpec = {};
  layoutTrees: LayoutNode[] = [];
  canvas: Point = [0, 0];      // (0, 0) → render-time auto-sizing
  title = "";
  subtitle = "";
  bpmnBlocks: BpmnBlock[] = [];

  finalize(): ParseResult {
    const diagram = makeDiagram({
      width: this.canvas[0], height: this.canvas[1],
      title: this.title, subtitle: this.subtitle,
      components: this.components, regions: this.regions, edges: this.edges,
      layoutTrees: this.layoutTrees,
      bpmnBlocks: this.bpmnBlocks,
    });
    if (this.layoutTrees.length) {
      const byId = new Map(this.components.map((c) => [c.id, c]));
      const regionsById = new Map(this.regions.map((r) => [r.id, r]));
      const edgePairs: Array<[string, string]> = this.edges.map((e) => [e.src, e.dst]);
      let cursorY = 0;
      for (const tree of this.layoutTrees) {
        const inlined = inlineRegionLeaves(tree, regionsById);
        if (inlined.t === "group") minimizeCrossings(inlined, edgePairs);
        const [, h] = applyLayoutTree(byId, inlined, { origin: [0, cursorY] });
        cursorY += h + 40;
      }
    }
    return {
      diagram,
      layout: Object.keys(this.layoutDict).length ? this.layoutDict : null,
      external: Object.keys(this.externalDict).length ? this.externalDict : null,
    };
  }
}

// ── Block parser (recursive: file scope + each container body) ──────────
function parseBlock(
  state: State, lines: string[], start: number, parent: Region | null,
): number {
  let gridRows: string[][] | null = null;
  let i = start;
  while (i < lines.length) {
    const line = stripComment(lines[i]).trim();
    if (!line) { i++; continue; }

    if (CLOSE_RE.test(line)) {
      if (parent === null) return i;             // caller reports the stray `}`
      if (gridRows !== null) {
        state.layoutDict[parent.id] = gridRows;
        parent.contains = [];                    // grid mode → layout() owns bounds
      }
      return i + 1;
    }

    let m: RegExpExecArray | null;

    if (parent === null) {
      if ((m = CANVAS_RE.exec(line))) { state.canvas = [parseInt(m[1]), parseInt(m[2])]; i++; continue; }
      if ((m = TITLE_RE.exec(line))) { state.title = m[1]; i++; continue; }
      if ((m = SUBTITLE_RE.exec(line))) { state.subtitle = m[1]; i++; continue; }
      if ((m = EXTERNAL_RE.exec(line))) {
        state.externalDict[m[1]] = { above: m[2], gap: m[3] ? parseInt(m[3]) : 60 };
        i++; continue;
      }
      if ((m = LAYOUT_TREE_RE.exec(line))) {
        state.layoutTrees.push(parseLayoutTree(m[1], i + 1));
        i++; continue;
      }
      if (BPMN_OPEN_RE.test(line)) { i = consumeBpmnBlock(state, lines, i); continue; }
    }

    if ((m = EDGE_RE.exec(line))) {
      if (parent !== null) {
        throw new SyntaxError(
          `line ${i + 1}: edges must live at file scope, not inside container ${JSON.stringify(parent.id)}`);
      }
      state.edges.push(makeEdgeFrom(m, i + 1));
      i++; continue;
    }

    if ((m = ROW_RE.exec(line))) {
      if (parent === null) throw new SyntaxError(`line ${i + 1}: \`row\` only valid inside a region body`);
      if (parent.layout != null) {
        throw new SyntaxError(
          `line ${i + 1}: \`row\` not allowed in layout body (${JSON.stringify(parent.id)} is a ${parent.layout} layout)`);
      }
      if (gridRows === null) gridRows = [];
      gridRows.push(splitWs(m[1] ?? ""));
      i++; continue;
    }

    if (line.endsWith("{")) {
      i = consumeContainer(state, lines, i, parent, gridRows);
      continue;
    }

    if ((m = LEAF_RE.exec(line))) {
      const comp = makeComponentFrom(m, i + 1);
      state.components.push(comp);
      if (parent !== null) {
        if (parent.layout != null) {
          throw new SyntaxError(
            `line ${i + 1}: inline leaf definitions not allowed in layout body — define ${JSON.stringify(comp.id)} at file scope or in a region body, then reference by bare id`);
        }
        parent.contains.push(comp.id);
      }
      i++; continue;
    }

    if (parent !== null && BARE_IDS_RE.test(line)) {
      if (gridRows !== null) {
        throw new SyntaxError(`line ${i + 1}: region ${JSON.stringify(parent.id)} mixes \`row\` and bare ids — pick one`);
      }
      parent.contains.push(...splitWs(line));
      i++; continue;
    }

    throw new SyntaxError(`line ${i + 1}: unrecognised — ${JSON.stringify(line)}`);
  }

  if (parent !== null) throw new SyntaxError(`line ${start}: unclosed block (no matching \`}\`)`);
  return i;
}

function consumeContainer(
  state: State, lines: string[], i: number,
  parent: Region | null, parentGrid: string[][] | null,
): number {
  const line = stripComment(lines[i]).trim();
  let region: Region;
  let m: RegExpExecArray | null;
  if ((m = REGION_RE.exec(line))) region = makeRegionFrom(m);
  else if ((m = LAYOUT_RE.exec(line))) region = makeLayoutFrom(m);
  else throw new SyntaxError(`line ${i + 1}: bad container header — ${JSON.stringify(line)}`);

  state.regions.push(region);
  const nextI = parseBlock(state, lines, i + 1, region);

  // Propagate this container's leaves up so the outer region's bounds
  // envelop nested leaves. Layout frames don't propagate.
  if (parent !== null && region.layout == null) {
    if (parentGrid !== null) {
      throw new SyntaxError(`line ${i + 1}: region ${JSON.stringify(parent.id)} mixes \`row\` and nested containers — pick one`);
    }
    parent.contains.push(...region.contains);
  }
  return nextI;
}

// ── BPMN block parser (positionless AST; bpmn-layout.ts positions it) ────
function consumeBpmnBlock(state: State, lines: string[], i: number): number {
  const nodes: BpmnNode[] = [];
  const flows: BpmnFlow[] = [];
  let j = i + 1;
  while (j < lines.length) {
    const line = stripComment(lines[j]).trim();
    if (!line) { j++; continue; }
    if (CLOSE_RE.test(line)) {
      state.bpmnBlocks.push({ nodes, flows });
      return j + 1;
    }
    const m = BPMN_NODE_RE.exec(line);
    if (m) {
      nodes.push(makeBpmnNode(m, j + 1));
    } else {
      for (const stmt of splitBpmnStatements(line)) {
        for (const fl of parseBpmnConnections(stmt, j + 1)) flows.push(fl);
      }
    }
    j++;
  }
  throw new SyntaxError(`line ${i + 1}: unclosed \`bpmn {\` block (no matching \`}\`)`);
}

function makeBpmnNode(m: RegExpExecArray, lineNo: number): BpmnNode {
  const [, kind, id, label, subtype, pinStr] = m;
  const [shape, baseMarker] = BPMN_KIND[kind];
  const marker = subtype ? subtype : baseMarker;   // FR-4: type= refines the marker
  let pin: Point | null = null;
  if (pinStr) {
    const pm = POS_LITERAL_RE.exec(pinStr.trim());
    if (!pm) throw new SyntaxError(`line ${lineNo}: bad bpmn pin ${JSON.stringify(pinStr)}`);
    pin = [parseInt(pm[1]), parseInt(pm[2])];
  }
  return { id, kind, label: label ?? "", shape, marker, pin };
}

/** Split a connection line on `;` outside double quotes (FR-7). */
function splitBpmnStatements(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; buf += ch; }
    else if (ch === ";" && !inQ) { out.push(buf); buf = ""; }
    else buf += ch;
  }
  out.push(buf);
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Parse one connection statement (a chain) into BpmnFlows (FR-6/FR-7). */
function parseBpmnConnections(stmt: string, lineNo: number): BpmnFlow[] {
  let label = "";
  const lm = BPMN_LABEL_RE.exec(stmt);
  if (lm) { label = lm[1]; stmt = stmt.slice(0, lm.index); }
  const parts = stmt.trim().split(BPMN_ARROW_SPLIT_RE);
  const ids: string[] = [];
  const arrows: string[] = [];
  parts.forEach((p, k) => { if (k % 2 === 0) ids.push(p.trim()); else arrows.push(p); });
  if (parts.length < 3 || parts.length % 2 === 0 || ids.some((x) => !x)) {
    throw new SyntaxError(`line ${lineNo}: bad bpmn connection — ${JSON.stringify(stmt)}`);
  }
  const flows: BpmnFlow[] = arrows.map((arrow, k) => ({
    src: ids[k], dst: ids[k + 1], flow: BPMN_ARROW[arrow], label: "",
  }));
  if (label) flows[flows.length - 1].label = label;
  return flows;
}

// ── Per-kind builders ───────────────────────────────────────────────────
function makeRegionFrom(m: RegExpExecArray): Region {
  const [, rid, style, label, opts] = m;
  let padding: Point = [24, 24];
  let paddingBottom: number | null = null;
  let borderDash: string | null = null;
  let borderStroke: string | null = null;
  let labelAnchor = "middle";
  let labelPosition: string | null = null;
  let icon: string | null = null;
  let direction: string | null = null;
  if (opts) {
    let o: RegExpExecArray | null;
    if ((o = PADDING_OPT_RE.exec(opts))) padding = [parseInt(o[1]), parseInt(o[2])];
    if ((o = PADDING_BOT_OPT_RE.exec(opts))) paddingBottom = parseInt(o[1]);
    if ((o = DASH_OPT_RE.exec(opts))) borderDash = `${parseInt(o[1])} ${parseInt(o[2])}`;
    if ((o = STROKE_OPT_RE.exec(opts))) borderStroke = o[1];
    if ((o = LABEL_ANCHOR_RE.exec(opts))) labelAnchor = o[1];
    if ((o = LABEL_POS_RE.exec(opts))) labelPosition = o[1];
    if ((o = ICON_OPT_RE.exec(opts))) icon = o[1];
    if ((o = DIRECTION_OPT_RE.exec(opts))) direction = o[1];
  }
  return makeRegion({
    id: rid, label, style,
    padding, paddingBottom, borderDash, borderStroke,
    labelAnchor, labelPosition, icon, contains: [], layout: direction,
  });
}

function makeLayoutFrom(m: RegExpExecArray): Region {
  const [, lid, direction, x, y, gap, align] = m;
  return makeRegion({
    id: lid, label: "",
    pos: [parseInt(x), parseInt(y)], layout: direction, gap: parseInt(gap),
    align: align || "center", padding: [0, 0], visible: false, contains: [],
  });
}

function makeComponentFrom(m: RegExpExecArray, lineNo: number): Component {
  const [, cid, shape, icon, accent, name, subtitle, ref] = m;
  let pos: Point = [0, 0];
  let parent: string | null = null;
  let align: string | null = null;
  let alignGap = 24;
  if (ref) {
    const r = ref.trim();
    let pm: RegExpExecArray | null;
    if ((pm = POS_LITERAL_RE.exec(r))) {
      pos = [parseInt(pm[1]), parseInt(pm[2])];
    } else if ((pm = PARENT_REF_RE.exec(r))) {
      parent = pm[1];
      align = pm[2];
      if (pm[3] !== undefined) alignGap = parseInt(pm[3]);
    } else {
      throw new SyntaxError(`line ${lineNo}: bad @-ref ${JSON.stringify(r)}`);
    }
  }
  return makeComponent({
    id: cid, name: name ?? "", subtitle: subtitle ?? "",
    icon, shape: shape as Shape, accent,
    pos, parent, align, alignGap,
  });
}

interface EdgeKw {
  srcAnchor: Side | null;
  dstAnchor: Side | null;
  srcOffset: Point;
  dstOffset: Point;
  labelOffset: Point;
  labelSmall: boolean;
  labelPos: Point | null;
  labelAnchor: string;
  via: Point[];
  route: string;
  dashed: boolean;
  noArrow: boolean;
  sharedPort: boolean;
}

function makeEdgeFrom(m: RegExpExecArray, lineNo: number): Edge {
  const [, src, arrow, dst, label, opts] = m;
  const kw: EdgeKw = {
    srcAnchor: null, dstAnchor: null,
    srcOffset: [0, 0], dstOffset: [0, 0],
    labelOffset: [0, 0], labelSmall: false, labelPos: null, labelAnchor: "mid",
    via: [], route: "auto", dashed: false,
    noArrow: arrow === "---", sharedPort: false,
  };
  if (opts) parseEdgeOptions(opts.trim(), kw, lineNo);
  return makeEdge({
    src, dst, label: label ?? "",
    style: arrow === "==>" ? "orange" : "gray",
    ...kw,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────
function splitWs(s: string): string[] {
  const t = s.trim();
  return t === "" ? [] : t.split(/\s+/);
}

/** Strip `#` comments outside double-quoted strings. A `#` followed by a hex
 *  digit is a colour literal (`stroke #94a3b8`), not a comment. */
function stripComment(line: string): string {
  let out = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; out += ch; }
    else if (ch === "#" && !inQuote) {
      const nxt = i + 1 < line.length ? line[i + 1] : "";
      if (nxt && "0123456789abcdefABCDEF".includes(nxt)) out += ch;   // hex colour
      else break;                                                     // real comment
    } else out += ch;
  }
  return out;
}

function parseEdgeOptions(s: string, kw: EdgeKw, lineNo: number): void {
  for (let tok of splitOutsideParens(s, ",")) {
    tok = tok.trim();
    if (!tok) continue;
    const eq = tok.indexOf("=");
    if (eq >= 0) setKvOption(kw, tok.slice(0, eq).trim(), tok.slice(eq + 1).trim(), lineNo);
    else setFlag(kw, tok, lineNo);
  }
}

function splitOutsideParens(s: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") { depth++; cur += ch; }
    else if (ch === ")") { depth--; cur += ch; }
    else if (ch === sep && depth === 0) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function setKvOption(kw: EdgeKw, key: string, value: string, lineNo: number): void {
  if (key === "src" || key === "dst") {
    const am = ANCHOR_SPEC_RE.exec(value);
    if (!am) throw new SyntaxError(`line ${lineNo}: bad ${key} anchor ${JSON.stringify(value)}`);
    const side = am[1] as Side;
    const offset: Point | null = am[2] !== undefined ? [parseInt(am[2]), parseInt(am[3])] : null;
    if (key === "src") { kw.srcAnchor = side; if (offset) kw.srcOffset = offset; }
    else { kw.dstAnchor = side; if (offset) kw.dstOffset = offset; }
    return;
  }
  if (key === "via") {
    const pts: Point[] = [...value.matchAll(VIA_PT_RE)].map((p) => [parseInt(p[1]), parseInt(p[2])] as Point);
    if (!pts.length) throw new SyntaxError(`line ${lineNo}: via needs ≥1 point — got ${JSON.stringify(value)}`);
    kw.via = pts;
    return;
  }
  if (key === "label_offset" || key === "label_pos") {
    const tm = TUPLE_RE.exec(value);
    if (!tm) throw new SyntaxError(`line ${lineNo}: ${key} expects (x, y) — got ${JSON.stringify(value)}`);
    const tuple: Point = [parseInt(tm[1]), parseInt(tm[2])];
    if (key === "label_offset") kw.labelOffset = tuple; else kw.labelPos = tuple;
    return;
  }
  if (key === "route") {
    if (!["auto", "over", "under", "curve"].includes(value)) {
      throw new SyntaxError(`line ${lineNo}: bad route ${JSON.stringify(value)}`);
    }
    kw.route = value;
    return;
  }
  if (key === "label_at") {
    if (!["src", "dst", "mid"].includes(value)) {
      throw new SyntaxError(`line ${lineNo}: label_at expects src|dst|mid — got ${JSON.stringify(value)}`);
    }
    kw.labelAnchor = value;
    return;
  }
  throw new SyntaxError(`line ${lineNo}: unknown edge option ${JSON.stringify(key)}`);
}

function setFlag(kw: EdgeKw, flag: string, lineNo: number): void {
  if (flag === "small") kw.labelSmall = true;
  else if (flag === "dashed") kw.dashed = true;
  else if (flag === "shared") kw.sharedPort = true;
  else if (["curve", "over", "under", "straight", "elbow"].includes(flag)) {
    kw.route = flag === "elbow" ? "auto" : flag;
  } else {
    throw new SyntaxError(`line ${lineNo}: unknown edge flag ${JSON.stringify(flag)}`);
  }
}

// ── Layout tree (Figma-style auto-layout) ───────────────────────────────
export function parseLayoutTree(expr: string, lineNo: number): LayoutNode {
  const tokens = tokenizeLayout(expr, lineNo);
  const pos = { i: 0 };
  const node = parseLayoutNode(tokens, pos, lineNo);
  if (pos.i < tokens.length) {
    throw new SyntaxError(`line ${lineNo}: trailing token ${JSON.stringify(tokens[pos.i])} in layout`);
  }
  return node;
}

function tokenizeLayout(s: string, lineNo: number): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ("{}|,".includes(ch)) { out.push(ch); i++; }
    else if (/\s/.test(ch)) { i++; }
    else if (/[A-Za-z0-9_]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      out.push(s.slice(i, j));
      i = j;
    } else {
      throw new SyntaxError(`line ${lineNo}: bad char ${JSON.stringify(ch)} in layout expr`);
    }
  }
  return out;
}

function parseLayoutNode(tokens: string[], pos: { i: number }, lineNo: number): LayoutNode {
  const items = [parseLayoutAtom(tokens, pos, lineNo)];
  let sep: string | null = null;
  while (pos.i < tokens.length && (tokens[pos.i] === "|" || tokens[pos.i] === ",")) {
    const cur = tokens[pos.i];
    if (sep === null) sep = cur;
    else if (sep !== cur) {
      throw new SyntaxError(`line ${lineNo}: cannot mix \`|\` and \`,\` at same level — use {} to group`);
    }
    pos.i++;
    items.push(parseLayoutAtom(tokens, pos, lineNo));
  }
  if (sep === null) return items[0];
  return groupNode(sep === "|" ? "horizontal" : "vertical", items);
}

function parseLayoutAtom(tokens: string[], pos: { i: number }, lineNo: number): LayoutNode {
  if (pos.i >= tokens.length) throw new SyntaxError(`line ${lineNo}: expected id or \`{\` in layout expr`);
  const tok = tokens[pos.i];
  if (tok === "{") {
    pos.i++;
    const node = parseLayoutNode(tokens, pos, lineNo);
    if (pos.i >= tokens.length || tokens[pos.i] !== "}") {
      throw new SyntaxError(`line ${lineNo}: missing \`}\` in layout expr`);
    }
    pos.i++;
    return node;
  }
  if (tok === "|" || tok === "," || tok === "}") {
    throw new SyntaxError(`line ${lineNo}: unexpected ${JSON.stringify(tok)} in layout expr`);
  }
  pos.i++;
  return idNode(tok);
}

/** Replace a leaf whose id matches a directional region with a sub-tree built
 *  from that region's `contains` + `layout` direction, so the layout DSL stays
 *  flat. Regions without a direction stay opaque (a single leaf). */
export function inlineRegionLeaves(tree: LayoutNode, regionsById: Map<string, Region>): LayoutNode {
  if (tree.t === "id") {
    const r = regionsById.get(tree.id);
    if (r && r.layout && r.contains.length) {
      const children = r.contains.map((ch) => inlineRegionLeaves(idNode(ch), regionsById));
      return groupNode(r.layout as "horizontal" | "vertical", children, r.padding);
    }
    return tree;
  }
  const newChildren = tree.children.map((c) => inlineRegionLeaves(c, regionsById));
  return tree.padding ? groupNode(tree.dir, newChildren, tree.padding) : groupNode(tree.dir, newChildren);
}

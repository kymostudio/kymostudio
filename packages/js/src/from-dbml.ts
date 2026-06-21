/**
 * DBML import — `parseDbml(src)` turns DBML (the language dbdiagram.io uses)
 * into a fully-positioned {@link Diagram} of ER `table` components + foreign-key
 * edges, ready for {@link renderSVG}. Like the BPMN importer it returns a
 * resolved Diagram (positions baked in), so the CLI skips layout/alignment.
 *
 * This is an original, dependency-free TypeScript parser — NOT a port. It
 * covers the common "Core ER" subset of DBML:
 *   - `Table name [as alias] { field type [settings] … }`
 *   - column settings: pk / primary key, not null, unique, increment,
 *     default:, note:, and inline `ref: > other.col`
 *   - `Ref` relationships (long block, short `Ref:`, inline) with the
 *     operators `>` `<` `-` `<>`
 *   - `enum name { value … }` (rendered as a value-list box)
 * Deferred (parsed-and-skipped so they don't break a file): TableGroup,
 * `indexes { }`, `checks`, composite FKs (first column used), TablePartial,
 * Project / schemas. See docs/DBML.md.
 */
import {
  makeComponent, makeEdge, makeDiagram,
  type Component, type Diagram, type Edge, type TableRow,
} from "./model.js";

// ── Box geometry (shared with tableNode in render.ts) ─────────────────
export const HEADER_H = 32;   // header bar height
export const ROW_H = 30;      // per-field row height
export const PAD = 14;        // inner left/right padding
const NAME_TYPE_GAP = 30;     // min gap between a field name and its type
export const PK_ICON_W = 16;  // 🔑 width allowance
export const NN_W = 24;       // "NN" badge width allowance
const MIN_W = 180;            // minimum table width
const COL_GAP = 70;           // grid gap between table columns
const ROW_GAP = 52;           // grid gap between table rows

// Rough text widths (no DOM): name 13px sans, type 12px monospace.
export const nameWidth = (s: string, bold = false) => s.length * (bold ? 7.7 : 7.1);
const typeWidth = (s: string) => s.length * 7.1;

// ── Parsed intermediate shapes ────────────────────────────────────────
interface ParsedField { name: string; type: string; settings: string[]; }
interface ParsedTable { name: string; alias: string; fields: ParsedField[]; headerColor?: string; isEnum?: boolean; }
interface ParsedRef { srcTable: string; srcCol: string; op: string; dstTable: string; dstCol: string; }

// ── Comment stripping (respects quotes / backticks) ───────────────────
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  let quote = ""; // active string delimiter: ' " or `
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\" && i + 1 < n) { out += d; i += 2; continue; }
      if (c === quote) quote = "";
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && d === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    out += c;
    i++;
  }
  return out;
}

/** Split `s` on `sep` at bracket/paren/quote depth 0. */
function splitTop(s: string, sep: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let depth = 0;
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { buf += c; if (c === quote) quote = ""; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; buf += c; continue; }
    if (c === "[" || c === "(" || c === "{") depth++;
    else if (c === "]" || c === ")" || c === "}") depth--;
    if (c === sep && depth === 0) { parts.push(buf); buf = ""; continue; }
    buf += c;
  }
  if (buf.trim() !== "" || parts.length) parts.push(buf);
  return parts;
}

/** Read a `{ … }` body starting at `open` (index of `{`). Returns [body, indexAfterClose]. */
function readBraced(src: string, open: number): [string, number] {
  let depth = 0;
  let quote = "";
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === "\\") { i++; continue; } if (c === quote) quote = ""; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return [src.slice(open + 1, i), i + 1]; }
  }
  return [src.slice(open + 1), src.length];
}

/** Strip surrounding quotes/backticks from a token. */
function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && (t[0] === "'" || t[0] === '"' || t[0] === "`") && t[t.length - 1] === t[0]) {
    return t.slice(1, -1);
  }
  return t;
}

/** Parse `schema.table.col` or `table.col` -> [table, col] (schema dropped, composite -> first col). */
function refTarget(ref: string): [string, string] {
  let s = ref.trim();
  // composite "table.(a, b)" or "(a, b)" — take the first column.
  s = s.replace(/\(([^)]*)\)/, (_m, inner) => inner.split(",")[0].trim());
  const parts = s.split(".").map((p) => unquote(p.trim()));
  if (parts.length >= 2) return [parts[parts.length - 2], parts[parts.length - 1]];
  return [parts[0] ?? "", ""];
}

// ── Top-level scan ────────────────────────────────────────────────────
export interface DbmlAst { tables: ParsedTable[]; refs: ParsedRef[]; }

export function parseDbmlAst(src: string): DbmlAst {
  const clean = stripComments(src);
  const tables: ParsedTable[] = [];
  const refs: ParsedRef[] = [];
  const n = clean.length;
  let i = 0;
  const isWord = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < n) {
    // skip whitespace
    if (/\s/.test(clean[i])) { i++; continue; }
    // read a keyword token
    let j = i;
    while (j < n && isWord(clean[j])) j++;
    const word = clean.slice(i, j);
    const lower = word.toLowerCase();

    if (lower === "table" || lower === "tablepartial") {
      // header up to the first `{`
      const open = clean.indexOf("{", j);
      if (open < 0) break;
      const header = clean.slice(j, open).trim();
      const [body, after] = readBraced(clean, open);
      if (lower === "table") tables.push(parseTable(header, body, refs));
      i = after;
      continue;
    }
    if (lower === "enum") {
      const open = clean.indexOf("{", j);
      if (open < 0) break;
      const header = clean.slice(j, open).trim();
      const [body, after] = readBraced(clean, open);
      tables.push(parseEnum(header, body));
      i = after;
      continue;
    }
    if (lower === "ref") {
      // `Ref [name] { a > b }`  or  `Ref [name]: a > b`
      let k = j;
      while (k < n && clean[k] !== "{" && clean[k] !== ":" && clean[k] !== "\n") k++;
      if (clean[k] === "{") {
        const [body, after] = readBraced(clean, k);
        for (const line of body.split("\n")) {
          const r = parseRefExpr(line);
          if (r) refs.push(r);
        }
        i = after;
      } else if (clean[k] === ":") {
        // read to end of line / statement
        let e = k + 1;
        while (e < n && clean[e] !== "\n") e++;
        const r = parseRefExpr(clean.slice(k + 1, e));
        if (r) refs.push(r);
        i = e;
      } else {
        i = k;
      }
      continue;
    }
    if (lower === "project" || lower === "tablegroup" || lower === "note") {
      // skip a `{ … }` block or a `: …` / single line
      const open = clean.indexOf("{", j);
      const nl = clean.indexOf("\n", j);
      if (open >= 0 && (nl < 0 || open < nl)) {
        const [, after] = readBraced(clean, open);
        i = after;
      } else {
        i = nl < 0 ? n : nl;
      }
      continue;
    }
    // unknown token — advance past it
    i = j > i ? j : i + 1;
  }
  return { tables, refs };
}

function parseTable(header: string, body: string, refs: ParsedRef[]): ParsedTable {
  // header: `name [as alias] [settings]`
  let headerColor: string | undefined;
  const settingsMatch = header.match(/\[([^\]]*)\]\s*$/);
  if (settingsMatch) {
    for (const s of splitTop(settingsMatch[1], ",")) {
      const m = s.match(/^\s*header[Cc]olor\s*:\s*(.+)$/);
      if (m) headerColor = unquote(m[1]);
    }
  }
  const namePart = (settingsMatch ? header.slice(0, settingsMatch.index) : header).trim();
  const asMatch = namePart.match(/^(.+?)\s+as\s+(\S+)\s*$/i);
  const rawName = asMatch ? asMatch[1].trim() : namePart;
  const alias = asMatch ? unquote(asMatch[2]) : "";
  const name = unquote(rawName.split(".").pop() || rawName);

  const fields: ParsedField[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const lw = line.toLowerCase();
    // skip nested blocks / table-level notes
    if (lw.startsWith("indexes") || lw.startsWith("checks") || lw === "{" || lw === "}") continue;
    if (lw.startsWith("note:") || lw.startsWith("note ")) continue;
    if (line.startsWith("~")) continue; // TablePartial injection — deferred

    // split field settings out
    let settings: string[] = [];
    let core = line;
    const sm = line.match(/\[([^\]]*)\]\s*$/);
    if (sm) { settings = splitTop(sm[1], ",").map((s) => s.trim()).filter(Boolean); core = line.slice(0, sm.index).trim(); }
    const toks = core.split(/\s+/);
    if (toks.length < 1 || !toks[0]) continue;
    const fname = unquote(toks[0]);
    const ftype = toks.slice(1).join(" ");

    // inline ref in settings -> a ParsedRef from this column
    for (const s of settings) {
      const rm = s.match(/^ref\s*:\s*([<>\-]+)\s*(.+)$/i);
      if (rm) {
        const [dt, dc] = refTarget(rm[2]);
        refs.push({ srcTable: alias || name, srcCol: fname, op: rm[1], dstTable: dt, dstCol: dc });
      }
    }
    fields.push({ name: fname, type: ftype, settings });
  }
  return { name: alias || name, alias, fields, headerColor };
}

function parseEnum(header: string, body: string): ParsedTable {
  const name = unquote(header.replace(/\[[^\]]*\]\s*$/, "").trim().split(".").pop() || header);
  const fields: ParsedField[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "{" || line === "}") continue;
    const m = line.match(/^([^\[]+)(\[.*\])?\s*$/);
    const val = unquote((m ? m[1] : line).trim());
    if (val) fields.push({ name: val, type: "", settings: [] });
  }
  return { name, alias: "", fields, isEnum: true };
}

/** Parse `a.b > c.d` (with optional trailing `[settings]`). */
function parseRefExpr(expr: string): ParsedRef | null {
  let s = expr.trim();
  if (!s) return null;
  s = s.replace(/\[[^\]]*\]\s*$/, "").trim();        // drop [delete: …] etc.
  const m = s.match(/^(.+?)\s*(<>|<|>|-)\s*(.+)$/);
  if (!m) return null;
  const [st, sc] = refTarget(m[1]);
  const [dt, dc] = refTarget(m[3]);
  if (!st || !dt) return null;
  return { srcTable: st, srcCol: sc, op: m[2], dstTable: dt, dstCol: dc };
}

// ── Geometry: size each table from its fields ─────────────────────────
function tableSize(t: ParsedTable): [number, number] {
  const rowWidths = t.fields.map((f) => {
    const isPk = f.settings.some((s) => /^pk$|^primary key$/i.test(s));
    const nn = f.settings.some((s) => /^not null$/i.test(s));
    return PAD + nameWidth(f.name, isPk) + (isPk ? PK_ICON_W : 0)
      + (f.type ? NAME_TYPE_GAP + typeWidth(f.type) : 0) + (nn ? NN_W : 0) + PAD;
  });
  const headerW = PAD + nameWidth(t.name, true) + PAD + 8;
  const w = Math.ceil(Math.max(MIN_W, headerW, ...(rowWidths.length ? rowWidths : [0])));
  const h = HEADER_H + Math.max(1, t.fields.length) * ROW_H;
  return [w, h];
}

// ── Public entry ──────────────────────────────────────────────────────
/**
 * Parse DBML into a positioned ER `Diagram`.
 *
 * @param positions optional per-table CENTRE overrides (`{ tableName: [cx, cy] }`).
 *   A table listed here is placed at that centre instead of the auto grid slot —
 *   this is how the editor persists drag-to-move positions across re-renders.
 *   Unknown table names are ignored; tables absent from the map keep their grid
 *   slot.
 */
export function parseDbml(src: string, positions?: Record<string, [number, number]>): Diagram {
  const { tables, refs } = parseDbmlAst(src);

  // Build components (one table box each). Index by name AND alias.
  const byKey = new Map<string, ParsedTable>();
  for (const t of tables) {
    byKey.set(t.name, t);
    if (t.alias) byKey.set(t.alias, t);
  }

  // Mark FK source columns so the renderer can flag them.
  const fkCols = new Set<string>(); // `${table}.${col}`
  for (const r of refs) fkCols.add(`${r.srcTable}.${r.srcCol}`);

  const sizes = new Map<string, [number, number]>();
  for (const t of tables) sizes.set(t.name, tableSize(t));

  // Grid auto-layout — row-major, columns sized to their widest table.
  const nTab = tables.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(nTab * 1.6)));
  const rowsN = Math.ceil(nTab / cols);
  const colW: number[] = new Array(cols).fill(0);
  const rowH: number[] = new Array(rowsN).fill(0);
  tables.forEach((t, idx) => {
    const [w, h] = sizes.get(t.name)!;
    const c = idx % cols, r = (idx / cols) | 0;
    colW[c] = Math.max(colW[c], w);
    rowH[r] = Math.max(rowH[r], h);
  });
  const colX: number[] = [];
  let accX = 0;
  for (let c = 0; c < cols; c++) { colX[c] = accX; accX += colW[c] + COL_GAP; }
  const rowY: number[] = [];
  let accY = 0;
  for (let r = 0; r < rowsN; r++) { rowY[r] = accY; accY += rowH[r] + ROW_GAP; }

  const components: Component[] = tables.map((t, idx) => {
    const [w, h] = sizes.get(t.name)!;
    const c = idx % cols, r = (idx / cols) | 0;
    const override = positions?.[t.name];
    const cx = override ? Math.round(override[0]) : Math.round(colX[c] + w / 2);
    const cy = override ? Math.round(override[1]) : Math.round(rowY[r] + h / 2);
    const rows: TableRow[] = t.fields.map((f) => ({
      name: f.name,
      type: f.type,
      pk: f.settings.some((s) => /^pk$|^primary key$/i.test(s)),
      notNull: f.settings.some((s) => /^not null$/i.test(s)),
      unique: f.settings.some((s) => /^unique$/i.test(s)),
      note: (() => { const m = f.settings.find((s) => /^note\s*:/i.test(s)); return m ? unquote(m.replace(/^note\s*:/i, "").trim()) : ""; })(),
      isFk: fkCols.has(`${t.name}.${f.name}`),
    }));
    return makeComponent({
      id: t.name, name: t.name, shape: "table", pos: [cx, cy], size: [w, h], rows,
      headerColor: t.isEnum ? "#6b5b8a" : t.headerColor,
    });
  });

  // Foreign-key edges (row-to-row). Skip dangling refs.
  const colIndex = (table: ParsedTable, col: string): number => {
    const i = table.fields.findIndex((f) => f.name === col);
    return i < 0 ? 0 : i;
  };
  const edges: Edge[] = [];
  for (const r of refs) {
    const st = byKey.get(r.srcTable);
    const dt = byKey.get(r.dstTable);
    if (!st || !dt) continue;
    const e = makeEdge({ src: st.name, dst: dt.name, style: "fk" });
    e.srcRow = colIndex(st, r.srcCol);
    e.dstRow = colIndex(dt, r.dstCol);
    e.srcCol = r.srcCol;
    e.dstCol = r.dstCol;
    e.relOp = r.op;
    edges.push(e);
  }

  const d = makeDiagram({ components, edges });
  return d;
}

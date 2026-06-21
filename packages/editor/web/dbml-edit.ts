// Surgical edits to DBML source for the editor's interactive relationship tools
// (add / delete / change-cardinality). These rewrite the `Ref` statements in the
// text — the single source of truth — preserving the rest of the document.
//
// Relationships can be written three ways in DBML; we handle the two line forms
// directly and strip the inline form from a column's settings:
//   short:  `Ref: a.b > c.d`
//   long:   `Ref name { a.b > c.d }`        (single-line)
//   inline: `b int [ref: > c.d]`            (inside the source table's field)

export type RelOp = ">" | "<" | "-" | "<>";
export interface RelRef { sTable: string; sCol: string; op: string; dTable: string; dCol: string }

const OP_RE = "<>|<|>|-";

// `schema.table.col` / `table.col` → [table, col] (schema dropped, like the parser).
function endpoint(ref: string): [string, string] {
  const parts = ref.trim().replace(/["`]/g, "").split(".");
  return parts.length >= 2 ? [parts[parts.length - 2], parts[parts.length - 1]] : [parts[0] || "", ""];
}
const samePair = (a: RelRef, x: string, xc: string, y: string, yc: string): boolean => {
  const m = (t: string, c: string) => `${t}.${c}`;
  const set = new Set([m(a.sTable, a.sCol), m(a.dTable, a.dCol)]);
  return set.has(m(x, xc)) && set.has(m(y, yc));
};

/** Parse a `Ref` line (short or single-line long form). null if it isn't one. */
function parseRefLine(line: string): RelRef | null {
  // strip an optional `Ref name { … }` wrapper down to the inner expression
  let body = line.trim();
  const long = body.match(/^Ref\b[^:{]*\{\s*(.*?)\s*\}\s*$/i);
  if (long) body = long[1];
  else { const short = body.match(/^Ref\b[^:]*:\s*(.*)$/i); if (!short) return null; body = short[1]; }
  body = body.replace(/\[[^\]]*\]\s*$/, "").trim();          // drop [delete: …] etc.
  const m = body.match(new RegExp(`^(.+?)\\s*(${OP_RE})\\s*(.+)$`));
  if (!m) return null;
  const [sTable, sCol] = endpoint(m[1]);
  const [dTable, dCol] = endpoint(m[3]);
  if (!sTable || !dTable) return null;
  return { sTable, sCol, op: m[2], dTable, dCol };
}

/** Does a relationship between these two columns already exist (any form)? */
export function hasRef(src: string, sT: string, sC: string, dT: string, dC: string): boolean {
  for (const line of src.split("\n")) {
    const r = parseRefLine(line);
    if (r && samePair(r, sT, sC, dT, dC)) return true;
  }
  // inline `ref:` on either column
  return inlineRefMatches(src, sT, sC, dT, dC) || inlineRefMatches(src, dT, dC, sT, sC);
}

// Look for an inline `[... ref: op other.col ...]` on field `fT.fC` pointing at `oT.oC`.
function inlineRefMatches(src: string, fT: string, fC: string, oT: string, oC: string): boolean {
  const fld = findFieldLine(src, fT, fC);
  if (!fld) return false;
  const m = fld.text.match(new RegExp(`ref\\s*:\\s*(?:${OP_RE})\\s*([\\w".]+)`, "i"));
  if (!m) return false;
  const [t, c] = endpoint(m[1]);
  return t === oT && c === oC;
}

// Locate the field line for `table.col`; returns its absolute char span + text.
function findFieldLine(src: string, table: string, col: string): { start: number; end: number; text: string } | null {
  const tbl = new RegExp(`\\bTable\\s+(?:[\\w".]*\\.)?["\`]?${escapeRe(table)}["\`]?\\b[^\\n{]*\\{`, "i").exec(src);
  if (!tbl) return null;
  const open = src.indexOf("{", tbl.index);
  if (open < 0) return null;
  // find matching close brace
  let depth = 0, close = -1;
  for (let i = open; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { if (--depth === 0) { close = i; break; } } }
  if (close < 0) close = src.length;
  const body = src.slice(open + 1, close);
  const re = new RegExp(`(^|\\n)([ \\t]*["\`]?${escapeRe(col)}["\`]?\\b[^\\n]*)`, "");
  const m = re.exec(body);
  if (!m) return null;
  const start = open + 1 + m.index + m[1].length;
  return { start, end: start + m[2].length, text: m[2] };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const refLine = (r: RelRef) => `Ref: ${r.sTable}.${r.sCol} ${r.op} ${r.dTable}.${r.dCol}`;

/** Append a relationship as a short `Ref:` line (no-op if one already exists). */
export function addRef(src: string, sT: string, sC: string, op: string, dT: string, dC: string): string {
  if (!sC || !dC) return src;
  if (hasRef(src, sT, sC, dT, dC)) return src;
  const line = refLine({ sTable: sT, sCol: sC, op, dTable: dT, dCol: dC });
  return src.replace(/\s*$/, "") + `\n${line}\n`;
}

/** Remove the relationship between two columns (short/long line, or inline). */
export function removeRef(src: string, sT: string, sC: string, dT: string, dC: string): string {
  const kept = src.split("\n").filter((line) => {
    const r = parseRefLine(line);
    return !(r && samePair(r, sT, sC, dT, dC));
  });
  let out = kept.join("\n");
  // strip an inline ref on either endpoint, if present
  out = stripInlineRef(out, sT, sC, dT, dC);
  out = stripInlineRef(out, dT, dC, sT, sC);
  return out;
}

function stripInlineRef(src: string, fT: string, fC: string, oT: string, oC: string): string {
  if (!inlineRefMatches(src, fT, fC, oT, oC)) return src;
  const fld = findFieldLine(src, fT, fC);
  if (!fld) return src;
  // remove the `ref: op other.col` clause; tidy leftover brackets/commas
  let line = fld.text.replace(new RegExp(`\\s*,?\\s*ref\\s*:\\s*(?:${OP_RE})\\s*[\\w".]+`, "i"), "");
  line = line.replace(/\[\s*,/, "[").replace(/,\s*\]/, "]").replace(/\[\s*\]/, "").replace(/\s+$/, "");
  return src.slice(0, fld.start) + line + src.slice(fld.end);
}

/** Change the cardinality operator of an existing relationship line. */
export function setRefOp(src: string, sT: string, sC: string, dT: string, dC: string, op: string): string {
  return src.split("\n").map((line) => {
    const r = parseRefLine(line);
    if (r && samePair(r, sT, sC, dT, dC)) return line.replace(new RegExp(`\\s*(?:${OP_RE})\\s*`), ` ${op} `);
    return line;
  }).join("\n");
}

export const NEXT_OP: Record<string, RelOp> = { ">": "<", "<": "-", "-": "<>", "<>": ">" };

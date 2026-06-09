/**
 * Phase 3 — surgical canvas→text patcher. Given the `.kymo` source and a map of
 * component-id → new absolute position, rewrite only what's needed so the drag
 * sticks, preserving comments / formatting / untouched lines:
 *
 *   - `@ (x,y)`            → rewrite the two ints.
 *   - `@ parent side gap`  → replace with `@ (x,y)` (clears the parent ref).
 *   - no `@`              → append ` @ (x,y)`.
 *   - layout-frame member  → remove the bare id from the `horizontal|vertical { … }`
 *                            body AND give the leaf an explicit `@ (x,y)`.
 *   - grid `row` member    → remove the id from its `row` line AND add `@ (x,y)`.
 *
 * Region bare-id membership is left intact (it only feeds auto-bounds, not the
 * position). Self-contained text scanner — mirrors the minimal `dsl.ts` grammar;
 * no `packages/js` dependency.
 */

export interface XY {
  x: number;
  y: number;
}

const LEAF_TRIPLE = /^[\w-]+\/[\w-]+\/\w+$/; // 2nd token: shape/icon/accent
const LAYOUT_OPEN = /^\w+\s+(?:horizontal|vertical)\b.*\{\s*$/;
const REGION_OPEN = /^\w+\s+(?:outer|inner|cluster)\b.*\{\s*$/;
const CLOSE = /^\}\s*$/;
const HEX = "0123456789abcdefABCDEF";

/** Split a line into [code, comment] using the DSL's `#` rule (`#` outside a
 *  quoted string and not starting a hex colour begins a comment). */
function splitComment(line: string): [string, string] {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "#" && !inQuote && !HEX.includes(line[i + 1] ?? "")) {
      return [line.slice(0, i), line.slice(i)];
    }
  }
  return [line, ""];
}

function ref(xy: XY): string {
  return `@ (${Math.round(xy.x)}, ${Math.round(xy.y)})`;
}

/** Set/insert the `@ (x,y)` placement on a leaf line, keeping any trailing comment. */
function patchLeafLine(raw: string, xy: XY): string {
  const [code, comment] = splitComment(raw);
  const at = code.search(/\s+@\s+/);
  if (at >= 0) {
    const before = code.slice(0, at);
    const trailingWs = code.slice(at).match(/\s*$/)![0];
    return `${before} ${ref(xy)}${trailingWs}${comment}`;
  }
  const trailingWs = code.match(/\s*$/)![0];
  const head = code.slice(0, code.length - trailingWs.length);
  return `${head} ${ref(xy)}${trailingWs}${comment}`;
}

/** Remove the given bare ids from a whitespace-separated id line, preserving indent. */
function removeIds(raw: string, ids: Set<string>, isRow: boolean): string | null {
  const indent = raw.match(/^(\s*)/)![1];
  const [code] = splitComment(raw);
  const tokens = code.trim().split(/\s+/);
  const start = isRow ? 1 : 0;
  const kept = tokens.slice(start).filter((t) => !ids.has(t));
  if (kept.length === tokens.length - start) return null; // nothing removed
  if (kept.length === 0) return ""; // emptied → blank line (parser ignores)
  return indent + (isRow ? "row " : "") + kept.join(" ");
}

/**
 * Apply position changes to the `.kymo` text. `moves` maps a component id to its
 * new absolute centre. Returns the patched text (or the input unchanged).
 */
export function patchPositions(text: string, moves: Map<string, XY>): string {
  if (moves.size === 0) return text;
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const ids = new Set(moves.keys());
  const stack: string[] = []; // container kinds: "layout" | "region" | "other"

  for (let i = 0; i < lines.length; i++) {
    const trimmed = splitComment(lines[i])[0].trim();
    if (!trimmed) continue;

    if (CLOSE.test(trimmed)) {
      stack.pop();
      continue;
    }
    if (trimmed.endsWith("{")) {
      stack.push(LAYOUT_OPEN.test(trimmed) ? "layout" : REGION_OPEN.test(trimmed) ? "region" : "other");
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    const id0 = tokens[0];

    // Leaf definition line for a moved component → set its placement.
    if (moves.has(id0) && tokens[1] && LEAF_TRIPLE.test(tokens[1])) {
      lines[i] = patchLeafLine(lines[i], moves.get(id0)!);
      continue;
    }

    // Lift a moved id out of a layout-frame body or a grid `row` (these own positions).
    const isRow = id0 === "row";
    const inLayout = stack[stack.length - 1] === "layout";
    if (isRow || (inLayout && tokens.every((t) => /^[A-Za-z_]\w*$/.test(t)))) {
      const replaced = removeIds(lines[i], ids, isRow);
      if (replaced !== null) lines[i] = replaced;
    }
  }

  return lines.join(nl);
}

/**
 * Minimal, dependency-free XML reader — just enough to walk a BPMN 2.0
 * document. Produces a tree of {@link XmlEl} nodes with namespace prefixes
 * stripped (so `bpmn:task` and `bpmn2:task` both read as `task`). Handles
 * comments, CDATA, processing instructions / the XML declaration, doctype,
 * self-closing tags, single/double-quoted attributes, and the standard +
 * numeric entity references. It is a reader, not a validator.
 */

export interface XmlEl {
  /** local tag name (namespace prefix stripped) */
  tag: string;
  /** attributes keyed by local name */
  attrs: Record<string, string>;
  children: XmlEl[];
  /** concatenated direct text content (entity-decoded) */
  text: string;
}

const local = (name: string): string => {
  const c = name.indexOf(":");
  return c >= 0 ? name.slice(c + 1) : name;
};

function decode(s: string): string {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[body] ?? m;
  });
}

const ATTR_RE = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseTag(body: string): { name: string; attrs: Record<string, string> } {
  const nameMatch = /^\s*([\w:.-]+)/.exec(body);
  const name = nameMatch ? nameMatch[1] : "";
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = nameMatch ? nameMatch[0].length : 0;
  while ((m = ATTR_RE.exec(body)) !== null) {
    attrs[local(m[1])] = decode(m[3] !== undefined ? m[3] : m[4]);
  }
  return { name, attrs };
}

/** Index of the closing `>` of a tag starting at `start`, respecting quotes. */
function tagEnd(src: string, start: number): number {
  let q = "";
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === q) q = ""; }
    else if (ch === '"' || ch === "'") q = ch;
    else if (ch === ">") return i;
  }
  return src.length;
}

/** Parse `src` and return its root element. */
export function parseXml(src: string): XmlEl {
  const root: XmlEl = { tag: "#root", attrs: {}, children: [], text: "" };
  const stack: XmlEl[] = [root];
  const top = () => stack[stack.length - 1];
  const n = src.length;
  let i = 0;

  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    if (lt > i) {
      const t = decode(src.slice(i, lt));
      if (t.trim()) top().text += t;
    }
    if (src.startsWith("<!--", lt)) {
      const e = src.indexOf("-->", lt + 4); i = e < 0 ? n : e + 3; continue;
    }
    if (src.startsWith("<![CDATA[", lt)) {
      const e = src.indexOf("]]>", lt + 9);
      top().text += src.slice(lt + 9, e < 0 ? n : e); i = e < 0 ? n : e + 3; continue;
    }
    if (src.startsWith("<?", lt)) { const e = src.indexOf("?>", lt + 2); i = e < 0 ? n : e + 2; continue; }
    if (src.startsWith("<!", lt)) { const e = tagEnd(src, lt + 2); i = e + 1; continue; }
    if (src.startsWith("</", lt)) {
      const e = src.indexOf(">", lt + 2);
      if (stack.length > 1) stack.pop();
      i = e < 0 ? n : e + 1; continue;
    }
    const e = tagEnd(src, lt + 1);
    const inner = src.slice(lt + 1, e);
    const selfClose = inner.endsWith("/");
    const { name, attrs } = parseTag(selfClose ? inner.slice(0, -1) : inner);
    const el: XmlEl = { tag: local(name), attrs, children: [], text: "" };
    top().children.push(el);
    if (!selfClose) stack.push(el);
    i = e + 1;
  }
  return root.children[0] ?? root;
}

/** Depth-first (document order) iterator over `el` and all descendants. */
export function* iterAll(el: XmlEl): Generator<XmlEl> {
  yield el;
  for (const c of el.children) yield* iterAll(c);
}

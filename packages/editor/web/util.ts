const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// 16 random base62 chars ≈ 95 bits — the room id doubles as the share secret,
// so it needs real entropy (the old 8-hex slice was 32 bits).
export function newId(len = 16): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

const clip = (t: string) => { t = t.trim(); return t ? t.slice(0, 60) : ""; };

// Kymo: first node label — A[Nhận đơn hàng] → "Nhận đơn hàng".
function kymoTitle(source: string): string {
  // Strip the block wrapper ("flowchart TD {" … "}") so its braces don't match as a diamond node.
  const body = source.replace(/^\s*(?:flowchart|bpmn)[^{]*\{/i, "");
  const m = body.match(/\[([^\]]+)\]|\(\(([^()]+)\)\)|\{([^{}]+)\}|\(([^()]+)\)/);
  return clip((m && (m[1] || m[2] || m[3] || m[4])) || "");
}

// An explicit title most grammars share: mermaid `title X` / frontmatter `title:`,
// plantuml `title X`, d2 `title: X`, graphviz `label="X"`.
function directiveTitle(source: string): string {
  const t = source.match(/^\s*title\s*:?\s*["']?(.+?)["']?\s*$/im);
  if (t) return clip(t[1]);
  const l = source.match(/^\s*label\s*=\s*["'](.+?)["']/im);
  return l ? clip(l[1]) : "";
}

// Grammar/preamble lines that carry no human title — skip them in the generic pass.
const SKIP_LINE = /^\s*($|[#%]|\/\/|@start|@end|```|---|flowchart\b|graph\b|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|gantt\b|journey\b|mindmap\b|timeline\b|gitGraph\b|digraph\b|graph\s|strict\b|@startuml\b|direction\b|theme\b|config\b)/i;

// Pull the first quoted/bracketed label, else the first salient token of the
// first meaningful line — so any kind gets a recognizable name, not "Untitled".
function genericTitle(source: string): string {
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || SKIP_LINE.test(line)) continue;
    const m = line.match(/["']([^"']+)["']|\[([^\]]+)\]|\{([^{}]+)\}|\(([^()]+)\)/);
    if (m) { const v = clip(m[1] || m[2] || m[3] || m[4]); if (v) return v; }
    return clip(line);
  }
  return "";
}

// Derive a display title from the source for any diagram kind.
export function titleFrom(source: string, kind = "kymo"): string {
  if (!source.trim()) return "Untitled";
  const t = (kind === "kymo" ? kymoTitle(source) : directiveTitle(source) || genericTitle(source));
  return t || "Untitled";
}

// Coarse "x minutes ago" relative time (shared by the Explorer + Diagrams + Trash lists).
export function timeAgo(ms: number): string {
  if (!ms) return "";
  const s = Math.max(1, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}

// Next free "Untitled-N" given existing titles, so abandoned blank diagrams
// don't all collapse into an indistinguishable "Untitled" pile.
export function nextUntitledName(titles: Iterable<string>): string {
  const used = new Set<number>();
  let hasBare = false;
  for (const t of titles) {
    const s = (t || "").trim();
    if (s === "Untitled") hasBare = true;
    const m = s.match(/^Untitled-(\d+)$/);
    if (m) used.add(Number(m[1]));
  }
  if (!hasBare && used.size === 0) return "Untitled";
  let n = 1;
  while (used.has(n)) n++;
  return `Untitled-${n}`;
}

// Grammar sniffing for paste auto-detect: given a pasted source, name the kind
// it is written in — or null when not confident. Rules are ordered by
// specificity and deliberately conservative: a wrong silent kind switch is far
// worse than no switch (the kind select stays as the manual override).

const MERMAID_HEADS = new RegExp(
  "^(sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie\\b|quadrantChart|" +
    "requirementDiagram|gitGraph|C4(Context|Container|Component|Dynamic|Deployment)|mindmap|timeline|" +
    "sankey-beta|xychart-beta|block-beta|packet-beta|kanban|architecture-beta|radar-beta|treemap-beta)\\b",
);

/** First line that is neither blank nor a comment (`%%` mermaid, `//`, `'` plantuml-ish). */
function firstMeaningfulLine(text: string): string {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("%%{")) return line; // mermaid init directive IS meaningful
    if (line.startsWith("%%") || line.startsWith("//")) continue;
    return line;
  }
  return "";
}

export function sniffKind(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  // XML-ish documents.
  if (t.includes("<bpmn:definitions")) return "bpmn";

  // PlantUML family.
  if (/^@start(uml|mindmap|gantt|wbs|json|yaml|salt)\b/.test(t)) {
    return /!include\s*<C4\//.test(t) ? "c4plantuml" : "plantuml";
  }

  // JSON documents.
  if (t.startsWith("{")) {
    if (/"signal"\s*:/.test(t)) return "wavedrom";
    if (/"type"\s*:\s*"excalidraw"/.test(t)) return "excalidraw";
    if (/"\$schema"\s*:\s*"[^"]*vega-lite/.test(t)) return "vegalite";
    if (/"\$schema"\s*:\s*"[^"]*vega\//.test(t)) return "vega";
    return null;
  }

  const head = firstMeaningfulLine(t);

  // kymo's flowchart DSL opens a brace right after the direction token; mermaid never does.
  if (/^flowchart\s+(TD|TB|LR|RL|BT)\s*\{/.test(head)) return "kymo";

  // GraphViz roots carry the brace on the head line (`digraph G {`, `strict graph {`).
  if (/^(strict\s+)?(di)?graph\b[^{]*\{/.test(head)) return "graphviz";

  // Mermaid: a bare direction header or one of the per-diagram keywords.
  if (/^(flowchart|graph)\s+(TD|TB|LR|RL|BT)\s*$/.test(head)) return "mermaid";
  if (MERMAID_HEADS.test(head) || head.startsWith("%%{")) return "mermaid";

  // blockdiag family + friends, all `name {` openers.
  const m = head.match(/^(nwdiag|blockdiag|actdiag|seqdiag|rackdiag|packetdiag)\s*\{/);
  if (m) return m[1];
  if (/^Table\s+\w+\s*\{/i.test(head)) return "dbml";
  if (/^workspace\s*\{/.test(head)) return "structurizr";

  // D2: needs corroborating markers — `->` edges alone are too ambiguous.
  if (/^\s*(direction\s*:\s*(up|down|left|right)|\w[\w.]*\s*:\s*\{|\w+\s*:\s*"")/m.test(t) || /shape\s*:\s*(sql_table|cylinder|cloud|person)/.test(t)) {
    if (/->|<-|--/.test(t) || /shape\s*:/.test(t)) return "d2";
  }

  return null;
}

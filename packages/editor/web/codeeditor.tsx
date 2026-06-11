import React, { useEffect, useRef } from "react";
import { EditorState, Compartment, Extension } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightActiveLineGutter,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, StreamLanguage, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { clojure } from "@codemirror/legacy-modes/mode/clojure";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";

// ---- generic diagram-DSL highlighter (comments / strings / numbers / arrows / keywords) ----
function dsl(keywords: string[]): Extension {
  const kw = new Set(keywords.map((k) => k.toLowerCase()));
  return StreamLanguage.define({
    token(stream: any) {
      if (stream.match(/^\/\/.*/) || stream.match(/^#.*/)) return "comment";
      if (stream.sol() && stream.match(/^'.*/)) return "comment"; // plantuml line comment
      if (stream.match(/^"([^"\\]|\\.)*"?/) || stream.match(/^'([^'\\]|\\.)*'?/) || stream.match(/^`[^`]*`?/)) return "string";
      if (stream.match(/^\d+(\.\d+)?(px|pt|%|U|mm2?)?/)) return "number";
      if (stream.match(/^(<-+>|<\.+>|[<o*]?[-.=~]{1,4}[->|:>o*]?>?|=+>)/)) return "operator";
      const m = stream.match(/^[A-Za-z_@!][\w@!]*/);
      if (m) return kw.has(m[0].toLowerCase().replace(/^[@!]/, "")) ? "keyword" : null;
      stream.next();
      return null;
    },
  });
}

const PLANTUML_KW = [
  "startuml", "enduml", "actor", "participant", "boundary", "control", "entity", "database", "collections",
  "queue", "usecase", "class", "interface", "enum", "abstract", "package", "rectangle", "component", "node",
  "folder", "frame", "cloud", "skinparam", "title", "note", "end", "left", "right", "of", "over", "as",
  "include", "person", "system", "system_ext", "rel", "rel_back", "container", "containerdb", "container_boundary",
];
const LANGS: Record<string, () => Extension> = {
  kymo: () => dsl(["flowchart", "bpmn", "td", "lr", "tb", "rl", "bt"]),
  mermaid: () => dsl([
    "graph", "flowchart", "sequencediagram", "classdiagram", "statediagram", "erdiagram", "journey", "gantt",
    "pie", "subgraph", "end", "participant", "actor", "loop", "alt", "else", "opt", "par", "note", "click",
    "style", "classdef", "td", "lr", "tb", "rl", "bt",
  ]),
  plantuml: () => dsl(PLANTUML_KW),
  c4plantuml: () => dsl(PLANTUML_KW),
  graphviz: () => dsl(["digraph", "graph", "subgraph", "node", "edge", "rankdir", "label", "shape", "style", "color", "fontname"]),
  dbml: () => dsl(["table", "ref", "enum", "indexes", "note", "primary", "key", "unique", "not", "null", "default", "increment", "project", "tablegroup"]),
  d2: () => dsl(["direction", "shape", "style", "label", "near", "icon", "width", "height", "fill", "stroke"]),
  structurizr: () => dsl(["workspace", "model", "views", "person", "softwaresystem", "container", "component", "systemcontext", "theme", "include", "autolayout", "default", "deployment", "styles"]),
  nomnoml: () => dsl(["abstract", "instance", "reference", "package", "frame", "database", "start", "end", "state", "choice", "sync", "table", "actor", "usecase", "label", "note", "hidden", "directives"]),
  erd: () => dsl(["title", "header", "entity", "relationship"]),
  pikchr: () => dsl(["arrow", "box", "circle", "ellipse", "oval", "line", "arc", "spline", "text", "right", "left", "up", "down", "from", "to", "then", "same", "at", "with", "fit", "rad", "color", "fill", "thickness", "behind", "last", "first", "previous", "chop", "dashed", "dotted"]),
  blockdiag: () => dsl(["blockdiag", "group", "label", "color", "shape", "node_width", "node_height"]),
  seqdiag: () => dsl(["seqdiag", "label", "color", "activation", "autonumber", "edge_length"]),
  actdiag: () => dsl(["actdiag", "lane", "label", "color"]),
  nwdiag: () => dsl(["nwdiag", "network", "group", "address", "label", "color", "shape"]),
  packetdiag: () => dsl(["packetdiag", "colwidth", "node_height", "label"]),
  rackdiag: () => dsl(["rackdiag", "label", "description", "ascending"]),
  ditaa: () => dsl([]),
  svgbob: () => dsl([]),
  excalidraw: () => json(),
  vega: () => json(),
  vegalite: () => json(),
  wavedrom: () => json(),
  bpmn: () => xml(),
  umlet: () => xml(),
  wireviz: () => StreamLanguage.define(yaml),
  bytefield: () => StreamLanguage.define(clojure),
  tikz: () => StreamLanguage.define(stex),
  symbolator: () => StreamLanguage.define(verilog),
};
const langFor = (kind: string): Extension => (LANGS[kind] ?? LANGS.kymo)();

// ---- light theme on the brand palette ----
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", backgroundColor: "var(--bg)", color: "var(--ink)" },
  ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.7", padding: "8px 0" },
  ".cm-content": { caretColor: "var(--accent)", padding: "0 12px 16px 4px" },
  ".cm-cursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  "&.cm-focused": { outline: "none" },
  ".cm-line": { padding: "0 8px 0 6px" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(224, 9, 95, 0.12)" },
  ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--border-strong)", border: "none", fontSize: "12.5px" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 16px", minWidth: "40px" },
  ".cm-activeLine": { backgroundColor: "var(--bg-soft)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--bg-soft)", color: "var(--dim)" },
  ".cm-matchingBracket": { backgroundColor: "rgba(224, 9, 95, 0.14)", outline: "none" },
});
const highlight = HighlightStyle.define([
  { tag: t.comment, color: "#3e7e22" },
  { tag: t.lineComment, color: "#3e7e22" },
  { tag: t.blockComment, color: "#3e7e22" },
  { tag: t.keyword, color: "#1f48cf", fontWeight: "600" },
  { tag: t.string, color: "#b03524" },
  { tag: t.number, color: "#1f48cf" },
  { tag: t.bool, color: "#1f48cf" },
  { tag: t.null, color: "#1f48cf" },
  { tag: t.propertyName, color: "#242131", fontWeight: "600" },
  { tag: t.operator, color: "#6e6a7c" },
  { tag: t.angleBracket, color: "#6e6a7c" },
  { tag: t.tagName, color: "#1f48cf" },
  { tag: t.attributeName, color: "#7c3aed" },
  { tag: t.attributeValue, color: "#b03524" },
]);

type Props = { value: string; kind: string; onChange: (v: string) => void };

export function CodeEditor({ value, kind, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const applyingExternal = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const langComp = useRef(new Compartment()).current;

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), drawSelection(),
          history(), bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          theme, syntaxHighlighting(highlight),
          langComp.of(langFor(kind)),
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged && !applyingExternal.current) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
      parent: host.current!,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []); // eslint-disable-line

  // external value change (room switch, live update, sample load)
  useEffect(() => {
    const view = viewRef.current; if (!view) return;
    const cur = view.state.doc.toString();
    if (cur === value) return;
    applyingExternal.current = true;
    view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    applyingExternal.current = false;
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: langComp.reconfigure(langFor(kind)) });
  }, [kind, langComp]);

  return <div className="code-editor" ref={host} />;
}

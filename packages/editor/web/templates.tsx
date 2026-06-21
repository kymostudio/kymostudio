// "New diagram" template gallery: users pick a DIAGRAM TYPE, not a syntax —
// each template seeds the editor with a working starter in the recommended
// language and sets the kind automatically (the kind select stays the manual
// override). Glyphs + sources mirror the landing page's "Every diagram, one
// studio" strip (packages/website/src/landing/main.tsx), where every example
// was render-verified.
import React, { useEffect, useMemo, useState } from "react";
import { FilePlus2, Search } from "lucide-react";

// Small corner pills on a language row (e.g. Mermaid is the most-used family).
const VIA_BADGE: Record<string, string> = { Mermaid: "TOP" };

// One-line blurb per language (left column) and per diagram type (right column),
// shown as the grey subtitle under each row.
const VIA_DESC: Record<string, string> = {
  Mermaid: "Text diagrams, 14 types",
  Kymo: "Native animated diagrams",
  "BPMN XML": "Business process models",
  PlantUML: "UML from plain text",
  D2: "Modern declarative diagrams",
  GraphViz: "Graphs via DOT",
  WaveDrom: "Digital timing diagrams",
};
const TYPE_DESC: Record<string, string> = {
  Flowchart: "Steps & decisions",
  Architecture: "Services & infra",
  BPMN: "Business Process Model and Notation",
  Sequence: "Interactions over time",
  Class: "Types & relationships",
  ER: "Entities & relations",
  State: "States & transitions",
  C4: "Software architecture",
  "Use case": "Actors & goals",
  Activity: "Workflow branches",
  Component: "Modules & wiring",
  Deployment: "Nodes & artifacts",
  Database: "Tables & keys",
  Gantt: "Project schedule",
  Timeline: "Events over time",
  "Git graph": "Branches & merges",
  Network: "Nodes & links",
  Mindmap: "Branching ideas",
  Kanban: "Cards in columns",
  Timing: "Signal waveforms",
  Pie: "Proportions",
  "XY chart": "Plot data",
};

const G = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Per-LANGUAGE marks for the left browse column — real brand logos where they
// exist (Mermaid by Simple Icons, Kymo's own K, PlantUML/GraphViz from TDesign),
// a custom container glyph for D2. BPMN XML and WaveDrom fall back to their one
// starter's glyph (the canonical BPMN events / square wave already read right).
const VIA_GLYPH: Record<string, React.ReactNode> = {
  // Recognisable per-language marks, drawn monochrome (currentColor) so they read
  // as a neutral icon set: Mermaid's logo silhouette, Kymo's K, PlantUML/GraphViz
  // from TDesign, a custom D2 container glyph.
  Mermaid: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.99 2.115A12.22 12.22 0 0 0 12 10.149A12.22 12.22 0 0 0 .01 2.115a12.23 12.23 0 0 0 5.32 10.604a6.56 6.56 0 0 1 2.845 5.423v3.754h7.65v-3.754a6.56 6.56 0 0 1 2.844-5.423a12.22 12.22 0 0 0 5.32-10.604Z" /></svg>
  ),
  Kymo: (
    <svg viewBox="0 0 64 64" fill="currentColor"><path transform="translate(9.90 53.26) scale(0.029471 -0.029471)" d="M312 -25C447 -25 524 55 524 197V378L650 508L974 97C1043 9 1105 -25 1196 -25C1312 -25 1400 64 1400 180C1400 240 1369 304 1296 394L984 780L1282 1098C1342 1162 1364 1208 1364 1272C1364 1381 1274 1468 1163 1468C1091 1468 1036 1440 975 1372L532 871H524V1246C524 1388 447 1468 312 1468C177 1468 100 1388 100 1246V197C100 55 177 -25 312 -25Z" /></svg>
  ),
  PlantUML: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 13.5v4m0-4h13m-13 0V10m13 3.5v4m0-4V10m-13 0V6.5m0 3.5h13m0 0V6.5m-2.5 11h5V21h-5zm-13 0h5V21H3zm13-11h5V3h-5zm-13 0h5V3H3z" /></svg>
  ),
  GraphViz: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 14H9v-4h3m0 4h3v-4h-3m0 4v5m0-9V5m0 0h5m-5 0H7m10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0ZM7 5a2 2 0 1 1-4 0a2 2 0 0 1 4 0Zm5 14H7m5 0h5M7 19a2 2 0 1 1-4 0a2 2 0 0 1 4 0Zm10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0Z" /></svg>
  ),
  D2: (
    <svg viewBox="0 0 24 24" {...G}><rect x="3" y="4.5" width="18" height="15" rx="2" /><rect x="6" y="8" width="5.2" height="3.6" rx="0.9" /><rect x="12.8" y="12" width="5.2" height="3.6" rx="0.9" /><path d="M11.2 9.8h2.1c1 0 1.5.5 1.5 1.5v1" /></svg>
  ),
};

export type Template = { name: string; kind: string; via: string; glyph: React.ReactNode; source: string };

export const TEMPLATES: Template[] = [
  {
    name: "Flowchart", kind: "kymo", via: "Kymo",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="6.5" y="3" width="11" height="5.5" rx="1.3" /><path d="M12 8.5v3" /><path d="M12 11.5l4.5 4.5-4.5 4.5-4.5-4.5z" /></svg>,
    source: `flowchart TD {
  A[Receive order] --> B{In stock?}
  B -->|Yes| C[Take payment]
  B -->|No| D[Notify customer]
  C --> E[Pack items]
  E --> F((Ship order))
  D --> G[Cancel order]
}`,
  },
  {
    name: "Flowchart", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="6.5" y="3" width="11" height="5.5" rx="1.3" /><path d="M12 8.5v3" /><path d="M12 11.5l4.5 4.5-4.5 4.5-4.5-4.5z" /></svg>,
    source: `flowchart TD
  A[Receive order] --> B{In stock?}
  B -->|Yes| C[Take payment]
  B -->|No| D[Notify customer]
  C --> E[Pack items]
  E --> F((Ship order))
  D --> G[Cancel order]`,
  },
  {
    name: "Architecture", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="3" y="3.5" width="18" height="17" rx="2" /><rect x="6.5" y="7" width="5.5" height="5" rx="1" /><path d="M12 12l3 3" /><rect x="15" y="13" width="4" height="4" rx="1" /></svg>,
    source: `architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db`,
  },
  {
    name: "BPMN", kind: "bpmn", via: "BPMN XML",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="4.6" cy="12" r="2.1" /><path d="M6.7 12H9" /><rect x="9" y="8.8" width="6.4" height="6.4" rx="1.4" /><path d="M15.4 12h2.2" /><circle cx="19.7" cy="12" r="2.1" /><circle cx="19.7" cy="12" r="0.9" fill="currentColor" stroke="none" /></svg>,
    source: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="defs" targetNamespace="http://kymo.studio/bpmn">
  <bpmn:process id="proc" isExecutable="false">
    <bpmn:startEvent id="start" name="Start">
      <bpmn:outgoing>f1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="task" name="Do work">
      <bpmn:incoming>f1</bpmn:incoming>
      <bpmn:outgoing>f2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="end" name="End">
      <bpmn:incoming>f2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="f1" sourceRef="start" targetRef="task" />
    <bpmn:sequenceFlow id="f2" sourceRef="task" targetRef="end" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="dia">
    <bpmndi:BPMNPlane id="plane" bpmnElement="proc">
      <bpmndi:BPMNShape id="s_start" bpmnElement="start">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_task" bpmnElement="task">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_end" bpmnElement="end">
        <dc:Bounds x="392" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="e_f1" bpmnElement="f1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_f2" bpmnElement="f2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
  },
  {
    name: "Sequence", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M6.5 4v16M17.5 4v16" /><path d="M6.5 9h11" /><path d="M15.2 6.8L17.5 9l-2.3 2.2" /><path d="M17.5 15.5h-11" /></svg>,
    source: `sequenceDiagram
    participant A as Alice
    participant J as John
    A->>J: Hello John, how are you?
    J-->>A: Great!
    A-)J: See you later`,
  },
  {
    name: "Class", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="4.5" y="3.5" width="15" height="17" rx="1.6" /><path d="M4.5 9h15M4.5 14.5h15" /></svg>,
    source: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal : +isMammal()
    Animal : +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }`,
  },
  {
    name: "ER", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="2.8" y="8.3" width="7.2" height="7.4" rx="1.2" /><rect x="15" y="8.3" width="6.2" height="7.4" rx="3.1" /><path d="M10 12h5M15 12l-2.6-2.3M15 12l-2.6 2.3" /></svg>,
    source: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`,
  },
  {
    name: "State", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" /><path d="M6.7 12h3.3" /><rect x="10" y="8.3" width="10.5" height="7.4" rx="3.7" /></svg>,
    source: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
  },
  {
    name: "C4", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="7" cy="5.8" r="2.1" /><path d="M3.5 12.5c0-2 1.6-3.3 3.5-3.3s3.5 1.3 3.5 3.3" /><rect x="13.5" y="7.5" width="7.5" height="6" rx="1.2" /><path d="M7 12.5v4.5h6.5" /></svg>,
    source: `C4Context
    title System Context diagram for Internet Banking
    Person(customer, "Banking Customer", "A customer of the bank.")
    System(banking, "Internet Banking System", "Allows customers to view accounts.")
    System_Ext(mail, "E-mail System", "The internal e-mail system.")
    Rel(customer, banking, "Uses")
    Rel(banking, mail, "Sends e-mail", "SMTP")`,
  },
  {
    name: "Use case", kind: "plantuml", via: "PlantUML",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="5.5" cy="5.5" r="1.9" /><path d="M5.5 7.4v4.6M3 9.5h5M5.5 12l-2 4M5.5 12l2 4" /><ellipse cx="16.5" cy="12" rx="5" ry="3.4" /></svg>,
    source: `@startuml
left to right direction
actor Customer
actor Support
rectangle Store {
  Customer -- (Browse catalog)
  Customer -- (Place order)
  (Place order) .> (Pay) : include
  Support -- (Handle refund)
}
@enduml`,
  },
  {
    name: "Activity", kind: "plantuml", via: "PlantUML",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="4.3" cy="12" r="1.6" fill="currentColor" stroke="none" /><path d="M5.9 12h2.6" /><rect x="8.5" y="8.8" width="7" height="6.4" rx="2.6" /><path d="M15.5 12H17" /><path d="M17 12l2.3-2.3L21.6 12l-2.3 2.3z" /></svg>,
    source: `@startuml
start
:Receive order;
if (In stock?) then (yes)
  :Take payment;
  :Pack items;
  :Ship order;
else (no)
  :Notify customer;
  :Cancel order;
endif
stop
@enduml`,
  },
  {
    name: "Component", kind: "plantuml", via: "PlantUML",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="7.5" y="4" width="13" height="16" rx="1.5" /><rect x="3" y="7.5" width="7" height="3.4" rx="0.9" /><rect x="3" y="13.1" width="7" height="3.4" rx="0.9" /></svg>,
    source: `@startuml
package "Storefront" {
  [Web App] --> [API Gateway]
}
[API Gateway] --> [Orders Service]
[API Gateway] --> [Catalog Service]
[Orders Service] --> [Payments]
database "Orders DB" as DB
[Orders Service] --> DB
@enduml`,
  },
  {
    name: "Deployment", kind: "plantuml", via: "PlantUML",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4.5 8.5L9 4h10.5v11.5L15 20H4.5z" /><path d="M4.5 8.5H15V20M15 8.5L19.5 4" /></svg>,
    source: `@startuml
node "Cloud" {
  node "Kubernetes" {
    artifact "api v2.4" as api
    artifact "worker v2.4" as worker
  }
  database "Postgres" as db
  queue "Events" as q
}
node "Browser" as b
b --> api : HTTPS
api --> db
api --> q
q --> worker
@enduml`,
  },
  {
    name: "Database", kind: "d2", via: "D2",
    glyph: <svg viewBox="0 0 24 24" {...G}><ellipse cx="12" cy="5.6" rx="7" ry="2.6" /><path d="M5 5.6v12.8c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5.6" /><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" /></svg>,
    source: `users: {
  shape: sql_table
  id: int {constraint: primary_key}
  email: varchar
  created_at: timestamp
}

orders: {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

orders.user_id -> users.id`,
  },
  {
    name: "Gantt", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4 4v16" /><path d="M7 7.5h7M7 12h10M7 16.5h5" strokeWidth="2.6" /></svg>,
    source: `gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
        A task          :a1, 2024-01-01, 30d
        Another task    :after a1, 20d
    section Another
        Task in Another :2024-01-12, 12d
        another task    :24d`,
  },
  {
    name: "Timeline", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M3 12h18" /><path d="M7 12V7.5M13 12v4.5M19 12V7.5" /><circle cx="7" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="13" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" /></svg>,
    source: `timeline
    title History of Social Media
    2002 : LinkedIn
    2004 : Facebook
         : Google
    2005 : YouTube
    2006 : Twitter`,
  },
  {
    name: "Git graph", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="6.5" cy="5.5" r="1.9" /><circle cx="6.5" cy="18.5" r="1.9" /><circle cx="17.5" cy="12" r="1.9" /><path d="M6.5 7.4v9.2" /><path d="M8 6.7c4.5 1 7.6 2.6 8.4 3.6" /></svg>,
    source: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit`,
  },
  {
    name: "Network", kind: "graphviz", via: "GraphViz",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="2.5" /><circle cx="5" cy="5.5" r="1.8" /><circle cx="19" cy="5.5" r="1.8" /><circle cx="5" cy="18.5" r="1.8" /><circle cx="19" cy="18.5" r="1.8" /><path d="M10.2 10.4L6.3 6.8M13.8 10.4l3.9-3.6M10.2 13.6l-3.9 3.6M13.8 13.6l3.9 3.6" /></svg>,
    source: `graph network {
  rankdir=TB;
  node [shape=box, style=rounded, fontname="Helvetica"];
  internet [shape=ellipse, label="Internet"];
  router  [label="Router"];
  sw1 [label="Switch A"];
  sw2 [label="Switch B"];
  internet -- router;
  router -- sw1;
  router -- sw2;
  sw1 -- web01;
  sw1 -- web02;
  sw2 -- db01;
  sw2 -- db02;
}`,
  },
  {
    name: "Mindmap", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="2.7" /><path d="M14.3 10.5l4-3.2M14.5 13l4.2 1.6M9.7 13.6L5.3 16.8" /><circle cx="19.8" cy="6.3" r="1.6" /><circle cx="20.2" cy="15.3" r="1.6" /><circle cx="4" cy="17.8" r="1.6" /></svg>,
    source: `mindmap
  root((kymo))
    Origins
      Long history
      Popularisation
    Research
      On effectiveness
      On automatic creation
    Tools
      Pen and paper
      Diagram as code`,
  },
  {
    name: "Kanban", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><rect x="3.5" y="4" width="5" height="13" rx="1" /><rect x="9.5" y="4" width="5" height="9" rx="1" /><rect x="15.5" y="4" width="5" height="16" rx="1" /></svg>,
    source: `kanban
  Todo
    [Create Documentation]
    docs[Create Blog about the new diagram]
  [In progress]
    id6[Create renderer so that it works in all cases]
  id9[Ready for deploy]
    id8[Design grammar]
  id10[Done]
    id5[define getData]`,
  },
  {
    name: "Timing", kind: "wavedrom", via: "WaveDrom",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M3 16h3V8h4.5v8H15V8h4v8h2" /></svg>,
    source: `{ "signal": [
  { "name": "clk",  "wave": "p......" },
  { "name": "bus",  "wave": "x.34.5x", "data": ["head", "body", "tail"] },
  { "name": "wire", "wave": "0.1..0." }
]}`,
  },
  {
    name: "Pie", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><circle cx="12" cy="12" r="8" /><path d="M12 12V4M12 12l6.8 4.2" /></svg>,
    source: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`,
  },
  {
    name: "XY chart", kind: "mermaid", via: "Mermaid",
    glyph: <svg viewBox="0 0 24 24" {...G}><path d="M4.5 4v15.5H20" /><path d="M7 14.5l3.8-4.7 3.4 2.9 4.8-6.7" /></svg>,
    source: `xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000]`,
  },
];

// /diagrams creates the room then navigates to the editor — a module-level slot
// carries the picked template across that client-side navigation (same trick as
// EditorPage's pendingImport ref, but reachable from another route component).
let pendingTemplate: { source: string; kind: string } | null = null;
export function setPendingTemplate(t: { source: string; kind: string }) { pendingTemplate = t; }
export function takePendingTemplate(): { source: string; kind: string } | null {
  const t = pendingTemplate;
  pendingTemplate = null;
  return t;
}
/** Non-consuming check — lets effects that run before the consumer know a draft is inbound. */
export function peekPendingTemplate(): boolean {
  return pendingTemplate !== null;
}

const keyOf = (t: Template) => `${t.name}-${t.via}`;

export function TemplateGallery({ onPick, onClose }: { onPick: (t: Template, name: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("Untitled");
  // Default to the first Mermaid type — Mermaid leads the gallery, so the
  // highlighted card and footer hint should match what's shown on top.
  const [selKey, setSelKey] = useState<string>(keyOf(TEMPLATES.find((t) => t.via === "Mermaid") ?? TEMPLATES[0]));
  // Step 2 drill target: a language ("via") or a diagram type ("type"). null = the
  // two-column browse screen. Search overrides both with a flat result list.
  const [drill, setDrill] = useState<{ kind: "via" | "type"; key: string } | null>(null);
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? TEMPLATES.filter((t) => `${t.name} ${t.via} ${t.kind}`.toLowerCase().includes(needle))
    : TEMPLATES;
  // The committed selection (falls back to the first visible when filtering away the old one).
  const selected = shown.find((t) => keyOf(t) === selKey) ?? shown[0] ?? null;
  const create = () => { if ((needle || drill) && selected) onPick(selected, name.trim() || "Untitled"); };
  // Languages, Mermaid first (broadest family), the rest in first-appearance order.
  const vias = useMemo(() => {
    const order: string[] = [];
    for (const t of TEMPLATES) if (!order.includes(t.via)) order.push(t.via);
    return order.sort((a, b) => (a === "Mermaid" ? -1 : b === "Mermaid" ? 1 : 0));
  }, []);
  // One representative starter per diagram-type name (for the right browse column).
  const distinctTypes = useMemo(() => {
    const seen = new Set<string>(); const out: Template[] = [];
    for (const t of TEMPLATES) if (!seen.has(t.name)) { seen.add(t.name); out.push(t); }
    return out;
  }, []);
  const viaGlyph = (via: string) => TEMPLATES.find((t) => t.via === via)?.glyph;
  const drillItems = drill
    ? TEMPLATES.filter((t) => (drill.kind === "via" ? t.via === drill.key : t.name === drill.key))
    : [];
  // Open Step 2 and pre-select its first starter so Create is immediately meaningful.
  const openDrill = (d: { kind: "via" | "type"; key: string }) => {
    setDrill(d);
    const first = TEMPLATES.find((t) => (d.kind === "via" ? t.via === d.key : t.name === d.key));
    if (first) setSelKey(keyOf(first));
  };
  // Create is only meaningful once a concrete starter is in view (search or Step 2).
  const canCreate = (needle || drill) && selected != null;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  // Generic Image #4-style row: monochrome icon + bold name + grey subtitle.
  const row = (opts: {
    key: string; glyph: React.ReactNode; name: string; sub: string;
    badge?: string; sel?: boolean; onClick: () => void; onDoubleClick?: () => void;
  }) => (
    <button
      key={opts.key} type="button"
      className={"tpl-card" + (opts.sel ? " selected" : "")}
      aria-pressed={!!opts.sel}
      onClick={opts.onClick} onDoubleClick={opts.onDoubleClick}
    >
      <span className="tpl-ic">{opts.glyph}{opts.badge && <span className="tpl-badge">{opts.badge}</span>}</span>
      <span className="tpl-txt">
        <span className="tpl-name">{opts.name}</span>
        <span className="tpl-via">{opts.sub}</span>
      </span>
    </button>
  );

  // A starter row in Step 2 / search results. Subtitle shows the language, except
  // when we're already inside a single language (then show what makes them differ).
  const card = (t: Template, sub?: string) =>
    row({
      key: keyOf(t), glyph: t.glyph, name: t.name,
      sub: sub ?? t.via,
      sel: selected != null && keyOf(selected) === keyOf(t),
      onClick: () => setSelKey(keyOf(t)),
      onDoubleClick: () => onPick(t, name.trim() || "Untitled"),
    });

  return (
    <div className="tpl-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="New diagram">
      <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-head">
          <div className="tpl-head-top">
            <div>
              <h2>New diagram</h2>
              <p className="tpl-sub">Name it, pick a type, hit Create — you get a working starter. Or just paste any source; the language is auto-detected.</p>
            </div>
            <button className="tpl-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="tpl-fields">
            <label className="tpl-field tpl-field-name">
              <FilePlus2 size={15} strokeWidth={2} />
              <input
                type="text" placeholder="File name" aria-label="File name"
                value={name} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => { if (e.key === "Enter") create(); }}
              />
            </label>
            <label className="tpl-field tpl-field-search">
              <Search size={15} strokeWidth={2} />
              <input
                autoFocus type="search" placeholder="Search 20+ types — try “sequence” or “plantuml”"
                value={q} aria-label="Filter diagram types"
                onChange={(e) => { setQ(e.target.value); if (e.target.value.trim()) setDrill(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create(); // quick flow: type "seq" ⏎
                  else if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } // 1st Esc clears, 2nd closes
                }}
              />
            </label>
          </div>
        </div>
        {needle ? (
          // Search: flat results across everything.
          <div className="tpl-body tpl-templates">
            <h3 className="tpl-colhead">{`Matches for “${q.trim()}”`}</h3>
            {!shown.length
              ? <p className="tpl-empty">No diagram type matches “{q.trim()}”.</p>
              : <div className="tpl-grid">{shown.map((t) => card(t))}</div>}
          </div>
        ) : drill ? (
          // Step 2: the starters for the chosen language or diagram type.
          <div className="tpl-body tpl-templates">
            <div className="tpl-tplhead">
              <button type="button" className="tpl-back" onClick={() => setDrill(null)} aria-label="Back">← Back</button>
              <h3 className="tpl-colhead">{drill.kind === "via" ? `${drill.key} templates` : `${drill.key} templates`}</h3>
            </div>
            <div className="tpl-grid">
              {drillItems.map((t) => card(t, drill.kind === "via" ? (TYPE_DESC[t.name] || t.via) : t.via))}
            </div>
          </div>
        ) : (
          // Step 1: two parallel browse columns — Language | Diagrams.
          <div className="tpl-body tpl-cols">
            <section className="tpl-col" aria-label="Language">
              <h3 className="tpl-colhead">Language</h3>
              {vias.map((via) => row({
                key: via, glyph: VIA_GLYPH[via] ?? viaGlyph(via), name: via, sub: VIA_DESC[via] || "",
                badge: VIA_BADGE[via],
                onClick: () => openDrill({ kind: "via", key: via }),
              }))}
            </section>
            <section className="tpl-col" aria-label="Diagrams">
              <h3 className="tpl-colhead">Diagrams</h3>
              {distinctTypes.map((t) => row({
                key: t.name, glyph: t.glyph, name: t.name, sub: TYPE_DESC[t.name] || "",
                onClick: () => openDrill({ kind: "type", key: t.name }),
              }))}
            </section>
          </div>
        )}
        <div className="tpl-foot">
          <span className="tpl-foot-hint">{canCreate && selected ? <>Create <b>{(name.trim() || "Untitled")}</b> · {selected.name} ({selected.via})</> : "Pick a language or diagram type"}</span>
          <button className="btn-primary tpl-create" disabled={!canCreate} onClick={create}>Create</button>
        </div>
      </div>
    </div>
  );
}

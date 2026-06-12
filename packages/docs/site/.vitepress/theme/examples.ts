// Example registry for the Stripe-style diagram quickstart pages.
// Single source of truth for the code shown in the sticky pane, the preview
// image (pre-rendered into /samples/), and the "open in editor" source.

export interface DiagramExample {
  id: string;
  /** File-tab style label shown in the code pane header. */
  label: string;
  /** Pre-rendered preview, served from site/public/samples/. */
  image: string;
  /** How the preview was produced — shown as a small caption. */
  renderer: "kymo" | "mermaid";
  code: string;
  /**
   * 1-indexed inclusive line ranges the section is about. When present, the
   * code pane highlights these lines and dims the rest (Stripe-style).
   */
  hl?: Array<[number, number]>;
}

const fc = (
  id: string, label: string, image: string, code: string,
  hl?: Array<[number, number]>,
): DiagramExample => ({ id, label, image, code, renderer: "kymo", hl });
const sq = (
  id: string, label: string, image: string, code: string,
  hl?: Array<[number, number]>,
): DiagramExample => ({ id, label, image, code, renderer: "mermaid", hl });

export const SETS: Record<string, DiagramExample[]> = {
  flowchart: [
    fc("fc-intro", "approval.mmd", "/samples/approval.svg",
`flowchart TD
    Start((Start)) --> Submit[Submit request]
    Submit --> Review{Approved?}
    Review -->|yes| Provision[Provision]
    Review -->|no| Reject[Reject]
    Provision --> Done((Done))
    Reject --> Done
`),
    fc("fc-direction", "direction.mmd", "/samples/flow-direction.svg",
`flowchart LR
    A[Source] --> B[Build]
`, [[1, 1]]),
    fc("fc-shapes", "shapes.mmd", "/samples/flow-shapes.svg",
`flowchart LR
    A[Rect] --> B(Rounded)
    B ==> C([Stadium])
    C -.-> D[(Database)]
    D --- E((Circle))
    E --> F{Decision}
    F -->|ok| G{{Hexagon}}
    G --> H[[Subroutine]]
`),
    fc("fc-links", "links.mmd", "/samples/flow-links.svg",
`flowchart TD
    A[Submit] --> B{Approved?}
    B -->|yes| C[Provision]
    B -->|no| D[Reject]
    C -.-> E[Audit log]
    D --- E
`, [[2, 6]]),
    fc("fc-subgraph", "subgraph.mmd", "/samples/flow-subgraph.svg",
`flowchart TB
    Start --> A
    subgraph G [Worker Pool]
        A[Fetch] --> B[Transform]
        B --> C[Write]
    end
    C --> End[Done]
`, [[3, 6]]),
  ],
  sequence: [
    sq("sq-intro", "basic.mmd", "/samples/seq-basic.svg",
`sequenceDiagram
    participant A as Alice
    participant J as John
    A->>J: Hello John, how are you?
    J-->>A: Great!
    A-)J: See you later
`),
    sq("sq-participants", "participants.mmd", "/samples/seq-participants.svg",
`sequenceDiagram
    participant C as Client
    actor U as User
    U->>C: click
`, [[2, 3]]),
    sq("sq-messages", "messages.mmd", "/samples/seq-messages.svg",
`sequenceDiagram
    participant A
    participant B
    A->>B: sync call
    B-->>A: reply
    A->B: async signal
    A-)B: async call
`, [[4, 7]]),
    sq("sq-activations", "activations.mmd", "/samples/seq-activations.svg",
`sequenceDiagram
    Alice->>+John: Hello John
    John-->>-Alice: Great!
`, [[2, 3]]),
    sq("sq-notes", "notes.mmd", "/samples/seq-notes.svg",
`sequenceDiagram
    participant A
    participant B
    Note over A,B: handshake begins
    A->>B: SYN
    Note right of B: B is now listening
    B-->>A: SYN-ACK
    Note left of A: connection established
`, [[4, 4], [6, 6], [8, 8]]),
    sq("sq-fragments", "fragments.mmd", "/samples/seq-fragments.svg",
`sequenceDiagram
    participant C as Client
    participant S as Server
    alt is authorized
        C->>S: GET /data
        S-->>C: 200 OK
    else unauthorized
        S-->>C: 401 Unauthorized
    end
    opt retry on flake
        loop up to 3 times
            C->>S: retry
        end
    end
    par notify
        S->>C: event A
    and
        S->>C: event B
    end
`, [[4, 19]]),
    sq("sq-autonumber", "autonumber.mmd", "/samples/seq-autonumber.svg",
`sequenceDiagram
    autonumber
    Alice->>John: Hello
    John-->>Alice: Hi
`, [[2, 2]]),
  ],
};

export const ALL: Record<string, DiagramExample> = Object.fromEntries(
  Object.values(SETS).flat().map((e) => [e.id, e]),
);

/**
 * Build an editor.kymo.studio share link for a Mermaid source — the same
 * deflate + base64url encoding as the editor's share.ts.
 */
export async function editorUrl(source: string): Promise<string> {
  const stream = new Blob([new TextEncoder().encode(source)])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const s = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://editor.kymo.studio/?k=mermaid&s=${s}`;
}

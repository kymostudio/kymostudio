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
  class: [
    sq("cl-intro", "animal.mmd", "/samples/class-animal.svg",
`classDiagram
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
    }
`),
    sq("cl-members", "members.mmd", "/samples/class-members.svg",
`classDiagram
    class BankAccount{
        +String owner
        +BigDecimal balance
        +deposit(amount) bool
        +withdrawal(amount) int
    }
    class Square~Shape~{
        int id
        List~int~ position
        setPoints(List~int~ points)
        getPoints() List~int~
    }
`, [[2, 7]]),
    sq("cl-visibility", "visibility.mmd", "/samples/class-visibility.svg",
`classDiagram
    class Account{
        +String publicField
        -String privateField
        #String protectedField
        ~String packageField
        +staticMethod()$
        +abstractMethod()*
    }
`),
    sq("cl-relationships", "relations.mmd", "/samples/class-relations.svg",
`classDiagram
    classA <|-- classB : inheritance
    classC *-- classD : composition
    classE o-- classF : aggregation
    classG <-- classH : association
    classI -- classJ : link
    classK <.. classL : dependency
    classM <|.. classN : realization
    classO .. classP : dashed link
`),
    sq("cl-cardinality", "cardinality.mmd", "/samples/class-cardinality.svg",
`classDiagram
    Customer "1" --> "*" Ticket
    Student "1" --> "1..*" Course
    Galaxy --> "many" Star : contains
`),
    sq("cl-annotations", "annotations.mmd", "/samples/class-annotations.svg",
`classDiagram
    class Shape{
        <<interface>>
        noOfVertices
        draw()
    }
    class Color{
        <<enumeration>>
        RED
        BLUE
        GREEN
    }
`, [[3, 3], [8, 8]]),
    sq("cl-notes", "notes.mmd", "/samples/class-notes.svg",
`classDiagram
    note "This is a general note"
    note for Duck "can fly<br/>can swim<br/>can help in debugging"
    class Duck{
        +quack()
    }
`, [[2, 3]]),
    sq("cl-direction", "direction.mmd", "/samples/class-direction.svg",
`classDiagram
    direction LR
    class Order
    class Customer
    Customer "1" --> "*" Order : places
`, [[2, 2]]),
  ],
  state: [
    sq("state-intro", "intro.mmd", "/samples/state-intro.svg",
`stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]
`),
    sq("state-states", "states.mmd", "/samples/state-states.svg",
`stateDiagram-v2
    direction LR
    s1 : This is a state description
    state "Also a description" as s2
    s1 --> s2 : transition label
`, [[2, 2]]),
    sq("state-composite", "composite.mmd", "/samples/state-composite.svg",
`stateDiagram-v2
    [*] --> Active
    state Active {
        [*] --> Idle
        Idle --> Running : start
        Running --> Idle : stop
    }
    Active --> [*] : shutdown
`),
    sq("state-choice", "choice.mmd", "/samples/state-choice.svg",
`stateDiagram-v2
    state check <<choice>>
    state fork1 <<fork>>
    state join1 <<join>>
    [*] --> check
    check --> Small : if n < 10
    check --> Big : if n >= 10
    Big --> fork1
    fork1 --> A
    fork1 --> B
    A --> join1
    B --> join1
    join1 --> [*]
    Small --> [*]
`),
    sq("state-concurrency", "concurrency.mmd", "/samples/state-concurrency.svg",
`stateDiagram-v2
    [*] --> Active
    state Active {
        NumLockOff --> NumLockOn : EvNumLockPressed
        NumLockOn --> NumLockOff : EvNumLockPressed
        --
        CapsLockOff --> CapsLockOn : EvCapsLockPressed
        CapsLockOn --> CapsLockOff : EvCapsLockPressed
    }
`),
    sq("state-notes", "notes.mmd", "/samples/state-notes.svg",
`stateDiagram-v2
    State1 : The state with a note
    note right of State1
        Important information!
    end note
    State1 --> State2
    note left of State2 : This is the note to the left.
`),
  ],
  er: [
    sq("er-intro", "orders.mmd", "/samples/er-intro.svg",
`erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
`),
    sq("er-cardinality", "cardinality.mmd", "/samples/er-cardinality.svg",
`erDiagram
    CAR ||--o{ NAMED-DRIVER : allows
    PERSON }o..o| NAMED-DRIVER : is
    HOUSE |o--|| ADDRESS : has
`),
    sq("er-attributes", "attributes.mmd", "/samples/er-attributes.svg",
`erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string custNumber PK
        string sector
    }
    ORDER {
        int orderNumber PK
        string deliveryAddress FK "delivered to"
    }
`),
  ],
  journey: [
    sq("journey-intro", "workday.mmd", "/samples/journey-intro.svg",
`journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
`),
    sq("journey-tasks", "tasks.mmd", "/samples/journey-tasks.svg",
`journey
    title Scores and actors
    section Checkout
      Add to cart: 5: Customer
      Pay: 2: Customer, Support
`),
  ],
  gantt: [
    sq("gantt-intro", "plan.mmd", "/samples/gantt-intro.svg",
`gantt
    title A Gantt Diagram
    dateFormat YYYY-MM-DD
    section Section
        A task          :a1, 2024-01-01, 30d
        Another task    :after a1, 20d
    section Another
        Task in Another :2024-01-12, 12d
        another task    :24d
`),
    sq("gantt-tasks", "states.mmd", "/samples/gantt-tasks.svg",
`gantt
    title Task states
    dateFormat YYYY-MM-DD
    section Critical path
        Completed crit task :crit, done, 2024-01-02, 24h
        Active crit task    :crit, active, 3d
        Future crit task    :crit, 5d
    section Normal
        Done task           :done, a1, 2024-01-06, 3d
        Active task         :active, a2, after a1, 3d
        Milestone           :milestone, m1, after a2, 0d
`),
    sq("gantt-dependencies", "chain.mmd", "/samples/gantt-dependencies.svg",
`gantt
    dateFormat YYYY-MM-DD
    section Chain
        Design :d1, 2024-02-01, 4d
        Build  :b1, after d1, 6d
        Test   :after b1, 3d
`),
    sq("gantt-excludes", "excludes.mmd", "/samples/gantt-excludes.svg",
`gantt
    dateFormat YYYY-MM-DD
    excludes weekends
    section Weekend-aware
        Long task :2024-01-04, 7d
`, [[3, 3]]),
  ],
  pie: [
    sq("pie-intro", "pets.mmd", "/samples/pie-intro.svg",
`pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15
`),
    sq("pie-showdata", "showdata.mmd", "/samples/pie-showdata.svg",
`pie showData title Key elements in product X
    "Calcium" : 42.96
    "Potassium" : 50.05
    "Magnesium" : 10.01
    "Iron" : 5
`, [[1, 1]]),
  ],
  quadrant: [
    sq("quadrant-intro", "campaigns.mmd", "/samples/quadrant-intro.svg",
`quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]
`),
    sq("quadrant-points", "points.mmd", "/samples/quadrant-points.svg",
`quadrantChart
    x-axis Urgent --> Not Urgent
    y-axis Not Important --> Important
    Fix prod bug: [0.1, 0.9]
    Write tests: [0.6, 0.8]
    Refactor: [0.7, 0.4]
`),
  ],
  requirement: [
    sq("req-intro", "intro.mmd", "/samples/req-intro.svg",
`requirementDiagram
    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }
    element test_entity {
    type: simulation
    }
    test_entity - satisfies -> test_req
`),
    sq("req-types", "types.mmd", "/samples/req-types.svg",
`requirementDiagram
    functionalRequirement func_req {
    id: 1.1
    text: functional
    risk: low
    verifymethod: analysis
    }
    performanceRequirement perf_req {
    id: 1.2
    text: performance
    risk: medium
    verifymethod: demonstration
    }
    interfaceRequirement int_req {
    id: 1.3
    text: interface
    risk: high
    verifymethod: inspection
    }
`),
    sq("req-relationships", "relations.mmd", "/samples/req-relationships.svg",
`requirementDiagram
    requirement r1 {
    id: 1
    text: base requirement
    risk: low
    verifymethod: test
    }
    requirement r2 {
    id: 2
    text: derived requirement
    risk: low
    verifymethod: test
    }
    element sim {
    type: simulation
    }
    element doc {
    type: word doc
    docRef: reqs/req.doc
    }
    r2 - derives -> r1
    sim - verifies -> r2
    doc - refines -> r1
`),
  ],
  gitgraph: [
    sq("git-intro", "branches.mmd", "/samples/git-intro.svg",
`gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
    commit
`),
    sq("git-commits", "commits.mmd", "/samples/git-commits.svg",
`gitGraph
    commit id: "Normal"
    commit id: "Reverse" type: REVERSE
    commit id: "Highlight" type: HIGHLIGHT
    commit id: "Tagged" tag: "v1.0.0"
`),
    sq("git-merge", "merge.mmd", "/samples/git-merge.svg",
`gitGraph
    commit
    branch feature
    commit
    commit
    checkout main
    commit
    merge feature tag: "v2.0"
`),
    sq("git-cherrypick", "cherrypick.mmd", "/samples/git-cherrypick.svg",
`gitGraph
    commit id: "ZERO"
    branch develop
    commit id: "A"
    checkout main
    commit id: "ONE"
    cherry-pick id: "A"
`),
  ],
  c4: [
    sq("c4-intro", "context.mmd", "/samples/c4-intro.svg",
`C4Context
    title System Context diagram for Internet Banking
    Person(customer, "Banking Customer", "A customer of the bank.")
    System(banking, "Internet Banking System", "Allows customers to view accounts.")
    System_Ext(mail, "E-mail System", "The internal e-mail system.")
    Rel(customer, banking, "Uses")
    Rel(banking, mail, "Sends e-mail", "SMTP")
`),
    sq("c4-boundary", "container.mmd", "/samples/c4-boundary.svg",
`C4Container
    title Container diagram
    Person(customer, "Customer")
    Container_Boundary(c1, "Internet Banking") {
        Container(web, "Web Application", "JS, Angular", "Delivers content")
        Container(api, "API", "Java", "Business logic")
    }
    Rel(customer, web, "Uses", "HTTPS")
    Rel(web, api, "Calls", "JSON/HTTPS")
`),
  ],
  mindmap: [
    sq("mindmap-intro", "intro.mmd", "/samples/mindmap-intro.svg",
`mindmap
  root((kymo))
    Origins
      Long history
      Popularisation
    Research
      On effectiveness
      On automatic creation
    Tools
      Pen and paper
      Diagram as code
`),
    sq("mindmap-shapes", "shapes.mmd", "/samples/mindmap-shapes.svg",
`mindmap
  root)kymo studio(
    id1[square]
    id2(rounded)
    id3((circle))
    id4))bang((
    id5)cloud(
    id6{{hexagon}}
`),
  ],
  timeline: [
    sq("timeline-intro", "social.mmd", "/samples/timeline-intro.svg",
`timeline
    title History of Social Media
    2002 : LinkedIn
    2004 : Facebook
         : Google
    2005 : YouTube
    2006 : Twitter
`),
    sq("timeline-sections", "sections.mmd", "/samples/timeline-sections.svg",
`timeline
    title Timeline of Industrial Revolution
    section 17th-20th century
        Industry 1.0 : Machinery, Water power, Steam power
        Industry 2.0 : Electricity, Internal combustion engine, Mass production
    section 21st century
        Industry 4.0 : Internet, Robotics, AI
`),
  ],
  sankey: [
    sq("sankey-intro", "energy.mmd", "/samples/sankey-intro.svg",
`sankey-beta

Agricultural waste,Bio-conversion,124.729
Bio-conversion,Liquid,0.597
Bio-conversion,Losses,26.862
Bio-conversion,Solid,280.322
Bio-conversion,Gas,81.144
`),
  ],
  xychart: [
    sq("xy-intro", "revenue.mmd", "/samples/xy-intro.svg",
`xychart-beta
    title "Sales Revenue"
    x-axis [jan, feb, mar, apr, may, jun, jul]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000]
`),
  ],
  block: [
    sq("block-intro", "columns.mmd", "/samples/block-intro.svg",
`block-beta
    columns 3
    a:3
    block:group1:2
        b c
    end
    d
`),
    sq("block-shapes", "shapes.mmd", "/samples/block-shapes.svg",
`block-beta
    columns 4
    a["Square"] b("Rounded") c(("Circle")) d(["Stadium"])
    e[("Cylinder")] f>"Flag"] g{"Diamond"} h{{"Hexagon"}}
`),
    sq("block-arrows", "arrows.mmd", "/samples/block-arrows.svg",
`block-beta
    columns 3
    Start space:2
    Start --> Process
    Process space Done
    Process --> Done
`),
  ],
  packet: [
    sq("packet-intro", "tcp.mmd", "/samples/packet-intro.svg",
`packet-beta
    title TCP Packet
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-105: "Reserved"
    106: "URG"
    107: "ACK"
    108: "PSH"
    109: "RST"
    110: "SYN"
    111: "FIN"
    112-127: "Window"
    128-143: "Checksum"
    144-159: "Urgent Pointer"
    160-191: "(Options and Padding)"
`),
  ],
  kanban: [
    sq("kanban-intro", "board.mmd", "/samples/kanban-intro.svg",
`kanban
  Todo
    [Create Documentation]
    docs[Create Blog about the new diagram]
  [In progress]
    id6[Create renderer so that it works in all cases]
  id9[Ready for deploy]
    id8[Design grammar]
  id10[Done]
    id5[define getData]
`),
    sq("kanban-meta", "metadata.mmd", "/samples/kanban-meta.svg",
`kanban
  id1[Todo]
    docs[Create Documentation]@{ assigned: 'knsv', ticket: MC-2037, priority: 'High' }
  id2[In Progress]
    spec[Update DSL spec]@{ priority: 'Very High' }
`, [[3, 3], [5, 5]]),
  ],
  architecture: [
    sq("arch-intro", "services.mmd", "/samples/arch-intro.svg",
`architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db
`),
    sq("arch-junctions", "junctions.mmd", "/samples/arch-junctions.svg",
`architecture-beta
    service left_disk(disk)[Disk]
    service top_disk(disk)[Disk]
    service bottom_disk(disk)[Disk]
    service top_gateway(internet)[Gateway]
    service bottom_gateway(internet)[Gateway]
    junction junctionCenter
    junction junctionRight

    left_disk:R -- L:junctionCenter
    top_disk:B -- T:junctionCenter
    bottom_disk:T -- B:junctionCenter
    junctionCenter:R -- L:junctionRight
    top_gateway:B -- T:junctionRight
    bottom_gateway:T -- B:junctionRight
`),
  ],
  radar: [
    sq("radar-intro", "grades.mmd", "/samples/radar-intro.svg",
`radar-beta
    title Grades
    axis m["Math"], s["Science"], e["English"]
    axis h["History"], g["Geography"], a["Art"]
    curve alice["Alice"]{85, 90, 80, 70, 75, 90}
    curve bob["Bob"]{70, 75, 85, 80, 90, 85}
    max 100
    min 0
`),
  ],
  treemap: [
    sq("treemap-intro", "products.mmd", "/samples/treemap-intro.svg",
`treemap-beta
"Products"
    "Electronics"
        "Phones": 50
        "Computers": 30
    "Clothing"
        "Men": 40
        "Women": 40
`),
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

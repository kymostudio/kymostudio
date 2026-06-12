# Sequence Diagram

A sequence diagram shows how participants exchange messages over time. kymo
reads the [Mermaid](https://mermaid.js.org/syntax/sequenceDiagram.html)
`sequenceDiagram` syntax.

The fastest way to try everything on this page is the
**[editor](https://editor.kymo.studio)**: pick **mermaid** in the diagram-type
dropdown, type on the left, and the preview updates live. Every example below
has a *Try it in the editor* link that opens it pre-loaded.

```mermaid
sequenceDiagram
    participant A as Alice
    participant J as John
    A->>J: Hello John, how are you?
    J-->>A: Great!
    A-)J: See you later
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxli0EKgzAURPeeYroU9AIulEDBkm1P8AlDDaSJ_UbE25uG7jrLee9t_OyMjncvL5V3g7JVNHvnV4kZBrLBBO_4h-wX2bTESkw_jnbAgyGk-nZY0gFR4kz7VB3bF8kMmJWSb7-sLdWT1UKQTG0uhL4sJA)

![Basic sequence diagram, as previewed in the editor](/samples/seq-basic.svg)

Beyond the live preview, kymo converts sequence sources into a proper **UML
interaction model** — ready to open in StarUML, Gaphor, or any XMI-consuming
UML tool. See [Exporting to UML tools](#exporting-to-uml-tools).

## Participants

Declare participants with `participant`, or `actor` for a stick-figure actor.
The optional `as` alias sets the display label; the id is what you use in
messages. Participants you don't declare are created automatically the first
time a message references them, in order of appearance.

```mermaid
sequenceDiagram
    participant C as Client
    actor U as User
    U->>C: click
```

## Messages

A message is `Sender<arrow>Receiver: text`. Each arrow maps to a UML message
sort, so the distinction survives into the exported model:

| Syntax | Line | UML message sort |
|--------|------|------------------|
| `A->>B: text` | solid, filled head | synchronous call |
| `A-->>B: text` | dashed, filled head | reply |
| `A->B: text` | solid, open head | asynchronous signal |
| `A-->B: text` | dashed, open head | asynchronous signal |
| `A-)B: text` | solid, open head | asynchronous call |
| `A--)B: text` | dashed, open head | asynchronous call |
| `A-xB: text` | solid, × head | asynchronous call |
| `A--xB: text` | dashed, × head | asynchronous call |

Self-messages (`A->>A: think`) are supported.

## Activations

Mark when a participant is actively processing with explicit statements or the
`+` / `-` shorthand on the arrow:

```mermaid
sequenceDiagram
    Alice->>+John: Hello John
    John-->>-Alice: Great!
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJwrTi0sTc1LTnXJTEwvSszlUgACx5zM5FRdOzttr_yMPCsFj9ScnHwFEBssC2LoAmV1wcqsFNyLUhNLFLkAYOwWSQ)

```mermaid
sequenceDiagram
    Alice->>John: Hello John
    activate John
    John-->>Alice: Great!
    deactivate John
```

`+` activates the **target** after the message; `-` deactivates the **source**.

## Notes

Attach commentary to one participant or span several:

```mermaid
sequenceDiagram
    participant A
    participant B
    Note over A,B: handshake begins
    A->>B: SYN
    Note right of B: B is now listening
    B-->>A: SYN-ACK
    Note left of A: connection established
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxljDESwjAMBPu8Qg8gH6DIjA0dM2moKBVHsTUEKdgKfB-PmxRceXt7hd47SaArY8z46qBmw2wceEMxcH-Nb82oRqAfyuBO_gwJZS4JnwQTRZbSNq4fhsruj_FQMsdkoAtU4IELiH5h5WIkLLHtfF8917zeXW6Hu9LS1MqCilAwVgEqhlN9SDR3P54TPvA)

`Note left of X`, `Note right of X`, and `Note over X` (or `Note over X,Y`)
are all supported.

## Fragments: loop, alt, opt, par

Combined fragments group messages under an operator, close with `end`, and
nest arbitrarily:

```mermaid
sequenceDiagram
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
```

[▶ Try it in the editor](https://editor.kymo.studio/?k=mermaid&s=eJxtkD0OwjAMhXdO8S6AKD8TAxIUxMDAUDiA1RqISJOQuEhwekqqRgjw8iR_9tOzA98aNiWvFZ091QO05ciLKpUjI8hBAblWbOSHFW9WsL-zj4y0QAVQIxfr1ZOr2H1XPlwsijm2mwNGFQklUAxbks8xyTLsd7HNOjAa88elH55lYxy_B9h0ap3As_gHrMFJ05XTvrbWoXEQiylE1RwS-ggZlxPobXtt74exok6Pj1gxFd_bH2HZfcJU__Eqmb0AUwVlCg)

![Fragments example, as previewed in the editor](/samples/seq-fragments.svg)

| Operator | Meaning |
|----------|---------|
| `loop label … end` | repetition |
| `alt guard … else guard … end` | mutually exclusive alternatives |
| `opt guard … end` | optional block |
| `par label … and … end` | parallel blocks |

These map to UML combined fragments (`loop`, `alt`, `opt`, `par`) with the
labels carried as guards.

## Numbering

`autonumber` switches on sequential message numbering:

```mermaid
sequenceDiagram
    autonumber
    Alice->>John: Hello
    John-->>Alice: Hi
```

## Exporting to UML tools

kymo's own pipeline turns the same source into a UML interaction model. With
the Rust CLI (`cargo install kymostudio`) the output extension picks the
target:

```bash
kymo seq.mmd seq.xmi          # OMG XMI 2.5.1 — portable UML interchange
kymo seq.mmd seq.mdj          # StarUML project, model + laid-out diagram
kymo seq.mmd seq.gaphor       # Gaphor project, model + laid-out diagram
```

- **`.xmi`** is the vendor-neutral model: import it into Enterprise Architect,
  Modelio, or any XMI 2.5 consumer.
- **`.mdj`** and **`.gaphor`** are native project files — open them directly in
  [StarUML](https://staruml.io) or [Gaphor](https://gaphor.org) and the diagram
  is already drawn.

> **Status.** The editor previews sequence diagrams with the Mermaid renderer;
> rendering them with kymo's own engine (SVG/PNG/PDF, like flowcharts) is on
> the roadmap.

## Differences from Mermaid

- **Accepted and ignored** (no error, no effect): `box`/`end` participant
  boxes, `rect` background highlights, `title`, `links`/`link`,
  `create`/`destroy` participant lifecycle, and `autonumber` format arguments.
- **Not supported**: the `critical` and `break` fragments.

## See also

- [Flowchart](./flowchart) — the other Mermaid diagram type kymo imports.
- [BPMN](./bpmn) — for multi-participant business processes with execution
  semantics.

//! Sequence-diagram IR — the sibling of [`crate::flowchart`] for the Mermaid
//! `sequenceDiagram` family.
//!
//! Positionless and ordered: a list of participants (declaration / first-
//! appearance order) plus an ordered tree of [`Item`]s (messages, activations,
//! notes, and nested combined fragments). The Mermaid front-end
//! (`crate::mermaid::parse_sequence`) fills this in; [`emit::to_xmi`] serializes
//! it to OMG XMI 2.5.1 (a UML 2.5.1 `Interaction`).
//!
//! Unlike the flowchart IR there is no separate layout pass — XMI carries no
//! geometry, so the emitter consumes the ordered tree directly.

pub mod emit;
pub mod gaphor;
pub mod layout;
pub mod mdj;
pub mod svg;

/// A parsed sequence diagram, ready for [`emit`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Sequence {
    /// Lifeline sources in declaration / first-appearance order.
    pub participants: Vec<Participant>,
    /// The interaction body — an ordered tree of fragments.
    pub items: Vec<Item>,
    /// `autonumber` was present (flag only; not modelled in XMI).
    pub autonumber: bool,
    /// Autonumber start value (mermaid `autonumber <start> <step>`).
    pub auto_start: i64,
    /// Autonumber step.
    pub auto_step: i64,
    /// Optional `title` line.
    pub title: String,
    /// `box ... end` participant groupings.
    pub boxes: Vec<BoxGroup>,
}

/// A `box <label> ... end` grouping of participants drawn as a backdrop.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoxGroup {
    /// The box label (may include a leading colour word, kept verbatim).
    pub label: String,
    /// Participant ids enclosed by the box.
    pub members: Vec<String>,
}

/// A lifeline source — `participant` / `actor`, explicit or implicit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Participant {
    /// The reference key used by messages (a single token).
    pub id: String,
    /// The display name (`participant A as Alice` → `Alice`; else the id).
    pub label: String,
    /// Declared with `actor` rather than `participant`.
    pub is_actor: bool,
}

/// One ordered element of an interaction body (or a fragment operand body).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Item {
    /// A message from one lifeline to another.
    Message(Message),
    /// `activate X` — open an execution on participant `X`.
    Activate(String),
    /// `deactivate X` — close the innermost execution on participant `X`.
    Deactivate(String),
    /// A note over / left of / right of one or two lifelines.
    Note(Note),
    /// A combined fragment (`loop` / `alt` / `opt` / `par`).
    Fragment(Fragment),
}

/// UML 2.5.1 `MessageSort` — how a message behaves.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageSort {
    /// Solid filled arrowhead `->>` — a synchronous call.
    SynchCall,
    /// Open arrowhead `-)` / cross `-x` — an asynchronous call.
    AsynchCall,
    /// No arrowhead `->` / `-->` — an asynchronous signal.
    AsynchSignal,
    /// Dashed filled arrowhead `-->>` — a reply.
    Reply,
    /// A `createMessage` (reserved; not produced by the current parser).
    CreateMessage,
    /// A `deleteMessage` (reserved; not produced by the current parser).
    DeleteMessage,
}

impl MessageSort {
    /// The UML 2.5.1 `MessageSort` enumeration literal.
    pub fn uml(self) -> &'static str {
        match self {
            MessageSort::SynchCall => "synchCall",
            MessageSort::AsynchCall => "asynchCall",
            MessageSort::AsynchSignal => "asynchSignal",
            MessageSort::Reply => "reply",
            MessageSort::CreateMessage => "createMessage",
            MessageSort::DeleteMessage => "deleteMessage",
        }
    }
}

/// A directed message between two lifelines.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Message {
    /// Sender participant id.
    pub from: String,
    /// Receiver participant id.
    pub to: String,
    /// The message label (may be empty).
    pub text: String,
    /// How the arrow behaves.
    pub sort: MessageSort,
    /// `+` shorthand — activate the receiver on receipt.
    pub activate_target: bool,
    /// `-` shorthand — deactivate the sender on send.
    pub deactivate_source: bool,
    /// Mermaid-11 bidirectional arrow (`<<->>` / `<<-->>`): a head at both ends.
    pub bidirectional: bool,
}

/// Where a note sits relative to its target lifeline(s).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotePlacement {
    /// `Note left of X`.
    LeftOf,
    /// `Note right of X`.
    RightOf,
    /// `Note over X` / `Note over X,Y`.
    Over,
}

/// A note annotating one or two lifelines.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Note {
    /// Visual placement (lost in XMI, kept for completeness).
    pub placement: NotePlacement,
    /// One target (`left of` / `right of`) or two (`over A,B`).
    pub targets: Vec<String>,
    /// The note body.
    pub text: String,
}

/// The operator of a combined fragment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FragmentOp {
    /// `loop`.
    Loop,
    /// `alt` … `else` …
    Alt,
    /// `opt`.
    Opt,
    /// `par` … `and` …
    Par,
    /// `critical` … `option` …
    Critical,
    /// `break`.
    Break,
}

impl FragmentOp {
    /// The UML 2.5.1 `InteractionOperatorKind` literal.
    pub fn uml(self) -> &'static str {
        match self {
            FragmentOp::Loop => "loop",
            FragmentOp::Alt => "alt",
            FragmentOp::Opt => "opt",
            FragmentOp::Par => "par",
            FragmentOp::Critical => "critical",
            FragmentOp::Break => "break",
        }
    }
}

/// A combined fragment — one operator over one or more operands.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Fragment {
    /// The interaction operator.
    pub operator: FragmentOp,
    /// One operand for `loop`/`opt`; one per `else`/`and` branch otherwise.
    pub operands: Vec<Operand>,
}

/// One branch of a combined fragment.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Operand {
    /// The guard / label (may be empty).
    pub guard: String,
    /// The nested body, in order.
    pub items: Vec<Item>,
}

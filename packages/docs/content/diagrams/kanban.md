---
layout: page
title: Kanban
---

<DiagramQuickstart set="kanban">

# Kanban

A kanban board shows work items moving through columns — todo, in progress,
done. kymo's editor reads the
[Mermaid](https://mermaid.js.org/syntax/kanban.html) `kanban` syntax.

This page works like a quickstart: as you scroll, the pane on the right shows
the source and the preview for the section you're reading. **Copy** grabs the
source; **▶ Open in editor** loads it into
[editor.kymo.studio](https://editor.kymo.studio) (pick **mermaid** in the
diagram-type dropdown when starting from scratch).

<DqSection id="kanban-intro">

Indentation is the structure, mindmap-style: a top-level line is a column, an
indented line is a card in it. Both take an optional id with the label in
brackets (`id[label]`) — useful when the label needs spaces or you want to
reference the card.

</DqSection>

<DqSection id="kanban-meta">

## Card metadata

A trailing `@{ … }` attaches metadata to a card: `assigned`, `ticket`, and
`priority` (`Very High`, `High`, `Low`, `Very Low`) — priority colours the
card's edge, the rest render inside it.

</DqSection>

> **Status.** Kanban previews on this page and in the editor use the Mermaid
> renderer; importing kanban boards into kymo's own pipeline (native
> SVG/PNG/PDF rendering) is on the roadmap.

## See also

- [Gantt](./gantt) — when the schedule matters more than the board.
- [User Journey](./journey) — for the user's path rather than the team's
  work.

</DiagramQuickstart>

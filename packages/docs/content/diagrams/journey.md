---
layout: page
title: User Journey
---

<DiagramQuickstart set="journey">

# User Journey

A user journey maps the steps a user takes through a workflow, with a
satisfaction score and the actors involved at every step. kymo's editor reads
the [Mermaid](https://mermaid.js.org/syntax/userJourney.html) `journey`
syntax.

This page works like a quickstart: as you scroll, the pane on the right shows
the source and the preview for the section you're reading. **Copy** grabs the
source; **▶ Open in editor** loads it into
[editor.kymo.studio](https://editor.kymo.studio) (pick **mermaid** in the
diagram-type dropdown when starting from scratch).

<DqSection id="journey-intro">

The example on the right is Mermaid's working-day journey: a `title`,
`section` headers to group the steps, and one task per line.

</DqSection>

<DqSection id="journey-tasks">

## Sections and tasks

A task line is `Task name: <score>: <actors>` — the score is 1 (worst) to 5
(best) and colours the face drawn at each step; the comma-separated actor
list becomes the legend, and each actor gets a consistent colour across the
diagram.

</DqSection>

> **Status.** User journey previews on this page and in the editor use the
> Mermaid renderer; importing user journeys into kymo's own pipeline (native
> SVG/PNG/PDF rendering) is on the roadmap.

## See also

- [Timeline](./timeline) — for events over calendar time rather than
  workflow steps.
- [Sequence Diagram](./sequence) — for the system-level message exchange
  behind a user flow.

</DiagramQuickstart>

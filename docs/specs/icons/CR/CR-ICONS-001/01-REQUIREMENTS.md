---
title: "Icons CR-001 — `kymo icons` command group (list · search · describe · download): motivation & requirements"
document_id: CR-ICONS-001
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: kymo Icons v2 maintainers / reviewers; CLI implementers across packages/python and packages/js
review_cycle: Until closed (approved + implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - DESIGN-ICONS-CR001          # CR design — CR-ICONS-001/02-DESIGN
  - TEST-ICONS-CR001            # CR verification (TC-13..TC-16) — CR-ICONS-001/03-TEST
  - PLAN-ICONS-CR001            # CR plan (phase P6) — CR-ICONS-001/04-PLAN
  - FEAT-ICONS-001              # Baseline requirements (FR-1..FR-11) this delta extends
  - DESIGN-ICONS-001            # Baseline design — re-based into on close
  - TEST-ICONS-001              # Baseline test — re-based into on close
  - PLAN-ICONS-001              # Baseline plan — re-based into on close
  - RES-ICONS-001               # Prior-art research (Iconify catalogue at scale)
  - RES-CLI-001                 # Prior-art research (FFmpeg-style kymo CLI)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - cli
  - requirements
  - search
  - download
  - iconify
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO/IEC/IEEE 29148:2018
  - ISO 8601:2019
---

# Icons CR-001 — `kymo icons` command group: motivation & requirements

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | CR-ICONS-001                                       |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | DESIGN-ICONS-CR001, TEST-ICONS-CR001, PLAN-ICONS-CR001, FEAT-ICONS-001, RES-ICONS-001, RES-CLI-001 |

> Change-request against the baselined `icons` spec, and the **lead document** of the CR — it
> carries the motivation, the requirements delta (FR-12..FR-15), and the change record.
> **Status: Open** — raised, awaiting assessment/approval; the baseline (FEAT/DESIGN/TEST/PLAN of
> Icons v2) is **not** amended until this CR is approved and implemented (raise → assess →
> approve → implement → re-baseline). Sibling layers:
> [`02-DESIGN`](02-DESIGN.md) (`DESIGN-ICONS-CR001`) ·
> [`03-TEST`](03-TEST.md) (`TEST-ICONS-CR001`, TC-13..TC-16) ·
> [`04-PLAN`](04-PLAN.md) (`PLAN-ICONS-CR001`, phase P6).

The key words **SHALL**, **SHOULD**, **MAY** are used per ISO drafting conventions. The
requirements below (§3) **add** FR-12..FR-15 to the baselined `FEAT-ICONS-001`; FR-1..FR-11 are
**unchanged**.

## 1. Motivation

`FEAT-ICONS-001` makes the catalogue **searchable** (FR-5: per-icon/per-set dimensions, aliases,
`info`, category/tags) but provides **no surface to actually use that** from the terminal. FR-5
even scopes the *picker UI* out (§4). The result: a developer authoring a `.kymo` diagram has no
way to ask "which `aws` icons exist?", "is there an icon called `lambda`?", "what's the license
of `gcp:bigquery`?", or to **pull a new icon** into the catalogue — they must read `icons/` by
hand or grep the manifest.

This is exactly the gap the icon-tooling ecosystem fills with a small, conventional verb set.
The dominant tools converge on the same four operations:

| Prior-art tool | Verbs | Model |
|---|---|---|
| [iconify-cli](https://github.com/bytelab-studio/iconify-cli) | `sets` · `search` · `describe icon` · `download` | reference — fetches from the [Iconify API](https://iconify.design/docs/api/) (~250k icons) |
| [Sly CLI](https://github.com/jacobparis-insiders/sly) | `add` (+ transformers) | vendor/own — copies icons into the repo through a normalize pipeline |
| [svg-icons-cli](https://github.com/alexanderson1993/svg-icons-cli) | `init` · `build` | build-time — emits a sprite + `icon-names.d.ts` |

kymo is a **vendor/own** catalogue (Sly's model) that wants a **reference**-style discovery
surface over it (iconify-cli's `sets`/`search`/`describe`/`download`), backed — for `download` —
by the same normalize pipeline `FEAT-ICONS-001` FR-8 already mandates. This CR adds that surface.

It also closes a sibling gap noted in `RES-CLI-001` §3: today only the Python package has a CLI,
and it is a verb-less converter only. The icon operations are **not** conversions — they are
package-manager-like (search/inspect/fetch), so they belong in a **verb namespace**, not as
mode-flags on the converter.

## 2. Change (summary)

Add a single icon **command namespace** to the `kymo` binary, in both packages:

```
kymo icons list     [provider] [--json]
kymo icons search   <query> [--provider P] [--remote] [--limit N] [--json]
kymo icons describe <prefix:name> [--json]
kymo icons download <prefix:name>... [--from <source>] [-o <dir>] [-y]
```

**Why a namespace (not flat top-level verbs).** `RES-CLI-001` deliberately makes the converter
**verb-less** (`kymo <src> -t <target>`); flat `kymo search`/`kymo describe` would make the first
token ambiguous (verb vs. source path) for every invocation. Nesting under **`kymo icons <verb>`**
reserves exactly **one** first-token word (`icons`) and leaves the converter grammar untouched —
the disambiguation rule is trivial ("first token `icons` → icon command; otherwise → source").
This is the FFmpeg-family analogue: icon management is kymo's `ffprobe`, a sibling concern, not a
flag on the converter. The full grammar, disambiguation, resolution path, and two-package
realisation are specified in **DESIGN-ICONS-CR001**.

## 3. Functional requirements (additions)

**Surface (RES-CLI-001 §2, §4 — verb-less converter preserved)**

- **FR-12** The CLI **SHALL** expose a single icon command **namespace `kymo icons <verb>`** with
  verbs `list`, `search`, `describe`, `download`. `icons` **SHALL** be the **only** reserved
  first-token word; any other first token **SHALL** be treated as a converter source path, so the
  verb-less converter grammar of `RES-CLI-001` is **unchanged** (disambiguation: first token
  `icons` → icon command; otherwise → source). The namespace **SHALL** exist with equivalent
  verbs and output in both `packages/python` and `packages/js` (parity, cf. FR-10).

**Discovery (RES-ICONS-001 §3, §7.3 — over the FR-5 metadata)**

- **FR-13** `kymo icons list [provider]` **SHALL** enumerate icon sets/providers from the
  catalogue with their `info` (icon count, author, license). With no argument it **SHALL** list
  all sets; with `provider` it **SHALL** list that set's icons. `--json` **SHALL** emit a stable
  machine-readable list.
- **FR-14** `kymo icons search <query>` **SHALL** match `query` against icon **name, aliases,
  tags, and category** and return results as **`prefix:name`**. It **SHALL** resolve **offline**
  against the vendored catalogue by default; `--remote` **MAY** additionally query the Iconify
  search API. `--provider`, `--limit`, and `--json` **SHALL** filter/format the results.
- **FR-15** `kymo icons describe <prefix:name>` **SHALL** print the resolved record metadata
  (dimensions, alias chain, set `info`/license, category/tags, source path), with `--json` for
  machine use; and `kymo icons download <prefix:name>...` **SHALL** vendor one or more icons into
  the catalogue. When `--from iconify`, `download` **SHALL** run the **FR-8 normalize pipeline**
  (`cleanupSVG → parseColors(currentColor) → SVGO → validate → dedup-to-aliases → minify`) before
  writing and **SHALL** re-sync the manifest so the icon becomes resolvable; `-o <dir>` sets the
  target directory (default `icons/`), `-y` skips the confirmation prompt.

**Non-functional clarifications (no new id)**

- **(NFR-3, dependency posture)** `list`, `search`, `describe` **SHALL** add **no runtime
  dependency** in either package. `search --remote` and `download --from iconify` **SHALL** use
  **stdlib HTTP only** (JS `fetch`, Python `urllib`) — keeping `packages/js` zero-dep.
- **(NFR-1, parity)** The verbs **SHALL** produce **equivalent results** across Python and JS
  for the same catalogue and query; divergence is a defect, gated by TEST-ICONS-CR001 (TC-16).
- **(Exit-code contract)** Every verb **SHALL** exit `0` on success and **non-zero** on error
  (unknown key, malformed query, network failure under `--remote`/`--from`), so the verbs are
  CI-usable — consistent with the `--probe`/`--lint` exit-code discipline of RES-CLI-001 §4.

## 4. Constraints, assumptions, out-of-scope

- **Read-trio is offline.** `list`/`search`/`describe` **SHALL NOT** require network; only the
  opt-in `--remote`/`--from iconify` paths do. This keeps discovery usable in air-gapped/CI runs.
- **Depends on FR-5 metadata.** `search`/`describe`/`list` are only meaningful once the per-set
  IconifyJSON manifest carries dims/aliases/`info`/tags (baseline phase **P3**); this delta does
  not re-specify the manifest, it consumes it.
- **No picker UI.** This delta is a CLI surface only; the playground / VS Code icon-picker remains
  out of scope (as in `FEAT-ICONS-001` §4).
- **Not a hosted API.** `--remote` consumes the existing public Iconify API; kymo does not host one.

## 5. Acceptance

- `kymo icons list|search|describe` run **offline** with **no new runtime dependency** in either
  package; `--json` output is stable and documented.
- `kymo icons search lambda` surfaces the vendored `aws:lambda` (and aliases) without network;
  `--remote` additionally returns Iconify matches.
- `kymo icons download --from iconify mdi:home` writes a **normalized** record (FR-8 pipeline
  applied, not a raw fetch), re-syncs the manifest, and the icon resolves in a render afterward.
- Adding `kymo icons` does **not** change converter behaviour: `kymo x.kymo` and
  `kymo x.kymo -t svg` are unaffected (only the token `icons` is reserved).
- Python (`cli.py`) and JS (`bin`) expose the same verbs with equivalent output (parity, FR-10);
  both packages' suites green; TC-13..TC-16 (TEST-ICONS-CR001) passing.

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-05 | Vũ Anh | **Raised (Open).** Proposes the `kymo icons` namespace (list/search/describe/download) over the Icons v2 catalogue, modelled on iconify-cli/Sly and aligned with RES-CLI-001's verb-less converter. Awaiting assessment; baseline not yet amended. |

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial raise — `kymo icons` command group: motivation, requirements delta FR-12..FR-15, acceptance, and change record (merged cover + requirements into one lead document). Namespace model chosen to preserve the verb-less converter grammar. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-001/01-REQUIREMENTS.md`; authoritative source
is the main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
This is the CR's lead document. On approval, FR-12..FR-15 are **re-based into `FEAT-ICONS-001`**
(preserving IDs), the design/test/plan deltas into their baselines, and this folder is retained as
the CR record. Until then, edits increment `version` and append to Annex A.

### B.4 Backwards Compatibility
FR-12..FR-15 are **additive**; FR-1..FR-11 are untouched. Adding the `icons` namespace does not
change converter behaviour (FR-12).

---
title: "Icons CR-001 — Design: `kymo icons` command group"
document_id: DESIGN-ICONS-CR001
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineer implementing the `kymo icons` CLI in packages/python (cli.py) and packages/js (new bin)
review_cycle: Until CR-ICONS-001 is closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-001                # CR lead doc — motivation + requirements (FR-12..FR-15)
  - TEST-ICONS-CR001            # CR verification
  - PLAN-ICONS-CR001            # CR plan
  - DESIGN-ICONS-001            # Baseline design (catalogue/generator/loader) this builds on
  - RES-CLI-001                 # Prior-art research (FFmpeg CLI)
  - RES-ICONS-001               # Prior-art research (Iconify API + catalogue)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - cli
  - design
  - argument-parser
  - iconify-api
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-001 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR001                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-001, TEST-ICONS-CR001, PLAN-ICONS-CR001, DESIGN-ICONS-001, RES-CLI-001, RES-ICONS-001 |

Realises **CR-ICONS-001** (FR-12..FR-15). Builds on the catalogue/generator/loader of
**DESIGN-ICONS-001** — the CLI is a thin surface over the same per-set IconifyJSON manifest and
the same FR-8 normalize pipeline; it does not re-specify either.

## 1. Scope

The `kymo icons` argument grammar, the first-token disambiguation against the verb-less
converter, the resolution path (local manifest → optional Iconify API), the shared
exit-code/`--json` contract, and the two-package realisation (`packages/python` `cli.py`; a new
`packages/js` `bin`). Out of scope: the catalogue format and on-demand loader (DESIGN-ICONS-001).

## 2. Command grammar (FR-12)

```
kymo icons list     [provider]            [--json]
kymo icons search   <query>   [--provider P] [--remote] [--limit N] [--json]
kymo icons describe <prefix:name>         [--json]
kymo icons download <prefix:name>...      [--from <source>] [-o <dir>] [-y]
```

`icons` is parsed as a **reserved first token** that switches the binary from converter mode into
icon mode; `<verb>` is the second token. Everything else on the line is verb-local options. The
grammar is flat (no nested sub-namespaces) so a **hand-rolled parser** stays tractable in both
packages (RES-CLI-001 §5 — `packages/js` is zero-dep, no `commander`/`yargs`).

## 3. First-token disambiguation (FR-12 — converter grammar preserved)

The dispatcher runs **before** converter argument parsing:

```
argv[0] == "icons"      → icon command; dispatch on argv[1] ∈ {list,search,describe,download}
argv[0] startswith "-"  → converter (global option first, e.g. -i, -formats)   [RES-CLI-001]
otherwise               → converter; argv[0] is the source path
```

Consequences, kept deliberately simple:

- Only the single word **`icons`** is reserved. `kymo x.kymo`, `kymo x.kymo -t svg`,
  `kymo -i - -f kymo -t svg` are **unchanged** — the converter never sees the icon path.
- An unknown icon verb (`kymo icons foo`) is an **error with usage**, not a fall-through to the
  converter (avoids a confusing "source not found: foo").
- The pathological case — a source file literally named `icons` — is resolved by the converter's
  explicit input marker: `kymo -i icons -t svg` (or `kymo ./icons`). Documented in help.

## 4. Resolution path (FR-13, FR-14, FR-15)

All four verbs resolve against the **per-set IconifyJSON manifest** (DESIGN-ICONS-001 §3); only
two paths touch the network, both opt-in:

| Verb | Local (default) | Network (opt-in) |
|------|-----------------|------------------|
| `list` | read every set's `info` (count/author/license) | — |
| `search` | match name/alias/tag/category across loaded sets → `prefix:name` | `--remote` → Iconify `/search?query=` (RES-ICONS-001 §5) |
| `describe` | resolve record + alias chain + set `info` | — |
| `download` | copy/extract a record from a kymo set | `--from iconify` → fetch icon, run **FR-8 pipeline**, write, re-sync manifest |

- **search** ranks exact `name` > alias > tag/category substring; `--provider` restricts to one
  prefix; `--limit` caps output (default a sane page, e.g. 50). `--remote` results are merged and
  tagged so the user sees which are already vendored vs. fetchable.
- **download --from iconify** is the bridge between Iconify (reference, ~250k icons) and kymo's
  vendor/own catalogue: it never writes a raw fetch — the icon passes through
  `cleanupSVG → parseColors(currentColor) → SVGO → validate → dedup-to-aliases → minify`
  (DESIGN-ICONS-001 §4) and lands as a normalized `{ body, width, height }` record, then the
  generator/manifest is re-synced so the new key resolves on the next render.

## 5. Output & exit-code contract (NFR clarifications)

- **Human output** is the default (aligned columns for `list`/`search`, a key/value block for
  `describe`, a written-files summary for `download`). **`--json`** emits a stable schema for
  editors/CI (`list` → `[{prefix,total,license}]`; `search` → `{query,results:[prefix:name],…}`;
  `describe` → the record + `info`). 
- **Exit codes** (CI contract, mirroring RES-CLI-001 §4 `--probe`/`--lint`): `0` success;
  non-zero on unknown key (`describe`/`download`), empty result where one was required, malformed
  `prefix:name`, or network failure under `--remote`/`--from`. `search` finding nothing is `0`
  with an empty list (a successful empty search), not an error.

## 6. Two-package realisation (FR-12 parity, NFR-3)

| Concern | `packages/python` | `packages/js` |
|---------|-------------------|---------------|
| Entry | extend `src/kymo/cli.py` `main()` — branch on `argv[0]=="icons"` before the converter path | **new `bin`** in `package.json` (today none — RES-CLI-001 §3) + hand-rolled parser |
| Manifest read | load per-set JSON (reuse `icons.py` caching) | reuse `icons-loader.ts` resolution |
| Network | `urllib` (stdlib) for `--remote`/`--from` | `fetch` (built-in) for `--remote`/`--from` |
| Pipeline (`download --from iconify`) | invoke the generator's normalize step | invoke the generator's normalize step |
| Deps | stdlib only | **zero runtime deps** (NFR-3) |

The two `bin`s share verb names, flags, `--json` schemas, and exit codes; the parity suite
(TEST-ICONS-CR001 TC-16) compares their output for the same catalogue and query. Shipping the JS
`bin` also closes the standing parity gap in RES-CLI-001 §3 (JS package had no CLI at all).

## 7. Sequencing note

`list`/`search`/`describe` depend on the FR-5 metadata manifest (**baseline phase P3**) being
present; they can ship as soon as P3 lands. `download --from iconify` depends additionally on the
generator/normalize pipeline (**baseline P2/P4**). See PLAN-ICONS-CR001 §3.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — design of the `kymo icons` grammar, disambiguation, resolution path, exit-code/`--json` contract, and two-package realisation. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-001/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the FR-12..FR-15 traces consistent with
CR-ICONS-001; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is CR-ICONS-001. The design
adds only the reserved word `icons`; converter behaviour (DESIGN of RES-CLI-001) is unchanged.

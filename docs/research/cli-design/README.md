# A Command-Line Interface for kymo — Lessons from FFmpeg (Research)

| Field             | Value                                                                                                            |
|-------------------|------------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-CLI-001                                                                                                       |
| Version           | 0.1                                                                                                              |
| Issue Date        | 2026-06-04                                                                                                       |
| Status            | Draft                                                                                                            |
| Classification    | Internal                                                                                                        |
| Owner             | `diagrams/` project                                                                                              |
| Audience          | Engineers redesigning kymo's command-line interface across the Python and JS packages                            |
| Subjects          | [FFmpeg CLI](https://ffmpeg.org/ffmpeg.html) (`ffmpeg` · `ffprobe` · `ffplay`) — its verb-less converter model · GNU/POSIX option conventions |
| Licenses          | FFmpeg: LGPL-2.1+/GPL-2+ (documentation cited under its terms; no FFmpeg code is used)                            |
| Versions Reviewed | FFmpeg 7.x CLI documentation (2026-06-03)                                                                         |
| Related Documents | `RES-ICONS-001`, `REF-DRAWIO-001`, `REF-PLANTUML-001`                                                             |

This is a **research note on prior art** — a study of how FFmpeg structures its command line, and a
**proposal** for redesigning kymo's. It is **not a specification**: nothing in this repository depends on
it, and no behaviour described under "Proposed" is committed work. It is the evidence base for a possible
future `docs/specs/kymo-cli/`.

The framing thesis: **FFmpeg is one binary that converts between hundreds of formats**, and it stays
usable by doing three things well — it separates the **container** (`-f mp4`) from the **codec/encoder**
(`-c:v libx264`); it pairs **per-file options** to each input and output so one command can transcode many
streams at once; and it ships a **focused tool family** (`ffmpeg` to convert, `ffprobe` to inspect,
`ffplay` to preview). kymo is the same shape at small scale — **one source → one of several render
targets** — so it can borrow FFmpeg's structure. But FFmpeg's command line is also infamous for one trap:
**options are positional relative to the next file**, so the same flag means different things depending on
where you put it. kymo should take the structure and reject the trap.

---

## 1. FFmpeg CLI anatomy

The canonical grammar:

```
ffmpeg [global options] {[input options] -i input_url} ... {[output options] output_url} ...
```

A single invocation declares **N inputs and M outputs**. Options are **positional**: an option binds to
the *next* file token (the next `-i` for input options, the next output URL for output options). So:

```
ffmpeg -ss 5 -i in.mp4 ...        # -ss is an INPUT option: seek before decoding
ffmpeg -i in.mp4 -ss 5 out.mp4    # -ss is an OUTPUT option: seek in the output timeline
```

Same flag, different meaning, decided purely by position. This is powerful (one grammar covers
"trim input A, scale output B, copy output C") but it is the single most-complained-about thing about the
tool: users cannot predict a flag's effect without knowing which file it "sticks" to.

Other load-bearing ideas:

- **Container vs codec separation.** `-f` forces the *container/format* (`mp4`, `webm`, `gif`); `-c:v` /
  `-c:a` choose the *encoder* within it. The "what file" and the "how it's encoded" are orthogonal axes.
- **Format is decoupled from extension.** Extension is a default guess; `-f` overrides it. This is what
  makes **stdin/stdout work**: a pipe has no extension, so `-f` supplies it.
- **`-` means a pipe.** `-i -` reads stdin; `output -` (or `pipe:1`) writes stdout — the Unix-composability
  hook.
- **A focused tool family.** `ffmpeg` transcodes, `ffprobe` inspects (`-show_streams`, `-of json`),
  `ffplay` previews. Each does one job; none is a mode-flag on the others.
- **A queryable, layered surface.** `ffmpeg -formats`, `-codecs`, `-encoders` enumerate capabilities;
  `-h`, `-h long`, `-h full`, and `-h encoder=libx264` zoom help from terse to exhaustive to one-topic.
- **Conventional plumbing.** `-y` / `-n` (overwrite yes/no), `-loglevel` / `-v` / `-hide_banner`
  (verbosity), `-stats` (progress). Boring, predictable, copyable.

---

## 2. What to adopt, what to reject

**Adopt:**

| # | FFmpeg idea | What it becomes in kymo |
|---|---|---|
| 1 | **Verb-less binary** — `ffmpeg -i in out`, no `convert`/`render` sub-command | `kymo [-i] <src> -t <target>` — the binary *is* the converter; `-i` is an optional input marker |
| 2 | One invocation, many outputs | One **parse/resolve**, many targets: `kymo in.kymo -t svg -t figma -t webp` |
| 3 | Format decoupled from extension (`-f`) | `-f/--from` to override input detection → enables stdin |
| 4 | `-` = stdin/stdout | `kymo -i - -f kymo -t svg -o -` for pipelines |
| 5 | Container vs codec separation | **Target** (`svg`) vs **variant** (`--anim flow`): animation is a property of svg/webp, not its own target |
| 6 | Capabilities & help as **flags** (`-formats`, `-codecs`, `-h full`) | `kymo -formats`, `kymo -targets`, `kymo -h [topic]` |
| 7 | `-o`/output URL controls destination | `-o <path\|->` (today kymo hard-codes "next to input") |
| 8 | `-y/-n`, `-q/-v` plumbing | Same flags, same meaning |
| 9 | Auxiliary modes as separate concerns (`ffprobe`/`ffplay`) | Mode flags on the one binary: `--probe` (inspect, no render) · `--lint` (rule-check the source) · `--watch` (re-render on change) |

**Reject:**

| # | FFmpeg trap | kymo's choice |
|---|---|---|
| 1 | Options are positional relative to files | kymo options are **order-insensitive** — a flag means the same thing wherever it appears |
| 2 | Stream-specifier microsyntax (`-c:v:0`) | Unneeded — a kymo source is one diagram, not a multiplexed stream set |
| 3 | Hundreds of private per-encoder options | Keep a small, curated, documented option set |
| 4 | `-i` with dual input/output semantics | `-i` marks the input only (and is optional); outputs are chosen by `-t`, never by repeating the source |

The throughline: borrow the *shape* (verb-less converter, one-parse-many-outputs, format override, pipes,
container/variant split) and drop the *positional-option model* that makes FFmpeg hard to learn.

---

## 3. kymo's CLI today

The current grammar (`packages/python/src/kymo/cli.py:68-150`, hand-parsed `sys.argv`):

```
kymo <path> [--animate] [--figma] [--excalidraw] [--bpmn] [--json] [-h]
```

The output target is selected by an **ordered chain of `if` checks**, not a value:

```python
if excalidraw: ...    # cli.py:105   ┐
if figma:      ...     # cli.py:113   │  first truthy flag wins;
if bpmn:       ...     # cli.py:121   │  extra flags are silently ignored
if json_out:   ...     # cli.py:131   │
svg = render(...)      # cli.py:141   ┘  (the fall-through default)
```

Gaps that follow from this design:

| Gap | Evidence | Consequence |
|---|---|---|
| 5 mutually-exclusive booleans, silent precedence | `cli.py:105-150` | `--figma --bpmn` silently emits only figma; no error |
| `--animate` is svg-only, silently | `cli.py:84,141` | `--figma --animate` drops the flag with no warning |
| No stdout / pipe support | `out.write_text(...)` `cli.py:108-146` | Can't compose in a shell pipeline |
| No `-o` — destination is fixed | `src.with_suffix(...)` `cli.py:107-143` | Output always lands next to the input |
| WebP is an orphan script | `to_webp.py:27-33` (PEP-723 `uv run to_webp.py …`) | A real target the main CLI can't reach; its `--frames/--width/--quality` live nowhere else |
| Re-parses per target | one target per process, `cli.py:90-150` | SVG + Figma + WebP = three runs, three parses/resolves |
| No inspect/validate verb | — | No way to ask "is this valid? how big? how many nodes?" without rendering |
| No capability discovery / real help | `print(__doc__)` `cli.py:73` | Targets are undiscoverable except by reading the docstring |
| **JS package has no CLI at all** | `packages/js/package.json` has no `bin` | Breaks the Python↔JS parity rule (CLAUDE.md) |

---

## 4. Proposed kymo CLI

A **clean break** to FFmpeg's **verb-less** model: there is **no `render`/`convert` sub-command** — the
`kymo` binary *is* the converter, exactly as `ffmpeg -i in out` needs no verb. The old `kymo <in> --flag`
boolean syntax is retired (see §6 for migration).

```
kymo [-i] <src|->  [-f <informat>] [-t <target>]... [-o <path|->]
                   [--anim <preset>] [--width N] [--frames N] [--quality Q]
                   [-y|-n] [-q|-v]

# the input marker is optional — these two are identical:
kymo  in.kymo  -t svg
kymo -i in.kymo -t svg

# auxiliary modes — flags on the same binary, not sub-commands:
kymo --probe <src|-> [-f <informat>] [--json]   # inspect only (format, size, node/edge counts, valid?)
kymo --lint  <src|-> [-f <informat>] [--json] [--max-level warn|error]   # rule-check the source
kymo --watch <src>   [-t <target>]...           # re-render on file change (live preview)

# capability & help queries — flags, mirroring `ffmpeg -formats` / `-codecs` / `-h full`:
kymo -formats        # list input formats
kymo -targets        # list output targets
kymo -h [topic]      # layered help
```

Like FFmpeg, `-i` only **marks** the input and may be omitted when the source is the first bare argument;
its job is to disambiguate the pipe case (`-i -`) and to read cleanly when options precede the source.

### Inputs and targets as *values*, not flags

- **Input formats** (`-f/--from`): `kymo` · `py` · `bpmn` · `kymojson`. Auto-detected from the extension
  when `-f` is omitted (today's behaviour); `-f` is required when the source has no extension (stdin).
- **Targets** (`-t/--to`, **repeatable**): `svg` · `figma` · `excalidraw` · `bpmn` · `kymojson` · `webp`
  · `png`.

Repeatable `-t` is the headline win — **one parse and one alignment pass feed every target**:

```
kymo in.kymo -t svg -t figma -t webp             # parse/resolve once → three files
```

This replaces the five booleans (and their silent precedence) with one explicit, multi-valued option,
and it folds the orphaned `to_webp.py` in as a first-class `webp` target — its `--frames/--width/--quality`
become render options (defaults from `to_webp.py:31-32`: 30 frames over the 1.2 s flow cycle, quality 85,
width matches the viewBox).

### Container vs variant: animation stops being a silent no-op

Following FFmpeg's container/codec split, **`svg` is the container** and **`--anim` is the encoder
option** (`flow` · `slow` · `pulse` · `ants`, today's `--animate` presets). It applies to `svg` and
`webp`; for `figma`/`excalidraw`/`bpmn`/`kymojson` it is a **hard error**, not a silently-dropped flag:

```
kymo in.kymo -t svg --anim flow                  # → in-animated.svg
kymo in.kymo -t figma --anim flow                # error: --anim not valid for target 'figma'
```

### Pipes and output control

- **stdin/stdout** via `-`:
  ```
  cat in.kymo | kymo -i - -f kymo -t svg -o - > out.svg
  ```
- **`-o/--out`** controls the destination. Omitted → **next to the input** (preserves today's
  ergonomics). `-o dir/` → a directory for multi-target runs. `-o -` → stdout (single target only).
- **`-y/-n`** overwrite control; **`-q/-v`** verbosity. Order-insensitive — every option means the same
  thing wherever it sits on the line (the deliberate anti-FFmpeg choice).

### `--probe` — the ffprobe analogue

FFmpeg splits inspection into a separate binary (`ffprobe`). kymo keeps one binary and exposes inspection
as a **mode flag** — `--probe` reads and resolves the source but writes no render artifact:

```
kymo --probe in.bpmn          # human: detected format, canvas WxH, #components, #edges, #regions, valid?
kymo --probe in.bpmn --json   # machine-readable, for scripts/CI
```

A read-only inspect/validate mode the current CLI lacks entirely — useful in CI to gate "does this source
still parse and resolve?" without writing render artifacts.

### `--lint` — rule-checking a source

`--probe` answers *"is this legal?"* (does it parse and resolve). **`--lint` answers a different
question — *"is this a good diagram?"*** This is the **lint ≠ schema-validation** distinction drawn in the
*BPMN Lint & Validation Tooling* research note: linting is a configurable layer of best-practice and
house-style rules on top of a legal source, exactly as ESLint sits on top of a JavaScript parser.

```
kymo --lint in.kymo                       # human: file:line  level  rule  message
kymo --lint in.kymo --json                # machine-readable diagnostics, for editors/CI
kymo --lint in.kymo --max-level warn      # treat warnings as failures too
```

Behaviour, following lint-tool convention (and unlike a renderer):

- **Diagnostics with severity** — `error` / `warn` / `info`, each carrying a stable rule id, a source
  `file:line[:col]`, and a message. `--json` emits the structured list for editor squiggles and CI.
- **Exit code is the contract** — `0` clean, non-zero when any diagnostic at or above `--max-level`
  (default `error`) is present. This is what makes `kymo --lint` a CI gate, distinct from `--probe`'s
  parse/resolve check.
- **Rules are kymo-specific**, e.g. *unreferenced node*, *edge endpoint not found*, *region with no
  members*, *duplicate id*, *overlapping components*, *icon key not in the catalogue*; for `bpmn` sources,
  the conformance rule set surveyed in the BPMN-lint note (cf. `bpmnlint`).
- **Writes no render artifact** — a pure source check, like `--probe`.

`--probe` and `--lint` stack: `--probe` is the cheap "does it even load" gate; `--lint` is the opinionated
"is it well-modelled" gate on top of it.

---

## 5. Python ↔ JS parity

CLAUDE.md requires features to land in both packages. Today **only Python has a CLI**; `packages/js` is
library-only (`package.json` has no `bin`). The proposal adds a matching `kymo` `bin` to the JS package
with the **same verb-less grammar and target names**.

Two constraints shape the JS side:

1. **Zero runtime dependencies** (CLAUDE.md). The JS CLI must use a **hand-rolled argument parser** — no
   `commander`/`yargs` — mirroring the Python side's manual `sys.argv` parsing. The verb-less, flat option
   set keeps a hand-rolled parser tractable (one source token, a small repeatable `-t`, a handful of flags).
2. **Renderer surface gaps.** The JS exports (`packages/js/src/index.ts:19-32`) cover only a subset of the
   targets:

   | Target | Python | JS |
   |---|---|---|
   | `svg` (+`--anim`) | ✅ `to_svg` | ✅ `renderSVG` |
   | `bpmn` | ✅ `to_bpmn` | ✅ `toBpmn` |
   | `kymojson` | ✅ `to_kymojson` | ✅ `toKymoJson` |
   | `figma` | ✅ `to_figma` | ❌ (no exporter) |
   | `excalidraw` | ✅ `to_excalidraw` | ❌ (no exporter) |
   | `webp` / `png` | ⚠️ `to_webp.py` (orphan script) | ❌ (no rasteriser) |

   So a JS `kymo` can ship `-t svg|bpmn|kymojson` immediately and report a clear
   "target not available in this implementation" error for the rest — which doubles as a **parity backlog**
   (figma, excalidraw, webp/png exporters are the JS gaps to close). Rasterising (`webp`/`png`) in a
   zero-dep JS package is the hardest gap and may stay Python-only initially.

---

## 6. Migration (clean break)

The old grammar is removed; here is the mapping:

| Old | New |
|---|---|
| `kymo x.kymo` | `kymo x.kymo` *(unchanged — bare source still renders to svg)* |
| `kymo x.kymo --animate` | `kymo x.kymo -t svg --anim flow` |
| `kymo x.kymo --figma` | `kymo x.kymo -t figma` |
| `kymo x.kymo --excalidraw` | `kymo x.kymo -t excalidraw` |
| `kymo x.kymo --bpmn` | `kymo x.kymo -t bpmn` |
| `kymo x.kymo --json` | `kymo x.kymo -t kymojson` |
| `uv run to_webp.py x.svg --frames 30` | `kymo x.kymo -t webp --frames 30` |

Because the binary stays verb-less, the **common case is unchanged** — `kymo x.kymo` still renders an SVG.
Only the **target-selection booleans** are retired in favour of `-t <target>`.

**What breaks:** any script or doc using the old `--figma`/`--excalidraw`/`--bpmn`/`--json`/`--animate`
flags. The repo's own samples, README snippets, `docs/guide/`, and the `kymo-bump`/CI flows that shell out
to `kymo` would need updating in lockstep. **Optional softening:** a one-release deprecation shim that
detects a legacy boolean (e.g. `--figma`), prints `kymo: --figma is deprecated; use '-t figma'`, and maps
it to the new `-t` value — removed in the following release. (A clean break with no shim is also viable
given kymo's current small user base.)

---

## 7. Recommendation summary

Ranked by payoff-to-effort:

1. **Target-as-value, repeatable (`-t`), one parse → many outputs.** Kills the silent-precedence bug,
   makes `--anim` validation explicit, and removes redundant re-parsing. The core of the redesign.
2. **`-o` + stdin/stdout (`-`).** Unlocks pipelines and arbitrary destinations — small change, large
   ergonomic gain.
3. **WebP/PNG as first-class targets.** Retires the orphan `to_webp.py`; gives rasterisation a home in the
   CLI.
4. **`--probe` + `--lint` modes.** Read-only source checks: `--probe` gates "does it load", `--lint`
   gates "is it well-modelled" (severity diagnostics + exit code) — both immediately useful in CI.
5. **JS CLI for parity.** Hand-rolled, zero-dep; ship `svg/bpmn/kymojson` now and treat figma/excalidraw/
   webp as the documented parity backlog.

The **verb-less** model — `kymo [-i] <src> -t <target>`, with `--probe`/`--lint`/`--watch` as mode flags
and `-formats`/`-targets`/`-h` as capability queries — is the frame that makes all of the above
discoverable and extensible. It is exactly FFmpeg's "one binary *is* the converter" abstraction, minus the
positional-option tax kymo is free to leave behind.

---

## Annex A — Revision history

| Version | Date       | Author | Notes                                              |
|---------|------------|--------|----------------------------------------------------|
| 0.1     | 2026-06-04 | `diagrams/` | Initial draft — FFmpeg CLI study + kymo CLI proposal. |

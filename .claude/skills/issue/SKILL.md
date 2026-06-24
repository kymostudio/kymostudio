---
name: issue
description: Create or reformat a GitHub issue on kymostudio/kymostudio via the `gh` CLI. Picks the matching `.github/ISSUE_TEMPLATE` form (bug_report / feature_request), mirrors its fields into the body, sets the org Issue Type (Feature for feature_request) and auto-applies `#`-prefixed area labels from the existing repo labels. Use when the user says "tạo issue", "create issue", "mở issue", "open issue", "report bug", or asks to reformat an existing issue for this repo.
argument-hint: "<problem/proposal description | issue#/URL to reformat> [--label x,y] [--assignee @me]"
allowed-tools: Bash Read Grep Glob
---

# GitHub Issue

Turn a free-form user description into a clean, structured GitHub issue on
`kymostudio/kymostudio`.

## Usage

`/issue <description>` — create: e.g. `/issue on editor.kymo.studio a logged-out user should see the editor directly, drop the welcome page`

`/issue <issue# or URL> <what to change>` — reformat an existing issue to the
template (title/body/labels). e.g. `/issue #737 reformat to template`.

The user may describe the issue in any language (often Vietnamese), but the
**issue itself is always written in English** (see Notes).

### Optional flags
- `--label a,b` — add **extra** labels on top of the auto-labels (only when asked).
- `--assignee @me` or `@user` — assign the issue.

## Procedure

1. **Resolve the repo.** Default `kymostudio/kymostudio`. Confirm with:
   ```bash
   gh repo view --json nameWithOwner -q .nameWithOwner
   ```

2. **Pick the template + read its current fields.** This repo ships GitHub issue
   forms under `.github/ISSUE_TEMPLATE/`. The body MUST mirror the fields of the
   matching template (one `## <Label>` heading per form field, same order). `gh issue
   create --body` does NOT apply forms, so reproduce them by hand. Classify the
   request:
   - **bug / something broken** → `bug_report.yml` → apply label `bug`.
   - **idea / enhancement / "should be able to"** → `feature_request.yml` → set the
     **Issue Type `Feature`** (org-level type, NOT a label — this template carries
     `type: Feature` and no `enhancement` label).

   Always Read the chosen YAML first (do not hardcode from memory — fields drift) and
   use its `label:` value and its `body[].attributes.label` strings verbatim. As of
   this writing they are:

   Affected-package options (same list in both forms): `python` / `js` /
   `rust / core engine` / `editor` / `vscode-extension` / `mcp / api` / `website` /
   `icons` / `mobile` / `desktop-app` / `docs`.

   ```markdown
   # bug_report.yml  (label: bug)
   ## Affected package    — one of the options above
   ## Version             — package version or git commit (use "main @ <short-sha>" if unknown)
   ## What happened?      — what the user did and what went wrong (include URL if any)
   ## Reproduction        — minimal .kymo/.bpmn source + command, if applicable
   ## Expected behavior
   ## Environment         — OS + Python/Node version (omit if N/A)
   ```
   ```markdown
   # feature_request.yml  (type: Feature — no label)
   ## Problem / motivation — what's hard or impossible today (include URL if any)
   ## Proposed solution
   ## Alternatives considered   (omit if none)
   ## Affected package    — any of the options above (multiple allowed)
   ```

3. **Fill the fields (IN ENGLISH).** Title ≤ ~70 chars, shaped as
   `<area>: <desired action/outcome>` (e.g. `editor: drop welcome page, show editor
   directly for guests`). Fill every required field from the user's description; leave
   a required field you can't infer as `_TBD_` rather than dropping it. Drop optional
   fields that don't apply. When the description points at a code area, search for the
   relevant files (Grep/Glob, do NOT guess names) and name them inside the matching
   field (e.g. under **What happened?** / **Proposed solution**) — the forms have no
   dedicated Scope field.

4. **Choose labels automatically.** Build the label set from existing repo labels —
   **never invent a label** (`gh` would error, or `--force-create` would pollute the
   repo). Always list the live labels first and only use names that appear:
   ```bash
   gh label list --repo kymostudio/kymostudio --limit 100
   ```
   Then assemble:
   - **Type:**
     - bug → label `bug` (bug_report's own label).
     - feature → **Issue Type `Feature`** (org-level), set in a separate step (see
       step 5) — do **not** add an `enhancement` label.
   - **Area label (when one exists for the affected area):** this repo uses `#`-prefixed
     area labels. Map the affected package/area to its label *if that label exists*:

     | affected area | area label |
     |---|---|
     | editor | `#editor` |
     | website / landing / playground | `#landing` |
     | icons / website-icons | `#icons` |
     | website-design / design system | `#design` |
     | dbml import | `#dbml` |

     Packages with no matching area label yet (python, js, rust/core, mcp, mobile,
     desktop-app, vscode-extension) get **no** area label — do not create one.
   - **`documentation`:** add when the issue is primarily about docs (affected area
     `docs`, or a docs-only change).
   - Anything else (`good first issue`, `help wanted`, `question`, `@epic`, `>loop`,
     assignee, milestone) is added **only when the user explicitly asks**.

   Pass each label with its own `--label` flag (names contain `#`/spaces — quote them).

5. **Create or edit the issue, then set the type.** Apply the labels from step 4.

   **Bug — new issue:**
   ```bash
   gh issue create --repo kymostudio/kymostudio \
     --title "<title>" \
     --label "bug" --label "#editor" \
     --body "<body>"
   ```
   **Feature — new issue** (no `enhancement` label; set the `Feature` type after):
   ```bash
   url=$(gh issue create --repo kymostudio/kymostudio \
     --title "<title>" \
     --label "#editor" \
     --body "<body>")
   num=${url##*/}
   gh api repos/kymostudio/kymostudio/issues/$num -X PATCH -f type=Feature
   ```
   **Editing an existing issue** (user gave an issue number/URL — reformat title/body
   to the template, reconcile labels, set/clear the type):
   ```bash
   gh issue edit <number> --repo kymostudio/kymostudio \
     --title "<title>" \
     --add-label "#editor" --remove-label "enhancement" \
     --body "<body>"
   gh api repos/kymostudio/kymostudio/issues/<number> -X PATCH -f type=Feature
   ```
   > **Why the REST `PATCH ... -f type=…`:** the form's `type:` only auto-applies when
   > an issue is filed through the GitHub web form. When this skill creates/edits via
   > the CLI, the type must be set explicitly. The installed `gh` (2.64) has no
   > `--type` flag, so use the REST API. Valid org types: `Bug` / `Feature` / `Task`.
   > For a bug you may likewise set `-f type=Bug` (optional — the `bug` label already
   > marks it).

6. **Report back.** Return the issue URL plus a 1–2 line summary, and note what was
   applied — **issue type** (Feature/Bug) and labels (area, etc.). Beyond the
   auto type/labels above, do not add assignee/milestone/extra labels unless asked.

## Notes
- **The issue (title + body) is ALWAYS written in English**, regardless of the
  language the user used. Replies/explanations back to the user follow the user's
  language. Escape the body correctly for heredoc / `-m`.
- This only creates/edits an issue — it does NOT touch code and does NOT commit/push.
- Auto-labels come from **existing repo labels only**. Never create a new label; if no
  area label fits, apply just the area label (or none). Re-list labels each run — drift.
- **Issue Type vs label:** feature_request now uses the org **Issue Type `Feature`**
  (set via `gh api … -X PATCH -f type=…`), not an `enhancement` label. Bugs still use
  the `bug` label. Org types are defined org-wide (`gh api orgs/kymostudio/issue-types`)
  — currently `Bug` / `Feature` / `Task`.
- One issue = one clear problem. If the description bundles several unrelated things,
  ask the user whether to split it into multiple issues before creating.

# tools/

Maintenance scripts for the monorepo. Stdlib-only Python, no install step —
run them straight from the repo root.

## `info.py`

Read or set the project's **shared version** and **tagline** from one place,
keeping the two publishable packages (and the VS Code extension's version) in
sync. **Source of truth: `packages/python/pyproject.toml`.**

```bash
python tools/info.py version                    # print the current version
python tools/info.py version 0.3.0              # set it everywhere
python tools/info.py tagline                    # print the current tagline
python tools/info.py tagline "New one-liner."   # set it everywhere
```

With no value, the current value is printed. With a value, every location is
rewritten in place — formatting is preserved, only the value string changes.

| Command   | Writes to                                                                                   |
| --------- | ------------------------------------------------------------------------------------------- |
| `version` | `pyproject.toml`, `__init__.py`, `js/package.json`, `vscode-extension/package.json`, and the `uv.lock` / `package-lock.json` self-entries. |
| `tagline` | the `description` in `pyproject.toml` + `js/package.json`, and the first paragraph of the `packages/python` & `packages/js` READMEs (written verbatim, so keep the tagline plain text). |

Left untouched on purpose: the VS Code extension `description` (a different
product) and the root `README.md` tagline (a hand-written marketing variant).

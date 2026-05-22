#!/usr/bin/env python3
"""Read or set the kymostudio monorepo's shared version and tagline.

The two publishable packages (``packages/python``, ``packages/js``) and the
VS Code extension share one **version**; the two packages also share one
product **tagline** (the metadata ``description`` plus each README's first
paragraph). This tool reads or rewrites them from one place.

    tools/info.py version                    # print the current shared version
    tools/info.py version 0.3.0              # set it everywhere
    tools/info.py tagline                    # print the current shared tagline
    tools/info.py tagline "New one-liner."   # set it everywhere

Source of truth: ``packages/python/pyproject.toml``. With no value the current
value is printed; with a value every location is rewritten in place (formatting
preserved — only the value string changes).

Left untouched on purpose:

* the VS Code extension ``description`` — it is a different product;
* the root ``README.md`` tagline — a hand-written marketing variant.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PYPROJECT = "packages/python/pyproject.toml"
INIT_PY = "packages/python/src/kymo/__init__.py"
JS_PKG = "packages/js/package.json"
VSCODE_PKG = "packages/vscode-extension/package.json"
UV_LOCK = "packages/python/uv.lock"
JS_LOCK = "packages/js/package-lock.json"
PKG_READMES = ("packages/python/README.md", "packages/js/README.md")

VERSION_RE = re.compile(r"\d+\.\d+\.\d+(?:[._-][0-9A-Za-z.]+)?$")


# ── file helpers ─────────────────────────────────────────────────────────────

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def quote(value: str) -> str:
    """A double-quoted literal valid for both JSON and TOML basic strings."""
    return json.dumps(value, ensure_ascii=False)


def sub_first(rel: str, pattern: str, value: str, *, count: int = 1, flags: int = 0) -> int:
    """Replace group(1)+"<old>" with group(1)+quoted ``value``; return count."""
    text = read(rel)
    new_text, n = re.subn(
        pattern, lambda m: m.group(1) + quote(value), text, count=count, flags=flags
    )
    if n and new_text != text:
        write(rel, new_text)
    return n


# ── readers ──────────────────────────────────────────────────────────────────

def current_version() -> str | None:
    m = re.search(r'^version\s*=\s*"([^"]*)"', read(PYPROJECT), re.MULTILINE)
    return m.group(1) if m else None


def current_tagline() -> str | None:
    m = re.search(r'^description\s*=\s*"([^"]*)"', read(PYPROJECT), re.MULTILINE)
    return m.group(1) if m else None


# ── version setters ──────────────────────────────────────────────────────────

def set_uv_lock_version(new: str) -> int:
    """Set the version of the ``[[package]] name = "kymostudio"`` block only."""
    text = read(UV_LOCK)
    parts = text.split("[[package]]")
    changed = 0
    for i, block in enumerate(parts):
        if re.search(r'^name\s*=\s*"kymostudio"\s*$', block, re.MULTILINE):
            parts[i], c = re.subn(
                r'^(version\s*=\s*)"[^"]*"',
                lambda m: m.group(1) + quote(new),
                block, count=1, flags=re.MULTILINE,
            )
            changed += c
    if changed:
        write(UV_LOCK, "[[package]]".join(parts))
    return changed


def set_js_lock_version(old: str, new: str) -> int:
    """Set the root + ``packages[""]`` self-entries (first two matches)."""
    text = read(JS_LOCK)
    new_text, n = re.subn(
        r'("version"\s*:\s*)"' + re.escape(old) + r'"',
        lambda m: m.group(1) + quote(new),
        text, count=2,
    )
    if n:
        write(JS_LOCK, new_text)
    return n


# ── command handlers ─────────────────────────────────────────────────────────

def report(rel: str, n: int) -> None:
    print(f"  {'updated  ' if n else 'unchanged'} {rel}")


def do_version(new: str) -> int:
    if not VERSION_RE.fullmatch(new):
        print(f"error: {new!r} is not a valid version (expected X.Y.Z)", file=sys.stderr)
        return 2
    old = current_version()
    if old == new:
        print(f"version already {new} — nothing to do")
        return 0
    print(f"version: {old} → {new}")
    report(PYPROJECT, sub_first(PYPROJECT, r'^(version\s*=\s*)"[^"]*"', new, flags=re.MULTILINE))
    report(INIT_PY, sub_first(INIT_PY, r'(__version__\s*=\s*)"[^"]*"', new))
    report(JS_PKG, sub_first(JS_PKG, r'("version"\s*:\s*)"[^"]*"', new))
    report(VSCODE_PKG, sub_first(VSCODE_PKG, r'("version"\s*:\s*)"[^"]*"', new))
    if (ROOT / UV_LOCK).exists():
        report(UV_LOCK, set_uv_lock_version(new))
    if (ROOT / JS_LOCK).exists() and old:
        report(JS_LOCK, set_js_lock_version(old, new))
    return 0


def set_readme_tagline(rel: str, new: str) -> int:
    """Replace the paragraph after the ``# `` title with ``new`` (one line)."""
    text = read(rel)
    lines = text.split("\n")
    i = next((j for j, ln in enumerate(lines) if ln.startswith("# ")), None)
    if i is None:
        return 0
    j = i + 1
    while j < len(lines) and not lines[j].strip():
        j += 1
    start = j
    while j < len(lines) and lines[j].strip():
        j += 1
    if lines[start:j] == [new]:
        return 0
    lines[start:j] = [new]
    write(rel, "\n".join(lines))
    return 1


def do_tagline(new: str) -> int:
    new = new.strip()
    if not new:
        print("error: empty tagline", file=sys.stderr)
        return 2
    print(f"tagline → {new!r}")
    report(PYPROJECT, sub_first(PYPROJECT, r'^(description\s*=\s*)"[^"]*"', new, flags=re.MULTILINE))
    report(JS_PKG, sub_first(JS_PKG, r'("description"\s*:\s*)"[^"]*"', new))
    for rel in PKG_READMES:
        report(rel, set_readme_tagline(rel, new))
    return 0


def main(argv: list[str]) -> int:
    if not argv or argv[0] not in ("version", "tagline"):
        print(__doc__)
        return 2
    cmd, value = argv[0], (argv[1] if len(argv) > 1 else None)
    if value is None:
        print(current_version() if cmd == "version" else current_tagline())
        return 0
    return do_version(value) if cmd == "version" else do_tagline(value)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

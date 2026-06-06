#!/usr/bin/env python3
"""Select a self-contained, text-free subset of the resvg test suite.

Usage:
  select_dataset.py count                 # report per-category eligible counts
  select_dataset.py copy <dest> <n> <sha> # copy N/category into dest, write provenance
"""
import re
import shutil
import sys
from pathlib import Path

SRC = Path("/tmp/resvg-suite/resvg-test-suite-main/tests")
CATEGORIES = ["shapes", "painting", "paint-servers", "structure", "masking", "filters"]

# Exclude anything that pulls in an external resource or a font: those measure
# font/resource handling, not pure rasterization, and our string-based engine
# API can't resolve relative hrefs anyway.
DISQUALIFY = re.compile(
    r"<image\b|<text\b|<tref\b|<textPath\b|@import|"
    r"(?:xlink:)?href\s*=\s*[\"'](?!#)",
    re.IGNORECASE | re.DOTALL,
)


def eligible(cat: str) -> list[Path]:
    out = []
    for p in sorted((SRC / cat).rglob("*.svg")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        if DISQUALIFY.search(txt):
            continue
        out.append(p)
    return out


def stride_select(items: list[Path], n: int) -> list[Path]:
    if n >= len(items):
        return items
    step = len(items) / n
    return [items[int(i * step)] for i in range(n)]


def main() -> None:
    if len(sys.argv) >= 2 and sys.argv[1] == "count":
        total = 0
        for cat in CATEGORIES:
            e = eligible(cat)
            total += len(e)
            print(f"{cat:14} {len(e):4} eligible")
        print(f"{'TOTAL':14} {total:4}")
        return

    if len(sys.argv) >= 5 and sys.argv[1] == "copy":
        dest = Path(sys.argv[2])
        n = int(sys.argv[3])
        sha = sys.argv[4]
        lines = []
        picked_total = 0
        for cat in CATEGORIES:
            e = eligible(cat)
            picks = stride_select(e, n)
            cat_dir = dest / "tests" / cat
            cat_dir.mkdir(parents=True, exist_ok=True)
            for src in picks:
                # Flatten subpath under the category into the filename.
                rel = src.relative_to(SRC / cat)
                flat = "__".join(rel.parts)
                shutil.copyfile(src, cat_dir / flat)
                lines.append(f"{cat}/{flat}")
            picked_total += len(picks)
            print(f"{cat:14} picked {len(picks)}/{len(e)}")
        prov = dest / "PROVENANCE.md"
        prov.write_text(
            "# Dataset provenance\n\n"
            "Vendored subset of the **resvg test suite** "
            "(https://github.com/linebender/resvg-test-suite), MIT-licensed.\n\n"
            f"- Source commit: `{sha}`\n"
            f"- Categories: {', '.join(CATEGORIES)} (text/image excluded — font/resource dependent)\n"
            f"- Selection: self-contained, text-free SVGs only; ~{n} per category by\n"
            "  deterministic stride over the sorted eligible list.\n"
            f"- Total: {picked_total} SVGs\n\n"
            "Regenerate with `datasets/select_dataset.py` (see bench README).\n"
            "Reference PNGs in `refs/` are rendered by headless Google Chrome — see\n"
            "`datasets/gen_refs.py`.\n",
            encoding="utf-8",
        )
        (dest / "tests" / "_manifest.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"TOTAL picked {picked_total} → {dest}")
        return

    print(__doc__)
    sys.exit(1)


if __name__ == "__main__":
    main()

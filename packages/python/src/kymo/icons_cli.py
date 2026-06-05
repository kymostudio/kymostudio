"""`kymo icons <verb>` — the icon command group (CR-ICONS-001 / FR-12..15).

Verbs over the Icons v2 catalogue (P3 per-set IconifyJSON):

    kymo icons list     [provider] [--json]
    kymo icons search   <query> [--provider P] [--remote] [--limit N] [--json]
    kymo icons describe <prefix:name> [--json]
    kymo icons download <prefix:name>... [--from <source>] [-o <dir>] [-y]

`list`/`search`/`describe` are offline (no network); only `search --remote`
and `download --from iconify` touch the Iconify API (stdlib `urllib`, so
`packages/js` stays zero-dep on its side too). Every verb exits 0 on success
and non-zero on error (unknown key, malformed address, network failure) so the
group is CI-usable. `icons` is the only reserved first token — every other
first token is a converter source path (the verb-less converter is unchanged).
"""
from __future__ import annotations

import json as _json
import sys

from . import icons

_USAGE = (
    "usage: kymo icons <list|search|describe|download> [args]\n"
    "  list     [provider] [--json]\n"
    "  search   <query> [--provider P] [--remote] [--limit N] [--json]\n"
    "  describe <prefix:name> [--json]\n"
    "  download <prefix:name>... [--from <source>] [-o <dir>] [-y]"
)
_ICONIFY_API = "https://api.iconify.design"


def _opt(args: list[str], name: str) -> str | None:
    """Pop `--name value` (or `-o value`) from `args`, returning the value."""
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            val = args[i + 1]
            del args[i:i + 2]
            return val
        del args[i]
    return None


def _err(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


# ── list (FR-13) ──────────────────────────────────────────────────────────
def _list(args: list[str]) -> int:
    as_json = "--json" in args
    rest = [a for a in args if a != "--json"]
    cols = icons.collections()
    if not rest:
        if as_json:
            print(_json.dumps(cols, ensure_ascii=False))
            return 0
        if not cols:
            print("no icon sets found (run the generator: npm run build-manifest)")
            return 0
        for prefix in sorted(cols):
            c = cols[prefix]
            print(f"{prefix:<16} {c['total']:>5} icons  [{', '.join(c['categories'])}]")
        return 0
    prefix = rest[0]
    s = icons.load_set(prefix)
    if not s:
        return _err(f"unknown provider: {prefix!r}")
    addrs = [f"{prefix}:{name}" for name in sorted(s["icons"])]
    if as_json:
        print(_json.dumps(addrs, ensure_ascii=False))
    else:
        for a in addrs:
            print(a)
    return 0


# ── search (FR-14) ──────────────────────────────────────────────────────────
def _search(args: list[str]) -> int:
    as_json = "--json" in args
    remote = "--remote" in args
    provider = _opt(args, "--provider")
    limit = _opt(args, "--limit")
    rest = [a for a in args if a not in ("--json", "--remote")]
    if not rest:
        return _err("usage: kymo icons search <query> [--provider P] [--remote] [--limit N] [--json]")
    query = rest[0].lower()
    n = int(limit) if limit and limit.isdigit() else 50

    prefixes = [provider] if provider else sorted(icons.collections())
    scored: list[tuple[int, str]] = []
    for prefix in prefixes:
        s = icons.load_set(prefix)
        for name, rec in s.get("icons", {}).items():
            addr = f"{prefix}:{name}"
            hay_name = name.lower()
            cat = (rec.get("category") or "").lower()
            if query == hay_name:
                rank = 0
            elif query in hay_name:
                rank = 1
            elif query in cat:
                rank = 2
            else:
                continue
            scored.append((rank, addr))
    scored.sort(key=lambda t: (t[0], t[1]))
    results = [addr for _, addr in scored][:n]

    remote_results: list[str] = []
    if remote:
        try:
            remote_results = _iconify_search(query, n)
        except Exception as exc:                      # network failure → non-zero
            return _err(f"remote search failed: {exc}")

    if as_json:
        print(_json.dumps(
            {"query": query, "results": results, "remote": remote_results},
            ensure_ascii=False,
        ))
        return 0
    for a in results:
        print(a)
    for a in remote_results:
        print(f"{a}\t(iconify, fetchable)")
    return 0


def _iconify_search(query: str, limit: int) -> list[str]:
    from urllib.parse import urlencode
    from urllib.request import urlopen

    url = f"{_ICONIFY_API}/search?" + urlencode({"query": query, "limit": limit})
    with urlopen(url, timeout=10) as resp:            # noqa: S310 (https only)
        data = _json.loads(resp.read().decode("utf-8"))
    return list(data.get("icons", []))


# ── describe (FR-15) ──────────────────────────────────────────────────────
def _describe(args: list[str]) -> int:
    as_json = "--json" in args
    rest = [a for a in args if a != "--json"]
    if not rest:
        return _err("usage: kymo icons describe <prefix:name> [--json]")
    addr = rest[0]
    if not icons.is_address(addr):
        return _err(f"malformed address (expected prefix:name): {addr!r}")
    prefix, _, name = addr.partition(":")
    s = icons.load_set(prefix)
    rec = s.get("icons", {}).get(name) if s else None
    if rec is None:
        return _err(f"unknown icon: {addr!r}")
    info = s.get("info", {})
    out = {
        "address": addr,
        "width": rec.get("width", s.get("width")),
        "height": rec.get("height", s.get("height")),
        "category": rec.get("category"),
        "path": rec.get("path"),
        "set": {"name": info.get("name", prefix), "total": info.get("total"),
                "license": info.get("license")},
        "aliasChain": _alias_chain(addr),
    }
    if as_json:
        print(_json.dumps(out, ensure_ascii=False))
        return 0
    print(f"address  : {out['address']}")
    print(f"size     : {out['width']}×{out['height']}")
    print(f"category : {out['category']}")
    print(f"source   : {out['path']}")
    print(f"set      : {out['set']['name']} ({out['set']['total']} icons)")
    if out["aliasChain"]:
        print(f"alias of : {' → '.join(out['aliasChain'])}")
    return 0


def _alias_chain(addr: str) -> list[str]:
    chain: list[str] = []
    seen: set[str] = set()
    cur = addr
    while cur in icons._ALIASES and cur not in seen:
        seen.add(cur)
        cur = icons._ALIASES[cur]["parent"]
        chain.append(cur)
    return chain


# ── download (FR-15) ──────────────────────────────────────────────────────
def _download(args: list[str]) -> int:
    source = _opt(args, "--from")
    out_dir = _opt(args, "-o") or "icons"
    yes = "-y" in args
    targets = [a for a in args if a not in ("-y",)]
    if not targets:
        return _err("usage: kymo icons download <prefix:name>... [--from <source>] [-o <dir>] [-y]")

    from pathlib import Path
    dest = Path(out_dir)
    for addr in targets:
        if not icons.is_address(addr):
            return _err(f"malformed address: {addr!r}")
        if source == "iconify":
            try:
                body = _iconify_fetch(addr)
            except Exception as exc:
                return _err(f"iconify fetch failed for {addr}: {exc}")
            try:
                from .icons_pipeline import normalize  # P4 normalize (FR-8)
                body = normalize(body)
            except Exception:
                pass                                           # pipeline optional pre-P4
            prefix, _, name = addr.partition(":")
            target = dest / prefix / f"{name}.svg"
            if target.exists() and not yes:
                return _err(f"refusing to overwrite {target} (pass -y)")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body, encoding="utf-8")
            print(f"✓ wrote {target}")
        else:
            # Local copy from the vendored catalogue.
            src = icons._NS_ICONS.get(addr)
            if src is None:
                return _err(f"unknown icon: {addr!r}")
            target = dest / src.name
            if target.exists() and not yes:
                return _err(f"refusing to overwrite {target} (pass -y)")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(src.read_bytes())
            print(f"✓ wrote {target}")
    return 0


def _iconify_fetch(addr: str) -> str:
    from urllib.request import urlopen

    prefix, _, name = addr.partition(":")
    url = f"{_ICONIFY_API}/{prefix}/{name}.svg"
    with urlopen(url, timeout=10) as resp:            # noqa: S310 (https only)
        return resp.read().decode("utf-8")


# ── dispatch ────────────────────────────────────────────────────────────────
def run(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(_USAGE)
        return 0 if argv else 1
    verb, rest = argv[0], list(argv[1:])
    handlers = {"list": _list, "search": _search, "describe": _describe, "download": _download}
    handler = handlers.get(verb)
    if handler is None:
        print(f"unknown icons command: {verb!r}\n{_USAGE}", file=sys.stderr)
        return 2
    return handler(rest)

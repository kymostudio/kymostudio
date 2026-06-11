#!/usr/bin/env python3
"""Generate database.dbml (DBML schema, dbdiagram.io dialect) from database.sqlite.

Introspects the live SQLite schema — tables, columns, primary keys, unique
constraints, foreign keys, and CHECK clauses — so the .dbml stays a faithful,
regenerable view of the database. Run after any schema change:

    uv run generate_schema.py
"""
import re
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE / "database.sqlite"
OUT = HERE / "database.dbml"


def column_line(col, single_pk):
    name, ctype, notnull, default, pk = col[1], col[2], col[3], col[4], col[5]
    attrs = []
    if pk and single_pk:
        attrs.append("pk")
    if notnull and not (pk and single_pk):
        attrs.append("not null")
    if default is not None:
        attrs.append(f"default: {default}")
    suffix = f" [{', '.join(attrs)}]" if attrs else ""
    return f"  {name} {ctype.lower() or 'text'}{suffix}"


def checks_from_sql(create_sql):
    """Extract CHECK(...) bodies with balanced parentheses."""
    sql = create_sql or ""
    out = []
    for m in re.finditer(r"CHECK\s*\(", sql, flags=re.I):
        depth, start = 1, m.end()
        for i in range(start, len(sql)):
            if sql[i] == "(":
                depth += 1
            elif sql[i] == ")":
                depth -= 1
                if depth == 0:
                    out.append(sql[start:i])
                    break
    return out


def main():
    con = sqlite3.connect(DB)
    tables = con.execute(
        "SELECT name, sql FROM sqlite_master"
        " WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()

    blocks = [f"// Generated from {DB.name} by generate_schema.py — do not edit by hand.\n"]
    refs = []
    for name, create_sql in tables:
        cols = con.execute(f"PRAGMA table_info({name})").fetchall()
        pk_cols = [c[1] for c in sorted(cols, key=lambda c: c[5]) if c[5]]
        single_pk = len(pk_cols) == 1

        lines = [f"Table {name} {{"]
        lines += [column_line(c, single_pk) for c in cols]

        index_lines = []
        if len(pk_cols) > 1:
            index_lines.append(f"    ({', '.join(pk_cols)}) [pk]")
        for idx in con.execute(f"PRAGMA index_list({name})").fetchall():
            idx_name, unique, origin = idx[1], idx[2], idx[3]
            if origin == "pk" or not unique:
                continue
            icols = [r[2] for r in con.execute(f"PRAGMA index_info({idx_name})")]
            target = f"({', '.join(icols)})" if len(icols) > 1 else icols[0]
            index_lines.append(f"    {target} [unique]")
        if index_lines:
            lines += ["", "  indexes {", *index_lines, "  }"]

        checks = checks_from_sql(create_sql)
        if checks:
            joined = " · ".join(f"CHECK ({c.strip()})" for c in checks)
            lines += ["", f"  Note: '{joined.replace(chr(39), chr(92) + chr(39))}'"]
        lines.append("}")
        blocks.append("\n".join(lines))

        for fk in con.execute(f"PRAGMA foreign_key_list({name})").fetchall():
            ref_table, col, ref_col = fk[2], fk[3], fk[4]
            refs.append(f"Ref: {name}.{col} > {ref_table}.{ref_col}")

    if refs:
        blocks.append("\n".join(refs))
    OUT.write_text("\n\n".join(blocks) + "\n")
    print(f"wrote {OUT.name} ({len(tables)} tables)")
    con.close()


if __name__ == "__main__":
    main()

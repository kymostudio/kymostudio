# ratex-katex-fonts

Embeds the KaTeX `.ttf` files used by RaTeX for optional `embed-fonts` builds (`ratex-svg`, `ratex-render`, `ratex-pdf`). Font files ship inside this crate so crates.io releases compile without a monorepo `fonts/` directory.

The `fonts/` directory also contains `OFL.txt` (SIL Open Font License 1.1 full text) and `FONT_NOTICE.txt` (KaTeX provenance) for redistribution audits.

## License

This crate is MIT (same as RaTeX). The bundled KaTeX fonts are licensed under the [SIL Open Font License](https://scripts.sil.org/OFL); see `fonts/OFL.txt` and the [KaTeX repository](https://github.com/KaTeX/KaTeX).

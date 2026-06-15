//! KaTeX TrueType fonts embedded at compile time for `kymo-svg` / `kymo-render`
//! `embed-fonts` features. Files live under this crate's `fonts/` so `cargo publish`
//! tarballs stay self-contained.

use std::borrow::Cow;

#[derive(rust_embed::Embed)]
#[folder = "fonts/"]
struct KaTeXFonts;

/// Returns embedded font bytes for a KaTeX TTF filename (e.g. `KaTeX_Main-Regular.ttf`).
pub fn ttf_bytes(filename: &str) -> Option<Cow<'static, [u8]>> {
    KaTeXFonts::get(filename).map(|f| f.data)
}

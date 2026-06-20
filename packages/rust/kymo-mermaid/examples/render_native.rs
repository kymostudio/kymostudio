//! Render a `.mmd` to kymo's raster-safe SVG via the library's type dispatcher
//! (`mermaid_to_svg_auto`) — the same path the `kymo` CLI uses. Prints the SVG.
//! `cargo run --example render_native -- <file.mmd>`.
use kymo_mermaid as km;

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: render_native <file.mmd>");
    let src = std::fs::read_to_string(&path).expect("read");
    eprintln!("[{}] {path}", km::diagram_kind(&src));
    match km::mermaid_to_svg_auto(&src) {
        Ok(svg) => println!("{svg}"),
        Err(e) => {
            eprintln!("ERROR: {e:?}");
            std::process::exit(1);
        }
    }
}

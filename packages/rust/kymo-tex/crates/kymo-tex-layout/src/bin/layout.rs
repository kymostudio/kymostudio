use kymo_tex_layout::{layout, to_display_list, LayoutOptions};
use kymo_tex_parser::parser::parse;
use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let mut out = io::stdout().lock();

    for line in stdin.lock().lines().map_while(Result::ok) {
        let expr = line.trim().to_string();
        if expr.is_empty() {
            continue;
        }

        match parse(&expr) {
            Ok(ast) => {
                let options = LayoutOptions::default();
                let lbox = layout(&ast, &options);
                let display_list = to_display_list(&lbox);

                let result = serde_json::json!({
                    "input": expr,
                    "box": {
                        "width": round5(lbox.width),
                        "height": round5(lbox.height),
                        "depth": round5(lbox.depth),
                    },
                    "displayList": {
                        "width": round5(display_list.width),
                        "height": round5(display_list.height),
                        "depth": round5(display_list.depth),
                        "itemCount": display_list.items.len(),
                    }
                });
                writeln!(out, "{}", result).expect("write");
            }
            Err(e) => {
                let err = serde_json::json!({
                    "error": true,
                    "message": e.to_string(),
                    "input": expr,
                });
                writeln!(out, "{}", err).expect("write");
            }
        }
    }
}

fn round5(v: f64) -> f64 {
    (v * 100000.0).round() / 100000.0
}

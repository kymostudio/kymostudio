//! Throwaway gauge: dispatch a `.mmd` to kymo's NATIVE renderer by diagram type
//! and print the SVG. `cargo run --example render_native -- <file.mmd>`.
use kymo_mermaid as km;

fn kind(src: &str) -> &'static str {
    for line in src.lines() {
        let l = line.trim();
        if l.is_empty() || l.starts_with("%%") {
            continue;
        }
        let w = l.split_whitespace().next().unwrap_or("");
        return match w {
            "sequenceDiagram" => "sequence",
            "classDiagram" | "classDiagram-v2" => "class",
            "stateDiagram" | "stateDiagram-v2" => "state",
            "erDiagram" => "er",
            "block" | "block-beta" => "block",
            "mindmap" => "mindmap",
            "kanban" => "kanban",
            "requirementDiagram" => "requirement",
            "flowchart" | "graph" => "flowchart",
            _ => "flowchart",
        };
    }
    "flowchart"
}

fn main() {
    let path = std::env::args().nth(1).expect("usage: render_native <file.mmd>");
    let src = std::fs::read_to_string(&path).expect("read");
    let k = kind(&src);
    let out = match k {
        "sequence" => km::mermaid_to_sequence_svg(&src),
        "class" => km::mermaid_class_to_svg(&src),
        "state" => km::mermaid_state_to_svg(&src),
        "er" => km::mermaid_er_to_svg(&src),
        "block" => km::mermaid_block_to_svg(&src),
        "mindmap" => km::mermaid_mindmap_to_svg(&src),
        "kanban" => km::mermaid_kanban_to_svg(&src),
        "requirement" => km::mermaid_requirement_to_svg(&src),
        _ => km::mermaid_to_svg(&src),
    };
    eprintln!("[{k}] {path}");
    match out {
        Ok(svg) => println!("{svg}"),
        Err(e) => {
            eprintln!("ERROR: {e:?}");
            std::process::exit(1);
        }
    }
}

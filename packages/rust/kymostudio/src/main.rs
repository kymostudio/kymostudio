//! `kymo` CLI — render an SVG to PNG/PDF, or import a Mermaid flowchart.
//!
//!     kymo -i in.svg out.png
//!     kymo -i in.svg -o out.png --scale 2
//!     kymo in.svg out.pdf
//!     kymo flow.mmd                 # -> flow.kymo.json (Mermaid import)
//!     kymo flow.mmd flow.d2         # -> D2     (convert via the flowchart IR)
//!     kymo flow.mmd flow.dot        # -> Graphviz DOT
//!     kymo flow.mmd norm.mmd        # -> Mermaid (round-trip / normalize)
//!     kymo seq.mmd  seq.xmi         # -> XMI 2.5.1 (UML sequenceDiagram)
//!
//! Pure Rust (resvg/svg2pdf via kymostudio-core) — no browser, no system image
//! libraries. The operation is chosen by the INPUT extension: `.mmd`/`.mermaid`
//! parse a Mermaid diagram, then the OUTPUT extension picks the target —
//! `.kymo.json` (default interchange), `.d2`, `.dot`/`.gv`, `.mmd` (round-trip),
//! or for a `sequenceDiagram` source `.xmi` (OMG XMI 2.5.1 model), `.mdj`
//! (StarUML native — model + laid-out diagram), or `.gaphor` (Gaphor native).
//! Any other input is treated as SVG and the OUTPUT extension picks PNG (default)
//! or PDF. Rust does not render `.kymo.json` to SVG — feed it to the Python/JS renderer.

use std::path::PathBuf;
use std::process::ExitCode;

const VERSION: &str = env!("CARGO_PKG_VERSION");

const HELP: &str = "\
kymo — render SVG to PNG/PDF, or import a Mermaid flowchart (pure Rust, no browser)

USAGE:
    kymo <input> [output] [options]

ARGS:
    <input>                 Input file (positional, or use -i). A `.mmd`/`.mermaid`
                            input is parsed as a Mermaid flowchart; anything else
                            is treated as SVG.
    <output>                Output path (positional). For SVG input: `.pdf` emits a
                            vector PDF, otherwise PNG. For Mermaid input: a
                            `.kymo.json` interchange file. Defaults to the input
                            path with the matching extension.

OPTIONS:
    -i, --input  <FILE>    Input file
    -o, --output <FILE>    Output file (alternative to the positional arg)
    -s, --scale  <N>       Scale factor for PNG, 1.0 = intrinsic size (default:
                           1). Ignored for PDF and Mermaid import.
    -h, --help             Print this help
    -V, --version          Print version

EXAMPLES:
    kymo in.svg out.png
    kymo diagram.svg                    # -> diagram.png
    kymo diagram.svg -s 2 hi.png        # 2x resolution
    kymo diagram.svg out.pdf            # vector PDF
    kymo flow.mmd                       # -> flow.kymo.json (Mermaid import)
    kymo flow.mmd flow.d2               # -> D2 (convert via the flowchart IR)
    kymo flow.mmd flow.dot              # -> Graphviz DOT
    kymo flow.mmd norm.mmd              # -> Mermaid (round-trip / normalize)
    kymo seq.mmd  seq.xmi               # -> XMI 2.5.1 (UML sequenceDiagram)
    kymo seq.mmd  seq.mdj               # -> StarUML .mdj (sequence diagram + layout)
    kymo seq.mmd  seq.gaphor            # -> Gaphor .gaphor (sequence diagram + layout)
";

struct Args {
    input: PathBuf,
    output: PathBuf,
    scale: f32,
}

enum Parsed {
    Run(Args),
    Help,
    Version,
}

fn parse(argv: &[String]) -> Result<Parsed, String> {
    let mut input: Option<PathBuf> = None;
    let mut output: Option<PathBuf> = None;
    let mut scale: f32 = 1.0;
    let mut positionals: Vec<String> = Vec::new();

    let mut it = argv.iter();
    while let Some(arg) = it.next() {
        match arg.as_str() {
            "-h" | "--help" => return Ok(Parsed::Help),
            "-V" | "--version" => return Ok(Parsed::Version),
            "-i" | "--input" => {
                let v = it.next().ok_or("missing value for --input")?;
                input = Some(PathBuf::from(v));
            }
            "-o" | "--output" => {
                let v = it.next().ok_or("missing value for --output")?;
                output = Some(PathBuf::from(v));
            }
            "-s" | "--scale" => {
                let v = it.next().ok_or("missing value for --scale")?;
                scale = v.parse().map_err(|_| format!("invalid scale: {v}"))?;
                if !scale.is_finite() || scale <= 0.0 {
                    return Err(format!("scale must be positive, got {v}"));
                }
            }
            s if s.starts_with('-') && s.len() > 1 => {
                return Err(format!("unknown option: {s}"));
            }
            _ => positionals.push(arg.clone()),
        }
    }

    // Allow input as a bare positional too: `kymo in.svg out.png`.
    if input.is_none() && !positionals.is_empty() {
        input = Some(PathBuf::from(positionals.remove(0)));
    }
    if output.is_none() && !positionals.is_empty() {
        output = Some(PathBuf::from(positionals.remove(0)));
    }
    if let Some(extra) = positionals.first() {
        return Err(format!("unexpected argument: {extra}"));
    }

    let input = input.ok_or("missing required input (use -i <file>)")?;
    let default_ext = if is_mermaid(&input) {
        "kymo.json"
    } else {
        "png"
    };
    let output = output.unwrap_or_else(|| input.with_extension(default_ext));
    Ok(Parsed::Run(Args {
        input,
        output,
        scale,
    }))
}

fn has_ext(path: &std::path::Path, ext: &str) -> bool {
    path.extension()
        .is_some_and(|e| e.eq_ignore_ascii_case(ext))
}

fn is_mermaid(path: &std::path::Path) -> bool {
    has_ext(path, "mmd") || has_ext(path, "mermaid")
}

fn run(args: Args) -> Result<(), String> {
    // Mermaid input: import to `.kymo.json`, or convert to another flowchart DSL.
    // The OUTPUT extension picks the target: `.d2` / `.dot`|`.gv` / `.mmd`|`.mermaid`
    // (round-trip) / else `.kymo.json`.
    if is_mermaid(&args.input) {
        if has_ext(&args.output, "svg")
            || has_ext(&args.output, "png")
            || has_ext(&args.output, "pdf")
        {
            return Err(format!(
                "cannot render Mermaid to {} — Rust imports/converts only \
                 (.kymo.json | .d2 | .dot | .mmd); render to SVG/PNG/PDF with the \
                 Python or JS kymo CLI",
                args.output.display()
            ));
        }
        let src = std::fs::read_to_string(&args.input)
            .map_err(|e| format!("cannot read {}: {e}", args.input.display()))?;
        let (out, kind) = if has_ext(&args.output, "d2") {
            (kymostudio_core::mermaid_to_d2(&src), "d2")
        } else if has_ext(&args.output, "dot") || has_ext(&args.output, "gv") {
            (kymostudio_core::mermaid_to_dot(&src), "dot")
        } else if has_ext(&args.output, "mmd") || has_ext(&args.output, "mermaid") {
            (kymostudio_core::mermaid_to_mermaid(&src), "mermaid")
        } else if has_ext(&args.output, "xmi") {
            (kymostudio_core::mermaid_to_xmi(&src), "xmi")
        } else if has_ext(&args.output, "mdj") {
            (kymostudio_core::mermaid_to_mdj(&src), "mdj")
        } else if has_ext(&args.output, "gaphor") {
            (kymostudio_core::mermaid_to_gaphor(&src), "gaphor")
        } else {
            (kymostudio_core::mermaid_to_kymojson(&src), "kymo.json")
        };
        let out = out.map_err(|e| e.to_string())?;
        std::fs::write(&args.output, &out)
            .map_err(|e| format!("cannot write {}: {e}", args.output.display()))?;
        eprintln!(
            "{} -> {} ({kind}, {} bytes)",
            args.input.display(),
            args.output.display(),
            out.len()
        );
        return Ok(());
    }

    let svg = std::fs::read(&args.input)
        .map_err(|e| format!("cannot read {}: {e}", args.input.display()))?;
    let is_pdf = has_ext(&args.output, "pdf");
    let (bytes, kind) = if is_pdf {
        (
            kymostudio_core::svg_to_pdf(&svg).map_err(|e| e.to_string())?,
            "pdf",
        )
    } else {
        (
            kymostudio_core::svg_to_png(&svg, args.scale).map_err(|e| e.to_string())?,
            "png",
        )
    };
    std::fs::write(&args.output, &bytes)
        .map_err(|e| format!("cannot write {}: {e}", args.output.display()))?;
    eprintln!(
        "{} -> {} ({kind}, {} bytes)",
        args.input.display(),
        args.output.display(),
        bytes.len()
    );
    Ok(())
}

fn main() -> ExitCode {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    match parse(&argv) {
        Ok(Parsed::Help) => {
            print!("{HELP}");
            ExitCode::SUCCESS
        }
        Ok(Parsed::Version) => {
            println!("kymo {VERSION}");
            ExitCode::SUCCESS
        }
        Ok(Parsed::Run(args)) => match run(args) {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("kymo: {e}");
                ExitCode::FAILURE
            }
        },
        Err(e) => {
            eprintln!("kymo: {e}\n\nTry 'kymo --help'.");
            ExitCode::FAILURE
        }
    }
}

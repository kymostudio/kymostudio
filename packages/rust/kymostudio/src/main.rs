//! `kymo` CLI — convert an SVG to PNG (raster) or PDF (vector).
//!
//!     kymo -i in.svg out.png
//!     kymo -i in.svg -o out.png --scale 2
//!     kymo in.svg out.pdf
//!
//! Pure Rust (resvg/svg2pdf via kymostudio-core) — no browser, no system image
//! libraries. The output format is chosen by the output path's extension
//! (`.pdf` → vector PDF, otherwise PNG).

use std::path::PathBuf;
use std::process::ExitCode;

const VERSION: &str = env!("CARGO_PKG_VERSION");

const HELP: &str = "\
kymo — convert an SVG to PNG (raster) or PDF (vector) (pure Rust, no browser)

USAGE:
    kymo <input.svg> [output.png|output.pdf] [options]

ARGS:
    <input.svg>             Input SVG file (positional, or use -i).
    <output>                Output path (positional). A `.pdf` extension emits a
                            vector PDF; anything else emits PNG. Defaults to the
                            input path with its extension swapped to .png.

OPTIONS:
    -i, --input  <FILE>    Input SVG file
    -o, --output <FILE>    Output file (alternative to the positional arg)
    -s, --scale  <N>       Scale factor for PNG, 1.0 = intrinsic size (default:
                           1). Ignored for PDF (vector, resolution-independent).
    -h, --help             Print this help
    -V, --version          Print version

EXAMPLES:
    kymo in.svg out.png
    kymo diagram.svg                    # -> diagram.png
    kymo diagram.svg -s 2 hi.png        # 2x resolution
    kymo diagram.svg out.pdf            # vector PDF
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

    let input = input.ok_or("missing required input (use -i <file.svg>)")?;
    let output = output.unwrap_or_else(|| input.with_extension("png"));
    Ok(Parsed::Run(Args {
        input,
        output,
        scale,
    }))
}

fn run(args: Args) -> Result<(), String> {
    let svg = std::fs::read(&args.input)
        .map_err(|e| format!("cannot read {}: {e}", args.input.display()))?;
    let is_pdf = args
        .output
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("pdf"));
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

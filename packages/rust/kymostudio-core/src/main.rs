//! `kymo` CLI — rasterize an SVG to PNG.
//!
//!     kymo -i in.svg out.png
//!     kymo -i in.svg -o out.png --scale 2
//!
//! Pure Rust (resvg) — no browser, no system image libraries.

use std::path::PathBuf;
use std::process::ExitCode;

const VERSION: &str = env!("CARGO_PKG_VERSION");

const HELP: &str = "\
kymo — rasterize an SVG to PNG (pure Rust, no browser)

USAGE:
    kymo -i <input.svg> [output.png] [options]

ARGS:
    <output.png>            Output path (positional). Defaults to the input
                            path with its extension swapped to .png.

OPTIONS:
    -i, --input  <FILE>    Input SVG file (required)
    -o, --output <FILE>    Output PNG file (alternative to the positional arg)
    -s, --scale  <N>       Scale factor, 1.0 = intrinsic size (default: 1)
    -h, --help             Print this help
    -V, --version          Print version

EXAMPLES:
    kymo -i in.svg out.png
    kymo -i diagram.svg                 # -> diagram.png
    kymo -i diagram.svg -s 2 hi.png     # 2x resolution
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
    let png = kymostudio_core::svg_to_png(&svg, args.scale).map_err(|e| e.to_string())?;
    std::fs::write(&args.output, &png)
        .map_err(|e| format!("cannot write {}: {e}", args.output.display()))?;
    eprintln!(
        "{} -> {} ({} bytes)",
        args.input.display(),
        args.output.display(),
        png.len()
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

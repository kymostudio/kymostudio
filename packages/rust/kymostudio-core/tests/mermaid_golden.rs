//! Golden tests for the Mermaid → kymojson importer.
//!
//! Each `tests/fixtures/mermaid/<name>.mmd` is parsed + laid out + serialized
//! and compared byte-for-byte against `golden/<name>.kymo.json`. The goldens are
//! Rust-authored (there is no Python Mermaid front-end yet to cross-check), so
//! regenerate them deliberately after an intentional change:
//!
//!     KYMO_UPDATE_MERMAID_GOLDEN=1 cargo test --test mermaid_golden
//!
//! and review the diff. A fixed sweep count + stable sort keys make the layout
//! deterministic, so a clean run must be byte-stable (also asserted below).

use std::fs;
use std::path::PathBuf;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/mermaid")
}

fn cases() -> Vec<(String, PathBuf)> {
    let dir = fixtures_dir();
    let mut out = Vec::new();
    for entry in fs::read_dir(&dir).expect("read fixtures dir") {
        let path = entry.unwrap().path();
        if path.extension().and_then(|e| e.to_str()) == Some("mmd") {
            let name = path.file_stem().unwrap().to_string_lossy().to_string();
            out.push((name, path));
        }
    }
    out.sort();
    out
}

#[test]
fn mermaid_fixtures_match_golden() {
    let update = std::env::var_os("KYMO_UPDATE_MERMAID_GOLDEN").is_some();
    let golden_dir = fixtures_dir().join("golden");
    let mut failures = Vec::new();

    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let got = kymostudio_core::mermaid_to_kymojson(&src)
            .unwrap_or_else(|e| panic!("{name}: import failed: {e}"));
        let golden_path = golden_dir.join(format!("{name}.kymo.json"));

        if update {
            fs::write(&golden_path, &got).unwrap();
            continue;
        }
        let want = fs::read_to_string(&golden_path).unwrap_or_else(|_| {
            panic!("{name}: missing golden {golden_path:?} (run with KYMO_UPDATE_MERMAID_GOLDEN=1)")
        });
        if got != want {
            failures.push(name);
        }
    }

    assert!(
        failures.is_empty(),
        "golden mismatch for: {failures:?} — re-run with KYMO_UPDATE_MERMAID_GOLDEN=1 to update"
    );
}

#[test]
fn layout_is_deterministic() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let a = kymostudio_core::mermaid_to_kymojson(&src).unwrap();
        let b = kymostudio_core::mermaid_to_kymojson(&src).unwrap();
        assert_eq!(a, b, "{name}: non-deterministic output across two runs");
    }
}

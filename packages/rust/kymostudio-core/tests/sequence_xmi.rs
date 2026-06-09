//! Golden + determinism tests for the Mermaid `sequenceDiagram` → XMI 2.5.1
//! emitter.
//!
//! Each `tests/fixtures/sequence/<name>.mmd` is converted via
//! [`kymostudio_core::mermaid_to_xmi`] and compared byte-for-byte against
//! `golden/<name>.xmi`. Regenerate deliberately:
//!
//!     KYMO_UPDATE_SEQUENCE_GOLDEN=1 cargo test --test sequence_xmi
//!
//! Plus a determinism check and structural sanity assertions (well-formed
//! root, every emitted file is a UML Interaction).

use std::fs;
use std::path::PathBuf;

use kymostudio_core::mermaid_to_xmi;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/sequence")
}

fn cases() -> Vec<(String, PathBuf)> {
    let mut out = Vec::new();
    for entry in fs::read_dir(fixtures_dir()).expect("read fixtures dir") {
        let path = entry.unwrap().path();
        if path.extension().and_then(|e| e.to_str()) == Some("mmd") {
            out.push((
                path.file_stem().unwrap().to_string_lossy().to_string(),
                path,
            ));
        }
    }
    out.sort();
    out
}

#[test]
fn xmi_fixtures_match_golden() {
    let update = std::env::var_os("KYMO_UPDATE_SEQUENCE_GOLDEN").is_some();
    let golden_dir = fixtures_dir().join("golden");
    if update {
        fs::create_dir_all(&golden_dir).unwrap();
    }
    let mut failures = Vec::new();

    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let got = mermaid_to_xmi(&src).unwrap();
        let golden = golden_dir.join(format!("{name}.xmi"));
        if update {
            fs::write(&golden, &got).unwrap();
            continue;
        }
        let want = fs::read_to_string(&golden).unwrap_or_else(|_| {
            panic!("missing golden {golden:?} (run with KYMO_UPDATE_SEQUENCE_GOLDEN=1)")
        });
        if got != want {
            failures.push(format!("{name}.xmi"));
        }
    }
    assert!(
        failures.is_empty(),
        "sequence XMI golden mismatch for: {failures:?} — re-run with KYMO_UPDATE_SEQUENCE_GOLDEN=1"
    );
}

#[test]
fn xmi_is_deterministic_and_well_formed() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let a = mermaid_to_xmi(&src).unwrap();
        let b = mermaid_to_xmi(&src).unwrap();
        assert_eq!(a, b, "{name}: non-deterministic XMI");

        assert!(a.starts_with("<?xml"), "{name}: missing XML prolog");
        assert!(a.contains("xmi:version=\"2.5.1\""), "{name}: not XMI 2.5.1");
        assert!(
            a.contains("<packagedElement xmi:type=\"uml:Interaction\""),
            "{name}: missing UML Interaction"
        );
        assert!(
            a.trim_end().ends_with("</xmi:XMI>"),
            "{name}: unterminated root"
        );
        // Tags are balanced for the container elements we open.
        assert_eq!(
            a.matches("<uml:Model").count(),
            a.matches("</uml:Model>").count(),
            "{name}: unbalanced uml:Model"
        );
    }
}

/// A flowchart source must be rejected — XMI is sequence-only.
#[test]
fn flowchart_source_is_rejected() {
    let err = mermaid_to_xmi("flowchart TD\nA-->B").unwrap_err();
    assert!(err.to_string().contains("flowchart"));
}

//! Golden + structural tests for the Mermaid `sequenceDiagram` → Gaphor
//! `.gaphor` emitter.
//!
//! Each `tests/fixtures/sequence/<name>.mmd` is converted via
//! [`kymostudio_core::mermaid_to_gaphor`] and compared byte-for-byte against
//! `gaphor_golden/<name>.gaphor`. Regenerate deliberately:
//!
//!     KYMO_UPDATE_SEQUENCE_GAPHOR_GOLDEN=1 cargo test --test sequence_gaphor
//!
//! Plus determinism + the load-bearing invariant for Gaphor: the XML is
//! well-formed and EVERY `<ref refid="…">` resolves to an element `id="…"` (a
//! dangling ref makes Gaphor's loader fail).

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use kymostudio_core::mermaid_to_gaphor;

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
fn gaphor_fixtures_match_golden() {
    let update = std::env::var_os("KYMO_UPDATE_SEQUENCE_GAPHOR_GOLDEN").is_some();
    let golden_dir = fixtures_dir().join("gaphor_golden");
    if update {
        fs::create_dir_all(&golden_dir).unwrap();
    }
    let mut failures = Vec::new();

    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let got = mermaid_to_gaphor(&src).unwrap();
        let golden = golden_dir.join(format!("{name}.gaphor"));
        if update {
            fs::write(&golden, &got).unwrap();
            continue;
        }
        let want = fs::read_to_string(&golden).unwrap_or_else(|_| {
            panic!("missing golden {golden:?} (run with KYMO_UPDATE_SEQUENCE_GAPHOR_GOLDEN=1)")
        });
        if got != want {
            failures.push(format!("{name}.gaphor"));
        }
    }
    assert!(
        failures.is_empty(),
        "sequence .gaphor golden mismatch for: {failures:?} — re-run with KYMO_UPDATE_SEQUENCE_GAPHOR_GOLDEN=1"
    );
}

#[test]
fn gaphor_is_well_formed_with_resolvable_refs() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let out = mermaid_to_gaphor(&src).unwrap();
        assert_eq!(
            out,
            mermaid_to_gaphor(&src).unwrap(),
            "{name}: non-deterministic"
        );

        let doc = roxmltree::Document::parse(&out)
            .unwrap_or_else(|e| panic!("{name}: not well-formed XML: {e}"));
        assert_eq!(
            doc.root_element().tag_name().name(),
            "gaphor",
            "{name}: root not <gaphor>"
        );

        let mut ids = HashSet::new();
        let mut refs = Vec::new();
        for node in doc.descendants() {
            if let Some(id) = node.attribute("id") {
                ids.insert(id.to_string());
            }
            if node.tag_name().name() == "ref" {
                if let Some(refid) = node.attribute("refid") {
                    refs.push(refid.to_string());
                }
            }
        }
        let dangling: Vec<&String> = refs.iter().filter(|r| !ids.contains(*r)).collect();
        assert!(
            dangling.is_empty(),
            "{name}: {} dangling <ref refid> (Gaphor would fail to load): {:?}",
            dangling.len(),
            &dangling[..dangling.len().min(5)]
        );

        for tag in [
            "Lifeline",
            "Message",
            "LifelineItem",
            "MessageItem",
            "Diagram",
        ] {
            assert!(
                out.contains(&format!("<{tag} ")) || out.contains(&format!("<{tag}>")),
                "{name}: missing <{tag}>"
            );
        }
    }
}

//! Golden + round-trip tests for the flowchart-IR text emitters.
//!
//! Each `tests/fixtures/mermaid/<name>.mmd` is parsed to the IR and emitted to
//! Mermaid / D2 / DOT, compared byte-for-byte against
//! `convert_golden/<name>.{mmd,d2,dot}`. Regenerate deliberately:
//!
//!     KYMO_UPDATE_CONVERT_GOLDEN=1 cargo test --test mermaid_convert
//!
//! Plus a structural round-trip (`mmd → IR → mmd → IR` preserves the graph) and a
//! determinism check (two emits are byte-identical).

use std::fs;
use std::path::PathBuf;

use kymostudio_core::{
    flowchart, mermaid, mermaid_to_d2, mermaid_to_dot, mermaid_to_drawio, mermaid_to_mermaid,
};

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/mermaid")
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
fn convert_fixtures_match_golden() {
    let update = std::env::var_os("KYMO_UPDATE_CONVERT_GOLDEN").is_some();
    let golden_dir = fixtures_dir().join("convert_golden");
    if update {
        fs::create_dir_all(&golden_dir).unwrap();
    }
    let mut failures = Vec::new();

    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        for (ext, got) in [
            ("mmd", mermaid_to_mermaid(&src).unwrap()),
            ("d2", mermaid_to_d2(&src).unwrap()),
            ("dot", mermaid_to_dot(&src).unwrap()),
            ("drawio", mermaid_to_drawio(&src).unwrap()),
        ] {
            let golden = golden_dir.join(format!("{name}.{ext}"));
            if update {
                fs::write(&golden, &got).unwrap();
                continue;
            }
            let want = fs::read_to_string(&golden).unwrap_or_else(|_| {
                panic!("missing golden {golden:?} (run with KYMO_UPDATE_CONVERT_GOLDEN=1)")
            });
            if got != want {
                failures.push(format!("{name}.{ext}"));
            }
        }
    }
    assert!(
        failures.is_empty(),
        "convert golden mismatch for: {failures:?} — re-run with KYMO_UPDATE_CONVERT_GOLDEN=1"
    );
}

/// `mmd → IR → mmd → IR` preserves the graph (ids, labels, shapes, edges,
/// subgraph membership) — the emitter is a faithful inverse of the importer.
#[test]
fn mermaid_round_trip_is_structural_fixpoint() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let a = mermaid::parse(&src).unwrap();
        let b = mermaid::parse(&mermaid_to_mermaid(&src).unwrap()).unwrap();

        assert_eq!(a.direction, b.direction, "{name}: direction");
        let ids = |fc: &flowchart::Flowchart| {
            fc.nodes
                .iter()
                .map(|n| (n.id.clone(), n.label.clone(), n.shape))
                .collect::<Vec<_>>()
        };
        assert_eq!(ids(&a), ids(&b), "{name}: nodes");
        let edges = |fc: &flowchart::Flowchart| {
            fc.edges
                .iter()
                .map(|e| {
                    (
                        e.src.clone(),
                        e.dst.clone(),
                        e.label.clone(),
                        e.dashed,
                        e.no_arrow,
                    )
                })
                .collect::<Vec<_>>()
        };
        assert_eq!(edges(&a), edges(&b), "{name}: edges");
        let subs = |fc: &flowchart::Flowchart| {
            fc.subgraphs
                .iter()
                .map(|s| (s.id.clone(), s.title.clone(), s.members.clone()))
                .collect::<Vec<_>>()
        };
        assert_eq!(subs(&a), subs(&b), "{name}: subgraphs");
    }
}

#[test]
fn emitters_are_deterministic() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        for f in [
            mermaid_to_mermaid,
            mermaid_to_d2,
            mermaid_to_dot,
            mermaid_to_drawio,
        ] {
            assert_eq!(
                f(&src).unwrap(),
                f(&src).unwrap(),
                "{name}: non-deterministic emit"
            );
        }
    }
}

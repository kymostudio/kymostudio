//! Golden + structural tests for the Mermaid `sequenceDiagram` → StarUML
//! `.mdj` emitter.
//!
//! Each `tests/fixtures/sequence/<name>.mmd` is converted via
//! [`kymostudio_core::mermaid_to_mdj`] and compared byte-for-byte against
//! `golden/<name>.mdj`. Regenerate deliberately:
//!
//!     KYMO_UPDATE_SEQUENCE_MDJ_GOLDEN=1 cargo test --test sequence_mdj
//!
//! Plus determinism + the load-bearing structural invariant for StarUML: the
//! JSON parses, the root is a `Project`, and EVERY `{"$ref": id}` resolves to a
//! real `_id` (a dangling ref makes StarUML fail to open the file).

use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use kymostudio_core::mermaid_to_mdj;
use serde_json::Value;

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

/// Collect every `_id` and every `{"$ref": …}` target in the document.
fn ids_and_refs(v: &Value, ids: &mut HashSet<String>, refs: &mut Vec<String>) {
    match v {
        Value::Object(map) => {
            if let Some(Value::String(id)) = map.get("_id") {
                ids.insert(id.clone());
            }
            if map.len() == 1 {
                if let Some(Value::String(target)) = map.get("$ref") {
                    refs.push(target.clone());
                    return;
                }
            }
            for child in map.values() {
                ids_and_refs(child, ids, refs);
            }
        }
        Value::Array(items) => items.iter().for_each(|c| ids_and_refs(c, ids, refs)),
        _ => {}
    }
}

#[test]
fn mdj_fixtures_match_golden() {
    let update = std::env::var_os("KYMO_UPDATE_SEQUENCE_MDJ_GOLDEN").is_some();
    let golden_dir = fixtures_dir().join("golden");
    if update {
        fs::create_dir_all(&golden_dir).unwrap();
    }
    let mut failures = Vec::new();

    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let got = mermaid_to_mdj(&src).unwrap();
        let golden = golden_dir.join(format!("{name}.mdj"));
        if update {
            fs::write(&golden, &got).unwrap();
            continue;
        }
        let want = fs::read_to_string(&golden).unwrap_or_else(|_| {
            panic!("missing golden {golden:?} (run with KYMO_UPDATE_SEQUENCE_MDJ_GOLDEN=1)")
        });
        if got != want {
            failures.push(format!("{name}.mdj"));
        }
    }
    assert!(
        failures.is_empty(),
        "sequence .mdj golden mismatch for: {failures:?} — re-run with KYMO_UPDATE_SEQUENCE_MDJ_GOLDEN=1"
    );
}

#[test]
fn mdj_is_valid_json_with_resolvable_refs() {
    for (name, path) in cases() {
        let src = fs::read_to_string(&path).unwrap();
        let out = mermaid_to_mdj(&src).unwrap();
        assert_eq!(
            out,
            mermaid_to_mdj(&src).unwrap(),
            "{name}: non-deterministic"
        );

        let doc: Value =
            serde_json::from_str(&out).unwrap_or_else(|e| panic!("{name}: bad JSON: {e}"));
        assert_eq!(doc["_type"], "Project", "{name}: root is not a Project");

        let mut ids = HashSet::new();
        let mut refs = Vec::new();
        ids_and_refs(&doc, &mut ids, &mut refs);
        let dangling: Vec<&String> = refs.iter().filter(|r| !ids.contains(*r)).collect();
        assert!(
            dangling.is_empty(),
            "{name}: {} dangling $ref(s) (StarUML would fail to open): {:?}",
            dangling.len(),
            &dangling[..dangling.len().min(5)]
        );

        // The diagram + its key view types are present.
        for t in [
            "UMLSequenceDiagram",
            "UMLSeqLifelineView",
            "UMLSeqMessageView",
            "UMLLinePartView",
        ] {
            assert!(out.contains(t), "{name}: missing {t}");
        }
    }
}

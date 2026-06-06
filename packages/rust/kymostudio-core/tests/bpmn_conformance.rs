//! BPMN conformance — Rust asserts against the same committed goldens the Python
//! and JS suites use (`conformance/golden/*.json`), mirroring `tests/_conformance.py`.
//!
//! Python remains the reference impl and sole golden writer; this test is a
//! read-only validator (like the JS suite). Run with `cargo test --features bpmn`.
#![cfg(feature = "bpmn")]

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use kymostudio_core::bpmn::{self, export, layout, model_json, render, Diagram};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

/// Repo root = three levels up from this crate (`packages/rust/kymostudio-core`).
fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .canonicalize()
        .unwrap()
}

/// `.bpmn` import corpus: repo `samples/`, the minimal `tests/fixtures/bpmn/`, and
/// the vendored MIWG `tests/corpus_bpmn/`, de-duplicated by stem, sorted by stem.
/// Mirrors `_conformance.bpmn_corpus_files`.
fn bpmn_corpus(root: &Path) -> BTreeMap<String, PathBuf> {
    let py_tests = root.join("packages/python/tests");
    let dirs = [
        root.join("samples"),
        py_tests.join("fixtures/bpmn"),
        py_tests.join("corpus_bpmn"),
    ];
    let mut by_stem: BTreeMap<String, PathBuf> = BTreeMap::new();
    for dir in dirs {
        if !dir.is_dir() {
            continue;
        }
        let mut entries: Vec<PathBuf> = fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.extension().is_some_and(|x| x == "bpmn"))
            .collect();
        entries.sort();
        for path in entries {
            let stem = path.file_stem().unwrap().to_string_lossy().into_owned();
            by_stem.insert(stem, path);
        }
    }
    by_stem
}

/// Decode as UTF-8 with invalid bytes replaced — matches Python's
/// `read_text(encoding="utf-8", errors="replace")` and Node's `readFileSync(…, "utf8")`.
fn read_lossy(path: &Path) -> String {
    String::from_utf8_lossy(&fs::read(path).unwrap()).into_owned()
}

fn load_json(path: &Path) -> Value {
    serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap()
}

/// Canonical model of a `.bpmn` import; an importer that fails is recorded as
/// `{"status":"error"}` (no language-specific message). Mirrors `import_model`.
fn import_model(xml: &str) -> Value {
    match bpmn::import(xml) {
        Ok(diagram) => model_json(&diagram),
        Err(_) => serde_json::json!({ "status": "error" }),
    }
}

// ── BPMN export digest (model → .bpmn → re-import) — mirrors `_conformance._digest` ──
fn points_value(pts: &Option<Vec<(i64, i64)>>) -> Value {
    match pts {
        None => Value::Null,
        Some(p) => Value::Array(p.iter().map(|&(a, b)| json!([a, b])).collect()),
    }
}

fn opt_pair(p: Option<(i64, i64)>) -> Value {
    p.map_or(Value::Null, |(a, b)| json!([a, b]))
}

/// Sorted, BPMN-relevant subset of a (re-imported) diagram. Sorted by id (edges by
/// a `\0`-joined key) so re-import order never matters. Mirrors `_digest`.
fn digest(d: &Diagram) -> Value {
    let mut comps: Vec<(&str, Value)> = d
        .components
        .iter()
        .map(|c| {
            (
                c.id.as_str(),
                json!({
                    "id": c.id, "shape": c.shape, "icon": c.icon,
                    "size": opt_pair(c.size), "pos": [c.pos.0, c.pos.1],
                }),
            )
        })
        .collect();
    comps.sort_by(|a, b| a.0.cmp(b.0));

    let mut regs: Vec<(&str, Value)> = d
        .regions
        .iter()
        .map(|r| {
            let (x, y, w, h) = r.bounds;
            (
                r.id.as_str(),
                json!({ "id": r.id, "style": r.style, "label": r.label, "bounds": [x, y, w, h] }),
            )
        })
        .collect();
    regs.sort_by(|a, b| a.0.cmp(b.0));

    let mut edges: Vec<(String, Value)> = d
        .edges
        .iter()
        .map(|e| {
            let pts = points_value(&e.points);
            let flow = e.bpmn_flow.clone().unwrap_or_default();
            let key = format!(
                "{}\u{0}{}\u{0}{}\u{0}{}",
                e.src,
                e.dst,
                flow,
                serde_json::to_string(&pts).unwrap()
            );
            (
                key,
                json!({
                    "src": e.src, "dst": e.dst,
                    "bpmn_flow": e.bpmn_flow.clone().map_or(Value::Null, Value::String),
                    "points": pts,
                }),
            )
        })
        .collect();
    edges.sort_by(|a, b| a.0.cmp(&b.0));

    json!({
        "width": d.width,
        "height": d.height,
        "components": comps.into_iter().map(|(_, v)| v).collect::<Vec<_>>(),
        "regions": regs.into_iter().map(|(_, v)| v).collect::<Vec<_>>(),
        "edges": edges.into_iter().map(|(_, v)| v).collect::<Vec<_>>(),
    })
}

/// Round-trip the diagram through the exporter + importer, then digest. Exercises
/// `to_bpmn::export`; robust to XML-formatting noise. Mirrors `bpmn_digest`.
fn bpmn_digest(d: &Diagram) -> Value {
    let xml = export(d);
    let reimported = bpmn::import(&xml).expect("re-import of own export must succeed");
    digest(&reimported)
}

// ── BPMN SVG render (Diagram → SVG), byte-identical to Python's to_svg.render ──
fn sha256_hex(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

#[test]
fn bpmn_svg_curated_byte_identical() {
    // The small reviewable set is committed as full SVG → exact byte comparison.
    let root = repo_root();
    let corpus = bpmn_corpus(&root);
    let svg_dir = root.join("conformance/golden/bpmn_svg");
    let mut mismatches: Vec<String> = Vec::new();
    let mut checked = 0usize;
    for entry in fs::read_dir(&svg_dir).unwrap() {
        let golden_path = entry.unwrap().path();
        if golden_path.extension().is_none_or(|x| x != "svg") {
            continue;
        }
        let stem = golden_path
            .file_stem()
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let src = &corpus[&stem];
        let diagram = bpmn::import(&read_lossy(src)).unwrap();
        let actual = render(&diagram);
        let expected = fs::read_to_string(&golden_path).unwrap();
        checked += 1;
        if actual != expected {
            mismatches.push(stem);
        }
    }
    assert!(
        mismatches.is_empty(),
        "{}/{} curated BPMN SVGs are not byte-identical to Python:\n  {}",
        mismatches.len(),
        checked,
        mismatches.join("\n  ")
    );
}

#[test]
fn bpmn_svg_corpus_hash_matches() {
    // Full-corpus coverage: render every importable .bpmn and compare the SVG sha256.
    let root = repo_root();
    let corpus = bpmn_corpus(&root);
    let golden = load_json(&root.join("conformance/golden/bpmn_svg.json"));
    let golden = golden.as_object().expect("bpmn_svg.json must be an object");
    let divergences_path = root.join("conformance/known_divergences.json");
    let divergences = if divergences_path.is_file() {
        load_json(&divergences_path)
    } else {
        Value::Object(Default::default())
    };
    let divergences = divergences.as_object().unwrap();

    let mut mismatches: Vec<String> = Vec::new();
    let mut checked = 0usize;
    for (stem, path) in &corpus {
        if divergences.contains_key(stem) {
            continue;
        }
        let diagram = match bpmn::import(&read_lossy(path)) {
            Ok(d) => d,
            Err(_) => continue,
        };
        let expected = match golden.get(stem) {
            Some(v) => v.as_str().unwrap(),
            None => continue, // un-renderable in Python → not in the hash map
        };
        checked += 1;
        if sha256_hex(&render(&diagram)) != expected {
            mismatches.push(stem.clone());
        }
    }
    assert!(
        mismatches.is_empty(),
        "{}/{} BPMN SVG renders diverge from Python (sha256):\n  {}",
        mismatches.len(),
        checked,
        mismatches.join("\n  ")
    );
}

// ── BPMN layout (positionless `bpmn { }` block AST → positioned model) ────────
#[test]
fn bpmn_layout_matches_golden() {
    let root = repo_root();
    let golden = load_json(&root.join("conformance/golden/bpmn_layout.json"));
    let golden = golden
        .as_object()
        .expect("bpmn_layout.json must be an object");

    let mut mismatches: Vec<String> = Vec::new();
    for (stem, entry) in golden {
        let blocks = bpmn::bpmn_layout::blocks_from_value(&entry["blocks"]).unwrap();
        let diagram = layout(&blocks);
        if model_json(&diagram) != entry["model"] {
            mismatches.push(stem.clone());
        }
    }

    assert!(
        mismatches.is_empty(),
        "{} / {} BPMN layouts diverge from golden:\n  {}",
        mismatches.len(),
        golden.len(),
        mismatches.join("\n  ")
    );
}

#[test]
fn bpmn_export_matches_golden() {
    let root = repo_root();
    let corpus = bpmn_corpus(&root);
    let golden = load_json(&root.join("conformance/golden/bpmn_export.json"));
    let golden = golden
        .as_object()
        .expect("bpmn_export.json must be an object");

    let mut mismatches: Vec<String> = Vec::new();
    let mut checked = 0usize;
    for (stem, path) in &corpus {
        // export set = files that import to a non-empty model (mirrors `_export_models`).
        let diagram = match bpmn::import(&read_lossy(path)) {
            Ok(d) if !d.components.is_empty() => d,
            _ => continue,
        };
        let expected = golden
            .get(stem)
            .unwrap_or_else(|| panic!("{stem} missing from bpmn_export.json — regenerate"));
        checked += 1;
        if &bpmn_digest(&diagram) != expected {
            mismatches.push(stem.clone());
        }
    }

    assert!(
        mismatches.is_empty(),
        "{} / {} BPMN export digests diverge from golden:\n  {}",
        mismatches.len(),
        checked,
        mismatches.join("\n  ")
    );
}

#[test]
fn bpmn_import_matches_golden() {
    let root = repo_root();
    let corpus = bpmn_corpus(&root);
    assert!(
        !corpus.is_empty(),
        "no .bpmn corpus files found under {root:?}"
    );

    let golden = load_json(&root.join("conformance/golden/bpmn_import.json"));
    let golden = golden
        .as_object()
        .expect("bpmn_import.json must be an object");

    let divergences_path = root.join("conformance/known_divergences.json");
    let divergences = if divergences_path.is_file() {
        load_json(&divergences_path)
    } else {
        Value::Object(Default::default())
    };
    let divergences = divergences.as_object().unwrap();

    let mut mismatches: Vec<String> = Vec::new();
    let mut checked = 0usize;
    for (stem, path) in &corpus {
        if divergences.contains_key(stem) {
            continue; // tracked divergence — skipped, like the JS suite
        }
        let expected = golden
            .get(stem)
            .unwrap_or_else(|| panic!("{stem} missing from bpmn_import.json — regenerate"));
        let actual = import_model(&read_lossy(path));
        checked += 1;
        if &actual != expected {
            mismatches.push(stem.clone());
        }
    }

    assert!(
        mismatches.is_empty(),
        "{} / {} BPMN imports diverge from golden:\n  {}",
        mismatches.len(),
        checked,
        mismatches.join("\n  ")
    );
}

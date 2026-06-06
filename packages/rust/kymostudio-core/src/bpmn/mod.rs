//! BPMN 2.0 stack — the cross-language single source of truth.
//!
//! Mirrors the Python pipeline (`packages/python/src/kymo/`) module-for-module so
//! divergences are easy to audit:
//!
//! | this module     | Python source     |
//! |-----------------|-------------------|
//! | [`model`]       | `model.py`        |
//! | [`round`]       | `round.ts` / `int(round())` |
//! | [`from_bpmn`]   | `from_bpmn.py`    |
//! | [`to_bpmn`]     | `to_bpmn.py`      |
//! | [`to_json`]     | `to_kymojson.py` + `tests/_conformance.py` |
//!
//! Parity is locked by `tests/bpmn_conformance.rs`, which asserts against the
//! same committed `conformance/golden/*.json` the Python and JS suites use.

pub mod model;
pub mod round;

pub mod bpmn_layout;
pub mod from_bpmn;
pub mod shapes;
pub mod to_bpmn;
pub mod to_json;
pub mod to_svg;

pub use bpmn_layout::{layout, BpmnBlock, BpmnFlow, BpmnNode};
pub use from_bpmn::parse as import;
pub use model::{Component, Diagram, Edge, Region};
pub use to_bpmn::export;
pub use to_json::model_json;
pub use to_svg::render;

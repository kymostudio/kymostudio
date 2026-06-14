//! Headless editor session — the shared, UI-agnostic editing core the native
//! mobile apps drive over uniffi. Ports the TypeScript editor logic
//! (`packages/js-canvas` + `packages/website/app/src/{patchDsl,diagramToShapes}.ts`)
//! into Rust so Android (Compose) and iOS (SwiftUI) stay thin render+input layers.
//!
//! Source text is the single source of truth for the diagram; freeform shapes
//! (pen / sticky / text) are an overlay tracked only in the session.

pub mod patch;
pub mod session;
pub mod shape;

pub use session::{Camera, EditorSession, Theme, Tool};
pub use shape::{diagram_to_shapes, EditorShape, ShapeData, ShapeId, ShapeKind};

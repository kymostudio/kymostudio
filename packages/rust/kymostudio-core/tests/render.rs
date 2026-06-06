//! Integration tests for the SVG→PNG core.

const PNG_MAGIC: &[u8] = b"\x89PNG\r\n\x1a\n";

const SQUARE: &[u8] =
    br##"<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#7cb342"/></svg>"##;

#[test]
fn renders_valid_png() {
    let png = kymostudio_core::svg_to_png(SQUARE, 1.0).expect("render");
    assert!(png.starts_with(PNG_MAGIC), "output is not a PNG");
}

#[test]
fn scale_changes_pixel_dimensions() {
    // PNG IHDR stores width/height as big-endian u32 at byte offset 16.
    let dims = |png: &[u8]| {
        let w = u32::from_be_bytes(png[16..20].try_into().unwrap());
        let h = u32::from_be_bytes(png[20..24].try_into().unwrap());
        (w, h)
    };
    let base = kymostudio_core::svg_to_png(SQUARE, 1.0).unwrap();
    let big = kymostudio_core::svg_to_png(SQUARE, 3.0).unwrap();
    assert_eq!(dims(&base), (20, 20));
    assert_eq!(dims(&big), (60, 60));
}

#[test]
fn rejects_garbage() {
    assert!(kymostudio_core::svg_to_png(b"not an svg at all", 1.0).is_err());
}

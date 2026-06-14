#!/usr/bin/env bash
# Build kymostudio-core static libs for iOS device + simulator, generate the
# uniffi Swift bindings, and assemble KymostudioCore.xcframework.
#
# Prereqs (one-time):
#   rustup target add aarch64-apple-ios aarch64-apple-ios-sim
#   (Intel-Mac CI also: rustup target add x86_64-apple-ios — then lipo the sim slices)
#   Xcode command-line tools (xcodebuild).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
CRATE="$ROOT/packages/rust/kymostudio-core"
OUT="$HERE/ios"
SWIFT_OUT="$OUT/Sources/KymostudioCore"
HDR="$OUT/headers"
XCF="$OUT/KymostudioCore.xcframework"

mkdir -p "$SWIFT_OUT" "$HDR"

echo "▶ Building static libs (device + simulator) …"
cargo build --release --manifest-path "$CRATE/Cargo.toml" \
  --no-default-features --features mobile --target aarch64-apple-ios
cargo build --release --manifest-path "$CRATE/Cargo.toml" \
  --no-default-features --features mobile --target aarch64-apple-ios-sim

DEVICE_LIB="$CRATE/target/aarch64-apple-ios/release/libkymostudio_core.a"
SIM_LIB="$CRATE/target/aarch64-apple-ios-sim/release/libkymostudio_core.a"

echo "▶ Generating Swift bindings …"
cargo run --manifest-path "$CRATE/Cargo.toml" \
  --no-default-features --features mobile \
  --bin uniffi-bindgen -- \
  generate --library "$DEVICE_LIB" \
  --language swift \
  --config "$CRATE/uniffi.toml" \
  --out-dir "$SWIFT_OUT"

# Split the generated header + modulemap out of the Swift sources into the
# xcframework's headers dir (the .modulemap must be named module.modulemap).
mv "$SWIFT_OUT/kymostudio_coreFFI.h" "$HDR/"
mv "$SWIFT_OUT/kymostudio_coreFFI.modulemap" "$HDR/module.modulemap"

echo "▶ Assembling xcframework (two arm64 slices → -create-xcframework, NOT lipo) …"
rm -rf "$XCF"
xcodebuild -create-xcframework \
  -library "$DEVICE_LIB" -headers "$HDR" \
  -library "$SIM_LIB"    -headers "$HDR" \
  -output "$XCF"

echo "✓ iOS artifacts:"
echo "   xcframework → $XCF"
echo "   Swift       → $SWIFT_OUT/kymostudio_core.swift (module KymostudioCore)"
echo "   Consume via the local SwiftPM package in $OUT (.binaryTarget → the xcframework)."

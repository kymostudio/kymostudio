#!/usr/bin/env bash
# Build the kymostudio-core JNI .so for all 4 Android ABIs + generate the uniffi
# Kotlin bindings. Outputs into android/kymostudio/src/main/{jniLibs,kotlin}.
#
# Prereqs (one-time):
#   rustup target add aarch64-linux-android armv7-linux-androideabi \
#       i686-linux-android x86_64-linux-android
#   cargo install cargo-ndk
#   Android NDK installed; ANDROID_NDK_HOME set (or NDK via Android Studio).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
CRATE="$ROOT/packages/rust/kymostudio-core"
JNILIBS="$HERE/android/kymostudio/src/main/jniLibs"
KOTLIN_OUT="$HERE/android/kymostudio/src/main/kotlin"

mkdir -p "$JNILIBS" "$KOTLIN_OUT"

echo "▶ Building .so for arm64-v8a, armeabi-v7a, x86, x86_64 …"
cargo ndk \
  -t arm64-v8a -t armeabi-v7a -t x86 -t x86_64 \
  -o "$JNILIBS" \
  build --release \
  --manifest-path "$CRATE/Cargo.toml" \
  --no-default-features --features mobile

# uniffi proc-macro `--library` mode extracts binding metadata from the compiled
# library (no execution → reading the cross-compiled arm64 .so on any host is fine).
SO="$JNILIBS/arm64-v8a/libkymostudio_core.so"
echo "▶ Generating Kotlin bindings from $SO …"
cargo run --manifest-path "$CRATE/Cargo.toml" \
  --no-default-features --features mobile \
  --bin uniffi-bindgen -- \
  generate --library "$SO" \
  --language kotlin \
  --config "$CRATE/uniffi.toml" \
  --out-dir "$KOTLIN_OUT"

echo "✓ Android artifacts:"
echo "   .so   → $JNILIBS/<abi>/libkymostudio_core.so"
echo "   Kotlin→ $KOTLIN_OUT/uniffi/kymostudio_core/kymostudio_core.kt (package studio.kymo.core)"
echo "   Runtime dep the app must add: net.java.dev.jna:jna:5.x@aar"

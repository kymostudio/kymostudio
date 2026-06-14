# kymostudio mobile

Native **Android** (Kotlin / Jetpack Compose) and **iOS** (Swift / SwiftUI)
apps for the kymostudio `.kymo` diagram editor, over **one shared Rust engine**
(`packages/rust/kymostudio-core`, `mobile` feature) exposed through
[uniffi](https://mozilla.github.io/uniffi-rs/). Fully offline.

```
kymostudio-core (Rust, --features mobile)
  src/ffi.rs  ── uniffi Session (Mutex<EditorSession>) + Record/Enum DTOs
        │  uniffi-bindgen --library
        ├── Kotlin + .so (4 ABIs) → android/   (Jetpack Compose)
        └── Swift  + .xcframework → ios/        (SwiftUI)
```

The engine does everything (parse `.kymo` → layout → render SVG → rasterize PNG,
plus the editor session: shapes, hit-test, drag→source writeback, undo/redo,
camera). The native UIs stay thin: render the PNG, draw a selection overlay, and
forward pointer events. Source text is the single source of truth.

## Build

```bash
# Android: 4-ABI .so + Kotlin bindings → android/kymostudio/src/main/{jniLibs,kotlin}
bash packages/mobile/build-android.sh

# iOS: device+sim static libs + Swift bindings → ios/KymostudioCore.xcframework + ios/Sources
bash packages/mobile/build-ios.sh
```

Prereqs are listed at the top of each script (`cargo-ndk` + Android targets;
`aarch64-apple-ios*` targets + Xcode). `uniffi-bindgen` runs from the crate's
own bin (`cargo run --features mobile --bin uniffi-bindgen`), reading binding
metadata from the compiled library (`--library` mode, no execution).

## Consuming the binding (v1 = local-first, no registry)

- **Android** — point the app module at `jniLibs/` + the generated Kotlin source
  set; add the uniffi runtime dep `net.java.dev.jna:jna:5.x@aar`. (For external
  distribution: package an AAR and publish to Maven Central / GitHub Packages.)
- **iOS** — a local SwiftPM package with a `.binaryTarget` pointing at
  `KymostudioCore.xcframework` + the generated `Sources/KymostudioCore`. (For
  external distribution: host the xcframework `.zip` on GitHub Releases and
  reference it as a remote `.binaryTarget`, or ship a CocoaPods podspec.)

## Startup

Mobile builds compile **without** system fonts, so register a bundled font once
before the first render, or `<text>` is dropped:

```kotlin
registerFont(assets.open("fonts/Roboto-Regular.ttf").readBytes())  // Android
```
```swift
registerFont(bytes: Data(contentsOf: robotoURL))                    // iOS
```

File-backed icons (the large catalogue) are not bundled in the binary — the host
registers the subset it needs via `registerIcon(key, bytes, isPng)`. Built-in
vector icons (the common architecture glyphs) need no registration.

## Layout

```
packages/mobile/
  build-android.sh        # cargo-ndk → .so ×4 + Kotlin
  build-ios.sh            # cargo build ×2 + xcframework + Swift
  android/                # Gradle app (Phase 4) — generated jniLibs + kotlin land here
  ios/                    # Xcode app + SwiftPM KymostudioCore (Phase 5) — xcframework lands here
  fonts/                  # bundled Roboto-Regular/Bold.ttf (copied from packages/render-api/fonts)
```

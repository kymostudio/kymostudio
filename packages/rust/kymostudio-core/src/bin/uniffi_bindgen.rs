//! Standalone `uniffi-bindgen` CLI — generates the Kotlin / Swift bindings from
//! the compiled `kymostudio-core` library (proc-macro `--library` mode). Built
//! only with the `mobile` feature; invoked by `packages/mobile/build-*.sh`.

fn main() {
    uniffi::uniffi_bindgen_main()
}

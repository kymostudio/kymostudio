# Dataset provenance

Vendored subset of the **resvg test suite** (https://github.com/linebender/resvg-test-suite), MIT-licensed.

- Source commit: `d8e064337faf01bc5a9579187a56dbdbe3eacc72`
- Categories: shapes, painting, paint-servers, structure, masking, filters (text/image excluded — font/resource dependent)
- Selection: self-contained, text-free SVGs only; ~12 per category by
  deterministic stride over the sorted eligible list.
- Total: 72 SVGs

Regenerate with `datasets/select_dataset.py` (see bench README).
Reference PNGs in `refs/` are rendered by headless Google Chrome — see
`datasets/gen_refs.py`.

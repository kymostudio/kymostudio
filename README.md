# axo

Diagram-as-code DSL — declarative architecture diagrams to **animated SVG / WebP**.

![NVIDIA AIQ replica — animated](samples/nvidia-aiq-animated.webp)

## Install

```bash
uv tool install git+https://github.com/rain1024/axo
```

## Usage

```bash
axo path/to/diagram.diagram             # → path/to/diagram.svg
axo path/to/diagram.diagram --animate   # → path/to/diagram-animated.svg
```

See [`samples/`](./samples/) for complete example `.diagram` files.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).

#!/usr/bin/env node
// drawio2svg — convert a .drawio file to SVG in pure Node using the mxGraph
// engine running on a jsdom DOM. No headless browser, no drawio desktop CLI.
//
// Usage:
//   node index.mjs <input.drawio> [out-prefix]
//   # writes one "<out-prefix>-<page-name>.svg" per page
//   # out-prefix defaults to the input path without its extension
//
// As a library:
//   import { drawioToSvg, drawioToSvgPages } from './index.mjs'
//
// Caveats (see README.md): jsdom has no layout engine, so text-metric-driven
// sizing/wrapping is approximate; custom drawio stencils only render if their
// XML is registered (drop *.xml into ./stencils/).

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import pako from 'pako';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 1. Set up a DOM and the globals mxGraph's client expects, then boot the
//    engine. Node >=21 ships a read-only `navigator` global that lacks
//    `appVersion`, which mxClient reads directly — override it with a shim.
// ---------------------------------------------------------------------------
let _mx = null;
function getEngine() {
  if (_mx) return _mx;

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    pretendToBeVisual: true,
  });
  const ua =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  const nav = {
    userAgent: ua,
    appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    appName: 'Netscape',
    platform: 'MacIntel',
    language: 'en-US',
    languages: ['en-US'],
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: nav,
    configurable: true,
    writable: true,
  });
  try {
    Object.defineProperty(dom.window, 'navigator', { value: nav, configurable: true });
  } catch { /* jsdom may forbid it; the global override is what mxClient reads */ }

  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.XMLSerializer = dom.window.XMLSerializer;
  global.DOMParser = dom.window.DOMParser;
  global.Image = dom.window.Image;

  // jsdom does not implement SVG layout; stub the geometry calls mxGraph may
  // touch during export so they return zeros instead of throwing.
  const svgProto = dom.window.SVGElement && dom.window.SVGElement.prototype;
  if (svgProto) {
    if (!svgProto.getBBox) {
      svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
    }
    if (!svgProto.getComputedTextLength) svgProto.getComputedTextLength = () => 0;
  }

  // Resolve mxgraph wherever it is installed (it lives in packages/js's
  // node_modules, declared as a devDependency — not beside this file), so the
  // base paths are independent of the install/hoist location.
  const mxRoot = dirname(require.resolve('mxgraph/package.json'));
  const factory = require('mxgraph');
  const mx = factory({
    mxBasePath: join(mxRoot, 'javascript/src'),
    mxImageBasePath: join(mxRoot, 'javascript/src/images'),
    mxLoadStylesheets: false,
    mxLoadResources: false,
  });

  // mxCodec.decode resolves classes by name via `window[node.nodeName]`
  // (e.g. window['mxGraphModel']). The factory only puts classes on the `mx`
  // namespace, so expose them on the (jsdom) window or decoding silently
  // clones every node and produces an empty graph.
  for (const k of Object.keys(mx)) {
    try { dom.window[k] = mx[k]; } catch { /* read-only key — ignore */ }
  }

  registerStencils(mx);
  _mx = mx;
  return mx;
}

// ---------------------------------------------------------------------------
// 2. Best-effort stencil loading. Bare mxGraph only knows its built-in shapes.
//    Drop drawio stencil-set XML files into ./stencils/ to widen coverage;
//    each file may be a <shapes> set or a single <shape>.
// ---------------------------------------------------------------------------
function registerStencils(mx) {
  const dir = join(__dirname, 'stencils');
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (!file.toLowerCase().endsWith('.xml')) continue;
    try {
      const xml = readFileSync(join(dir, file), 'utf8');
      const doc = mx.mxUtils.parseXml(xml);
      const root = doc.documentElement;
      if (root.nodeName === 'shapes') {
        // <shapes><shape name="…">…</shape>…</shapes>  (drawio stencil set)
        let shape = root.firstChild;
        while (shape != null) {
          if (shape.nodeType === 1 && shape.nodeName === 'shape') {
            const name = shape.getAttribute('name');
            if (name) {
              mx.mxStencilRegistry.addStencil(
                name.toLowerCase(),
                new mx.mxStencil(shape),
              );
            }
          }
          shape = shape.nextSibling;
        }
      } else if (root.nodeName === 'shape') {
        const name = root.getAttribute('name') || basename(file, '.xml');
        mx.mxStencilRegistry.addStencil(name.toLowerCase(), new mx.mxStencil(root));
      }
    } catch (err) {
      console.warn(`[drawio2svg] skipped stencil ${file}: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Decode the .drawio wrapper. Each <diagram> body is either plain
//    <mxGraphModel> XML or base64 + raw-deflate + URI-encoding.
// ---------------------------------------------------------------------------
function inflateDiagram(data) {
  const bytes = Uint8Array.from(Buffer.from(data, 'base64'));
  const inflated = pako.inflateRaw(bytes, { to: 'string' });
  return decodeURIComponent(inflated);
}

/** Parse a .drawio (mxfile) string into [{ name, modelXml }] — one per page. */
export function parseDrawioPages(drawioXml) {
  const mx = getEngine();
  const doc = mx.mxUtils.parseXml(drawioXml);
  const root = doc.documentElement;

  // A bare <mxGraphModel> (not wrapped in <mxfile>) is a single page.
  if (root.nodeName === 'mxGraphModel') {
    return [{ name: 'page-1', modelXml: drawioXml }];
  }

  const pages = [];
  const diagrams = root.getElementsByTagName('diagram');
  for (let i = 0; i < diagrams.length; i++) {
    const node = diagrams[i];
    const name = node.getAttribute('name') || `page-${i + 1}`;
    const body = (node.textContent || '').trim();
    let modelXml;
    if (body.startsWith('<')) {
      modelXml = body; // already plain mxGraphModel
    } else if (body.length > 0) {
      modelXml = inflateDiagram(body); // compressed
    } else {
      // Uncompressed drawio stores the model as a child <mxGraphModel> element.
      const model = node.getElementsByTagName('mxGraphModel')[0];
      modelXml = model ? mx.mxUtils.getXml(model) : '<mxGraphModel><root/></mxGraphModel>';
    }
    pages.push({ name, modelXml });
  }
  return pages;
}

// ---------------------------------------------------------------------------
// 4 + 6. Build the graph model from mxGraphModel XML and export it to SVG via
//        mxImageExport + mxSvgCanvas2D.
// ---------------------------------------------------------------------------
/** Render one <mxGraphModel> XML string to an SVG string. */
export function modelXmlToSvg(modelXml, { scale = 1, border = 10 } = {}) {
  const mx = getEngine();

  const container = document.createElement('div');
  document.body.appendChild(container);
  const graph = new mx.mxGraph(container);
  graph.setEnabled(false);

  const doc = mx.mxUtils.parseXml(modelXml);
  const codec = new mx.mxCodec(doc);
  codec.decode(doc.documentElement, graph.getModel());

  // Build view cell-states so the exporter has geometry to walk.
  graph.getView().validate();

  let bounds = graph.getGraphBounds();
  if (bounds.width === 0 || bounds.height === 0) {
    bounds = new mx.mxRectangle(0, 0, 100, 100);
  }

  const svgDoc = mx.mxUtils.createXmlDocument();
  const root = svgDoc.createElementNS(mx.mxConstants.NS_SVG, 'svg');
  const w = Math.ceil(bounds.width * scale + 2 * border);
  const h = Math.ceil(bounds.height * scale + 2 * border);
  // Note: createElementNS already emits xmlns; setting it again would produce a
  // duplicate xmlns attribute that strict parsers (librsvg) reject.
  root.setAttribute('xmlns:xlink', mx.mxConstants.NS_XLINK);
  root.setAttribute('version', '1.1');
  root.setAttribute('width', `${w}px`);
  root.setAttribute('height', `${h}px`);
  root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svgDoc.appendChild(root);

  const group = svgDoc.createElementNS(mx.mxConstants.NS_SVG, 'g');
  root.appendChild(group);

  const canvas = new mx.mxSvgCanvas2D(group);
  canvas.translate(
    Math.floor(border / scale - bounds.x),
    Math.floor(border / scale - bounds.y),
  );
  canvas.scale(scale);

  const imgExport = new mx.mxImageExport();
  imgExport.drawState(graph.getView().getState(graph.getModel().getRoot()), canvas);

  const svg = new XMLSerializer().serializeToString(root);
  container.remove();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + svg;
}

/** Convert a .drawio string to SVG strings — one per page. */
export function drawioToSvgPages(drawioXml, opts = {}) {
  return parseDrawioPages(drawioXml).map((p) => ({
    name: p.name,
    svg: modelXmlToSvg(p.modelXml, opts),
  }));
}

/** Convert a .drawio string to a single SVG string (page `pageIndex`, default 0). */
export function drawioToSvg(drawioXml, { pageIndex = 0, ...opts } = {}) {
  const pages = parseDrawioPages(drawioXml);
  const page = pages[pageIndex];
  if (!page) throw new Error(`page index ${pageIndex} out of range (have ${pages.length})`);
  return modelXmlToSvg(page.modelXml, opts);
}

// ---------------------------------------------------------------------------
// 7. CLI
// ---------------------------------------------------------------------------
function slug(s) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}

function main(argv) {
  const [input, prefixArg] = argv;
  if (!input) {
    console.error('Usage: node index.mjs <input.drawio> [out-prefix]');
    process.exit(2);
  }
  const xml = readFileSync(input, 'utf8');
  const prefix = prefixArg || join(dirname(input), basename(input, extname(input)));
  const pages = drawioToSvgPages(xml);
  const written = [];
  pages.forEach((p, i) => {
    const suffix = pages.length > 1 ? `-${slug(p.name)}` : '';
    const out = `${prefix}${suffix}.svg`;
    writeFileSync(out, p.svg, 'utf8');
    written.push(out);
  });
  console.log(`Wrote ${written.length} SVG file(s):`);
  for (const f of written) console.log('  ' + f);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}

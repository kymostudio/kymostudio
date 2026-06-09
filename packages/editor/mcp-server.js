#!/usr/bin/env node
// kymostudio MCP server — exposes the kymo flowchart renderer over the Model
// Context Protocol (stdio), so an LLM host (Claude Desktop, Cursor, …) can turn
// a kymo flowchart DSL into a rendered diagram, the same way the Mermaid /
// Draw.io MCP servers do.
//
// Tool: render_flowchart(source, format?, output_path?)
//   - source       the kymo flowchart DSL (a `flowchart { }` or `bpmn { }` block)
//   - format       "png" (default; returned as an image the host can show) | "svg"
//   - output_path  optional absolute path to save to (.png rasterizes, else SVG)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { writeFile } from "node:fs/promises";
import { renderToSvg, svgToPng } from "./render.js";

// The running editor (server.js). set_diagram / get_diagram drive its live
// editor, so an edit here shows up in every open browser tab.
const APP_URL = process.env.KYMO_APP_URL || "http://localhost:4173";

// A compact primer so the model writes valid kymo DSL (low hallucination, like
// Mermaid). The body of a `flowchart { }` block is flowchart syntax.
const SYNTAX = `kymo flowchart DSL — wrap the graph in a \`flowchart [DIR] { }\` block.
DIR ∈ TD (top-down, default) | LR | RL | BT.
Nodes by shape: A[Box]  B{Diamond}  C(Round)  D((Circle))  E[(Database)].
Edges: A --> B   with label: A -->|yes| B   chained: A --> B --> C.
Example:
flowchart TD {
  A[Start] --> B{OK?}
  B -->|yes| C[Done]
  B -->|no| D[Retry]
  D --> A
}
A sibling \`bpmn { }\` block is also accepted (BPMN style: start/task/xor/and/end nodes + \`->\` flows).`;

const server = new McpServer({ name: "kymostudio", version: "0.1.0" });

server.tool(
  "render_flowchart",
  `Render a kymo flowchart to an image (PNG) or SVG via the kymostudio engine.\n\n${SYNTAX}`,
  {
    source: z
      .string()
      .describe("The kymo flowchart DSL — a `flowchart [DIR] { ... }` block (or a `bpmn { ... }` block)."),
    format: z
      .enum(["png", "svg"])
      .optional()
      .describe("Output to return: 'png' (default, shown inline) or 'svg' (vector text)."),
    output_path: z
      .string()
      .optional()
      .describe("Optional absolute file path to also save to. A `.png` extension rasterizes; anything else writes SVG."),
  },
  async ({ source, format, output_path }) => {
    let svg;
    try {
      svg = await renderToSvg(source);
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Render failed: ${e.message || e}` }],
      };
    }

    let savedNote = "";
    if (output_path) {
      try {
        if (output_path.toLowerCase().endsWith(".png")) {
          await writeFile(output_path, await svgToPng(svg));
        } else {
          await writeFile(output_path, svg, "utf8");
        }
        savedNote = `Saved to ${output_path}\n`;
      } catch (e) {
        savedNote = `(could not save to ${output_path}: ${e.message})\n`;
      }
    }

    const fmt = format || "png";
    if (fmt === "svg") {
      return {
        content: [{ type: "text", text: `${savedNote}${svg}` }],
      };
    }

    // PNG: rasterize so the host can display the diagram inline.
    try {
      const png = await svgToPng(svg);
      return {
        content: [
          { type: "image", data: png.toString("base64"), mimeType: "image/png" },
          {
            type: "text",
            text: `${savedNote}Rendered kymo flowchart (${svg.length} bytes SVG).`,
          },
        ],
      };
    } catch (e) {
      // No rasterizer available — fall back to the SVG text.
      return {
        content: [
          {
            type: "text",
            text: `${savedNote}(PNG rasterizer unavailable: ${e.message})\n\n${svg}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "set_diagram",
  `Open/replace the flowchart in the LIVE editor editor (${APP_URL}) and render it. ` +
    `The new diagram appears immediately in every open browser tab. Returns a PNG preview.\n\n${SYNTAX}`,
  {
    source: z
      .string()
      .describe("The kymo flowchart DSL to load into the live editor — a `flowchart [DIR] { ... }` block."),
  },
  async ({ source }) => {
    // Validate by rendering first, so we don't push a broken doc.
    let svg;
    try {
      svg = await renderToSvg(source);
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Render failed, not pushed: ${e.message || e}` }],
      };
    }
    try {
      const r = await fetch(`${APP_URL}/api/doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, origin: "mcp" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Could not reach the editor at ${APP_URL}: ${e.message}` }],
      };
    }
    const out = [];
    try {
      const png = await svgToPng(svg);
      out.push({ type: "image", data: png.toString("base64"), mimeType: "image/png" });
    } catch {
      /* no rasterizer — skip the preview image */
    }
    out.push({ type: "text", text: `Updated the live editor at ${APP_URL} (${svg.length} bytes SVG).` });
    return { content: out };
  },
);

server.tool(
  "get_diagram",
  `Get the current flowchart source from the LIVE editor editor (${APP_URL}).`,
  {},
  async () => {
    try {
      const r = await fetch(`${APP_URL}/api/doc`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { source } = await r.json();
      return { content: [{ type: "text", text: source || "" }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `Could not reach the editor at ${APP_URL}: ${e.message}` }],
      };
    }
  },
);

await server.connect(new StdioServerTransport());

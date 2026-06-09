/**
 * ui/tools.ts — canvas-studio P3 (FR-CS-03): the tool registry.
 *
 * One ordered list the left rail (and any future bottom variant) renders. Enabled
 * tools map 1:1 to the engine `Tool` union (`select`/`hand`/`draw`/`sticky`/`text`);
 * the rest are **disabled placeholders** that reserve slots for the
 * `canvas-create-tools` sibling (frame/shape/diamond/edge/cloud-tile) and the
 * backend-bound `comment`/`ai`. `sepBefore` starts a new visual group.
 */
import type { Tool } from "../engine/react";
import { Select, Hand, Frame, Cloud, Square, Diamond, Arrow, Text, Sticky, Pen, Comment, Sparkle } from "./icons";

/** Engine tools + the not-yet-built placeholder ids. */
export type ToolId = Tool | "frame" | "tile" | "shape" | "diamond" | "edge" | "comment" | "ai";

export interface ToolDef {
  id: ToolId;
  Icon: (props: { size?: number }) => React.ReactNode;
  kbd: string;
  title: string;
  enabled: boolean;
  /** Render a separator before this item (group boundary). */
  sepBefore?: boolean;
}

export const TOOLS: ToolDef[] = [
  { id: "select", Icon: Select, kbd: "V", title: "Select / move", enabled: true },
  { id: "hand", Icon: Hand, kbd: "H", title: "Pan (hand)", enabled: true },
  { id: "frame", Icon: Frame, kbd: "F", title: "Container — coming in canvas-create-tools", enabled: false, sepBefore: true },
  { id: "tile", Icon: Cloud, kbd: "C", title: "Cloud icon tile — coming in canvas-create-tools", enabled: false },
  { id: "shape", Icon: Square, kbd: "R", title: "Shape — coming in canvas-create-tools", enabled: false },
  { id: "diamond", Icon: Diamond, kbd: "D", title: "Decision — coming in canvas-create-tools", enabled: false },
  { id: "edge", Icon: Arrow, kbd: "A", title: "Edge — coming in canvas-create-tools", enabled: false },
  { id: "text", Icon: Text, kbd: "T", title: "Text (click to place)", enabled: true },
  { id: "sticky", Icon: Sticky, kbd: "S", title: "Sticky note (click to place)", enabled: true },
  { id: "draw", Icon: Pen, kbd: "P", title: "Draw (freehand pen)", enabled: true },
  { id: "comment", Icon: Comment, kbd: "K", title: "Comment — needs a backend (out of scope)", enabled: false, sepBefore: true },
  { id: "ai", Icon: Sparkle, kbd: "⌘K", title: "Ask kymo AI — needs a backend (out of scope)", enabled: false },
];

/** Keyboard-shortcut → engine tool (enabled tools only). Lower-cased keys. */
export const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  p: "draw",
  s: "sticky",
  t: "text",
};

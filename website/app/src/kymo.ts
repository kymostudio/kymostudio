/**
 * kymostudio package glue: register icons + expose the starter samples and the
 * small render helpers (ported from the vanilla `app.js`).
 *
 * Built-in vector icons render with zero network; the ~2300 file-backed icons
 * (cloud-provider logos) are fetched lazily from jsDelivr (the repo is public).
 * esbuild's `text` loader inlines the sample files as strings at build time.
 */
import { setManifest, setIconBaseURL } from "../../../packages/js/dist/index.js";
import manifest from "../../../packages/js/icons-manifest.json";

import aiqSrc from "../../../samples/aiq.kymo";
import dataSrc from "../../../samples/data.kymo";
import awsSrc from "../../../samples/aws_1.kymo";
import orderBpmn from "../../../samples/order.bpmn";

setManifest(manifest as Parameters<typeof setManifest>[0]);
setIconBaseURL("https://cdn.jsdelivr.net/gh/kymostudio/kymostudio@main");

export interface Sample {
  label: string;
  src: string;
}

export const SAMPLES: Record<string, Sample> = {
  aiq: { label: "AIQ architecture", src: aiqSrc },
  data: { label: "Data pipeline", src: dataSrc },
  aws: { label: "AWS reference", src: awsSrc },
  order: { label: "BPMN · Order", src: orderBpmn },
};

export const DEFAULT_SAMPLE = "aiq";

export type Theme = "light" | "dark";

/** SVG canvas background per page theme; "None" (transparent) → null. */
export const THEME_BG: Record<Theme, string> = { light: "#f8fafc", dark: "#0f172a" };

export function svgBackground(theme: Theme, transparent: boolean): string | null {
  return transparent ? null : THEME_BG[theme];
}

/** Heuristic: BPMN files are XML; everything else is the `.kymo` DSL. */
export function isBpmn(src: string): boolean {
  const head = src.slice(0, 600);
  return /<\?xml/.test(head) || /<([a-zA-Z]+:)?definitions[\s>]/.test(head);
}

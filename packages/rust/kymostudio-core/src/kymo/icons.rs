//! SVG icon library — Rust port of `packages/python/src/kymo/icons.py`.
//!
//! Each built-in icon is an SVG fragment centred at (0, 0); the renderer wraps
//! it in `<g transform="translate(cx, cy)">`. The hand-coded [`builtin_icon`]
//! set is compiled in (offline-first). File-backed icons (the 2400-icon
//! catalogue) are NOT bundled — instead the host app registers the subset it
//! needs via [`register_icon`] (PNG → `<image>` / SVG → inline), so the binary
//! stays lean. Resolution order in [`get_icon`]: built-in → registered → None.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

/// Round a float to ≤2 decimals, dropping trailing zeros and the dot. Mirrors
/// Python `_r` (`f"{x:.2f}".rstrip("0").rstrip(".")`).
fn r(x: f64) -> String {
    let s = format!("{:.2}", x);
    let s = s.trim_end_matches('0');
    let s = s.trim_end_matches('.');
    s.to_string()
}

// ── Isometric cube template ─────────────────────────────────────────────────
fn cube(inner_unit: &str, size: i32) -> String {
    let s = size as f64;
    let h = size / 2;
    let a = r(s * 0.44);
    let b = r(s * 0.21);
    let d = r(s * 0.44);
    let e = r(s * 0.06);
    let f = r(s * 0.28);
    let p06 = r(s * 0.06);
    let p28 = r(s * 0.28);
    let p49 = r(s * 0.49);
    let p72 = r(s * 0.72);
    let p94 = r(s * 0.94);
    let p50 = r(s * 0.50);
    format!(
        "<g class=\"icon-shadow\" transform=\"translate(-{h},-{h})\">\
<polygon points=\"{p50},{p06} {p94},{p28} {p50},{p49} {p06},{p28}\" fill=\"url(#g-face-top)\" stroke=\"#3d5d00\" stroke-width=\"1\"/>\
<polygon points=\"{p50},{p49} {p94},{p28} {p94},{p72} {p50},{p94}\" fill=\"url(#g-face-side)\" stroke=\"#3d5d00\" stroke-width=\"1\"/>\
<polygon points=\"{p06},{p28} {p50},{p49} {p50},{p94} {p06},{p72}\" fill=\"url(#g-face-front)\" stroke=\"#3d5d00\" stroke-width=\"1\"/>\
<g transform=\"matrix({a},{b},0,{d},{e},{f})\" stroke-linejoin=\"round\">{inner_unit}</g>\
</g>"
    )
}

// Inner glyphs — unit space [0,1]² on the front face.
const NOTEBOOK_GLYPH: &str = r##"
  <g stroke="white" stroke-width="0.045" stroke-linecap="round" fill="none">
    <line x1="0.18" y1="0.32" x2="0.82" y2="0.32"/>
    <line x1="0.18" y1="0.52" x2="0.82" y2="0.52"/>
    <line x1="0.18" y1="0.72" x2="0.60" y2="0.72"/>
  </g>
"##;

const DOCKER_GLYPH: &str = r##"
  <g fill="white">
    <rect x="0.10" y="0.30" width="0.34" height="0.18"/>
    <rect x="0.56" y="0.30" width="0.34" height="0.18"/>
    <rect x="0.10" y="0.56" width="0.34" height="0.18"/>
    <rect x="0.56" y="0.56" width="0.34" height="0.18"/>
  </g>
"##;

const NEURAL_GLYPH: &str = r##"
  <g stroke="white" stroke-width="0.032" fill="white">
    <line x1="0.50" y1="0.50" x2="0.20" y2="0.22"/>
    <line x1="0.50" y1="0.50" x2="0.80" y2="0.22"/>
    <line x1="0.50" y1="0.50" x2="0.20" y2="0.78"/>
    <line x1="0.50" y1="0.50" x2="0.80" y2="0.78"/>
    <circle cx="0.50" cy="0.50" r="0.085"/>
    <circle cx="0.20" cy="0.22" r="0.055"/>
    <circle cx="0.80" cy="0.22" r="0.055"/>
    <circle cx="0.20" cy="0.78" r="0.055"/>
    <circle cx="0.80" cy="0.78" r="0.055"/>
  </g>
"##;

// ── Flat orange box ─────────────────────────────────────────────────────────
fn boxed(inner: &str) -> String {
    format!(
        "<g class=\"icon-shadow\">\
<rect x=\"-35\" y=\"-35\" width=\"70\" height=\"70\" rx=\"8\" fill=\"url(#g-box-orange)\" stroke=\"#c2410c\" stroke-width=\"1.5\"/>\
{inner}\
</g>"
    )
}

const SEND_GLYPH: &str = r##"
  <g transform="translate(-13, -13)">
    <line x1="28" y1="2" x2="13" y2="17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="28,2 21,28 13,17 2,11 28,2" fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
  </g>
"##;

const ZAP_GLYPH: &str = r##"
  <polygon points="2,-18 -12,4 -1,4 -3,18 11,-4 0,-4 2,-18" fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
"##;

const ARCHIVE_GLYPH: &str = r##"
  <g transform="translate(0,-2)">
    <rect x="-20" y="-15" width="40" height="9" rx="2" fill="white"/>
    <path d="M -16,-6 V 16 a 2,2 0 0 0 2,2 H 14 a 2,2 0 0 0 2,-2 V -6" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <line x1="-6" y1="3" x2="6" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </g>
"##;

const CLOUD_GLYPH: &str = r##"
  <path d="M -10,12 a 12,12 0 1 1 5,-23 a 16,16 0 0 1 22,15 a 9,9 0 0 1 -2,17 H -10 a 9,9 0 0 1 0,-9 z"
        fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
"##;

const USER_CIRCLE: &str = r##"
  <g class="icon-shadow">
    <circle r="38" fill="url(#g-user-blue)"/>
    <circle cy="-9" r="10" fill="white"/>
    <path d="M -18,20 a 18,14 0 0 1 36,0 z" fill="white"/>
  </g>
"##;

const CYLINDER: &str = r##"
  <g class="icon-shadow" transform="translate(-35, -35)">
    <ellipse cx="35" cy="12" rx="28" ry="8" fill="#fdba74" stroke="#c2410c" stroke-width="1.4"/>
    <path d="M 7,12 V 58 a 28,8 0 0 0 56,0 V 12" fill="url(#g-cyl-orange)" stroke="#c2410c" stroke-width="1.4"/>
    <ellipse cx="35" cy="12" rx="28" ry="8" fill="none" stroke="#c2410c" stroke-width="1.2"/>
    <path d="M 7,28 a 28,8 0 0 0 56,0" fill="none" stroke="#c2410c" stroke-width="0.8" opacity="0.55"/>
    <path d="M 7,42 a 28,8 0 0 0 56,0" fill="none" stroke="#c2410c" stroke-width="0.8" opacity="0.55"/>
  </g>
"##;

const KEY: &str = r##"
  <g stroke="#d97706" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-10" cy="0" r="6" fill="#fff4e0"/>
    <line x1="-4" y1="-2" x2="16" y2="-2"/>
    <line x1="10" y1="-2" x2="10" y2="3"/>
    <line x1="16" y1="-2" x2="16" y2="5"/>
  </g>
"##;

const HEX_AGENT: &str = r##"
  <g class="icon-shadow">
    <polygon points="-30,-17 0,-32 30,-17 30,17 0,32 -30,17"
             fill="#e9f5d0" stroke="#3d5d00" stroke-width="1.6"/>
    <!-- head -->
    <circle cx="0" cy="-7" r="6.5" fill="#76b900"/>
    <!-- glasses: two dots + bridge -->
    <circle cx="-2.5" cy="-7" r="1" fill="#e9f5d0"/>
    <circle cx="2.5" cy="-7" r="1" fill="#e9f5d0"/>
    <!-- body / shoulders -->
    <path d="M -14,18 Q -14,4 0,4 Q 14,4 14,18 Z" fill="#76b900"/>
    <!-- collar V -->
    <path d="M -4,6 L 0,12 L 4,6" fill="#e9f5d0" stroke="none"/>
  </g>
"##;

const GEAR_GLYPH: &str = r##"
  <g fill="white" stroke="white" stroke-width="1.4" stroke-linejoin="round">
    <path d="M 0,-15 L 4,-15 L 5,-11 L 9,-9 L 12,-12 L 15,-9 L 12,-6 L 14,-2 L 18,-1 L 18,3
             L 14,4 L 12,8 L 15,11 L 12,14 L 9,11 L 5,13 L 4,17 L 0,17 L -1,13 L -5,11
             L -8,14 L -11,11 L -8,8 L -10,4 L -14,3 L -14,-1 L -10,-2 L -8,-6 L -11,-9
             L -8,-12 L -5,-9 L -1,-11 L 0,-15 Z"
          transform="translate(2, -2) scale(0.85)"/>
    <circle cx="2" cy="-2" r="4" fill="#f59e0b" stroke="#f59e0b"/>
  </g>
"##;

const FOLDER_GLYPH: &str = r##"
  <g fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round">
    <path d="M -22,-12 L -8,-12 L -4,-7 L 22,-7 L 22,16 L -22,16 Z"/>
  </g>
"##;

const FILES_STACK: &str = r##"
  <g fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round">
    <!-- back document -->
    <rect x="-18" y="-18" width="20" height="26" rx="2" fill="white" opacity="0.6"/>
    <!-- front document -->
    <rect x="-8" y="-8" width="22" height="28" rx="2" fill="white"/>
    <line x1="-3" y1="-1" x2="10" y2="-1" stroke="#d97706" stroke-width="1.2"/>
    <line x1="-3" y1="4"  x2="10" y2="4"  stroke="#d97706" stroke-width="1.2"/>
    <line x1="-3" y1="9"  x2="6"  y2="9"  stroke="#d97706" stroke-width="1.2"/>
  </g>
"##;

const CHECKLIST_GLYPH: &str = r##"
  <g stroke="#94a3b8" fill="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-22" y="-22" width="44" height="44" rx="2" fill="white"/>
    <!-- 3 rows of checkbox + line -->
    <polyline points="-15,-14 -12,-11 -8,-16" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="-13" x2="14" y2="-13" stroke="#94a3b8"/>
    <polyline points="-15,-2 -12,1 -8,-4" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="-1" x2="14" y2="-1" stroke="#94a3b8"/>
    <polyline points="-15,10 -12,13 -8,8" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="11" x2="14" y2="11" stroke="#94a3b8"/>
  </g>
"##;

const MAGNIFIER_GLYPH: &str = r##"
  <g fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-3" cy="-3" r="11" fill="white" stroke="white" stroke-width="0"/>
    <circle cx="-3" cy="-3" r="9" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <line x1="5" y1="5" x2="14" y2="14" stroke="white" stroke-width="4"/>
  </g>
"##;

const HEX_NET_GLYPH: &str = r##"
  <g stroke="white" stroke-width="0.04" fill="white">
    <!-- 6 connection lines + 6 nodes for a network pattern -->
    <line x1="0.50" y1="0.20" x2="0.20" y2="0.50"/>
    <line x1="0.50" y1="0.20" x2="0.80" y2="0.50"/>
    <line x1="0.20" y1="0.50" x2="0.50" y2="0.80"/>
    <line x1="0.80" y1="0.50" x2="0.50" y2="0.80"/>
    <line x1="0.20" y1="0.50" x2="0.80" y2="0.50"/>
    <line x1="0.50" y1="0.20" x2="0.50" y2="0.80"/>
    <circle cx="0.50" cy="0.20" r="0.055"/>
    <circle cx="0.20" cy="0.50" r="0.055"/>
    <circle cx="0.80" cy="0.50" r="0.055"/>
    <circle cx="0.50" cy="0.80" r="0.055"/>
  </g>
"##;

fn halo(inner: &str, size: i32) -> String {
    let s = size / 2;
    format!(
        "<circle r=\"{s}\" fill=\"#76b900\" opacity=\"0.10\"/>\
<circle r=\"{}\" fill=\"#76b900\" opacity=\"0.08\"/>\
{inner}",
        s - 6
    )
}

fn aws_tile(color: &str, dark: &str, glyph: &str, hero: bool) -> String {
    let size = if hero { 80 } else { 64 };
    let h = size / 2;
    format!(
        "<g class=\"icon-shadow\">\
<rect x=\"-{h}\" y=\"-{h}\" width=\"{size}\" height=\"{size}\" rx=\"10\" fill=\"{color}\" stroke=\"{dark}\" stroke-width=\"1.4\"/>\
{glyph}\
</g>"
    )
}

const AMPLIFY_GLYPH: &str = r##"
  <g fill="white" stroke="none">
    <!-- stylized A (Amplify mark) -->
    <path d="M -14,12 L -3,-12 L 3,-12 L 14,12 L 7,12 L 4,5 L -4,5 L -7,12 Z"/>
    <path d="M -1,-1 L 1,-1 L 2,2 L -2,2 Z"/>
  </g>
"##;

const LEX_GLYPH: &str = r##"
  <g fill="white" stroke="none">
    <!-- chat bubble + dots -->
    <path d="M -14,-8 a 4,4 0 0 1 4,-4 H 10 a 4,4 0 0 1 4,4 V 4 a 4,4 0 0 1 -4,4 H -2 L -8,14 V 8 H -10 a 4,4 0 0 1 -4,-4 Z"/>
    <circle cx="-6" cy="-2" r="1.6" fill="#C925D1"/>
    <circle cx="0"  cy="-2" r="1.6" fill="#C925D1"/>
    <circle cx="6"  cy="-2" r="1.6" fill="#C925D1"/>
  </g>
"##;

const LAMBDA_GLYPH: &str = r##"
  <text x="0" y="11" text-anchor="middle"
        style="font-size:38px;font-weight:700;fill:white;font-family:Georgia,serif">&#955;</text>
"##;

const CONNECT_GLYPH: &str = r##"
  <g fill="white" stroke="none">
    <!-- phone handset -->
    <path d="M -12,-8 q 0,-4 4,-4 l 4,0 q 3,0 4,3 l 1,4 q 1,3 -2,5 l -3,2 q 3,6 9,9 l 2,-3 q 2,-3 5,-2 l 4,1 q 3,1 3,4 l 0,4 q 0,4 -4,4 q -16,0 -27,-11 q -11,-11 -11,-16 z"/>
  </g>
"##;

const DYNAMODB_GLYPH: &str = r##"
  <g fill="white" stroke="white" stroke-width="0" stroke-linejoin="round">
    <!-- stacked database discs -->
    <ellipse cx="0" cy="-9" rx="12" ry="3.5"/>
    <path d="M -12,-9 V -1 a 12,3.5 0 0 0 24,0 V -9" fill="white"/>
    <ellipse cx="0" cy="-1" rx="12" ry="3.5" fill="#4D72F3" opacity="0.35"/>
    <path d="M -12,0 V 8 a 12,3.5 0 0 0 24,0 V 0" fill="white"/>
    <ellipse cx="0" cy="8" rx="12" ry="3.5" fill="#4D72F3" opacity="0.35"/>
    <path d="M -12,9 V 12 a 12,3.5 0 0 0 24,0 V 9" fill="white"/>
  </g>
"##;

const BEDROCK_GLYPH: &str = r##"
  <g fill="white" stroke="white" stroke-width="1.6" stroke-linecap="round">
    <!-- brain-ish network -->
    <circle cx="0"   cy="0"  r="3.5" fill="white"/>
    <circle cx="-10" cy="-7" r="2.5" fill="white"/>
    <circle cx="10"  cy="-7" r="2.5" fill="white"/>
    <circle cx="-10" cy="7"  r="2.5" fill="white"/>
    <circle cx="10"  cy="7"  r="2.5" fill="white"/>
    <line x1="-7" y1="-5" x2="-2" y2="-1"/>
    <line x1="7"  y1="-5" x2="2"  y2="-1"/>
    <line x1="-7" y1="5"  x2="-2" y2="1"/>
    <line x1="7"  y1="5"  x2="2"  y2="1"/>
  </g>
"##;

const S3_GLYPH: &str = r##"
  <g fill="white" stroke="none">
    <!-- bucket -->
    <path d="M -12,-8 L 12,-8 L 10,12 a 2,2 0 0 1 -2,2 L -8,14 a 2,2 0 0 1 -2,-2 Z"/>
    <ellipse cx="0" cy="-8" rx="12" ry="3" fill="#7AA116"/>
    <ellipse cx="0" cy="-8" rx="12" ry="3" fill="none" stroke="white" stroke-width="1.2"/>
  </g>
"##;

const KENDRA_GLYPH: &str = r##"
  <g fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
    <!-- magnifier -->
    <circle cx="-3" cy="-3" r="8"/>
    <line x1="3" y1="3" x2="11" y2="11"/>
  </g>
"##;

const CUSTOMER_PERSON: &str = r##"
  <g class="icon-shadow">
    <circle r="34" fill="url(#g-user-blue)"/>
    <circle cy="-8" r="9" fill="white"/>
    <path d="M -16,18 a 16,12 0 0 1 32,0 z" fill="white"/>
  </g>
"##;

const INTERNET_CLOUD: &str = r##"
  <g class="icon-shadow">
    <path d="M -22,8 a 14,14 0 1 1 6,-26 a 18,18 0 0 1 26,16 a 11,11 0 0 1 -3,21 H -22 a 11,11 0 0 1 -7,-11 z"
          fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.6" stroke-linejoin="round"/>
    <text x="0" y="6" text-anchor="middle"
          style="font-size:9.5px;font-weight:700;fill:#1d4ed8;letter-spacing:0.05em">WWW</text>
  </g>
"##;

const SLACK_BADGE: &str = r##"
  <g class="icon-shadow">
    <rect x="-16" y="-16" width="32" height="32" rx="7" fill="white" stroke="#cbd5e1" stroke-width="1"/>
    <!-- Slack hash mark, 4 coloured arms -->
    <g stroke-linecap="round" stroke-width="3.6" fill="none">
      <line x1="-7" y1="-3" x2="7"  y2="-3" stroke="#e01e5a"/>
      <line x1="-7" y1="3"  x2="7"  y2="3"  stroke="#36c5f0"/>
      <line x1="-3" y1="-7" x2="-3" y2="7"  stroke="#2eb67d"/>
      <line x1="3"  y1="-7" x2="3"  y2="7"  stroke="#ecb22e"/>
    </g>
  </g>
"##;

const PLUS_MARK: &str = r##"
  <g fill="#475569" stroke="#475569" stroke-width="2" stroke-linecap="round">
    <line x1="-6" y1="0" x2="6" y2="0"/>
    <line x1="0" y1="-6" x2="0" y2="6"/>
  </g>
"##;

const AWS_LOGO: &str = r##"
  <g class="icon-shadow">
    <rect x="-18" y="-18" width="36" height="36" rx="4" fill="#232f3e"/>
    <text x="0" y="2" text-anchor="middle"
          style="font-size:14px;font-weight:800;fill:white;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.4px">aws</text>
    <path d="M -9,8 Q 0,13 9,8" fill="none" stroke="#ff9900" stroke-width="1.8" stroke-linecap="round"/>
  </g>
"##;

const SITE_GLOBE: &str = r##"
  <g fill="none" stroke="#475569" stroke-width="1.4" stroke-linecap="round">
    <circle r="9"/>
    <ellipse cx="0" cy="0" rx="4" ry="9"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
  </g>
"##;

fn step_badge(n: i32) -> String {
    format!(
        "<circle r=\"14\" fill=\"#fff4e0\" stroke=\"#d97706\" stroke-width=\"1.8\"/>\
<text x=\"0\" y=\"4.5\" text-anchor=\"middle\" style=\"font-size:14px;font-weight:700;fill:#92400e\">{n}</text>"
    )
}

/// The hand-coded built-in icon for `key`, if any. Mirrors the Python `ICONS`
/// dict (constructed lazily here — cheap, and avoids a `LazyLock` MSRV bump).
pub fn builtin_icon(key: &str) -> Option<String> {
    Some(match key {
        "user" => USER_CIRCLE.to_string(),
        "notebook" => cube(NOTEBOOK_GLYPH, 80),
        "boxes" => cube(DOCKER_GLYPH, 80),
        "neural" => halo(&cube(NEURAL_GLYPH, 100), 124),
        "neural-sm" => cube(HEX_NET_GLYPH, 80),
        "send" => boxed(SEND_GLYPH),
        "zap" => boxed(ZAP_GLYPH),
        "archive" => boxed(ARCHIVE_GLYPH),
        "cloud" => boxed(CLOUD_GLYPH),
        "cylinder" => CYLINDER.to_string(),
        "key" => KEY.to_string(),
        "hex-agent" => HEX_AGENT.to_string(),
        "gear" => boxed(GEAR_GLYPH),
        "folder" => boxed(FOLDER_GLYPH),
        "files" => boxed(FILES_STACK),
        "checklist" => boxed(CHECKLIST_GLYPH),
        "magnifier" => boxed(MAGNIFIER_GLYPH),
        "aws-amplify" => aws_tile("#DD344C", "#a31836", AMPLIFY_GLYPH, false),
        "aws-lex" => aws_tile("#C925D1", "#8a1690", LEX_GLYPH, false),
        "aws-lambda" => aws_tile("#ED7100", "#a44a00", LAMBDA_GLYPH, true),
        "aws-connect" => aws_tile("#DD344C", "#a31836", CONNECT_GLYPH, false),
        "aws-dynamodb" => aws_tile("#4D72F3", "#2a4ec2", DYNAMODB_GLYPH, false),
        "aws-bedrock" => aws_tile("#01A88D", "#017364", BEDROCK_GLYPH, false),
        "aws-s3" => aws_tile("#7AA116", "#506b0e", S3_GLYPH, false),
        "aws-kendra" => aws_tile("#C925D1", "#8a1690", KENDRA_GLYPH, false),
        "customer-person" => CUSTOMER_PERSON.to_string(),
        "internet-cloud" => INTERNET_CLOUD.to_string(),
        "step-1" => step_badge(1),
        "step-2" => step_badge(2),
        "step-3" => step_badge(3),
        "aws-logo" => AWS_LOGO.to_string(),
        "site-globe" => SITE_GLOBE.to_string(),
        "slack" => SLACK_BADGE.to_string(),
        "plus" => PLUS_MARK.to_string(),
        _ => return None,
    })
}

// ── Runtime registry (host-registered file-backed icons, offline) ───────────
fn registry() -> &'static Mutex<HashMap<String, String>> {
    static REG: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    REG.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Register an icon fragment for `key`. The host app calls this at startup for
/// any file-backed icon it bundles. `is_png`: wrap as a base64 `<image>` (PNG)
/// centred at (0,0); otherwise inline the SVG markup. Mirrors Python's
/// `_png_as_image_tag` / `_svg_as_inline` (default size 64).
pub fn register_icon(key: &str, bytes: &[u8], is_png: bool) {
    const SIZE: i32 = 64;
    let half = SIZE / 2;
    let frag = if is_png {
        let b64 = base64_encode(bytes);
        format!(
            "<image href=\"data:image/png;base64,{b64}\" x=\"-{half}\" y=\"-{half}\" width=\"{SIZE}\" height=\"{SIZE}\"/>"
        )
    } else {
        let raw = String::from_utf8_lossy(bytes);
        format!(
            "<svg x=\"-{half}\" y=\"-{half}\" width=\"{SIZE}\" height=\"{SIZE}\" overflow=\"visible\">{raw}</svg>"
        )
    };
    registry().lock().unwrap().insert(key.to_string(), frag);
}

/// Register an already-built SVG fragment verbatim for `key`.
pub fn register_icon_svg(key: &str, fragment: &str) {
    registry().lock().unwrap().insert(key.to_string(), fragment.to_string());
}

/// Resolve `key` → SVG fragment: built-in → host-registered → `None`. (Python's
/// `get_icon` raises on a miss; the editor renderer treats `None` as "draw the
/// glyph outline only", so a missing icon never aborts a render.)
pub fn get_icon(key: &str) -> Option<String> {
    if let Some(b) = builtin_icon(key) {
        return Some(b);
    }
    registry().lock().unwrap().get(key).cloned()
}

// ── Minimal base64 (avoid a dep just for icon embedding) ─────────────────────
fn base64_encode(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | (b[2] as u32);
        out.push(T[((n >> 18) & 63) as usize] as char);
        out.push(T[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            T[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            T[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_icons_present() {
        for k in ["user", "hex-agent", "folder", "checklist", "neural-sm", "cylinder"] {
            assert!(builtin_icon(k).is_some(), "missing builtin {k}");
        }
        assert!(builtin_icon("nope-xyz").is_none());
    }

    #[test]
    fn cube_uses_tidy_rounding() {
        // size 80: 0.06*80 = 4.8 → "4.8"; 0.5*80 = 40.0 → "40".
        let c = cube("", 80);
        assert!(c.contains("translate(-40,-40)"));
        assert!(c.contains("matrix(35.2,16.8,0,35.2,4.8,22.4)"));
    }

    #[test]
    fn base64_roundtrip_known() {
        assert_eq!(base64_encode(b"M"), "TQ==");
        assert_eq!(base64_encode(b"Ma"), "TWE=");
        assert_eq!(base64_encode(b"Man"), "TWFu");
    }

    #[test]
    fn register_and_get() {
        register_icon_svg("test:custom", "<circle r=\"5\"/>");
        assert_eq!(get_icon("test:custom").as_deref(), Some("<circle r=\"5\"/>"));
    }
}

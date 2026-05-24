# Security Policy

## Supported versions

kymo is in active alpha development. Security fixes are applied to the latest
released version only.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, affected package(s) (`python` / `js` /
   `vscode-extension`), version, and a minimal reproduction if possible.

We aim to acknowledge a report within a few days (best effort — this is a
volunteer-maintained project) and will coordinate a fix and disclosure timeline
with you.

## Scope

kymo compiles untrusted text/XML into images. The primary attack surface is:

- parsing `.kymo` DSL and `.bpmn` XML sources, and
- emitting SVG / Figma / Excalidraw / BPMN output.

Label and text content is XML-escaped in both renderers
(`packages/python/src/kymo/to_svg.py` `_xml_escape`, `packages/js/src/render.ts`
`escapeXml`). Reports of injection, escaping gaps, or unsafe parsing of
malicious input are in scope and appreciated.

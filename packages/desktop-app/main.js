// kymostudio desktop-app — Electron main process.
//
// Mirrors the web-app: a live editor that renders the kymo flowchart DSL (the
// `flowchart { }` block) to SVG. The renderer process sends the source over IPC
// (`kymo:render`); here we pipe it through the Python reference renderer
// (`render_kymo.py`: parse -> kymostudio-core layout -> to_svg) and return the
// SVG. The Rust CLI does not render the `.kymo` DSL, so this uses the Python
// engine, exactly like the web-app's server.

const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

// Python interpreter: the in-package venv, else `python3` on PATH.
function resolvePython() {
  if (process.env.KYMO_PYTHON) return process.env.KYMO_PYTHON;
  const venv = path.join(__dirname, ".venv/bin/python");
  return existsSync(venv) ? venv : "python3";
}
const PYTHON = resolvePython();
// Where the `kymo` Python package lives (so `import kymo` resolves).
const PYTHONPATH =
  process.env.KYMO_PYTHONPATH || path.resolve(__dirname, "../python/src");
const RENDER_SCRIPT = path.join(__dirname, "render_kymo.py");

// Pipe `source` through render_kymo.py; resolve with the SVG or reject with
// the renderer's stderr.
function renderToSvg(source) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [RENDER_SCRIPT], {
      env: { ...process.env, PYTHONPATH },
      timeout: 15_000,
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) => reject(new Error(e.message)));
    proc.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error((err || `renderer exited ${code}`).trim()));
    });
    proc.stdin.end(source);
  });
}

ipcMain.handle("kymo:render", async (_event, source) => {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("empty source");
  }
  return await renderToSvg(source);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    backgroundColor: "#0f1115",
    title: "kymo · flowchart",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer/index.html"));

  // Headless verification hook: KYMO_CAPTURE=<png> renders the first frame to
  // an image and quits. Used to screenshot the window on a display-less box.
  if (process.env.KYMO_CAPTURE) {
    win.webContents.on("did-finish-load", () => {
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        require("node:fs").writeFileSync(
          process.env.KYMO_CAPTURE,
          img.toPNG(),
        );
        app.quit();
      }, 1500);
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Bridge the sandboxed renderer to the main process. Exposes a single
// `window.kymo.render(source)` that returns a Promise<string> (the SVG) or
// rejects with the renderer's error message.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kymo", {
  render: (source) => ipcRenderer.invoke("kymo:render", source),
});

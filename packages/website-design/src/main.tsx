import { createRoot } from "react-dom/client";
import { App } from "./App";

// Single static page — no router. The whole brand & design-system surface lives
// in <App>; this file just mounts it into #root.
createRoot(document.getElementById("root")!).render(<App />);

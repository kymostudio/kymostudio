import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { WorkspaceProvider } from "./workspace";
import EditorPage from "./EditorPage";
import DiagramsPage from "./DiagramsPage";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/diagrams" element={<DiagramsPage />} />
        </Routes>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);

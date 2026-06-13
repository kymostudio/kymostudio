import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { WorkspaceProvider } from "./workspace";
import { ConfirmProvider } from "./confirm";
import EditorPage from "./EditorPage";
import DiagramsPage from "./DiagramsPage";
import TrashPage from "./TrashPage";
import LoginPage from "./LoginPage";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <ConfirmProvider>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/diagrams" element={<DiagramsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        </ConfirmProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);

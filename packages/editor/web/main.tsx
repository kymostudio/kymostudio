import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { WorkspaceProvider } from "./workspace";
import { ConfirmProvider } from "./confirm";
import { ContextMenuProvider } from "./context-menu";
import { ToastProvider } from "./toast";
import EditorPage from "./EditorPage";
import TrashPage from "./TrashPage";
import LoginPage from "./LoginPage";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <ConfirmProvider>
        <ToastProvider>
        <ContextMenuProvider>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* removed /diagrams (the Explorer + Welcome replace it) — stale links fall home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ContextMenuProvider>
        </ToastProvider>
        </ConfirmProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);

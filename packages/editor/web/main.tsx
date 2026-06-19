import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { WorkspaceProvider } from "./workspace";
import { ConfirmProvider } from "./confirm";
import { ContextMenuProvider } from "./context-menu";
import { ToastProvider } from "./toast";
import { DiagramsProvider } from "./sidebar";
import EditorPage from "./EditorPage";
import TrashPage from "./TrashPage";
import ProjectsPage from "./ProjectsPage";
import LoginPage from "./LoginPage";
import { UserChannel } from "./userchannel";
import { ProjectsModal } from "./ProjectsModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { installLocalApi } from "./localdb";

// Local dev has no kymo-mcp backend — back the data API + rooms with localStorage
// so save / list / reopen work. No-op off localhost (production is untouched).
installLocalApi();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <WorkspaceProvider>
        <DiagramsProvider>
        <ConfirmProvider>
        <ToastProvider>
        <ContextMenuProvider>
        <UserChannel />
        <ProjectsModal />
        <ShortcutsModal />
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* removed /diagrams (the Explorer + Welcome replace it) — stale links fall home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ContextMenuProvider>
        </ToastProvider>
        </ConfirmProvider>
        </DiagramsProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </BrowserRouter>
);

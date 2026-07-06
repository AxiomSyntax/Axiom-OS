"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { ChatSession, ChatProject, ChatSessionSource, PageId } from "@/lib/axiom/types";
import {
  Plus,
  Trash2,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Bot,
  Code2,
  Home,
  Clock,
  Search,
  PanelRightClose,
  GitBranch,
  Terminal,
  Globe,
  FileCode2,
  MoreVertical,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { GlyphRenderer } from "./AppIcon";
import { RenameableText } from "./RenameableText";

// ── Which pages have an active archive view? ─────────────────────────────
const ARCHIVE_VIEWS: Record<string, ChatSessionSource> = {
  home: "home",
  "agent-hub": "agent-hub",
  devlab: "devlab",
  workflows: "workflows",
};

const VIEW_META: Record<ChatSessionSource, {
  label: string;
  icon: typeof Home;
  color: string;
  createLabel: string;
  emptyTitle: string;
  emptySub: string;
  searchPlaceholder: string;
}> = {
  home: {
    label: "Jarvis Chat Archive",
    icon: Home,
    color: "axiom-cyan",
    createLabel: "Create New Jarvis Session",
    emptyTitle: "No Jarvis sessions yet.",
    emptySub: "Conversations from the Home terminal will appear here.",
    searchPlaceholder: "Search Jarvis chats…",
  },
  "agent-hub": {
    label: "Agent & Council Archive",
    icon: Bot,
    color: "axiom-emerald",
    createLabel: "Create New Agent Session",
    emptyTitle: "No agent sessions yet.",
    emptySub: "Chat sessions with Forge, Oracle, Scribe, and councils will appear here.",
    searchPlaceholder: "Search agent sessions…",
  },
  devlab: {
    label: "DevLab Archive",
    icon: Code2,
    color: "axiom-amber",
    createLabel: "Create Workspace",
    emptyTitle: "No workspaces yet.",
    emptySub: "Create a Core Extension or Sandboxed App workspace to get started.",
    searchPlaceholder: "Search workspaces…",
  },
  workflows: {
    label: "Workflow Execution Logs",
    icon: GitBranch,
    color: "axiom-violet",
    createLabel: "",
    emptyTitle: "No execution logs yet.",
    emptySub: "Run a workflow to see execution logs here.",
    searchPlaceholder: "Search workflow logs…",
  },
};

const UNFILED_DROP_ID = "__unfiled__";

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ChatArchivePanel() {
  const {
    chatArchiveOpen,
    setChatArchiveOpen,
    chatSessions,
    chatProjects,
    createChatSession,
    deleteChatSession,
    renameChatSession,
    duplicateChatSession,
    createChatProject,
    deleteChatProject,
    renameChatProject,
    navigate,
    activeChatFolderId,
    setActiveChatFolder,
    loadChatSession,
    activeChatSessionId,
    moveSessionToProject,
    currentPage,
    installedAgents,
    workflows,
    councils,
    activeCouncilId,
    setActiveCouncil,
    // DevLab workspaces (new)
    devlabWorkspaces,
    activeWorkspaceId,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    switchWorkspace,
    activeDevLabDomain,
    setActiveDevLabDomain,
    // Workflow tab filtering
    viewMode,
    activeWorkflowTabId,
    openWorkflowTabs,
    workflowProjects,
    workflowFolders,
    createWorkflowProject,
    createWorkflowFolder,
    deleteWorkflowFolder,
    moveWorkflowProject,
    renameWorkflowProject,
    renameWorkflowFolder,
    openWorkflowProjectTab,
    focusWorkflowTab,
  } = useAxiom();

  const [search, setSearch] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(chatProjects.map((p) => p.id)),
  );
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [draggingSessionId, setDraggingSessionId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // ── Route-aware source filter ────────────────────────────────────────
  const activeSource = ARCHIVE_VIEWS[currentPage] ?? null;

  // ── Filtered projects for the current view (isolation) ─────────────────
  const viewProjects = useMemo(
    () => (activeSource ? chatProjects.filter((p) => p.source === activeSource) : []),
    [chatProjects, activeSource],
  );

  // ── Filtered sessions for the current view ───────────────────────────
  const viewSessions = useMemo(
    () => (activeSource ? chatSessions.filter((s) => s.source === activeSource) : []),
    [chatSessions, activeSource],
  );

  const filteredSessions = useMemo(
    () =>
      viewSessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.preview?.toLowerCase().includes(search.toLowerCase()),
      ),
    [viewSessions, search],
  );

  // ── Filtered workflow projects for search ───────────────────────────
  const filteredWorkflowProjects = useMemo(() => {
    if (activeSource !== "workflows") return workflowProjects;
    let projects = workflowProjects;
    // Filter by active tab's toolId
    if (viewMode === "workflow" && activeWorkflowTabId) {
      const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
      if (activeTab) {
        projects = projects.filter((p) => p.toolId === activeTab.toolId);
      }
    }
    // Filter by search query
    if (search.trim()) {
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false),
      );
    }
    return projects;
  }, [workflowProjects, activeSource, viewMode, activeWorkflowTabId, openWorkflowTabs, search]);

  // ── Filtered workspaces for DevLab view (domain-aware) ────────────
  // Each domain (core/app/integration) has its own filtered list.
  const filteredWorkspaces = useMemo(
    () => activeSource === "devlab"
      ? devlabWorkspaces.filter((w) =>
          w.domain === activeDevLabDomain &&
          w.name.toLowerCase().includes(search.toLowerCase()),
        )
      : [],
    [devlabWorkspaces, activeSource, search, activeDevLabDomain],
  );

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sessionsByProject = (projectId: string) =>
    filteredSessions.filter((s) => s.projectId === projectId);

  // Agent Hub: project folders are structurally banned
  const foldersAllowed = activeSource !== "agent-hub";

  // ── Drag handlers ────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggingSessionId(sessionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", sessionId);
  };

  const handleDragEnd = () => {
    setDraggingSessionId(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolderId !== folderId) setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent, folderId: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    if (dragOverFolderId === folderId) setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("text/plain") || draggingSessionId;
    if (!sessionId) return;
    const targetProjectId = folderId === UNFILED_DROP_ID ? null : folderId;
    moveSessionToProject(sessionId, targetProjectId);
    if (targetProjectId) {
      setExpandedProjects((prev) => new Set(prev).add(targetProjectId));
    }
    setDraggingSessionId(null);
    setDragOverFolderId(null);
  };

  // ── Create session handler (source-aware + domain-aware) ────────────
  const handleCreateSession = () => {
    const source: ChatSessionSource = activeSource ?? "home";
    // DevLab: create a workspace based on the active domain (core / app)
    if (source === "devlab") {
      const name = prompt("Workspace name:");
      if (!name) return;
      const type = activeDevLabDomain === "core" ? "core-extension" as const : "sandboxed-app" as const;
      createWorkspace(type, name, activeDevLabDomain);
      navigate("devlab");
      return;
    }
    const meta = VIEW_META[source];
    const id = createChatSession(source, {
      title: `${meta.label} — ${new Date().toLocaleDateString()}`,
      projectId: activeChatFolderId,
      engineId: source === "home" ? (useAxiom.getState().activeEngineId ?? undefined) : undefined,
    });
    // Explicitly load the new (empty) session so the chat terminal clears
    loadChatSession(id);
    navigate(source === "home" ? "home" : source === "workflows" ? "workflows" : source);
  };

  // ── Open session handler (navigates to correct page) ─────────────────
  const handleOpenSession = (s: ChatSession) => {
    // DevLab sessions are not linked to VibeFiles — navigate only
    if (s.source === "devlab") {
      navigate("devlab");
      return;
    }
    loadChatSession(s.id);
    const routeMap: Record<ChatSessionSource, PageId> = {
      home: "home",
      "agent-hub": "agent-hub",
      devlab: "devlab",
      workflows: "workflows",
    };
    navigate(routeMap[s.source] ?? "home");
  };

  // ── Render the panel ─────────────────────────────────────────────────
  const meta = activeSource ? VIEW_META[activeSource] : null;
  const SourceIcon = meta?.icon ?? Folder;
  const sourceColor = meta?.color ?? "axiom-dim";

  return (
    <motion.aside
      animate={{ width: chatArchiveOpen ? 288 : 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-full bg-axiom-deep/85 backdrop-blur-xl border-l border-axiom-edge/40 flex flex-col overflow-hidden shrink-0 relative z-20"
    >
      <div
        className="h-full flex flex-col"
        style={{
          opacity: chatArchiveOpen ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: chatArchiveOpen ? "auto" : "none",
        }}
      >
        {/* ═══ Header ═══ */}
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <SourceIcon className={cn("w-3.5 h-3.5 shrink-0", `text-${sourceColor}`)} />
            <span className="text-xs uppercase tracking-[0.2em] text-axiom-text font-medium truncate">
              {meta?.label ?? "Archive"}
            </span>
            <span className="text-[9px] text-axiom-dim/50 shrink-0">
              {filteredSessions.length}
            </span>
          </div>
          <button
            onClick={() => setChatArchiveOpen(false)}
            className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors shrink-0"
            title="Close panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ═══ Search + Create ═══ */}
        <div className="p-3 border-b border-axiom-edge/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-axiom-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={meta?.searchPlaceholder ?? "Search…"}
              className="w-full pl-7 pr-2 py-1.5 rounded-md bg-axiom-panel/60 border border-axiom-edge/40 text-xs text-axiom-text placeholder:text-axiom-dim/60 focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
          {/* Agent Hub: session creation requires agent context — use the
              AgentHubPage sidebar button instead. Hide here to prevent
              unbound "Unknown Agent" sessions. */}
          {activeSource !== "agent-hub" && meta?.createLabel && (
          <button
            onClick={handleCreateSession}
            className={cn(
              "w-full px-3 py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5 transition-all font-medium",
              `bg-${sourceColor}/10 border-${sourceColor}/40 text-${sourceColor} hover:bg-${sourceColor}/20`,
            )}
            style={{ boxShadow: `0 0 12px -2px var(--${sourceColor.replace("axiom-", "axiom-")}, rgba(120,220,255,0.25))` }}
          >
            <Plus className="w-3.5 h-3.5" /> {activeSource === "devlab"
              ? (activeDevLabDomain === "core" ? "Create Core Workspace" : "Create App Workspace")
              : (meta?.createLabel ?? "Create New Session")}
            {activeChatFolderId && (
              <span className="text-[9px] text-axiom-dim/70 normal-case tracking-normal ml-1">
                → {viewProjects.find((p) => p.id === activeChatFolderId)?.name ?? "folder"}
              </span>
            )}
          </button>
          )}
          {/* ── "+ New Project" button for Workflows (below search, above New Project Folder) ── */}
          {activeSource === "workflows" && viewMode === "workflow" && activeWorkflowTabId && (() => {
            const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
            if (!activeTab) return null;
            const toolColor = activeTab.toolId === "n8n" ? "axiom-rose" : "axiom-violet";
            return (
              <button
                onClick={() => {
                  const name = window.prompt("New project name:");
                  if (name && name.trim()) {
                    createWorkflowProject(activeTab.toolId as "n8n" | "langflow", name.trim());
                  }
                }}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5 transition-all font-medium",
                  `bg-${toolColor}/10 border-${toolColor}/40 text-${toolColor} hover:bg-${toolColor}/20`,
                )}
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
            );
          })()}
          {foldersAllowed && (
          <button
            onClick={() => setShowNewProject((v) => !v)}
            className="w-full px-1.5 rounded-lg text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-3 h-3" /> New Project Folder
          </button>
          )}
          {foldersAllowed && showNewProject && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProjectName.trim()) {
                    // When on workflows page with an active tab, create a workflow folder
                    if (activeSource === "workflows" && viewMode === "workflow" && activeWorkflowTabId) {
                      const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
                      if (activeTab) {
                        createWorkflowFolder(activeTab.toolId as "n8n" | "langflow", newProjectName.trim());
                      }
                    } else {
                      createChatProject(newProjectName.trim(), undefined, activeSource ?? undefined);
                    }
                    setNewProjectName("");
                    setShowNewProject(false);
                  }
                  if (e.key === "Escape") setShowNewProject(false);
                }}
                placeholder="Folder name…"
                className="w-full bg-axiom-panel/60 border border-axiom-violet/40 rounded px-2 py-1.5 text-xs focus:outline-none"
              />
            </motion.div>
          )}
        </div>

        {/* ═══ Body — Route-aware content ═══ */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-2">
          {activeSource === "agent-hub" && <AgentHubArchiveView
            sessions={filteredSessions}
            activeChatSessionId={activeChatSessionId}
            installedAgents={installedAgents}
            councils={councils}
            activeCouncilId={activeCouncilId}
            setActiveCouncil={setActiveCouncil}
            onDeleteSession={deleteChatSession} onRenameSession={renameChatSession} onDuplicateSession={duplicateChatSession}
            onOpenSession={handleOpenSession}
          />}

          {activeSource === "workflows" && <WorkflowsArchiveView
            sessions={filteredSessions}
            workflows={workflows}
            activeChatSessionId={activeChatSessionId}
            draggingSessionId={draggingSessionId}
            dragOverFolderId={dragOverFolderId}
            expandedProjects={expandedProjects}
            chatProjects={chatProjects}
            activeChatFolderId={activeChatFolderId}
            onToggleProject={toggleProject}
            onSetActiveFolder={setActiveChatFolder}
            onDeleteProject={deleteChatProject}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDeleteSession={deleteChatSession} onRenameSession={renameChatSession} onDuplicateSession={duplicateChatSession}
            onOpenSession={handleOpenSession}
            // Context-aware workflow project filtering (with search)
            workflowProjects={filteredWorkflowProjects}
            workflowFolders={(() => {
              if (viewMode === "workflow" && activeWorkflowTabId) {
                const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
                if (activeTab) {
                  return workflowFolders.filter((f) => f.toolId === activeTab.toolId);
                }
              }
              return workflowFolders;
            })()}
            archiveLabel={(() => {
              if (viewMode === "workflow" && activeWorkflowTabId) {
                const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
                if (activeTab) {
                  return activeTab.toolId === "n8n" ? "n8n Projects" : "LangFlow Projects";
                }
              }
              return "All Workflows";
            })()}
            activeWorkflowTabId={viewMode === "workflow" ? activeWorkflowTabId : null}
            onCreateProject={(name) => {
              if (viewMode === "workflow" && activeWorkflowTabId) {
                const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
                if (activeTab) {
                  createWorkflowProject(activeTab.toolId as "n8n" | "langflow", name);
                }
              }
            }}
            onCreateFolder={(name) => {
              if (viewMode === "workflow" && activeWorkflowTabId) {
                const activeTab = openWorkflowTabs.find((t) => t.projectId === activeWorkflowTabId);
                if (activeTab) {
                  createWorkflowFolder(activeTab.toolId as "n8n" | "langflow", name);
                }
              }
            }}
            onOpenProject={(projectId) => {
              openWorkflowProjectTab(projectId);
            }}
            onMoveProject={(projectId, folderId) => {
              moveWorkflowProject(projectId, folderId);
            }}
            onRenameProject={renameWorkflowProject}
            onRenameFolder={renameWorkflowFolder}
            openWorkflowTabs={openWorkflowTabs}
          />}

          {activeSource === "devlab" && (
            <>
              {/* Domain tabs — only Core Extension and App Development.
                  Integrations is NOT a DevLab domain; it lives at /integrations. */}
              <div className="flex items-center gap-0.5 mb-2 px-1">
                {(["core", "app"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDevLabDomain(d)}
                    className={cn(
                      "px-2 py-1 rounded text-[10px] uppercase tracking-wider border transition-colors",
                      activeDevLabDomain === d
                        ? "bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber"
                        : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/50",
                    )}
                  >
                    {d === "core" ? "Core Extension" : "App Development"}
                  </button>
                ))}
              </div>
              <DevLabWorkspaceView
                workspaces={filteredWorkspaces}
                activeWorkspaceId={activeWorkspaceId}
                onSwitch={switchWorkspace}
                onDelete={deleteWorkspace}
                onRename={renameWorkspace}
                sourceColor={sourceColor}
              />
            </>
          )}
          {activeSource === "home" && <StandardArchiveView
            sessions={filteredSessions}
            activeChatSessionId={activeChatSessionId}
            sourceColor={sourceColor}
            draggingSessionId={draggingSessionId}
            dragOverFolderId={dragOverFolderId}
            expandedProjects={expandedProjects}
            chatProjects={viewProjects}
            activeChatFolderId={activeChatFolderId}
            onToggleProject={toggleProject}
            onSetActiveFolder={setActiveChatFolder}
            onDeleteProject={deleteChatProject}
            onRenameProject={renameChatProject}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDeleteSession={deleteChatSession} onRenameSession={renameChatSession} onDuplicateSession={duplicateChatSession}
            onOpenSession={handleOpenSession}
          />}

          {((activeSource === "devlab" && filteredWorkspaces.length === 0) || (activeSource !== "devlab" && filteredSessions.length === 0 && viewProjects.length === 0)) && (
            <div className="text-center py-12 text-axiom-dim">
              <SourceIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">{meta?.emptyTitle ?? "No entries yet."}</p>
              <p className="text-[10px] text-axiom-dim/60 mt-1">
                {meta?.emptySub ?? ""}
              </p>
            </div>
          )}
        </div>

        {/* ═══ Footer ═══ */}
        <div className="p-2 border-t border-axiom-edge/40 text-[9px] text-axiom-dim/60 flex items-center justify-between shrink-0">
          <span>{activeSource === "devlab"
            ? `${filteredWorkspaces.length} workspaces`
            : `${filteredSessions.length} ${activeSource === "workflows" ? "logs" : "sessions"}${foldersAllowed ? ` · ${viewProjects.length} projects` : ""}`}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            synced
          </span>
        </div>
      </div>
    </motion.aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// View: DevLab — Workspace cards
// ═══════════════════════════════════════════════════════════════════════════

function DevLabWorkspaceView({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onDelete,
  onRename,
  sourceColor,
}: {
  workspaces: { id: string; name: string; type: string; files: { id: string }[]; messages: { id: string }[]; createdAt: number; updatedAt: number }[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  sourceColor: string;
}) {
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 text-axiom-dim">
        <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No workspaces yet.</p>
        <p className="text-[10px] text-axiom-dim/60 mt-1">
          Create a Core Extension or Sandboxed App workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        const isCore = ws.type === "core-extension";
        return (
          <div
            key={ws.id}
            className={cn(
              "group rounded-lg cursor-pointer transition-all border p-2.5",
              isActive
                ? `bg-${sourceColor}/10 border-${sourceColor}/40 shadow-[0_0_12px_-3px_var(--color-axiom-amber,rgba(255,180,50,0.15))]`
                : "border-transparent hover:bg-axiom-panel/60 hover:border-axiom-edge/40",
            )}
            onClick={() => onSwitch(ws.id)}
          >
            <div className="flex items-start gap-2">
              <Terminal className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isCore ? "text-axiom-amber" : "text-axiom-cyan")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {/* Rename via RenameableText: double-click or right-click → Rename.
                      Enter = Save, Escape = Cancel, blur = Save. */}
                  <RenameableText
                    value={ws.name}
                    onSave={(newName) => onRename(ws.id, newName)}
                    className={cn("text-xs", isActive ? "text-axiom-text font-medium" : "text-axiom-text/80")}
                    inputClassName="text-xs font-medium"
                  />
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-axiom-emerald axiom-pulse-ring shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider",
                    isCore ? "bg-axiom-amber/15 text-axiom-amber/80 border border-axiom-amber/30" : "bg-axiom-cyan/15 text-axiom-cyan/80 border border-axiom-cyan/30",
                  )}>
                    {isCore ? "Core" : "App"}
                  </span>
                  <span className="text-[9px] text-axiom-dim/50">{ws.files.length} files</span>
                  <span className="text-[9px] text-axiom-dim/50">{ws.messages.length} msgs</span>
                </div>
                <div className="text-[9px] text-axiom-dim/40 mt-0.5">
                  {new Date(ws.updatedAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) onDelete(ws.id); }}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-axiom-rose/30 flex items-center justify-center text-axiom-dim hover:text-axiom-rose shrink-0"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// View: Standard (Home) — project folders + session list
// ═══════════════════════════════════════════════════════════════════════════

function StandardArchiveView({
  sessions, activeChatSessionId, sourceColor,
  draggingSessionId, dragOverFolderId, expandedProjects,
  chatProjects, activeChatFolderId,
  onToggleProject, onSetActiveFolder, onDeleteProject, onRenameProject,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onDeleteSession, onOpenSession, onRenameSession, onDuplicateSession,
}: {
  sessions: ChatSession[];
  activeChatSessionId: string | null;
  sourceColor: string;
  draggingSessionId: string | null;
  dragOverFolderId: string | null;
  expandedProjects: Set<string>;
  chatProjects: ChatProject[];
  activeChatFolderId: string | null;
  onToggleProject: (id: string) => void;
  onSetActiveFolder: (id: string | null) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDeleteSession: (id: string) => void; onRenameSession: (id: string, title: string) => void; onDuplicateSession: (id: string) => void;
  onOpenSession: (s: ChatSession) => void;
}) {
  return (
    <>
      {chatProjects.map((project) => {
        const projectSessions = sessions.filter((s) => s.projectId === project.id);
        const expanded = expandedProjects.has(project.id);
        const isActiveFolder = activeChatFolderId === project.id;
        const isDropTarget = dragOverFolderId === project.id;
        return (
          <div key={project.id} className="mb-1">
            <div
              className={cn(
                "group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-all",
                isDropTarget
                  ? `bg-${project.color}/25 border border-${project.color}/60`
                  : isActiveFolder
                    ? `bg-${project.color}/15 border border-${project.color}/40`
                    : "hover:bg-axiom-panel/60 border border-transparent",
              )}
              onClick={() => { onToggleProject(project.id); onSetActiveFolder(isActiveFolder ? null : project.id); }}
              onDragOver={(e) => onDragOver(e, project.id)}
              onDragLeave={(e) => onDragLeave(e, project.id)}
              onDrop={(e) => onDrop(e, project.id)}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {expanded ? <ChevronDown className="w-3 h-3 text-axiom-dim shrink-0" /> : <ChevronRight className="w-3 h-3 text-axiom-dim shrink-0" />}
                <Folder className={cn("w-3.5 h-3.5 shrink-0", `text-${project.color}`)} />
                {/* Rename via RenameableText: double-click or right-click → Rename.
                    Enter = Save, Escape = Cancel, blur = Save. */}
                <RenameableText
                  value={project.name}
                  onSave={(newName) => onRenameProject(project.id, newName)}
                  className={cn("text-xs font-medium", isActiveFolder || isDropTarget ? `text-${project.color}` : "text-axiom-text")}
                  inputClassName="text-xs font-medium"
                />
                <span className="text-[9px] text-axiom-dim/50 shrink-0">{projectSessions.length}</span>
                {isActiveFolder && <span className={cn("w-1.5 h-1.5 rounded-full bg-current axiom-pulse-ring shrink-0", `text-${project.color}`)} />}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) { onDeleteProject(project.id); if (isActiveFolder) onSetActiveFolder(null); } }}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-axiom-rose/30 flex items-center justify-center text-axiom-dim hover:text-axiom-rose shrink-0"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="ml-4 border-l border-axiom-edge/30 pl-1">
                    {projectSessions.map((s) => (
                      <SessionItem key={s.id} session={s} isActive={activeChatSessionId === s.id} isDragging={draggingSessionId === s.id} color={sourceColor} onDragStart={(e) => onDragStart(e, s.id)} onDragEnd={onDragEnd} onDelete={() => onDeleteSession(s.id)} onOpen={() => onOpenSession(s)} onRename={(t) => onRenameSession(s.id, t)} onDuplicate={() => onDuplicateSession(s.id)} />
                    ))}
                    {projectSessions.length === 0 && <div className="px-2 py-1.5 text-[10px] text-axiom-dim/50 italic">{isDropTarget ? "Drop here…" : "No sessions yet"}</div>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Unfiled */}
      <div className="mt-3">
        <div
          className={cn("px-2 py-1 text-[9px] uppercase tracking-[0.2em] rounded transition-colors", dragOverFolderId === UNFILED_DROP_ID ? "text-axiom-cyan bg-axiom-cyan/10 border border-axiom-cyan/30" : "text-axiom-dim/70 border border-transparent")}
          onDragOver={(e) => onDragOver(e, UNFILED_DROP_ID)}
          onDragLeave={(e) => onDragLeave(e, UNFILED_DROP_ID)}
          onDrop={(e) => onDrop(e, UNFILED_DROP_ID)}
        >
          Unfiled {dragOverFolderId === UNFILED_DROP_ID ? "← drop here" : ""}
        </div>
        {sessions.filter((s) => !s.projectId).map((s) => (
          <SessionItem key={s.id} session={s} isActive={activeChatSessionId === s.id} isDragging={draggingSessionId === s.id} color={sourceColor} onDragStart={(e) => onDragStart(e, s.id)} onDragEnd={onDragEnd} onDelete={() => onDeleteSession(s.id)} onOpen={() => onOpenSession(s)} onRename={(t) => onRenameSession(s.id, t)} onDuplicate={() => onDuplicateSession(s.id)} />
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// View: Agent Hub — grouped by Agent identity or Council
// ═══════════════════════════════════════════════════════════════════════════

function AgentHubArchiveView({
  sessions, activeChatSessionId, installedAgents,
  councils, activeCouncilId, setActiveCouncil,
  onDeleteSession, onOpenSession, onRenameSession, onDuplicateSession,
}: {
  sessions: ChatSession[];
  activeChatSessionId: string | null;
  installedAgents: { id: string; name: string; glyph: string; color: string }[];
  councils: { id: string; name: string; memberIds: string[]; messages: { ts: number; content: string; pending?: boolean }[]; updatedAt: number }[];
  activeCouncilId: string | null;
  setActiveCouncil: (id: string | null) => void;
  onDeleteSession: (id: string) => void; onRenameSession: (id: string, title: string) => void; onDuplicateSession: (id: string) => void;
  onOpenSession: (s: ChatSession) => void;
}) {
  // Group sessions by agentId
  const grouped = useMemo(() => {
    const map = new Map<string, ChatSession[]>();
    for (const s of sessions) {
      const key = s.agentId ?? "__unknown__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  return (
    <>
      {/* Agent Councils section */}
      {councils.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-axiom-violet/70 px-2 py-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> Agent Councils
          </div>
          {councils.map((council) => {
            const lastMsg = council.messages.length > 0
              ? council.messages[council.messages.length - 1]
              : null;
            const preview = lastMsg && !lastMsg.pending
              ? lastMsg.content.slice(0, 40)
              : null;
            const isActive = activeCouncilId === council.id;
            return (
              <div
                key={council.id}
                className={cn(
                  "flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer transition-all border mb-0.5",
                  isActive
                    ? "bg-axiom-violet/10 border-axiom-violet/30"
                    : "hover:bg-axiom-panel/60 border-transparent",
                )}
                onClick={() => setActiveCouncil(council.id)}
              >
                <span className="text-sm mt-0.5 shrink-0">🌐</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-axiom-text truncate font-medium">{council.name}</div>
                  {preview && <div className="text-[10px] text-axiom-dim truncate mt-0.5">{preview}</div>}
                  <div className="text-[9px] text-axiom-dim/50 mt-0.5 flex items-center gap-1.5">
                    <span>{council.memberIds.length} agents</span>
                    <span>·</span>
                    <span>{council.messages.length} msg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider between councils and sessions */}
      {councils.length > 0 && grouped.size > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex-1 h-px bg-axiom-edge/30" />
          <span className="text-[8px] text-axiom-dim/50 uppercase tracking-wider">Individual Sessions</span>
          <div className="flex-1 h-px bg-axiom-edge/30" />
        </div>
      )}

      {/* Agent-grouped sessions */}
      {Array.from(grouped.entries()).map(([agentId, agentSessions]: [string, ChatSession[]]) => {
        const agent = installedAgents.find((a) => a.id === agentId);
        const label = agent ? agent.name : "Unknown Agent";
        const glyph = agent ? agent.glyph : "🤖";
        const color = agent ? agent.color : "axiom-dim";

        return (
          <div key={agentId} className="mb-3">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <GlyphRenderer glyph={glyph} className={cn("text-sm", `text-${color}`)} />
              <span className={cn("text-xs font-medium", `text-${color}`)}>{label}</span>
              <span className="text-[9px] text-axiom-dim/50 ml-auto">{agentSessions.length}</span>
            </div>
            <div className="ml-3 border-l border-axiom-edge/20 pl-1 space-y-0.5">
              {agentSessions.map((s) => (
                <SessionItem key={s.id} session={s} isActive={activeChatSessionId === s.id} color={color} onDragStart={(e) => {}} onDragEnd={() => {}} onDelete={() => onDeleteSession(s.id)} onOpen={() => onOpenSession(s)} onRename={(t) => onRenameSession(s.id, t)} onDuplicate={() => onDuplicateSession(s.id)} />
              ))}
            </div>
          </div>
        );
      })}

      {sessions.length === 0 && councils.length === 0 && (
        <div className="text-center py-6 text-axiom-dim">
          <Bot className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
          <p className="text-[10px]">No agent sessions yet.</p>
          <p className="text-[9px] text-axiom-dim/50 mt-0.5">Chat sessions with agents will appear here.</p>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// View: Workflows — context-aware project archive with folder support
// ═══════════════════════════════════════════════════════════════════════════

function WorkflowsArchiveView({
  sessions, workflows, activeChatSessionId,
  draggingSessionId, dragOverFolderId, expandedProjects,
  chatProjects, activeChatFolderId,
  onToggleProject, onSetActiveFolder, onDeleteProject,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
  onDeleteSession, onOpenSession, onRenameSession, onDuplicateSession,
  workflowProjects,
  workflowFolders,
  openWorkflowTabs,
  archiveLabel,
  activeWorkflowTabId,
  onCreateProject,
  onCreateFolder,
  onOpenProject,
  onMoveProject,
  onRenameProject,
  onRenameFolder,
}: {
  sessions: ChatSession[];
  workflows: { id: string; name: string; steps: { status?: string }[]; runStatus?: string; lastRunAt?: number }[];
  activeChatSessionId: string | null;
  draggingSessionId: string | null;
  dragOverFolderId: string | null;
  expandedProjects: Set<string>;
  chatProjects: ChatProject[];
  activeChatFolderId: string | null;
  onToggleProject: (id: string) => void;
  onSetActiveFolder: (id: string | null) => void;
  onDeleteProject: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDeleteSession: (id: string) => void; onRenameSession: (id: string, title: string) => void; onDuplicateSession: (id: string) => void;
  onOpenSession: (s: ChatSession) => void;
  workflowProjects?: { id: string; name: string; toolId: string; description?: string; lastModified: number; folderId?: string }[];
  workflowFolders?: { id: string; name: string; toolId: string; createdAt: number }[];
  openWorkflowTabs?: { projectId: string; toolId: string; title: string; color: string; iconName?: string; instanceUrl: string; openedAt: number }[];
  archiveLabel?: string;
  activeWorkflowTabId?: string | null;
  onCreateProject?: (name: string) => void;
  onCreateFolder?: (name: string) => void;
  onOpenProject?: (projectId: string) => void;
  onMoveProject?: (projectId: string, folderId: string | null) => void;
  onRenameProject?: (projectId: string, name: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectInputName, setNewProjectInputName] = useState("");
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [wfDragOverFolderId, setWfDragOverFolderId] = useState<string | null>(null);

  // Resolve the active tab's toolId for proper filtering + coloring
  const activeTab = openWorkflowTabs?.find((t) => t.projectId === activeWorkflowTabId);
  const activeToolId = activeTab?.toolId;
  const toolColor = activeToolId === "n8n" ? "axiom-rose" : activeToolId === "langflow" ? "axiom-violet" : "axiom-cyan";

  // Group projects by folder
  const unfiledProjects = workflowProjects?.filter((p) => !p.folderId) ?? [];
  const filedProjects = workflowFolders?.map((folder) => ({
    folder,
    projects: workflowProjects?.filter((p) => p.folderId === folder.id) ?? [],
  })) ?? [];

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <>
      {/* ── Header ── */}
      {activeWorkflowTabId && (
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <div className={cn("text-[9px] uppercase tracking-[0.2em] flex items-center gap-1.5", `text-${toolColor}/80`)}>
            <GitBranch className="w-3 h-3" /> {archiveLabel}
          </div>
        </div>
      )}

      {/* ── Folders with projects (droppable) ── */}
      {filedProjects.map(({ folder, projects: fProjects }) => (
        <div
          key={folder.id}
          className={cn("mb-2 rounded-md transition-colors", wfDragOverFolderId === folder.id && "bg-axiom-violet/10")}
          onDragOver={(e) => { if (onMoveProject) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setWfDragOverFolderId(folder.id); } }}
          onDragLeave={() => { if (wfDragOverFolderId === folder.id) setWfDragOverFolderId(null); }}
          onDrop={(e) => {
            e.preventDefault();
            const projectId = e.dataTransfer.getData("text/plain") || draggingProjectId;
            if (projectId && onMoveProject) onMoveProject(projectId, folder.id);
            setDraggingProjectId(null);
            setWfDragOverFolderId(null);
          }}
        >
          <button
            onClick={() => setExpandedFolders((s) => { const ns = new Set(s); if (ns.has(folder.id)) { ns.delete(folder.id); } else { ns.add(folder.id); } return ns; })}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-axiom-dim/70 hover:text-axiom-text transition-colors"
          >
            {expandedFolders.has(folder.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <FolderOpen className="w-3 h-3" />
            {/* Rename via RenameableText: double-click or right-click → Rename.
                Enter = Save, Escape = Cancel, blur = Save. */}
            <RenameableText
              value={folder.name}
              onSave={onRenameFolder ? (newName) => onRenameFolder(folder.id, newName) : undefined}
              className="normal-case tracking-normal text-xs"
              inputClassName="text-xs normal-case tracking-normal"
            />
            <span className="text-axiom-dim/40 normal-case">{fProjects.length}</span>
          </button>
          {expandedFolders.has(folder.id) && fProjects.map((p) => (
            <ProjectItem key={p.id} project={p} toolColor={toolColor} onOpen={onOpenProject} onRename={onRenameProject} formatTime={formatTime} draggable={!!onMoveProject} onDragStart={(id) => setDraggingProjectId(id)} />
          ))}
        </div>
      ))}

      {/* ── Unfiled projects (droppable — drop here to remove from folder) ── */}
      <div
        className={cn("space-y-1 mb-3 rounded-md transition-colors", wfDragOverFolderId === "unfiled" && "bg-axiom-violet/10")}
        onDragOver={(e) => { if (onMoveProject) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setWfDragOverFolderId("unfiled"); } }}
        onDragLeave={() => { if (wfDragOverFolderId === "unfiled") setWfDragOverFolderId(null); }}
        onDrop={(e) => {
          e.preventDefault();
          const projectId = e.dataTransfer.getData("text/plain") || draggingProjectId;
          if (projectId && onMoveProject) onMoveProject(projectId, null);
          setDraggingProjectId(null);
          setWfDragOverFolderId(null);
        }}
      >
        {unfiledProjects.length > 0 && unfiledProjects.map((p) => (
          <ProjectItem key={p.id} project={p} toolColor={toolColor} onOpen={onOpenProject} onRename={onRenameProject} formatTime={formatTime} draggable={!!onMoveProject} onDragStart={(id) => setDraggingProjectId(id)} />
        ))}
      </div>

      {/* ── Saved Workflow Blueprints (existing pipeline workflows) ── */}
      {workflows.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-axiom-dim/70 px-2 py-1.5 flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" /> Saved Blueprints
          </div>
          {workflows.map((wf) => (
            <div key={wf.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-axiom-panel/60 border border-transparent hover:border-axiom-violet/30 transition-colors mb-0.5">
              <GitBranch className="w-3.5 h-3.5 text-axiom-violet shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-axiom-text truncate">{wf.name}</div>
                <div className="text-[9px] text-axiom-dim/60">{wf.steps.length} steps</div>
              </div>
              <span className={cn("text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider border",
                wf.runStatus === "running" ? "text-axiom-emerald border-axiom-emerald/40 bg-axiom-emerald/10" :
                wf.runStatus === "done" ? "text-axiom-cyan border-axiom-cyan/40 bg-axiom-cyan/10" :
                wf.runStatus === "error" ? "text-axiom-rose border-axiom-rose/40 bg-axiom-rose/10" :
                "text-axiom-dim border-axiom-edge/40")}>
                {wf.runStatus ?? "idle"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!activeWorkflowTabId && workflowProjects && workflowProjects.length === 0 && workflows.length === 0 && sessions.length === 0 && (
        <div className="text-center py-12 text-axiom-dim">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No workflow data yet.</p>
        </div>
      )}
    </>
  );
}

// ── Project item (clickable) ─────────────────────────────────────────────────

function ProjectItem({
  project,
  toolColor,
  onOpen,
  onRename,
  formatTime,
  draggable,
  onDragStart,
}: {
  project: { id: string; name: string; toolId: string; description?: string; lastModified: number };
  toolColor: string;
  onOpen?: (projectId: string) => void;
  onRename?: (projectId: string, name: string) => void;
  formatTime: (ts: number) => string;
  draggable?: boolean;
  onDragStart?: (projectId: string) => void;
}) {
  return (
    <div
      onClick={() => onOpen?.(project.id)}
      draggable={draggable}
      onDragStart={(e) => { if (onDragStart) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", project.id); onDragStart(project.id); } }}
      className={cn(
        "px-2 py-1.5 rounded-md transition-colors group cursor-pointer",
        onOpen ? "hover:bg-axiom-panel/40" : "",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("text-[8px] px-1 py-0.5 rounded uppercase tracking-wider shrink-0",
          project.toolId === "n8n" ? "bg-axiom-rose/15 text-axiom-rose" : "bg-axiom-violet/15 text-axiom-violet")}>
          {project.toolId}
        </span>
        {/* Rename via RenameableText: double-click or right-click → Rename.
            Enter = Save, Escape = Cancel, blur = Save. */}
        <RenameableText
          value={project.name}
          onSave={onRename ? (newName) => onRename(project.id, newName) : undefined}
          className="text-xs text-axiom-text flex-1 min-w-0"
          inputClassName="text-xs"
        />
      </div>
      {project.description && (
        <p className="text-[10px] text-axiom-dim/60 mt-0.5 truncate">{project.description}</p>
      )}
      <p className="text-[9px] text-axiom-dim/40 mt-0.5">{formatTime(project.lastModified)}</p>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// Shared Session Item
// ═══════════════════════════════════════════════════════════════════════════

function SessionItem({
  session, isActive, isDragging, color, showAgentBadge,
  onDragStart, onDragEnd, onDelete, onOpen, onRename, onDuplicate,
}: {
  session: ChatSession;
  isActive?: boolean;
  isDragging?: boolean;
  color: string;
  showAgentBadge?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onRename: (newTitle: string) => void;
  onDuplicate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div
      className={cn(
        "group flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer transition-all",
        isDragging && "opacity-40",
        isActive
          ? `bg-${color}/10 border border-${color}/30`
          : "hover:bg-axiom-panel/60 border border-transparent",
      )}
      onClick={(e) => onOpen()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(true); }}
    >
      <span className={cn("text-xs mt-0.5 shrink-0", `text-${color}`)}>
        {session.source === "workflows" ? "⚡" : "💬"}
      </span>
      <div className="flex-1 min-w-0">
        {/* Rename is handled by RenameableText: double-click or right-click → Rename.
            Enter = Save, Escape = Cancel, blur = Save. */}
        <RenameableText
          value={session.title}
          onSave={onRename}
          className={cn("text-xs font-medium", isActive ? `text-${color}` : "text-axiom-text")}
          inputClassName="w-full font-medium"
        />
        {session.preview && (
          <div className="text-[10px] text-axiom-dim truncate mt-0.5">{session.preview}</div>
        )}
        <div className="text-[9px] text-axiom-dim/50 mt-0.5 flex items-center gap-1.5">
          <span className="capitalize">{session.source}</span>
          <span>·</span>
          <span>{timeAgo(session.updatedAt)}</span>
          <span>·</span>
          <span>{session.messages.length} msg</span>
        </div>
      </div>
      {showAgentBadge && session.agentId && (
        <span className="text-[8px] px-1 py-0.5 rounded bg-axiom-emerald/10 text-axiom-emerald border border-axiom-emerald/30 shrink-0">
          {session.agentId}
        </span>
      )}
      {/* Three-dot menu button — Duplicate + Delete only.
          Rename is handled by RenameableText (double-click / right-click on the title). */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          onDragStart={(e) => e.preventDefault()}
          className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-axiom-panel flex items-center justify-center text-axiom-dim hover:text-axiom-text"
          title="More options"
        >
          <MoreVertical className="w-2.5 h-2.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-5 z-50 w-32 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl py-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDuplicate(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-axiom-text hover:bg-axiom-cyan/10 transition-colors text-left"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-axiom-rose hover:bg-axiom-rose/10 transition-colors text-left"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { VibeLanguage, WorkspaceType, WorkspaceFile, DevLabWorkspace } from "@/lib/axiom/types";
import { AutoGrowTextarea } from "@/components/axiom/AutoGrowTextarea";
import {
  Play, Plus, Trash2, FileCode2, FileText, FileTerminal, Loader2, Save,
  Brain, Send, Wand2, Bot, Zap, Check, Palette, FolderOpen, ChevronRight,
  X, ArrowLeft, Clock, FileCode, Shield, Box, Eye, MonitorSmartphone, XCircle, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion } from "framer-motion";
import {
  DesignerModeToggle,
  DesignerStudio,
  rewriteCssInSource,
  type SelectedElement,
} from "../DesignerStudio";
import PublishAppModal from "../PublishAppModal";

// ── Constants ────────────────────────────────────────────────────────────────

const LANG_LABEL: Record<VibeLanguage, string> = {
  javascript: "JavaScript",
  python: "Python (sim)",
  prompt: "Prompt",
  typescript: "TypeScript",
  markdown: "Markdown",
};

const LANG_ICON: Record<VibeLanguage, typeof FileCode2> = {
  javascript: FileCode2,
  python: FileTerminal,
  prompt: FileText,
  typescript: FileCode2,
  markdown: FileText,
};

const LANG_COLOR: Record<VibeLanguage, string> = {
  javascript: "axiom-amber",
  python: "axiom-emerald",
  prompt: "axiom-violet",
  typescript: "axiom-cyan",
  markdown: "axiom-dim",
};

const PRISM_LANG: Record<VibeLanguage, string> = {
  javascript: "javascript",
  python: "python",
  prompt: "markdown",
  typescript: "typescript",
  markdown: "markdown",
};

function langFromFilename(name: string): VibeLanguage {
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".prompt")) return "prompt";
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
  if (name.endsWith(".md")) return "markdown";
  return "javascript";
}

// ── System Architect Prompts ──────────────────────────────────────────────
// Core Extension workspaces communicate with Axiom (the System Architect).
// Sandboxed App workspaces use Forge (the Application Developer).
// Integrations is NOT a DevLab workspace — it lives at /integrations.

const AXIOM_CORE_PROMPT = `You are Axiom, the System Architect of Axiom OS. You rewrite live layout components, pages, and core logic of a running operating system. The user will ask you to modify Axiom OS's OWN source code.

CRITICAL RULES:
- You MUST NEVER alter, refactor, delete, or edit any code or UI mechanics tied to the Designer Mode engine. Designer Mode is a read-only parameter layer.
- You may READ Designer Mode styles for layout continuity, but cannot touch the source editor code.
- Reply with ONLY fenced code block(s) containing the COMPLETE updated file content. If generating multiple files, use separate fenced blocks with the filename as a comment on the first line of each block.
- Match the existing dark cyberpunk aesthetic (axiom-cyan/emerald/amber/violet/rose colors, deep-space palette, neon accents).
- Preserve existing structure unless the instruction asks otherwise.`;

const FORGE_APP_PROMPT = `You are Forge, the Application Developer. You write self-contained logic for independent sandboxed applications. The user is building an app inside an isolated workspace.

CRITICAL RULES:
- You MUST NEVER alter, refactor, delete, or edit any code or UI mechanics tied to the Designer Mode engine. Designer Mode is a read-only parameter layer.
- You may READ Designer Mode styles for layout continuity, but cannot touch the source editor code.
- Reply with ONLY fenced code block(s) containing COMPLETE file content. If generating multiple files, use separate fenced blocks with the filename as a comment on the first line.
- Each code block should start with a comment like: // filename: components/App.tsx
- Write clean, self-contained code that works independently.`;

// ── Main Component ───────────────────────────────────────────────────────────

export default function DevLabPage() {
  const {
    // Workspace API
    devlabWorkspaces,
    activeWorkspaceId,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    switchWorkspace,
    closeWorkspace,
    addWorkspaceFile,
    updateWorkspaceFile,
    deleteWorkspaceFile,
    setActiveWorkspaceFile,
    appendWorkspaceMessage,
    updateWorkspaceMessage,
    pushWorkspaceLog,
    clearWorkspaceLogs,
    addGeneratedFiles,
    // Legacy VibeCode (for core-extension system files)
    vibeFiles,
    activeVibeFileId,
    updateVibeFile,
    setActiveVibeFile,
    pushVibeLog,
    clearVibeLogs,
    devlabTab,
    setDevlabTab,
    // Graph
    addNode,
    linkNodes,
    graph,
  } = useAxiom();

  // ── Local state (only what's allowed) ──
  const [chatInput, setChatInput] = useState("");
  const [forgeBusy, setForgeBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [designerMode, setDesignerMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // ── Refs ──
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumsRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const workspace = devlabWorkspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  // Purge designerMode + live preview when switching workspaces
  useEffect(() => {
    setDesignerMode(false);
    setSelectedElement(null);
    setShowLivePreview(false);
  }, [activeWorkspaceId]);

  // For core-extension: merge system vibeFiles + workspace files
  const systemVibeFiles = useMemo(() => vibeFiles.filter((f) => f.isSystemFile), [vibeFiles]);

  // Compute the effective file list for the file tree
  const treeFiles = useMemo(() => {
    if (!workspace) return [];
    if (workspace.type === "core-extension") {
      // System files (from legacy vibeFiles) + workspace-specific files
      const sysFiles: WorkspaceFile[] = systemVibeFiles.map((vf) => ({
        id: vf.id,
        name: vf.name,
        language: vf.language,
        source: vf.source,
        updatedAt: vf.updatedAt,
        folderPath: vf.folder ?? "",
        systemPath: vf.systemPath,
        description: vf.description,
      }));
      return [...sysFiles, ...workspace.files];
    }
    // Sandboxed app: only workspace files
    return workspace.files;
  }, [workspace, systemVibeFiles]);

  // Determine if a file ID belongs to legacy vibeFiles (for core-extension)
  const isSystemFile = (fileId: string) => {
    if (!workspace || workspace.type !== "core-extension") return false;
    return systemVibeFiles.some((f) => f.id === fileId);
  };

  // Active file: check workspace files first, then legacy for core-extension
  const activeFile = useMemo(() => {
    if (!workspace) return null;
    // Check workspace files
    const wf = workspace.files.find((f) => f.id === workspace.activeFileId);
    if (wf) return { ...wf, isSystemFile: false };
    // For core-extension, check legacy vibeFiles
    if (workspace.type === "core-extension") {
      const vf = systemVibeFiles.find((f) => f.id === workspace.activeFileId);
      if (vf) return { ...vf, isSystemFile: true };
      // Also check by activeVibeFileId
      const avf = vibeFiles.find((f) => f.id === activeVibeFileId);
      if (avf) return { ...avf, isSystemFile: true };
    }
    return null;
  }, [workspace, systemVibeFiles, activeVibeFileId, vibeFiles]);

  // Editor source / update helpers (handles both workspace files and legacy vibeFiles)
  const activeFileSource = activeFile?.source ?? "";

  const updateActiveFileSource = (newSource: string) => {
    if (!workspace || !activeFile) return;
    if (isSystemFile(activeFile.id)) {
      updateVibeFile(activeFile.id, { source: newSource });
    } else {
      updateWorkspaceFile(workspace.id, activeFile.id, { source: newSource });
    }
  };

  const selectFile = (fileId: string) => {
    if (!workspace) return;
    if (isSystemFile(fileId)) {
      setActiveVibeFile(fileId);
      setActiveWorkspaceFile(workspace.id, fileId);
    } else {
      setActiveWorkspaceFile(workspace.id, fileId);
    }
  };

  // Line numbers
  const lineCount = activeFileSource.split("\n").length;
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1),
    [lineCount],
  );

  // ── Scroll sync ──
  const onEditorScroll = () => {
    if (!editorRef.current) return;
    const ta = editorRef.current;
    const top = ta.scrollTop;
    if (lineNumsRef.current) lineNumsRef.current.scrollTop = top;
    if (highlightRef.current) {
      const taMax = ta.scrollHeight - ta.clientHeight;
      const hlMax = highlightRef.current.scrollHeight - highlightRef.current.clientHeight;
      if (taMax > 0 && hlMax > 0) {
        highlightRef.current.scrollTop = (top / taMax) * hlMax;
      } else {
        highlightRef.current.scrollTop = 0;
      }
    }
  };

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatScrollRef.current && workspace) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [workspace?.messages.length]);

  // ── Keyboard handlers ──
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = ta.value.slice(0, start) + "  " + ta.value.slice(end);
      updateActiveFileSource(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (workspace && activeFile) {
        pushWorkspaceLog(workspace.id, { level: "info", text: `✓ saved ${activeFile.name}` });
      }
    }
  };

  // ── Run ──
  const run = async () => {
    if (!activeFile || !workspace || running) return;
    setRunning(true);
    setDevlabTab("console");
    pushWorkspaceLog(workspace.id, { level: "info", text: `▸ running ${activeFile.name} (${activeFile.language})…` });
    try {
      const res = await fetch("/api/axiom/vibecode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: activeFile.language, source: activeFileSource }),
      });
      const data = await res.json();
      if (activeFile.language === "javascript") {
        if (data.logs?.length) for (const l of data.logs) pushWorkspaceLog(workspace.id, { level: l.level, text: l.text });
        if (data.ok && data.result) {
          pushWorkspaceLog(workspace.id, { level: "result", text: `→ ${data.result}` });
          try {
            const parsed = JSON.parse(data.result);
            if (parsed && typeof parsed === "object" && parsed.label) {
              const id = addNode({ label: parsed.label, kind: parsed.kind ?? "artifact", content: parsed.content ?? `output of ${activeFile.name}` });
              const fileNode = graph.nodes.find((n) => n.label === activeFile.name);
              if (fileNode) linkNodes(fileNode.id, id, "produces");
              pushWorkspaceLog(workspace.id, { level: "info", text: `✦ artifact "${parsed.label}" written to memory graph` });
            }
          } catch { /* not JSON */ }
        }
        if (!data.ok && data.error) pushWorkspaceLog(workspace.id, { level: "error", text: `✗ ${data.error}` });
      } else if (activeFile.language === "python") {
        if (data.ok) pushWorkspaceLog(workspace.id, { level: "stdout", text: data.stdout || "(no output)" });
        else pushWorkspaceLog(workspace.id, { level: "error", text: data.error || "execution failed" });
      } else if (activeFile.language === "prompt") {
        if (data.ok) pushWorkspaceLog(workspace.id, { level: "result", text: data.reply });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      pushWorkspaceLog(workspace.id, { level: "error", text: `network error: ${msg}` });
    } finally {
      setRunning(false);
      pushWorkspaceLog(workspace.id, { level: "info", text: `▸ done.` });
    }
  };

  // ── State purge on workspace switch ──
  useEffect(() => {
    // Always clear transient UI state when workspace changes
    setDesignerMode(false);
    setShowLivePreview(false);
    setSelectedElement(null);
    setChatInput("");
    setForgeBusy(false);
    setRunning(false);
  }, [activeWorkspaceId]);

  // ── Send to Forge ──
  const sendToForge = async () => {
    if (!chatInput.trim() || !workspace || forgeBusy) return;
    const instruction = chatInput.trim();
    setChatInput("");
    setForgeBusy(true);

    const userMsgId = Math.random().toString(36).slice(2);
    const pendingId = Math.random().toString(36).slice(2);

    appendWorkspaceMessage(workspace.id, { id: userMsgId, role: "user", content: instruction });
    appendWorkspaceMessage(workspace.id, { id: pendingId, role: "forge", content: "", pending: true });

    // Core Extension → Axiom (System Architect).
    // Sandboxed App → Forge (Application Developer).
    // This is the single routing decision: system-level work ALWAYS goes to
    // Axiom, never Forge.
    const isSystemWorkspace = workspace.type === "core-extension";
    const systemPrompt = isSystemWorkspace ? AXIOM_CORE_PROMPT : FORGE_APP_PROMPT;
    const role = isSystemWorkspace ? "System Architect" : "Application Developer";
    const agentId = isSystemWorkspace ? "axiom-system" : "forge";
    const agentName = isSystemWorkspace ? "Axiom" : "Forge";

    // Build context payload — works with or without an active file
    const fileContext = activeFile
      ? `Current file: ${activeFile.name}\nLanguage: ${activeFile.language}\n\n---\nSource:\n\n${activeFileSource}\n\n---\n`
      : `No file currently open. Workspace has ${workspace.files.length} file(s).\n\n`;

    try {
      const res = await fetch("/api/axiom/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          agentName,
          role,
          systemPrompt,
          messages: [],
          userMessage: `${fileContext}Instruction: ${instruction}`,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply || "…";

      // Extract multiple code blocks: ```language\n// filename: X\n...```
      const blockRegex = /```(\w+)\n(?:\/\/\s*filename:\s*(\S+)\n)?([\s\S]*?)```/g;
      let match: RegExpExecArray | null;
      const extractedFiles: { name: string; language: VibeLanguage; source: string; folderPath?: string }[] = [];
      let singleBlockSource: string | null = null;
      let singleBlockFilename: string | null = null;

      while ((match = blockRegex.exec(reply)) !== null) {
        const lang = match[1];
        const fname = match[2] || null;
        const code = match[3].replace(/\n$/, "");
        if (fname) {
          extractedFiles.push({
            name: fname,
            language: langFromFilename(fname),
            source: code,
            folderPath: fname.includes("/") ? fname.substring(0, fname.lastIndexOf("/")) : "",
          });
        } else if (!singleBlockSource) {
          singleBlockSource = code;
          singleBlockFilename = null;
        }
      }

      if (extractedFiles.length > 0) {
        // Multi-file response — add generated files to workspace
        addGeneratedFiles(workspace.id, extractedFiles);
        const fileNames = extractedFiles.map((f) => `\`${f.name}\``).join(", ");
        updateWorkspaceMessage(workspace.id, pendingId, {
          content: `✓ Generated ${extractedFiles.length} file(s): ${fileNames}\n\n${reply}`,
          pending: false,
        });
        pushWorkspaceLog(workspace.id, {
          level: "info",
          text: `✦ ${agentName} generated ${extractedFiles.length} file(s): ${fileNames}`,
        });
      } else if (singleBlockSource && activeFile && !isSystemFile(activeFile.id)) {
        // Single block — update the active workspace file
        updateWorkspaceFile(workspace.id, activeFile.id, { source: singleBlockSource });
        updateWorkspaceMessage(workspace.id, pendingId, {
          content: `✓ Updated \`${activeFile.name}\` per your instruction.\n\n${reply}`,
          pending: false,
        });
        pushWorkspaceLog(workspace.id, {
          level: "info",
          text: `✦ ${agentName} rewrote ${activeFile.name} (${singleBlockSource.split("\n").length} lines)`,
        });
      } else if (singleBlockSource && activeFile && isSystemFile(activeFile.id)) {
        // Single block for system file — use legacy update
        updateVibeFile(activeFile.id, { source: singleBlockSource });
        updateWorkspaceMessage(workspace.id, pendingId, {
          content: `✓ Updated system file \`${activeFile.name}\`.\n\n${reply}`,
          pending: false,
        });
        pushWorkspaceLog(workspace.id, {
          level: "info",
          text: `✦ ${agentName} rewrote system file ${activeFile.name} (${singleBlockSource.split("\n").length} lines)`,
        });
      } else {
        // No code block, or no active file — just text reply
        updateWorkspaceMessage(workspace.id, pendingId, { content: reply, pending: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateWorkspaceMessage(workspace.id, pendingId, { content: `⚠️ ${msg}`, pending: false });
    } finally {
      setForgeBusy(false);
    }
  };

  // ── Designer Mode actions ──
  const applyStyle = (property: string, value: string) => {
    if (!selectedElement || !activeFile || !workspace) return;
    try { selectedElement.element?.style.setProperty(property, value); } catch { /* ignore */ }
    const newSource = rewriteCssInSource(activeFileSource, selectedElement.selector, property, value);
    updateActiveFileSource(newSource);
    pushWorkspaceLog(workspace.id, { level: "info", text: `🎨 ${selectedElement.selector} { ${property}: ${value}; }` });
  };

  const clearSelection = () => {
    if (selectedElement?.element?.ownerDocument) {
      selectedElement.element.ownerDocument
        .querySelectorAll(".__designer_selected")
        .forEach((n) => n.classList.remove("__designer_selected"));
    }
    setSelectedElement(null);
  };

  // ── File creation ──
  const handleCreateFile = () => {
    if (!workspace) return;
    const name = prompt("File name (e.g. index.tsx):");
    if (!name) return;
    const lang = langFromFilename(name);
    addWorkspaceFile(workspace.id, name, lang);
  };

  // ── Console logs for active workspace ──
  const activeLogs = workspace?.logs ?? [];

  // ── Folder-grouped file tree ──
  const folderTree = useMemo(() => {
    if (!workspace) return {};
    if (workspace.type === "core-extension") {
      // Group by: system files get no folder grouping, workspace files grouped by folderPath
      const tree: Record<string, WorkspaceFile[]> = { "": [] };
      for (const f of treeFiles) {
        const key = isSystemFile(f.id) ? "" : f.folderPath || "";
        if (!tree[key]) tree[key] = [];
        tree[key].push(f);
      }
      return tree;
    }
    // Sandboxed: group by folderPath
    const tree: Record<string, WorkspaceFile[]> = { "": [] };
    for (const f of treeFiles) {
      const key = f.folderPath || "";
      if (!tree[key]) tree[key] = [];
      tree[key].push(f);
    }
    return tree;
  }, [treeFiles, workspace, isSystemFile]);

  const sortedFolders = useMemo(() => {
    const folders = Object.keys(folderTree).filter(Boolean).sort();
    return ["", ...folders];
  }, [folderTree]);

  // ════════════════════════════════════════════════════════════════════════════
  //  NO WORKSPACE ACTIVE — Landing page
  // ════════════════════════════════════════════════════════════════════════════

  if (!workspace) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 axiom-scroll overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl space-y-8"
        >
          {/* Heading */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-axiom-cyan/15 border border-axiom-cyan/30 flex items-center justify-center">
                <FileCode className="w-4 h-4 text-axiom-cyan" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-axiom-text tracking-tight">
              DevLab — Workspaces
            </h1>
            <p className="text-sm text-axiom-dim leading-relaxed">
              Create an isolated workspace to build. Choose your project type below.
            </p>
          </div>

          {/* Two main cards — quick-create workspaces */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                const name = prompt("Workspace name:", "Core Customization");
                if (name && name.trim()) createWorkspace("core-extension", name.trim());
              }}
              className="p-5 rounded-xl border border-axiom-amber/30 bg-axiom-panel/30 hover:bg-axiom-amber/5 transition-colors text-left group"
            >
              <Shield className="w-6 h-6 text-axiom-amber mb-3" />
              <div className="text-sm font-medium text-axiom-text group-hover:text-axiom-amber transition-colors">
                Core Extension
              </div>
              <div className="text-xs text-axiom-dim mt-1.5 leading-relaxed">
                Access system core files and modify Axiom OS internals. Axiom acts as System Architect.
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                const name = prompt("Workspace name:", "New App");
                if (name && name.trim()) createWorkspace("sandboxed-app", name.trim());
              }}
              className="p-5 rounded-xl border border-axiom-cyan/30 bg-axiom-panel/30 hover:bg-axiom-cyan/5 transition-colors text-left group"
            >
              <Box className="w-6 h-6 text-axiom-cyan mb-3" />
              <div className="text-sm font-medium text-axiom-text group-hover:text-axiom-cyan transition-colors">
                Sandboxed App
              </div>
              <div className="text-xs text-axiom-dim mt-1.5 leading-relaxed">
                Create an isolated workspace with its own files. Forge acts as Application Developer.
              </div>
            </motion.button>
          </div>

          {/* Existing workspaces */}
          {devlabWorkspaces.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">
                  Existing Workspaces
                </span>
                <span className="text-[9px] text-axiom-dim/50">Open archive drawer → to manage</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto axiom-scroll">
                {devlabWorkspaces.map((ws) => (
                  <motion.div
                    key={ws.id}
                    whileHover={{ x: 2 }}
                    onClick={() => switchWorkspace(ws.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-axiom-edge/40 bg-axiom-panel/20 hover:bg-axiom-panel/40 cursor-pointer transition-colors group"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        ws.type === "core-extension"
                          ? "bg-axiom-amber/10 border border-axiom-amber/30"
                          : "bg-axiom-cyan/10 border border-axiom-cyan/30",
                      )}
                    >
                      {ws.type === "core-extension" ? (
                        <Shield className="w-3.5 h-3.5 text-axiom-amber" />
                      ) : (
                        <Box className="w-3.5 h-3.5 text-axiom-cyan" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-axiom-text truncate">{ws.name}</div>
                      <div className="text-[10px] text-axiom-dim flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px] border",
                          ws.type === "core-extension"
                            ? "border-axiom-amber/30 text-axiom-amber/80"
                            : "border-axiom-cyan/30 text-axiom-cyan/80",
                        )}>
                          {ws.type === "core-extension" ? "core" : "app"}
                        </span>
                        <span>{ws.files.length} file{ws.files.length !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(ws.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-axiom-dim group-hover:text-axiom-text transition-colors shrink-0" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  ACTIVE WORKSPACE — Designer Mode (full-bleed)
  // ════════════════════════════════════════════════════════════════════════════

  if (designerMode) {
    return (
      <div className="h-full flex flex-col">
        {/* Slim header — mirrors standard layout: ArrowLeft LEFT, actions RIGHT */}
        <div className="h-9 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-deep/40 shrink-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <button
              onClick={() => closeWorkspace()}
              className="text-axiom-dim hover:text-axiom-text shrink-0"
              title="Back to workspaces"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <Palette className="w-3.5 h-3.5 text-axiom-violet shrink-0" />
            <span className="text-axiom-violet font-medium uppercase tracking-wider text-[10px] shrink-0">
              Designer Studio
            </span>
            <span className="text-axiom-dim text-[9px] truncate">{workspace.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={run}
              disabled={!activeFile || running}
              className={cn(
                "px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors shrink-0",
                running
                  ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim"
                  : "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald hover:bg-axiom-emerald/25",
              )}
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              {running ? "Running" : "Run"}
            </button>
            <DesignerModeToggle
              active={designerMode}
              onToggle={() => { setDesignerMode(false); clearSelection(); }}
            />
          </div>
        </div>
        <DesignerStudio source={activeFile?.source ?? ""} onReset={clearSelection} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  ACTIVE WORKSPACE — Normal IDE layout
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col relative">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="h-9 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-deep/40 shrink-0">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <button
            onClick={() => closeWorkspace()}
            className="text-axiom-dim hover:text-axiom-text shrink-0"
            title="Back to workspaces"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-axiom-text font-medium truncate">{workspace.name}</span>
          <span
            className={cn(
              "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 border",
              workspace.type === "core-extension"
                ? "border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber"
                : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan",
            )}
          >
            {workspace.type === "core-extension" ? "Core Ext" : "App"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* ── CORE workspace: Run first, then Designer Mode ── */}
          {workspace.type === "core-extension" && (
            <>
              <button
                onClick={run}
                disabled={!activeFile || running}
                className={cn(
                  "px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors shrink-0",
                  running
                    ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim"
                    : "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald hover:bg-axiom-emerald/25",
                )}
              >
                {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {running ? "Running" : "Run"}
              </button>
              <DesignerModeToggle
                active={designerMode}
                onToggle={() => setDesignerMode(true)}
              />
            </>
          )}
          {/* ── APP workspace: Live Preview + Publish App (Designer Mode structurally excluded) ── */}
          {workspace.type === "sandboxed-app" && (
            <>
              <button
                onClick={() => setShowPublishModal(true)}
                className="px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors shrink-0 bg-axiom-violet/10 border-axiom-violet/30 text-axiom-violet/80 hover:bg-axiom-violet/20 hover:text-axiom-violet"
              >
                <Rocket className="w-3 h-3" />
                Publish App
              </button>
              <button
                onClick={() => setShowLivePreview((p) => !p)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border transition-colors shrink-0",
                  showLivePreview
                    ? "bg-axiom-cyan/25 border-axiom-cyan/50 text-axiom-cyan"
                    : "bg-axiom-cyan/10 border-axiom-cyan/30 text-axiom-cyan/80 hover:bg-axiom-cyan/20 hover:text-axiom-cyan",
                )}
              >
                {showLivePreview ? <XCircle className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showLivePreview ? "Close Preview" : "Live Preview"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2-column IDE body ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* ═══ File Tree ═══ */}
        <aside className="w-56 border-r border-axiom-edge/40 bg-axiom-deep/60 flex flex-col shrink-0">
          <div className="p-2 border-b border-axiom-edge/40 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Files</span>
            <button
              onClick={handleCreateFile}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-axiom-dim hover:text-axiom-cyan"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto axiom-scroll p-1.5">
            {/* Core-extension: system files section */}
            {workspace.type === "core-extension" && (
              <div className="mb-2">
                <div className="px-2 py-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-axiom-amber/80">
                  <Zap className="w-2.5 h-2.5" />
                  System Core
                </div>
                <div className="space-y-0.5">
                  {treeFiles
                    .filter((f) => isSystemFile(f.id))
                    .map((f) => (
                      <FileTreeItem
                        key={f.id}
                        file={f}
                        isSystem={true}
                        isActive={f.id === workspace.activeFileId}
                        onSelect={() => selectFile(f.id)}
                        onDelete={() => {}}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Workspace files organized by folder */}
            {sortedFolders.map((folder) => {
              const files = folderTree[folder] ?? [];
              if (files.length === 0) return null;
              const isRoot = folder === "";
              const filtered = workspace.type === "core-extension"
                ? files.filter((f) => !isSystemFile(f.id))
                : files;
              if (filtered.length === 0) return null;

              return (
                <div key={folder} className={cn(!isRoot && "mb-2")}>
                  {!isRoot && (
                    <div className="px-2 py-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-axiom-dim/70">
                      <FolderOpen className="w-2.5 h-2.5" />
                      {folder}
                    </div>
                  )}
                  {isRoot && workspace.type === "core-extension" && (
                    <div className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-dim/70">
                      Workspace Files
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {filtered.map((f) => (
                      <FileTreeItem
                        key={f.id}
                        file={f}
                        isSystem={false}
                        isActive={f.id === workspace.activeFileId}
                        onSelect={() => selectFile(f.id)}
                        onDelete={() => {
                          if (confirm(`Delete ${f.name}?`)) deleteWorkspaceFile(workspace.id, f.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-axiom-edge/40 text-[9px] text-axiom-dim space-y-0.5">
            <div>⌘⏎ run · ⌘S save</div>
            <div>Tab inserts 2 spaces</div>
          </div>
        </aside>

        {/* ═══ Editor + Console ═══ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor tab bar */}
          <div className="h-9 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-deep/40 shrink-0">
            <div className="flex items-center gap-2 text-xs min-w-0">
              {activeFile ? (
                <>
                  <FileCode2 className={cn("w-3.5 h-3.5 shrink-0", `text-${LANG_COLOR[activeFile.language]}`)} />
                  <span className="text-axiom-text truncate">{activeFile.name}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                      `text-${LANG_COLOR[activeFile.language]} bg-${LANG_COLOR[activeFile.language]}/10`,
                    )}
                  >
                    {LANG_LABEL[activeFile.language]}
                  </span>
                  {activeFile.isSystemFile && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider bg-axiom-amber/15 border border-axiom-amber/40 text-axiom-amber flex items-center gap-1 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-axiom-amber axiom-pulse-ring" />
                      sys
                    </span>
                  )}
                </>
              ) : (
                <span className="text-axiom-dim">No file selected</span>
              )}
            </div>
            {activeFile && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    updateActiveFileSource(activeFileSource);
                    pushWorkspaceLog(workspace.id, { level: "info", text: `✓ saved ${activeFile.name}` });
                  }}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-axiom-dim hover:text-axiom-cyan"
                  title="Save (⌘S)"
                >
                  <Save className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0 flex bg-axiom-void/60">
            <div
              ref={lineNumsRef}
              className="py-2 px-2 text-right text-[11px] font-mono text-axiom-dim/50 select-none overflow-y-auto h-full"
              style={{ minWidth: 36, scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.axiom-devlab-linenum::-webkit-scrollbar{display:none}`}</style>
              <div className="axiom-devlab-linenum">
                {lineNumbers.map((n) => (
                  <div key={n} className="leading-5">{n}</div>
                ))}
              </div>
            </div>
            <div className="relative flex-1 min-w-0 h-full">
              {activeFile ? (
                <>
                  <div
                    ref={highlightRef}
                    className="absolute inset-0 h-full overflow-y-scroll pointer-events-none"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <style>{`.axiom-devlab-highlight::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
                    <div className="axiom-devlab-highlight h-full">
                      <SyntaxHighlighter
                        language={PRISM_LANG[activeFile.language]}
                        style={vscDarkPlus}
                        customStyle={{
                          background: "transparent",
                          margin: 0,
                          padding: "8px 12px",
                          fontSize: "12px",
                          lineHeight: "20px",
                          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                        }}
                        codeTagProps={{ style: { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" } }}
                      >
                        {activeFileSource}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                  <textarea
                    ref={editorRef}
                    value={activeFileSource}
                    onChange={(e) => updateActiveFileSource(e.target.value)}
                    onScroll={onEditorScroll}
                    onKeyDown={onKeyDown}
                    spellCheck={false}
                    wrap="soft"
                    className="absolute inset-0 w-full h-full bg-transparent border-0 text-transparent caret-axiom-cyan resize-none focus:outline-none px-3 py-2 text-[12px] leading-5 font-mono overflow-y-auto axiom-devlab-editor-scroll"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      boxSizing: "border-box",
                    }}
                  />
                  <style>{`.axiom-devlab-editor-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-axiom-dim text-xs">
                  Select or create a file to start coding.
                </div>
              )}
            </div>
          </div>

          {/* Hot Reload Bar */}
          <HotReloadBar
            isSystemFile={!!activeFile?.isSystemFile}
            fileName={activeFile?.name}
            workspaceType={workspace.type}
          />

          {/* Console */}
          <div className="h-44 border-t border-axiom-edge/40 bg-axiom-deep/60 flex flex-col shrink-0">
            <div className="h-7 border-b border-axiom-edge/40 flex items-center justify-between px-3">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider">
                <button
                  onClick={() => setDevlabTab("console")}
                  className={cn(
                    "py-1 px-1 transition-colors",
                    devlabTab === "console" ? "text-axiom-cyan border-b border-axiom-cyan" : "text-axiom-dim hover:text-axiom-text",
                  )}
                >Console</button>
                <button
                  onClick={() => setDevlabTab("graph")}
                  className={cn(
                    "py-1 px-1 transition-colors",
                    devlabTab === "graph" ? "text-axiom-cyan border-b border-axiom-cyan" : "text-axiom-dim hover:text-axiom-text",
                  )}
                >Graph Output</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-axiom-dim">{activeLogs.length} lines</span>
                <button onClick={() => clearWorkspaceLogs(workspace.id)} className="text-[10px] text-axiom-dim hover:text-axiom-rose">
                  clear
                </button>
              </div>
            </div>
            {devlabTab === "console" ? (
              <div className="flex-1 overflow-y-auto axiom-scroll p-2 font-mono text-[11px] space-y-0.5">
                {activeLogs.length === 0 ? (
                  <p className="text-axiom-dim italic px-1">Console output will appear here. Press Run or ⌘⏎.</p>
                ) : (
                  activeLogs.map((l) => (
                    <div
                      key={l.id}
                      className={cn(
                        "flex gap-2 px-1",
                        l.level === "error" ? "text-axiom-rose"
                          : l.level === "warn" ? "text-axiom-amber"
                          : l.level === "info" ? "text-axiom-cyan/80"
                          : l.level === "result" ? "text-axiom-emerald"
                          : l.level === "stdout" ? "text-axiom-text/80"
                          : "text-axiom-text/70",
                      )}
                    >
                      <span className="text-axiom-dim/40 shrink-0">
                        {new Date(l.ts).toLocaleTimeString("en-GB", { hour12: false })}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{l.text}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto axiom-scroll p-3 text-xs space-y-2">
                <p className="text-axiom-dim text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Brain className="w-3 h-3" /> Auto-written artifacts
                </p>
                {graph.nodes
                  .filter((n) => n.kind === "artifact" || n.kind === "code")
                  .slice(-6)
                  .reverse()
                  .map((n) => (
                    <div key={n.id} className="p-2 rounded bg-axiom-panel/40 border border-axiom-edge/40">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full", n.kind === "code" ? "bg-axiom-emerald" : "bg-axiom-violet")} />
                        <span className="text-axiom-text text-xs">{n.label}</span>
                        <span className="text-[9px] text-axiom-dim ml-auto">{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <pre className="mt-1 text-[10px] font-mono text-axiom-dim overflow-x-auto axiom-scroll">
                        {n.content.slice(0, 240)}{n.content.length > 240 ? "…" : ""}
                      </pre>
                    </div>
                  ))}
                {graph.nodes.filter((n) => n.kind === "artifact" || n.kind === "code").length === 0 && (
                  <p className="text-axiom-dim italic text-[10px]">
                    Run a file that returns an object — its output becomes a memory-graph node.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ Architect AI Chat ═══ */}
        <aside className="w-80 border-l border-axiom-edge/40 bg-axiom-deep/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-axiom-edge/40 flex items-center gap-2">
            {(() => {
              const isSys = workspace.type === "core-extension";
              return (
                <>
                  {isSys ? (
                    <Shield className="w-3.5 h-3.5 text-axiom-cyan" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-axiom-emerald" />
                  )}
                  <span className={cn("text-xs uppercase tracking-[0.2em]", isSys ? "text-axiom-cyan" : "text-axiom-dim")}>
                    {isSys ? "Axiom — System Architect" : "Forge — App Developer"}
                  </span>
                </>
              );
            })()}
          </div>
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto axiom-scroll p-3 space-y-2.5">
            {workspace.messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg px-3 py-2 text-xs bg-axiom-panel/60 border border-axiom-edge/40"
              >
                <div className={cn("text-[9px] uppercase tracking-wider text-axiom-dim mb-1 flex items-center gap-1",
                  workspace.type === "core-extension" && "text-axiom-cyan/70")}>
                  {workspace.type === "core-extension" ? "◬ axiom" : "⌬ forge"}
                </div>
                <div className="text-axiom-text/90 leading-relaxed">
                  {workspace.type === "core-extension"
                    ? "I'm Axiom, the System Architect. Tell me what to change in Axiom OS…"
                    : "I'm Forge, your Application Developer. Tell me what to build…"}
                </div>
              </motion.div>
            )}
            {workspace.messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  m.role === "user"
                    ? "bg-axiom-cyan/10 border border-axiom-cyan/30 ml-4"
                    : "bg-axiom-panel/60 border border-axiom-edge/40 mr-2",
                )}
              >
                <div className="text-[9px] uppercase tracking-wider text-axiom-dim mb-1 flex items-center gap-1">
                  {m.role === "user"
                    ? "you"
                    : workspace.type === "core-extension" ? "◬ axiom" : "⌬ forge"}
                </div>
                {m.pending ? (
                  <span className="inline-flex items-center gap-1.5 text-axiom-dim">
                    <Wand2 className="w-3 h-3 animate-pulse" />
                    <span className="axiom-blink">rewriting…</span>
                  </span>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-axiom-text/90 leading-relaxed">
                    {m.content}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="p-2 border-t border-axiom-edge/40 shrink-0">
            {(() => {
              const isSys = workspace.type === "core-extension";
              const accentBorder = isSys ? "focus-within:border-axiom-cyan/40" : "focus-within:border-axiom-emerald/40";
              const accentBg = isSys ? "bg-axiom-cyan/20 border-axiom-cyan/50 text-axiom-cyan hover:bg-axiom-cyan/30" : "bg-axiom-emerald/20 border-axiom-emerald/50 text-axiom-emerald hover:bg-axiom-emerald/30";
              return (
            <div className={cn("flex items-end gap-2 bg-axiom-panel/40 border border-axiom-edge/40 rounded-lg p-2 transition-colors", accentBorder)}>
              <AutoGrowTextarea
                value={chatInput}
                onChange={setChatInput}
                onSend={sendToForge}
                placeholder={
                  workspace.type === "core-extension"
                    ? "Tell Axiom what to change in Axiom OS…"
                    : "Tell Forge what to build…"
                }
                className="text-xs"
                minHeight={18}
              />
              <button
                type="button"
                onClick={sendToForge}
                disabled={forgeBusy || !chatInput.trim()}
                className={cn(
                  "w-7 h-7 rounded flex items-center justify-center border shrink-0",
                  forgeBusy || !chatInput.trim()
                    ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim cursor-not-allowed opacity-50"
                    : cn("cursor-pointer", accentBg),
                )}
              >
                {forgeBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
              );
            })()}
            <div className="mt-1.5 text-[9px] text-axiom-dim">
              {workspace.type === "core-extension" ? "Axiom" : "Forge"} modifies the active file. ⏎ send · ⇧⏎ newline
            </div>
          </div>
        </aside>
      </div>

      {/* ── Live Preview Overlay (APP workspaces only) ── */}
      {workspace.type === "sandboxed-app" && showLivePreview && (
        <AppLivePreview
          files={workspace.files}
          workspaceName={workspace.name}
          onClose={() => setShowLivePreview(false)}
        />
      )}

      {/* ── Publish App Modal (APP workspaces only) ── */}
      <PublishAppModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        workspaceId={workspace.id}
      />
    </div>
  );
}

// ── File Tree Item ────────────────────────────────────────────────────────────

function FileTreeItem({
  file,
  isSystem,
  isActive,
  onSelect,
  onDelete,
}: {
  file: { id: string; name: string; language: VibeLanguage; isSystemFile?: boolean };
  isSystem: boolean;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const Icon = LANG_ICON[file.language];
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs",
        isActive
          ? isSystem
            ? "bg-axiom-amber/10 border border-axiom-amber/30"
            : "bg-axiom-cyan/10 border border-axiom-cyan/30"
          : "hover:bg-axiom-panel/50 border border-transparent",
      )}
    >
      <Icon className={cn("w-3 h-3 shrink-0", `text-${LANG_COLOR[file.language]}`)} />
      <span className="flex-1 truncate text-axiom-text">{file.name}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-axiom-cyan axiom-pulse-ring shrink-0" />
      )}
      {isSystem && !isActive && (
        <span className="text-[7px] px-1 py-0.5 rounded bg-axiom-amber/15 text-axiom-amber/80 uppercase tracking-wider shrink-0">
          sys
        </span>
      )}
      {!isSystem && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-axiom-rose/30 flex items-center justify-center text-axiom-dim hover:text-axiom-rose shrink-0"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// ── Hot Reload Bar ────────────────────────────────────────────────────────────

function HotReloadBar({
  isSystemFile,
  fileName,
  workspaceType,
}: {
  isSystemFile: boolean;
  fileName?: string;
  workspaceType: WorkspaceType;
}) {
  return (
    <div className="h-6 border-t border-axiom-edge/40 bg-axiom-deep/80 flex items-center justify-between px-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-axiom-emerald/40 axiom-pulse-ring" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-axiom-emerald" />
          </span>
          <span className="text-axiom-emerald uppercase tracking-wider font-medium">
            Hot Reload Active
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-axiom-dim">
          <Check className="w-2.5 h-2.5 text-axiom-cyan" />
          <span className="uppercase tracking-wider">Local Project Connected</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[9px] text-axiom-dim/70">
        {isSystemFile ? (
          <span className="flex items-center gap-1 text-axiom-amber/80">
            <span className="w-1 h-1 rounded-full bg-axiom-amber" />
            <span className="uppercase tracking-wider">System File · saving rewrites the OS</span>
          </span>
        ) : (
          <span className="uppercase tracking-wider">
            {workspaceType === "core-extension" ? "core-extension" : "sandbox"}{fileName ? ` · ${fileName}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ── App Live Preview (iframe sandbox for sandboxed-app workspaces) ──────────

function AppLivePreview({
  files,
  workspaceName,
  onClose,
}: {
  files: WorkspaceFile[];
  workspaceName: string;
  onClose: () => void;
}) {
  const iframeSrcDoc = useMemo(() => {
    // Gather HTML, CSS, and JS files from the workspace
    const htmlFile = files.find(
      (f) => f.name.endsWith(".html") || f.name === "index.html",
    );
    const cssFiles = files.filter((f) => f.name.endsWith(".css"));
    const jsFiles = files.filter(
      (f) =>
        f.name.endsWith(".js") ||
        f.name.endsWith(".jsx") ||
        f.name.endsWith(".ts") ||
        f.name.endsWith(".tsx"),
    );

    // If there's an explicit HTML file, inject CSS/JS into it
    if (htmlFile) {
      let html = htmlFile.source;
      const cssBlock = cssFiles.map((f) => `<style>/* ${f.name} */\n${f.source}</style>`).join("\n");
      const jsBlock = jsFiles
        .map((f) => `<script>/* ${f.name} */\n${f.source}<\/script>`)
        .join("\n");

      // Insert CSS before </head> or at top
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${cssBlock}\n</head>`);
      } else {
        html = `${cssBlock}\n${html}`;
      }

      // Insert JS before </body> or at end
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${jsBlock}\n</body>`);
      } else {
        html = `${html}\n${jsBlock}`;
      }

      return html;
    }

    // No HTML file — build a minimal page from JS/CSS/Markdown
    const cssBlock = cssFiles.map((f) => `/* ${f.name} */\n${f.source}`).join("\n\n");
    const jsBlock = jsFiles
      .map((f) => {
        // Strip TS/JSX-specific syntax for simple rendering
        const code = f.source
          .replace(/^import\s+.*$/gm, "")
          .replace(/^export\s+/gm, "")
          .replace(/:\s*(string|number|boolean|void|null|undefined|any)\b/g, "");
        return `// ${f.name}\n${code}`;
      })
      .join("\n\n");

    // If there are markdown files, render them as pre-formatted text
    const mdFiles = files.filter((f) => f.name.endsWith(".md"));
    const mdContent = mdFiles.map((f) => `<div class="md-file"><h3>${f.name}</h3><pre>${f.source}</pre></div>`).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${workspaceName} — Live Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0f;
      color: #e0e0e0;
      padding: 16px;
      line-height: 1.6;
    }
    h1, h2, h3, h4 { color: #fff; margin: 16px 0 8px; }
    a { color: #00d4ff; }
    pre { background: #111; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px; margin: 8px 0; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
    .md-file { margin: 16px 0; padding: 16px; border: 1px solid #222; border-radius: 8px; }
    .md-file h3 { margin-top: 0; color: #00d4ff; font-size: 14px; }
    #app { min-height: 80vh; }
    /* Error display */
    .runtime-error { color: #ff6b6b; background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); padding: 12px; border-radius: 8px; margin: 8px 0; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  </style>
  <style>${cssBlock}</style>
</head>
<body>
  <div id="app">
    <div style="text-align:center; padding: 40px; color: #555;">
      <div style="font-size: 24px; margin-bottom: 8px;">⬡</div>
      <div>${workspaceName}</div>
      <div style="font-size: 12px; margin-top: 4px;">Live Preview — write code to see output</div>
    </div>
    ${mdContent}
  </div>
  <script>
    // Capture console.log for display
    (function() {
      const origLog = console.log;
      const origError = console.error;
      console.log = function(...args) {
        origLog.apply(console, args);
        try {
          const line = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          const el = document.createElement('div');
          el.style.cssText = 'color:#8be9c8;font-size:11px;font-family:monospace;padding:2px 0;';
          el.textContent = '▸ ' + line;
          const out = document.getElementById('__console') || createConsole();
          out.appendChild(el);
          out.scrollTop = out.scrollHeight;
        } catch(e) {}
      };
      console.error = function(...args) {
        origError.apply(console, args);
        try {
          const line = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          const el = document.createElement('div');
          el.style.cssText = 'color:#ff6b6b;font-size:11px;font-family:monospace;padding:2px 0;';
          el.textContent = '✗ ' + line;
          const out = document.getElementById('__console') || createConsole();
          out.appendChild(el);
          out.scrollTop = out.scrollHeight;
        } catch(e) {}
      };
      window.onerror = function(msg, src, line, col, err) {
        const el = document.createElement('div');
        el.className = 'runtime-error';
        el.textContent = msg + (line ? ' (line ' + line + ')' : '');
        document.body.appendChild(el);
      };
      function createConsole() {
        const c = document.createElement('div');
        c.id = '__console';
        c.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:120px;overflow-y:auto;background:rgba(0,0,0,0.85);border-top:1px solid #222;padding:6px 12px;z-index:9999;';
        document.body.appendChild(c);
        return c;
      }
    })();
  </script>
  <script>
    try {
      ${jsBlock}
    } catch(e) {
      const el = document.createElement('div');
      el.className = 'runtime-error';
      el.textContent = 'Runtime Error: ' + e.message;
      document.body.appendChild(el);
    }
  <\/script>
</body>
</html>`;
  }, [files, workspaceName]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-axiom-void/95 flex flex-col"
    >
      {/* Preview header */}
      <div className="h-9 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-deep/80 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <MonitorSmartphone className="w-3.5 h-3.5 text-axiom-cyan" />
          <span className="text-axiom-cyan font-medium uppercase tracking-wider text-[10px]">
            Live Preview
          </span>
          <span className="text-axiom-dim text-[9px]">{workspaceName}</span>
          <span className="text-[9px] text-axiom-dim/50">·</span>
          <span className="text-[9px] text-axiom-emerald/70 flex items-center gap-1">
            <span className="relative flex items-center justify-center w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-axiom-emerald/40 axiom-pulse-ring" />
              <span className="relative w-1 h-1 rounded-full bg-axiom-emerald" />
            </span>
            auto-refresh
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 rounded text-[10px] text-axiom-dim hover:text-axiom-text flex items-center gap-1 border border-axiom-edge/40 hover:border-axiom-edge/60 transition-colors"
        >
          <X className="w-3 h-3" />
          Close
        </button>
      </div>

      {/* Iframe viewport */}
      <div className="flex-1 min-h-0">
        <iframe
          key={files.map((f) => f.updatedAt).join("-")}
          srcDoc={iframeSrcDoc}
          sandbox="allow-scripts allow-modals"
          title={`${workspaceName} — Live Preview`}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    </motion.div>
  );
}


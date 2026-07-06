"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { BrainFolder, MemoryNode } from "@/lib/axiom/types";
import {
  Network, FolderTree, Plus, FolderPlus, ChevronRight, ChevronDown,
  FileText, Trash2, MoreVertical, Pencil, Network as GraphIcon, X,
  Book, Search, Bookmark, Link2, FilePlus, Download, Replace, Copy,
  History, FolderOpen, Monitor, SplitSquareHorizontal,
  SplitSquareVertical, AlertTriangle, Star, GitBranch, ArrowRight,
  BookOpen, Hash, Bold, Italic, Strikethrough, Code, List, ListChecks,
  Quote, Minus, Link, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GraphCanvas from "../GraphCanvas";
import LivePreviewEditor, { renderReadingHtml } from "../LivePreviewEditor";
import AxiomSelect from "../AxiomSelect";
import { motion, AnimatePresence } from "framer-motion";
import { KIND_COLORS, KIND_GLYPHS } from "@/lib/axiom/store";

export default function BrainPage() {
  const { brainTab, setBrainTab, folders, addFolder, activeFolderId, setActiveFolder, getActiveProfile } = useAxiom();
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  // ── Profile-aware folder filtering ──
  // Profiles never duplicate Brain data — they only filter which collections
  // are visible. Global profile + empty-set profiles = all folders visible.
  const activeProfile = getActiveProfile();
  const visibleFolders = activeProfile.isGlobal || activeProfile.visibility.visibleFolderIds.length === 0
    ? folders
    : folders.filter((f) => activeProfile.visibility.visibleFolderIds.includes(f.id));

  return (
    <div className="h-full flex flex-col">
      {/* Tab strip — NO New Folder button here anymore */}
      <div className="h-10 border-b border-axiom-edge/40 flex items-center justify-between px-4 bg-axiom-deep/40 shrink-0">
        <div className="flex items-center gap-1">
          <TabButton
            active={brainTab === "graph"}
            onClick={() => setBrainTab("graph")}
            icon={Network}
            color="axiom-cyan"
            label="Graph Universe"
          />
          <TabButton
            active={brainTab === "folders"}
            onClick={() => setBrainTab("folders")}
            icon={FolderTree}
            color="axiom-violet"
            label="Folders"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {brainTab === "graph" ? (
          <GraphCanvas />
        ) : (
          <FoldersBrowser
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            showNewFolder={showNewFolder}
            setShowNewFolder={setShowNewFolder}
            onAddFolder={(name) => {
              addFolder(name, activeFolderId);
              setNewFolderName("");
              setShowNewFolder(false);
            }}
            folders={visibleFolders}
            activeFolderId={activeFolderId}
            setActiveFolder={setActiveFolder}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, color, label,
}: {
  active: boolean; onClick: () => void; icon: typeof Network; color: string; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors border",
        active
          ? `bg-${color}/10 border-${color}/40 text-${color}`
          : "border-transparent text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Folders browser ──────────────────────────────────────────────────────────

function FoldersBrowser({
  newFolderName, setNewFolderName, showNewFolder, setShowNewFolder, onAddFolder,
  folders, activeFolderId, setActiveFolder,
}: {
  newFolderName: string;
  setNewFolderName: (v: string) => void;
  showNewFolder: boolean;
  setShowNewFolder: (v: boolean) => void;
  onAddFolder: (name: string) => void;
  folders: BrainFolder[];
  activeFolderId: string | null;
  setActiveFolder: (id: string | null) => void;
}) {
  const { graph, removeNode, selectNode, addNode, removeFolder, updateNode, setBrainTab, linkNodes } = useAxiom();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    f_root: true, f_agents: true, f_concepts: true,
  });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"reading" | "editing">("editing");

  // ── Split-pane state ──
  // `splitPane` holds an optional second note opened alongside the primary.
  // `splitDirection` controls whether the panes tile horizontally (right) or vertically (down).
  const [splitPaneId, setSplitPaneId] = useState<string | null>(null);
  const [splitDirection, setSplitDirection] = useState<"right" | "down" | null>(null);
  // Track which pane is "active" for context-menu actions like Export PDF.
  const [activePaneId, setActivePaneId] = useState<string | null>(null);

  // ── Tab state (Obsidian-style multiple open notes per pane) ──
  // Each pane has its own list of open tabs. selectedNoteId/splitPaneId remain
  // the "active tab" in each pane. This is additive — no existing logic changes.
  const [primaryTabs, setPrimaryTabs] = useState<string[]>([]);
  const [splitTabs, setSplitTabs] = useState<string[]>([]);
  // Resizable divider ratio (0.5 = equal split). Drag the divider to change.
  const [splitRatio, setSplitRatio] = useState(0.5);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingDividerRef = useRef(false);

  // ── Stylized delete dialog state ──
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string; type: "note" | "folder"; label: string;
  } | null>(null);

  // ── Status toast (for API hooks like "Show in Folder") ──
  const [statusToast, setStatusToast] = useState<string | null>(null);
  // Glowing notification variant — for native-hook messages
  const [glowNotification, setGlowNotification] = useState<string | null>(null);

  // ── Feature panels ──
  // Backlinks collapsible panel (per-pane)
  const [backlinksPaneId, setBacklinksPaneId] = useState<string | null>(null);
  // Search/Replace utility bar (per-pane)
  const [searchBarPaneId, setSearchBarPaneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  // Link-note dropdown (per-pane)
  const [linkDropdownPaneId, setLinkDropdownPaneId] = useState<string | null>(null);
  // Move-to-folder dropdown (per-pane)
  const [moveFolderPaneId, setMoveFolderPaneId] = useState<string | null>(null);
  // Version history modal (per-pane)
  const [versionHistoryPaneId, setVersionHistoryPaneId] = useState<string | null>(null);
  // Linked-view secondary pane
  const [linkedViewPaneId, setLinkedViewPaneId] = useState<string | null>(null);
  // Markdown shortcuts reference panel
  const [showMarkdownShortcuts, setShowMarkdownShortcuts] = useState(false);

  // Drag-and-drop state
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: "note" | "folder"; id: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Auto-dismiss status toast after 3.5s
  useEffect(() => {
    if (!statusToast) return;
    const t = setTimeout(() => setStatusToast(null), 3500);
    return () => clearTimeout(t);
  }, [statusToast]);

  // Auto-dismiss glowing notification after 4s
  useEffect(() => {
    if (!glowNotification) return;
    const t = setTimeout(() => setGlowNotification(null), 4000);
    return () => clearTimeout(t);
  }, [glowNotification]);

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Drag handlers ──
  const handleNoteDragStart = (e: React.DragEvent, noteId: string) => {
    setDraggingNoteId(noteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
  };
  const handleNoteDragEnd = () => {
    setDraggingNoteId(null);
    setDragOverFolderId(null);
  };
  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolderId !== folderId) setDragOverFolderId(folderId);
  };
  const handleFolderDragLeave = (e: React.DragEvent, folderId: string) => {
    const rt = e.relatedTarget as Node | null;
    const ct = e.currentTarget as Node;
    if (rt && ct.contains(rt)) return;
    if (dragOverFolderId === folderId) setDragOverFolderId(null);
  };
  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("text/plain") || draggingNoteId;
    if (!noteId) return;
    updateNode(noteId, { folderId });
    setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
    setDraggingNoteId(null);
    setDragOverFolderId(null);
  };

  // ── Context menu actions ──
  const startRename = (id: string, type: "note" | "folder") => {
    const item = type === "note"
      ? graph.nodes.find((n) => n.id === id)
      : folders.find((f) => f.id === id);
    setRenamingId(id);
    setRenameValue(item ? (type === "note" ? (item as MemoryNode).label : (item as BrainFolder).name) : "");
    setContextMenu(null);
  };
  const commitRename = () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    const isNote = graph.nodes.find((n) => n.id === renamingId);
    if (isNote) updateNode(renamingId, { label: renameValue.trim() });
    else {
      // Update folder name via a direct store call
      useAxiom.setState((s) => ({
        folders: s.folders.map((f) => f.id === renamingId ? { ...f, name: renameValue.trim() } : f),
      }));
    }
    setRenamingId(null);
  };
  const deleteItem = (id: string, type: "note" | "folder") => {
    // Open the stylized alert dialog instead of window.confirm.
    const item = type === "note"
      ? graph.nodes.find((n) => n.id === id)
      : folders.find((f) => f.id === id);
    const label = item ? (type === "note" ? (item as MemoryNode).label : (item as BrainFolder).name) : "this item";
    setDeleteDialog({ id, type, label });
    setContextMenu(null);
  };
  const confirmDelete = () => {
    if (!deleteDialog) return;
    const { id, type } = deleteDialog;
    if (type === "note") {
      removeNode(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
      if (splitPaneId === id) { setSplitPaneId(null); setSplitDirection(null); }
      if (activePaneId === id) setActivePaneId(null);
    } else {
      removeFolder(id);
    }
    setDeleteDialog(null);
  };

  // ── Split-pane actions ──
  // The "active pane" is whichever pane was last interacted with. When the user
  // picks Split Right / Split Down from a pane's context menu, the current note
  // is duplicated into the second pane so they can pick a different note.
  const splitRight = (sourceId: string) => {
    setSplitPaneId(sourceId);
    setSplitDirection("right");
    setSplitTabs([sourceId]);
    setSplitRatio(0.5);
    setActivePaneId(sourceId);
    setContextMenu(null);
  };
  const splitDown = (sourceId: string) => {
    setSplitPaneId(sourceId);
    setSplitDirection("down");
    setSplitTabs([sourceId]);
    setSplitRatio(0.5);
    setActivePaneId(sourceId);
    setContextMenu(null);
  };
  const closeSplit = () => {
    setSplitPaneId(null);
    setSplitDirection(null);
    setSplitTabs([]);
    setSplitRatio(0.5);
  };

  // ── Tab management ──
  // Open a note in a specific pane ("primary" or "split"). Adds to that pane's
  // tab list if not already open, then makes it the active tab.
  const openNoteInPane = useCallback((noteId: string, pane: "primary" | "split") => {
    if (pane === "primary") {
      setPrimaryTabs((prev) => prev.includes(noteId) ? prev : [...prev, noteId]);
      setSelectedNoteId(noteId);
      setActivePaneId(noteId);
    } else {
      setSplitTabs((prev) => prev.includes(noteId) ? prev : [...prev, noteId]);
      setSplitPaneId(noteId);
      setActivePaneId(noteId);
    }
  }, []);

  // Open a note in whichever pane is currently active.
  // If no pane is active, defaults to primary. This is the pane-aware selector.
  const openNoteInActivePane = useCallback((noteId: string) => {
    const splitIsActive = splitPaneId !== null && activePaneId === splitPaneId;
    if (splitIsActive) {
      openNoteInPane(noteId, "split");
    } else {
      openNoteInPane(noteId, "primary");
    }
    selectNode(noteId);
  }, [splitPaneId, activePaneId, openNoteInPane, selectNode]);

  // Close a tab in a specific pane. If the closed tab was active, switch to
  // the next available tab. If no tabs remain, close the pane (split) or
  // clear selection (primary).
  const closeTab = useCallback((noteId: string, pane: "primary" | "split") => {
    if (pane === "primary") {
      setPrimaryTabs((prev) => {
        const idx = prev.indexOf(noteId);
        const next = prev.filter((id) => id !== noteId);
        if (selectedNoteId === noteId) {
          if (next.length === 0) {
            setSelectedNoteId(null);
            setActivePaneId(null);
          } else {
            const newActive = next[Math.min(idx, next.length - 1)];
            setSelectedNoteId(newActive);
            setActivePaneId(newActive);
          }
        }
        return next;
      });
    } else {
      setSplitTabs((prev) => {
        const idx = prev.indexOf(noteId);
        const next = prev.filter((id) => id !== noteId);
        if (splitPaneId === noteId) {
          if (next.length === 0) {
            closeSplit();
          } else {
            const newActive = next[Math.min(idx, next.length - 1)];
            setSplitPaneId(newActive);
            setActivePaneId(newActive);
          }
        }
        return next;
      });
    }
  }, [selectedNoteId, splitPaneId]);

  // ── Divider drag-to-resize ──
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingDividerRef.current = true;
    document.body.style.cursor = splitDirection === "right" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingDividerRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (splitDirection === "right") {
        const ratio = (ev.clientX - rect.left) / rect.width;
        setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
      } else {
        const ratio = (ev.clientY - rect.top) / rect.height;
        setSplitRatio(Math.max(0.15, Math.min(0.85, ratio)));
      }
    };
    const onUp = () => {
      isDraggingDividerRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [splitDirection]);

  // ── Export to PDF (print-scoped via rendered HTML clone) ──
  // We render the note's markdown content to HTML and place it in
  // #axiom-print-container (a direct child of <body>). This avoids ALL
  // ancestor width constraints and always prints the rendered view
  // (even if the user is in editing mode). The @media print rules in
  // LivePreviewEditor hide everything except #axiom-print-container and
  // flatten the cyberpunk styling for paper readability.
  const exportToPdf = (noteId: string) => {
    setContextMenu(null);
    setStatusToast("Preparing PDF…");
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note) {
      setStatusToast("Could not locate note.");
      return;
    }

    // Remove any previous print container
    const oldPrint = document.getElementById("axiom-print-container");
    if (oldPrint) oldPrint.remove();

    // Render the note's markdown content to formatted HTML
    const printContainer = document.createElement("div");
    printContainer.id = "axiom-print-container";
    printContainer.innerHTML = renderReadingHtml(note.content || "");
    document.body.appendChild(printContainer);

    document.body.classList.add("print-active");

    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-active");
      printContainer.remove();
      setStatusToast("PDF export complete.");
    }, 100);
  };

  // ── API hook stubs (Show in Folder / File Explorer / Open with Default App) ──
  // Browser sandbox cannot touch the native shell. Log to console + show a
  // glowing notification so the user sees the action is mapped for the future
  // local PC backend.
  const hookNativeShell = (noteName: string) => {
    console.log(`[Axiom OS Native Hook]: Triggered system shell execution for ${noteName}`);
    setGlowNotification("Backend Connection Pending — Action mapped to local file-system command.");
    setContextMenu(null);
  };

  // ── Document Backlinks ──
  // Scans every other note's content for `[[Active Note Name]]` and lists
  // matching notes in a collapsible panel at the bottom of the pane.
  const showBacklinks = (noteId: string) => {
    setBacklinksPaneId(backlinksPaneId === noteId ? null : noteId);
    setContextMenu(null);
  };

  // ── Bookmark toggle ──
  // Flips the `bookmarked` boolean on the note. The sidebar item shows a star
  // when bookmarked. A global bookmarks list is derived in the store selector.
  const toggleBookmark = (noteId: string) => {
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note) return;
    updateNode(noteId, { bookmarked: !note.bookmarked });
    setStatusToast(note.bookmarked ? "Bookmark removed." : "Bookmark added.");
    setContextMenu(null);
  };

  // ── Link entire note to... ──
  // Opens a dropdown listing every other note. Clicking one appends
  // `[[Target Note]]` to the bottom of the current note AND creates a real
  // graph edge via `linkNodes`, so the Graph Universe re-renders with a
  // visible connection line.
  const showLinkDropdown = (noteId: string) => {
    setLinkDropdownPaneId(linkDropdownPaneId === noteId ? null : noteId);
    setContextMenu(null);
  };
  const showMoveFolder = (noteId: string) => {
    setMoveFolderPaneId(moveFolderPaneId === noteId ? null : noteId);
    setContextMenu(null);
  };
  const linkToNote = (sourceId: string, targetId: string) => {
    const target = graph.nodes.find((n) => n.id === targetId);
    if (!target) return;
    const source = graph.nodes.find((n) => n.id === sourceId);
    if (!source) return;
    // Append the wikilink to the bottom of the source note's content
    const newContent = (source.content || "") + `\n\n[[${target.label}]]\n`;
    updateNode(sourceId, { content: newContent });
    // Create a real graph edge so the Graph Universe re-renders with a line
    linkNodes(sourceId, targetId, "relates", 1);
    setLinkDropdownPaneId(null);
    setStatusToast(`Linked to "${target.label}".`);
  };

  // ── Add file properties (YAML frontmatter) ──
  // Prepends a standard Obsidian YAML block to the top of the note.
  const addFileProperties = (noteId: string) => {
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note) return;
    // Don't double-prepend if frontmatter already exists
    if (note.content.startsWith("---\n")) {
      setStatusToast("File properties already exist.");
      setContextMenu(null);
      return;
    }
    const frontmatter = `---\ntags: [axiom-core]\nstatus: active\ncreated: ${new Date(note.createdAt).toISOString().split("T")[0]}\n---\n\n`;
    updateNode(noteId, { content: frontmatter + (note.content || "") });
    setStatusToast("File properties added.");
    setContextMenu(null);
  };

  // ── Search / Replace ──
  // Slides down a search/replace utility bar at the top of the pane.
  // Search highlights matches; Replace executes `.replaceAll()` on the content.
  const showSearchBar = (noteId: string) => {
    setSearchBarPaneId(searchBarPaneId === noteId ? null : noteId);
    setSearchQuery("");
    setReplaceQuery("");
    setContextMenu(null);
  };
  const executeReplace = (noteId: string) => {
    if (!searchQuery) return;
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note) return;
    const newContent = (note.content || "").replaceAll(searchQuery, replaceQuery);
    updateNode(noteId, { content: newContent });
    const count = (note.content || "").split(searchQuery).length - 1;
    setStatusToast(`Replaced ${count} occurrence${count === 1 ? "" : "s"}.`);
  };

  // ── Copy Path ──
  // Constructs a mock OS path and copies to clipboard.
  const copyPath = (noteId: string) => {
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note) return;
    const folder = folders.find((f) => f.id === note.folderId);
    const folderName = folder?.name ?? "Vault";
    const safeLabel = note.label.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "untitled";
    const mockPath = `C:\\AxiomOS\\Brain\\Vault\\${folderName}\\${safeLabel}.md`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mockPath);
    }
    setStatusToast(`Path Copied: ${mockPath}`);
    setContextMenu(null);
  };

  // ── Open Version History ──
  // Opens a side-modal showing 3 mock previous auto-save timestamps.
  // Clicking one rolls back the content to a pre-defined placeholder.
  const showVersionHistory = (noteId: string) => {
    // Ensure the note has mock version history
    const note = graph.nodes.find((n) => n.id === noteId);
    if (note && !note.versionHistory) {
      const now = Date.now();
      updateNode(noteId, {
        versionHistory: [
          { ts: now - 1000 * 60 * 10, label: "10 mins ago", content: (note.content || "") + "\n\n*(auto-save snapshot — 10 mins ago)*" },
          { ts: now - 1000 * 60 * 60, label: "1 hour ago", content: (note.content || "").split("\n").slice(0, Math.max(1, Math.floor((note.content || "").split("\n").length / 2))).join("\n") + "\n\n*(auto-save snapshot — 1 hour ago)*" },
          { ts: now - 1000 * 60 * 60 * 24, label: "Yesterday", content: `# ${note.label}\n\n*(early auto-save snapshot — yesterday)*` },
        ],
      });
    }
    setVersionHistoryPaneId(noteId);
    setContextMenu(null);
  };
  const rollbackToVersion = (noteId: string, ts: number) => {
    const note = graph.nodes.find((n) => n.id === noteId);
    if (!note || !note.versionHistory) return;
    const version = note.versionHistory.find((v) => v.ts === ts);
    if (!version) return;
    updateNode(noteId, { content: version.content });
    setStatusToast(`Rolled back to version: ${version.label}`);
    setVersionHistoryPaneId(null);
  };

  // ── Open Linked View ──
  // Opens a secondary split-pane showing a live local node graph of just
  // this note and its direct link neighbors.
  const openLinkedView = (noteId: string) => {
    setLinkedViewPaneId(linkedViewPaneId === noteId ? null : noteId);
    setContextMenu(null);
  };

  const openInGraph = (id: string) => {
    selectNode(id);
    setBrainTab("graph");
    setContextMenu(null);
  };

  // ── Rename (from context menu) ──
  // `startRename` already focuses a sidebar input. For notes, we ALSO focus the
  // title input at the top of the editor by setting `renamingId` to the note id.
  // The NoteEditorHeader watches `renamingId` and swaps its title input into
  // a focused, bordered state. Enter or click-outside commits.

  const renderFolder = (folderId: string, depth: number): React.ReactNode => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return null;
    const children = folders.filter((f) => f.parentId === folderId);
    const notes = graph.nodes.filter((n) => n.folderId === folderId);
    const expanded = expandedFolders[folderId] ?? false;
    const isDropTarget = dragOverFolderId === folderId;

    return (
      <div key={folderId}>
        <div
          className={cn(
            "group flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors",
            isDropTarget
              ? "bg-axiom-violet/15 border border-axiom-violet/50"
              : "hover:bg-axiom-panel/60 border border-transparent",
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => { setActiveFolder(folderId); toggleExpand(folderId); }}
          onDragOver={(e) => handleFolderDragOver(e, folderId)}
          onDragLeave={(e) => handleFolderDragLeave(e, folderId)}
          onDrop={(e) => handleFolderDrop(e, folderId)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: folderId });
          }}
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="w-3 h-3 text-axiom-dim" /> : <ChevronRight className="w-3 h-3 text-axiom-dim" />
          ) : (
            <span className="w-3" />
          )}
          <span className={cn("text-sm", folder.color ? `text-${folder.color}` : "text-axiom-cyan")}>📁</span>
          {renamingId === folderId ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingId(null);
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-axiom-deep/80 border border-axiom-cyan/40 rounded px-1 text-xs text-axiom-text focus:outline-none"
            />
          ) : (
            <span className={cn("text-xs flex-1 truncate", activeFolderId === folderId ? "text-axiom-text font-medium" : "text-axiom-text/80")}>
              {folder.name}
            </span>
          )}
          <span className="text-[9px] text-axiom-dim">{notes.length}</span>
          {/* Three-dots context menu trigger */}
          <button
            onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: "folder", id: folderId }); }}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-white/10 flex items-center justify-center text-axiom-dim hover:text-axiom-text"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        </div>
        {expanded && (
          <div>
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                depth={depth}
                selectedNoteId={selectedNoteId}
                isDragging={draggingNoteId === note.id}
                renamingId={renamingId}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                commitRename={commitRename}
                setRenamingId={setRenamingId}
                onSelect={() => openNoteInActivePane(note.id)}
                onDragStart={(e) => handleNoteDragStart(e, note.id)}
                onDragEnd={handleNoteDragEnd}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: note.id }); }}
                onMoreClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: note.id }); }}
              />
            ))}
            {children.map((c) => renderFolder(c.id, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => f.parentId === null);
  const selectedNote = graph.nodes.find((n) => n.id === selectedNoteId);

  return (
    <div className="h-full flex">
      {/* Folder tree sidebar */}
      <div className="w-72 border-r border-axiom-edge/40 bg-axiom-deep/60 flex flex-col">
        <div className="p-2 border-b border-axiom-edge/40 text-[10px] uppercase tracking-wider text-axiom-dim flex items-center justify-between">
          <span>Folders</span>
          <span className="text-axiom-dim/60">{graph.nodes.length} notes</span>
        </div>
        <AnimatePresence>
          {showNewFolder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-2 border-b border-axiom-edge/40 overflow-hidden"
            >
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) onAddFolder(newFolderName.trim());
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
                placeholder="Folder name…"
                className="w-full bg-axiom-panel/60 border border-axiom-violet/40 rounded px-2 py-1 text-xs focus:outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 overflow-y-auto axiom-scroll py-2">
          {rootFolders.map((f) => renderFolder(f.id, 0))}
        </div>
        {/* Bottom: two adjacent buttons — [+ New Note] and [📁+ New Folder] */}
        <div className="p-2 border-t border-axiom-edge/40 flex items-center gap-1.5">
          <button
            onClick={() => {
              const id = addNode({ label: "New Note", kind: "concept", content: "", folderId: activeFolderId });
              openNoteInActivePane(id);
            }}
            className="flex-1 px-2 py-1.5 rounded border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Note
          </button>
          <button
            onClick={() => setShowNewFolder(!showNewFolder)}
            className="flex-1 px-2 py-1.5 rounded border border-axiom-edge/40 hover:border-axiom-violet/40 text-axiom-dim hover:text-axiom-violet text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-3 h-3" /> New Folder
          </button>
        </div>
      </div>

      {/* Note editor — flexible split layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <div
            ref={splitContainerRef}
            className={cn(
              "flex-1 min-h-0",
              splitDirection === "right" ? "flex flex-row" : "",
              splitDirection === "down" ? "flex flex-col" : "",
              !splitDirection ? "flex flex-col" : "",
            )}
          >
            <NotePane
              noteId={selectedNote.id}
              isActivePane={activePaneId === null || activePaneId === selectedNote.id}
              showCloseButton={false}
              viewMode={viewMode}
              setViewMode={setViewMode}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              commitRename={commitRename}
              setRenamingId={setRenamingId}
              onActivatePane={() => setActivePaneId(selectedNote.id)}
              onOpenContextMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: selectedNote.id })}
              onUpdateNode={updateNode}
              onWikiLinkClick={(noteName) => {
                const target_note = graph.nodes.find(
                  (n) => n.label.toLowerCase() === noteName.toLowerCase(),
                );
                if (target_note) {
                  openNoteInPane(target_note.id, "primary");
                  selectNode(target_note.id);
                } else {
                  const linkEls = document.querySelectorAll(`[data-note="${noteName}"]`);
                  linkEls.forEach((el) => {
                    el.classList.add("text-rose-400");
                    setTimeout(() => el.classList.remove("text-rose-400"), 800);
                  });
                }
              }}
              folderName={folders.find((f) => f.id === selectedNote.folderId)?.name ?? "none"}
              showBacklinksPanel={backlinksPaneId === selectedNote.id}
              showSearchBarPanel={searchBarPaneId === selectedNote.id}
              showLinkDropdownPanel={linkDropdownPaneId === selectedNote.id}
              showMoveFolderPanel={moveFolderPaneId === selectedNote.id}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              replaceQuery={replaceQuery}
              setReplaceQuery={setReplaceQuery}
              onExecuteReplace={() => executeReplace(selectedNote.id)}
              onLinkToNote={(targetId) => linkToNote(selectedNote.id, targetId)}
              onCloseBacklinks={() => setBacklinksPaneId(null)}
              onCloseSearchBar={() => setSearchBarPaneId(null)}
              onCloseLinkDropdown={() => setLinkDropdownPaneId(null)}
              onCloseMoveFolder={() => setMoveFolderPaneId(null)}
              onMoveToFolder={(folderId) => {
                updateNode(selectedNote.id, { folderId });
                setMoveFolderPaneId(null);
                const fname = folders.find(f => f.id === folderId)?.name ?? "folder";
                setStatusToast(`Moved "${selectedNote.label}" to ${fname}.`);
              }}
              // Tab props
              paneTabs={primaryTabs}
              pane="primary"
              onSelectTab={(id) => { setSelectedNoteId(id); setActivePaneId(id); selectNode(id); }}
              onCloseTab={(id) => closeTab(id, "primary")}
              style={splitPaneId && splitDirection ? { flex: `${splitRatio} 1 0%` } : undefined}
            />

            {splitPaneId && splitDirection && (
              <>
                {/* Resizable Divider */}
                <div
                  onMouseDown={handleDividerMouseDown}
                  className={cn(
                    "shrink-0 bg-axiom-edge/40 hover:bg-axiom-cyan/50 transition-colors relative group",
                    splitDirection === "right" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
                  )}
                >
                  <div
                    className={cn(
                      "absolute bg-axiom-cyan/0 group-hover:bg-axiom-cyan/20 transition-colors",
                      splitDirection === "right"
                        ? "inset-y-0 -left-1 -right-1"
                        : "inset-x-0 -top-1 -bottom-1",
                    )}
                  />
                </div>
                <NotePane
                  noteId={splitPaneId}
                  isActivePane={activePaneId === splitPaneId}
                  showCloseButton={true}
                  onClose={closeSplit}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  commitRename={commitRename}
                  setRenamingId={setRenamingId}
                  onActivatePane={() => setActivePaneId(splitPaneId)}
                  onOpenContextMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, type: "note", id: splitPaneId })}
                  onUpdateNode={updateNode}
                  onWikiLinkClick={(noteName) => {
                    const target_note = graph.nodes.find(
                      (n) => n.label.toLowerCase() === noteName.toLowerCase(),
                    );
                    if (target_note) {
                      openNoteInPane(target_note.id, "split");
                      selectNode(target_note.id);
                    } else {
                      const linkEls = document.querySelectorAll(`[data-note="${noteName}"]`);
                      linkEls.forEach((el) => {
                        el.classList.add("text-rose-400");
                        setTimeout(() => el.classList.remove("text-rose-400"), 800);
                      });
                    }
                  }}
                  folderName={folders.find((f) => f.id === graph.nodes.find((n) => n.id === splitPaneId)?.folderId)?.name ?? "none"}
                  showBacklinksPanel={backlinksPaneId === splitPaneId}
                  showSearchBarPanel={searchBarPaneId === splitPaneId}
                  showLinkDropdownPanel={linkDropdownPaneId === splitPaneId}
                  showMoveFolderPanel={moveFolderPaneId === splitPaneId}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  replaceQuery={replaceQuery}
                  setReplaceQuery={setReplaceQuery}
                  onExecuteReplace={() => executeReplace(splitPaneId)}
                  onLinkToNote={(targetId) => linkToNote(splitPaneId, targetId)}
                  onCloseBacklinks={() => setBacklinksPaneId(null)}
                  onCloseSearchBar={() => setSearchBarPaneId(null)}
                  onCloseLinkDropdown={() => setLinkDropdownPaneId(null)}
                  onCloseMoveFolder={() => setMoveFolderPaneId(null)}
                  onMoveToFolder={(folderId) => {
                    const spNote = graph.nodes.find(n => n.id === splitPaneId);
                    if (spNote) {
                      updateNode(splitPaneId, { folderId });
                      setMoveFolderPaneId(null);
                      const fname = folders.find(f => f.id === folderId)?.name ?? "folder";
                      setStatusToast(`Moved "${spNote.label}" to ${fname}.`);
                    }
                  }}
                  // Tab props
                  paneTabs={splitTabs}
                  pane="split"
                  onSelectTab={(id) => { setSplitPaneId(id); setActivePaneId(id); selectNode(id); }}
                  onCloseTab={(id) => closeTab(id, "split")}
                  style={{ flex: `${1 - splitRatio} 1 0%` }}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-axiom-dim text-sm">
            <div className="text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Select a note from the folder tree, or create a new one.</p>
            </div>
          </div>
        )}
      </div>

      {/* Context menu — full Obsidian-style */}
      {contextMenu && (
        <ObsidianContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          noteId={contextMenu.id}
          onClose={() => setContextMenu(null)}
          onRename={() => startRename(contextMenu.id, contextMenu.type)}
          onDelete={() => deleteItem(contextMenu.id, contextMenu.type)}
          onOpenInGraph={() => contextMenu.type === "note" ? openInGraph(contextMenu.id) : setContextMenu(null)}
          onSplitRight={() => contextMenu.type === "note" ? splitRight(contextMenu.id) : setContextMenu(null)}
          onSplitDown={() => contextMenu.type === "note" ? splitDown(contextMenu.id) : setContextMenu(null)}
          onExportPdf={() => contextMenu.type === "note" ? exportToPdf(contextMenu.id) : setContextMenu(null)}
          onBacklinks={() => contextMenu.type === "note" ? showBacklinks(contextMenu.id) : setContextMenu(null)}
          onBookmark={() => contextMenu.type === "note" ? toggleBookmark(contextMenu.id) : setContextMenu(null)}
          onLinkNote={() => contextMenu.type === "note" ? showLinkDropdown(contextMenu.id) : setContextMenu(null)}
          onAddProperties={() => contextMenu.type === "note" ? addFileProperties(contextMenu.id) : setContextMenu(null)}
          onSearch={() => contextMenu.type === "note" ? showSearchBar(contextMenu.id) : setContextMenu(null)}
          onReplace={() => contextMenu.type === "note" ? showSearchBar(contextMenu.id) : setContextMenu(null)}
          onCopyPath={() => contextMenu.type === "note" ? copyPath(contextMenu.id) : setContextMenu(null)}
          onVersionHistory={() => contextMenu.type === "note" ? showVersionHistory(contextMenu.id) : setContextMenu(null)}
          onOpenLinkedView={() => contextMenu.type === "note" ? openLinkedView(contextMenu.id) : setContextMenu(null)}
          onNativeHook={() => {
            const note = graph.nodes.find((n) => n.id === contextMenu.id);
            hookNativeShell(note?.label ?? "unknown");
          }}
          onMarkdownShortcuts={() => { setContextMenu(null); setShowMarkdownShortcuts(true); }}
          onMoveFolder={() => contextMenu.type === "note" ? showMoveFolder(contextMenu.id) : setContextMenu(null)}
        />
      )}

      {/* Stylized Delete confirmation modal */}
      {deleteDialog && (
        <DeleteConfirmDialog
          label={deleteDialog.label}
          type={deleteDialog.type}
          onCancel={() => setDeleteDialog(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* Status toast (bottom-right) */}
      {statusToast && (
        <div className="fixed bottom-4 right-4 z-[600] bg-axiom-panel/95 backdrop-blur-xl border border-axiom-cyan/40 text-axiom-cyan text-xs px-3 py-2 rounded-md shadow-2xl max-w-sm">
          {statusToast}
        </div>
      )}

      {/* Glowing notification (for native-hook messages) */}
      {glowNotification && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-16 right-4 z-[650] max-w-sm"
        >
          <div
            className="bg-axiom-panel/95 backdrop-blur-xl border border-axiom-violet/60 rounded-lg shadow-2xl px-4 py-3 text-xs text-axiom-text"
            style={{ boxShadow: "0 0 24px rgba(139,92,246,0.4), 0 8px 32px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-start gap-2">
              <Monitor className="w-4 h-4 text-axiom-violet shrink-0 mt-0.5 animate-pulse" />
              <div>
                <div className="font-medium text-axiom-violet mb-0.5">Native Hook</div>
                <div className="text-axiom-text/80 leading-relaxed">{glowNotification}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Version History modal */}
      {versionHistoryPaneId && (
        <VersionHistoryModal
          noteId={versionHistoryPaneId}
          onClose={() => setVersionHistoryPaneId(null)}
          onRollback={(ts) => rollbackToVersion(versionHistoryPaneId, ts)}
        />
      )}

      {/* Linked View secondary pane (overlay) */}
      {linkedViewPaneId && (
        <LinkedViewPane
          noteId={linkedViewPaneId}
          onClose={() => setLinkedViewPaneId(null)}
        />
      )}

      {/* Markdown Shortcuts reference panel */}
      {showMarkdownShortcuts && (
        <MarkdownShortcutsPanel onClose={() => setShowMarkdownShortcuts(false)} />
      )}
    </div>
  );
}

// ── Note item — draggable ──────────────────────────────────────────────────

function NoteItem({
  note, depth, selectedNoteId, isDragging, renamingId, renameValue, setRenameValue,
  commitRename, setRenamingId, onSelect, onDragStart, onDragEnd, onContextMenu, onMoreClick,
}: {
  note: MemoryNode;
  depth: number;
  selectedNoteId: string | null;
  isDragging: boolean;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  setRenamingId: (v: string | null) => void;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMoreClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-all border border-transparent",
        isDragging ? "opacity-40" : "",
        selectedNoteId === note.id ? "bg-axiom-panel/60" : "hover:bg-axiom-panel/60",
      )}
      style={{ paddingLeft: depth * 12 + 24 }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <FileText className={cn("w-3 h-3 shrink-0", `text-${KIND_COLORS[note.kind]}`)} />
      {renamingId === note.id ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-axiom-deep/80 border border-axiom-cyan/40 rounded px-1 text-xs text-axiom-text focus:outline-none"
        />
      ) : (
        <span className={cn("text-xs flex-1 truncate", selectedNoteId === note.id ? "text-axiom-text font-medium" : "text-axiom-text/70")}>
          {note.label}
        </span>
      )}
      {/* Bookmark star — visible when note.bookmarked is true */}
      {note.bookmarked && (
        <Star className="w-3 h-3 shrink-0 text-axiom-amber fill-axiom-amber/60" />
      )}
      <span className="text-[9px] text-axiom-dim">{KIND_GLYPHS[note.kind]}</span>
      <button
        onClick={onMoreClick}
        className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded hover:bg-white/10 flex items-center justify-center text-axiom-dim hover:text-axiom-text shrink-0"
      >
        <MoreVertical className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Full Obsidian-style Context Menu ────────────────────────────────────────

interface MenuItem {
  icon: typeof Search;
  color: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  hasSubmenu?: boolean;
  divider?: boolean;
}

function ObsidianContextMenu({
  x, y, type, noteId, onClose, onRename, onDelete, onOpenInGraph,
  onSplitRight, onSplitDown, onExportPdf,
  onBacklinks, onBookmark, onLinkNote, onAddProperties,
  onSearch, onReplace, onCopyPath, onVersionHistory, onOpenLinkedView,
  onNativeHook, onMarkdownShortcuts, onMoveFolder,
}: {
  x: number; y: number; type: "note" | "folder";
  noteId: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenInGraph: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onExportPdf: () => void;
  onBacklinks: () => void;
  onBookmark: () => void;
  onLinkNote: () => void;
  onAddProperties: () => void;
  onSearch: () => void;
  onReplace: () => void;
  onCopyPath: () => void;
  onVersionHistory: () => void;
  onOpenLinkedView: () => void;
  onNativeHook: () => void;
  onMarkdownShortcuts: () => void;
  onMoveFolder: () => void;
}) {
  // Read the note's bookmarked state to label the Bookmark item dynamically
  const { graph } = useAxiom();
  const note = graph.nodes.find((n) => n.id === noteId);
  const isBookmarked = note?.bookmarked === true;

  const items: MenuItem[] = [
    { icon: Search, color: "axiom-cyan", label: "Document Backlinks", onClick: onBacklinks },
    { icon: SplitSquareHorizontal, color: "axiom-violet", label: "Split Right", onClick: onSplitRight },
    { icon: SplitSquareVertical, color: "axiom-violet", label: "Split Down", onClick: onSplitDown, divider: true },
    { icon: Pencil, color: "axiom-amber", label: "Rename", onClick: onRename },
    { icon: FolderOpen, color: "axiom-emerald", label: "Move file to…", onClick: onMoveFolder, hasSubmenu: true, divider: true },
    { icon: Bookmark, color: isBookmarked ? "axiom-amber" : "axiom-dim", label: isBookmarked ? "Remove Bookmark" : "Bookmark…", onClick: onBookmark },
    { icon: Link2, color: "axiom-cyan", label: "Link entire note to…", onClick: onLinkNote, hasSubmenu: true },
    { icon: FilePlus, color: "axiom-emerald", label: "Add file properties", onClick: onAddProperties, divider: true },
    { icon: BookOpen, color: "axiom-cyan", label: "Markdown Shortcuts", onClick: onMarkdownShortcuts },
    { icon: Download, color: "axiom-cyan", label: "Export to PDF", onClick: onExportPdf },
    { icon: Search, color: "axiom-dim", label: "Search…", onClick: onSearch },
    { icon: Replace, color: "axiom-dim", label: "Replace…", onClick: onReplace, divider: true },
    { icon: Copy, color: "axiom-dim", label: "Copy Path", onClick: onCopyPath },
    { icon: History, color: "axiom-dim", label: "Open Version History", onClick: onVersionHistory },
    { icon: Link2, color: "axiom-cyan", label: "Open Linked View", onClick: onOpenLinkedView, hasSubmenu: true, divider: true },
    { icon: Monitor, color: "axiom-dim", label: "Open with Default App", onClick: onNativeHook },
    { icon: FolderOpen, color: "axiom-dim", label: "Show in Folder", onClick: onNativeHook },
    { icon: Monitor, color: "axiom-dim", label: "Show File in File Explorer", onClick: onNativeHook, divider: true },
    { icon: Trash2, color: "axiom-rose", label: `Delete ${type === "note" ? "File" : "Folder"}`, onClick: onDelete, danger: true },
  ];

  // For folders, filter out note-only items
  const folderExcluded = [
    "Document Backlinks", "Split Right", "Split Down",
    "Link entire note to…", "Add file properties", "Export to PDF",
    "Search…", "Replace…", "Copy Path", "Open Version History",
    "Open Linked View", "Open with Default App",
    "Show in Folder", "Show File in File Explorer", "Bookmark…", "Remove Bookmark",
  ];
  const visibleItems = type === "folder"
    ? items.filter(i => !folderExcluded.includes(i.label))
    : items;

  // Adjust position so menu doesn't go off-screen
  const maxX = typeof window !== "undefined" ? window.innerWidth - 240 : x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - 450 : y;
  const adjustedX = Math.min(x, maxX);
  const adjustedY = Math.min(y, maxY);

  return (
    <>
      {/* Click-away catcher */}
      <div className="fixed inset-0 z-[400]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed z-[401] w-56 max-h-[80vh] overflow-y-auto axiom-scroll bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl py-1"
        style={{ left: adjustedX, top: adjustedY, boxShadow: "0 16px 48px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(120,220,255,0.06)" }}
      >
        {type === "note" && (
          <button
            onClick={onOpenInGraph}
            className="w-full px-3 py-1.5 text-xs text-axiom-text hover:bg-axiom-cyan/10 flex items-center gap-2.5 transition-colors"
          >
            <GraphIcon className="w-3.5 h-3.5 text-axiom-cyan shrink-0" />
            <span>Open in Graph View</span>
          </button>
        )}
        {visibleItems.map((item, i) => (
          <div key={i}>
            {item.divider && <div className="h-px bg-axiom-edge/30 my-1 mx-2" />}
            <button
              onClick={item.onClick}
              className={cn(
                "w-full px-3 py-1.5 text-xs flex items-center gap-2.5 transition-colors text-left",
                item.danger
                  ? "text-axiom-rose hover:bg-axiom-rose/10"
                  : "text-axiom-text hover:bg-axiom-cyan/10",
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5 shrink-0", `text-${item.color}`)} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.hasSubmenu && (
                <ChevronRight className="w-3 h-3 text-axiom-dim/50 shrink-0" />
              )}
            </button>
          </div>
        ))}
      </motion.div>
    </>
  );
}

// ── NotePane — a single note editor instance (used for primary + split panes) ─

function NotePane({
  noteId, isActivePane, showCloseButton, onClose,
  viewMode, setViewMode,
  renamingId, renameValue, setRenameValue, commitRename, setRenamingId,
  onActivatePane, onOpenContextMenu, onUpdateNode, onWikiLinkClick, folderName,
  // Feature panel state (passed from parent so context-menu actions control panes)
  showBacklinksPanel, showSearchBarPanel, showLinkDropdownPanel,
  searchQuery, setSearchQuery, replaceQuery, setReplaceQuery,
  onExecuteReplace, onLinkToNote, onCloseBacklinks, onCloseSearchBar, onCloseLinkDropdown,
  onCloseMoveFolder, onMoveToFolder, showMoveFolderPanel,
  // Tab props
  paneTabs, pane, onSelectTab, onCloseTab, style,
}: {
  noteId: string;
  isActivePane: boolean;
  showCloseButton: boolean;
  onClose?: () => void;
  viewMode: "reading" | "editing";
  setViewMode: (v: "reading" | "editing") => void;
  renamingId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  setRenamingId: (v: string | null) => void;
  onActivatePane: () => void;
  onOpenContextMenu: (e: React.MouseEvent) => void;
  onUpdateNode: (id: string, patch: Partial<MemoryNode>) => void;
  onWikiLinkClick: (noteName: string) => void;
  folderName: string;
  showBacklinksPanel: boolean;
  showSearchBarPanel: boolean;
  showLinkDropdownPanel: boolean;
  showMoveFolderPanel: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  replaceQuery: string;
  setReplaceQuery: (v: string) => void;
  onExecuteReplace: () => void;
  onLinkToNote: (targetId: string) => void;
  onCloseBacklinks: () => void;
  onCloseSearchBar: () => void;
  onCloseLinkDropdown: () => void;
  onCloseMoveFolder: () => void;
  onMoveToFolder: (folderId: string) => void;
  // Tab props
  paneTabs: string[];
  pane: "primary" | "split";
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  style?: React.CSSProperties;
}) {
  const { graph, folders } = useAxiom();
  const note = graph.nodes.find((n) => n.id === noteId);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isRenaming = renamingId === noteId;

  // When this pane enters rename mode, focus the title input and select all text.
  useEffect(() => {
    if (isRenaming && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenaming]);

  // ── Backlinks: scan all other notes for [[This Note Name]] ──
  const backlinks = useMemo(() => {
    if (!note) return [];
    const noteName = note.label.toLowerCase();
    return graph.nodes.filter(
      (n) => n.id !== note.id && (n.content || "").toLowerCase().includes(`[[${noteName}]]`),
    );
  }, [graph.nodes, note]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-axiom-dim text-xs">
        Note not found.
      </div>
    );
  }

  return (
    <div
      data-pane-id={note.id}
      onMouseDown={onActivatePane}
      className={cn(
        "flex-1 flex flex-col min-w-0 min-h-0 transition-colors relative",
        isActivePane ? "bg-transparent" : "bg-axiom-void/20",
      )}
      style={style}
    >
      {/* Tab strip — Obsidian-style open-note tabs */}
      {paneTabs.length > 1 && (
        <div className="flex items-stretch border-b border-axiom-edge/40 bg-axiom-deep/40 overflow-x-auto axiom-scroll shrink-0">
          {paneTabs.map((tabId) => {
            const tabNote = graph.nodes.find((n) => n.id === tabId);
            if (!tabNote) return null;
            const isActive = tabId === noteId;
            return (
              <div
                key={tabId}
                onClick={(e) => { e.stopPropagation(); onSelectTab(tabId); }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-axiom-edge/30 shrink-0 transition-colors",
                  isActive
                    ? "bg-axiom-panel/60 text-axiom-text border-b-2 border-b-axiom-cyan"
                    : "text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/30",
                )}
                title={tabNote.label}
              >
                <span className={cn("text-[11px]", `text-${KIND_COLORS[tabNote.kind]}`)}>
                  {KIND_GLYPHS[tabNote.kind]}
                </span>
                <span className="max-w-[120px] truncate">{tabNote.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tabId); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="p-3 border-b border-axiom-edge/40 flex items-center gap-2">
        <span className={cn("text-base", `text-${KIND_COLORS[note.kind]}`)}>
          {KIND_GLYPHS[note.kind]}
        </span>
        <input
          ref={titleInputRef}
          value={isRenaming ? renameValue : note.label}
          onChange={(e) => {
            if (isRenaming) setRenameValue(e.target.value);
            else onUpdateNode(note.id, { label: e.target.value });
          }}
          onKeyDown={(e) => {
            if (!isRenaming) return;
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
          onBlur={() => {
            if (isRenaming) commitRename();
          }}
          className={cn(
            "flex-1 bg-transparent text-sm font-medium text-axiom-text focus:outline-none rounded px-1 transition-colors",
            isRenaming && "bg-axiom-deep/80 border border-axiom-cyan/40",
          )}
        />
        {/* Bookmark star indicator in header */}
        {note.bookmarked && (
          <Star className="w-3.5 h-3.5 text-axiom-amber fill-axiom-amber/60 shrink-0" />
        )}
        <AxiomSelect
          value={note.kind}
          onChange={(v) => onUpdateNode(note.id, { kind: v as any })}
          options={Object.entries(KIND_COLORS).map(([k]) => ({ value: k, label: k }))}
          size="sm"
          className="w-24"
        />
        {/* View/Edit toggle */}
        <button
          onClick={() => setViewMode(viewMode === "reading" ? "editing" : "reading")}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center border transition-colors",
            viewMode === "reading"
              ? "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan"
              : "border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber",
          )}
          title={viewMode === "reading" ? "Reading View (click to edit)" : "Editing View (click to lock)"}
        >
          {viewMode === "reading" ? <Book className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
        {/* Three-dots → full context menu */}
        <button
          onClick={onOpenContextMenu}
          className="w-8 h-8 rounded-md flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors"
          title="More options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {/* Close-split X button (only shown on the secondary pane) */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-axiom-rose/40 text-axiom-rose hover:bg-axiom-rose/10 transition-colors"
            title="Close split pane"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Link-note dropdown (anchored under the header) */}
        {showLinkDropdownPanel && (
          <div className="absolute top-12 right-4 z-50 w-64 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-cyan/40 rounded-lg shadow-2xl max-h-64 overflow-y-auto axiom-scroll">
            <div className="px-3 py-2 border-b border-axiom-edge/40 text-[10px] uppercase tracking-wider text-axiom-cyan flex items-center justify-between">
              <span>Link to note</span>
              <button onClick={onCloseLinkDropdown} className="text-axiom-dim hover:text-axiom-text">
                <X className="w-3 h-3" />
              </button>
            </div>
            {graph.nodes.filter((n) => n.id !== note.id).length === 0 ? (
              <div className="px-3 py-4 text-xs text-axiom-dim text-center">No other notes.</div>
            ) : (
              graph.nodes.filter((n) => n.id !== note.id).map((n) => (
                <button
                  key={n.id}
                  onClick={() => onLinkToNote(n.id)}
                  className="w-full px-3 py-1.5 text-xs text-axiom-text/80 hover:bg-axiom-cyan/10 hover:text-axiom-text flex items-center gap-2 text-left transition-colors"
                >
                  <FileText className={cn("w-3 h-3 shrink-0", `text-${KIND_COLORS[n.kind]}`)} />
                  <span className="flex-1 truncate">{n.label}</span>
                </button>
              ))
            )}
          </div>
        )}
        {showMoveFolderPanel && (
          <div className="absolute top-12 right-4 z-50 w-64 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-emerald/40 rounded-lg shadow-2xl max-h-64 overflow-y-auto axiom-scroll">
            <div className="px-3 py-2 border-b border-axiom-edge/40 text-[10px] uppercase tracking-wider text-axiom-emerald flex items-center justify-between">
              <span>Move to folder</span>
              <button onClick={onCloseMoveFolder} className="text-axiom-dim hover:text-axiom-text">
                <X className="w-3 h-3" />
              </button>
            </div>
            {/* Root folder option (no folder) */}
            <button
              onClick={() => onMoveToFolder("f_root")}
              className={cn(
                "w-full px-3 py-1.5 text-xs flex items-center gap-2 text-left transition-colors",
                note.folderId === "f_root" || !note.folderId
                  ? "bg-axiom-emerald/10 text-axiom-emerald"
                  : "text-axiom-text/80 hover:bg-axiom-emerald/10 hover:text-axiom-text",
              )}
            >
              <FolderTree className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">Root</span>
              {(note.folderId === "f_root" || !note.folderId) && (
                <span className="text-[9px] text-axiom-emerald uppercase">current</span>
              )}
            </button>
            {folders
              .filter((f) => f.id !== "f_root")
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => onMoveToFolder(f.id)}
                  className={cn(
                    "w-full px-3 py-1.5 text-xs flex items-center gap-2 text-left transition-colors",
                    note.folderId === f.id
                      ? "bg-axiom-emerald/10 text-axiom-emerald"
                      : "text-axiom-text/80 hover:bg-axiom-emerald/10 hover:text-axiom-text",
                  )}
                >
                  <FolderTree className="w-3 h-3 shrink-0" />
                  <span className="flex-1 truncate">{f.name}</span>
                  {note.folderId === f.id && (
                    <span className="text-[9px] text-axiom-emerald uppercase">current</span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Search/Replace utility bar (slides down from header) */}
      <AnimatePresence>
        {showSearchBarPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-axiom-edge/40 bg-axiom-deep/60"
          >
            <div className="p-2 flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <Search className="w-3 h-3 text-axiom-cyan shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-2 py-1 text-xs focus:outline-none focus:border-axiom-cyan/40"
                />
              </div>
              <div className="flex items-center gap-1 flex-1">
                <Replace className="w-3 h-3 text-axiom-violet shrink-0" />
                <input
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with…"
                  className="flex-1 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-2 py-1 text-xs focus:outline-none focus:border-axiom-violet/40"
                />
              </div>
              <button
                onClick={onExecuteReplace}
                disabled={!searchQuery}
                className="px-2 py-1 text-xs rounded border border-axiom-violet/40 text-axiom-violet hover:bg-axiom-violet/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Replace All
              </button>
              <button
                onClick={onCloseSearchBar}
                className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {searchQuery && (
              <div className="px-3 pb-2 text-[10px] text-axiom-dim">
                {(note.content || "").split(searchQuery).length - 1} match(es) found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex-1 overflow-y-auto axiom-scroll min-h-0 relative",
          viewMode === "reading" && "bg-axiom-void/30",
        )}
      >
        <LivePreviewEditor
          value={note.content || ""}
          onChange={(content) => onUpdateNode(note.id, { content })}
          readOnly={viewMode === "reading"}
          onWikiLinkClick={onWikiLinkClick}
        />
        {/* Search highlight overlay — when searchQuery is active, scroll into view + highlight via DOM */}
        {showSearchBarPanel && searchQuery && (
          <SearchHighlighter query={searchQuery} />
        )}
      </div>

      {/* Backlinks collapsible panel (bottom) */}
      <AnimatePresence>
        {showBacklinksPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-axiom-edge/40 bg-axiom-deep/60"
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-axiom-cyan">
                  <Link2 className="w-3 h-3" />
                  Document Backlinks ({backlinks.length})
                </div>
                <button
                  onClick={onCloseBacklinks}
                  className="w-5 h-5 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {backlinks.length === 0 ? (
                <p className="text-xs text-axiom-dim italic">No other notes link to this one.</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto axiom-scroll">
                  {backlinks.map((n) => {
                    const folder = folders.find((f) => f.id === n.folderId);
                    return (
                      <div
                        key={n.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-axiom-panel/60 cursor-pointer text-xs"
                        onClick={() => onWikiLinkClick(n.label)}
                      >
                        <FileText className={cn("w-3 h-3 shrink-0", `text-${KIND_COLORS[n.kind]}`)} />
                        <span className="flex-1 truncate text-axiom-text/80">{n.label}</span>
                        <span className="text-[9px] text-axiom-dim">{folder?.name ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-2 border-t border-axiom-edge/40 text-[10px] text-axiom-dim flex items-center justify-between">
        <span>
          {viewMode === "reading" ? "📖 Read-Only Live Preview" : "⚡ Live Preview Editor"} · {note.kind} · {folderName}
        </span>
        <span>created {new Date(note.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

// ── SearchHighlighter — wraps matching text nodes in <mark> ──────────────────

function SearchHighlighter({ query }: { query: string }) {
  useEffect(() => {
    if (!query) return;
    // Find all text nodes inside .live-preview-editor and wrap matches
    const editor = document.activeElement?.closest(".live-preview-editor") as HTMLElement | null;
    if (!editor) return;
    // Use window.find() if available, else just visually mark via CSS class on the container
    editor.classList.add("search-active");
    return () => {
      editor.classList.remove("search-active");
    };
  }, [query]);
  return null;
}

// ── DeleteConfirmDialog — stylized alert modal ──────────────────────────────

function DeleteConfirmDialog({
  label, type, onCancel, onConfirm,
}: {
  label: string;
  type: "note" | "folder";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Keyboard shortcuts: Enter = confirm, Escape = cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-axiom-void/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4 bg-axiom-panel/95 border border-axiom-rose/40 rounded-xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 64px -12px rgba(0,0,0,0.9), 0 0 0 1px rgba(244,63,94,0.15)" }}
      >
        {/* Header bar */}
        <div className="px-5 py-3 border-b border-axiom-rose/30 bg-axiom-rose/5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-axiom-rose" />
          <span className="text-xs uppercase tracking-wider text-axiom-rose font-medium">
            Confirm Delete
          </span>
        </div>
        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-axiom-text/90 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-axiom-text">&quot;{label}&quot;</span>
            {type === "folder" && (
              <span className="text-axiom-rose"> and all its contents</span>
            )}
            ?
          </p>
          <p className="text-xs text-axiom-dim mt-2">
            This action cannot be undone.
          </p>
        </div>
        {/* Actions */}
        <div className="px-5 py-3 border-t border-axiom-edge/40 bg-axiom-deep/40 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-md border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs rounded-md bg-axiom-rose/20 border border-axiom-rose/50 text-axiom-rose hover:bg-axiom-rose/30 transition-colors font-medium flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            Delete {type === "note" ? "File" : "Folder"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── VersionHistoryModal — side modal with 3 mock auto-save snapshots ────────

function VersionHistoryModal({
  noteId, onClose, onRollback,
}: {
  noteId: string;
  onClose: () => void;
  onRollback: (ts: number) => void;
}) {
  const { graph } = useAxiom();
  const note = graph.nodes.find((n) => n.id === noteId);
  const versions = note?.versionHistory ?? [];

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[700] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-axiom-void/70 backdrop-blur-sm" onClick={onClose} />
      {/* Side modal */}
      <motion.div
        initial={{ x: 360, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 360, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative z-10 w-96 max-w-[90vw] h-full bg-axiom-panel/95 border-l border-axiom-cyan/40 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-axiom-edge/40 bg-axiom-deep/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-axiom-cyan" />
            <span className="text-xs uppercase tracking-wider text-axiom-cyan font-medium">
              Version History
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-4">
          <p className="text-xs text-axiom-dim mb-4 leading-relaxed">
            Auto-save snapshots for{" "}
            <span className="text-axiom-text font-medium">{note?.label}</span>.
            Click a version to roll back the editor content.
          </p>
          {versions.length === 0 ? (
            <p className="text-xs text-axiom-dim italic">No version history available.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v, i) => (
                <motion.button
                  key={v.ts}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onRollback(v.ts)}
                  className="w-full text-left p-3 rounded-lg border border-axiom-edge/40 hover:border-axiom-cyan/40 hover:bg-axiom-cyan/5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-axiom-cyan/10 border border-axiom-cyan/30 flex items-center justify-center shrink-0">
                      <History className="w-3.5 h-3.5 text-axiom-cyan" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-axiom-text mb-0.5">
                        {v.label}
                      </div>
                      <div className="text-[10px] text-axiom-dim mb-1.5">
                        {new Date(v.ts).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-axiom-dim/70 line-clamp-2 leading-relaxed">
                        {v.content.slice(0, 120)}
                        {v.content.length > 120 ? "…" : ""}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-axiom-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-axiom-edge/40 bg-axiom-deep/40 text-[10px] text-axiom-dim">
          Rollback replaces the current editor content. The current version is preserved in the next auto-save.
        </div>
      </motion.div>
    </div>
  );
}

// ── LinkedViewPane — secondary split-pane with a local node graph ────────────
// Shows the active note at the center with its direct link neighbors arranged
// in a circle around it. Edges are drawn as SVG lines. Updates live as the
// note's content (and thus its [[wikilinks]]) change.

function LinkedViewPane({
  noteId, onClose,
}: {
  noteId: string;
  onClose: () => void;
}) {
  const { graph } = useAxiom();
  const note = graph.nodes.find((n) => n.id === noteId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 360 });

  // Resize observer to keep the canvas sized to its container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Find neighbors: notes whose label appears in this note's [[wikilinks]]
  // OR notes that link to this note.
  const neighbors = useMemo(() => {
    if (!note) return [];
    const noteName = note.label.toLowerCase();
    // Outbound: [[Target]] mentioned in this note's content
    const outbound = (note.content || "").match(/\[\[([^\]]+)\]\]/g) ?? [];
    const outboundNames = outbound.map((m) => m.slice(2, -2).toLowerCase());
    // Inbound: other notes whose content contains [[This Note Name]]
    const inbound = graph.nodes.filter(
      (n) => n.id !== note.id && (n.content || "").toLowerCase().includes(`[[${noteName}]]`),
    );
    // Resolve outbound names to actual nodes
    const outboundNodes = outboundNames
      .map((name) => graph.nodes.find((n) => n.label.toLowerCase() === name))
      .filter((n): n is MemoryNode => n !== undefined);
    // Merge + dedupe
    const all = [...outboundNodes, ...inbound];
    const seen = new Set<string>();
    return all.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [graph.nodes, note]);

  if (!note) return null;

  const cx = size.w / 2;
  const cy = size.h / 2;
  const radius = Math.min(size.w, size.h) / 2 - 50;

  return (
    <div className="fixed inset-0 z-[680] flex items-center justify-center pointer-events-none">
      {/* Container — pointer events re-enabled on the panel itself */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative pointer-events-auto bg-axiom-panel/95 backdrop-blur-xl border border-axiom-cyan/40 rounded-xl shadow-2xl flex flex-col"
        style={{ width: "min(560px, 90vw)", height: "min(560px, 85vh)", boxShadow: "0 24px 64px -12px rgba(0,0,0,0.9), 0 0 24px rgba(120,220,255,0.15)" }}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-axiom-edge/40 bg-axiom-deep/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-axiom-cyan" />
            <span className="text-xs uppercase tracking-wider text-axiom-cyan font-medium">
              Linked View — {note.label}
            </span>
            <span className="text-[10px] text-axiom-dim">({neighbors.length} neighbors)</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Graph canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <svg width={size.w} height={size.h} className="absolute inset-0">
            {/* Edges */}
            {neighbors.map((n, i) => {
              const angle = (i / Math.max(neighbors.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(angle) * radius;
              const y = cy + Math.sin(angle) * radius;
              return (
                <line
                  key={`edge-${n.id}`}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="rgba(120,220,255,0.3)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              );
            })}
            {/* Neighbor nodes */}
            {neighbors.map((n, i) => {
              const angle = (i / Math.max(neighbors.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const x = cx + Math.cos(angle) * radius;
              const y = cy + Math.sin(angle) * radius;
              const color = KIND_COLORS[n.kind] ?? "axiom-cyan";
              return (
                <g key={`node-${n.id}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill={`var(--color-${color}, rgb(120,220,255))`}
                    opacity={0.8}
                  />
                  <text
                    x={x}
                    y={y - 12}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(220,230,240,0.8)"
                    className="pointer-events-none"
                  >
                    {n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label}
                  </text>
                </g>
              );
            })}
            {/* Central node */}
            <circle cx={cx} cy={cy} r={14} fill="rgba(120,220,255,0.9)" />
            <circle cx={cx} cy={cy} r={22} fill="none" stroke="rgba(120,220,255,0.4)" strokeWidth={1}>
              <animate attributeName="r" from="22" to="32" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
            </circle>
            <text
              x={cx}
              y={cy + 32}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="rgba(220,230,240,0.95)"
              className="pointer-events-none"
            >
              {note.label.length > 22 ? note.label.slice(0, 20) + "…" : note.label}
            </text>
          </svg>
          {neighbors.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs text-axiom-dim italic">
                No linked notes. Use &quot;Link entire note to…&quot; to create connections.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Markdown Shortcuts reference panel ──────────────────────────────────────

const MARKDOWN_SHORTCUTS = [
  { icon: Hash, syntax: "# ", name: "Heading 1", desc: "Large neon title", example: "# My Title" },
  { icon: Hash, syntax: "## ", name: "Heading 2", desc: "Medium cyan title", example: "## Section" },
  { icon: Hash, syntax: "### ", name: "Heading 3", desc: "Smaller heading", example: "### Subsection" },
  { icon: Hash, syntax: "#### ", name: "Heading 4-6", desc: "Progressively smaller headings", example: "#### Deep heading" },
  { icon: Bold, syntax: "**text**", name: "Bold", desc: "Bold text", example: "**important**" },
  { icon: Italic, syntax: "*text*", name: "Italic", desc: "Italic text", example: "*emphasis*" },
  { icon: Italic, syntax: "_text_", name: "Italic (underscore)", desc: "Alternative italic syntax", example: "_emphasis_" },
  { icon: Strikethrough, syntax: "~~text~~", name: "Strikethrough", desc: "Crossed-out text", example: "~~deleted~~" },
  { icon: Code, syntax: "`code`", name: "Inline code", desc: "Monospace code badge", example: "`const x = 1`" },
  { icon: Code, syntax: "```", name: "Code block", desc: "Multi-line code fence", example: "```js\ncode here\n```" },
  { icon: Link, syntax: "[[Note]]", name: "Wiki link", desc: "Clickable link to another note", example: "[[Axiom OS]]" },
  { icon: ListChecks, syntax: "- [ ] ", name: "Task (open)", desc: "Interactive unchecked checkbox", example: "- [ ] Buy milk" },
  { icon: ListChecks, syntax: "- [x] ", name: "Task (done)", desc: "Interactive checked checkbox", example: "- [x] Done" },
  { icon: List, syntax: "- ", name: "Bullet list", desc: "Bullet point with cyan dot", example: "- Item" },
  { icon: List, syntax: "* ", name: "Bullet list (alt)", desc: "Alternative bullet syntax", example: "* Item" },
  { icon: List, syntax: "1. ", name: "Numbered list", desc: "Auto-numbered list item", example: "1. First" },
  { icon: Quote, syntax: "> ", name: "Blockquote", desc: "Quoted text with cyan accent line", example: "> Wisdom" },
  { icon: Minus, syntax: "---", name: "Horizontal rule", desc: "Glowing neon divider line", example: "---" },
  { icon: Minus, syntax: "___", name: "Horizontal rule (alt)", desc: "Alternative divider syntax", example: "___" },
];

function MarkdownShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-axiom-panel/95 backdrop-blur-xl border border-axiom-cyan/40 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ boxShadow: "0 0 40px rgba(34,211,238,0.15), 0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-axiom-edge/40">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-axiom-cyan" />
            <h2 className="text-sm font-semibold text-axiom-text uppercase tracking-wider">
              Markdown Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-4">
          <div className="grid gap-2">
            {MARKDOWN_SHORTCUTS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-axiom-void/30 border border-axiom-edge/20 hover:border-axiom-cyan/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center bg-axiom-cyan/10 border border-axiom-cyan/20 shrink-0">
                    <Icon className="w-4 h-4 text-axiom-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-axiom-text">{s.name}</div>
                    <div className="text-[11px] text-axiom-dim">{s.desc}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <code className="px-2 py-1 rounded bg-axiom-void/60 text-axiom-cyan text-xs font-mono border border-axiom-cyan/20">
                      {s.syntax}
                    </code>
                    <span className="text-axiom-dim text-xs">→</span>
                    <code className="px-2 py-1 rounded bg-axiom-void/40 text-axiom-text/70 text-xs font-mono">
                      {s.example}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-4 p-3 rounded-lg bg-axiom-cyan/5 border border-axiom-cyan/15">
            <p className="text-[11px] text-axiom-dim leading-relaxed">
              <span className="text-axiom-cyan font-medium">Tip:</span> These shortcuts work in the Editing View. Switch to Reading View (click the pencil icon) to see the fully rendered preview. When editing, the line under your cursor shows raw syntax — all other lines show the formatted preview.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

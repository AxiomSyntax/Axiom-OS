"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Upload, Trash2, Check, X, Loader2, Folder, FolderPlus, ChevronRight,
  ExternalLink, ClipboardPaste, Pencil, Move, Home, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listAvailableLibraries,
  getProvider,
  GlyphRenderer,
  useWorkspaceAssets,
  saveWorkspaceAsset,
  deleteWorkspaceAsset,
  renameWorkspaceAsset,
  moveWorkspaceAsset,
  listAssetsInFolder,
  listSubfolders,
  getFolder,
  getFileName,
  joinPath,
  isValidSvg,
  hashSvg,
  suggestSvgName,
} from "@/lib/axiom/icons";

// ════════════════════════════════════════════════════════════════════════════
//  Asset Picker — three icon sources
// ════════════════════════════════════════════════════════════════════════════
//
//  1. AXIOM — built-in geometric glyphs (local, permanent)
//  2. WORKSPACE ASSETS — user's personal imported SVG library (folders, search)
//  3. EXTERNAL LIBRARIES — provider cards linking to official websites + paste-SVG import
//
//  External libraries are NOT bundled. The user visits the official site,
//  copies an SVG, returns to Axiom, and pastes it. Only the pasted SVG is
//  stored — in Workspace Assets.

type PickerTab = "axiom" | "workspace" | "external";

const EXTERNAL_LIBRARIES = [
  { id: "lucide", name: "Lucide", url: "https://lucide.dev/icons", description: "Clean, consistent line-art icons" },
  { id: "phosphor", name: "Phosphor", url: "https://phosphoricons.com", description: "Flexible icon families (6 weights)" },
  { id: "heroicons", name: "Heroicons", url: "https://heroicons.com", description: "Hand-crafted SVG icons by Tailwind" },
  { id: "tabler", name: "Tabler", url: "https://tabler.io/icons", description: "4800+ fully customizable icons" },
];

export interface AssetPickerProps {
  selectedGlyph?: string;
  onSelect: (glyph: string) => void;
  accentColor?: string;
  compact?: boolean;
}

export function AssetPicker({
  selectedGlyph,
  onSelect,
  accentColor = "axiom-amethyst",
  compact = false,
}: AssetPickerProps) {
  const libraries = useMemo(() => listAvailableLibraries(), []);
  // Axiom is always the first tab (and default)
  const [activeTab, setActiveTab] = useState<PickerTab>("axiom");

  return (
    <div className="space-y-3">
      {/* Tab bar — exactly 3 tabs */}
      <div className="flex items-center gap-1">
        {libraries.map((lib) => {
          const tabId = lib.id as PickerTab;
          if (tabId !== "axiom" && tabId !== "workspace") return null;
          return (
            <button
              key={lib.id}
              onClick={() => setActiveTab(tabId)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium border transition-colors",
                tabId === activeTab
                  ? cn(`border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor}`)
                  : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
              )}
            >
              {lib.id === "axiom" ? "Axiom" : "Workspace"}
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab("external")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium border transition-colors",
            "external" === activeTab
              ? cn(`border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor}`)
              : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
          )}
        >
          <ExternalLink className="w-2.5 h-2.5" />
          External
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "axiom" && (
        <AxiomTab
          selectedGlyph={selectedGlyph}
          onSelect={onSelect}
          accentColor={accentColor}
          compact={compact}
        />
      )}
      {activeTab === "workspace" && (
        <WorkspaceTab
          selectedGlyph={selectedGlyph}
          onSelect={onSelect}
          accentColor={accentColor}
          compact={compact}
        />
      )}
      {activeTab === "external" && (
        <ExternalTab
          selectedGlyph={selectedGlyph}
          onSelect={onSelect}
          accentColor={accentColor}
          onSwitchToWorkspace={() => setActiveTab("workspace")}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  1. AXIOM TAB — built-in geometric glyphs
// ════════════════════════════════════════════════════════════════════════════

function AxiomTab({
  selectedGlyph,
  onSelect,
  accentColor,
  compact,
}: {
  selectedGlyph?: string;
  onSelect: (glyph: string) => void;
  accentColor: string;
  compact?: boolean;
}) {
  const provider = getProvider("axiom");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const categories = useMemo(() => provider?.listCategories() ?? [], [provider]);
  const displayIcons = useMemo(() => {
    if (!provider) return [];
    if (searchQuery.trim()) return provider.searchIcons(searchQuery);
    if (activeCategoryId) return provider.listIcons(activeCategoryId);
    return provider.listIcons();
  }, [provider, searchQuery, activeCategoryId]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="w-3 h-3 text-axiom-dim/50 absolute left-2 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Axiom glyphs…"
          className="w-full bg-axiom-void/60 border border-axiom-edge/40 rounded pl-7 pr-2 py-1 text-[10px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-amethyst/40"
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && !searchQuery && (
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            onClick={() => setActiveCategoryId(null)}
            className={cn(
              "px-1.5 py-0.5 rounded text-[9px] border transition-colors",
              !activeCategoryId
                ? cn(`bg-${accentColor}/10 border-${accentColor}/30 text-${accentColor}`)
                : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] border transition-colors",
                cat.id === activeCategoryId
                  ? cn(`bg-${accentColor}/10 border-${accentColor}/30 text-${accentColor}`)
                  : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text",
              )}
            >
              {cat.label}
              <span className="ml-1 text-[8px] opacity-50">{cat.iconNames.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Glyph grid — dense icon browser.
          Small tiles (h-7), minimal padding, no border on unselected items.
          Maximizes visible icons without scrolling. Icons stay centered at w-4 h-4. */}
      <div className="max-h-56 overflow-y-auto axiom-scroll">
        {displayIcons.length === 0 ? (
          <div className="text-center py-8 text-[10px] text-axiom-dim/50">No glyphs found.</div>
        ) : (
          <div className={cn("grid gap-0.5", compact ? "grid-cols-12" : "grid-cols-10 sm:grid-cols-12 md:grid-cols-14")}>
            {displayIcons.map((glyph) => (
              <button
                key={glyph}
                onClick={() => onSelect(glyph)}
                className={cn(
                  "w-full h-7 rounded flex items-center justify-center transition-all",
                  glyph === selectedGlyph
                    ? cn(`bg-${accentColor}/15 ring-1 ring-${accentColor}/50`)
                    : "hover:bg-white/5",
                )}
                title={glyph}
              >
                <GlyphRenderer glyph={glyph} className="w-4 h-4" textClassName="text-base leading-none" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  2. WORKSPACE ASSETS TAB — user's personal icon library
// ════════════════════════════════════════════════════════════════════════════

function WorkspaceTab({
  selectedGlyph,
  onSelect,
  accentColor,
  compact,
}: {
  selectedGlyph?: string;
  onSelect: (glyph: string) => void;
  accentColor: string;
  compact?: boolean;
}) {
  const workspaceAssets = useWorkspaceAssets();
  const [currentFolder, setCurrentFolder] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moving, setMoving] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subfolders = useMemo(() => listSubfolders(currentFolder), [currentFolder, workspaceAssets.assets]);
  const assets = useMemo(() => {
    if (searchQuery.trim()) {
      // Search across ALL assets regardless of folder
      return workspaceAssets.assets.filter((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return listAssetsInFolder(currentFolder);
  }, [currentFolder, searchQuery, workspaceAssets.assets]);

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    if (!currentFolder) return [{ label: "Home", folder: "" }];
    const parts = currentFolder.split("/");
    const crumbs = [{ label: "Home", folder: "" }];
    for (let i = 1; i <= parts.length; i++) {
      const folder = parts.slice(0, i).join("/");
      crumbs.push({ label: parts[i - 1], folder });
    }
    return crumbs;
  }, [currentFolder]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        const name = joinPath(currentFolder, file.name);
        await saveWorkspaceAsset(name, text);
      }
    } catch (err) {
      console.error("Failed to import SVG:", err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentFolder]);

  // Drag & drop SVG files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".svg")) continue;
        const text = await file.text();
        const name = joinPath(currentFolder, file.name);
        await saveWorkspaceAsset(name, text);
      }
    } catch (err) {
      console.error("Failed to import SVG:", err);
    } finally {
      setImporting(false);
    }
  }, [currentFolder]);

  // Drag asset onto folder
  const handleAssetDragStart = useCallback((e: React.DragEvent, assetPath: string) => {
    e.dataTransfer.setData("text/asset-path", assetPath);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    const assetPath = e.dataTransfer.getData("text/asset-path");
    if (assetPath) {
      await moveWorkspaceAsset(assetPath, targetFolder);
    }
  }, []);

  const handleRename = useCallback(async () => {
    if (!renaming || !renameValue.trim()) return;
    await renameWorkspaceAsset(renaming, renameValue.trim());
    setRenaming(null);
    setRenameValue("");
  }, [renaming, renameValue]);

  const handleDelete = useCallback(async (path: string) => {
    if (confirm(`Delete "${getFileName(path)}"?`)) {
      await deleteWorkspaceAsset(path);
    }
  }, []);

  const handleMoveToRoot = useCallback(async (assetPath: string) => {
    await moveWorkspaceAsset(assetPath, "");
    setMoving(null);
  }, []);

  const folderList = useMemo(() => listSubfolders(""), []);

  return (
    <div className="space-y-2" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Breadcrumb + actions */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto axiom-scroll-x">
          {breadcrumb.map((crumb, i) => (
            <button
              key={crumb.folder + i}
              onClick={() => { setCurrentFolder(crumb.folder); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap shrink-0",
                i === breadcrumb.length - 1 ? cn(`bg-${accentColor}/10 text-${accentColor}`) : "text-axiom-dim hover:text-axiom-text",
              )}
            >
              {i === 0 ? <Home className="w-2.5 h-2.5" /> : crumb.label}
              {i < breadcrumb.length - 1 && <ChevronRight className="w-2 h-2 opacity-40" />}
            </button>
          ))}
        </div>
        <button
          onClick={handleImportClick}
          disabled={importing}
          className={cn(
            "px-2 py-0.5 rounded text-[9px] border flex items-center gap-1 transition-colors shrink-0",
            `border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor} hover:bg-${accentColor}/20`,
          )}
        >
          {importing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
          Import
        </button>
        <input ref={fileInputRef} type="file" accept=".svg,image/svg+xml" multiple onChange={handleFileSelected} className="hidden" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3 h-3 text-axiom-dim/50 absolute left-2 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all assets…"
          className="w-full bg-axiom-void/60 border border-axiom-edge/40 rounded pl-7 pr-2 py-1 text-[10px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-amethyst/40"
        />
      </div>

      {/* Asset grid */}
      <div
        className={cn(
          "max-h-52 overflow-y-auto axiom-scroll rounded border transition-colors",
          dragOver ? cn(`border-${accentColor}/60 bg-${accentColor}/5`) : "border-axiom-edge/20",
        )}
      >
        {dragOver ? (
          <div className="flex items-center justify-center py-8 text-[10px] text-axiom-dim/60">
            <Download className="w-4 h-4 mr-2" />
            Drop SVG files to import…
          </div>
        ) : subfolders.length === 0 && assets.length === 0 ? (
          <div className="text-center py-8 text-[10px] text-axiom-dim/50">
            {searchQuery.trim()
              ? "No assets found."
              : "No assets yet. Click Import or drag SVG files here. You can also paste SVGs from the External tab."}
          </div>
        ) : (
          <div className={cn("grid gap-0.5 p-0.5", compact ? "grid-cols-10" : "grid-cols-8 sm:grid-cols-10 md:grid-cols-12")}>
            {/* Subfolders */}
            {!searchQuery.trim() && subfolders.map((folder) => {
              const folderPath = currentFolder ? `${currentFolder}/${folder}` : folder;
              return (
                <button
                  key={folder}
                  onClick={() => { setCurrentFolder(folderPath); setSearchQuery(""); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => handleFolderDrop(e, folderPath)}
                  className={cn(
                    "w-full h-8 rounded flex flex-col items-center justify-center gap-0 transition-all hover:bg-white/5",
                  )}
                  title={folder}
                >
                  <Folder className="w-3.5 h-3.5 text-axiom-amber/70" />
                  <span className="text-[7px] text-axiom-dim truncate max-w-full px-0.5">{folder}</span>
                </button>
              );
            })}
            {/* Assets */}
            {assets.map((path) => {
              const fileName = getFileName(path);
              const isSelected = path === selectedGlyph;
              return (
                <div key={path} className="relative group">
                  {renaming === path ? (
                    <div className="w-full h-7 rounded flex items-center p-0.5">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(null); setRenameValue(""); } }}
                        autoFocus
                        className="w-full bg-axiom-void border border-axiom-amethyst/40 rounded px-1 text-[8px] text-axiom-text focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelect(path)}
                      draggable
                      onDragStart={(e) => handleAssetDragStart(e, path)}
                      className={cn(
                        "w-full h-7 rounded flex items-center justify-center transition-all",
                        isSelected
                          ? cn(`bg-${accentColor}/15 ring-1 ring-${accentColor}/50`)
                          : "hover:bg-white/5",
                      )}
                      title={fileName}
                    >
                      <GlyphRenderer glyph={path} className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Hover actions */}
                  {renaming !== path && (
                    <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenaming(path); setRenameValue(fileName.replace(/\.svg$/i, "")); }}
                        className="w-4 h-4 rounded-full bg-axiom-panel/90 border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text flex items-center justify-center"
                        title="Rename"
                      >
                        <Pencil className="w-2 h-2" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMoving(path); }}
                        className="w-4 h-4 rounded-full bg-axiom-panel/90 border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text flex items-center justify-center"
                        title="Move"
                      >
                        <Move className="w-2 h-2" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(path); }}
                        className="w-4 h-4 rounded-full bg-axiom-rose/80 text-white flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-2 h-2" />
                      </button>
                    </div>
                  )}
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center", `bg-${accentColor}`)}>
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Move dialog */}
      {moving && (
        <div className="p-2 rounded border border-axiom-edge/40 bg-axiom-void/60 space-y-1">
          <div className="text-[9px] text-axiom-dim mb-1">Move "{getFileName(moving)}" to:</div>
          <button
            onClick={() => handleMoveToRoot(moving)}
            className="w-full text-left px-2 py-0.5 rounded text-[9px] text-axiom-dim hover:text-axiom-text hover:bg-white/5 flex items-center gap-1"
          >
            <Home className="w-2.5 h-2.5" /> Root
          </button>
          {folderList.map((f) => (
            <button
              key={f}
              onClick={async () => { await moveWorkspaceAsset(moving, f); setMoving(null); }}
              className="w-full text-left px-2 py-0.5 rounded text-[9px] text-axiom-dim hover:text-axiom-text hover:bg-white/5 flex items-center gap-1"
            >
              <Folder className="w-2.5 h-2.5 text-axiom-amber/70" /> {f}
            </button>
          ))}
          <button
            onClick={() => setMoving(null)}
            className="w-full text-center px-2 py-0.5 rounded text-[9px] text-axiom-dim/50 hover:text-axiom-text"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  3. EXTERNAL LIBRARIES TAB — provider cards + paste-SVG import
// ════════════════════════════════════════════════════════════════════════════

function ExternalTab({
  onSelect,
  accentColor,
  onSwitchToWorkspace,
}: {
  selectedGlyph?: string;
  onSelect: (glyph: string) => void;
  accentColor: string;
  onSwitchToWorkspace: () => void;
}) {
  const workspaceAssets = useWorkspaceAssets();
  const [pasteSvg, setPasteSvg] = useState("");
  const [iconName, setIconName] = useState("");
  const [targetFolder, setTargetFolder] = useState("");
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "duplicate"; message: string } | null>(null);

  const folders = useMemo(() => {
    const allFolders = new Set<string>();
    workspaceAssets.assets.forEach((path) => {
      const folder = getFolder(path);
      if (folder) {
        const parts = folder.split("/");
        for (let i = 1; i <= parts.length; i++) {
          allFolders.add(parts.slice(0, i).join("/"));
        }
      }
    });
    return Array.from(allFolders).sort();
  }, [workspaceAssets.assets]);

  const handlePaste = useCallback(async () => {
    setFeedback(null);
    const svg = pasteSvg.trim();
    if (!svg) {
      setFeedback({ type: "error", message: "Paste an SVG first." });
      return;
    }
    if (!isValidSvg(svg)) {
      setFeedback({ type: "error", message: "Invalid SVG — must start with <svg> and end with </svg>." });
      return;
    }
    setImporting(true);
    try {
      const name = iconName.trim() || suggestSvgName(svg);
      const fullPath = joinPath(targetFolder, name);
      const result = await saveWorkspaceAsset(fullPath, svg);
      if (result.isDuplicate) {
        // Same SVG content already exists → reuse it
        setFeedback({ type: "duplicate", message: `This icon already exists as "${result.path}". Reusing it.` });
        onSelect(result.path);
        setPasteSvg("");
        setIconName("");
      } else if (result.renamed) {
        // Different SVG, same filename → auto-renamed to avoid collision
        setFeedback({ type: "success", message: `Name "${getFileName(result.requestedPath ?? "")}" was taken — imported as "${getFileName(result.path)}" instead.` });
        onSelect(result.path);
        setPasteSvg("");
        setIconName("");
        onSwitchToWorkspace();
      } else {
        setFeedback({ type: "success", message: `Imported as "${result.path}".` });
        onSelect(result.path);
        setPasteSvg("");
        setIconName("");
        onSwitchToWorkspace();
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to import: " + String(err) });
    } finally {
      setImporting(false);
    }
  }, [pasteSvg, iconName, targetFolder, onSelect, onSwitchToWorkspace]);

  // Auto-suggest name from pasted SVG; clear feedback when user starts editing
  const handleSvgChange = useCallback((value: string) => {
    setPasteSvg(value);
    setFeedback(null);
    if (!iconName && isValidSvg(value)) {
      setIconName(suggestSvgName(value));
    }
  }, [iconName]);

  return (
    <div className="space-y-3">
      {/* Provider cards */}
      <div className="grid grid-cols-2 gap-2">
        {EXTERNAL_LIBRARIES.map((lib) => (
          <div
            key={lib.id}
            className="p-2.5 rounded-lg border border-axiom-edge/30 bg-axiom-deep/40 hover:border-axiom-edge/60 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-axiom-text">{lib.name}</span>
              <ExternalLink className="w-2.5 h-2.5 text-axiom-dim/40" />
            </div>
            <p className="text-[8px] text-axiom-dim/50 leading-tight mb-2 min-h-[24px]">{lib.description}</p>
            <a
              href={lib.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center gap-1 w-full px-2 py-1 rounded text-[9px] font-medium border transition-colors",
                `border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor} hover:bg-${accentColor}/20`,
              )}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              Open Library
            </a>
          </div>
        ))}
      </div>

      {/* Paste SVG area */}
      <div className="p-2.5 rounded-lg border border-axiom-edge/30 bg-axiom-deep/40 space-y-2">
        <div className="flex items-center gap-1.5">
          <ClipboardPaste className="w-3 h-3 text-axiom-dim" />
          <span className="text-[10px] font-semibold text-axiom-dim">Paste SVG</span>
        </div>
        <p className="text-[8px] text-axiom-dim/50 leading-tight">
          Copy an SVG from the official library, then paste it here. Axiom stores only this one icon.
        </p>

        {/* Textarea */}
        <textarea
          value={pasteSvg}
          onChange={(e) => handleSvgChange(e.target.value)}
          placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>'
          rows={5}
          className={cn(
            "w-full bg-axiom-void/60 border rounded px-2 py-1.5 text-[9px] font-mono text-axiom-text placeholder:text-axiom-dim/30 focus:outline-none transition-colors resize-y",
            feedback?.type === "error" ? "border-axiom-rose/50" : "border-axiom-edge/40 focus:border-axiom-amethyst/40",
          )}
        />

        {/* Name + folder + Import */}
        <div className="flex items-center gap-1.5">
          <input
            value={iconName}
            onChange={(e) => setIconName(e.target.value)}
            placeholder="icon-name"
            className="flex-1 bg-axiom-void/60 border border-axiom-edge/40 rounded px-2 py-1 text-[9px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-amethyst/40"
          />
          <select
            value={targetFolder}
            onChange={(e) => setTargetFolder(e.target.value)}
            className="bg-axiom-void/60 border border-axiom-edge/40 rounded px-1.5 py-1 text-[9px] text-axiom-text focus:outline-none"
          >
            <option value="">Root</option>
            {folders.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            onClick={handlePaste}
            disabled={importing || !pasteSvg.trim()}
            className={cn(
              "px-3 py-1 rounded text-[9px] font-medium border flex items-center gap-1 transition-colors shrink-0",
              `border-${accentColor}/40 bg-${accentColor}/10 text-${accentColor} hover:bg-${accentColor}/20`,
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            {importing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Download className="w-2.5 h-2.5" />}
            Import
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={cn(
              "text-[9px] px-2 py-1 rounded border",
              feedback.type === "success" && "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald",
              feedback.type === "duplicate" && "border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber",
              feedback.type === "error" && "border-axiom-rose/40 bg-axiom-rose/10 text-axiom-rose",
            )}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}

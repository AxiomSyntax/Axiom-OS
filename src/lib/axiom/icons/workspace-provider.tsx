"use client";

// ════════════════════════════════════════════════════════════════════════════
//  Workspace Asset Provider — user's personal icon library
// ════════════════════════════════════════════════════════════════════════════
//
//  This is the ONLY place where imported SVG files are stored.
//
//  Assets support folder paths: "AI/Oracle.svg", "Animals/bug.svg", etc.
//  Folders are implicit — derived from the "/" in asset paths.
//
//  Features:
//  • Folders and subfolders (path-like names)
//  • Rename (change the path)
//  • Delete
//  • Move (change the folder portion of the path)
//  • Search (across all assets, ignoring folders)
//  • Duplicate detection (hash-based — same SVG = reuse existing asset)
//  • Drag & drop file import
//
//  Storage: SVG files are stored via the StorageService under the "assets"
//  namespace. Two indices:
//    • icons-index: { path → svg }
//    • hashes-index: { hash → path }  (for duplicate detection)

import { useState, useEffect } from "react";
import type { AssetProvider, IconCategory, IconLibrary } from "./types";
import { hashSvg } from "./types";

// ── In-memory index ─────────────────────────────────────────────────────────
// Keyed by full path (e.g. "AI/Oracle.svg" → svg content)

const workspaceAssets = new Map<string, string>();
const workspaceHashes = new Map<string, string>(); // hash → path
let indexLoaded = false;
let loadPromise: Promise<void> | null = null;
const indexListeners = new Set<() => void>();

function notify() {
  indexListeners.forEach((fn) => fn());
}

async function persistIndices() {
  // CRITICAL: ensure the index is loaded before persisting. Otherwise a
  // save during the initial load would serialize a partial Map and overwrite
  // localStorage, losing previously-saved assets.
  await loadWorkspaceAssetIndex();
  const { saveState } = await import("@/lib/axiom/storage");
  const assetsObj: Record<string, string> = {};
  workspaceAssets.forEach((svg, key) => {
    assetsObj[key] = svg;
  });
  const hashesObj: Record<string, string> = {};
  workspaceHashes.forEach((path, hash) => {
    hashesObj[hash] = path;
  });
  await Promise.all([
    saveState("assets", "icons-index", assetsObj),
    saveState("assets", "hashes-index", hashesObj),
  ]);
}

/** Load the workspace asset index from storage. Safe to call multiple times —
 *  concurrent calls share the same load promise. */
export async function loadWorkspaceAssetIndex(): Promise<void> {
  if (indexLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const { loadState } = await import("@/lib/axiom/storage");
      const [index, hashIndex] = await Promise.all([
        loadState<Record<string, string>>("assets", "icons-index"),
        loadState<Record<string, string>>("assets", "hashes-index"),
      ]);
      workspaceAssets.clear();
      workspaceHashes.clear();
      if (index) {
        Object.entries(index).forEach(([path, svg]) => {
          workspaceAssets.set(path, svg);
        });
      }
      if (hashIndex) {
        Object.entries(hashIndex).forEach(([hash, path]) => {
          workspaceHashes.set(hash, path);
        });
      }
      indexLoaded = true;
      notify();
    } catch {
      indexLoaded = true;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

// ── Path helpers ────────────────────────────────────────────────────────────

/** Normalize a path: ensure it ends with .svg, no leading slash. */
function normalizePath(path: string): string {
  let p = path.trim().replace(/^\/+/, "");
  if (!p.endsWith(".svg")) p += ".svg";
  return p;
}

/** Get the folder portion of a path (everything before the last "/"). Returns "" for root. */
export function getFolder(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.substring(0, idx);
}

/** Get the filename portion of a path (everything after the last "/"). */
export function getFileName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.substring(idx + 1);
}

/** Join a folder and a name into a full path. */
export function joinPath(folder: string, name: string): string {
  const f = folder.trim().replace(/^\/+|\/+$/g, "");
  const n = name.trim().replace(/^\/+/, "");
  return f ? `${f}/${n}` : n;
}

/** List all unique folder paths (including subfolders) from the asset index. */
export function listFolders(): string[] {
  const folders = new Set<string>();
  workspaceAssets.forEach((_svg, path) => {
    const folder = getFolder(path);
    if (folder) {
      // Add the folder and all its parent folders
      const parts = folder.split("/");
      for (let i = 1; i <= parts.length; i++) {
        folders.add(parts.slice(0, i).join("/"));
      }
    }
  });
  return Array.from(folders).sort();
}

/** List all asset paths within a specific folder (non-recursive). */
export function listAssetsInFolder(folder: string): string[] {
  const f = folder.trim().replace(/^\/+|\/+$/g, "");
  return Array.from(workspaceAssets.keys())
    .filter((path) => {
      const assetFolder = getFolder(path);
      return f ? assetFolder === f : assetFolder === "";
    })
    .sort();
}

/** List subfolders within a specific folder (non-recursive). */
export function listSubfolders(folder: string): string[] {
  const f = folder.trim().replace(/^\/+|\/+$/g, "");
  const subfolders = new Set<string>();
  workspaceAssets.forEach((_svg, path) => {
    const assetFolder = getFolder(path);
    if (f) {
      // Must be a direct child of folder f
      if (assetFolder.startsWith(f + "/")) {
        const remaining = assetFolder.substring(f.length + 1);
        const firstSlash = remaining.indexOf("/");
        subfolders.add(firstSlash === -1 ? remaining : remaining.substring(0, firstSlash));
      }
    } else {
      // Root level — direct children only
      if (assetFolder && !assetFolder.includes("/")) {
        subfolders.add(assetFolder);
      }
    }
  });
  return Array.from(subfolders).sort();
}

// ── CRUD operations ─────────────────────────────────────────────────────────

export interface ImportResult {
  path: string;
  isDuplicate: boolean;
  /** When the requested name was already taken by a DIFFERENT SVG, the asset
   *  was saved under a new unique name. This is that name. The original
   *  requested path is in `requestedPath`. */
  renamed?: boolean;
  requestedPath?: string;
}

/** Generate a unique asset path. If "alien.svg" exists, tries "alien-2.svg",
 *  "alien-3.svg", etc. */
function generateUniquePath(baseName: string, folder: string): string {
  const normalized = normalizePath(baseName);
  const fileName = getFileName(normalized).replace(/\.svg$/i, "");
  const folderPart = folder.trim().replace(/^\/+|\/+$/g, "");

  // Try the original name first
  const firstPath = normalizePath(joinPath(folderPart, fileName));
  if (!workspaceAssets.has(firstPath)) return firstPath;

  // Try name-2, name-3, ...
  for (let i = 2; i < 10000; i++) {
    const candidate = normalizePath(joinPath(folderPart, `${fileName}-${i}`));
    if (!workspaceAssets.has(candidate)) return candidate;
  }

  // Fallback: append a hash (extremely unlikely to reach here)
  const suffix = Math.random().toString(36).substring(2, 8);
  return normalizePath(joinPath(folderPart, `${fileName}_${suffix}`));
}

/** Save a new SVG asset.
 *
 *  Behavior:
 *  • Same SVG content (by hash) already exists → returns the existing path,
 *    isDuplicate: true. No new asset is created.
 *  • Different SVG content, same filename → auto-generates a unique filename
 *    (e.g. "alien-2.svg"). NEVER overwrites the existing asset. Returns
 *    isDuplicate: false, renamed: true, requestedPath: the original.
 *  • New SVG, new filename → imports normally.
 *
 *  The existing asset is NEVER overwritten unless the caller explicitly
 *  deletes it first. */
export async function saveWorkspaceAsset(
  name: string,
  svgContent: string,
): Promise<ImportResult> {
  // CRITICAL: ensure the index is loaded before checking for duplicates or
  // adding to the Map.
  await loadWorkspaceAssetIndex();

  const requestedPath = normalizePath(name);
  const hash = hashSvg(svgContent);

  // ── Check 1: same SVG content (by hash) → reuse existing asset ──
  const existingPath = workspaceHashes.get(hash);
  if (existingPath && workspaceAssets.has(existingPath)) {
    return { path: existingPath, isDuplicate: true, requestedPath };
  }

  // ── Check 2: different SVG content, same filename → auto-generate unique name ──
  let finalPath = requestedPath;
  let renamed = false;
  if (workspaceAssets.has(requestedPath)) {
    // The requested path is taken by a DIFFERENT SVG (since the hash check
    // above didn't match). Generate a unique name — NEVER overwrite.
    const folder = getFolder(requestedPath);
    const fileName = getFileName(requestedPath).replace(/\.svg$/i, "");
    finalPath = generateUniquePath(fileName, folder);
    renamed = true;
  }

  // Store the new asset under the final (unique) path
  workspaceAssets.set(finalPath, svgContent);
  workspaceHashes.set(hash, finalPath);
  await persistIndices();
  // Invalidate the render cache so the new SVG is fetched on next render
  const { invalidateIconCache } = await import("./registry");
  invalidateIconCache("workspace", finalPath);
  notify();
  return { path: finalPath, isDuplicate: false, renamed, requestedPath };
}

/** Delete a workspace asset. */
export async function deleteWorkspaceAsset(name: string): Promise<void> {
  await loadWorkspaceAssetIndex();
  const path = normalizePath(name);
  const svg = workspaceAssets.get(path);
  if (svg) {
    const hash = hashSvg(svg);
    workspaceHashes.delete(hash);
  }
  workspaceAssets.delete(path);
  await persistIndices();
  const { invalidateIconCache } = await import("./registry");
  invalidateIconCache("workspace", path);
  notify();
}

/** Rename a workspace asset (change its path). */
export async function renameWorkspaceAsset(oldPath: string, newName: string): Promise<string> {
  await loadWorkspaceAssetIndex();
  const normalizedOld = normalizePath(oldPath);
  const folder = getFolder(normalizedOld);
  const newPath = normalizePath(joinPath(folder, newName));
  const svg = workspaceAssets.get(normalizedOld);
  if (!svg) return normalizedOld;

  // Update hash index
  const hash = hashSvg(svg);
  workspaceHashes.set(hash, newPath);

  workspaceAssets.delete(normalizedOld);
  workspaceAssets.set(newPath, svg);
  await persistIndices();
  // Invalidate cache for both old and new paths
  const { invalidateIconCache } = await import("./registry");
  invalidateIconCache("workspace", normalizedOld);
  invalidateIconCache("workspace", newPath);
  notify();
  return newPath;
}

/** Move a workspace asset to a different folder. */
export async function moveWorkspaceAsset(assetPath: string, targetFolder: string): Promise<string> {
  await loadWorkspaceAssetIndex();
  const normalizedAsset = normalizePath(assetPath);
  const fileName = getFileName(normalizedAsset);
  const newPath = normalizePath(joinPath(targetFolder, fileName));
  const svg = workspaceAssets.get(normalizedAsset);
  if (!svg) return normalizedAsset;

  if (normalizedAsset === newPath) return newPath;

  const hash = hashSvg(svg);
  workspaceHashes.set(hash, newPath);

  workspaceAssets.delete(normalizedAsset);
  workspaceAssets.set(newPath, svg);
  await persistIndices();
  // Invalidate cache for both old and new paths
  const { invalidateIconCache } = await import("./registry");
  invalidateIconCache("workspace", normalizedAsset);
  invalidateIconCache("workspace", newPath);
  notify();
  return newPath;
}

/** Create a folder (no-op if it already exists — folders are implicit). */
export function createFolder(_folderPath: string): void {
  // Folders are implicit — they exist when assets are stored in them.
  // This function exists for API completeness but does nothing.
  // To "create" a folder, add an asset to it.
}

// ── Query operations ────────────────────────────────────────────────────────

/** Subscribe to workspace asset index changes. */
export function onWorkspaceAssetsChanged(fn: () => void): () => void {
  indexListeners.add(fn);
  return () => indexListeners.delete(fn);
}

/** Get all workspace asset paths (flat list). */
export function listWorkspaceAssetNames(): string[] {
  return Array.from(workspaceAssets.keys()).sort();
}

/** Get SVG content for a workspace asset. */
export function getWorkspaceAssetSvg(name: string): string | undefined {
  return workspaceAssets.get(name);
}

// ── Provider implementation ─────────────────────────────────────────────────

const WORKSPACE_LIBRARY: IconLibrary = {
  id: "workspace",
  label: "Workspace Assets",
  available: true,
  hasCategories: false,
  hasSearch: true,
};

export const workspaceProvider: AssetProvider = {
  libraryId: "workspace",
  library: WORKSPACE_LIBRARY,

  listIcons(): string[] {
    return listWorkspaceAssetNames();
  },

  listCategories(): IconCategory[] {
    return [];
  },

  searchIcons(query: string): string[] {
    const q = query.toLowerCase();
    return listWorkspaceAssetNames().filter((path) =>
      path.toLowerCase().includes(q),
    );
  },

  async getIconSvg(name: string): Promise<string | null> {
    return workspaceAssets.get(name) ?? null;
  },

  hasIcon(name: string): boolean {
    return workspaceAssets.has(name);
  },

  subscribe(fn: () => void): () => void {
    return onWorkspaceAssetsChanged(fn);
  },
};

// ── React hook ──────────────────────────────────────────────────────────────

export function useWorkspaceAssets() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Register the subscription FIRST so we don't miss the notify() from
    // the load completing.
    const unsub = onWorkspaceAssetsChanged(() => setTick((t) => t + 1));
    // Load the index. If it's already loaded, this returns immediately —
    // but we still need to trigger a re-render so the component picks up
    // the already-loaded data. If it's not loaded yet, the load will call
    // notify() which triggers setTick via the subscription above.
    loadWorkspaceAssetIndex().then(() => {
      // Always trigger a re-render after the load promise resolves (whether
      // it was already loaded or just finished loading). This ensures the
      // component displays the current asset list.
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  return {
    assets: listWorkspaceAssetNames(),
    saveAsset: saveWorkspaceAsset,
    deleteAsset: deleteWorkspaceAsset,
    renameAsset: renameWorkspaceAsset,
    moveAsset: moveWorkspaceAsset,
  };
}

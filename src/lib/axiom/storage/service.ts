// ════════════════════════════════════════════════════════════════════════════
//  Workspace Storage Service — the centralized storage API
// ════════════════════════════════════════════════════════════════════════════
//
//  Axiom OS is the single source of truth for every piece of user data. No
//  application writes directly to localStorage or browser storage — every
//  component stores data through this service.
//
//  The service resolves the physical location. Applications only request:
//    - saveProject / loadProject / listProjects / deleteProject
//    - saveState / loadState (for serialized app state)
//    - writeLog / readLogs
//    - saveImport / listImports (for repo/ZIP imports)
//    - createBackup / listBackups
//
//  Applications never need to know where files are physically stored. The
//  active StorageProvider (localStorage today, filesystem/cloud tomorrow)
//  handles the physical I/O.
//
//  ═══ Future cloud support ═══
//  The StorageProvider interface is designed so future providers can be
//  plugged in WITHOUT changing applications. To add Google Drive:
//    1. Implement StorageProvider in GoogleDriveProvider.ts
//    2. Set it as the active provider in the workspace config
//  Every app keeps working — they call the same saveProject/loadProject API.

import {
  type WorkspaceConfig,
  type StorageProvider,
  type StorageNamespace,
  type ProjectRecord,
  type StorageLogEntry,
  type WorkspaceFolderStructure,
  WORKSPACE_FOLDERS,
  DEFAULT_WORKSPACE_ROOT,
  WORKSPACE_CONFIG_KEY,
} from "./types";
import { localStorageProvider } from "./local-provider";

// ── Active provider resolution ──────────────────────────────────────────────
// Today only the LocalStorageProvider exists. Future providers (filesystem,
// cloud) will be selected based on the workspace config's `provider` field.

let activeProvider: StorageProvider = localStorageProvider;

/** Get the active storage provider. */
export function getStorageProvider(): StorageProvider {
  return activeProvider;
}

/** Set the active storage provider (used by future cloud/local-fs providers). */
export function setStorageProvider(provider: StorageProvider): void {
  activeProvider = provider;
}

// ── Workspace config ────────────────────────────────────────────────────────

/** Load the workspace config from localStorage. Returns null if not set up. */
export function loadWorkspaceConfig(): WorkspaceConfig | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceConfig;
    return parsed;
  } catch {
    return null;
  }
}

/** Save the workspace config to localStorage. */
export function saveWorkspaceConfig(config: WorkspaceConfig): void {
  try {
    localStorage.setItem(WORKSPACE_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn("[StorageService] saveWorkspaceConfig failed:", err);
  }
}

/** Create the default workspace config. Used on first boot. */
export function createDefaultWorkspaceConfig(): WorkspaceConfig {
  return {
    rootPath: DEFAULT_WORKSPACE_ROOT,
    initialized: false,
    createdAt: Date.now(),
    provider: "local",
  };
}

/** Initialize the workspace — creates the folder structure (conceptually; in
 *  the browser build the folders are virtual namespaces). Marks the config as
 *  initialized. Returns the updated config. */
export function initializeWorkspace(rootPath: string): WorkspaceConfig {
  const config: WorkspaceConfig = {
    rootPath: rootPath || DEFAULT_WORKSPACE_ROOT,
    initialized: true,
    createdAt: Date.now(),
    provider: "local",
  };
  saveWorkspaceConfig(config);
  // Log the initialization
  writeLog("install", "info", `Workspace initialized at ${config.rootPath}`, {
    folders: Object.keys(WORKSPACE_FOLDERS),
  });
  return config;
}

/** Get the full path for a workspace folder (for display in Settings). */
export function getFolderPath(folder: keyof WorkspaceFolderStructure): string {
  return WORKSPACE_FOLDERS[folder];
}

// ── Generic state save/load ─────────────────────────────────────────────────
// Used by the store to persist entire namespaces (workflowProjects, brain graph,
// DevLab workspaces, etc.) as a single JSON blob per namespace.

/** Save a serializable value to a namespace under a key. */
export async function saveState<T>(
  namespace: StorageNamespace,
  key: string,
  value: T,
): Promise<void> {
  const json = JSON.stringify(value);
  await activeProvider.write(namespace, key, json);
}

/** Load a value from a namespace. Returns null if not found. */
export async function loadState<T>(
  namespace: StorageNamespace,
  key: string,
): Promise<T | null> {
  const raw = await activeProvider.read(namespace, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Load ALL values in a namespace as an array. */
export async function loadAllInNamespace<T>(
  namespace: StorageNamespace,
): Promise<T[]> {
  const keys = await activeProvider.listKeys(namespace);
  const results: T[] = [];
  for (const key of keys) {
    const value = await loadState<T>(namespace, key);
    if (value !== null) results.push(value);
  }
  return results;
}

/** Clear an entire namespace. */
export async function clearNamespace(namespace: StorageNamespace): Promise<void> {
  await activeProvider.clearNamespace(namespace);
}

// ── Project CRUD ────────────────────────────────────────────────────────────
// Projects are real files stored inside the Workspace. Each project belongs to
// a category (creative-testing-lab, n8n, langflow, etc.) which determines its
// subfolder. Apps store their own payload inside `data`.

/** Save a project to storage. */
export async function saveProject(project: ProjectRecord): Promise<void> {
  await saveState("workflow-projects", project.id, project);
}

/** Load a single project by id. */
export async function loadProject(projectId: string): Promise<ProjectRecord | null> {
  return loadState<ProjectRecord>("workflow-projects", projectId);
}

/** List all projects, optionally filtered by category. */
export async function listProjects(category?: string): Promise<ProjectRecord[]> {
  const all = await loadAllInNamespace<ProjectRecord>("workflow-projects");
  if (category) return all.filter((p) => p.category === category);
  return all;
}

/** Delete a project by id. */
export async function deleteProject(projectId: string): Promise<void> {
  await activeProvider.delete("workflow-projects", projectId);
}

// ── Logs ────────────────────────────────────────────────────────────────────
// Every installation and analysis writes logs. Streams: analysis, install,
// error, crash, agent.

/** Write a log entry to the Logs/ namespace. */
export async function writeLog(
  stream: string,
  level: StorageLogEntry["level"],
  message: string,
  payload?: unknown,
): Promise<void> {
  const entry: StorageLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    stream,
    level,
    message,
    payload,
    ts: Date.now(),
  };
  // Store each log entry under its own key so they can be listed/cleared.
  await activeProvider.write("logs", entry.id, JSON.stringify(entry));
}

/** Read all log entries, optionally filtered by stream. */
export async function readLogs(stream?: string): Promise<StorageLogEntry[]> {
  const all = await loadAllInNamespace<StorageLogEntry>("logs");
  const sorted = all.sort((a, b) => b.ts - a.ts);
  if (stream) return sorted.filter((e) => e.stream === stream);
  return sorted;
}

/** Clear all logs. */
export async function clearLogs(): Promise<void> {
  await activeProvider.clearNamespace("logs");
}

// ── Imports ─────────────────────────────────────────────────────────────────
// Repository imports / ZIP imports / folder imports are first placed in
// Imports/ before installation.

/** Save an import record (the raw manifest before installation). */
export async function saveImport(
  id: string,
  manifest: { source: string; url?: string; path?: string; ts: number; data: unknown },
): Promise<void> {
  await saveState("imports", id, manifest);
}

/** List all saved imports. */
export async function listImports(): Promise<Array<{ id: string; data: unknown }>> {
  const all = await loadAllInNamespace<{ source: string; url?: string; path?: string; ts: number; data: unknown }>("imports");
  return all.map((d, i) => ({ id: `import_${i}`, data: d }));
}

// ── Backups ─────────────────────────────────────────────────────────────────
// Automatic backup support. Projects can later be versioned or backed up
// without modifying application logic. The architecture already supports this.

/** Create a backup of an entire namespace. */
export async function createBackup(
  namespace: StorageNamespace,
  label: string,
): Promise<string> {
  const all = await loadAllInNamespace<unknown>(namespace);
  const backupId = `backup_${namespace}_${Date.now()}`;
  const backup = {
    id: backupId,
    namespace,
    label,
    createdAt: Date.now(),
    data: all,
  };
  await activeProvider.write("backups", backupId, JSON.stringify(backup));
  await writeLog("install", "info", `Backup created: ${label} (${namespace}, ${all.length} items)`);
  return backupId;
}

/** List all backups. */
export async function listBackups(): Promise<Array<{ id: string; namespace: string; label: string; createdAt: number; itemCount: number }>> {
  const all = await loadAllInNamespace<{ id: string; namespace: string; label: string; createdAt: number; data: unknown[] }>("backups");
  return all
    .map((b) => ({
      id: b.id,
      namespace: b.namespace,
      label: b.label,
      createdAt: b.createdAt,
      itemCount: Array.isArray(b.data) ? b.data.length : 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// ── Reset ───────────────────────────────────────────────────────────────────

/** Clear EVERYTHING — the entire workspace. Used by "Reset Axiom OS". */
export async function resetWorkspace(): Promise<void> {
  await activeProvider.clearAll();
  // Also clear the workspace config key (stored outside the provider namespace)
  try {
    localStorage.removeItem(WORKSPACE_CONFIG_KEY);
  } catch {
    // no-op
  }
}

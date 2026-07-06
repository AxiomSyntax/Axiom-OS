// ════════════════════════════════════════════════════════════════════════════
//  Workspace Storage Architecture — Types
// ════════════════════════════════════════════════════════════════════════════
//
//  Axiom OS is the single source of truth for every piece of user data. No
//  application manages its own storage — every component stores data through
//  one centralized Workspace Storage Service.
//
//  The Storage Service resolves the physical location. Applications only
//  request: Save Project / Load Project / List Projects / Delete Project.
//  They never need to know where files are physically stored.
//
//  The architecture is provider-pluggable: LocalStorageProvider (browser),
//  and future FileSystemProvider (desktop), GoogleDriveProvider, OneDrive,
//  Dropbox, Nextcloud, NAS, WebDAV, S3 — all implement StorageProvider.
//  Applications remain completely unaware of the storage provider.

/** The default folder structure created inside the Workspace Root. Every data
 *  category has a dedicated location. Exact naming can be adjusted, but every
 *  category must exist. */
export interface WorkspaceFolderStructure {
  Brain: string;
  Knowledge: string;
  Memory: string;
  Projects: string;
  Apps: string;
  Modules: string;
  Models: string;
  Skills: string;
  Downloads: string;
  Imports: string;
  Exports: string;
  Logs: string;
  Cache: string;
  Backups: string;
  Temp: string;
  Profiles: string;
  Assets: string;
}

/** Workspace configuration — the single source of truth for where data lives.
 *  Stored in localStorage (browser) so it survives refresh; in a desktop build
 *  it would live in the OS settings. The user selects the workspace root once
 *  during setup and can change it in Settings. */
export interface WorkspaceConfig {
  /** The workspace root path. Example: "/home/user/Axiom/" or "D:\\Axiom\\".
   *  In the browser build this is a virtual path (the StorageProvider resolves
   *  it to a localStorage/IndexedDB namespace). In a desktop build it would be
   *  a real filesystem path. */
  rootPath: string;
  /** Whether the workspace has been initialized (folder structure created). */
  initialized: boolean;
  /** When the workspace was first set up. */
  createdAt: number;
  /** The storage provider in use. Future providers: "local-fs", "google-drive",
   *  "onedrive", "dropbox", "nextcloud", "nas", "webdav", "s3". */
  provider: StorageProviderId;
}

/** The storage providers the architecture supports. Only "local" (browser
 *  localStorage/IndexedDB) is implemented now; the others are future
 *  placeholders. Applications never check this — the StorageService resolves
 *  the provider from the WorkspaceConfig. */
export type StorageProviderId =
  | "local"
  | "local-fs"
  | "google-drive"
  | "onedrive"
  | "dropbox"
  | "nextcloud"
  | "nas"
  | "webdav"
  | "s3";

/** A namespace is a logical partition of stored data. Each namespace maps to a
 *  folder in the workspace structure. Applications store/load data by
 *  namespace; the StorageService resolves the physical location. */
export type StorageNamespace =
  | "workspace-config"
  | "workflow-projects"
  | "workflow-folders"
  | "devlab-workspaces"
  | "integration-configs"
  | "brain-graph"
  | "brain-folders"
  | "models"
  | "modules"
  | "imports"
  | "logs"
  | "cache"
  | "backups"
  | "app-state"
  | "custom-styles"
  | "profiles"
  | "registry-apps"
  | "registry-agents"
  | "registry-skills"
  | "registry-tools"
  | "registry-engines"
  | "registry-mcps"
  | "registry-llm-families"
  | "registry-providers"
  | "assets";

/** A stored project record. Projects are real files stored inside the
 *  Workspace (e.g. Projects/Creative Testing Lab/Project A/). This is the
 *  generic envelope — apps store their own payload inside `data`. */
export interface ProjectRecord {
  id: string;
  /** Which app/category this project belongs to (e.g. "creative-testing-lab",
   *  "n8n", "langflow", "sandboxed-app"). Determines the subfolder. */
  category: string;
  name: string;
  description?: string;
  /** Epoch ms of last modification. */
  lastModified: number;
  /** Epoch ms of creation. */
  createdAt: number;
  /** The app-specific payload (serialized JSON). Apps own their own schema;
   *  the StorageService treats this as opaque. */
  data: unknown;
}

/** A log entry written to Logs/. Every installation and analysis writes logs.
 *  Includes: Repository Analysis, Install Logs, Errors, Crash Reports, Agent
 *  Activity. */
export interface StorageLogEntry {
  id: string;
  /** Which log stream: "analysis", "install", "error", "crash", "agent". */
  stream: string;
  /** Severity level. */
  level: "info" | "warn" | "error" | "debug";
  /** The log message. */
  message: string;
  /** Optional structured payload. */
  payload?: unknown;
  /** Epoch ms. */
  ts: number;
}

// ════════════════════════════════════════════════════════════════════════════
//  StorageProvider — the provider-pluggable interface
// ════════════════════════════════════════════════════════════════════════════
//
//  Every provider (browser localStorage, desktop filesystem, Google Drive,
//  etc.) implements this interface. The StorageService delegates to the
//  active provider. Applications never know which provider is in use.

export interface StorageProvider {
  /** The provider id. */
  readonly id: StorageProviderId;
  /** Human-readable name for the Settings UI. */
  readonly label: string;

  /** Read a raw value from a namespace. Returns null if not found. */
  read(namespace: StorageNamespace, key: string): Promise<string | null>;

  /** Write a raw value to a namespace. */
  write(namespace: StorageNamespace, key: string, value: string): Promise<void>;

  /** Delete a key from a namespace. */
  delete(namespace: StorageNamespace, key: string): Promise<void>;

  /** List all keys in a namespace. */
  listKeys(namespace: StorageNamespace): Promise<string[]>;

  /** Clear all keys in a namespace. */
  clearNamespace(namespace: StorageNamespace): Promise<void>;

  /** Clear EVERYTHING (the entire workspace). Used by "Reset Axiom OS". */
  clearAll(): Promise<void>;

  /** Check if the provider is available (e.g. localStorage might be disabled). */
  isAvailable(): boolean;
}

// ════════════════════════════════════════════════════════════════════════════
//  Workspace folder structure
// ════════════════════════════════════════════════════════════════════════════

/** The canonical folder structure. Every data category has a dedicated location. */
export const WORKSPACE_FOLDERS: WorkspaceFolderStructure = {
  Brain: "Brain",
  Knowledge: "Brain/Knowledge",
  Memory: "Brain/Memory",
  Projects: "Projects",
  Apps: "Apps",
  Modules: "Modules",
  Models: "Models",
  Skills: "Skills",
  Downloads: "Downloads",
  Imports: "Imports",
  Exports: "Exports",
  Logs: "Logs",
  Cache: "Cache",
  Backups: "Backups",
  Temp: "Temp",
  Profiles: "Profiles",
  Assets: "Assets",
};

/** Default subfolders under Projects/ for each app category. */
export const PROJECT_CATEGORIES = {
  "creative-testing-lab": "Projects/Creative Testing Lab",
  "workflows": "Projects/Workflows",
  "sandboxed-apps": "Projects/Sandbox Apps",
  "n8n": "Projects/Workflows/n8n",
  "langflow": "Projects/Workflows/LangFlow",
} as const;

/** Default workspace root path (the user can change this in Settings). */
export const DEFAULT_WORKSPACE_ROOT = "/home/user/Axiom";

/** The localStorage key for the workspace config itself. The config is stored
 *  in localStorage (not through the provider) so the provider can be resolved
 *  before any data is read. */
export const WORKSPACE_CONFIG_KEY = "axiom_workspace_config";

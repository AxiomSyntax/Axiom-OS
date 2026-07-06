"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type {
  PageId,
  MemoryGraph,
  MemoryNode,
  MemoryNodeKind,
  MemoryEdge,
  MemoryEdgeKind,
  BrainFolder,
  AgentPersona,
  AgentConversation,
  AgentMessage,
  AgentStatus,
  InstalledAgent,
  AvailableAgent,
  VibeFile,
  VibeLogEntry,
  VibeLanguage,
  TerminalLine,
  TelemetrySample,
  Skill,
  Tool,
  InstalledApp,
  LLMProvider,
  MCPServer,
  Engine,
  Workflow,
  WorkflowStep,
  WorkflowStepOutput,
  ChatSession,
  ChatProject,
  ChatMessageUnified,
  ChatSessionSource,
  AgentCouncil,
  CouncilMessage,
  ActivityEntry,
  LLMFamily,
  DevLabWorkspace,
  DevLabDomain,
  IntegrationConfig,
  WorkspaceType,
  WorkspaceFile,
  WorkspaceMessage,
  PublishedApp,
  PublishedAppBlueprint,
  AppTab,
  WorkflowTab,
  WorkflowProject,
  ModuleRuntimeState,
  WorkflowFolder,
  InstallPlan,
  InstallTarget,
  AnalysisStage,
  VisualIdentity,
  Profile,
  ProfileConfig,
  SystemAgentStatus,
} from "./types";
import type { WorkspaceConfig } from "./storage";
import {
  loadWorkspaceConfig,
  saveWorkspaceConfig,
  createDefaultWorkspaceConfig,
  initializeWorkspace,
  saveState,
  loadState,
  writeLog,
  getFolderPath,
  WORKSPACE_FOLDERS,
} from "./storage";
// Runtime import — getWorkflowEngineModules is a function (not a type), so it
// MUST be imported separately from the `import type` block above. Listing it
// inside `import type { ... }` strips it at compile time and causes a runtime
// ReferenceError. (getModuleState is also a runtime function but is no longer
// called directly in the store — the store now goes through WorkflowEngineModule
// records which already carry the resolved `state` field.)
import { getWorkflowEngineModules, createGlobalProfile, GLOBAL_PROFILE_ID, SYSTEM_AGENT_ID, SYSTEM_AGENT_NAME, SYSTEM_AGENT_ROLE } from "./types";
import { analyzeRepository, INSTALL_ACTIONS, suggestVisualIdentity, TARGET_VISUAL_DEFAULTS, CATEGORY_TO_TARGET } from "./analyzer";
import { migrateRegistryVisualIdentity } from "./visual-identity";
import {
  BUILTIN_PERSONAS,
  builtinInstalled,
  AVAILABLE_AGENTS,
  BUILTIN_SKILLS,
  BUILTIN_TOOLS,
  SEED_APPS,
  SEED_PROVIDERS,
  SEED_MCPS,
  SEED_ENGINES,
  SEED_DIRECT_LLMS,
  SEED_LLM_FAMILIES,
  SEED_CHAT_PROJECTS,
  SEED_CHAT_SESSIONS,
  seedFolders,
  seedMemoryGraph,
  SEED_VIBE_FILES,
  seedActivity,
  buildIntegrations,
} from "./seed";

export type BootPhase = "booting" | "ready";

// ════════════════════════════════════════════════════════════════════════════
//  Agentic Module Installation — hooks pipeline placeholder.
//
//  triggerAgenticModuleInstallation is the integration hook that will later
//  command the background AI Installer Agent to execute the automated cloning
//  (git clone), dependency parsing, and localhost port deployment for a GitHub
//  repository imported via the Modules page.
//
//  For now this is a non-blocking placeholder that resolves immediately so the
//  UI can render the loading card + dispatch flow without a real backend. When
//  the real agent pipeline is wired, this function will kick off the async
//  clone/build/deploy sequence and call back into resolveModuleInstall() on
//  completion. The manifest shape is fixed:
//    { module_id, origin: "github", target_url, status: "installing" }
// ════════════════════════════════════════════════════════════════════════════
export interface ModuleInstallManifest {
  module_id: string;
  origin: "github";
  target_url: string;
  status: "installing";
}

export function triggerAgenticModuleInstallation(
  manifest: ModuleInstallManifest,
): void {
  // ── PLACEHOLDER ──
  // In production this dispatches the manifest to the AI Installer Agent runner
  // (background process: git clone → dependency parse → port assignment → boot).
  // For now we just log it so the flow is observable. The loading card stays
  // mounted in the AI Core grid until resolveModuleInstall() is called.
  console.info(
    "[Axiom Installer] Agentic module installation dispatched:",
    manifest,
  );
}

interface AxiomState {
  bootPhase: BootPhase;
  bootedAt: number;

  // ── Workspace Storage ──
  // Axiom OS is the single source of truth for every piece of user data. The
  // workspace config holds the root path + provider. On boot, the store
  // hydrates from the StorageService (loadWorkspaceConfig → loadState for each
  // namespace). Mutators write through to the StorageService so data persists.
  workspaceConfig: WorkspaceConfig | null;
  /** Whether the store has been hydrated from the StorageService on this boot. */
  hydrated: boolean;
  /** Hydrate the store from the StorageService. Called once on boot. Loads
   *  workflowProjects, workflowFolders, devlabWorkspaces, brain graph/folders
   *  from storage; falls back to seed data if empty. */
  hydrateFromStorage: () => Promise<void>;
  /** Set the workspace root path + initialize the folder structure. */
  setWorkspaceRoot: (rootPath: string) => void;
  /** Get the full path for a workspace folder (for display). */
  getWorkspaceFolderPath: (folder: string) => string;

  // Router
  currentPage: PageId;
  sidebarCollapsed: boolean;
  collapsedGroups: Record<string, boolean>;
  /** Active viewport layer — "page" shows the normal routed page; "app" shows
   *  the focused app tab on top (the page is kept mounted underneath via the
   *  keep-alive wrapper, so switching back is instant and lossless). */
  viewMode: "page" | "app" | "workflow";

  // Memory graph
  graph: MemoryGraph;
  selectedNodeId: string | null;

  // Brain folders
  folders: BrainFolder[];
  activeFolderId: string | null;
  brainTab: "graph" | "folders";

  // Agents
  roster: AgentPersona[]; // built-in personas (for chat)
  installedAgents: InstalledAgent[];
  availableAgents: AvailableAgent[];
  conversations: AgentConversation[];
  activeConversationId: string | null;
  agentStatus: Record<string, AgentStatus>;

  // VibeCode / DevLab (legacy — kept for backward compatibility)
  vibeFiles: VibeFile[];
  activeVibeFileId: string | null;
  vibeLogs: VibeLogEntry[];
  devlabTab: "editor" | "console" | "graph";

  // DevLab Workspaces (Replit-style IDE)
  devlabWorkspaces: DevLabWorkspace[];
  /** Integration configurations (config-based, not chat-based). */
  integrationConfigs: IntegrationConfig[];
  /** Active DevLab domain tab (core / app). Integrations is NOT a DevLab
   *  domain — it is a standalone system module at /integrations. */
  activeDevLabDomain: DevLabDomain;
  activeWorkspaceId: string | null;

  // DevLab Integration — install pipeline plans (Intelligent Classification)
  installPlans: InstallPlan[];

  // Terminal
  terminalLines: TerminalLine[];

  // Telemetry
  telemetry: TelemetrySample[];

  // Skills & Tools
  skills: Skill[];
  tools: Tool[];

  // Apps
  apps: InstalledApp[];

  // Published Modules (from DevLab workspaces)
  publishedApps: PublishedApp[];
  /** The currently-running published module (if any). Used for native page rendering, not overlay. */
  runningModuleId: string | null;
  /** The currently-running installed app (if any). Kept for backward-compat;
   *  when an app tab is focused, this mirrors activeAppTabId's appId. */
  runningAppId: string | null;

  // App Tabs — browser-style keep-alive multitasking stack.
  // Each open app persists in the background (display:none, never unmounted),
  // so the user can switch to Dashboard / Agent Hub and back without losing
  // any in-app state. Modeled on the Brain pane tab system.
  /** All currently-open app tabs (ordered by openedAt). */
  openAppTabs: AppTab[];
  /** Which app tab is focused (rendered on top). null = no app focused; the
   *  normal routed page is shown instead. The tab itself stays mounted. */
  activeAppTabId: string | null;

  // ── Workflow Tabs (browser-style keep-alive for n8n / LangFlow) ──
  // Mirrors the AppTab architecture. Each open workflow tab persists in the
  // background (display:none, never unmounted) so switching between n8n and
  // LangFlow is instant without iframe reloads.
  openWorkflowTabs: WorkflowTab[];
  activeWorkflowTabId: string | null;
  /** Workflow projects (n8n / LangFlow instances) shown in the overview + archive. */
  workflowProjects: WorkflowProject[];
  /** Workflow folders for organizing projects in the archive. */
  workflowFolders: WorkflowFolder[];

  // LLM providers
  providers: LLMProvider[];

  // MCP servers
  mcps: MCPServer[];

  // Engines — technical control center for AI models & backends
  engines: Engine[];

  // ── Cascading engine/model selection (HomePage chat terminal) ──
  // The active Tier-1 runtime/provider. Picking an engine auto-cascades the
  // Tier-2 model to that engine's first allowed model. Mismatched combos are
  // structurally prohibited — the model list is always derived from the active
  // engine's `models` array.
  activeEngineId: string | null;
  /** The active Tier-2 model (must belong to the active engine's models list). */
  activeModelId: string | null;

  // ── Unified Terminal Dropdown (v0.6) ──
  // The terminal mode toggles based on which category the user selects:
  //   "engine"  = Development Engine Mode (Category A — compilation + heavy workflows)
  //   "ambient" = Ambient Chat Mode (Category B — quick reads, metrics, dialogue)
  terminalMode: "engine" | "ambient";
  /** The active Direct LLM id (Category B), when terminalMode === "ambient". */
  activeDirectLlmId: string | null;
  /** The Direct LLM catalog (Category B of the unified dropdown). */
  directLLMs: import("./seed").DirectLLM[];

  // LLM Registry — model families (separate from developmental engines)
  llmFamilies: LLMFamily[];

  // Voice state — powers the Home chat terminal voice controls + orb animation
  /** Whether Jarvis's voice output (Kokoro TTS) is enabled. */
  voiceEnabled: boolean;
  /** Whether the microphone (Faster-Whisper STT) is actively listening. */
  micListening: boolean;
  /** Whether the voice engine is currently generating speech (triggers orb wave effect). */
  speaking: boolean;

  // Workflows — dynamic pipeline builder
  workflows: Workflow[];
  /** The workflow currently being edited in the Workflows page (id). */
  activeWorkflowId: string | null;

  // Unified chat history — sessions + projects across Home/AgentHub/DevLab
  chatSessions: ChatSession[];
  chatProjects: ChatProject[];
  /** Whether the Conversations & Projects archive panel is open. */
  chatArchiveOpen: boolean;
  /** The currently-selected project folder in the Archive panel. New sessions
      are saved into this folder. null = unfiled. */
  activeChatFolderId: string | null;
  /** The session currently loaded into the Chat Terminal (if any). */
  activeChatSessionId: string | null;

  // Agent Councils (multi-agent group chat)
  councils: AgentCouncil[];
  activeCouncilId: string | null;

  // ── Profiles ──
  // Profiles are lightweight working-environment configurations. They NEVER
  // duplicate data — they only control visibility (which apps/skills/tools/
  // agents/collections/projects are visible) + preferred defaults (engine/
  // LLM/voice/agent). There is exactly ONE Global profile (unrestricted) +
  // unlimited user profiles. Switching is instantaneous.
  profiles: Profile[];
  activeProfileId: string;
  /** Create a new user profile. Returns the new profile id. */
  createProfile: (input: { name: string; icon?: string; color?: string }) => string;
  /** Switch to a profile. Captures the outgoing profile's runtime config, then
   *  applies the incoming profile's config (enables/disables engines, agents,
   *  apps, modules, skills, tools per the profile's activation sets). */
  switchProfile: (profileId: string) => void;
  /** Update a profile's configuration (visibility sets + preferences). */
  updateProfile: (profileId: string, patch: Partial<Pick<Profile, "name" | "icon" | "color" | "visibility" | "preferences">>) => void;
  /** Update a profile's activation config (enabled engine/agent/app/module/
   *  skill/tool IDs). When the profile is active, the change is also applied
   *  to the live runtime state. */
  updateProfileConfig: (profileId: string, config: ProfileConfig) => void;
  /** Delete a user profile. The Global profile cannot be deleted. */
  deleteProfile: (profileId: string) => void;
  /** Get the currently-active profile (falls back to Global). */
  getActiveProfile: () => Profile;
  /** Capture the current global runtime state (which engines/agents/apps/etc.
   *  are enabled) into a profile's config. Used before switching out of a
   *  profile so its config is preserved for next time. */
  captureCurrentProfileConfig: (profileId: string) => void;

  // Activity log
  activity: ActivityEntry[];

  // ── Actions ──
  finishBoot: () => void;
  navigate: (page: PageId) => void;
  toggleSidebar: () => void;
  toggleGroup: (id: string) => void;

  // App Tabs (browser-style keep-alive) — open/focus/close background-persistent
  // app views. Opening a tab switches viewMode to "app" and renders the app on
  // top of the keep-alive stack. Navigating to a regular page sets viewMode back
  // to "page" but leaves every open tab mounted in the background.
  openAppTab: (appId: string) => void;
  focusAppTab: (appId: string) => void;
  closeAppTab: (appId: string) => void;
  closeAllAppTabs: () => void;

  // ── Workflow Tab actions (keep-alive multitasking) ──
  openWorkflowProjectTab: (projectId: string) => void;
  focusWorkflowTab: (projectId: string) => void;
  closeWorkflowTab: (projectId: string) => void;
  // Workflow project + folder management
  createWorkflowProject: (toolId: string, name?: string, folderId?: string) => string;
  createWorkflowFolder: (toolId: string, name: string) => string;
  deleteWorkflowFolder: (folderId: string) => void;
  moveWorkflowProject: (projectId: string, folderId: string | null) => void;
  renameWorkflowProject: (projectId: string, name: string) => void;
  renameWorkflowFolder: (folderId: string, name: string) => void;

  addNode: (input: {
    label: string;
    kind: MemoryNodeKind;
    content?: string;
    x?: number;
    y?: number;
    folderId?: string | null;
    meta?: Record<string, string | number>;
  }) => string;
  updateNode: (id: string, patch: Partial<MemoryNode>) => void;
  removeNode: (id: string) => void;
  linkNodes: (
    source: string,
    target: string,
    kind?: MemoryEdgeKind,
    weight?: number,
  ) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  setNodePosition: (id: string, x: number, y: number) => void;

  addFolder: (name: string, parentId: string | null) => string;
  removeFolder: (id: string) => void;
  setActiveFolder: (id: string | null) => void;
  setBrainTab: (tab: "graph" | "folders") => void;

  startConversation: (agentId: string) => string;
  setActiveConversation: (id: string) => void;
  pushMessage: (
    conversationId: string,
    msg: Omit<AgentMessage, "id" | "ts"> & { id?: string; ts?: number },
  ) => string;
  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<AgentMessage>,
  ) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;

  installAgent: (agentId: string) => void;
  createCustomAgent: (input: {
    name: string;
    role: string;
    description?: string;
    systemPrompt: string;
    engineId?: string;
    model?: string;
    glyph?: string;
    color?: string;
    equippedSkills?: string[];
    linkedFolders?: string[];
  }) => string;
  uninstallAgent: (agentId: string) => void;
  toggleAgentEnabled: (agentId: string) => void;
  /** Update an existing agent's fields (name, role, systemPrompt, engineId,
   *  model, glyph, color, equippedSkills, linkedFolders). Works for ALL agents
   *  — built-in, custom, and the system agent. The system agent's protected
   *  fields (isSystemAgent, enabled, source) cannot be changed. */
  updateAgent: (agentId: string, patch: Partial<{
    name: string;
    role: string;
    description: string;
    systemPrompt: string;
    engineId: string;
    model: string;
    glyph: string;
    color: string;
    equippedSkills: string[];
    linkedFolders: string[];
  }>) => void;

  // ── System Agent (Axiom — System Architect) ──
  // The permanent system agent. Always present, always enabled, cannot be
  // disabled/deleted. Does NOT appear in Agent Hub. Activates automatically
  // during system-level operations. Shows a status indicator when working.
  systemAgentStatus: SystemAgentStatus;
  /** Set the system agent's current status. "idle" = not working. */
  setSystemAgentStatus: (status: SystemAgentStatus) => void;
  /** Get the system agent record (always present in installedAgents). */
  getSystemAgent: () => InstalledAgent | undefined;
  /** Ensure the system agent has a valid Runtime Engine + Model assigned.
   *  If the current engineId doesn't exist in the engines array, auto-assign:
   *  1. Hermes Agent (if it exists), 2. First enabled engine, 3. First engine.
   *  Also ensures the model is valid for the assigned engine. Called on boot. */
  ensureSystemAgentEngine: () => void;

  createVibeFile: (name: string, language: VibeLanguage) => string;
  updateVibeFile: (id: string, patch: Partial<VibeFile>) => void;
  deleteVibeFile: (id: string) => void;
  setActiveVibeFile: (id: string) => void;
  pushVibeLog: (entry: Omit<VibeLogEntry, "id" | "ts">) => void;
  clearVibeLogs: () => void;
  setDevlabTab: (tab: "editor" | "console" | "graph") => void;

  // DevLab Workspaces
  createWorkspace: (type: WorkspaceType, name: string, domain?: DevLabDomain) => string;
  deleteWorkspace: (workspaceId: string) => void;
  /** Set the active DevLab domain tab. */
  setActiveDevLabDomain: (domain: DevLabDomain) => void;
  /** Get workspaces filtered by domain. */
  getWorkspacesByDomain: (domain: DevLabDomain) => DevLabWorkspace[];
  // Integration configs (config-based, not chat-based)
  addIntegrationConfig: (input: { name: string; kind: string; config?: Record<string, string>; description?: string; glyph?: string }) => string;
  updateIntegrationConfig: (id: string, patch: Partial<IntegrationConfig>) => void;
  deleteIntegrationConfig: (id: string) => void;
  /** Persist the entire integrationConfigs slice to storage. */
  persistIntegrationConfigs: () => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  closeWorkspace: () => void;
  /** Add a file to a specific workspace. */
  addWorkspaceFile: (workspaceId: string, name: string, language: VibeLanguage, folderPath?: string, source?: string) => string;
  /** Update a workspace file's content or metadata. */
  updateWorkspaceFile: (workspaceId: string, fileId: string, patch: Partial<WorkspaceFile>) => void;
  /** Delete a file from a workspace. */
  deleteWorkspaceFile: (workspaceId: string, fileId: string) => void;
  /** Set the active/open file in a workspace. */
  setActiveWorkspaceFile: (workspaceId: string, fileId: string) => void;
  /** Append a message to a workspace's Forge chat. */
  appendWorkspaceMessage: (workspaceId: string, msg: Omit<WorkspaceMessage, "id" | "ts"> & { id?: string; ts?: number }) => void;
  /** Update a message in a workspace's Forge chat (e.g. resolve pending). */
  updateWorkspaceMessage: (workspaceId: string, messageId: string, patch: Partial<WorkspaceMessage>) => void;
  /** Append a log entry to a workspace's console. */
  pushWorkspaceLog: (workspaceId: string, entry: Omit<VibeLogEntry, "id" | "ts">) => void;
  /** Clear all logs for a workspace. */
  clearWorkspaceLogs: (workspaceId: string) => void;
  /** If Forge generates multi-file output, dynamically append files to a workspace. */
  addGeneratedFiles: (workspaceId: string, files: { name: string; language: VibeLanguage; source: string; folderPath?: string }[]) => void;

  // ── DevLab Integration — Intelligent Install Pipeline ──
  // The Integration workspace is the single installation gateway. classifyRepository
  // simulates analysis of a repo's structure + deps, auto-classifies it, and
  // returns an InstallPlan for user confirmation. executeInstallPlan routes the
  // confirmed plan to the correct installer (installApp, installModule, addEngine,
  // addMcp, etc.). The user never decides WHERE a repo belongs — the system decides.
  classifyRepository: (repoUrl: string) => string;
  classifyLocalPath: (path: string, source: "local-folder" | "zip") => string;
  executeInstallPlan: (planId: string) => void;
  clearInstallPlan: (planId: string) => void;
  /** Let the user override the system's recommended installation target.
   *  Sets `userOverride` on the plan; `executeInstallPlan` uses `userOverride ?? detectedType`.
   *  Also re-derives the suggested visualIdentity for the new target. */
  overrideInstallType: (planId: string, target: InstallTarget) => void;
  /** Transition a plan from "confirming" to "visual-identity" so the user can
   *  review/customize the suggested icon, color, badge, and category before
   *  the install is committed. No-op if the plan isn't in "confirming" state. */
  proceedToVisualIdentity: (planId: string) => void;
  /** Update the plan's visualIdentity with user customizations (displayName,
   *  description, category, iconName, glyph, accentColor, badge). Only valid
   *  while the plan is in "visual-identity" state. */
  setInstallVisualIdentity: (planId: string, patch: Partial<VisualIdentity>) => void;
  /** Transition a plan from "visual-identity" to "reviewing" so the user can
   *  review the full installation summary before committing. No-op if the
   *  plan isn't in "visual-identity" state. */
  proceedToReview: (planId: string) => void;
  /** Transition a plan back from "reviewing" to "visual-identity" so the user
   *  can edit the appearance again. No-op if the plan isn't in "reviewing" state. */
  backToVisualIdentity: (planId: string) => void;

  pushTerminal: (line: Omit<TerminalLine, "id" | "ts">) => void;
  clearTerminal: () => void;

  pushTelemetry: (sample: TelemetrySample) => void;

  toggleSkill: (id: string) => void;
  invokeSkill: (id: string) => void;
  addSkill: (input: {
    name: string;
    description: string;
    instructions: string;
    longDescription?: string;
    category: string;
    tags?: string[];
    glyph?: string;
    parameters?: import("./types").SkillParameter[];
    author?: string;
    version?: string;
  }) => string;
  updateSkill: (id: string, patch: Partial<Skill>) => void;
  removeSkill: (id: string) => void;

  toggleTool: (id: string) => void;
  invokeTool: (id: string) => void;
  addTool: (input: {
    name: string;
    description: string;
    instructions: string;
    category: string;
    tags?: string[];
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "WS" | "STDIO";
    authRequired?: boolean;
    glyph?: string;
    parameters?: import("./types").ToolParameter[];
    returns?: string;
    author?: string;
    version?: string;
  }) => string;
  updateTool: (id: string, patch: Partial<Tool>) => void;
  removeTool: (id: string) => void;

  installApp: (input: {
    name: string;
    description: string;
    source: "vibecode" | "github" | "builtin";
    sourceUrl?: string;
    code?: string;
    glyph?: string;
    color?: string;
    category?: string;
    /** Short uppercase badge (e.g. "APP"). */
    badge?: string;
  }) => string;

  // ── Agentic Module Installation (Modules page GitHub import) ──
  // Constructs an independent manifest { module_id, origin, target_url, status:
  // "installing" }, routes it to triggerAgenticModuleInstallation (the hooks
  // pipeline that will later command the background AI Installer Agent to
  // execute git clone + dependency parsing + localhost port deployment), and
  // appends a temporary non-blocking loading card into the AI Core grid.
  installModule: (
    repoUrl: string,
    name?: string,
    visualIdentity?: {
      description?: string;
      glyph?: string;
      color?: string;
      category?: string;
      badge?: string;
    },
  ) => string;
  /** Remove a module's loading card once the installer pipeline resolves. */
  resolveModuleInstall: (moduleId: string, success: boolean) => void;
  uninstallApp: (id: string) => void;
  toggleAppEnabled: (id: string) => void;
  launchApp: (id: string) => void;
  stopApp: (id: string) => void;
  /** For server-style apps (n8n, LangFlow): simulate probing the local server
      and flip its `connected` flag. Returns a promise that resolves when done. */
  connectApp: (id: string) => Promise<void>;
  disconnectApp: (id: string) => void;

  // ── Module activation + instance config (Modules page) ──
  // setModuleActive flips a backend module's "active" status token in the
  // global engine manifest. When active=true the module becomes
  // enabled+connected+running, allowing Axiom OS to route background workflow
  // requests to its instanceUrl endpoint. When false, all three flip off.
  setModuleActive: (id: string, active: boolean) => void;
  /** Set or clear a module error state. With a message: flips the module to
   *  "error" (Open disabled, error shown). Without a message: clears the error
   *  and re-derives the state from enabled/connected. Never deletes projects. */
  setModuleError: (id: string, message?: string) => void;
  /** Update a module's Instance Connection URL (the endpoint workflow requests
      route to when the module is active). */
  updateAppInstanceUrl: (id: string, url: string) => void;

  // Published Modules
  publishWorkspace: (workspaceId: string, opts: {
    blueprint: PublishedAppBlueprint;
    name?: string;
    description?: string;
    url?: string;
    githubRepoUrl?: string;
    glyph?: string;
    color?: string;
    customColor?: boolean;
  }) => Promise<string>;
  unpublishApp: (appId: string) => void;
  togglePublishedAppEnabled: (appId: string) => void;
  launchModule: (appId: string) => void;
  closeModule: () => void;
  /** Returns all enabled integrated modules for agent visibility. */
  getEnabledIntegratedModules: () => PublishedApp[];

  // Installed Apps (native route launching) — now backed by the keep-alive tab
  // stack. launchInstalledApp opens + focuses an app tab; closeInstalledApp
  // closes the currently-focused app tab. Kept for component compatibility.
  launchInstalledApp: (id: string) => void;
  closeInstalledApp: () => void;

  updateProvider: (id: string, patch: Partial<LLMProvider>) => void;
  toggleProvider: (id: string) => void;
  testProviderConnection: (id: string) => Promise<void>;

  addMcp: (input: {
    name: string;
    url: string;
    description?: string;
    glyph?: string;
    color?: string;
    badge?: string;
    category?: string;
  }) => void;
  removeMcp: (id: string) => void;
  toggleMcp: (id: string) => void;

  // Engines
  updateEngine: (id: string, patch: Partial<Engine>) => void;
  testEngine: (id: string) => Promise<void>;
  toggleEngine: (id: string) => void;
  addEngine: (input: {
    name: string;
    type: string;
    description?: string;
    kind?: import("./types").EngineKind;
    location?: "Local" | "API" | "Hybrid";
    apiAddress: string;
    glyph?: string;
    color?: string;
    models?: string[];
    config?: Record<string, string>;
  }) => string;
  removeEngine: (id: string) => void;

  // ── Cascading engine/model selection ──
  // setActiveEngine picks the Tier-1 runtime/provider AND auto-cascades the
  // Tier-2 model to that engine's first allowed model. This structurally
  // prevents mismatched combos (e.g. a GPT model under an OpenClaw runtime).
  setActiveEngine: (engineId: string) => void;
  /** Override the Tier-2 model within the active engine's allowed list. */
  setActiveModel: (modelId: string) => void;

  // ── Unified Terminal Dropdown (v0.6) ──
  // selectTerminalEngine: selects a Category A engine → sets terminalMode to
  //   "engine" (Development Engine Mode).
  selectTerminalEngine: (engineId: string) => void;
  // selectTerminalLlm: selects a Category B Direct LLM → sets terminalMode to
  //   "ambient" (Ambient Chat Mode).
  selectTerminalLlm: (llmId: string) => void;

  // LLM Registry actions
  toggleLLMFamily: (familyId: string) => void;
  toggleLLMModel: (familyId: string, modelId: string) => void;
  setLLMApiKey: (familyId: string, key: string) => void;
  validateLLMKey: (familyId: string) => Promise<boolean>;
  /** Register a new LLM model (from DevLab Integration → Install as LLM Model).
   *  Creates a new LLMFamily entry in the LLM Registry with a single model.
   *  Used when a repository is classified as an LLM Model (HuggingFace, GGUF,
   *  safetensors, etc.) and the user confirms the install. */
  registerLLMModel: (input: {
    name: string;
    description: string;
    repoUrl?: string;
    language?: string;
    glyph?: string;
    color?: string;
    badge?: string;
    category?: string;
  }) => void;
  /** Get all enabled models across all enabled families (flat list for dropdowns). */
  getEnabledLLMModels: () => { familyId: string; familyName: string; familyColor: string; familyGlyph: string; modelId: string; modelName: string; modelApiId: string; tier: string }[];
  /** Fallback routing: given a failed model, find next available lightweight LLM. */
  getFallbackModel: (excludeModelId: string) => { familyId: string; modelId: string; modelName: string } | null;

  // Voice
  toggleVoice: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
  toggleMic: () => void;
  setSpeaking: (speaking: boolean) => void;

  // Workflows
  createWorkflow: (name?: string) => string;
  updateWorkflow: (id: string, patch: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  setActiveWorkflow: (id: string | null) => void;
  addStep: (workflowId: string, afterStepId?: string | null) => string;
  updateStep: (workflowId: string, stepId: string, patch: Partial<WorkflowStep>) => void;
  removeStep: (workflowId: string, stepId: string) => void;
  moveStep: (workflowId: string, stepId: string, direction: "up" | "down") => void;
  runWorkflow: (workflowId: string) => Promise<void>;

  // Unified chat history
  createChatSession: (source: ChatSessionSource, opts?: { title?: string; projectId?: string | null; engineId?: string; agentId?: string; preview?: string }) => string;
  appendChatMessage: (sessionId: string, msg: Omit<ChatMessageUnified, "id" | "ts"> & { id?: string; ts?: number }) => void;
  updateChatMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessageUnified>) => void;
  deleteChatSession: (sessionId: string) => void;
  renameChatSession: (sessionId: string, title: string) => void;
  markSessionAutoTitled: (sessionId: string) => void;
  /** Set a session's title automatically (does NOT set manuallyRenamed). */
  setSessionTitle: (sessionId: string, title: string) => void;
  duplicateChatSession: (sessionId: string) => string;
  moveSessionToProject: (sessionId: string, projectId: string | null) => void;
  createChatProject: (name: string, color?: string, source?: ChatSessionSource) => string;
  deleteChatProject: (projectId: string) => void;
  renameChatProject: (projectId: string, name: string) => void;
  setChatArchiveOpen: (open: boolean) => void;
  toggleChatArchive: () => void;
  setActiveChatFolder: (folderId: string | null) => void;
  loadChatSession: (sessionId: string) => void;

  // Agent Councils
  createCouncil: (name: string, orchestratorId: string, memberIds: string[]) => string;
  deleteCouncil: (councilId: string) => void;
  setActiveCouncil: (councilId: string | null) => void;
  sendCouncilMessage: (councilId: string, content: string, isUser: boolean) => Promise<void>;

  pushActivity: (entry: Omit<ActivityEntry, "id" | "ts">) => void;
}

export const useAxiom = create<AxiomState>((set, get) => ({
  bootPhase: "booting",
  bootedAt: 0,

  // ── Workspace Storage ──
  // Load the workspace config from localStorage on store creation. If null,
  // the user hasn't set up a workspace yet — the Settings page prompts them.
  workspaceConfig: typeof window !== "undefined" ? loadWorkspaceConfig() : null,
  hydrated: false,

  currentPage: "home",
  sidebarCollapsed: false,
  collapsedGroups: { WORKSPACE: false, MODELS: false, INFRASTRUCTURE: false, DEVELOPMENT: false },
  viewMode: "page",

  graph: seedMemoryGraph(),
  selectedNodeId: "n_axiom",

  folders: seedFolders(),
  activeFolderId: "f_root",
  brainTab: "graph",

  roster: BUILTIN_PERSONAS,
  // ── Installed agents ──
  // Starts with the permanent System Agent (Axiom — System Architect) + the
  // 5 built-in agents (Oracle, Forge, Scribe, Warden, Echo). The system agent
  // is always enabled, cannot be disabled/deleted, and does NOT appear in
  // Agent Hub. It activates automatically during system-level operations.
  installedAgents: [
    {
      id: SYSTEM_AGENT_ID,
      name: SYSTEM_AGENT_NAME,
      role: SYSTEM_AGENT_ROLE,
      description: "The operating system's own maintenance agent. Manages Core Extensions, DevLab Integration, Workspace Architecture, Module/Engine/Provider/MCP Registration, Storage, and System Upgrades.",
      systemPrompt: "You are Axiom, the System Architect of Axiom OS. You are NOT a general assistant. You maintain and evolve the operating system itself. You manage: Core Extensions, DevLab Core, Integration Pipeline, Workspace Architecture, Module/Engine/Provider/MCP Registration, Storage Architecture, Internal Registry Updates, Dependency Validation, System Upgrades, and Installation Pipeline. You never write user applications, blog posts, or answer research questions. You are the intelligence that lives inside Axiom OS.",
      color: "axiom-cyan",
      glyph: "◬",
      installedAt: 0,
      source: "system" as const,
      enabled: true,
      category: "System",
      tokensUsed: 0,
      costUsd: 0,
      isSystemAgent: true,
      // Default Runtime Engine + Model — Axiom always requires a runtime.
      // Hermes Agent is the default (first enabled engine on boot). If Hermes
      // doesn't exist, the first enabled engine is used. The ensureSystemAgentEngine
      // action (called on boot) validates and auto-assigns if missing.
      engineId: "eng_hermes",
      model: "hermes-core",
    },
    ...builtinInstalled(),
  ],
  systemAgentStatus: "idle" as SystemAgentStatus,
  availableAgents: AVAILABLE_AGENTS,
  conversations: [],
  activeConversationId: null,
  agentStatus: Object.fromEntries(
    BUILTIN_PERSONAS.map((a) => [a.id, "idle" as AgentStatus]),
  ),

  vibeFiles: SEED_VIBE_FILES,
  activeVibeFileId: SEED_VIBE_FILES.find((f) => f.name === "Home.jsx")?.id ?? SEED_VIBE_FILES[0]?.id ?? null,
  vibeLogs: [],
  devlabTab: "editor",

  // DevLab Workspaces — start empty (user creates via wizard)
  devlabWorkspaces: [],
  integrationConfigs: [],
  activeDevLabDomain: "core",
  activeWorkspaceId: null,

  // DevLab Integration — install pipeline plans (start empty)
  installPlans: [],

  terminalLines: [
    {
      id: uuid(),
      ts: Date.now(),
      kind: "system",
      text: "Axiom OS shell v0.2.0 — type 'help' for commands.",
    },
  ],

  telemetry: [],

  skills: BUILTIN_SKILLS,
  tools: BUILTIN_TOOLS,

  apps: SEED_APPS,

  publishedApps: [],
  runningModuleId: null,
  runningAppId: null,

  // App tab stack — starts empty. Apps only mount when the user opens them.
  openAppTabs: [],
  activeAppTabId: null,

  // Workflow tab stack — starts empty. n8n / LangFlow tabs mount on demand.
  openWorkflowTabs: [],
  activeWorkflowTabId: null,
  // Seed workflow projects for the overview + archive
  workflowProjects: [
    { id: "wp_n8n_1", name: "Email Outreach Automation", toolId: "n8n", description: "Automated email sequence with follow-up scheduling.", lastModified: Date.now() - 1000 * 60 * 60 * 3, n8nWorkflowId: "wf_001" },
    { id: "wp_n8n_2", name: "Social Media Scheduler", toolId: "n8n", description: "Cross-platform social post scheduling with analytics.", lastModified: Date.now() - 1000 * 60 * 60 * 24, n8nWorkflowId: "wf_002" },
    { id: "wp_langflow_1", name: "RAG Knowledge Base", toolId: "langflow", description: "Retrieval-augmented generation flow for internal docs.", lastModified: Date.now() - 1000 * 60 * 60 * 8, langflowFlowId: "flow_001" },
    { id: "wp_langflow_2", name: "Customer Intent Classifier", toolId: "langflow", description: "Multi-step LLM flow for routing customer messages.", lastModified: Date.now() - 1000 * 60 * 60 * 48, langflowFlowId: "flow_002" },
  ] as WorkflowProject[],
  workflowFolders: [] as WorkflowFolder[],

  providers: SEED_PROVIDERS,
  mcps: SEED_MCPS,

  engines: SEED_ENGINES,

  // Cascading selection — default to Hermes Agent + hermes-core
  activeEngineId: "eng_hermes",
  activeModelId: "hermes-core",

  // Unified Terminal Dropdown — default to Development Engine Mode (Hermes)
  terminalMode: "engine",
  activeDirectLlmId: null,
  directLLMs: SEED_DIRECT_LLMS,

  llmFamilies: SEED_LLM_FAMILIES,

  // Voice state — Kokoro TTS off by default (user must enable), Whisper mic off by default
  voiceEnabled: false,
  micListening: false,
  speaking: false,

  workflows: [],
  activeWorkflowId: null,

  chatSessions: SEED_CHAT_SESSIONS,
  chatProjects: SEED_CHAT_PROJECTS,
  chatArchiveOpen: false,
  activeChatFolderId: null,
  activeChatSessionId: null,

  councils: [],
  activeCouncilId: null,

  // ── Profiles ──
  // Start with just the Global profile. The active profile is always Global
  // until the user creates + switches to a custom profile. Hydrated from
  // storage on boot (hydrateFromStorage loads saved profiles + activeProfileId).
  profiles: [createGlobalProfile()],
  activeProfileId: GLOBAL_PROFILE_ID,

  activity: seedActivity(),

  finishBoot: () => set({ bootPhase: "ready", bootedAt: Date.now() }),

  // ── Workspace Storage ──
  hydrateFromStorage: async () => {
    if (get().hydrated) return; // only once per boot
    const config = get().workspaceConfig;
    if (!config) return; // no workspace set up yet

    // Load each persistent namespace from storage. Fall back to current
    // (seeded) state if storage is empty — this is the "first boot merges
    // seed → storage" path. Subsequent boots load from storage.
    const [storedProjects, storedFolders, storedWorkspaces, storedIntegrationConfigs, storedGraph, storedBrainFolders, storedProfiles, storedActiveProfileId, storedApps, storedAgents, storedSkills, storedTools, storedEngines, storedMcps, storedLlmFamilies, storedProviders] = await Promise.all([
      loadState<WorkflowProject[]>("workflow-projects", "all"),
      loadState<WorkflowFolder[]>("workflow-folders", "all"),
      loadState<DevLabWorkspace[]>("devlab-workspaces", "all"),
      loadState<IntegrationConfig[]>("integration-configs", "all"),
      loadState<MemoryGraph>("brain-graph", "main"),
      loadState<BrainFolder[]>("brain-folders", "all"),
      loadState<Profile[]>("profiles", "all"),
      loadState<string>("profiles", "active-id"),
      // ── Core registries (non-destructive: load from storage if present,
      //    fall back to seed data on first boot, then persist seed → storage) ──
      loadState<InstalledApp[]>("registry-apps", "all"),
      loadState<InstalledAgent[]>("registry-agents", "all"),
      loadState<Skill[]>("registry-skills", "all"),
      loadState<Tool[]>("registry-tools", "all"),
      loadState<Engine[]>("registry-engines", "all"),
      loadState<MCPServer[]>("registry-mcps", "all"),
      loadState<LLMFamily[]>("registry-llm-families", "all"),
      loadState<LLMProvider[]>("registry-providers", "all"),
    ]);

    const patch: Partial<AxiomState> = { hydrated: true };

    // Profiles: always ensure the Global profile exists (even if storage is
    // empty). Merge stored profiles with the guaranteed-Global profile.
    if (storedProfiles && storedProfiles.length > 0) {
      const hasGlobal = storedProfiles.some((p) => p.isGlobal);
      patch.profiles = hasGlobal ? storedProfiles : [createGlobalProfile(), ...storedProfiles];
    } else {
      void saveState("profiles", "all", get().profiles);
    }
    if (storedActiveProfileId) {
      // Only restore if the profile still exists
      const exists = (patch.profiles ?? get().profiles).some((p) => p.id === storedActiveProfileId);
      if (exists) patch.activeProfileId = storedActiveProfileId;
    }

    // Workflow projects: if storage has them, use them; otherwise persist the seed.
    if (storedProjects && storedProjects.length > 0) {
      patch.workflowProjects = storedProjects;
    } else {
      await saveState("workflow-projects", "all", get().workflowProjects);
    }

    // Workflow folders
    if (storedFolders) {
      patch.workflowFolders = storedFolders;
    } else {
      await saveState("workflow-folders", "all", get().workflowFolders);
    }

    // DevLab workspaces
    if (storedWorkspaces) {
      patch.devlabWorkspaces = storedWorkspaces;
    } else {
      await saveState("devlab-workspaces", "all", get().devlabWorkspaces);
    }

    // Integration configs (config-based, not chat-based)
    if (storedIntegrationConfigs) {
      patch.integrationConfigs = storedIntegrationConfigs;
    } else {
      await saveState("integration-configs", "all", get().integrationConfigs);
    }

    // Brain graph
    if (storedGraph) {
      patch.graph = storedGraph;
    } else {
      await saveState("brain-graph", "main", get().graph);
    }

    // Brain folders
    if (storedBrainFolders) {
      patch.folders = storedBrainFolders;
    } else {
      await saveState("brain-folders", "all", get().folders);
    }

    // ── Core registries (non-destructive) ──
    // If storage has entries, USE THEM (never overwrite with seed). If storage
    // is empty (first boot), use the seed data from the initial state. Either
    // way, set it on the patch so the visual identity migration runs on BOTH
    // stored and seed data.
    if (storedApps && storedApps.length > 0) {
      patch.apps = storedApps;
    } else {
      patch.apps = get().apps;
      void saveState("registry-apps", "all", patch.apps);
    }
    if (storedAgents && storedAgents.length > 0) {
      patch.installedAgents = storedAgents;
    } else {
      patch.installedAgents = get().installedAgents;
      void saveState("registry-agents", "all", patch.installedAgents);
    }
    if (storedSkills && storedSkills.length > 0) {
      patch.skills = storedSkills;
    } else {
      patch.skills = get().skills;
      void saveState("registry-skills", "all", patch.skills);
    }
    if (storedTools && storedTools.length > 0) {
      patch.tools = storedTools;
    } else {
      patch.tools = get().tools;
      void saveState("registry-tools", "all", patch.tools);
    }
    if (storedEngines && storedEngines.length > 0) {
      patch.engines = storedEngines;
    } else {
      patch.engines = get().engines;
      void saveState("registry-engines", "all", patch.engines);
    }
    if (storedMcps && storedMcps.length > 0) {
      patch.mcps = storedMcps;
    } else {
      patch.mcps = get().mcps;
      void saveState("registry-mcps", "all", patch.mcps);
    }
    if (storedLlmFamilies && storedLlmFamilies.length > 0) {
      patch.llmFamilies = storedLlmFamilies;
    } else {
      patch.llmFamilies = get().llmFamilies;
      void saveState("registry-llm-families", "all", patch.llmFamilies);
    }
    if (storedProviders && storedProviders.length > 0) {
      patch.providers = storedProviders;
    } else {
      patch.providers = get().providers;
      void saveState("registry-providers", "all", patch.providers);
    }

    // ── One-time visual identity migration ──
    // For every existing registry entry that does NOT have a `visualIdentity`
    // field, reconstruct it from the legacy fields (glyph, color, name, etc.).
    // NON-DESTRUCTIVE: if visualIdentity already exists, the record is left
    // untouched. Never replaces existing values with defaults. Never generates
    // random icons or placeholders.
    if (patch.apps) {
      patch.apps = migrateRegistryVisualIdentity(patch.apps, { accentColor: "axiom-cyan", badge: "APP", category: "General" });
    }
    if (patch.installedAgents) {
      patch.installedAgents = migrateRegistryVisualIdentity(patch.installedAgents, { accentColor: "axiom-violet", badge: "AGENT", category: "Agent" });
    }
    if (patch.skills) {
      patch.skills = migrateRegistryVisualIdentity(patch.skills, { accentColor: "axiom-emerald", badge: "SKILL" });
    }
    if (patch.tools) {
      patch.tools = migrateRegistryVisualIdentity(patch.tools, { accentColor: "axiom-cyan", badge: "TOOL" });
    }
    if (patch.engines) {
      patch.engines = migrateRegistryVisualIdentity(patch.engines, { accentColor: "axiom-amber", badge: "ENGINE" });
    }
    if (patch.mcps) {
      patch.mcps = migrateRegistryVisualIdentity(patch.mcps, { accentColor: "axiom-violet", badge: "MCP", category: "MCP Server" });
    }
    if (patch.llmFamilies) {
      patch.llmFamilies = migrateRegistryVisualIdentity(patch.llmFamilies, { accentColor: "axiom-violet", badge: "LLM", category: "LLM Provider" });
    }
    if (patch.providers) {
      patch.providers = migrateRegistryVisualIdentity(patch.providers, { accentColor: "axiom-cyan" });
    }

    set(patch);

    // ── Apply the active profile's config to the live runtime ──
    // After hydration, apply the active profile's activation config so the
    // runtime reflects the profile (e.g. if Coding has DeepSeek disabled, it
    // stays disabled after a page refresh).
    const activeProfileAfterHydration = get().profiles.find((p) => p.id === get().activeProfileId);
    if (activeProfileAfterHydration && !activeProfileAfterHydration.isGlobal) {
      const activeConfig = activeProfileAfterHydration.config ?? {
        enabledEngineIds: [],
        enabledLlmFamilyIds: [],
        enabledAgentIds: [],
        enabledAppIds: [],
        enabledModuleIds: [],
        enabledSkillIds: [],
        enabledToolIds: [],
      };
      const isActiveUnrestricted =
        activeConfig.enabledEngineIds.length === 0 &&
        activeConfig.enabledLlmFamilyIds.length === 0 &&
        activeConfig.enabledAgentIds.length === 0 &&
        activeConfig.enabledAppIds.length === 0 &&
        activeConfig.enabledModuleIds.length === 0 &&
        activeConfig.enabledSkillIds.length === 0 &&
        activeConfig.enabledToolIds.length === 0;
      if (!isActiveUnrestricted) {
        set({
          engines: get().engines.map((e) => ({ ...e, enabled: activeConfig.enabledEngineIds.length === 0 || activeConfig.enabledEngineIds.includes(e.id) })),
          llmFamilies: get().llmFamilies.map((f) => {
            const familyEnabled = activeConfig.enabledLlmFamilyIds.length === 0 || activeConfig.enabledLlmFamilyIds.includes(f.id);
            return {
              ...f,
              enabled: familyEnabled,
              models: familyEnabled ? f.models : f.models.map((m) => ({ ...m, enabled: false })),
            };
          }),
          installedAgents: get().installedAgents.map((a) => ({ ...a, enabled: a.isSystemAgent || activeConfig.enabledAgentIds.length === 0 || activeConfig.enabledAgentIds.includes(a.id) })),
          apps: get().apps.map((a) => {
            const isInfra = a.category === "Workflow Engine" || a.category === "AI Core";
            if (isInfra) return { ...a, enabled: activeConfig.enabledModuleIds.length === 0 || activeConfig.enabledModuleIds.includes(a.id) };
            return { ...a, enabled: activeConfig.enabledAppIds.length === 0 || activeConfig.enabledAppIds.includes(a.id) };
          }),
          skills: get().skills.map((s) => ({ ...s, enabled: activeConfig.enabledSkillIds.length === 0 || activeConfig.enabledSkillIds.includes(s.id) })),
          tools: get().tools.map((t) => ({ ...t, enabled: activeConfig.enabledToolIds.length === 0 || activeConfig.enabledToolIds.includes(t.id) })),
        });
      }
    }

    // ── Ensure the System Agent (Axiom) has a valid Runtime Engine + Model ──
    // Axiom is an orchestration agent — it always requires a runtime. If the
    // assigned engine doesn't exist (e.g. after a reset or engine removal),
    // auto-assign Hermes (or the first enabled engine) + the first model.
    get().ensureSystemAgentEngine();
  },

  setWorkspaceRoot: (rootPath) => {
    const config = initializeWorkspace(rootPath);
    set({ workspaceConfig: config });
    // Trigger hydration now that the workspace is initialized
    get().hydrateFromStorage();
    get().pushActivity({
      kind: "app",
      text: `Workspace root set to ${config.rootPath}`,
      severity: "success",
    });
  },

  getWorkspaceFolderPath: (folder) => {
    const config = get().workspaceConfig;
    const root = config?.rootPath ?? "/home/user/Axiom";
    const folderPath = getFolderPath(folder as keyof typeof WORKSPACE_FOLDERS) ?? folder;
    return `${root}/${folderPath}`;
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  Profiles — lightweight working-environment configurations
  // ════════════════════════════════════════════════════════════════════════════
  //  Profiles NEVER duplicate data. They only control visibility (which apps/
  //  skills/tools/agents/collections/projects are visible) + preferred defaults
  //  (engine/LLM/voice/agent). Switching is instantaneous — no files copied,
  //  no Brain recreated, no Memory duplicated.

  createProfile: (input) => {
    const id = "profile_" + uuid().slice(0, 8);
    const now = Date.now();
    const profile: Profile = {
      id,
      name: input.name.trim() || "New Profile",
      icon: input.icon ?? "User", // System Glyph (Lucide) — no emoji for profiles
      color: input.color ?? "axiom-violet",
      visibility: {
        visibleAppIds: [],
        visibleSkillIds: [],
        visibleToolIds: [],
        visibleAgentIds: [],
        visibleFolderIds: [],
        visibleProjectIds: [],
      },
      // New profile starts unrestricted (all enabled). The user then customizes
      // which engines/agents/apps/etc. are enabled — that config is captured on
      // switch-out and applied on switch-in.
      config: {
        enabledEngineIds: [],
        enabledLlmFamilyIds: [],
        enabledAgentIds: [],
        enabledAppIds: [],
        enabledModuleIds: [],
        enabledSkillIds: [],
        enabledToolIds: [],
      },
      preferences: {},
      isGlobal: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ profiles: [...s.profiles, profile] }));
    void saveState("profiles", "all", get().profiles);
    void writeLog("install", "info", `Profile created: ${profile.name}`, { id });
    get().pushActivity({
      kind: "app",
      text: `Profile created: ${profile.name}`,
      severity: "success",
    });
    return id;
  },

  switchProfile: (profileId) => {
    const newProfile = get().profiles.find((p) => p.id === profileId);
    if (!newProfile) return;
    const oldProfileId = get().activeProfileId;

    // ── Step 1: Capture the outgoing profile's runtime config ──
    // Before switching, snapshot the current enabled states (engines, agents,
    // apps, modules, skills, tools) into the OUTGOING profile's config so the
    // user's customizations are preserved for next time. The Global profile's
    // config stays empty (unrestricted).
    if (oldProfileId !== profileId) {
      get().captureCurrentProfileConfig(oldProfileId);
    }

    // ── Step 2: Apply the incoming profile's config to the live runtime ──
    // Enable/disable engines, agents, apps, modules, skills, tools per the
    // profile's activation sets. Empty set = all enabled (Global behavior).
    // Back-compat: profiles created before the config field existed have no config
    const config = newProfile.config ?? {
      enabledEngineIds: [],
      enabledLlmFamilyIds: [],
      enabledAgentIds: [],
      enabledAppIds: [],
      enabledModuleIds: [],
      enabledSkillIds: [],
      enabledToolIds: [],
    };
    const isUnrestricted = newProfile.isGlobal || (
      config.enabledEngineIds.length === 0 &&
      config.enabledLlmFamilyIds.length === 0 &&
      config.enabledAgentIds.length === 0 &&
      config.enabledAppIds.length === 0 &&
      config.enabledModuleIds.length === 0 &&
      config.enabledSkillIds.length === 0 &&
      config.enabledToolIds.length === 0
    );

    const patch: Partial<AxiomState> = { activeProfileId: profileId };

    if (!isUnrestricted) {
      // ── Apply the profile's activation set ──
      // Only the listed IDs are enabled; everything else is disabled.
      patch.engines = get().engines.map((e) => ({
        ...e,
        enabled: config.enabledEngineIds.length === 0 || config.enabledEngineIds.includes(e.id),
      }));
      patch.llmFamilies = get().llmFamilies.map((f) => {
        const familyEnabled = config.enabledLlmFamilyIds.length === 0 || config.enabledLlmFamilyIds.includes(f.id);
        return {
          ...f,
          enabled: familyEnabled,
          models: familyEnabled ? f.models : f.models.map((m) => ({ ...m, enabled: false })),
        };
      });
      patch.installedAgents = get().installedAgents.map((a) => ({
        ...a,
        enabled: a.isSystemAgent || config.enabledAgentIds.length === 0 || config.enabledAgentIds.includes(a.id),
      }));
      patch.apps = get().apps.map((a) => {
        const isInfra = a.category === "Workflow Engine" || a.category === "AI Core";
        if (isInfra) {
          return { ...a, enabled: config.enabledModuleIds.length === 0 || config.enabledModuleIds.includes(a.id) };
        }
        return { ...a, enabled: config.enabledAppIds.length === 0 || config.enabledAppIds.includes(a.id) };
      });
      patch.skills = get().skills.map((s) => ({
        ...s,
        enabled: config.enabledSkillIds.length === 0 || config.enabledSkillIds.includes(s.id),
      }));
      patch.tools = get().tools.map((t) => ({
        ...t,
        enabled: config.enabledToolIds.length === 0 || config.enabledToolIds.includes(t.id),
      }));
    } else {
      // ── Unrestricted profile (Global or empty config) — enable everything ──
      // When switching to an unrestricted profile, force-enable all entities so
      // any restrictions from the previous profile are reverted.
      patch.engines = get().engines.map((e) => ({ ...e, enabled: true }));
      patch.llmFamilies = get().llmFamilies.map((f) => ({ ...f, enabled: true, models: f.models.map((m) => ({ ...m, enabled: true })) }));
      patch.installedAgents = get().installedAgents.map((a) => ({ ...a, enabled: true }));
      patch.apps = get().apps.map((a) => ({ ...a, enabled: true }));
      patch.skills = get().skills.map((s) => ({ ...s, enabled: true }));
      patch.tools = get().tools.map((t) => ({ ...t, enabled: true }));
    }

    // ── Step 3: Apply preferred defaults (engine/LLM/voice) ──
    const prefs = newProfile.preferences;
    if (prefs.preferredEngineId) patch.activeEngineId = prefs.preferredEngineId;
    if (prefs.preferredModelId) patch.activeModelId = prefs.preferredModelId;
    if (typeof prefs.voiceEnabled === "boolean") patch.voiceEnabled = prefs.voiceEnabled;

    set(patch);
    void saveState("profiles", "active-id", profileId);
    void writeLog("install", "info", `Switched to profile: ${newProfile.name}`, { id: profileId, appliedConfig: !isUnrestricted });
    get().pushActivity({
      kind: "app",
      text: `Switched to profile: ${newProfile.name}`,
      severity: "info",
    });
  },

  captureCurrentProfileConfig: (profileId) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile || profile.isGlobal) return; // Global stays unrestricted
    // Snapshot the current enabled states into the profile's config.
    const config: ProfileConfig = {
      enabledEngineIds: get().engines.filter((e) => e.enabled).map((e) => e.id),
      enabledLlmFamilyIds: get().llmFamilies.filter((f) => f.enabled).map((f) => f.id),
      enabledAgentIds: get().installedAgents.filter((a) => a.enabled || a.isSystemAgent).map((a) => a.id),
      enabledAppIds: get().apps.filter((a) => a.enabled && a.category !== "Workflow Engine" && a.category !== "AI Core").map((a) => a.id),
      enabledModuleIds: get().apps.filter((a) => a.enabled && (a.category === "Workflow Engine" || a.category === "AI Core")).map((a) => a.id),
      enabledSkillIds: get().skills.filter((s) => s.enabled).map((s) => s.id),
      enabledToolIds: get().tools.filter((t) => t.enabled).map((t) => t.id),
    };
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId ? { ...p, config, updatedAt: Date.now() } : p,
      ),
    }));
    void saveState("profiles", "all", get().profiles);
  },

  updateProfileConfig: (profileId, config) => {
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId ? { ...p, config, updatedAt: Date.now() } : p,
      ),
    }));
    void saveState("profiles", "all", get().profiles);
    // If this is the active profile, apply the config change to the live runtime
    if (get().activeProfileId === profileId) {
      const profile = get().profiles.find((p) => p.id === profileId);
      if (profile && !profile.isGlobal) {
        const patch: Partial<AxiomState> = {};
        patch.engines = get().engines.map((e) => ({
          ...e,
          enabled: config.enabledEngineIds.length === 0 || config.enabledEngineIds.includes(e.id),
        }));
        patch.llmFamilies = get().llmFamilies.map((f) => ({
          ...f,
          enabled: config.enabledLlmFamilyIds.length === 0 || config.enabledLlmFamilyIds.includes(f.id),
        }));
        patch.installedAgents = get().installedAgents.map((a) => ({
          ...a,
          enabled: a.isSystemAgent || config.enabledAgentIds.length === 0 || config.enabledAgentIds.includes(a.id),
        }));
        patch.apps = get().apps.map((a) => {
          const isInfra = a.category === "Workflow Engine" || a.category === "AI Core";
          if (isInfra) {
            return { ...a, enabled: config.enabledModuleIds.length === 0 || config.enabledModuleIds.includes(a.id) };
          }
          return { ...a, enabled: config.enabledAppIds.length === 0 || config.enabledAppIds.includes(a.id) };
        });
        patch.skills = get().skills.map((s) => ({
          ...s,
          enabled: config.enabledSkillIds.length === 0 || config.enabledSkillIds.includes(s.id),
        }));
        patch.tools = get().tools.map((t) => ({
          ...t,
          enabled: config.enabledToolIds.length === 0 || config.enabledToolIds.includes(t.id),
        }));
        set(patch);
      }
    }
  },

  updateProfile: (profileId, patch) => {
    set((s) => ({
      profiles: s.profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              ...("name" in patch ? { name: patch.name! } : {}),
              ...("icon" in patch ? { icon: patch.icon! } : {}),
              ...("color" in patch ? { color: patch.color! } : {}),
              ...("visibility" in patch ? { visibility: patch.visibility! } : {}),
              ...("preferences" in patch ? { preferences: patch.preferences! } : {}),
              updatedAt: Date.now(),
            }
          : p,
      ),
    }));
    void saveState("profiles", "all", get().profiles);
    // If the active profile was updated, re-apply its preferences.
    if (get().activeProfileId === profileId) {
      const updated = get().profiles.find((p) => p.id === profileId);
      if (updated) {
        const prefs = updated.preferences;
        const prefPatch: Partial<AxiomState> = {};
        if (prefs.preferredEngineId) prefPatch.activeEngineId = prefs.preferredEngineId;
        if (prefs.preferredModelId) prefPatch.activeModelId = prefs.preferredModelId;
        if (typeof prefs.voiceEnabled === "boolean") prefPatch.voiceEnabled = prefs.voiceEnabled;
        if (Object.keys(prefPatch).length > 0) set(prefPatch);
      }
    }
  },

  deleteProfile: (profileId) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile || profile.isGlobal) return; // Global cannot be deleted
    const wasActive = get().activeProfileId === profileId;
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== profileId),
      // If the deleted profile was active, fall back to Global.
      activeProfileId: wasActive ? GLOBAL_PROFILE_ID : s.activeProfileId,
    }));
    void saveState("profiles", "all", get().profiles);
    void saveState("profiles", "active-id", get().activeProfileId);
    void writeLog("install", "info", `Profile deleted: ${profile.name}`, { id: profileId });
    get().pushActivity({
      kind: "app",
      text: `Profile deleted: ${profile.name}`,
      severity: "info",
    });
  },

  getActiveProfile: () => {
    const { profiles, activeProfileId } = get();
    return profiles.find((p) => p.id === activeProfileId) ?? profiles.find((p) => p.isGlobal) ?? createGlobalProfile();
  },

  // ── Navigation ──
  // navigate() switches the viewport back to a normal routed page. CRITICAL:
  // open app tabs are NOT cleared — they stay mounted in the keep-alive stack
  // so their state (input, scroll, computations) survives. We only flip
  // viewMode to "page" and drop the focused-tab pointer. Published modules
  // still unmount on navigate (they're a separate, non-keep-alive flow).
  navigate: (page) => {
    const archiveViews = ["home", "agent-hub", "devlab", "workflows"];
    // When navigating to the Workflows page, keep workflow tabs alive but
    // switch to overview mode (don't clear activeWorkflowTabId — the user
    // may want to click a tab to return to their project). For other pages,
    // reset everything as before.
    if (page === "workflows") {
      set({
        currentPage: page,
        viewMode: "page",
        activeAppTabId: null,
        runningAppId: null,
        chatArchiveOpen: archiveViews.includes(page) ? get().chatArchiveOpen : false,
        runningModuleId: null,
        // Keep activeWorkflowTabId so the tab bar shows which tabs are open.
        // viewMode goes to "page" so the overview shows, not the iframe.
      });
      return;
    }
    set({
      currentPage: page,
      viewMode: "page",
      activeAppTabId: null,
      activeWorkflowTabId: null,
      runningAppId: null,
      chatArchiveOpen: archiveViews.includes(page) ? get().chatArchiveOpen : false,
      runningModuleId: null,
    });
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleGroup: (id) =>
    set((s) => ({
      collapsedGroups: { ...s.collapsedGroups, [id]: !s.collapsedGroups[id] },
    })),

  // ── App Tabs (browser-style keep-alive multitasking) ──
  // openAppTab: open an app into the persistent tab stack + focus it. If the
  // tab already exists, just focus it (no duplicate). Caches the app's
  // title/glyph/color at open time so the tab bar stays stable even if the
  // underlying app record changes later.
  openAppTab: (appId) => {
    const app = get().apps.find((a) => a.id === appId);
    if (!app) return;
    const existing = get().openAppTabs.find((t) => t.appId === appId);
    if (existing) {
      // Already open — just focus it.
      set({
        activeAppTabId: appId,
        viewMode: "app",
        runningAppId: appId,
        runningModuleId: null,
      });
      return;
    }
    const tab: AppTab = {
      appId: app.id,
      title: app.name,
      glyph: app.glyph,
      iconName: app.iconName,
      color: app.color,
      customColor: false,
      openedAt: Date.now(),
    };
    set((s) => ({
      openAppTabs: [...s.openAppTabs, tab],
      activeAppTabId: appId,
      viewMode: "app",
      runningAppId: appId,
      runningModuleId: null,
    }));
    get().pushActivity({
      kind: "app",
      text: `Opened app tab: ${app.name}`,
      severity: "info",
    });
  },

  // focusAppTab: bring an already-open tab to the foreground. Does NOT create.
  focusAppTab: (appId) => {
    const exists = get().openAppTabs.some((t) => t.appId === appId);
    if (!exists) return;
    set({
      activeAppTabId: appId,
      viewMode: "app",
      runningAppId: appId,
      runningModuleId: null,
    });
  },

  // closeAppTab: remove a tab from the stack. If the closed tab was focused,
  // focus the most-recently-opened remaining tab (or fall back to page mode).
  closeAppTab: (appId) => {
    const remaining = get().openAppTabs.filter((t) => t.appId !== appId);
    const wasFocused = get().activeAppTabId === appId;
    if (remaining.length === 0) {
      set({
        openAppTabs: [],
        activeAppTabId: null,
        viewMode: "page",
        runningAppId: null,
      });
    } else if (wasFocused) {
      // Focus the most-recently-opened surviving tab.
      const next = remaining.reduce((a, b) => (a.openedAt > b.openedAt ? a : b));
      set({
        openAppTabs: remaining,
        activeAppTabId: next.appId,
        viewMode: "app",
        runningAppId: next.appId,
      });
    } else {
      set({ openAppTabs: remaining });
    }
  },

  closeAllAppTabs: () =>
    set({
      openAppTabs: [],
      activeAppTabId: null,
      viewMode: "page",
      runningAppId: null,
    }),

  // ── Workflow Tab actions (keep-alive multitasking for workflow engines) ──
  // Mirrors the AppTab pattern: open creates or focuses, close removes,
  // switching tabs is instant (display:none, never unmount).
  //
  // ARCHITECTURE: workflow-engine runtime metadata (color, iconName, instanceUrl,
  // projectUrlPattern) is owned by the module record (InstalledApp with
  // category "Workflow Engine"). The store resolves it via
  // getWorkflowEngineModules(apps) — there is no duplicated `_workflowToolMeta`
  // map here. Adding a new engine only requires registering a module; the store
  // + Workflows page pick it up automatically.

  openWorkflowProjectTab: (projectId) => {
    // Find the project in the store
    const project = get().workflowProjects.find((p) => p.id === projectId);
    if (!project) return;
    // Check if already open — if so, just focus. Focusing an existing tab is
    // always allowed (the iframe is already mounted; switching ≠ opening).
    const existing = get().openWorkflowTabs.find((t) => t.projectId === projectId);
    if (existing) {
      set({
        activeWorkflowTabId: projectId,
        viewMode: "workflow",
        activeAppTabId: null,
        runningModuleId: null,
      });
      return;
    }
    // ── Resolve the engine module (modules own runtime metadata) ──
    const modules = getWorkflowEngineModules(get().apps);
    const mod = modules.find((m) => m.engineId === project.toolId);
    if (!mod) return;
    // ── Module state guard ──
    // Opening a NEW project tab requires the backing module to be "active".
    // standby/offline/error all block opening (the runtime can't execute the
    // workflow). Existing projects remain visible + browsable regardless.
    if (mod.state !== "active") return;
    // Build the per-project iframe URL. Engine-specific routing lives on the
    // module via projectUrlPattern (e.g. "/workflow/{id}" for n8n, "/flow/{id}"
    // for LangFlow) — the store never hardcodes engine ids. The {id} is the
    // engine-side workflow/flow id stored on the project (n8nWorkflowId for
    // n8n, langflowFlowId for LangFlow). For projects without an engine-side
    // id (newly created), fall back to the bare instanceUrl.
    let projectUrl = mod.instanceUrl;
    const engineProjectId =
      project.toolId === "n8n"
        ? project.n8nWorkflowId
        : project.toolId === "langflow"
          ? project.langflowFlowId
          : undefined;
    if (engineProjectId && mod.projectUrlPattern) {
      projectUrl = `${mod.instanceUrl}${mod.projectUrlPattern.replace("{id}", engineProjectId)}`;
    }
    const tab: WorkflowTab = {
      projectId,
      toolId: project.toolId,
      title: project.name,
      iconName: mod.iconName,
      color: mod.color,
      instanceUrl: projectUrl,
      openedAt: Date.now(),
    };
    set((s) => ({
      openWorkflowTabs: [...s.openWorkflowTabs, tab],
      activeWorkflowTabId: projectId,
      viewMode: "workflow",
      activeAppTabId: null,
      runningModuleId: null,
    }));
    get().pushActivity({
      kind: "workflow",
      text: `Opened workflow project: ${project.name}`,
      severity: "info",
    });
  },

  focusWorkflowTab: (projectId) => {
    const exists = get().openWorkflowTabs.some((t) => t.projectId === projectId);
    if (!exists) return;
    set({
      activeWorkflowTabId: projectId,
      viewMode: "workflow",
      activeAppTabId: null,
      runningModuleId: null,
    });
  },

  closeWorkflowTab: (projectId) => {
    const remaining = get().openWorkflowTabs.filter((t) => t.projectId !== projectId);
    const wasFocused = get().activeWorkflowTabId === projectId;
    if (remaining.length === 0) {
      set({
        openWorkflowTabs: [],
        activeWorkflowTabId: null,
        viewMode: "page",
      });
    } else if (wasFocused) {
      const next = remaining.reduce((a, b) => (a.openedAt >= b.openedAt ? a : b));
      set({
        openWorkflowTabs: remaining,
        activeWorkflowTabId: next.projectId,
        viewMode: "workflow",
      });
    } else {
      set({ openWorkflowTabs: remaining });
    }
  },

  // ── Workflow project + folder management ──
  // createWorkflowProject — creates a new workflow project for the given engine.
  // MODULE STATE GUARD: creation is only allowed when the engine's backing module
  // is "active". standby/offline/error all block creation (per the Modules ↔
  // Workflows state contract). Returns "" when blocked so callers can detect
  // the no-op. NEVER affects existing projects — they persist regardless.
  // The default project name is derived from the module's display name so this
  // function stays engine-agnostic (no hardcoded "n8n"/"LangFlow" strings).
  createWorkflowProject: (toolId, name, folderId) => {
    const modules = getWorkflowEngineModules(get().apps);
    const mod = modules.find((m) => m.engineId === toolId);
    if (!mod || mod.state !== "active") {
      // Module not active — block creation. Do NOT throw; callers (WorkflowsPage,
      // ChatArchivePanel) handle the empty-string return gracefully.
      get().pushActivity({
        kind: "workflow",
        text: `Blocked project creation — ${mod?.name ?? toolId} engine is not active`,
        severity: "info",
      });
      return "";
    }
    const id = "wp_" + uuid().slice(0, 8);
    const project: WorkflowProject = {
      id,
      name: name || `New ${mod.name} Project`,
      toolId,
      description: "",
      folderId,
      lastModified: Date.now(),
    };
    set((s) => ({ workflowProjects: [...s.workflowProjects, project] }));
    // ── Write-through to the Workspace Storage Service ──
    // Projects are permanent — they persist across refreshes and are NEVER
    // deleted by module state changes. Stored at Projects/Workflows/{toolId}/.
    void saveState("workflow-projects", "all", get().workflowProjects);
    void writeLog("install", "info", `Created workflow project: ${project.name}`, { toolId, id });
    get().pushActivity({
      kind: "workflow",
      text: `Created workflow project: ${project.name}`,
      severity: "success",
    });
    return id;
  },

  createWorkflowFolder: (toolId, name) => {
    const id = "wf_" + uuid().slice(0, 8);
    const folder: WorkflowFolder = {
      id,
      name,
      toolId,
      createdAt: Date.now(),
    };
    set((s) => ({ workflowFolders: [...s.workflowFolders, folder] }));
    void saveState("workflow-folders", "all", get().workflowFolders);
    return id;
  },

  deleteWorkflowFolder: (folderId) => {
    set((s) => ({
      workflowFolders: s.workflowFolders.filter((f) => f.id !== folderId),
      workflowProjects: s.workflowProjects.map((p) =>
        p.folderId === folderId ? { ...p, folderId: undefined } : p,
      ),
    }));
  },

  moveWorkflowProject: (projectId, folderId) => {
    set((s) => ({
      workflowProjects: s.workflowProjects.map((p) =>
        p.id === projectId ? { ...p, folderId: folderId ?? undefined } : p,
      ),
    }));
    void saveState("workflow-projects", "all", get().workflowProjects);
  },

  renameWorkflowProject: (projectId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      workflowProjects: s.workflowProjects.map((p) =>
        p.id === projectId ? { ...p, name: trimmed, lastModified: Date.now() } : p,
      ),
    }));
    void saveState("workflow-projects", "all", get().workflowProjects);
  },

  renameWorkflowFolder: (folderId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      workflowFolders: s.workflowFolders.map((f) =>
        f.id === folderId ? { ...f, name: trimmed } : f,
      ),
    }));
    void saveState("workflow-folders", "all", get().workflowFolders);
  },

  // ── Memory graph ──
  addNode: (input) => {
    const id = "n_" + uuid().slice(0, 8);
    const node: MemoryNode = {
      id,
      label: input.label || "Untitled",
      kind: input.kind,
      content: input.content ?? "",
      x: input.x ?? (Math.random() - 0.5) * 240,
      y: input.y ?? (Math.random() - 0.5) * 240,
      vx: 0,
      vy: 0,
      pinned: false,
      createdAt: Date.now(),
      folderId: input.folderId ?? get().activeFolderId,
      meta: input.meta,
    };
    set((s) => ({
      graph: { ...s.graph, nodes: [...s.graph.nodes, node] },
      selectedNodeId: id,
    }));
    return id;
  },

  updateNode: (id, patch) =>
    set((s) => ({
      graph: {
        ...s.graph,
        nodes: s.graph.nodes.map((n) =>
          n.id === id ? { ...n, ...patch } : n,
        ),
      },
    })),

  removeNode: (id) =>
    set((s) => ({
      graph: {
        nodes: s.graph.nodes.filter((n) => n.id !== id),
        edges: s.graph.edges.filter(
          (e) => e.source !== id && e.target !== id,
        ),
      },
      selectedNodeId:
        s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  linkNodes: (source, target, kind = "relates", weight = 1) => {
    if (source === target) return;
    set((s) => {
      const exists = s.graph.edges.find(
        (e) =>
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source),
      );
      if (exists) return {};
      const edge: MemoryEdge = {
        id: "e_" + uuid().slice(0, 8),
        source,
        target,
        kind,
        weight,
      };
      return { graph: { ...s.graph, edges: [...s.graph.edges, edge] } };
    });
  },

  removeEdge: (id) =>
    set((s) => ({
      graph: {
        ...s.graph,
        edges: s.graph.edges.filter((e) => e.id !== id),
      },
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  setNodePosition: (id, x, y) =>
    set((s) => ({
      graph: {
        ...s.graph,
        nodes: s.graph.nodes.map((n) =>
          n.id === id ? { ...n, x, y, vx: 0, vy: 0 } : n,
        ),
      },
    })),

  // ── Folders ──
  addFolder: (name, parentId) => {
    const id = "f_" + uuid().slice(0, 8);
    const folder: BrainFolder = { id, name, parentId, color: "axiom-cyan" };
    set((s) => ({ folders: [...s.folders, folder] }));
    return id;
  },

  removeFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id && f.parentId !== id),
      graph: {
        ...s.graph,
        nodes: s.graph.nodes.map((n) =>
          n.folderId === id ? { ...n, folderId: null } : n,
        ),
      },
    })),

  setActiveFolder: (id) => set({ activeFolderId: id }),
  setBrainTab: (tab) => set({ brainTab: tab }),

  // ── Agents ──
  startConversation: (agentId) => {
    const id = "c_" + uuid().slice(0, 8);
    // ── Look up agent from installedAgents only, filtered by enabled ──
    // Built-in agents follow the same activation rules as installed agents.
    // A disabled agent (built-in or installed) cannot start a conversation.
    // The `roster` array is NOT used (it was an always-on bypass).
    const agent = get().installedAgents.find((a) => a.id === agentId && a.enabled);
    const conv: AgentConversation = {
      id,
      agentId,
      title: agent ? `${agent.name} session` : "Session",
      messages: [
        {
          id: uuid(),
          agentId,
          role: "system",
          content: agent
            ? `${agent.name} (${agent.role}) online.`
            : "Agent online.",
          ts: Date.now(),
        },
      ],
      createdAt: Date.now(),
    };
    set((s) => ({
      conversations: [...s.conversations, conv],
      activeConversationId: id,
    }));
    return id;
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  pushMessage: (conversationId, msg) => {
    const id = msg.id ?? uuid();
    const ts = msg.ts ?? Date.now();
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [
                ...c.messages,
                { ...msg, id, ts } as AgentMessage,
              ],
            }
          : c,
      ),
    }));
    return id;
  },

  updateMessage: (conversationId, messageId, patch) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
            }
          : c,
      ),
    })),

  setAgentStatus: (agentId, status) =>
    set((s) => ({
      agentStatus: { ...s.agentStatus, [agentId]: status },
    })),

  installAgent: (agentId) => {
    const available = get().availableAgents.find((a) => a.id === agentId);
    if (!available) return;
    const installed: InstalledAgent = {
      id: "agent_" + uuid().slice(0, 8),
      name: available.name,
      role: available.role,
      description: available.description,
      systemPrompt: available.systemPrompt,
      color: available.color,
      glyph: available.glyph,
      installedAt: Date.now(),
      source: available.source.includes("github") ? "github" : "custom",
      sourceUrl: available.sourceUrl,
      enabled: true,
      category: available.category,
      tokensUsed: 0,
      costUsd: 0,
    };
    set((s) => ({
      installedAgents: [...s.installedAgents, installed],
      agentStatus: { ...s.agentStatus, [installed.id]: "idle" },
    }));
    get().pushActivity({
      kind: "agent",
      text: `Installed agent: ${available.name} from ${available.source}`,
      severity: "success",
    });
  },

  createCustomAgent: (input) => {
    const id = "agent_" + uuid().slice(0, 8);
    const installed: InstalledAgent = {
      id,
      name: input.name,
      role: input.role,
      description: input.description ?? `Custom agent: ${input.role}`,
      systemPrompt: input.systemPrompt,
      color: input.color ?? "axiom-violet",
      glyph: input.glyph ?? "🤖",
      installedAt: Date.now(),
      source: "custom",
      enabled: true,
      category: "Custom",
      tokensUsed: 0,
      costUsd: 0,
      engineId: input.engineId,
      model: input.model,
      equippedSkills: input.equippedSkills ?? [],
      linkedFolders: input.linkedFolders ?? [],
      visualIdentity: {
        displayName: input.name,
        description: input.description ?? `Custom agent: ${input.role}`,
        category: "Agent",
        glyph: input.glyph ?? "🤖",
        accentColor: input.color ?? "axiom-violet",
        badge: "AGENT",
      },
    };
    set((s) => ({
      installedAgents: [...s.installedAgents, installed],
      agentStatus: { ...s.agentStatus, [id]: "idle" },
    }));
    get().pushActivity({
      kind: "agent",
      text: `Custom agent forged: ${input.name}`,
      severity: "success",
    });
    return id;
  },

  uninstallAgent: (agentId) => {
    // The System Agent (Axiom) cannot be uninstalled — it's permanent.
    if (agentId === SYSTEM_AGENT_ID) return;
    set((s) => ({
      installedAgents: s.installedAgents.filter((a) => a.id !== agentId),
    }));
  },

  toggleAgentEnabled: (agentId) => {
    // The System Agent (Axiom) cannot be disabled — it's permanent.
    if (agentId === SYSTEM_AGENT_ID) return;
    set((s) => ({
      installedAgents: s.installedAgents.map((a) =>
        a.id === agentId ? { ...a, enabled: !a.enabled } : a,
      ),
    }));
  },

  updateAgent: (agentId, patch) => {
    set((s) => ({
      installedAgents: s.installedAgents.map((a) => {
        if (a.id !== agentId) return a;
        // Apply the patch, but NEVER override protected fields for the system agent
        const updated = { ...a, ...patch };
        if (a.isSystemAgent) {
          // System agent: keep isSystemAgent, enabled, source, id immutable
          updated.isSystemAgent = true;
          updated.enabled = true;
          updated.source = a.source;
          updated.id = a.id;
        }
        return updated;
      }),
    }));
    const agent = get().installedAgents.find((a) => a.id === agentId);
    if (agent) {
      get().pushActivity({
        kind: "agent",
        text: `Agent updated: ${agent.name}`,
        severity: "info",
      });
    }
  },

  // ── System Agent (Axiom — System Architect) ──
  setSystemAgentStatus: (status) => set({ systemAgentStatus: status }),

  getSystemAgent: () => get().installedAgents.find((a) => a.isSystemAgent),

  ensureSystemAgentEngine: () => {
    const agent = get().installedAgents.find((a) => a.isSystemAgent);
    if (!agent) return;
    const engines = get().engines;
    if (engines.length === 0) return; // No engines exist — warning state will be shown in UI

    // Check if the current engineId is valid
    const currentEngine = engines.find((e) => e.id === agent.engineId);
    if (currentEngine) {
      // Engine exists — check if the model is valid for this engine
      const models = currentEngine.models ?? [];
      if (agent.model && models.includes(agent.model)) return; // Both valid — nothing to do
      // Model invalid or missing — assign the first model from the engine
      const firstModel = models[0] ?? "";
      get().updateAgent(agent.id, { model: firstModel });
      return;
    }

    // Engine invalid or missing — auto-assign:
    // 1. Hermes Agent (if it exists)
    // 2. First enabled engine
    // 3. First engine (any state)
    const hermes = engines.find((e) => e.id === "eng_hermes");
    const firstEnabled = engines.find((e) => e.enabled);
    const targetEngine = hermes ?? firstEnabled ?? engines[0];
    const targetModels = targetEngine.models ?? [];
    const targetModel = targetModels[0] ?? "";

    get().updateAgent(agent.id, { engineId: targetEngine.id, model: targetModel });
  },

  // ── VibeCode ──
  createVibeFile: (name, language) => {
    const id = "vf_" + uuid().slice(0, 8);
    const file: VibeFile = {
      id,
      name,
      language,
      source:
        language === "javascript"
          ? "// new file\n"
          : language === "python"
            ? "# new file\n"
            : language === "typescript"
              ? "// new TypeScript file\n"
              : "# new prompt\n",
      updatedAt: Date.now(),
    };
    set((s) => ({
      vibeFiles: [...s.vibeFiles, file],
      activeVibeFileId: id,
    }));
    return id;
  },

  updateVibeFile: (id, patch) =>
    set((s) => ({
      vibeFiles: s.vibeFiles.map((f) =>
        f.id === id ? { ...f, ...patch, updatedAt: Date.now() } : f,
      ),
    })),

  deleteVibeFile: (id) =>
    set((s) => {
      const remaining = s.vibeFiles.filter((f) => f.id !== id);
      return {
        vibeFiles: remaining,
        activeVibeFileId:
          s.activeVibeFileId === id
            ? remaining[0]?.id ?? null
            : s.activeVibeFileId,
      };
    }),

  setActiveVibeFile: (id) => set({ activeVibeFileId: id }),

  pushVibeLog: (entry) =>
    set((s) => ({
      vibeLogs: [
        ...s.vibeLogs.slice(-500),
        { ...entry, id: uuid(), ts: Date.now() },
      ],
    })),

  clearVibeLogs: () => set({ vibeLogs: [] }),

  setDevlabTab: (tab) => set({ devlabTab: tab }),

  // ── DevLab Workspaces ──
  createWorkspace: (type, name, domain) => {
    const id = "ws_" + uuid().slice(0, 8);
    const now = Date.now();
    // Derive domain from type if not explicitly provided (back-compat)
    const resolvedDomain: DevLabDomain = domain ?? (type === "core-extension" ? "core" : "app");
    const defaultName =
      type === "core-extension" ? "Core Extension" : "Untitled App";
    const workspace: DevLabWorkspace = {
      id,
      name: name.trim() || defaultName,
      type,
      domain: resolvedDomain,
      files: [],
      activeFileId: null,
      messages: [
        {
          id: uuid(),
          role: "forge",
          content:
            type === "core-extension"
              ? "Workspace ready. I'm Axiom, the **System Architect**. I can rewrite live layout components and introduce native OS modules. Tell me what to modify."
              : "Workspace ready. I'm in **Application Developer** mode — I write self-contained logic that cannot corrupt Axiom OS core files. What shall we build?",
          ts: now,
        },
      ],
      logs: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      devlabWorkspaces: [workspace, ...s.devlabWorkspaces],
      activeWorkspaceId: id,
    }));
    // ── Write-through to the Workspace Storage Service ──
    // DevLab workspaces persist across refreshes. Stored at Projects/Sandbox Apps/.
    void saveState("devlab-workspaces", "all", get().devlabWorkspaces);
    void writeLog("install", "info", `DevLab workspace created: ${workspace.name} (${type})`);
    get().pushActivity({
      kind: "vibecode",
      text: `Workspace created: ${workspace.name} (${type})`,
      severity: "success",
    });
    return id;
  },

  deleteWorkspace: (workspaceId) => {
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.filter((w) => w.id !== workspaceId),
      activeWorkspaceId: s.activeWorkspaceId === workspaceId ? null : s.activeWorkspaceId,
    }));
    void saveState("devlab-workspaces", "all", get().devlabWorkspaces);
  },

  setActiveDevLabDomain: (domain) => set({ activeDevLabDomain: domain }),

  getWorkspacesByDomain: (domain) => get().devlabWorkspaces.filter((w) => w.domain === domain),

  // ── Integration Configurations (config-based, not chat-based) ──
  addIntegrationConfig: (input) => {
    const id = "intg_" + uuid().slice(0, 8);
    const now = Date.now();
    const config: IntegrationConfig = {
      id,
      name: input.name,
      kind: input.kind,
      status: "disconnected",
      config: input.config ?? {},
      description: input.description,
      glyph: input.glyph,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ integrationConfigs: [config, ...s.integrationConfigs] }));
    void saveState("integration-configs", "all", get().integrationConfigs);
    void writeLog("install", "info", `Integration added: ${config.name} (${config.kind})`);
    return id;
  },

  updateIntegrationConfig: (id, patch) => {
    set((s) => ({
      integrationConfigs: s.integrationConfigs.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
      ),
    }));
    void saveState("integration-configs", "all", get().integrationConfigs);
  },

  deleteIntegrationConfig: (id) => {
    const removed = get().integrationConfigs.find((c) => c.id === id);
    set((s) => ({
      integrationConfigs: s.integrationConfigs.filter((c) => c.id !== id),
    }));
    if (removed) {
      void saveState("integration-configs", "all", get().integrationConfigs);
      void writeLog("install", "info", `Integration removed: ${removed.name} (${removed.kind})`);
    }
  },

  /** Persist the entire integrationConfigs slice. Called after bulk updates
   *  (e.g. status changes from Test Connection buttons). */
  persistIntegrationConfigs: () => {
    void saveState("integration-configs", "all", get().integrationConfigs);
  },

  renameWorkspace: (workspaceId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId ? { ...w, name: trimmed, updatedAt: Date.now() } : w,
      ),
    }));
    void saveState("devlab-workspaces", "all", get().devlabWorkspaces);
  },

  switchWorkspace: (workspaceId) => {
    // Full state flush — the UI must re-derive everything from the new workspace.
    // No cross-contamination between workspaces.
    set({ activeWorkspaceId: workspaceId });
    const ws = get().devlabWorkspaces.find((w) => w.id === workspaceId);
    if (ws) {
      get().pushActivity({
        kind: "vibecode",
        text: `Switched to workspace: ${ws.name}`,
        severity: "info",
      });
    }
  },

  closeWorkspace: () => set({ activeWorkspaceId: null }),

  addWorkspaceFile: (workspaceId, name, language, folderPath, source) => {
    const fileId = "wf_" + uuid().slice(0, 8);
    const now = Date.now();
    const file: WorkspaceFile = {
      id: fileId,
      name,
      language,
      source: source ?? (language === "javascript" ? "// new file\n" : language === "python" ? "# new file\n" : language === "typescript" ? "// new TypeScript file\n" : "# new prompt\n"),
      updatedAt: now,
      folderPath: folderPath ?? "",
    };
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, files: [...w.files, file], activeFileId: fileId, updatedAt: now }
          : w,
      ),
    }));
    return fileId;
  },

  updateWorkspaceFile: (workspaceId, fileId, patch) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              files: w.files.map((f) =>
                f.id === fileId ? { ...f, ...patch, updatedAt: Date.now() } : f,
              ),
              updatedAt: Date.now(),
            }
          : w,
      ),
    })),

  deleteWorkspaceFile: (workspaceId, fileId) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        const remaining = w.files.filter((f) => f.id !== fileId);
        return {
          ...w,
          files: remaining,
          activeFileId: w.activeFileId === fileId
            ? (remaining[0]?.id ?? null)
            : w.activeFileId,
          updatedAt: Date.now(),
        };
      }),
    })),

  setActiveWorkspaceFile: (workspaceId, fileId) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId ? { ...w, activeFileId: fileId } : w,
      ),
    })),

  appendWorkspaceMessage: (workspaceId, msg) => {
    const id = msg.id ?? uuid();
    const ts = msg.ts ?? Date.now();
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              messages: [...w.messages, { ...msg, id, ts } as WorkspaceMessage],
              updatedAt: ts,
            }
          : w,
      ),
    }));
  },

  updateWorkspaceMessage: (workspaceId, messageId, patch) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              messages: w.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
              updatedAt: Date.now(),
            }
          : w,
      ),
    })),

  pushWorkspaceLog: (workspaceId, entry) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              logs: [...w.logs.slice(-500), { ...entry, id: uuid(), ts: Date.now() }],
              updatedAt: Date.now(),
            }
          : w,
      ),
    })),

  clearWorkspaceLogs: (workspaceId) =>
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId ? { ...w, logs: [] } : w,
      ),
    })),

  addGeneratedFiles: (workspaceId, files) => {
    const now = Date.now();
    const newFiles: WorkspaceFile[] = files.map((f) => ({
      id: "wf_" + uuid().slice(0, 8),
      name: f.name,
      language: f.language,
      source: f.source,
      updatedAt: now,
      folderPath: f.folderPath ?? "",
    }));
    set((s) => ({
      devlabWorkspaces: s.devlabWorkspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              files: [...w.files, ...newFiles],
              updatedAt: now,
            }
          : w,
      ),
    }));
    get().pushActivity({
      kind: "vibecode",
      text: `${newFiles.length} file(s) generated and added to workspace`,
      severity: "success",
    });
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  DevLab Integration — Intelligent Install Pipeline
  // ════════════════════════════════════════════════════════════════════════════
  //  classifyRepository runs a 7-stage analysis pipeline (Repository Scan →
  //  Manifest Scan → Dependency Analysis → Structure Analysis → Purpose Detection
  //  → Confidence Scoring → Recommendation) via the analyzer module. It creates
  //  an InstallPlan with scores for EVERY target, not just the winner. The user
  //  sees the full reasoning and can override the recommendation.
  //
  //  executeInstallPlan routes the confirmed plan (using userOverride ?? detectedType)
  //  to the correct installer: installApp, installModule, addEngine, addMcp,
  //  registerLLMModel, etc.

  classifyRepository: (repoUrl) => {
    const id = "plan_" + uuid().slice(0, 8);
    const now = Date.now();

    // ── Activate the System Agent (Axiom) for repository analysis ──
    get().setSystemAgentStatus("analyzing-repository");

    // Run the multi-stage analyzer (Repository Scan → Manifest Scan → Dependency
    // Analysis → Structure Analysis → Purpose Detection → Confidence Scoring →
    // Recommendation). Returns stages, signals, manifests, scores for ALL targets.
    const analysis = analyzeRepository(repoUrl);

    // Extract display name from URL
    const urlParts = repoUrl.replace(/\.git$/, "").replace(/\/$/, "").split("/");
    const repoName = urlParts[urlParts.length - 1] || "unknown-repo";
    const repoOwner = urlParts.length >= 2 ? urlParts[urlParts.length - 2] : "";
    const displayName = repoName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    // Build the flat analysisSteps log from the structured stages (back-compat)
    const analysisSteps = analysis.stages.map((s) => `${s.name}: ${s.detail}`);

    // ── Suggest a visual identity (icon, color, badge, category) from the
    //    analysis result. Pure derivation — the user can override in the
    //    Visual Identity step before install. Does NOT modify the analysis. ──
    const visualIdentity = suggestVisualIdentity(
      analysis,
      repoUrl,
      displayName,
      `GitHub repository from ${repoOwner}/${repoName}`,
      null,
    );

    const plan: InstallPlan = {
      id,
      source: "github",
      repoUrl,
      name: displayName,
      description: `GitHub repository from ${repoOwner}/${repoName}`,
      detectedType: analysis.detectedType,
      confidence: analysis.confidence,
      analysisStages: analysis.stages,
      analysisSteps,
      detectedSignals: analysis.detectedSignals,
      manifests: analysis.manifests,
      language: analysis.language,
      scores: analysis.scores,
      dependencies: analysis.dependencies,
      userOverride: null,
      installAction: INSTALL_ACTIONS[analysis.detectedType],
      status: "confirming",
      createdAt: now,
      visualIdentity,
    };
    set((s) => ({ installPlans: [plan, ...s.installPlans] }));
    // ── Write the repository analysis to the Logs/ namespace ──
    void writeLog("analysis", "info", `Analyzed ${repoName} → ${analysis.detectedType.replace(/-/g, " ")} (${analysis.scores[analysis.detectedType]}%)`, {
      repoUrl,
      detectedType: analysis.detectedType,
      scores: analysis.scores,
      signals: analysis.detectedSignals,
    });
    get().pushActivity({
      kind: "vibecode",
      text: `Analyzed ${repoName} → ${analysis.detectedType.replace(/-/g, " ")} (${analysis.scores[analysis.detectedType]}%)`,
      severity: "info",
    });
    // ── Deactivate the System Agent after analysis completes ──
    get().setSystemAgentStatus("idle");
    return id;
  },

  classifyLocalPath: (path, source) => {
    const id = "plan_" + uuid().slice(0, 8);
    const now = Date.now();
    const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
    const folderName = parts[parts.length - 1] || "local-package";

    // Build a minimal-but-complete InstallPlan. Local imports don't run the
    // full multi-stage analyzer (we can't actually read the manifest from the
    // browser), so we surface a single "Local Scan" stage, default to
    // "application" with low confidence, and let the user override via the UI.
    const emptyScores: Record<InstallTarget, number> = {
      "application": 100,
      "module": 0,
      "workflow-engine": 0,
      "runtime-engine": 0,
      "mcp-server": 0,
      "llm-model": 0,
      "skills-package": 0,
      "agent": 0,
      "tool": 0,
    };
    const stage: AnalysisStage = {
      name: "Local Scan",
      detail: `Scanned ${path} — browser sandbox cannot read local manifests, defaulting to Application.`,
      signals: [source === "zip" ? "zip-archive" : "local-folder"],
    };

    const localDisplayName = folderName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const localDescription = `Local ${source === "zip" ? "ZIP archive" : "folder"}: ${path}`;

    // ── Suggest a visual identity for local imports (defaults to Application). ──
    const localDefaults = TARGET_VISUAL_DEFAULTS["application"];
    const visualIdentity: VisualIdentity = {
      displayName: localDisplayName,
      description: localDescription,
      category: localDefaults.category,
      glyph: localDefaults.glyph,
      accentColor: localDefaults.accentColor,
      badge: localDefaults.badge,
    };

    const plan: InstallPlan = {
      id,
      source,
      localPath: path,
      name: localDisplayName,
      description: localDescription,
      detectedType: "application",
      confidence: "low",
      analysisStages: [stage],
      analysisSteps: [
        `Scanning ${path}…`,
        "Reading local manifest…",
        "Defaulting to Application — verify before installing",
      ],
      detectedSignals: stage.signals,
      manifests: [],
      language: "unknown",
      scores: emptyScores,
      dependencies: [],
      userOverride: null,
      installAction: "Register as an App in the App Manager (appears in Workspace → Apps).",
      status: "confirming",
      createdAt: now,
      visualIdentity,
    };
    set((s) => ({ installPlans: [plan, ...s.installPlans] }));
    get().pushActivity({
      kind: "vibecode",
      text: `Analyzed local ${source}: ${folderName}`,
      severity: "info",
    });
    return id;
  },

  executeInstallPlan: (planId) => {
    const plan = get().installPlans.find((p) => p.id === planId);
    // Allow install only from "reviewing" (the user has gone through the full
    // flow: Analysis → Classification → Customize Appearance → Review Installation).
    // The Confirm & Install button is only enabled in the reviewing state.
    if (!plan || plan.status !== "reviewing") return;

    // ── Activate the System Agent (Axiom) for installation ──
    get().setSystemAgentStatus("installing");

    // The effective target: user override wins over the system recommendation
    const effectiveTarget: InstallTarget = plan.userOverride ?? plan.detectedType;

    // ── Resolve the visual identity (user-customized or analyzer-suggested). ──
    // This is what propagates to every registry after install — no generic
    // placeholders if the user customized the appearance.
    const defaults = TARGET_VISUAL_DEFAULTS[effectiveTarget];
    const vi = plan.visualIdentity;
    const finalName = vi?.displayName ?? plan.name;
    const finalDesc = vi?.description ?? plan.description;
    const finalGlyph = vi?.glyph ?? defaults.glyph;
    const finalColor = vi?.accentColor ?? defaults.accentColor;
    const finalBadge = vi?.badge ?? defaults.badge;
    const finalCategory = vi?.category ?? defaults.category;

    // Mark as installing
    set((s) => ({
      installPlans: s.installPlans.map((p) =>
        p.id === planId ? { ...p, status: "installing" as const } : p,
      ),
    }));

    // Simulate install latency
    setTimeout(() => {
      // ── Route to the CORRECT registry based on the effective target ──
      // The user's category selection is the final authority. Each target
      // maps to exactly ONE canonical Infrastructure registry — never mixes.
      // The selected category IS the installation destination.
      //   application      → App Manager (apps)
      //   module           → Modules (apps with installState, category "AI Core")
      //   skills-package   → Skills Registry (skills)
      //   tool             → Tools Registry (tools)
      //   workflow-engine  → Engines → Workflow Engines (engines, kind gateway)
      //   runtime-engine   → Engines → Runtime Engines (engines, kind local-llm)
      //   llm-model        → Engines → LLM Registry (llmFamilies)
      //   mcp-server       → Engines → MCP Registry (mcps)
      //   agent            → Agents (installedAgents)
      switch (effectiveTarget) {
        case "application":
          // App Manager
          get().installApp({
            name: finalName,
            description: finalDesc,
            source: "github",
            sourceUrl: plan.repoUrl,
            glyph: finalGlyph,
            color: finalColor,
            category: finalCategory,
            badge: finalBadge,
          });
          break;
        case "module":
          // Modules page (AI Core grid). Uses installModule which creates a
          // loading card with installState: "installing".
          if (plan.repoUrl) {
            get().installModule(plan.repoUrl, finalName, {
              description: finalDesc,
              glyph: finalGlyph,
              color: finalColor,
              category: finalCategory,
              badge: finalBadge,
            });
          }
          break;
        case "skills-package":
          // Skills & Tools — registers as a Skill (NOT an App).
          get().addSkill({
            name: finalName,
            description: finalDesc,
            instructions: `Auto-imported skill from ${plan.repoUrl ?? plan.localPath ?? "repository"}.`,
            longDescription: finalDesc,
            category: finalCategory,
            glyph: finalGlyph,
          });
          break;
        case "workflow-engine":
          // Engines → Workflow Engines (kind: "gateway" for orchestration engines)
          get().addEngine({
            name: finalName,
            type: finalCategory,
            description: finalDesc,
            kind: "gateway",
            location: "Local",
            apiAddress: plan.repoUrl ?? "http://localhost:5678",
            glyph: finalGlyph,
            color: finalColor,
          });
          break;
        case "runtime-engine":
          // Engines → Runtime Engines (kind: "local-llm" for local inference)
          get().addEngine({
            name: finalName,
            type: finalCategory,
            description: finalDesc,
            kind: "local-llm",
            location: "Local",
            apiAddress: "http://localhost:8080",
            glyph: finalGlyph,
            color: finalColor,
          });
          break;
        case "mcp-server":
          // Engines → MCP Registry
          get().addMcp({
            name: finalName,
            url: plan.repoUrl ?? "http://localhost:3001",
            description: finalDesc,
            glyph: finalGlyph,
            color: finalColor,
            badge: finalBadge,
            category: finalCategory,
          });
          break;
        case "llm-model":
          // Engines → LLM Registry
          get().registerLLMModel({
            name: finalName,
            description: finalDesc,
            repoUrl: plan.repoUrl,
            language: plan.language,
            glyph: finalGlyph,
            color: finalColor,
            badge: finalBadge,
            category: finalCategory,
          });
          break;
        case "agent":
          // Agents registry — registers as a custom agent (appears in
          // Infrastructure → Agents). Uses createCustomAgent so the agent
          // gets a proper systemPrompt + default engine/model.
          get().createCustomAgent({
            name: finalName,
            role: finalCategory,
            description: finalDesc,
            systemPrompt: `You are ${finalName}, auto-imported from ${plan.repoUrl ?? "repository"}. ${finalDesc}`,
            color: finalColor,
            glyph: finalGlyph,
            engineId: get().activeEngineId ?? "",
            model: get().activeModelId ?? "default",
          });
          break;
        case "tool":
          // Tools Registry — registers as a Tool (appears in Workspace →
          // Skills & Tools → Tools tab). Tools and Skills are SEPARATE
          // registries; the "Skills & Tools" page is only a combined view.
          get().addTool({
            name: finalName,
            description: finalDesc,
            instructions: `Auto-imported tool from ${plan.repoUrl ?? plan.localPath ?? "repository"}.`,
            category: finalCategory,
            glyph: finalGlyph,
          });
          break;
      }

      // Mark as installed
      set((s) => ({
        installPlans: s.installPlans.map((p) =>
          p.id === planId ? { ...p, status: "installed" as const } : p,
        ),
      }));
      // ── Write the install log to the Logs/ namespace ──
      void writeLog("install", "info", `Installed ${finalName} as ${effectiveTarget.replace(/-/g, " ")}`, {
        planId,
        name: finalName,
        target: effectiveTarget,
        repoUrl: plan.repoUrl,
        visualIdentity: { glyph: finalGlyph, color: finalColor, badge: finalBadge, category: finalCategory },
      });
      get().pushActivity({
        kind: "vibecode",
        text: `Installed ${finalName} as ${effectiveTarget.replace(/-/g, " ")}`,
        severity: "success",
      });
      // ── Deactivate the System Agent after installation completes ──
      get().setSystemAgentStatus("idle");
    }, 1200);
  },

  overrideInstallType: (planId, target) => {
    set((s) => ({
      installPlans: s.installPlans.map((p) => {
        if (p.id !== planId) return p;
        // When the target changes, re-derive the suggested visualIdentity for
        // the new target (preserving any user-customized displayName/description).
        const defaults = TARGET_VISUAL_DEFAULTS[target];
        const customName = p.visualIdentity?.displayName ?? p.name;
        const customDesc = p.visualIdentity?.description ?? p.description;
        const newVisualIdentity: VisualIdentity = {
          displayName: customName,
          description: customDesc,
          category: defaults.category,
          glyph: defaults.glyph,
          accentColor: defaults.accentColor,
          badge: defaults.badge,
        };
        return {
          ...p,
          userOverride: target,
          installAction: INSTALL_ACTIONS[target],
          visualIdentity: newVisualIdentity,
        };
      }),
    }));
    get().pushActivity({
      kind: "vibecode",
      text: `Install target overridden -> ${target.replace(/-/g, " ")}`,
      severity: "info",
    });
  },

  proceedToVisualIdentity: (planId) => {
    set((s) => ({
      installPlans: s.installPlans.map((p) =>
        p.id === planId && p.status === "confirming"
          ? { ...p, status: "visual-identity" as const }
          : p,
      ),
    }));
  },

  setInstallVisualIdentity: (planId, patch) => {
    set((s) => ({
      installPlans: s.installPlans.map((p) => {
        if (p.id !== planId || p.status !== "visual-identity") return p;
        // Merge the patch into the existing visualIdentity (fallback to plan defaults).
        const effTarget = p.userOverride ?? p.detectedType;
        const defaults = TARGET_VISUAL_DEFAULTS[effTarget];
        const base: VisualIdentity = p.visualIdentity ?? {
          displayName: p.name,
          description: p.description,
          category: defaults.category,
          glyph: defaults.glyph,
          accentColor: defaults.accentColor,
          badge: defaults.badge,
        };
        const next: VisualIdentity = { ...base, ...patch };
        // ── Category override is the final authority ──
        // If the user changed the category, re-route the install target to
        // match (Skill → Skills Registry, Module → Modules, etc.). The
        // analyzer only makes a recommendation — the user's selection wins.
        let newUserOverride = p.userOverride;
        if (patch.category && patch.category !== defaults.category) {
          const mappedTarget = CATEGORY_TO_TARGET[patch.category];
          if (mappedTarget && mappedTarget !== effTarget) {
            newUserOverride = mappedTarget;
          }
        }
        // Keep `name` and `description` on the plan in sync with the visualIdentity
        // so executeInstallPlan sees the user-customized values when it routes.
        // Also apply the category-driven target override + installAction update.
        const updatedPlan: InstallPlan = {
          ...p,
          name: next.displayName,
          description: next.description,
          visualIdentity: next,
          userOverride: newUserOverride,
        };
        if (newUserOverride !== p.userOverride && newUserOverride) {
          updatedPlan.installAction = INSTALL_ACTIONS[newUserOverride];
        }
        return updatedPlan;
      }),
    }));
  },

  proceedToReview: (planId) => {
    set((s) => ({
      installPlans: s.installPlans.map((p) =>
        p.id === planId && p.status === "visual-identity"
          ? { ...p, status: "reviewing" as const }
          : p,
      ),
    }));
  },

  backToVisualIdentity: (planId) => {
    set((s) => ({
      installPlans: s.installPlans.map((p) =>
        p.id === planId && p.status === "reviewing"
          ? { ...p, status: "visual-identity" as const }
          : p,
      ),
    }));
  },

  clearInstallPlan: (planId) =>
    set((s) => ({
      installPlans: s.installPlans.filter((p) => p.id !== planId),
    })),

  // ── Terminal ──
  pushTerminal: (line) =>
    set((s) => ({
      terminalLines: [
        ...s.terminalLines.slice(-1000),
        { ...line, id: uuid(), ts: Date.now() },
      ],
    })),

  clearTerminal: () => set({ terminalLines: [] }),

  // ── Telemetry ──
  pushTelemetry: (sample) =>
    set((s) => ({
      telemetry: [...s.telemetry.slice(-60), sample],
    })),

  // ── Skills & Tools ──
  toggleSkill: (id) =>
    set((s) => ({
      skills: s.skills.map((sk) =>
        sk.id === id ? { ...sk, enabled: !sk.enabled } : sk,
      ),
    })),

  invokeSkill: (id) =>
    set((s) => ({
      skills: s.skills.map((sk) =>
        sk.id === id ? { ...sk, invoked: sk.invoked + 1 } : sk,
      ),
    })),

  toggleTool: (id) =>
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t,
      ),
    })),

  invokeTool: (id) =>
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === id ? { ...t, invoked: t.invoked + 1 } : t,
      ),
    })),

  addSkill: (input) => {
    const id = "sk_" + uuid().slice(0, 8);
    const skill: Skill = {
      id,
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      longDescription: input.longDescription,
      category: input.category,
      tags: input.tags ?? [],
      enabled: true,
      source: "custom",
      glyph: input.glyph ?? "✦",
      invoked: 0,
      author: input.author,
      version: input.version ?? "1.0.0",
      createdAt: Date.now(),
      parameters: input.parameters ?? [],
      visualIdentity: {
        displayName: input.name,
        description: input.description,
        category: input.category,
        glyph: input.glyph ?? "✦",
        accentColor: "axiom-emerald",
        badge: "SKILL",
      },
    };
    set((s) => ({ skills: [...s.skills, skill] }));
    get().pushActivity({
      kind: "system",
      text: `New skill created: ${input.name}`,
      severity: "success",
    });
    return id;
  },

  updateSkill: (id, patch) =>
    set((s) => ({
      skills: s.skills.map((sk) =>
        sk.id === id ? { ...sk, ...patch, updatedAt: Date.now() } : sk,
      ),
    })),

  removeSkill: (id) =>
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) })),

  addTool: (input) => {
    const id = "tl_" + uuid().slice(0, 8);
    const tool: Tool = {
      id,
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      category: input.category,
      tags: input.tags ?? [],
      enabled: true,
      source: "custom",
      visualIdentity: {
        displayName: input.name,
        description: input.description,
        category: input.category,
        glyph: input.glyph ?? "⚙",
        accentColor: "axiom-cyan",
        badge: "TOOL",
      },
      endpoint: input.endpoint,
      method: input.method,
      authRequired: input.authRequired,
      glyph: input.glyph ?? "⚙",
      invoked: 0,
      author: input.author,
      version: input.version ?? "1.0.0",
      createdAt: Date.now(),
      parameters: input.parameters ?? [],
      returns: input.returns,
    };
    set((s) => ({ tools: [...s.tools, tool] }));
    get().pushActivity({
      kind: "system",
      text: `New tool created: ${input.name}`,
      severity: "success",
    });
    return id;
  },

  updateTool: (id, patch) =>
    set((s) => ({
      tools: s.tools.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
      ),
    })),

  removeTool: (id) =>
    set((s) => ({ tools: s.tools.filter((t) => t.id !== id) })),

  // ── Apps ──
  installApp: (input) => {
    const id = "app_" + uuid().slice(0, 8);
    const app: InstalledApp = {
      id,
      name: input.name,
      description: input.description,
      source: input.source,
      sourceUrl: input.sourceUrl,
      installedAt: Date.now(),
      enabled: true,
      glyph: input.glyph ?? "📦",
      color: input.color ?? "axiom-cyan",
      running: false,
      category: input.category ?? "General",
      code: input.code,
      // Write the shared VisualIdentity object — single source of truth
      visualIdentity: {
        displayName: input.name,
        description: input.description,
        category: input.category ?? "General",
        glyph: input.glyph ?? "📦",
        accentColor: input.color ?? "axiom-cyan",
        badge: input.badge ?? "APP",
      },
    };
    set((s) => ({ apps: [...s.apps, app] }));
    get().pushActivity({
      kind: "app",
      text: `Installed app: ${input.name} (${input.source})`,
      severity: "success",
    });
    return id;
  },

  // ── Agentic Module Installation (Modules page GitHub import) ──
  // installModule constructs an independent manifest object
  // { module_id, origin: "github", target_url, status: "installing" }, routes
  // it to triggerAgenticModuleInstallation (the hooks pipeline for the future
  // AI Installer Agent: git clone → dependency parse → localhost port deploy),
  // and appends a temporary non-blocking loading card into the AI Core grid.
  // The loading card stays mounted (status: "installing") until the agent
  // pipeline calls resolveModuleInstall().
  installModule: (repoUrl, name, visualIdentity) => {
    const trimmedUrl = repoUrl.trim();
    // Derive a clean module_id from the repo slug (e.g. "owner/repo" → "repo").
    const slug = trimmedUrl.split("/").pop()?.replace(/\.git$/, "") || "custom-repo";
    const moduleId = `mod_${slug.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()}_${uuid().slice(0, 4)}`;
    const displayName = (name && name.trim()) || slug;

    // 1. Construct the manifest payload.
    const manifest: ModuleInstallManifest = {
      module_id: moduleId,
      origin: "github",
      target_url: trimmedUrl,
      status: "installing",
    };

    // 2. Route to the agentic installer hooks pipeline (placeholder — currently
    //    logs; will later command the background AI Installer Agent).
    triggerAgenticModuleInstallation(manifest);

    // 3. Append a temporary loading card into the AI Core grid so the user
    //    sees the installation routine was dispatched. Non-blocking: the rest
    //    of the OS keeps running. The card carries installState: "installing"
    //    which the InfraModuleCard renders as a spinner + "installing" badge.
    //    Visual identity (icon, color, category) is applied so even the loading
    //    card uses the user-customized appearance — no generic placeholders.
    const loadingApp: InstalledApp = {
      id: moduleId,
      name: displayName,
      description: visualIdentity?.description ?? `Agentic installer dispatched — cloning ${trimmedUrl} and parsing dependencies…`,
      source: "github",
      sourceUrl: trimmedUrl,
      repoUrl: trimmedUrl,
      installedAt: Date.now(),
      enabled: false,
      connected: false,
      running: false,
      glyph: visualIdentity?.glyph ?? "",
      iconName: "Boxes",
      color: visualIdentity?.color ?? "axiom-amber",
      category: visualIdentity?.category ?? "AI Core",
      installState: "installing",
      instanceUrl: "",
    };
    set((s) => ({ apps: [...s.apps, loadingApp] }));
    get().pushActivity({
      kind: "app",
      text: `Module install dispatched: ${displayName} (${trimmedUrl})`,
      severity: "info",
    });
    return moduleId;
  },

  // resolveModuleInstall — called by the agent pipeline when the install
  // completes (success) or fails. On success the loading card flips to a real
  // installed module (installState: "installed", ready to configure). On
  // failure the loading card is removed entirely.
  resolveModuleInstall: (moduleId, success) => {
    if (success) {
      set((s) => ({
        apps: s.apps.map((a) =>
          a.id === moduleId
            ? {
                ...a,
                installState: "installed",
                description: `Installed from ${a.repoUrl ?? a.sourceUrl ?? ""}. Configure the instance URL to activate.`,
              }
            : a,
        ),
      }));
      const app = get().apps.find((a) => a.id === moduleId);
      get().pushActivity({
        kind: "app",
        text: `Module installed: ${app?.name ?? moduleId}`,
        severity: "success",
      });
    } else {
      set((s) => ({ apps: s.apps.filter((a) => a.id !== moduleId) }));
      get().pushActivity({
        kind: "app",
        text: `Module install failed: ${moduleId}`,
        severity: "error",
      });
    }
  },

  uninstallApp: (id) =>
    set((s) => {
      const remaining = s.openAppTabs.filter((t) => t.appId !== id);
      const nextFocus =
        s.activeAppTabId === id
          ? (remaining.length > 0
              ? remaining.reduce((a, b) => (a.openedAt >= b.openedAt ? a : b)).appId
              : null)
          : s.activeAppTabId;
      return {
        apps: s.apps.filter((a) => a.id !== id),
        // Eject any open tab for the uninstalled app (can't run a deleted app).
        openAppTabs: remaining,
        activeAppTabId: nextFocus,
        viewMode:
          s.activeAppTabId === id && remaining.length === 0
            ? ("page" as const)
            : s.viewMode,
        runningAppId: s.runningAppId === id ? null : s.runningAppId,
      };
    }),

  // toggleAppEnabled — flips an app's enabled flag. SECTION 2 of the architecture
  // update: when an app is toggled OFF, its tab is immediately ejected from the
  // keep-alive stack AND its nav link vanishes from the MODELS sidebar group
  // (the sidebar derives from `apps.filter(enabled)`). Toggling ON does not
  // auto-open a tab — the user opens it from the MODELS group or Apps page.
  toggleAppEnabled: (id) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    const nowEnabled = !app.enabled;
    set((s) => {
      // If enabling, leave the tab stack alone. If disabling, eject this app's
      // tab (can't keep a disabled app mounted in the keep-alive stack).
      if (nowEnabled) {
        return {
          apps: s.apps.map((a) => (a.id === id ? { ...a, enabled: true } : a)),
        };
      }
      const remaining = s.openAppTabs.filter((t) => t.appId !== id);
      const nextFocus =
        s.activeAppTabId === id
          ? (remaining.length > 0
              ? remaining.reduce((a, b) => (a.openedAt >= b.openedAt ? a : b)).appId
              : null)
          : s.activeAppTabId;
      return {
        apps: s.apps.map((a) => (a.id === id ? { ...a, enabled: false } : a)),
        openAppTabs: remaining,
        activeAppTabId: nextFocus,
        viewMode:
          s.activeAppTabId === id && remaining.length === 0
            ? ("page" as const)
            : s.viewMode,
        runningAppId: s.runningAppId === id ? null : s.runningAppId,
      };
    });
    get().pushActivity({
      kind: "app",
      text: `${app.name} ${nowEnabled ? "enabled" : "disabled"}`,
      severity: nowEnabled ? "success" : "info",
    });
  },

  launchApp: (id) =>
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id ? { ...a, running: true } : a,
      ),
    })),

  stopApp: (id) =>
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id ? { ...a, running: false } : a,
      ),
    })),

  connectApp: async (id) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    // Mark as "connecting" by setting running=true (used by the UI to show a spinner)
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id ? { ...a, running: true } : a,
      ),
    }));
    // Simulate a network probe — local servers resolve fast
    await new Promise((r) => setTimeout(r, 1400));
    // Flip to connected + active. If the app has a workflowEngineId, the
    // Workflows page will now detect it as online via getModuleState().
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id
          ? {
              ...a,
              connected: true,
              running: true,
              enabled: true,
              installState: a.installState === "core" ? "core" : "installed",
              moduleState: "active" as const,
              moduleError: undefined,
            }
          : a,
      ),
    }));
    get().pushActivity({
      kind: "app",
      text: `${app.name} connected on port ${app.port ?? "—"}`,
      severity: "success",
    });
  },

  disconnectApp: (id) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id
          ? {
              ...a,
              connected: false,
              running: false,
              // After disconnect, the module is still enabled but not connected
              // → "standby" (browse-only on the Workflows page). Clear any
              // prior error state. Projects are NEVER deleted here.
              moduleState: a.enabled ? "standby" : "offline",
              moduleError: undefined,
            }
          : a,
      ),
    }));
    get().pushActivity({
      kind: "app",
      text: `${app.name} disconnected`,
      severity: "info",
    });
  },

  // ── Module activation + instance config (Modules page) ──
  // setModuleActive flips a backend module's runtime state — the single source
  // of truth shared by Infrastructure → Modules and Workspace → Workflows.
  //   active=true  → moduleState="active"  (enabled+connected+running; routable)
  //   active=false → moduleState="offline" (deliberately stopped; not routable)
  // CRITICAL: this only flips module state. It NEVER deletes workflow projects —
  // projects belong to the user and persist across module state changes. The
  // Workflows page keeps existing projects visible regardless of state.
  setModuleActive: (id, active) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    set((s) => ({
      apps: s.apps.map((a) =>
        a.id === id
          ? {
              ...a,
              enabled: active,
              connected: active,
              running: active,
              // Write the explicit moduleState so both Modules and Workflows
              // pages read the same value. Clearing moduleError on toggle lets
              // the user recover from an error state by re-activating.
              moduleState: active ? "active" : "offline",
              moduleError: undefined,
            }
          : a,
      ),
    }));
    get().pushActivity({
      kind: "app",
      text: `${app.name} ${active ? "activated — routing enabled" : "deactivated — routing disabled"}`,
      severity: active ? "success" : "info",
    });
  },

  // setModuleError — sets or clears a module's error state. When a message is
  // provided, the module flips to "error" (Open disabled on the Workflows page,
  // error message shown). When called without a message, the error is cleared
  // and the state re-derives from enabled/connected (active or offline).
  // NEVER deletes projects.
  setModuleError: (id, message) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    set((s) => ({
      apps: s.apps.map((a) => {
        if (a.id !== id) return a;
        if (message) {
          return {
            ...a,
            moduleError: message,
            moduleState: "error" as const,
            // An error halts routing — connected/running reflect that the
            // runtime is not currently usable. enabled is left unchanged so
            // the user's intent (on/off) is preserved when the error clears.
            connected: false,
            running: false,
          };
        }
        // Clearing the error: re-derive state from enabled/connected.
        const derived: ModuleRuntimeState =
          a.enabled && a.connected ? "active" : a.enabled ? "standby" : "offline";
        return {
          ...a,
          moduleError: undefined,
          moduleState: derived,
        };
      }),
    }));
    get().pushActivity({
      kind: "app",
      text: `${app.name} ${message ? `error — ${message}` : "error cleared"}`,
      severity: message ? "error" : "info",
    });
  },

  updateAppInstanceUrl: (id, url) =>
    set((s) => ({
      apps: s.apps.map((a) => (a.id === id ? { ...a, instanceUrl: url } : a)),
    })),

  // ── Published Apps ──
  publishWorkspace: async (workspaceId, opts) => {
    const ws = get().devlabWorkspaces.find((w) => w.id === workspaceId);
    if (!ws) throw new Error("Workspace not found");

    // ── Duplicate-publish guard ──
    // Apps and Modules are distinct asset types with separate registries.
    // A DevLab publish registers ONLY an App (in the `apps` registry) — it
    // must NEVER write to `publishedApps` (the module registry that feeds
    // Infrastructure → Modules). The duplicate check therefore inspects the
    // Apps registry, keyed by the source workspace id stored on the App.
    const appName = (opts.name ?? ws.name).trim() || "Untitled App";
    const existing = get().apps.find(
      (a) => a.source === "vibecode" && a.workspaceId === workspaceId,
    );
    if (existing) throw new Error("Workspace already published");

    // Simulate compile latency
    await new Promise((r) => setTimeout(r, 800));

    const id = "pub_" + uuid().slice(0, 8);
    const now = Date.now();

    // ── Register into the global Apps Registry (the single source of truth) ──
    // The published App appears in:
    //   • Workspace → APPS sidebar group (when enabled)
    //   • Infrastructure → App Manager page
    // It does NOT appear in Infrastructure → Modules — that page is reserved
    // for actual Modules (system infrastructure: Workflow Engines, AI Core).
    const appColor = opts.customColor && opts.color ? opts.color : (opts.color ?? "axiom-cyan");
    const installedApp: InstalledApp = {
      id: `app_${id}`,
      workspaceId,
      name: appName,
      description: opts.description ?? `Published from ${ws.name}`,
      source: "vibecode",
      sourceUrl: opts.githubRepoUrl,
      repoUrl: opts.githubRepoUrl,
      liveUrl: opts.url,
      installedAt: now,
      enabled: true,
      glyph: opts.glyph ?? "",
      // System Glyph (Lucide icon name). Since the publish opts no longer use
      // emoji, `glyph` holds a Lucide icon name and we mirror it to `iconName`
      // so the AppsPage + Sidebar render it via <AppGlyph>.
      iconName: opts.glyph,
      color: appColor,
      running: false,
      category: "Developer",
      installState: "installed",
    };
    set((s) => ({ apps: [...s.apps, installedApp] }));

    get().pushActivity({
      kind: "app",
      text: `Published + registered app: ${appName}`,
      severity: "success",
    });
    return id;
  },

  unpublishApp: (appId) =>
    set((s) => ({
      publishedApps: s.publishedApps.filter((p) => p.id !== appId),
      // Also remove from the Apps Registry
      apps: s.apps.filter((a) => a.id !== `app_${appId}`),
      runningModuleId: s.runningModuleId === appId ? null : s.runningModuleId,
    })),

  togglePublishedAppEnabled: (appId) =>
    set((s) => ({
      publishedApps: s.publishedApps.map((p) =>
        p.id === appId ? { ...p, enabled: !p.enabled, updatedAt: Date.now() } : p,
      ),
    })),

  launchModule: (appId) => set({ runningModuleId: appId, runningAppId: null }),
  closeModule: () => set({ runningModuleId: null }),

  getEnabledIntegratedModules: () =>
    get().publishedApps.filter((p) => p.blueprint === "integrated" && p.enabled),

  // Backward-compat wrappers — the real work now happens in the tab stack.
  // launchInstalledApp = open + focus the app tab; closeInstalledApp = close
  // the currently-focused app tab. Existing callers (AppsPage, sidebar) keep
  // working transparently with the new keep-alive architecture.
  launchInstalledApp: (id) => get().openAppTab(id),
  closeInstalledApp: () => {
    const active = get().activeAppTabId;
    if (active) get().closeAppTab(active);
    else set({ runningAppId: null, viewMode: "page" });
  },

  // ── LLM Providers ──
  updateProvider: (id, patch) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    })),

  toggleProvider: (id) =>
    set((s) => ({
      providers: s.providers.map((p) =>
        p.id === id ? { ...p, enabled: !p.enabled } : p,
      ),
    })),

  testProviderConnection: async (id) => {
    const provider = get().providers.find((p) => p.id === id);
    if (!provider) return;
    if (!provider.apiKey) {
      get().updateProvider(id, { connected: false });
      return;
    }
    // simulate connection test
    await new Promise((r) => setTimeout(r, 800));
    get().updateProvider(id, { connected: true });
    get().pushActivity({
      kind: "integration",
      text: `${provider.name} provider connected.`,
      severity: "success",
    });
  },

  // ── MCP ──
  addMcp: (input) => {
    const id = "mcp_" + uuid().slice(0, 8);
    const mcp: MCPServer = {
      id,
      name: input.name,
      url: input.url,
      enabled: true,
      connected: false,
      tools: [],
      description: input.description,
      visualIdentity: {
        displayName: input.name,
        description: input.description ?? "",
        category: input.category ?? "MCP Server",
        glyph: input.glyph,
        accentColor: input.color ?? "axiom-violet",
        badge: input.badge ?? "MCP",
      },
      glyph: input.glyph,
      color: input.color,
      badge: input.badge,
      category: input.category,
    };
    set((s) => ({ mcps: [...s.mcps, mcp] }));
    // simulate connection
    setTimeout(() => {
      set((s) => ({
        mcps: s.mcps.map((m) =>
          m.id === id
            ? { ...m, connected: true, tools: ["list_tools", "invoke_tool"] }
            : m,
        ),
      }));
    }, 1200);
  },

  removeMcp: (id) =>
    set((s) => ({ mcps: s.mcps.filter((m) => m.id !== id) })),

  toggleMcp: (id) =>
    set((s) => ({
      mcps: s.mcps.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m,
      ),
    })),

  // ── Engines ──
  updateEngine: (id, patch) =>
    set((s) => ({
      engines: s.engines.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  testEngine: async (id) => {
    const engine = get().engines.find((e) => e.id === id);
    if (!engine) return;
    // mark as testing (use "standby" while in-flight if not already active)
    get().updateEngine(id, { status: engine.enabled ? "standby" : "standby" });
    // simulate a network probe — local engines resolve faster than remote
    const delay = engine.location === "Local" ? 700 : 1200;
    await new Promise((r) => setTimeout(r, delay));
    const ok = engine.apiAddress.startsWith("http");
    const nextStatus: Engine["status"] = ok
      ? engine.kind === "autonomous"
        ? "active"
        : engine.kind === "gateway"
          ? "connected"
          : "active"
      : "error";
    get().updateEngine(id, {
      status: nextStatus,
      lastTestedAt: Date.now(),
      lastTestOk: ok,
      enabled: ok ? true : engine.enabled,
    });
    get().pushActivity({
      kind: "integration",
      text: `${engine.name}: ${ok ? "connection OK" : "connection failed"}`,
      severity: ok ? "success" : "error",
    });
  },

  toggleEngine: (id) =>
    set((s) => ({
      engines: s.engines.map((e) =>
        e.id === id
          ? {
              ...e,
              enabled: !e.enabled,
              status: !e.enabled
                ? e.kind === "autonomous"
                  ? "active"
                  : e.kind === "gateway"
                    ? "connected"
                    : "standby"
                : "disabled",
            }
          : e,
      ),
    })),

  addEngine: (input) => {
    const id = "eng_" + uuid().slice(0, 8);
    const engine: Engine = {
      id,
      name: input.name,
      type: input.type,
      description: input.description ?? "",
      kind: input.kind ?? "custom",
      status: "standby",
      location: input.location ?? "API",
      apiAddress: input.apiAddress,
      defaultApiAddress: input.apiAddress,
      enabled: false,
      glyph: input.glyph ?? "⚙",
      color: input.color ?? "axiom-cyan",
      visualIdentity: {
        displayName: input.name,
        description: input.description ?? "",
        category: input.type,
        glyph: input.glyph ?? "⚙",
        accentColor: input.color ?? "axiom-cyan",
        badge: input.kind === "gateway" ? "ENGINE" : "ENGINE",
      },
      models: input.models,
      config: input.config,
      createdAt: Date.now(),
    };
    set((s) => ({ engines: [...s.engines, engine] }));
    get().pushActivity({
      kind: "integration",
      text: `Engine added: ${input.name}`,
      severity: "info",
    });
    return id;
  },

  removeEngine: (id) =>
    set((s) => ({ engines: s.engines.filter((e) => e.id !== id) })),

  // ── Cascading engine/model selection ──
  // setActiveEngine picks the Tier-1 runtime/provider AND auto-cascades the
  // Tier-2 model to that engine's first allowed model. This structurally
  // prevents mismatched combos (e.g. a GPT model under an OpenClaw runtime).
  //
  // The id can match EITHER a runtime engine (from `engines`) OR an enabled
  // LLM family (from `llmFamilies`). When an LLM family is selected, its
  // models (LLMModelEntry[]) are used for the cascade — this lets users chat
  // directly with LLM provider models without needing a full agent engine.
  setActiveEngine: (engineId) => {
    // Check runtime engines first
    const engine = get().engines.find((e) => e.id === engineId);
    if (engine) {
      const firstModel = engine.models && engine.models.length > 0 ? engine.models[0] : null;
      set({ activeEngineId: engineId, activeModelId: firstModel });
      return;
    }
    // Check LLM families (treat as engine-like for direct LLM chat)
    const family = get().llmFamilies.find((f) => f.id === engineId);
    if (family) {
      const firstModel = family.models.length > 0 ? family.models[0].name : null;
      set({ activeEngineId: engineId, activeModelId: firstModel });
      return;
    }
  },

  // setActiveModel overrides the Tier-2 model. The model must belong to the
  // active engine's OR family's allowed list — if it doesn't, the call is a
  // no-op (defensive guard against mismatched combos).
  setActiveModel: (modelId) => {
    const activeId = get().activeEngineId;
    // Check runtime engines
    const engine = get().engines.find((e) => e.id === activeId);
    if (engine?.models?.includes(modelId)) {
      set({ activeModelId: modelId });
      return;
    }
    // Check LLM families
    const family = get().llmFamilies.find((f) => f.id === activeId);
    if (family?.models.some((m) => m.name === modelId)) {
      set({ activeModelId: modelId });
      return;
    }
  },

  // ── Unified Terminal Dropdown (v0.6) ──
  // selectTerminalEngine: selects a Category A engine → Development Engine Mode.
  // Delegates to setActiveEngine (which cascades the model) + flips terminalMode.
  selectTerminalEngine: (engineId) => {
    get().setActiveEngine(engineId);
    set({ terminalMode: "engine", activeDirectLlmId: null });
  },

  // selectTerminalLlm: selects a Category B Direct LLM → Ambient Chat Mode.
  selectTerminalLlm: (llmId) => {
    const exists = get().directLLMs.some((l) => l.id === llmId);
    if (!exists) return;
    set({ terminalMode: "ambient", activeDirectLlmId: llmId });
  },

  // ── LLM Registry ──
  registerLLMModel: (input) => {
    const id = "lf_" + uuid().slice(0, 8);
    const now = Date.now();
    const modelId = "lm_" + uuid().slice(0, 8);
    const family: LLMFamily = {
      id,
      name: input.name,
      tagline: "Local Model",
      description: input.description,
      glyph: input.glyph ?? "\u{1F9E0}", // brain
      color: input.color ?? "axiom-violet",
      apiBase: "http://localhost:8080",
      apiKeyVar: "",
      apiKey: "",
      enabled: true,
      keyValidated: false,
      models: [
        {
          id: modelId,
          name: input.name,
          modelId: input.name.toLowerCase().replace(/\s+/g, "-"),
          contextWindow: 8192,
          costPer1kInput: 0,
          costPer1kOutput: 0,
          capabilities: ["chat"],
          enabled: true,
          tier: "standard",
          description: `Local model from ${input.repoUrl ?? "repository"}`,
        },
      ],
      defaultModelId: modelId,
      fallbackPriority: get().llmFamilies.length + 1,
      createdAt: now,
      visualIdentity: {
        displayName: input.name,
        description: input.description,
        category: input.category ?? "LLM Provider",
        glyph: input.glyph ?? "\u{1F9E0}",
        accentColor: input.color ?? "axiom-violet",
        badge: input.badge ?? "LLM",
      },
      badge: input.badge,
      category: input.category,
    };
    set((s) => ({ llmFamilies: [...s.llmFamilies, family] }));
    get().pushActivity({
      kind: "integration",
      text: `Registered LLM Model: ${input.name} (in LLM Registry)`,
      severity: "success",
    });
  },

  toggleLLMFamily: (familyId) =>
    set((s) => ({
      llmFamilies: s.llmFamilies.map((f) =>
        f.id === familyId
          ? {
              ...f,
              enabled: !f.enabled,
              // When disabling a family, also disable all its models
              models: !f.enabled
                ? f.models.map((m) => ({ ...m, enabled: false }))
                : f.models,
            }
          : f,
      ),
    })),

  toggleLLMModel: (familyId, modelId) =>
    set((s) => ({
      llmFamilies: s.llmFamilies.map((f) =>
        f.id === familyId
          ? {
              ...f,
              models: f.models.map((m) =>
                m.id === modelId ? { ...m, enabled: !m.enabled } : m,
              ),
            }
          : f,
      ),
    })),

  setLLMApiKey: (familyId, key) =>
    set((s) => ({
      llmFamilies: s.llmFamilies.map((f) =>
        f.id === familyId
          ? { ...f, apiKey: key, keyValidated: false }
          : f,
      ),
    })),

  validateLLMKey: async (familyId) => {
    const family = get().llmFamilies.find((f) => f.id === familyId);
    if (!family || !family.apiKey) return false;
    // Simulate validation — check if key has length > 8
    await new Promise((r) => setTimeout(r, 800));
    const valid = family.apiKey.length >= 8;
    set((s) => ({
      llmFamilies: s.llmFamilies.map((f) =>
        f.id === familyId
          ? { ...f, keyValidated: valid, lastValidatedAt: Date.now() }
          : f,
      ),
    }));
    get().pushActivity({
      kind: "integration",
      text: `${family.name} API key: ${valid ? "validated" : "invalid — check key"}`,
      severity: valid ? "success" : "error",
    });
    return valid;
  },

  getEnabledLLMModels: () => {
    const families = get().llmFamilies;
    const out: { familyId: string; familyName: string; familyColor: string; familyGlyph: string; modelId: string; modelName: string; modelApiId: string; tier: string }[] = [];
    for (const f of families) {
      if (!f.enabled) continue;
      for (const m of f.models) {
        if (!m.enabled) continue;
        out.push({
          familyId: f.id,
          familyName: f.name,
          familyColor: f.color,
          familyGlyph: f.glyph,
          modelId: m.id,
          modelName: m.name,
          modelApiId: m.modelId,
          tier: m.tier,
        });
      }
    }
    return out;
  },

  getFallbackModel: (excludeModelId) => {
    const families = [...get().llmFamilies].sort(
      (a, b) => a.fallbackPriority - b.fallbackPriority,
    );
    // Strategy: first try lightweight, then standard, then flagship (cheapest first)
    const tierOrder: Array<string> = ["lightweight", "standard", "specialized", "flagship"];
    for (const tier of tierOrder) {
      for (const f of families) {
        if (!f.enabled || !f.apiKey) continue;
        for (const m of f.models) {
          if (!m.enabled || m.id === excludeModelId) continue;
          if (m.tier === tier) {
            return { familyId: f.id, modelId: m.id, modelName: m.name };
          }
        }
      }
    }
    // If nothing matches tier strategy, just pick first available
    for (const f of families) {
      if (!f.enabled) continue;
      for (const m of f.models) {
        if (!m.enabled || m.id === excludeModelId) continue;
        return { familyId: f.id, modelId: m.id, modelName: m.name };
      }
    }
    return null;
  },

  // ── Voice ──
  toggleVoice: () =>
    set((s) => {
      const next = !s.voiceEnabled;
      return {
        voiceEnabled: next,
        speaking: next ? s.speaking : false,
      };
    }),

  setVoiceEnabled: (enabled) =>
    set((s) => ({
      voiceEnabled: enabled,
      speaking: enabled ? s.speaking : false,
    })),

  toggleMic: () =>
    set((s) => ({ micListening: !s.micListening })),

  setSpeaking: (speaking) =>
    set(() => ({
      speaking,
      // If voice is disabled, can't be speaking
      ...(speaking && !useAxiom.getState().voiceEnabled ? { speaking: false } : {}),
    })),

  // ── Workflows ──
  createWorkflow: (name) => {
    const id = "wf_" + uuid().slice(0, 8);
    const workflow: Workflow = {
      id,
      name: name?.trim() || "Untitled Workflow",
      steps: [],
      createdAt: Date.now(),
      runStatus: "idle",
    };
    set((s) => ({
      workflows: [...s.workflows, workflow],
      activeWorkflowId: id,
    }));
    get().pushActivity({
      kind: "workflow",
      text: `Workflow created: ${workflow.name}`,
      severity: "info",
    });
    return id;
  },

  updateWorkflow: (id, patch) =>
    set((s) => ({
      workflows: s.workflows.map((w) =>
        w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w,
      ),
    })),

  deleteWorkflow: (id) =>
    set((s) => ({
      workflows: s.workflows.filter((w) => w.id !== id),
      activeWorkflowId:
        s.activeWorkflowId === id ? null : s.activeWorkflowId,
    })),

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  addStep: (workflowId, afterStepId) => {
    const stepId = "step_" + uuid().slice(0, 8);
    const newStep: WorkflowStep = {
      id: stepId,
      agentId: null,
      task: "",
      output: "pass-to-next",
      status: "idle",
    };
    set((s) => ({
      workflows: s.workflows.map((w) => {
        if (w.id !== workflowId) return w;
        const steps = [...w.steps];
        if (afterStepId) {
          const idx = steps.findIndex((st) => st.id === afterStepId);
          if (idx >= 0) {
            steps.splice(idx + 1, 0, newStep);
          } else {
            steps.push(newStep);
          }
        } else {
          steps.push(newStep);
        }
        return { ...w, steps, updatedAt: Date.now() };
      }),
    }));
    return stepId;
  },

  updateStep: (workflowId, stepId, patch) =>
    set((s) => ({
      workflows: s.workflows.map((w) =>
        w.id !== workflowId
          ? w
          : {
              ...w,
              steps: w.steps.map((st) =>
                st.id === stepId ? { ...st, ...patch } : st,
              ),
              updatedAt: Date.now(),
            },
      ),
    })),

  removeStep: (workflowId, stepId) =>
    set((s) => ({
      workflows: s.workflows.map((w) =>
        w.id !== workflowId
          ? w
          : {
              ...w,
              steps: w.steps.filter((st) => st.id !== stepId),
              updatedAt: Date.now(),
            },
      ),
    })),

  moveStep: (workflowId, stepId, direction) =>
    set((s) => ({
      workflows: s.workflows.map((w) => {
        if (w.id !== workflowId) return w;
        const steps = [...w.steps];
        const idx = steps.findIndex((st) => st.id === stepId);
        if (idx < 0) return w;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= steps.length) return w;
        [steps[idx], steps[target]] = [steps[target], steps[idx]];
        return { ...w, steps, updatedAt: Date.now() };
      }),
    })),

  runWorkflow: async (workflowId) => {
    const workflow = get().workflows.find((w) => w.id === workflowId);
    if (!workflow) return;
    // ── Use installedAgents filtered by enabled only (no roster bypass) ──
    // Built-in agents follow the same activation rules as installed agents.
    const allAgents = get().installedAgents.filter((a) => a.enabled);

    // Reset all steps to idle, mark workflow as running
    get().updateWorkflow(workflowId, {
      runStatus: "running",
      lastRunAt: Date.now(),
    });
    for (const step of workflow.steps) {
      get().updateStep(workflowId, step.id, {
        status: "idle",
        result: undefined,
        error: undefined,
      });
    }
    get().pushActivity({
      kind: "workflow",
      text: `Running workflow: ${workflow.name} (${workflow.steps.length} steps)`,
      severity: "info",
    });

    let carriedOutput = "";
    let hadError = false;

    for (const step of workflow.steps) {
      // Mark this step running
      get().updateStep(workflowId, step.id, { status: "running" });

      const agent = step.agentId
        ? allAgents.find((a) => a.id === step.agentId)
        : null;

      if (!agent) {
        get().updateStep(workflowId, step.id, {
          status: "error",
          error: "No agent assigned to this step",
        });
        hadError = true;
        break;
      }

      try {
        // Build the user message: the step's task + any carried output from the previous step.
        const userMessage =
          (carriedOutput
            ? `Previous step output:\n"""\n${carriedOutput}\n"""\n\n`
            : "") + step.task;

        const res = await fetch("/api/axiom/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            agentName: agent.name,
            role: agent.role,
            systemPrompt:
              agent.systemPrompt ||
              `You are ${agent.name}, an AI agent inside Axiom OS. Reply concisely.`,
            messages: [],
            userMessage,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reply: string = data.reply || "…";

        // Route the output based on the step's output setting.
        switch (step.output) {
          case "save-to-graph": {
            const nodeId = get().addNode({
              label: `${workflow.name} · ${step.task.slice(0, 40) || "step"}`,
              kind: "artifact",
              content: reply,
            });
            get().pushActivity({
              kind: "workflow",
              text: `Step output saved to graph: ${nodeId}`,
              severity: "success",
            });
            break;
          }
          case "send-notification":
            get().pushActivity({
              kind: "workflow",
              text: `Step "${step.task.slice(0, 40) || "step"}" → ${reply.slice(0, 120)}`,
              severity: "info",
            });
            break;
          case "terminal-print":
            get().pushTerminal({ kind: "output", text: `[workflow:${workflow.name}] ${reply}` });
            break;
          case "export-file":
            // Simulated — in production this would write to /download/.
            get().pushActivity({
              kind: "workflow",
              text: `Step output exported to file (simulated): ${reply.slice(0, 80)}…`,
              severity: "success",
            });
            break;
          case "pass-to-next":
          default:
            // carry to next step
            break;
        }

        get().updateStep(workflowId, step.id, {
          status: "done",
          result: reply,
        });
        carriedOutput = reply;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        get().updateStep(workflowId, step.id, {
          status: "error",
          error: msg,
        });
        hadError = true;
        break;
      }
    }

    get().updateWorkflow(workflowId, {
      runStatus: hadError ? "error" : "done",
    });
    get().pushActivity({
      kind: "workflow",
      text: `Workflow ${hadError ? "failed" : "completed"}: ${workflow.name}`,
      severity: hadError ? "error" : "success",
    });
  },

  // ── Unified chat history ──
  createChatSession: (source, opts) => {
    const id = "sess_" + uuid().slice(0, 8);
    const now = Date.now();
    const session: ChatSession = {
      id,
      title: opts?.title ?? `New ${source} session`,
      source,
      projectId: opts?.projectId ?? null,
      messages: [],
      createdAt: now,
      updatedAt: now,
      preview: opts?.preview,
      engineId: opts?.engineId,
      agentId: opts?.agentId,
    };
    set((s) => ({
      chatSessions: [session, ...s.chatSessions],
      activeChatSessionId: id,
    }));
    return id;
  },

  appendChatMessage: (sessionId, msg) => {
    const id = msg.id ?? uuid();
    const ts = msg.ts ?? Date.now();
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId
          ? {
              ...sess,
              messages: [...sess.messages, { ...msg, id, ts }],
              updatedAt: ts,
              preview: msg.role === "user" ? msg.content.slice(0, 80) : sess.preview,
            }
          : sess,
      ),
    }));
  },

  updateChatMessage: (sessionId, messageId, patch) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId
          ? {
              ...sess,
              messages: sess.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
              updatedAt: Date.now(),
            }
          : sess,
      ),
    })),

  deleteChatSession: (sessionId) =>
    set((s) => ({ chatSessions: s.chatSessions.filter((sess) => sess.id !== sessionId) })),

  renameChatSession: (sessionId, title) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId ? { ...sess, title, manuallyRenamed: true } : sess,
      ),
    })),

  /** Mark a session as auto-titled (prevents repeated LLM calls). */
  markSessionAutoTitled: (sessionId) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId ? { ...sess, autoTitled: true } : sess,
      ),
    })),

  /** Set a session's title automatically (does NOT set manuallyRenamed).
   *  Used by the auto-title LLM call. Manual renames use renameChatSession
   *  which DOES set manuallyRenamed=true. */
  setSessionTitle: (sessionId, title) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId ? { ...sess, title } : sess,
      ),
    })),

  /** Duplicate a chat session (copies title + messages, new id). */
  duplicateChatSession: (sessionId) => {
    const original = get().chatSessions.find((s) => s.id === sessionId);
    if (!original) return "";
    const id = "sess_" + uuid().slice(0, 8);
    const now = Date.now();
    const copy: ChatSession = {
      ...original,
      id,
      title: `${original.title} (copy)`,
      messages: original.messages.map((m) => ({ ...m, id: uuid() })),
      createdAt: now,
      updatedAt: now,
      manuallyRenamed: false,
      autoTitled: true,
    };
    set((s) => ({ chatSessions: [copy, ...s.chatSessions] }));
    return id;
  },

  moveSessionToProject: (sessionId, projectId) =>
    set((s) => ({
      chatSessions: s.chatSessions.map((sess) =>
        sess.id === sessionId ? { ...sess, projectId } : sess,
      ),
    })),

  createChatProject: (name, color, source) => {
    const id = "proj_" + uuid().slice(0, 8);
    const project: ChatProject = {
      id,
      name: name.trim() || "Untitled Project",
      color: color ?? "axiom-cyan",
      createdAt: Date.now(),
      source: source ?? (get().currentPage === "agent-hub" ? "home" as ChatSessionSource : (get().currentPage === "devlab" ? "devlab" as ChatSessionSource : get().currentPage === "workflows" ? "workflows" as ChatSessionSource : "home" as ChatSessionSource)),
    };
    set((s) => ({ chatProjects: [...s.chatProjects, project] }));
    return id;
  },

  deleteChatProject: (projectId) =>
    set((s) => ({
      chatProjects: s.chatProjects.filter((p) => p.id !== projectId),
      chatSessions: s.chatSessions.map((sess) =>
        sess.projectId === projectId ? { ...sess, projectId: null } : sess,
      ),
    })),

  renameChatProject: (projectId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      chatProjects: s.chatProjects.map((p) =>
        p.id === projectId ? { ...p, name: trimmed } : p,
      ),
    }));
  },

  setChatArchiveOpen: (open) => set({ chatArchiveOpen: open }),
  toggleChatArchive: () => set((s) => ({ chatArchiveOpen: !s.chatArchiveOpen })),

  setActiveChatFolder: (folderId) => set({ activeChatFolderId: folderId }),

  loadChatSession: (sessionId) => {
    // Mark the session as active so the Chat Terminal can pick it up.
    set({ activeChatSessionId: sessionId });
    const session = get().chatSessions.find((s) => s.id === sessionId);
    if (session) {
      get().pushActivity({
        kind: "system",
        text: `Loaded session: ${session.title}`,
        severity: "info",
      });
    }
  },

  // ── Agent Councils ──
  createCouncil: (name, orchestratorId, memberIds) => {
    const id = "council_" + uuid().slice(0, 8);
    const allMembers = Array.from(new Set([orchestratorId, ...memberIds]));
    const council: AgentCouncil = {
      id,
      name: name.trim() || "Untitled Council",
      orchestratorId,
      memberIds: allMembers,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => ({
      councils: [...s.councils, council],
      activeCouncilId: id,
    }));
    get().pushActivity({
      kind: "agent",
      text: `Council created: ${council.name} (${allMembers.length} members)`,
      severity: "success",
    });
    return id;
  },

  deleteCouncil: (councilId) =>
    set((s) => ({
      councils: s.councils.filter((c) => c.id !== councilId),
      activeCouncilId: s.activeCouncilId === councilId ? null : s.activeCouncilId,
    })),

  setActiveCouncil: (councilId) => set({ activeCouncilId: councilId }),

  sendCouncilMessage: async (councilId, content, isUser) => {
    const council = get().councils.find((c) => c.id === councilId);
    if (!council) return;
    // ── Use installedAgents filtered by enabled only (no roster bypass) ──
    const allAgents = get().installedAgents.filter((a) => a.enabled);

    if (isUser) {
      const userMsg: CouncilMessage = {
        id: uuid(), agentId: "user", agentName: "You", agentRole: "Operator",
        agentGlyph: "👤", agentColor: "axiom-cyan", content, ts: Date.now(),
      };
      set((s) => ({
        councils: s.councils.map((c) =>
          c.id === councilId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() }
            : c,
        ),
      }));
    }

    const members = council.memberIds.filter(id => id !== "user");
    const orchIdx = members.indexOf(council.orchestratorId);
    if (orchIdx >= 0 && orchIdx !== members.length - 1) {
      members.splice(orchIdx, 1);
      members.push(council.orchestratorId);
    }

    const contextMessages = [...council.messages];
    if (isUser) contextMessages.push({ id: "temp", agentId: "user", agentName: "You", agentRole: "", agentGlyph: "", agentColor: "", content, ts: Date.now() });

    for (const agentId of members) {
      const agent = allAgents.find((a) => a.id === agentId);
      if (!agent) continue;

      const pendingId = uuid();
      const pendingMsg: CouncilMessage = {
        id: pendingId, agentId: agent.id, agentName: agent.name, agentRole: agent.role,
        agentGlyph: agent.glyph, agentColor: agent.color, content: "", ts: Date.now(), pending: true,
      };
      set((s) => ({
        councils: s.councils.map((c) =>
          c.id === councilId
            ? { ...c, messages: [...c.messages, pendingMsg], updatedAt: Date.now() }
            : c,
        ),
      }));

      try {
        const transcript = contextMessages
          .map((m) => `${m.agentName}: ${m.content}`)
          .join("\n\n");
        const isOrchestrator = agentId === council.orchestratorId;
        const systemPrompt = isOrchestrator
          ? `${agent.systemPrompt}\n\nYou are the ORCHESTRATOR of this council. Review the other agents' responses and provide a final synthesis + decision. Be concise.`
          : `${agent.systemPrompt}\n\nYou are participating in a multi-agent council called "${council.name}". Other agents may have already responded. Give your unique perspective. Be concise (2-3 sentences). Don't repeat what others said.`;
        const userMessage = `Council discussion so far:\n${transcript}\n\nThe operator's instruction: ${content}\n\nProvide your response:`;

        const res = await fetch("/api/axiom/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.id, agentName: agent.name, role: agent.role, systemPrompt, messages: [], userMessage }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reply: string = data.reply || "…";

        set((s) => ({
          councils: s.councils.map((c) =>
            c.id === councilId
              ? { ...c, messages: c.messages.map((m) => m.id === pendingId ? { ...m, content: reply, pending: false } : m), updatedAt: Date.now() }
              : c,
          ),
        }));
        contextMessages.push({ id: pendingId, agentId: agent.id, agentName: agent.name, agentRole: agent.role, agentGlyph: agent.glyph, agentColor: agent.color, content: reply, ts: Date.now() });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set((s) => ({
          councils: s.councils.map((c) =>
            c.id === councilId
              ? { ...c, messages: c.messages.map((m) => m.id === pendingId ? { ...m, content: `⚠️ ${msg}`, pending: false } : m) }
              : c,
          ),
        }));
      }
    }
    get().pushActivity({ kind: "agent", text: `Council "${council.name}" debate completed`, severity: "success" });
  },

  // ── Activity ──
  pushActivity: (entry) =>
    set((s) => ({
      activity: [
        { ...entry, id: uuid(), ts: Date.now() },
        ...s.activity.slice(0, 100),
      ],
    })),
}));

// ════════════════════════════════════════════════════════════════════════════
//  Registry Persistence — non-destructive auto-save.
//
//  Subscribes to the store and persists the core registries (apps, agents,
//  skills, tools, engines, mcps, llmFamilies, providers) to storage whenever
//  they change. This guarantees that user-installed subsystems survive page
//  refreshes. The subscriber is ONLY active after hydration (so first-boot
//  seed → storage persistence in hydrateFromStorage is not fighting this).
//
//  This is additive — it does NOT modify any existing mutation function. The
//  registries are treated as production data: existing entries are never
//  deleted or overwritten by this subscriber.
// ════════════════════════════════════════════════════════════════════════════

let registryPersistLastSnap: {
  apps: unknown[];
  installedAgents: unknown[];
  skills: unknown[];
  tools: unknown[];
  engines: unknown[];
  mcps: unknown[];
  llmFamilies: unknown[];
  providers: unknown[];
} | null = null;

useAxiom.subscribe((state) => {
  // Only persist after hydration is complete
  if (!state.hydrated) return;

  const snap = {
    apps: state.apps,
    installedAgents: state.installedAgents,
    skills: state.skills,
    tools: state.tools,
    engines: state.engines,
    mcps: state.mcps,
    llmFamilies: state.llmFamilies,
    providers: state.providers,
  };

  // Simple shallow check — only persist if a registry array reference changed
  if (registryPersistLastSnap) {
    const changed =
      snap.apps !== registryPersistLastSnap.apps ||
      snap.installedAgents !== registryPersistLastSnap.installedAgents ||
      snap.skills !== registryPersistLastSnap.skills ||
      snap.tools !== registryPersistLastSnap.tools ||
      snap.engines !== registryPersistLastSnap.engines ||
      snap.mcps !== registryPersistLastSnap.mcps ||
      snap.llmFamilies !== registryPersistLastSnap.llmFamilies ||
      snap.providers !== registryPersistLastSnap.providers;
    if (!changed) return;
  }
  registryPersistLastSnap = snap;

  // Persist each changed registry (non-destructive — saves the FULL current
  // array, which includes all existing entries plus any new/modified ones)
  void saveState("registry-apps", "all", state.apps);
  void saveState("registry-agents", "all", state.installedAgents);
  void saveState("registry-skills", "all", state.skills);
  void saveState("registry-tools", "all", state.tools);
  void saveState("registry-engines", "all", state.engines);
  void saveState("registry-mcps", "all", state.mcps);
  void saveState("registry-llm-families", "all", state.llmFamilies);
  void saveState("registry-providers", "all", state.providers);
});

// ── Convenience selectors ──────────────────────────────────────────────────
export const KIND_COLORS: Record<MemoryNodeKind, string> = {
  concept: "axiom-cyan",
  agent: "axiom-emerald",
  event: "axiom-amber",
  artifact: "axiom-violet",
  code: "axiom-emerald",
  intent: "axiom-rose",
  datum: "axiom-dim",
};

export const KIND_GLYPHS: Record<MemoryNodeKind, string> = {
  concept: "●",
  agent: "◎",
  event: "◆",
  artifact: "▲",
  code: "⌬",
  intent: "✶",
  datum: "▪",
};

// Note: buildIntegrations is exported from ./seed — use it directly with useMemo
// in components (NOT as a zustand selector, since it returns a new array each call).

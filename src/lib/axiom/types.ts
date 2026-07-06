// Axiom OS — Core type definitions (v0.2 — page-based navigation)

// ── Navigation ─────────────────────────────────────────────────────────────

export type PageId =
  | "home"
  | "dashboard"
  | "brain"
  | "skills-tools"
  | "agent-hub"
  | "workflows"
  | "agents"
  | "engines"
  | "llm-registry"
  | "apps"
  | "modules"
  | "devlab"
  | "integrations"
  | "settings"
  | "about";

export interface NavItem {
  id: PageId;
  label: string;
  glyph: string;
  color: string;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// ── App Tabs (Browser-style keep-alive multitasking) ──────────────────────
// Open apps live in a persistent, background-managed view stack. When the user
// navigates away to a regular page (Dashboard, Agent Hub, …), open app tabs are
// hidden via `display:none` but NEVER unmounted — preserving all in-memory state
// (input, scroll, running computations). Modeled on the Brain pane tab system.
//
// A tab is uniquely keyed by the app id. Switching tabs just flips which tab is
// visible; closing a tab fully removes it from the stack.

export interface AppTab {
  /** The installed-app id this tab runs (key — one tab per app). */
  appId: string;
  /** Cached title at open time (so the tab bar doesn't flicker if the app renames). */
  title: string;
  /** Cached glyph (legacy — iconName is preferred for line-art rendering). */
  glyph: string;
  /** Lucide icon name for line-art rendering in the tab bar (matches sidebar). */
  iconName?: string;
  /** Color token (e.g. "axiom-cyan") OR a custom hex when customColor is true. */
  color: string;
  /** Whether `color` is a raw hex string (custom) rather than a palette token. */
  customColor?: boolean;
  /** Epoch ms when the tab was opened — used for ordering + "new" indicator. */
  openedAt: number;
}

// ── Workflow Tabs (Browser-style keep-alive for n8n / LangFlow) ────────────
// Mirrors AppTab but for workflow engine tools. Each open workflow tab
// persists in the background (display:none, never unmounted) so switching
// between n8n and LangFlow is instant without iframe reloads.

export interface WorkflowTab {
  /** The workflow PROJECT id this tab runs (key — one tab per project). */
  projectId: string;
  /** The workflow tool id — resolves to a registered workflow-engine module
   *  via `getWorkflowEngineModules(apps)`. Typed as `string` (not a union) so
   *  new engines can be registered without modifying this type. */
  toolId: string;
  /** Display title — the PROJECT name (e.g. "RAG Knowledge Base"). */
  title: string;
  /** Lucide icon name for line-art rendering. */
  iconName?: string;
  /** Color token (e.g. "axiom-rose"). */
  color: string;
  /** Instance URL for the iframe (e.g. "http://localhost:5678"). */
  instanceUrl: string;
  /** Epoch ms when the tab was opened. */
  openedAt: number;
}

// ── Workflow Projects ──────────────────────────────────────────────────────
// Represents a workflow project/instance created in any registered workflow
// engine (n8n, LangFlow, or future engines). The toolId is a string so new
// engines can be added without modifying this type — the Workflows page
// resolves the engine module dynamically via getWorkflowEngineModules().
// Projects are USER CONTENT: they belong to the user and are NEVER deleted by
// module state changes (disable/stop/uninstall only removes the runtime).

export interface WorkflowProject {
  id: string;
  name: string;
  /** Which workflow engine module this project belongs to. String (not a
   *  fixed union) so future engines register without a type change. */
  toolId: string;
  description?: string;
  /** Optional folder assignment for organization in the archive. */
  folderId?: string;
  lastModified: number;
  /** n8n workflow ID (if applicable). */
  n8nWorkflowId?: string;
  /** LangFlow flow ID (if applicable). */
  langflowFlowId?: string;
}

// ── Workflow Folders ────────────────────────────────────────────────────────
export interface WorkflowFolder {
  id: string;
  name: string;
  /** Which workflow engine module this folder belongs to (string for
   *  future-engine compatibility). */
  toolId: string;
  createdAt: number;
}

// ── Memory Graph ───────────────────────────────────────────────────────────

export type MemoryNodeKind =
  | "concept"
  | "agent"
  | "event"
  | "artifact"
  | "code"
  | "intent"
  | "datum";

export interface MemoryNode {
  id: string;
  label: string;
  kind: MemoryNodeKind;
  content: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  createdAt: number;
  folderId: string | null;
  meta?: Record<string, string | number>;
  /** User-set bookmark flag (toggled via context menu). */
  bookmarked?: boolean;
  /** Mock version-history snapshots for the "Open Version History" action. */
  versionHistory?: { ts: number; label: string; content: string }[];
}

export type MemoryEdgeKind =
  | "relates"
  | "produces"
  | "depends-on"
  | "spawned-by"
  | "consumes"
  | "executes";

export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  kind: MemoryEdgeKind;
  weight: number;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

// ── Brain folders ──────────────────────────────────────────────────────────

export interface BrainFolder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
}

// ════════════════════════════════════════════════════════════════════════════
//  Profiles — lightweight working-environment configurations
// ════════════════════════════════════════════════════════════════════════════
//
//  Profiles allow users to create different working environments while sharing
//  the SAME Workspace, Brain, Memory, and Storage. Profiles NEVER duplicate
//  data — they only control visibility, defaults, and active resources.
//
//  There is exactly ONE Global profile (id = "global") with unrestricted access
//  (empty visibility sets = everything visible). Users can create unlimited
//  custom profiles (Marketing, Coding, Graphic Novel, Music, etc.).
//
//  Profile switching is instantaneous — it only refreshes which apps/skills/
//  tools/agents/collections/projects are visible + applies preferred engine/
//  LLM/voice/agent. No files are copied, no Brain is recreated, no Memory is
//  duplicated.

export interface ProfileVisibility {
  /** Visible app IDs. Empty = all apps visible (Global behavior).
   *  When non-empty, only these apps appear in the sidebar APPS group. */
  visibleAppIds: string[];
  /** Visible skill IDs. Empty = all skills enabled. */
  visibleSkillIds: string[];
  /** Enabled tool IDs. Empty = all tools enabled. */
  visibleToolIds: string[];
  /** Enabled agent IDs. Empty = all agents available. */
  visibleAgentIds: string[];
  /** Visible brain collection (folder) IDs. Empty = all collections visible. */
  visibleFolderIds: string[];
  /** Visible project IDs. Empty = all projects visible. */
  visibleProjectIds: string[];
}

/** Profile activation configuration — the OWNED state that gets applied to the
 *  global runtime when this profile is active. Switching profiles swaps these
 *  activation sets, so each profile has its own enabled engines/agents/apps/
 *  modules/skills/tools. Data is NEVER duplicated — only the `enabled` flags
 *  on the global arrays change.
 *
 *  Empty array = unrestricted (all enabled, Global behavior). Non-empty = only
 *  the listed IDs are enabled; everything else is disabled. */
export interface ProfileConfig {
  /** Enabled runtime engine IDs (the `engines` array). Empty = all enabled. */
  enabledEngineIds: string[];
  /** Enabled LLM family IDs (the `llmFamilies` array). Empty = all enabled. */
  enabledLlmFamilyIds: string[];
  /** Enabled agent IDs (the `installedAgents` array). Empty = all enabled. */
  enabledAgentIds: string[];
  /** Enabled app IDs — user-facing apps (the `apps` array, non-infra). Empty = all enabled. */
  enabledAppIds: string[];
  /** Enabled module IDs — infra apps (Workflow Engines + AI Core). Empty = all enabled. */
  enabledModuleIds: string[];
  /** Enabled skill IDs (the `skills` array). Empty = all enabled. */
  enabledSkillIds: string[];
  /** Enabled tool IDs (the `tools` array). Empty = all enabled. */
  enabledToolIds: string[];
}

export interface ProfilePreferences {
  /** Preferred runtime engine ID (applied on profile switch). */
  preferredEngineId?: string;
  /** Preferred LLM model ID (applied on profile switch). */
  preferredModelId?: string;
  /** Preferred agent ID (applied as the default chat agent). */
  preferredAgentId?: string;
  /** Whether voice is enabled in this profile. */
  voiceEnabled?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  /** System Glyph icon name (a Lucide icon key from the System Glyph registry).
   *  Profiles use ONLY System Glyphs — no emoji. Emoji are reserved for AI
   *  Agent personalities. */
  icon: string;
  /** Color token (e.g. "axiom-cyan"). */
  color: string;
  /** Visibility sets — what's VISIBLE in the UI. Empty = unrestricted. */
  visibility: ProfileVisibility;
  /** Activation config — what's ENABLED in the runtime. Applied on switch.
   *  Empty = all enabled (Global behavior). Non-empty = only listed IDs enabled. */
  config: ProfileConfig;
  /** Preferred defaults applied on profile switch. */
  preferences: ProfilePreferences;
  /** Whether this is the permanent Global profile (cannot be deleted). */
  isGlobal: boolean;
  /** Epoch ms of creation. */
  createdAt: number;
  /** Epoch ms of last modification. */
  updatedAt: number;
}

/** The permanent Global profile. Always exists, cannot be deleted. Has
 *  unrestricted access — empty visibility sets mean everything is visible. */
export const GLOBAL_PROFILE_ID = "global";

export function createGlobalProfile(): Profile {
  return {
    id: GLOBAL_PROFILE_ID,
    name: "Global",
    icon: "Globe", // System Glyph (Lucide) — no emoji for profiles
    color: "axiom-cyan",
    visibility: {
      visibleAppIds: [],
      visibleSkillIds: [],
      visibleToolIds: [],
      visibleAgentIds: [],
      visibleFolderIds: [],
      visibleProjectIds: [],
    },
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
    isGlobal: true,
    createdAt: 0,
    updatedAt: 0,
  };
}

/** Check whether an entity ID is visible under a profile's visibility set.
 *  Empty set = unrestricted (all visible). Non-empty = only listed IDs visible. */
export function isProfileVisible(
  visibleIds: string[],
  entityId: string,
  isGlobal: boolean,
): boolean {
  if (isGlobal) return true; // Global profile = unrestricted
  if (visibleIds.length === 0) return true; // Empty set = unrestricted
  return visibleIds.includes(entityId);
}

// ── Agents ─────────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "thinking" | "executing" | "error" | "offline";

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  color: string;
  glyph: string;
  /** Shared visual identity — the single source of truth for appearance.
   *  When present, every UI reads from this object (not the legacy `color`/
   *  `glyph`/`name` fields). Legacy fields are kept for back-compat. */
  visualIdentity?: VisualIdentity;
}

export interface InstalledAgent extends AgentPersona {
  installedAt: number;
  source: "system" | "builtin" | "openclaw" | "github" | "custom";
  sourceUrl?: string;
  enabled: boolean;
  category: string;
  tokensUsed: number;
  costUsd: number;
  /** The runtime engine this agent runs on (e.g. "eng_hermes"). References
   *  the Engine configured under Infrastructure → Engines. Changing the engine
   *  configuration automatically affects every agent using it. */
  engineId?: string;
  /** The specific model selected from the runtime engine (e.g. "hermes-core"). */
  model?: string;
  /** IDs of equipped skills. */
  equippedSkills?: string[];
  /** IDs of linked Brain folders for vector memory. */
  linkedFolders?: string[];
  /** Whether this is the permanent System Agent (Axiom — System Architect).
   *  System agents cannot be disabled, deleted, or hidden by profiles. They
   *  do NOT appear in Agent Hub. They activate automatically during system-
   *  level operations (DevLab Integration, module/engine registration, storage
   *  ops, etc.). */
  isSystemAgent?: boolean;
}

/** The permanent System Agent ID. Axiom — the System Architect — is always
 *  present, always enabled, and cannot be disabled, deleted, or replaced.
 *  It does NOT appear in Agent Hub. It activates automatically during system-
 *  level operations. */
export const SYSTEM_AGENT_ID = "axiom-system";

/** The System Agent's display name. */
export const SYSTEM_AGENT_NAME = "Axiom";
export const SYSTEM_AGENT_ROLE = "System Architect";

/** System agent status — shown whenever Axiom is performing system-level work. */
export type SystemAgentStatus =
  | "idle"
  | "working"
  | "registering-module"
  | "registering-engine"
  | "registering-provider"
  | "registering-mcp"
  | "updating-registries"
  | "rebuilding-workspace"
  | "validating-dependencies"
  | "installing"
  | "analyzing-repository"
  | "migrating-storage";

/** Human-readable labels for each system agent status. */
export const SYSTEM_AGENT_STATUS_LABELS: Record<SystemAgentStatus, string> = {
  "idle": "Idle",
  "working": "Working…",
  "registering-module": "Registering module…",
  "registering-engine": "Registering engine…",
  "registering-provider": "Registering provider…",
  "registering-mcp": "Registering MCP server…",
  "updating-registries": "Updating registries…",
  "rebuilding-workspace": "Rebuilding workspace…",
  "validating-dependencies": "Validating dependencies…",
  "installing": "Installing…",
  "analyzing-repository": "Analyzing repository…",
  "migrating-storage": "Migrating storage…",
};

export interface AvailableAgent {
  id: string;
  name: string;
  description: string;
  glyph: string;
  color: string;
  category: string;
  source: string;
  sourceUrl: string;
  systemPrompt: string;
  role: string;
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: "user" | "agent" | "system";
  content: string;
  ts: number;
  pending?: boolean;
  tokens?: number;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
}

// ── VibeCode / DevLab ──────────────────────────────────────────────────────

export type VibeLanguage = "javascript" | "python" | "prompt" | "typescript" | "markdown";

export interface VibeFile {
  id: string;
  name: string;
  language: VibeLanguage;
  source: string;
  updatedAt: number;
  folder?: string;
  /** If true, this file represents a real Axiom OS source file (not a sandbox script). */
  isSystemFile?: boolean;
  /** The real on-disk path this file mirrors (for display). */
  systemPath?: string;
  /** Short description of what this system file controls. */
  description?: string;
}

export interface VibeLogEntry {
  id: string;
  ts: number;
  level: "log" | "info" | "warn" | "error" | "result" | "stdout";
  text: string;
}

// ── DevLab Workspaces (Replit-style IDE) ──────────────────────────────────
// Workspaces are fully isolated project environments. Each workspace owns
// its own file tree, Forge AI conversation history, and console logs.

export type WorkspaceType = "core-extension" | "sandboxed-app";

// ── DevLab Domains ─────────────────────────────────────────────────────────
// Two independent workspace domains. Each has its own archive, create
// action, assistant, and workspace model. They never share archives.
//
//   core  → Core Extension Archive (modify Axiom OS itself)
//   app   → App Development Archive (build standalone applications)
//
// Integrations is NOT a DevLab domain — it is a standalone system
// configuration module (like Settings or App Manager). It does not
// create workspaces; it creates IntegrationConfig entries.

export type DevLabDomain = "core" | "app";

export interface WorkspaceFile {
  id: string;
  name: string;
  language: VibeLanguage;
  source: string;
  updatedAt: number;
  /** Virtual folder path within the workspace, e.g. "src/components" */
  folderPath: string;
  /** For core-extension workspaces: mirrors the real Axiom OS system path. */
  systemPath?: string;
  /** Description for system files. */
  description?: string;
}

export interface WorkspaceMessage {
  id: string;
  role: "user" | "forge";
  content: string;
  ts: number;
  pending?: boolean;
}

export interface DevLabWorkspace {
  id: string;
  name: string;
  type: WorkspaceType;
  /** Which DevLab domain this workspace belongs to. Determines archive
   *  filtering, assistant persona, and behavior (chat vs config). */
  domain: DevLabDomain;
  /** The files belonging exclusively to this workspace. */
  files: WorkspaceFile[];
  /** The active/open file ID in this workspace's editor. */
  activeFileId: string | null;
  /** Forge AI conversation history scoped to this workspace. */
  messages: WorkspaceMessage[];
  /** Console log entries scoped to this workspace. */
  logs: VibeLogEntry[];
  createdAt: number;
  updatedAt: number;
}

// ── Integration Configuration ──────────────────────────────────────────────
// Integration workspaces are config-based, not chat-based. They store
// connection settings for external systems (GitHub, Discord, MCP, etc.).
// No conversation history, no message timeline.

export interface IntegrationConfig {
  id: string;
  name: string;
  /** What kind of integration this is (github, discord, mcp, custom-api, etc.) */
  kind: string;
  /** Connection status. */
  status: "disconnected" | "connected" | "error";
  /** Configuration key-values (API keys, URLs, tokens, etc.). */
  config: Record<string, string>;
  /** Optional description. */
  description?: string;
  /** Optional icon/glyph. */
  glyph?: string;
  createdAt: number;
  updatedAt: number;
}

// ════════════════════════════════════════════════════════════════════════════
//  DevLab Integration — Intelligent Install Pipeline
// ════════════════════════════════════════════════════════════════════════════
//  The Integration workspace is the SINGLE installation gateway for Axiom OS.
//  Instead of scattered "Import from GitHub" buttons across App Manager, Modules,
//  Engines, etc., every install flows through here.
//
//  When a repository is imported, the system analyzes its structure + deps,
//  auto-classifies it into one of the targets below, generates an install plan,
//  shows the user a confirmation, and then routes to the correct installer
//  (installApp, installModule, addEngine, addMcp, etc.).
//
//  The user never decides WHERE a repo belongs — the system decides. The user
//  only confirms.

export type InstallTarget =
  | "application"
  | "module"
  | "workflow-engine"
  | "runtime-engine"
  | "mcp-server"
  | "llm-model"
  | "skills-package"
  | "agent"
  | "tool";

export type InstallSource = "github" | "local-folder" | "zip" | "manual";

export type InstallPlanStatus =
  | "analyzing"
  | "confirming"
  | "visual-identity"
  | "reviewing"
  | "installing"
  | "installed"
  | "failed";

/** A single stage in the multi-stage repository analysis pipeline. */
export interface AnalysisStage {
  /** Stage name (e.g. "Repository Scan", "Manifest Scan"). */
  name: string;
  /** Human-readable summary of what was found. */
  detail: string;
  /** Signals discovered during this stage (e.g. "Python", "Transformers"). */
  signals: string[];
}

// ── Visual Identity ─────────────────────────────────────────────────────────
// Customizable appearance metadata for an installed subsystem. Captured
// during the install pipeline (between Confirm and Install) so the user can
// override generic defaults BEFORE the subsystem is committed.
//
// This is NOT a functional editor — it only configures how the subsystem
// appears across Axiom OS (Apps, Modules, Engines, LLM Registry, MCP Registry,
// Skills & Tools, Integration Overview).

export interface VisualIdentity {
  /** Display name (pre-filled from analyzer). */
  displayName: string;
  /** One-line description (pre-filled from analyzer). */
  description: string;
  /** Category override (pre-selected from analyzer). Free-form string so
   *  future categories don't require a type change. When the user changes
   *  this, the install target is re-routed to match (Skill → Skills Registry,
   *  Module → Modules, Application → App Manager, etc.). */
  category: string;
  /** Glyph string — the SAME canonical format used by Agent Forge and every
   *  other registry. Can be: an emoji (e.g. "🤖"), a Lucide icon name (e.g.
   *  "Bot"), or a workspace SVG path (e.g. "AI/Oracle.svg"). Rendered via
   *  <GlyphRenderer>. Selected via <AssetPicker>. */
  glyph?: string;
  /** Accent color — the SAME canonical format used by Agent Forge. Can be:
   *  a palette token (e.g. "axiom-cyan") OR a raw hex (e.g. "#00f2fe").
   *  Resolved via EXTENDED_PALETTE + isRawHexColor. Selected via the palette
   *  swatches + <ColorPickerPopover>. */
  accentColor: string;
  /** Short uppercase badge shown throughout the UI (e.g. "APP", "MCP", "LLM").
   *  Pre-filled from the detected target. */
  badge: string;
}

export interface InstallPlan {
  id: string;
  /** Where the package comes from. */
  source: InstallSource;
  /** GitHub repo URL (when source === "github"). */
  repoUrl?: string;
  /** Local path (when source === "local-folder" or "zip"). */
  localPath?: string;
  /** Display name (detected from repo name or manifest). */
  name: string;
  /** One-line description (detected from repo README or manifest). */
  description: string;
  /** The system's RECOMMENDED classification (highest score). The user may
   *  override this via `userOverride`. The effective target is
   *  `userOverride ?? detectedType`. */
  detectedType: InstallTarget;
  /** Confidence of the recommendation (derived from the top score). */
  confidence: "high" | "medium" | "low";
  /** Multi-stage analysis results — the full reasoning chain shown to the user. */
  analysisStages: AnalysisStage[];
  /** Flat analysis log (back-compat; populated from analysisStages). */
  analysisSteps: string[];
  /** All signals detected across all stages (union of stage signals). */
  detectedSignals: string[];
  /** Manifest files found (package.json, pyproject.toml, config.json, etc.). */
  manifests: string[];
  /** Detected primary language (Python, TypeScript, etc.). */
  language: string;
  /** Confidence scores (0-100) for EVERY InstallTarget. Sums to ~100.
   *  Exposed so the user can see the full reasoning, not just the winner. */
  scores: Record<InstallTarget, number>;
  /** Detected dependencies (npm packages, python deps, docker, etc.). */
  dependencies: string[];
  /** If the user overrode the recommendation, the override. null = use detectedType. */
  userOverride: InstallTarget | null;
  /** Human-readable description of what will happen on install. */
  installAction: string;
  /** Current pipeline status. */
  status: InstallPlanStatus;
  /** Epoch ms when the plan was created. */
  createdAt: number;
  /** Optional error message when status === "failed". */
  error?: string;
  /** Visual identity suggested by the analyzer (icon, color, badge, category).
   *  Pre-filled from detected signals; the user can override before install.
   *  When the user enters the "visual-identity" step, this object is updated
   *  with their customizations and then passed to the installer. */
  visualIdentity?: VisualIdentity;
}

// ── Terminal ───────────────────────────────────────────────────────────────

export interface TerminalLine {
  id: string;
  ts: number;
  kind: "input" | "output" | "system" | "error";
  text: string;
}

// ── System telemetry ───────────────────────────────────────────────────────

export interface TelemetrySample {
  ts: number;
  cpu: number;
  mem: number;
  net: number;
  agents: number;
}

// ── Skills & Tools ─────────────────────────────────────────────────────────

/**
 * A Skill is a modular, reusable package of instructions that teaches an AI
 * agent how to perform a specific task or adopt a specialized role. Rather than
 * relying on the model to "figure out" a workflow, a skill provides explicit,
 * step-by-step instructions to ensure consistent, high-quality results.
 */
export interface SkillParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: string | number | boolean | null;
}

export interface Skill {
  id: string;
  name: string;
  /** One-line summary shown on cards. */
  description: string;
  /** Full markdown instructions the agent receives when this skill is invoked. */
  instructions: string;
  /** Longer "what does this actually do?" explanation, optional. */
  longDescription?: string;
  category: string;
  tags: string[];
  enabled: boolean;
  source: "builtin" | "custom" | "mcp";
  glyph: string;
  /** Shared visual identity — single source of truth for appearance. */
  visualIdentity?: VisualIdentity;
  invoked: number;
  author?: string;
  version?: string;
  createdAt: number;
  updatedAt?: number;
  parameters: SkillParameter[];
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: string;
}

export interface Tool {
  id: string;
  name: string;
  /** One-line summary shown on cards. */
  description: string;
  /** Full usage documentation — how to call it, what it returns, examples. */
  instructions: string;
  category: string;
  tags: string[];
  enabled: boolean;
  source: "builtin" | "mcp" | "custom";
  /** Shared visual identity — single source of truth for appearance. */
  visualIdentity?: VisualIdentity;
  /** For network tools: the HTTP endpoint or stdio command. */
  endpoint?: string;
  /** HTTP method if endpoint is set. */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "WS" | "STDIO";
  /** Whether auth/API key is required. */
  authRequired?: boolean;
  glyph: string;
  invoked: number;
  author?: string;
  version?: string;
  createdAt: number;
  updatedAt?: number;
  parameters: ToolParameter[];
  /** Sample return value or shape, as a string. */
  returns?: string;
}

// ── Apps ───────────────────────────────────────────────────────────────────

export interface InstalledApp {
  id: string;
  name: string;
  description: string;
  source: "vibecode" | "github" | "builtin";
  /** Shared visual identity — single source of truth for appearance.
   *  When present, every UI reads from this object (not legacy glyph/color/iconName). */
  visualIdentity?: VisualIdentity;
  sourceUrl?: string;
  installedAt: number;
  enabled: boolean;
  glyph: string;
  color: string;
  code?: string;
  running: boolean;
  category: string;
  /** For DevLab-published apps: the workspace this app was registered from.
   *  Used to prevent double-publishing the same workspace as separate apps.
   *  Apps and Modules are distinct asset types — a DevLab publish registers
   *  ONLY an App (never a Module), so this field lives on the App, not in the
   *  module registry. */
  workspaceId?: string;
  /** For server-style apps (n8n, LangFlow, etc.): the default port. */
  port?: number;
  /** If this app backs a Workflow Lab pipeline tool, the tool id (e.g. "n8n"). */
  workflowEngineId?: string;
  /** Whether the app's local server is currently connected. */
  connected?: boolean;
  /** Optional GitHub repo URL (separate from sourceUrl for clarity). */
  repoUrl?: string;
  /** Install state: "ready" = not yet installed, "installed" = ready to connect,
   *  "core" = built-in, "installing" = agentic installer dispatched (temp loading card). */
  installState?: "ready" | "installed" | "core" | "installing";
  /** Live/staging sandbox URL for integrated apps that run inside the Axiom OS
   *  viewport as a keep-alive tab (e.g. a Vercel deployment). When set, the
   *  InstalledAppRunner renders this URL in a sandboxed iframe as a native
   *  route — no separate window. Agents can read layout params + navigate the
   *  view stack in-process. */
  liveUrl?: string;
  /** Instance Connection URL for backend infrastructure modules (n8n, LangFlow,
   *  OpenJarvis Core, etc.). The endpoint Axiom OS routes background workflow
   *  requests to when the module is toggled active. Defaults to
   *  http://localhost:{port}. Editable via the Modules page config modal. */
  instanceUrl?: string;
  /** Lucide icon name for minimalist line-art rendering in the sidebar APPS
   *  group + Apps grid (replaces emoji glyphs to match the Axiom OS design
   *  system). Falls back to a default icon when unset. */
  iconName?: string;

  /** ── Module runtime state (Infrastructure → Modules ↔ Workspace → Workflows) ──
   *  The single source of truth connecting the Modules page (system config) and
   *  the Workflows page (user workspace). Both pages read this state so they
   *  always render the same engine status.
   *
   *  States:
   *  • "active"  — enabled + connected; workflow projects can be opened + created.
   *  • "standby" — enabled but the runtime hasn't connected yet; browse-only.
   *  • "offline" — deliberately disabled/stopped by the user; Open disabled.
   *  • "error"   — the engine reported an error; Open disabled, show error.
   *
   *  When unset, `getModuleState()` derives it from enabled/connected for
   *  back-compat with seeded apps. `setModuleActive` / `setModuleError` write
   *  this field explicitly so the two pages stay in sync. */
  moduleState?: "active" | "standby" | "offline" | "error";

  /** Optional error message shown when `moduleState === "error"`.
   *  Setting this flips the module to the error state; clearing it (via
   *  `setModuleError(id, undefined)`) re-derives the state from enabled/connected. */
  moduleError?: string;

  /** ── Module-owned runtime metadata ──
   *  Modules own ALL runtime information. The Workflows page never duplicates
   *  these — it reads them from the module record via getWorkflowEngineModules().
   *
   *  • moduleVersion  — the engine's installed version (e.g. "1.62.0")
   *  • moduleProvider — who distributes the engine (e.g. "n8n GmbH", "LangFlow Inc.")
   *  • moduleHealth   — last health-check status ("healthy" | "degraded" | "unreachable")
   *                     Reflects whether the runtime endpoint actually responds, not
   *                     just whether the module is enabled. Set by health probes.
   *  • projectUrlPattern — for workflow-engine modules: the path pattern appended to
   *                     instanceUrl to open a specific project in the iframe. The
   *                     pattern uses `{id}` as a placeholder for the engine-side
   *                     project/flow id (e.g. "/workflow/{id}" for n8n, "/flow/{id}"
   *                     for LangFlow). Engine-specific routing lives on the module
   *                     so the store + Workflows page stay engine-agnostic. */
  moduleVersion?: string;
  moduleProvider?: string;
  moduleHealth?: "healthy" | "degraded" | "unreachable";
  projectUrlPattern?: string;
}

// ── Module state helper ────────────────────────────────────────────────────
// Resolves the effective module runtime state for an InstalledApp. This is the
// single function both ModulesPage and WorkflowsPage use to read engine status,
// guaranteeing they always agree. Projects are NEVER deleted by state changes —
// disabling/stopping a module only flips its state; workflowProjects persist.

export type ModuleRuntimeState = "active" | "standby" | "offline" | "error";

export function getModuleState(app: InstalledApp): ModuleRuntimeState {
  // Error takes precedence — once set, the module stays in error until cleared.
  if (app.moduleError) return "error";
  // Explicit moduleState wins when present (set by setModuleActive / setModuleError).
  if (app.moduleState) return app.moduleState;
  // Back-compat derivation for seeded/legacy apps without an explicit moduleState.
  if (app.enabled && app.connected) return "active";
  if (app.enabled && !app.connected) return "standby";
  return "offline";
}

// ════════════════════════════════════════════════════════════════════════════
//  Workflow Engine Module — the shared architecture contract
// ════════════════════════════════════════════════════════════════════════════
//  Infrastructure → Modules is the single source of truth for every workflow
//  engine. Workspace → Workflows is ONLY the user-facing workspace built on top
//  of those modules — it never owns runtime state itself.
//
//  `getWorkflowEngineModules(apps)` derives the canonical list of registered
//  workflow engines from the apps array. The Workflows page consumes this list
//  so that adding a new engine only requires registering another module (an
//  InstalledApp with `category: "Workflow Engine"` + a `workflowEngineId`) —
//  NO changes to the Workflows page are needed.
//
//  The module record carries ALL runtime information (state, version, provider,
//  health, endpoint, color, icon). The Workflows page reads these fields from
//  the module and never duplicates them in its own constants.
//
//  Projects/tabs/folders are USER CONTENT — they live on the store
//  (workflowProjects, openWorkflowTabs, workflowFolders) and are NEVER deleted
//  by module state changes. Disabling/stopping/uninstalling a module only
//  removes the runtime; when the module becomes available again, every
//  previous project immediately becomes usable again.

export interface WorkflowEngineModule {
  /** The InstalledApp backing this engine module (full record). Modules own
   *  their full state; the Workflows page reads through to this record. */
  app: InstalledApp;
  /** Stable engine id (=== app.workflowEngineId). Used as the toolId on
   *  WorkflowProject / WorkflowFolder / WorkflowTab. */
  engineId: string;
  /** Display name (from app.name). */
  name: string;
  /** Description (from app.description). */
  description: string;
  /** Accent color token (from app.color). Used for badges, accent bars, filters. */
  color: string;
  /** Lucide icon name (from app.iconName). Falls back to a default. */
  iconName?: string;
  /** Instance URL the iframe loads (from app.instanceUrl, falling back to
   *  http://localhost:{port}). Owned by the module — the Workflows page
   *  never hardcodes endpoints. */
  instanceUrl: string;
  /** Effective runtime state (via getModuleState). The Workflows page reads
   *  this from the module so it never duplicates status logic. */
  state: ModuleRuntimeState;
  /** Optional error message (from app.moduleError). */
  moduleError?: string;
  /** Engine version (from app.moduleVersion). */
  version?: string;
  /** Provider (from app.moduleProvider). */
  provider?: string;
  /** Health status (from app.moduleHealth). */
  health?: "healthy" | "degraded" | "unreachable";
  /** Engine-specific project URL pattern (from app.projectUrlPattern).
   *  `{id}` is interpolated with the engine-side project/flow id. The store
   *  uses this to build per-project iframe URLs without hardcoding engine ids. */
  projectUrlPattern?: string;
}

/** Default Lucide icon name when a module doesn't specify iconName. */
export const DEFAULT_WORKFLOW_ENGINE_ICON = "Workflow";

/** Derive the canonical list of registered workflow-engine modules from the
 *  apps array. This is the single function the Workflows page (and any other
 *  consumer) calls to discover engines — adding a new engine only requires
 *  registering an InstalledApp with `category: "Workflow Engine"` + a unique
 *  `workflowEngineId`. Order is preserved from the apps array (seed order). */
export function getWorkflowEngineModules(apps: InstalledApp[]): WorkflowEngineModule[] {
  return apps
    .filter((a) => a.category === "Workflow Engine" && a.workflowEngineId)
    .map((app) => ({
      app,
      engineId: app.workflowEngineId as string,
      name: app.name,
      description: app.description,
      color: app.color,
      iconName: app.iconName,
      instanceUrl:
        app.instanceUrl ??
        (app.port ? `http://localhost:${app.port}` : ""),
      state: getModuleState(app),
      moduleError: app.moduleError,
      version: app.moduleVersion,
      provider: app.moduleProvider,
      health: app.moduleHealth,
      projectUrlPattern: app.projectUrlPattern,
    }));
}

// ── Published Apps (DevLab → Global Apps Layer) ──────────────────────────
// When a DevLab workspace is published, it produces a manifest that lives in
// the global Apps repository. Integrated modules inject sidebar nav entries;
// external standalones open in sandboxed iframe overlays.

export type PublishedAppBlueprint = "integrated" | "external";

export interface PublishedAppCompiledFile {
  name: string;
  language: VibeLanguage;
  source: string;
}

export interface PublishedApp {
  id: string;
  /** The DevLab workspace this was published from. */
  workspaceId: string;
  /** Human-readable module name. */
  name: string;
  /** Multi-line description (may contain markdown). */
  description: string;
  /** Deployment blueprint selected at publish time. */
  blueprint: PublishedAppBlueprint;
  /** Whether this module is enabled (sidebar-visible for integrated). */
  enabled: boolean;
  /** For integrated modules: the compiled file bundle snapshot. */
  compiledFiles: PublishedAppCompiledFile[];
  /** For external standalones: the production live URL (Vercel, Netlify, custom, etc.). */
  url?: string;
  /** GitHub repository URL pushed during publish. */
  githubRepoUrl?: string;
  /** Custom glyph icon (emoji) for visual branding. */
  glyph?: string;
  /** Accent color token (e.g. "axiom-cyan") or hex string for custom. */
  color?: string;
  /** Whether the color is a custom hex (not a palette token). */
  customColor?: boolean;
  createdAt: number;
  updatedAt: number;
}

// ── Integrations ───────────────────────────────────────────────────────────

export type IntegrationKind = "agent" | "app" | "tool" | "llm" | "mcp" | "skill";

export interface Integration {
  id: string;
  name: string;
  kind: IntegrationKind;
  enabled: boolean;
  status: "active" | "idle" | "error" | "disabled";
  description: string;
  category: string;
  lastUsed?: number;
  glyph: string;
  color: string;
}

// ── LLM Providers (Settings) ───────────────────────────────────────────────

export interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number; // USD
  costPer1kOutput: number; // USD
  capabilities: string[];
}

export interface LLMProvider {
  id: string;
  name: string;
  glyph: string;
  color: string;
  apiBase: string;
  apiKey: string;
  enabled: boolean;
  connected: boolean;
  models: LLMModel[];
  defaultModelId?: string;
}

// ── MCP Servers ────────────────────────────────────────────────────────────

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  connected: boolean;
  tools: string[];
  description?: string;
  /** Shared visual identity — single source of truth for appearance. */
  visualIdentity?: VisualIdentity;
  /** Glyph string (same canonical format as Agent Forge — emoji, Lucide name,
   *  or workspace SVG path). Backfilled from VisualIdentity during install. */
  glyph?: string;
  /** Accent color (palette token or raw hex — same as Agent Forge). */
  color?: string;
  /** Short uppercase badge (e.g. "MCP"). */
  badge?: string;
  /** Category label (e.g. "MCP Server"). */
  category?: string;
}

// ── Engines ────────────────────────────────────────────────────────────────
// Engines are the technical control center for AI models and backends.
// Each engine card shows live status, an API address input, and action buttons.

export type EngineStatus = "active" | "connected" | "standby" | "error" | "disabled";
export type EngineKind = "autonomous" | "gateway" | "local-llm" | "code-completion" | "cloud-orchestration" | "code-synthesis" | "reasoning" | "inference-api" | "code-review" | "web-search" | "custom";

export interface Engine {
  id: string;
  name: string;
  /** Short tagline shown under the name, e.g. "Autonomous Learning & Scripting". */
  type: string;
  /** Longer description shown in the settings modal. */
  description: string;
  /** Shared visual identity — single source of truth for appearance. */
  visualIdentity?: VisualIdentity;
  kind: EngineKind;
  status: EngineStatus;
  /** Where the engine runs: "Local" for in-process, "API" for remote, "Hybrid" for both. */
  location: "Local" | "API" | "Hybrid";
  /** User-editable endpoint URL. */
  apiAddress: string;
  /** Default/seed endpoint, used by the "reset" button. */
  defaultApiAddress: string;
  /** Whether the user has explicitly enabled this engine. */
  enabled: boolean;
  /** Last connection-test result. */
  lastTestedAt?: number;
  lastTestOk?: boolean;
  /** Glyph/icon character. */
  glyph: string;
  /** Color theme (tailwind class fragment, e.g. "axiom-cyan"). */
  color: string;
  /** Optional: which models this engine exposes. */
  models?: string[];
  /** Optional: extra config key/values shown in the settings modal. */
  config?: Record<string, string>;
  createdAt: number;
}

// ── Activity log ───────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  ts: number;
  kind: "agent" | "memory" | "vibecode" | "app" | "system" | "integration" | "workflow";
  text: string;
  severity: "info" | "success" | "warn" | "error";
}

// ── Workflows ──────────────────────────────────────────────────────────────
// Dynamic, interactive pipeline builder. Each workflow is a sequence of steps,
// each step assigns an agent + a task prompt + an output destination.

export type WorkflowStepOutput =
  | "pass-to-next"
  | "export-file"
  | "save-to-graph"
  | "send-notification"
  | "terminal-print";

export type WorkflowStepStatus = "idle" | "running" | "done" | "error";

export interface WorkflowStep {
  id: string;
  /** Which installed agent persona runs this step. Matches agent.id or "oracle" etc. */
  agentId: string | null;
  /** The task prompt for the agent. */
  task: string;
  /** Where the agent's output goes. */
  output: WorkflowStepOutput;
  /** Optional label shown in the UI; defaults to "Step N". */
  label?: string;
  /** Runtime state — set when the pipeline is running. */
  status?: WorkflowStepStatus;
  /** Runtime: the agent's reply for this step (set after execution). */
  result?: string;
  /** Runtime: error message if status === "error". */
  error?: string;
}

export type WorkflowRunStatus = "idle" | "running" | "done" | "error";

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt?: number;
  /** Runtime state for the whole pipeline. */
  runStatus?: WorkflowRunStatus;
  /** When the pipeline was last run. */
  lastRunAt?: number;
}

// ── Unified Chat History ───────────────────────────────────────────────────
// A unified archive of chat sessions across Home, Agent Hub, and DevLab.
// Sessions can be grouped into project folders.

export type ChatSessionSource = "home" | "agent-hub" | "devlab" | "workflows";

export interface ChatMessageUnified {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  /** Which engine/agent produced this message (if assistant). */
  source?: string;
  /** Whether this message is still being generated (pending reply). */
  pending?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  source: ChatSessionSource;
  /** Project folder id this session belongs to (null = unfiled). */
  projectId: string | null;
  messages: ChatMessageUnified[];
  createdAt: number;
  updatedAt: number;
  /** Preview text (first user message or generated title). */
  preview?: string;
  /** Optional: which engine was active (for Home sessions). */
  engineId?: string;
  /** Optional: which agent was active (for Agent Hub sessions). */
  agentId?: string;
  /** True if the user manually renamed this session. Auto-generated titles
   *  never overwrite a manually-set title. */
  manuallyRenamed?: boolean;
  /** True if an auto-title has already been generated. Prevents repeated
   *  LLM calls to rename the same session. */
  autoTitled?: boolean;
}

export interface ChatProject {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  /** Which view owns this project folder (for isolation). */
  source: ChatSessionSource;
}

// ── Agent Councils (Multi-Agent Group Chat) ────────────────────────────────

export interface CouncilMessage {
  id: string;
  /** Which agent posted this message (agentId). "user" for the human. */
  agentId: string;
  /** Display name of the agent at time of posting. */
  agentName: string;
  /** Role of the agent at time of posting. */
  agentRole: string;
  /** Glyph of the agent. */
  agentGlyph: string;
  /** Color of the agent. */
  agentColor: string;
  content: string;
  ts: number;
  pending?: boolean;
}

export interface AgentCouncil {
  id: string;
  name: string;
  /** The moderating lead agent (orchestrator/judge). */
  orchestratorId: string;
  /** All participating agent IDs (including orchestrator). */
  memberIds: string[];
  messages: CouncilMessage[];
  createdAt: number;
  updatedAt: number;
}

// ── LLM Registry (Model Families) ─────────────────────────────────────────
// A separate management layer from developmental coding engines.
// Each family groups multiple model variants with independent toggle states.

export type LLMModelTier = "flagship" | "standard" | "lightweight" | "specialized";

export interface LLMModelEntry {
  id: string;
  /** Display name, e.g. "GPT-4o" */
  name: string;
  /** Model identifier used in API calls, e.g. "gpt-4o-2024-08-06" */
  modelId: string;
  /** Context window size in tokens. */
  contextWindow: number;
  /** Cost per 1k input tokens (USD). */
  costPer1kInput: number;
  /** Cost per 1k output tokens (USD). */
  costPer1kOutput: number;
  /** Capability tags: "chat", "vision", "code", "reasoning", "json-mode", "function-calling" */
  capabilities: string[];
  /** Whether this specific model is enabled. */
  enabled: boolean;
  /** Tier classification for fallback routing. */
  tier: LLMModelTier;
  /** Brief description. */
  description: string;
}

export interface LLMFamily {
  id: string;
  /** Provider/family name, e.g. "OpenAI" */
  name: string;
  /** One-line tagline. */
  tagline: string;
  /** Description shown in settings. */
  description: string;
  /** Glyph icon. */
  glyph: string;
  /** Color theme (tailwind class fragment). */
  color: string;
  /** API base URL. */
  apiBase: string;
  /** Environment variable / key name for the API key. */
  apiKeyVar: string;
  /** Stored API key value (masked in UI). */
  apiKey: string;
  /** Whether the entire family is enabled. */
  enabled: boolean;
  /** Whether the API key has been validated. */
  keyValidated: boolean;
  /** Last validation timestamp. */
  lastValidatedAt?: number;
  /** All models in this family. */
  models: LLMModelEntry[];
  /** Default model ID when a model isn't explicitly specified. */
  defaultModelId?: string;
  /** Fallback priority order (lower = tried first on failure). */
  fallbackPriority: number;
  createdAt: number;
  /** Shared visual identity — single source of truth for appearance. */
  visualIdentity?: VisualIdentity;
  /** Short uppercase badge (e.g. "LLM"). Backfilled from VisualIdentity. */
  badge?: string;
  /** Category label (e.g. "LLM Provider"). Backfilled from VisualIdentity. */
  category?: string;
}

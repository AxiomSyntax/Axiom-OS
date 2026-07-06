"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { IntegrationConfig, InstallPlan, InstallTarget, VisualIdentity } from "@/lib/axiom/types";
import { ALL_TARGETS } from "@/lib/axiom/analyzer";
import {
  Bot,
  AppWindow,
  Wrench,
  Server,
  Plug,
  Zap,
  Search,
  Settings,
  Activity,
  Clock,
  AlertTriangle,
  Ban,
  LayoutGrid,
  Signal,
  Github,
  FolderOpen,
  FolderArchive,
  Package,
  Box,
  Cpu,
  ArrowRight,
  AlertCircle,
  Check,
  Loader2,
  Wand2,
  Key,
  Link2,
  Unplug,
  Trash2,
  Eye,
  Palette,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RenameableText } from "../RenameableText";
import { getGlyph, getAccentColor, getDisplayName, getDescription } from "@/lib/axiom/visual-identity";
import { AssetPicker } from "../AssetPicker";
import { ColorPickerPopover } from "../ColorPickerPopover";
import { GlyphRenderer } from "@/lib/axiom/icons/registry";
import { EXTENDED_PALETTE, isRawHexColor, validateHex, type AccentColor } from "@/lib/axiom/forge-auto";
import { TARGET_VISUAL_DEFAULTS, CATEGORY_TO_TARGET } from "@/lib/axiom/analyzer";

// ════════════════════════════════════════════════════════════════════════════
//  Integrations — System Configuration Module
//
//  This is NOT a DevLab workspace. It is a standalone system module (like
//  Settings or App Manager). It does not create workspaces, chats, or
//  projects. It creates IntegrationConfig entries — persistent system objects
//  that represent connections to external systems (GitHub, Discord, Obsidian,
//  Google Drive, MCP servers, LLM providers, runtime engines).
//
//  The page has two sections:
//    1. Configuration — Quick Connect + ConfigCards for integrationConfigs
//    2. Install Pipeline — import repos / packages and route to installers
//    3. Connected Subsystems — live health monitor for installed agents,
//       apps, tools, skills, providers, MCPs (read-only overview)
// ════════════════════════════════════════════════════════════════════════════

// ── Subsystem status config ─────────────────────────────────────────────────
// Used by the Installed Subsystems grid (each card shows a status badge).

type SubsystemRegistry =
  | "agents"
  | "apps"
  | "modules"
  | "skills"
  | "tools"
  | "runtime-engines"
  | "workflow-engines"
  | "llm-registry"
  | "mcp-registry";

// Group by Infrastructure category (registry) — each category only contains
// its own subsystem type. Never mixes. Skills and Tools are SEPARATE
// registries (the "Skills & Tools" page is only a combined workspace view,
// not a shared registry). Module-level constant (stable reference).
const SUBSYSTEM_GROUPS: { registry: SubsystemRegistry; label: string; icon: typeof Bot; color: string }[] = [
  { registry: "agents", label: "Agents", icon: Bot, color: "text-axiom-emerald" },
  { registry: "apps", label: "Applications", icon: AppWindow, color: "text-axiom-amber" },
  { registry: "modules", label: "Modules", icon: Box, color: "text-axiom-cyan" },
  { registry: "skills", label: "Skills", icon: Zap, color: "text-axiom-emerald" },
  { registry: "tools", label: "Tools", icon: Wrench, color: "text-axiom-cyan" },
  { registry: "runtime-engines", label: "Runtime Engines", icon: Cpu, color: "text-axiom-amber" },
  { registry: "workflow-engines", label: "Workflow Engines", icon: Zap, color: "text-axiom-rose" },
  { registry: "llm-registry", label: "LLM Providers", icon: Server, color: "text-axiom-violet" },
  { registry: "mcp-registry", label: "MCP Servers", icon: Plug, color: "text-axiom-violet" },
];

const STATUS_CONFIG: Record<
  "active" | "idle" | "error" | "disabled",
  {
    dot: string;
    bg: string;
    text: string;
    border: string;
    label: string;
    pulse: boolean;
  }
> = {
  active: {
    dot: "bg-axiom-emerald",
    bg: "bg-axiom-emerald/10",
    text: "text-axiom-emerald",
    border: "border-axiom-emerald/30",
    label: "Active",
    pulse: true,
  },
  idle: {
    dot: "bg-axiom-amber",
    bg: "bg-axiom-amber/10",
    text: "text-axiom-amber",
    border: "border-axiom-amber/30",
    label: "Idle",
    pulse: false,
  },
  error: {
    dot: "bg-axiom-rose",
    bg: "bg-axiom-rose/10",
    text: "text-axiom-rose",
    border: "border-axiom-rose/30",
    label: "Error",
    pulse: false,
  },
  disabled: {
    dot: "bg-axiom-dim",
    bg: "bg-axiom-panel/40",
    text: "text-axiom-dim",
    border: "border-axiom-edge/30",
    label: "Disabled",
    pulse: false,
  },
};

// ── Health Stat Pill ─────────────────────────────────────────────────────────

function HealthPill({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-axiom-edge/40 bg-axiom-panel/50">
      <Icon className="w-3.5 h-3.5 text-axiom-dim" />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider text-axiom-dim">
          {label}
        </span>
        <span className={cn("text-sm font-semibold tabular-nums", valueColor)}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Configuration Card — contextual config panel for a connected integration.
//  Renders kind-specific fields (GitHub, MCP, Runtime, Provider, Discord,
//  Obsidian, etc.). NO chat interface — purely a configuration form.
// ════════════════════════════════════════════════════════════════════════════

type ConfigField =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "password"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "textarea"; placeholder?: string };

interface ConfigSchema {
  icon: typeof Server;
  color: string;
  fields: ConfigField[];
  /** Whether to show a Test Connection button. Defaults to true. */
  testable?: boolean;
}

const CONFIG_SCHEMA: Record<string, ConfigSchema> = {
  // GitHub — repository information, authentication, branch, install destination
  github: {
    icon: Github,
    color: "axiom-violet",
    testable: true,
    fields: [
      { key: "repo", label: "Repository", type: "text", placeholder: "owner/repo" },
      { key: "token", label: "Authentication", type: "password", placeholder: "ghp_..." },
      { key: "branch", label: "Branch", type: "text", placeholder: "main" },
      { key: "destination", label: "Install Destination", type: "text", placeholder: "/axiom/integrations/github" },
    ],
  },
  // Discord — bot token, server id
  discord: {
    icon: Plug,
    color: "axiom-rose",
    testable: true,
    fields: [
      { key: "bot_token", label: "Bot Token", type: "password", placeholder: "MTk4N..." },
      { key: "server_id", label: "Server ID", type: "text", placeholder: "123456789012345678" },
    ],
  },
  // Obsidian — vault path
  obsidian: {
    icon: FolderOpen,
    color: "axiom-violet",
    testable: false,
    fields: [
      { key: "vault_path", label: "Vault Path", type: "text", placeholder: "/home/user/Vault" },
    ],
  },
  // Google Drive — credentials JSON path, root folder
  "google-drive": {
    icon: FolderArchive,
    color: "axiom-cyan",
    testable: true,
    fields: [
      { key: "credentials_path", label: "Credentials JSON", type: "text", placeholder: "/path/to/credentials.json" },
      { key: "root_folder", label: "Root Folder ID", type: "text", placeholder: "root" },
    ],
  },
  // MCP — server status, endpoint, transport, capabilities
  mcp: {
    icon: Plug,
    color: "axiom-violet",
    testable: true,
    fields: [
      { key: "endpoint", label: "Endpoint", type: "text", placeholder: "http://localhost:3001" },
      { key: "transport", label: "Transport", type: "select", options: ["stdio", "sse", "http"] },
      { key: "capabilities", label: "Capabilities", type: "text", placeholder: "tools,resources,prompts" },
    ],
  },
  // Runtime — installed, version, gpu, memory, status
  runtime: {
    icon: Cpu,
    color: "axiom-amber",
    testable: false,
    fields: [
      { key: "version", label: "Version", type: "text", placeholder: "0.1.0" },
      { key: "gpu", label: "GPU", type: "text", placeholder: "auto-detect" },
      { key: "memory", label: "Memory", type: "text", placeholder: "4 GB" },
    ],
  },
  // Provider — API key, model, endpoint, connection test
  provider: {
    icon: Server,
    color: "axiom-cyan",
    testable: true,
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "sk-..." },
      { key: "model", label: "Model", type: "text", placeholder: "gpt-4o-mini" },
      { key: "endpoint", label: "Endpoint", type: "text", placeholder: "https://api.openai.com/v1" },
    ],
  },
};

function ConfigCard({
  config,
  onUpdate,
  onDelete,
}: {
  config: IntegrationConfig;
  onUpdate: (patch: Partial<IntegrationConfig>) => void;
  onDelete: () => void;
}) {
  const schema = CONFIG_SCHEMA[config.kind] ?? {
    icon: Settings,
    color: "axiom-dim",
    testable: false,
    fields: [
      { key: "value", label: "Value", type: "text" as const, placeholder: "" },
    ],
  };
  const Icon = schema.icon;
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  const setField = (key: string, value: string) => {
    onUpdate({ config: { ...config.config, [key]: value } });
  };

  const handleTest = () => {
    setTesting(true);
    onUpdate({ status: "disconnected" });
    // Simulate connection test latency
    setTimeout(() => {
      // Simple validation: if any required text/password field is empty, mark as error
      const hasEmpty = schema.fields
        .filter((f) => f.type === "text" || f.type === "password" || f.type === "textarea")
        .some((f) => !config.config[f.key]);
      onUpdate({ status: hasEmpty ? "error" : "connected" });
      setTesting(false);
    }, 800);
  };

  const statusBadge = config.status === "connected" ? (
    <span className="text-[9px] px-2 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald border border-axiom-emerald/30 flex items-center gap-1 shrink-0">
      <Check className="w-2.5 h-2.5" /> Connected
    </span>
  ) : config.status === "error" ? (
    <span className="text-[9px] px-2 py-0.5 rounded-full bg-axiom-rose/15 text-axiom-rose border border-axiom-rose/30 flex items-center gap-1 shrink-0">
      <AlertCircle className="w-2.5 h-2.5" /> Error
    </span>
  ) : (
    <span className="text-[9px] px-2 py-0.5 rounded-full bg-axiom-panel/40 text-axiom-dim border border-axiom-edge/40 flex items-center gap-1 shrink-0">
      <Unplug className="w-2.5 h-2.5" /> Disconnected
    </span>
  );

  return (
    <div className="p-4 rounded-xl border border-axiom-edge/40 bg-axiom-panel/60 axiom-hover-lift">
      {/* ── Header ── */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center border shrink-0", `bg-${schema.color}/10 border-${schema.color}/30 text-${schema.color}`)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Rename via RenameableText: double-click or right-click → Rename.
              Enter = Save, Escape = Cancel, blur = Save. Same behavior as
              every other archive in Axiom OS. */}
          <RenameableText
            value={config.name}
            onSave={(newName) => onUpdate({ name: newName })}
            className="text-sm font-medium text-axiom-text"
            inputClassName="text-sm font-medium"
          />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border", `border-${schema.color}/30 text-${schema.color}/80`)}>
              {config.kind}
            </span>
            {config.description && (
              <span className="text-[10px] text-axiom-dim truncate">{config.description}</span>
            )}
          </div>
        </div>
        {statusBadge}
        <button
          onClick={onDelete}
          className="text-axiom-dim hover:text-axiom-rose transition-colors shrink-0 p-1 rounded hover:bg-axiom-rose/10"
          title="Remove configuration"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Fields ── */}
      <div className="space-y-2">
        {schema.fields.map((field) => (
          <div key={field.key} className="grid grid-cols-[120px_1fr] gap-2 items-center">
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">
              {field.label}
            </label>
            <div className="flex items-center gap-1">
              {field.type === "text" && (
                <input
                  type="text"
                  value={config.config[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors"
                />
              )}
              {field.type === "password" && (
                <>
                  <input
                    type={showSecret[field.key] ? "text" : "password"}
                    value={config.config[field.key] ?? ""}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((s) => ({ ...s, [field.key]: !s[field.key] }))}
                    className="text-axiom-dim hover:text-axiom-cyan p-1 rounded transition-colors"
                    title={showSecret[field.key] ? "Hide" : "Show"}
                  >
                    {showSecret[field.key] ? <Eye className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                  </button>
                </>
              )}
              {field.type === "select" && (
                <select
                  value={config.config[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/40 transition-colors"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt} className="bg-axiom-deep text-axiom-text">
                      {opt}
                    </option>
                  ))}
                </select>
              )}
              {field.type === "textarea" && (
                <textarea
                  value={config.config[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors resize-y"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-axiom-edge/30">
        <span className="text-[9px] text-axiom-dim/50">
          Updated {new Date(config.updatedAt).toLocaleTimeString()}
        </span>
        <div className="flex items-center gap-1.5">
          {schema.testable !== false && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-2.5 py-1 rounded text-[10px] font-medium border bg-axiom-cyan/10 border-axiom-cyan/30 text-axiom-cyan hover:bg-axiom-cyan/20 flex items-center gap-1 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {testing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Link2 className="w-2.5 h-2.5" />}
              {testing ? "Testing…" : "Test Connection"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Install Plan Card — analysis cards / install reports / validation results
//  This is the System Architect's output (NOT a chat conversation).
// ════════════════════════════════════════════════════════════════════════════

function InstallPlanCard({
  plan,
  onConfirm,
  onDismiss,
  onProceedToVisualIdentity,
  onSetVisualIdentity,
  onProceedToReview,
  onBackToVisualIdentity,
}: {
  plan: InstallPlan;
  onConfirm: () => void;
  onDismiss: () => void;
  onProceedToVisualIdentity: () => void;
  onSetVisualIdentity: (patch: Partial<VisualIdentity>) => void;
  onProceedToReview: () => void;
  onBackToVisualIdentity: () => void;
}) {
  const effectiveTarget: InstallTarget = plan.userOverride ?? plan.detectedType;
  const topScore = plan.scores[plan.detectedType];

  const confidenceColor =
    plan.confidence === "high" ? "text-axiom-emerald" :
    plan.confidence === "medium" ? "text-axiom-amber" :
    "text-axiom-rose";

  const typeIcons: Record<string, typeof Package> = {
    "application": Package,
    "module": Box,
    "workflow-engine": Zap,
    "runtime-engine": Cpu,
    "mcp-server": Plug,
    "llm-model": Server,
    "skills-package": Wand2,
    "agent": Bot,
    "tool": Wrench,
  };
  const TypeIcon = typeIcons[effectiveTarget] ?? Package;

  // Classification confidence scores for ALL targets (shown as bars in the
  // confirming state). These explain WHY Axiom recommends a destination —
  // they are read-only here (the user overrides via the Category selector in
  // the Visual Identity step).
  const sortedTargets = ALL_TARGETS
    .map((t) => ({ target: t, score: plan.scores[t] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const targetColor = (t: InstallTarget): string => {
    const colors: Record<InstallTarget, string> = {
      "llm-model": "bg-axiom-violet",
      "runtime-engine": "bg-axiom-amber",
      "workflow-engine": "bg-axiom-rose",
      "mcp-server": "bg-axiom-violet",
      "module": "bg-axiom-cyan",
      "application": "bg-axiom-emerald",
      "skills-package": "bg-axiom-emerald",
      "agent": "bg-axiom-emerald",
      "tool": "bg-axiom-cyan",
    };
    return colors[t] ?? "bg-axiom-dim";
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        plan.status === "installed"
          ? "border-axiom-emerald/30 bg-axiom-emerald/5"
          : plan.status === "installing"
            ? "border-axiom-amber/30 bg-axiom-amber/5"
            : plan.status === "failed"
              ? "border-axiom-rose/30 bg-axiom-rose/5"
              : "border-axiom-edge/40 bg-axiom-panel/40",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center border bg-axiom-violet/10 border-axiom-violet/30 text-axiom-violet shrink-0">
          <TypeIcon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-axiom-text truncate">{plan.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-violet/10 border border-axiom-violet/30 text-axiom-violet uppercase tracking-wider shrink-0">
              {effectiveTarget.replace(/-/g, " ")}
            </span>
            <span className={cn("text-[9px] uppercase tracking-wider shrink-0", confidenceColor)}>
              {plan.confidence} ({topScore}%)
            </span>
            {plan.userOverride && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-amber/10 border border-axiom-amber/30 text-axiom-amber shrink-0">
                overridden
              </span>
            )}
          </div>
          <p className="text-[10px] text-axiom-dim mt-0.5 truncate">
            {plan.repoUrl ?? plan.localPath}
          </p>
        </div>
        {plan.status === "installed" && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald border border-axiom-emerald/30 flex items-center gap-1 shrink-0">
            <Check className="w-2.5 h-2.5" /> Installed
          </span>
        )}
        {plan.status === "installing" && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-axiom-amber/15 text-axiom-amber border border-axiom-amber/30 flex items-center gap-1 shrink-0">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Installing
          </span>
        )}
      </div>

      {/* ═══ confirming: Repository Analysis + Classification (read-only) ═══
          The classification score bars are NOT interactive here — the category
          is the single source of truth, controlled in the Visual Identity step.
          The only forward action is "Customize Appearance". There is NO
          "Confirm & Install" button here — the user must go through the full
          flow: Analysis → Classification → Customize Appearance → Review → Install. */}
      {plan.status === "confirming" && (
        <>
          {plan.analysisStages.length > 0 && (
            <div className="ml-9 mb-2">
              <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Repository Analysis</div>
              <div className="space-y-0.5">
                {plan.analysisStages.map((stage, i) => (
                  <div key={i} className="text-[10px] text-axiom-dim/70 font-mono leading-relaxed">
                    <span className="text-axiom-violet/60">{stage.name}:</span> {stage.detail}
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.detectedSignals.length > 0 && (
            <div className="ml-9 mb-2">
              <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Detected Signals</div>
              <div className="flex items-center gap-1 flex-wrap">
                {plan.detectedSignals.map((sig) => (
                  <span key={sig} className="text-[9px] px-1.5 py-0.5 rounded bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim">
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Classification confidence scores (read-only) ═══
              These bars explain WHY Axiom recommends a destination. They are
              NOT interactive — the user overrides the destination via the
              Category selector in the Visual Identity step (single source of
              truth). The recommended target is highlighted. */}
          <div className="ml-9 mb-2">
            <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Classification</div>
            <div className="space-y-1">
              {sortedTargets.map(({ target, score }) => (
                <div
                  key={target}
                  className={cn(
                    "w-full flex items-center gap-2 rounded px-1 py-0.5",
                    target === effectiveTarget ? "bg-axiom-violet/5" : "",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] w-24 shrink-0 truncate",
                      target === effectiveTarget ? "text-axiom-text font-medium" : "text-axiom-dim",
                    )}
                  >
                    {target.replace(/-/g, " ")}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-axiom-panel/40 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", targetColor(target))}
                      style={{ width: `${Math.max(score, 1)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums w-8 text-right shrink-0",
                      target === effectiveTarget ? "text-axiom-text font-medium" : "text-axiom-dim/60",
                    )}
                  >
                    {score}%
                  </span>
                  {target === plan.detectedType && !plan.userOverride && (
                    <span className="text-[9px] text-axiom-violet shrink-0" title="System recommendation">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {target === plan.userOverride && (
                    <span className="text-[9px] text-axiom-amber shrink-0" title="User override">
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended destination summary */}
          <div className="ml-9 mb-2 p-2 rounded-md bg-axiom-violet/5 border border-axiom-violet/20">
            <div className="flex items-center gap-1.5 mb-0.5">
              <ArrowRight className="w-2.5 h-2.5 text-axiom-violet" />
              <span className="text-[10px] font-medium text-axiom-violet">
                Recommended: {effectiveTarget.replace(/-/g, " ")} ({topScore}%)
              </span>
            </div>
            <p className="text-[10px] text-axiom-dim leading-snug ml-4">
              {plan.installAction} — you can override this in the next step.
            </p>
          </div>

          {plan.dependencies.length > 0 && (
            <div className="ml-9 mb-2 flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-axiom-dim/60 uppercase tracking-wider">Deps:</span>
              {plan.dependencies.map((dep) => (
                <span key={dep} className="text-[9px] px-1.5 py-0.5 rounded bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim font-mono">
                  {dep}
                </span>
              ))}
            </div>
          )}

          <div className="ml-9 flex items-center gap-2 flex-wrap">
            <button
              onClick={onProceedToVisualIdentity}
              className="px-3 py-1.5 rounded text-xs font-medium border bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet hover:bg-axiom-violet/25 flex items-center gap-1.5 transition-colors"
              title="Customize how this subsystem will appear across Axiom OS"
            >
              <Palette className="w-3 h-3" /> Customize Appearance
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* ═══ visual-identity: Customize Appearance ═══
          The user reviews/customizes the icon, color, badge, category, and
          display name. The category IS the installation destination — changing
          it here re-routes the install target. Forward action: "Review
          Installation" (NOT "Install" — that's only in the reviewing state). */}
      {plan.status === "visual-identity" && (
        <VisualIdentityStep
          plan={plan}
          onSetVisualIdentity={onSetVisualIdentity}
          onProceedToReview={onProceedToReview}
          onDismiss={onDismiss}
        />
      )}

      {/* ═══ reviewing: Review Installation ═══
          The user reviews the full installation summary before committing.
          This is the ONLY state where "Confirm & Install" is enabled. */}
      {plan.status === "reviewing" && (
        <ReviewInstallationStep
          plan={plan}
          onConfirm={onConfirm}
          onBack={onBackToVisualIdentity}
          onDismiss={onDismiss}
        />
      )}

      {(plan.status === "installed" || plan.status === "failed") && (
        <div className="ml-9 flex justify-end">
          <button
            onClick={onDismiss}
            className="text-[10px] text-axiom-dim hover:text-axiom-text transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Visual Identity Step — appearance customizer shown between Confirm and
//  Install. Lets the user override the analyzer-suggested displayName,
//  description, category, icon, accent color, and badge BEFORE the subsystem
//  is committed. This is NOT a functional editor — only appearance metadata.
//
//  All fields are pre-filled from the analyzer's suggestion. The user can
//  accept the defaults (just press Install) or customize any field. Once
//  installed, the values propagate to every registry + view.
// ════════════════════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS = [
  "Agent",
  "Application",
  "Module",
  "Workflow Engine",
  "Runtime Engine",
  "LLM Provider",
  "MCP Server",
  "Skill",        // → Skills Registry (only Skills)
  "Tool",         // → Tools Registry (only Tools)
];

const BADGE_OPTIONS = ["APP", "MODULE", "ENGINE", "TOOL", "SKILL", "LLM", "MCP", "AGENT"];

// ════════════════════════════════════════════════════════════════════════════
//  SearchableCategorySelect — modern searchable category selector.
//  Replaces the old <select> dropdown. Same popover pattern used throughout
//  Axiom OS (IconPicker, ColorPickerPopover, etc.). Shows the destination
//  registry next to each category so the user sees where it will install.
// ════════════════════════════════════════════════════════════════════════════

const CATEGORY_DESTINATIONS: Record<string, string> = {
  "Application": "App Manager",
  "Module": "Modules",
  "Runtime Engine": "Engines → Runtime Engines",
  "Workflow Engine": "Engines → Workflow Engines",
  "LLM Provider": "Engines → LLM Registry",
  "MCP Server": "Engines → MCP Registry",
  "Skill": "Skills Registry",
  "Tool": "Tools Registry",
  "Agent": "Agents",
};

function SearchableCategorySelect({
  value,
  onChange,
  accentColor,
}: {
  value: string;
  onChange: (category: string) => void;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search
    ? CATEGORY_OPTIONS.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : CATEGORY_OPTIONS;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border bg-axiom-deep/70 hover:bg-axiom-deep/90 transition-colors text-left"
        style={{ borderColor: open ? accentColor + "66" : undefined }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs text-axiom-text truncate">{value}</div>
          <div className="text-[9px] text-axiom-dim/60 truncate">
            → {CATEGORY_DESTINATIONS[value] ?? "—"}
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-axiom-dim shrink-0" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 w-full flex flex-col rounded-lg border border-axiom-edge/60 bg-axiom-panel/95 backdrop-blur-xl shadow-2xl max-h-64"
        >
          <div className="p-2 border-b border-axiom-edge/40 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-axiom-dim" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="w-full pl-7 pr-2 py-1 rounded bg-axiom-deep/70 border border-axiom-edge/40 text-xs text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-cyan/40"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto axiom-scroll p-1">
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-left transition-colors",
                  c === value ? "bg-axiom-cyan/10" : "hover:bg-axiom-panel/60",
                )}
              >
                <span className={cn("text-xs", c === value ? "text-axiom-text font-medium" : "text-axiom-text")}>
                  {c}
                </span>
                <span className="text-[9px] text-axiom-dim/60 truncate">
                  → {CATEGORY_DESTINATIONS[c] ?? "—"}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2 py-3 text-center text-[10px] text-axiom-dim/50">
                No categories match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VisualIdentityStep({
  plan,
  onSetVisualIdentity,
  onProceedToReview,
  onDismiss,
}: {
  plan: InstallPlan;
  onSetVisualIdentity: (patch: Partial<VisualIdentity>) => void;
  onProceedToReview: () => void;
  onDismiss: () => void;
}) {
  const effectiveTarget = plan.userOverride ?? plan.detectedType;
  const defaults = TARGET_VISUAL_DEFAULTS[effectiveTarget];
  // Resolve the current visual identity (user-customized or analyzer-suggested).
  const vi: VisualIdentity = plan.visualIdentity ?? {
    displayName: plan.name,
    description: plan.description,
    category: defaults.category,
    glyph: defaults.glyph,
    accentColor: defaults.accentColor,
    badge: defaults.badge,
  };

  // ── Resolve the active hex from the accent color ──
  // SAME pattern as Agent Forge: accentColor can be a palette token OR a raw
  // hex. We resolve to a hex string for inline-style preview rendering.
  const activePaletteEntry = EXTENDED_PALETTE.find((c) => c.token === vi.accentColor) ?? null;
  const activeHex = activePaletteEntry?.hex ?? (isRawHexColor(vi.accentColor) ? vi.accentColor : "#a855f7");

  // Category change handler — the store's setInstallVisualIdentity auto-routes
  // the install target to match (Skill → Skills Registry, Module → Modules, etc.).
  // The category is the final authority; the analyzer only recommends.
  const handleCategoryChange = (newCategory: string) => {
    onSetVisualIdentity({ category: newCategory });
  };

  // Custom hex handler — SAME pattern as Agent Forge
  const handleCustomHexChange = (hex: string) => {
    onSetVisualIdentity({ accentColor: hex });
  };

  return (
    <div className="ml-9 mt-2 p-3 rounded-lg border border-axiom-violet/30 bg-axiom-violet/5">
      {/* Step header */}
      <div className="flex items-center gap-1.5 mb-3">
        <Palette className="w-3 h-3 text-axiom-violet" />
        <span className="text-[10px] uppercase tracking-wider text-axiom-violet font-medium">
          Visual Identity
        </span>
        <span className="text-[9px] text-axiom-dim/60 ml-1">
          — customize how this subsystem will appear across Axiom OS
        </span>
      </div>

      {/* Live preview — uses activeHex via inline styles (SAME as Agent Forge).
          Icon sizing matches Agent Forge: w-7 h-7 container, text-base glyph. */}
      <div
        className="mb-3 p-3 rounded-md border flex items-center gap-3"
        style={{
          borderColor: activeHex + "4d",
          backgroundColor: activeHex + "0d",
        }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-base shrink-0"
          style={{
            backgroundColor: activeHex + "1a",
            borderColor: activeHex + "66",
            color: activeHex,
          }}
        >
          <GlyphRenderer glyph={vi.glyph} className="text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-axiom-text truncate">{vi.displayName || "Untitled"}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0"
              style={{
                borderColor: activeHex + "4d",
                color: activeHex,
                backgroundColor: activeHex + "0d",
              }}
            >
              {vi.badge}
            </span>
          </div>
          <div className="text-[10px] text-axiom-dim truncate mt-0.5">{vi.description || "—"}</div>
          <div className="text-[9px] text-axiom-dim/60 mt-0.5">
            {vi.category} → installs into {CATEGORY_TO_TARGET[vi.category]?.replace(/-/g, " ") ?? "default registry"}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-2.5">
        {/* Display Name */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">
            Display Name
          </label>
          <input
            type="text"
            value={vi.displayName}
            onChange={(e) => onSetVisualIdentity({ displayName: e.target.value })}
            placeholder="My Subsystem"
            className="bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">
            Description
          </label>
          <input
            type="text"
            value={vi.description}
            onChange={(e) => onSetVisualIdentity({ description: e.target.value })}
            placeholder="One-line description"
            className="bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors"
          />
        </div>

        {/* Category — the single source of truth for installation destination.
            Changing this re-routes the install target (Skill → Skills Registry,
            Module → Modules, etc.). Searchable selector (NOT a plain dropdown). */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">
            Category
          </label>
          <SearchableCategorySelect
            value={vi.category}
            onChange={handleCategoryChange}
            accentColor={activeHex}
          />
        </div>

        {/* Icon — REUSES the existing AssetPicker (same as Agent Forge).
            Supports: Axiom icon packs, uploaded SVGs, external icon imports.
            Same props + sizing as Agent Forge (no compact mode, no wrapper). */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right pt-1.5">
            Icon
          </label>
          <div>
            <AssetPicker
              selectedGlyph={vi.glyph}
              onSelect={(glyph) => onSetVisualIdentity({ glyph })}
              accentColor={vi.accentColor}
            />
          </div>
        </div>

        {/* Accent Color — REUSES the existing EXTENDED_PALETTE + ColorPickerPopover
            (same as Agent Forge). Palette swatches + custom hex picker. */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right pt-1.5">
            Accent Color
          </label>
          <div className="rounded-md border border-axiom-edge/40 bg-axiom-void/30 p-2 space-y-2">
            {/* Palette swatches — SAME as Agent Forge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {EXTENDED_PALETTE.map((c: AccentColor) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => onSetVisualIdentity({ accentColor: c.token })}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    vi.accentColor === c.token ? "border-axiom-text scale-110" : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            {/* Custom hex picker — SAME as Agent Forge */}
            <div className="flex items-center gap-2 pt-1 border-t border-axiom-edge/30">
              <span className="text-[9px] uppercase tracking-wider text-axiom-dim/60 shrink-0">Custom</span>
              <input
                type="text"
                value={isRawHexColor(vi.accentColor) ? vi.accentColor.replace("#", "") : ""}
                onChange={(e) => {
                  const hex = "#" + e.target.value.replace(/[^0-9A-Fa-f]/g, "");
                  if (hex.length >= 7) handleCustomHexChange(hex);
                }}
                placeholder="FF5733"
                maxLength={6}
                className="flex-1 bg-axiom-void/60 border border-axiom-edge/40 rounded px-2 py-1 text-[10px] font-mono text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-violet/40"
              />
              <ColorPickerPopover
                value={validateHex(activeHex) ?? activeHex}
                onChange={handleCustomHexChange}
              />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">
            Badge
          </label>
          <div className="flex items-center gap-1 flex-wrap">
            {BADGE_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onSetVisualIdentity({ badge: b })}
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border transition-colors",
                  vi.badge === b
                    ? "border-axiom-violet/40 text-axiom-violet bg-axiom-violet/15"
                    : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-axiom-edge/30">
        <button
          onClick={onProceedToReview}
          className="px-3 py-1.5 rounded text-xs font-medium border bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet hover:bg-axiom-violet/25 flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight className="w-3 h-3" /> Review Installation
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 transition-colors"
        >
          Cancel
        </button>
        <span className="text-[9px] text-axiom-dim/50 ml-auto">
          Review the installation before committing.
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Review Installation Step — the final review before committing.
//  Shows the full installation summary: target registry, display name,
//  description, icon, accent color, badge, category. The "Confirm & Install"
//  button is ONLY enabled here (not in confirming or visual-identity states).
// ════════════════════════════════════════════════════════════════════════════

function ReviewInstallationStep({
  plan,
  onConfirm,
  onBack,
  onDismiss,
}: {
  plan: InstallPlan;
  onConfirm: () => void;
  onBack: () => void;
  onDismiss: () => void;
}) {
  const effectiveTarget = plan.userOverride ?? plan.detectedType;
  const defaults = TARGET_VISUAL_DEFAULTS[effectiveTarget];
  const vi: VisualIdentity = plan.visualIdentity ?? {
    displayName: plan.name,
    description: plan.description,
    category: defaults.category,
    glyph: defaults.glyph,
    accentColor: defaults.accentColor,
    badge: defaults.badge,
  };
  const activePaletteEntry = EXTENDED_PALETTE.find((c) => c.token === vi.accentColor) ?? null;
  const activeHex = activePaletteEntry?.hex ?? (isRawHexColor(vi.accentColor) ? vi.accentColor : "#a855f7");

  // Map the target to its destination registry name (for the review summary)
  const DESTINATION_LABELS: Record<InstallTarget, string> = {
    "application": "App Manager",
    "module": "Modules",
    "workflow-engine": "Engines → Workflow Engines",
    "runtime-engine": "Engines → Runtime Engines",
    "mcp-server": "Engines → MCP Registry",
    "llm-model": "Engines → LLM Registry",
    "skills-package": "Skills Registry",
    "agent": "Agents",
    "tool": "Tools Registry",
  };

  return (
    <div className="ml-9 mt-2 p-3 rounded-lg border border-axiom-emerald/30 bg-axiom-emerald/5">
      {/* Step header */}
      <div className="flex items-center gap-1.5 mb-3">
        <Check className="w-3 h-3 text-axiom-emerald" />
        <span className="text-[10px] uppercase tracking-wider text-axiom-emerald font-medium">
          Review Installation
        </span>
        <span className="text-[9px] text-axiom-dim/60 ml-1">
          — verify everything before committing
        </span>
      </div>

      {/* Preview card (same sizing as Visual Identity preview) */}
      <div
        className="mb-3 p-3 rounded-md border flex items-center gap-3"
        style={{
          borderColor: activeHex + "4d",
          backgroundColor: activeHex + "0d",
        }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-base shrink-0"
          style={{
            backgroundColor: activeHex + "1a",
            borderColor: activeHex + "66",
            color: activeHex,
          }}
        >
          <GlyphRenderer glyph={vi.glyph} className="text-base" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-axiom-text truncate">{vi.displayName || "Untitled"}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border shrink-0"
              style={{ borderColor: activeHex + "4d", color: activeHex, backgroundColor: activeHex + "0d" }}
            >
              {vi.badge}
            </span>
          </div>
          <div className="text-[10px] text-axiom-dim truncate mt-0.5">{vi.description || "—"}</div>
        </div>
      </div>

      {/* Summary grid */}
      <div className="space-y-1.5 mb-3">
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">Category</span>
          <span className="text-xs text-axiom-text">{vi.category}</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">Destination</span>
          <span className="text-xs text-axiom-emerald font-medium">{DESTINATION_LABELS[effectiveTarget]}</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">Source</span>
          <span className="text-xs text-axiom-dim truncate">{plan.repoUrl ?? plan.localPath ?? "—"}</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2 items-center">
          <span className="text-[10px] uppercase tracking-wider text-axiom-dim/70 text-right">Language</span>
          <span className="text-xs text-axiom-dim">{plan.language}</span>
        </div>
      </div>

      {/* Actions — Confirm & Install is ONLY enabled here */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-axiom-edge/30">
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded text-xs font-medium border bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald hover:bg-axiom-emerald/25 flex items-center gap-1.5 transition-colors"
        >
          <Zap className="w-3 h-3" /> Confirm & Install
        </button>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 transition-colors"
        >
          ← Edit Appearance
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Main Page
// ════════════════════════════════════════════════════════════════════════════

export default function IntegrationsPage() {
  const {
    // Config-based integrations (the primary content)
    integrationConfigs,
    addIntegrationConfig,
    updateIntegrationConfig,
    deleteIntegrationConfig,
    // Install pipeline
    installPlans,
    classifyRepository,
    classifyLocalPath,
    executeInstallPlan,
    clearInstallPlan,
    overrideInstallType,
    proceedToVisualIdentity,
    setInstallVisualIdentity,
    proceedToReview,
    backToVisualIdentity,
    // Canonical Infrastructure registries — Integrations is a VIEW of these,
    // never a duplicate. Each registry maps to exactly one Infrastructure page.
    installedAgents,  // → Agents
    apps,             // → App Manager (filtered: non-AI-Core = Applications, AI Core = Modules)
    engines,          // → Engines (split by kind: local-llm = Runtime, gateway = Workflow)
    llmFamilies,      // → Engines → LLM Registry
    mcps,             // → Engines → MCP Registry
    skills,           // → Skills & Tools (skills)
    tools,            // → Skills & Tools (tools)
    toggleAgentEnabled,
    toggleAppEnabled,
    toggleTool,
    toggleSkill,
    toggleMcp,
    navigate,
  } = useAxiom();

  const [repoUrl, setRepoUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState("");
  // ── Tab state: "installation" (repo analyzer + install pipeline) vs
  //    "connections" (persistent system connections — GitHub, Discord, MCP,
  //    providers, API keys). Two completely different responsibilities. ──
  const [activeTab, setActiveTab] = useState<"installation" | "connections">("installation");

  // ── Install pipeline handlers ──
  const handleAnalyze = () => {
    if (!repoUrl.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      classifyRepository(repoUrl.trim());
      setRepoUrl("");
      setAnalyzing(false);
    }, 600);
  };

  const handleLocalFolder = () => {
    const path = prompt("Enter local folder path:");
    if (path && path.trim()) {
      classifyLocalPath(path.trim(), "local-folder");
    }
  };

  const handleZip = () => {
    const path = prompt("Enter ZIP archive path:");
    if (path && path.trim()) {
      classifyLocalPath(path.trim(), "zip");
    }
  };

  // ── Quick Connect — adds a new contextual configuration card ──
  const quickConnect = [
    {
      kind: "provider",
      icon: Server,
      label: "Connect Provider",
      desc: "LLM API key + model",
      color: "axiom-cyan",
      onClick: () => addIntegrationConfig({
        name: "New LLM Provider",
        kind: "provider",
        description: "LLM API provider connection",
        config: { api_key: "", model: "", endpoint: "" },
      }),
    },
    {
      kind: "github",
      icon: Github,
      label: "Connect GitHub",
      desc: "Repo access + auth token",
      color: "axiom-violet",
      onClick: () => addIntegrationConfig({
        name: "New GitHub Connection",
        kind: "github",
        description: "GitHub repository access",
        config: { repo: "", token: "", branch: "main", destination: "/axiom/integrations/github" },
      }),
    },
    {
      kind: "discord",
      icon: Plug,
      label: "Connect Discord",
      desc: "Bot token + server ID",
      color: "axiom-rose",
      onClick: () => addIntegrationConfig({
        name: "New Discord Bot",
        kind: "discord",
        description: "Discord bot integration",
        config: { bot_token: "", server_id: "" },
      }),
    },
    {
      kind: "obsidian",
      icon: FolderOpen,
      label: "Connect Obsidian",
      desc: "Local vault path",
      color: "axiom-violet",
      onClick: () => addIntegrationConfig({
        name: "New Obsidian Vault",
        kind: "obsidian",
        description: "Obsidian vault access",
        config: { vault_path: "" },
      }),
    },
    {
      kind: "google-drive",
      icon: FolderArchive,
      label: "Connect Google Drive",
      desc: "Credentials + root folder",
      color: "axiom-cyan",
      onClick: () => addIntegrationConfig({
        name: "New Google Drive",
        kind: "google-drive",
        description: "Google Drive access",
        config: { credentials_path: "", root_folder: "root" },
      }),
    },
    {
      kind: "mcp",
      icon: Plug,
      label: "Add MCP Server",
      desc: "Model Context Protocol",
      color: "axiom-violet",
      onClick: () => addIntegrationConfig({
        name: "New MCP Server",
        kind: "mcp",
        description: "MCP server registration",
        config: { endpoint: "http://localhost:3001", transport: "stdio", capabilities: "tools,resources,prompts" },
      }),
    },
    {
      kind: "runtime",
      icon: Cpu,
      label: "Add Runtime",
      desc: "Local runtime engine",
      color: "axiom-amber",
      onClick: () => addIntegrationConfig({
        name: "New Runtime Engine",
        kind: "runtime",
        description: "Local runtime engine",
        config: { version: "", gpu: "auto", memory: "4 GB" },
      }),
    },
  ];

  // ── Install entry-point cards (analyze → install pipeline) ──
  const installTargets = [
    { icon: Github, label: "Import GitHub Repository", desc: "Analyze + auto-classify any public repo", color: "axiom-violet", onClick: () => document.getElementById("integrations-repo-input")?.focus() },
    { icon: FolderOpen, label: "Import Local Folder", desc: "Scan a local project directory", color: "axiom-cyan", onClick: handleLocalFolder },
    { icon: FolderArchive, label: "Import ZIP", desc: "Upload + analyze a compressed archive", color: "axiom-cyan", onClick: handleZip },
    { icon: Package, label: "Install Application", desc: "Register a new app in App Manager", color: "axiom-emerald", onClick: () => { setRepoUrl("https://github.com/"); document.getElementById("integrations-repo-input")?.focus(); } },
    { icon: Box, label: "Install Module", desc: "Agentic module installer pipeline", color: "axiom-amber", onClick: () => { setRepoUrl("https://github.com/"); document.getElementById("integrations-repo-input")?.focus(); } },
    { icon: Zap, label: "Install Workflow Engine", desc: "Register n8n / LangFlow / custom engine", color: "axiom-rose", onClick: () => { setRepoUrl("https://github.com/n8n-io/"); document.getElementById("integrations-repo-input")?.focus(); } },
    { icon: Cpu, label: "Install Runtime Engine", desc: "Add llama.cpp / Ollama / vLLM", color: "axiom-amber", onClick: () => { setRepoUrl("https://github.com/ollama/"); document.getElementById("integrations-repo-input")?.focus(); } },
    { icon: Plug, label: "Install MCP Server", desc: "Register a Model Context Protocol server", color: "axiom-violet", onClick: () => { setRepoUrl("https://github.com/"); document.getElementById("integrations-repo-input")?.focus(); } },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  //  Installed Subsystems — synchronized VIEW of the canonical Infrastructure
  //  registries. Integrations NEVER maintains its own category structure. Each
  //  category below maps 1:1 to an Infrastructure page:
  //
  //    Agents           ← installedAgents          (Infrastructure → Agents)
  //    Applications      ← apps (non-AI-Core)      (Infrastructure → App Manager)
  //    Modules           ← apps (AI Core)          (Infrastructure → Modules)
  //    Skills            ← skills                  (Workspace → Skills & Tools → Skills)
  //    Tools             ← tools                   (Workspace → Skills & Tools → Tools)
  //    Runtime Engines   ← engines (non-gateway)   (Infrastructure → Engines → Runtime)
  //    Workflow Engines  ← engines (gateway)       (Infrastructure → Engines → Workflow)
  //    LLM Providers     ← llmFamilies             (Infrastructure → Engines → LLM Registry)
  //    MCP Servers       ← mcps                    (Infrastructure → Engines → MCP Registry)
  // ═══════════════════════════════════════════════════════════════════════════

  type SubsystemEntry = {
    id: string;
    name: string;
    description: string;
    category: string;
    glyph?: string;
    color: string;
    enabled: boolean;
    status: "active" | "idle" | "error" | "disabled";
    registry: SubsystemRegistry;
    onToggle: () => void;
    onOpen: () => void;
  };

  const allSubsystems = useMemo<SubsystemEntry[]>(() => {
    const out: SubsystemEntry[] = [];

    // Agents → Infrastructure → Agents
    for (const a of installedAgents) {
      out.push({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        glyph: getGlyph(a),
        color: getAccentColor(a),
        enabled: a.enabled,
        status: a.enabled ? "active" : "disabled",
        registry: "agents",
        onToggle: () => toggleAgentEnabled(a.id),
        onOpen: () => navigate("agents"),
      });
    }

    // Apps — split using the SAME rule as App Manager vs Modules:
    //   category "Workflow Engine" or "AI Core" → Modules
    //   everything else → Applications (App Manager)
    // This mirrors the Infrastructure architecture exactly. No filtering by
    // source/imported — every app in the registry appears in one of the two
    // groups. The Integrations page is just another view of the same data.
    const MODULE_CATEGORIES = ["Workflow Engine", "AI Core"] as const;
    for (const ap of apps) {
      const isModule = MODULE_CATEGORIES.includes(ap.category as typeof MODULE_CATEGORIES[number]);
      out.push({
        id: ap.id,
        name: ap.name,
        description: ap.description,
        category: ap.category,
        glyph: getGlyph(ap),
        color: getAccentColor(ap),
        enabled: ap.enabled,
        status: ap.enabled ? (ap.connected || ap.running ? "active" : "idle") : "disabled",
        registry: isModule ? "modules" : "apps",
        onToggle: () => toggleAppEnabled(ap.id),
        onOpen: () => navigate(isModule ? "modules" : "apps"),
      });
    }

    // Engines split by kind: local-llm → Runtime; gateway → Workflow; others → Runtime
    for (const e of engines) {
      const isWorkflow = e.kind === "gateway";
      out.push({
        id: e.id,
        name: e.name,
        description: e.description,
        category: e.type,
        glyph: getGlyph(e),
        color: getAccentColor(e),
        enabled: e.enabled,
        status: e.enabled ? (e.status === "connected" || e.status === "active" ? "active" : e.status === "error" ? "error" : "idle") : "disabled",
        registry: isWorkflow ? "workflow-engines" : "runtime-engines",
        onToggle: () => navigate("engines"),
        onOpen: () => navigate("engines"),
      });
    }

    // LLM Families → Engines → LLM Registry
    for (const f of llmFamilies) {
      out.push({
        id: f.id,
        name: f.name,
        description: f.description,
        category: "LLM Provider",
        glyph: getGlyph(f),
        color: getAccentColor(f),
        enabled: f.enabled,
        status: f.enabled ? (f.keyValidated ? "active" : "idle") : "disabled",
        registry: "llm-registry",
        onToggle: () => navigate("engines"),
        onOpen: () => navigate("engines"),
      });
    }

    // MCP Servers → Engines → MCP Registry
    for (const m of mcps) {
      out.push({
        id: m.id,
        name: m.name,
        description: m.description ?? "",
        category: m.category ?? "MCP Server",
        glyph: getGlyph(m),
        color: getAccentColor(m),
        enabled: m.enabled,
        status: m.enabled ? (m.connected ? "active" : "idle") : "disabled",
        registry: "mcp-registry",
        onToggle: () => toggleMcp(m.id),
        onOpen: () => navigate("engines"),
      });
    }

    // Skills → Skills Registry (only Skills). The "Skills & Tools" page is
    // only a combined workspace view — Skills and Tools are SEPARATE registries.
    for (const s of skills) {
      out.push({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        glyph: getGlyph(s),
        color: getAccentColor(s),
        enabled: s.enabled,
        status: s.enabled ? "idle" : "disabled",
        registry: "skills",
        onToggle: () => toggleSkill(s.id),
        onOpen: () => navigate("skills-tools"),
      });
    }

    // Tools → Tools Registry (only Tools). Independent from Skills.
    for (const t of tools) {
      out.push({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        glyph: getGlyph(t),
        color: getAccentColor(t),
        enabled: t.enabled,
        status: t.enabled ? "idle" : "disabled",
        registry: "tools",
        onToggle: () => toggleTool(t.id),
        onOpen: () => navigate("skills-tools"),
      });
    }

    return out;
  }, [installedAgents, apps, engines, llmFamilies, mcps, skills, tools, toggleAgentEnabled, toggleAppEnabled, toggleMcp, toggleSkill, toggleTool, navigate]);

  // Filter by search
  const filteredSubsystems = useMemo(() => {
    if (!search) return allSubsystems;
    const q = search.toLowerCase();
    return allSubsystems.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [allSubsystems, search]);

  // Group by Infrastructure category (registry) — each category only contains
  // its own subsystem type. Never mixes. SUBSYSTEM_GROUPS is a module-level
  // constant (stable reference, safe for useMemo deps).
  const groupedSubsystems = useMemo(() => {
    const map = new Map<SubsystemRegistry, SubsystemEntry[]>();
    for (const g of SUBSYSTEM_GROUPS) map.set(g.registry, []);
    for (const s of filteredSubsystems) {
      const arr = map.get(s.registry);
      if (arr) arr.push(s);
    }
    return map;
  }, [filteredSubsystems]);

  const totalCount = allSubsystems.length;
  const activeCount = allSubsystems.filter((s) => s.status === "active").length;
  const idleCount = allSubsystems.filter((s) => s.status === "idle").length;
  const errorCount = allSubsystems.filter((s) => s.status === "error").length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-axiom-edge/40 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-medium text-axiom-text flex items-center gap-2">
              <Signal className="w-4 h-4 text-axiom-violet" />
              Integrations
            </h2>
            <p className="text-[11px] text-axiom-dim mt-0.5">
              Install subsystems from repositories, and configure persistent
              external connections.
            </p>
          </div>
        </div>

        {/* Tab switcher — two completely different responsibilities */}
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={() => setActiveTab("installation")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5",
              activeTab === "installation"
                ? "bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
            )}
          >
            <Wand2 className="w-3 h-3" />
            Installation
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5",
              activeTab === "connections"
                ? "bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
            )}
          >
            <Plug className="w-3 h-3" />
            Connections
          </button>
        </div>

        {/* Health pills — context-aware per tab */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {activeTab === "connections" ? (
            <HealthPill
              icon={Plug}
              label="Configs"
              value={integrationConfigs.length}
              valueColor="text-axiom-violet"
            />
          ) : (
            <>
              <HealthPill
                icon={LayoutGrid}
                label="Subsystems"
                value={totalCount}
                valueColor="text-axiom-text"
              />
              <HealthPill
                icon={Activity}
                label="Active"
                value={activeCount}
                valueColor="text-axiom-emerald"
              />
              <HealthPill
                icon={Clock}
                label="Idle"
                value={idleCount}
                valueColor="text-axiom-amber"
              />
              <HealthPill
                icon={AlertTriangle}
                label="Errors"
                value={errorCount}
                valueColor="text-axiom-rose"
              />
            </>
          )}
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: INSTALLATION
          Repository analyzer → classification → install target → visual
          customization → install pipeline. Everything related to importing
          repositories belongs here.
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "installation" && (
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-6">
          {/* ── Install Pipeline ── */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-axiom-amber font-medium flex items-center gap-1.5 mb-3">
              <Wand2 className="w-3 h-3" />
              Install Pipeline
            </h3>

            {/* GitHub URL input (primary install entry point) */}
            <div className="p-4 rounded-xl border border-axiom-amber/30 bg-axiom-panel/30 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <Github className="w-4 h-4 text-axiom-amber" />
                <span className="text-sm font-medium text-axiom-text">Import Repository</span>
                <span className="text-[10px] text-axiom-dim">— the system auto-classifies where it belongs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="integrations-repo-input"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://github.com/owner/repo"
                  disabled={analyzing}
                  className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-3 py-2 text-sm text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-amber/50 transition-colors"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !repoUrl.trim()}
                  className="px-4 py-2 rounded text-xs font-medium border bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber hover:bg-axiom-amber/25 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {analyzing ? "Analyzing…" : "Analyze & Install"}
                </button>
              </div>
            </div>

            {/* Install entry-point cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              {installTargets.map((t, i) => (
                <button
                  key={i}
                  onClick={t.onClick}
                  className="p-3 rounded-lg border border-axiom-edge/40 bg-axiom-panel/40 hover:bg-axiom-panel/60 hover:border-axiom-edge/70 transition-all text-left group flex items-start gap-2.5"
                >
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center border shrink-0", `bg-${t.color}/10 border-${t.color}/30 text-${t.color}`)}>
                    <t.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-axiom-text group-hover:text-axiom-text transition-colors">
                      {t.label}
                    </div>
                    <div className="text-[10px] text-axiom-dim leading-snug mt-0.5">
                      {t.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Install plans (analysis → confirm → visual identity → install reports) */}
            {installPlans.length > 0 && (
              <div className="space-y-2">
                {installPlans.map((plan) => (
                  <InstallPlanCard
                    key={plan.id}
                    plan={plan}
                    onConfirm={() => executeInstallPlan(plan.id)}
                    onDismiss={() => clearInstallPlan(plan.id)}
                    onProceedToVisualIdentity={() => proceedToVisualIdentity(plan.id)}
                    onSetVisualIdentity={(patch) => setInstallVisualIdentity(plan.id, patch)}
                    onProceedToReview={() => proceedToReview(plan.id)}
                    onBackToVisualIdentity={() => backToVisualIdentity(plan.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Installed Subsystems — synchronized VIEW of Infrastructure ──
              Each category maps 1:1 to an Infrastructure page. Integrations
              NEVER maintains its own category structure — this is read-only. */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-wider text-axiom-cyan font-medium flex items-center gap-1.5">
                <LayoutGrid className="w-3 h-3" />
                Installed Subsystems
              </h3>
              <span className="text-[9px] text-axiom-dim/50">
                {totalCount} installed · synced with Infrastructure
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-axiom-dim" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter subsystems…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-axiom-deep/70 border border-axiom-edge/40 text-xs text-axiom-text placeholder:text-axiom-dim/60 focus:outline-none focus:border-axiom-cyan/50 transition-colors"
              />
            </div>

            {filteredSubsystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Ban className="w-8 h-8 text-axiom-dim/40 mb-3" />
                <p className="text-sm text-axiom-dim">
                  No subsystems match your filter.
                </p>
                {search && (
                  <p className="text-[11px] text-axiom-dim/60 mt-1">
                    Try a different search term.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {SUBSYSTEM_GROUPS.map((group) => {
                  const items = groupedSubsystems.get(group.registry) ?? [];
                  if (items.length === 0) return null;
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.registry}>
                      {/* Group header — mirrors Infrastructure page names */}
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <GroupIcon className={cn("w-4 h-4", group.color)} />
                        <h4 className={cn("text-xs font-semibold uppercase tracking-wider", group.color)}>
                          {group.label}
                        </h4>
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-axiom-edge/30 text-axiom-dim tabular-nums">
                          {items.length}
                        </span>
                        <div className="flex-1 h-px bg-axiom-edge/20 ml-2" />
                      </div>
                      {/* Cards grid — each card is a subsystem from the canonical registry */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {items.map((s) => {
                          const statusCfg = STATUS_CONFIG[s.status];
                          return (
                            <div
                              key={s.id}
                              className="relative group rounded-xl border border-axiom-edge/40 bg-axiom-panel/60 p-4 cursor-default axiom-hover-lift"
                              onClick={() => s.onOpen()}
                            >
                              {/* Glyph + Name */}
                              <div className="flex items-start gap-3 mb-2 pr-14">
                                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border border-axiom-edge/30 bg-axiom-deep/60")}>
                                  <GlyphRenderer glyph={s.glyph} className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-sm font-medium text-axiom-text truncate leading-tight">
                                    {s.name}
                                  </h5>
                                  <p className="text-[10px] text-axiom-dim mt-0.5 truncate">{s.category}</p>
                                </div>
                              </div>
                              {/* Description */}
                              <p className="text-[11px] text-axiom-dim/80 leading-relaxed mb-3 line-clamp-2 min-h-[2rem]">
                                {s.description}
                              </p>
                              {/* Footer: status + toggle */}
                              <div className="flex items-center justify-between mt-auto pt-2 border-t border-axiom-edge/20">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border",
                                  statusCfg.bg, statusCfg.text, statusCfg.border,
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot, statusCfg.pulse && "axiom-pulse-ring--status")} />
                                  {statusCfg.label}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); s.onToggle(); }}
                                  className={cn(
                                    "relative w-9 h-5 rounded-full transition-colors shrink-0",
                                    s.enabled ? "bg-axiom-emerald" : "bg-axiom-edge",
                                  )}
                                  title={s.enabled ? "Disable" : "Enable"}
                                >
                                  <span className={cn(
                                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                    s.enabled ? "translate-x-4" : "translate-x-0",
                                  )} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: CONNECTIONS
          Persistent system connections — GitHub, Discord, Google Drive,
          Obsidian, LLM Providers, Runtime connections, MCP connections,
          API Keys, Authentication. This is for configuring external services,
          NOT an installer.
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "connections" && (
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-wider text-axiom-violet font-medium flex items-center gap-1.5">
                <Plug className="w-3 h-3" />
                Connections
              </h3>
              <span className="text-[9px] text-axiom-dim/50">
                {integrationConfigs.length} configured
              </span>
            </div>

            {/* Quick Connect row — adds new contextual config cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
              {quickConnect.map((q) => (
                <button
                  key={q.kind}
                  onClick={q.onClick}
                  className="p-2.5 rounded-lg border border-dashed border-axiom-edge/50 bg-axiom-panel/20 hover:bg-axiom-panel/40 hover:border-axiom-edge/80 transition-all text-left group flex items-start gap-2"
                >
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0", `bg-${q.color}/10 border-${q.color}/30 text-${q.color}`)}>
                    <q.icon className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-axiom-text group-hover:text-axiom-text transition-colors leading-tight">
                      {q.label}
                    </div>
                    <div className="text-[9px] text-axiom-dim leading-tight mt-0.5">
                      {q.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Configured connection cards (or empty hint) */}
            {integrationConfigs.length === 0 ? (
              <div className="p-6 rounded-lg border border-axiom-edge/30 bg-axiom-panel/20 text-center">
                <Plug className="w-6 h-6 text-axiom-dim/40 mx-auto mb-2" />
                <p className="text-xs text-axiom-dim">
                  No connections configured.
                </p>
                <p className="text-[10px] text-axiom-dim/60 mt-1">
                  Use Quick Connect above to add a GitHub, Discord, MCP, Provider, or Runtime connection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {integrationConfigs.map((cfg) => (
                  <ConfigCard
                    key={cfg.id}
                    config={cfg}
                    onUpdate={(patch) => updateIntegrationConfig(cfg.id, patch)}
                    onDelete={() => deleteIntegrationConfig(cfg.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

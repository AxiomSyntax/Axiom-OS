"use client";

import { useState } from "react";
import { useAxiom } from "@/lib/axiom/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Play, ExternalLink, Package,
  Github, Globe, ChevronDown, ChevronRight,
  Cpu, GitBranch, Brain, X, Link2, Power, Settings2, Loader2,
} from "lucide-react";
import { GlyphRenderer } from "../AppIcon";
import { getGlyph, getAccentColor } from "@/lib/axiom/visual-identity";
import { getModuleState } from "@/lib/axiom/types";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
//  Modules Page — System infrastructure (Workflow Engines, AI Core)
//  and published modules from DevLab.
//
//  This is the INFRASTRUCTURE section of Axiom OS. It hosts the pre-installed
//  background system nodes (n8n Automation, LangFlow AI, Axiom Custom Flows,
//  OpenJarvis Core, Kokoro TTS, Faster-Whisper STT, ElevenLabs) plus any
//  modules published from the DevLab. User-facing app workspaces live on the
//  Apps page, not here.
//
//  ICON MANDATE:
//  • Workflow Engines (n8n ⬡, LangFlow ◈, Axiom Custom Flows ⬢) retain their
//    protected minimalist developer-logo glyphs. Do NOT replace them.
//  • AI Core infrastructure uses monochrome Lucide line-art icons (iconName) —
//    emoji glyphs are strictly prohibited.
//
//  SIDEBAR GATING:
//  Items on this page are system engines. They are PROHIBITED from auto-
//  injecting into the left main sidebar. Only custom active apps from the
//  AppsPage framework may mount sidebar links. The Sidebar's APPS group
//  filters out the "Workflow Engine" and "AI Core" categories to enforce this.
// ════════════════════════════════════════════════════════════════════════════

/** Categories that belong on the Modules page (system infrastructure). */
const MODULE_CATEGORIES = ["Workflow Engine", "AI Core"] as const;

export default function ModulesPage() {
  const {
    apps,
    publishedApps,
    unpublishApp,
    togglePublishedAppEnabled,
    launchModule,
  } = useAxiom();

  const [showInfra, setShowInfra] = useState(true);
  const [configAppId, setConfigAppId] = useState<string | null>(null);

  // ── Derived ──
  const publishedModules = publishedApps;
  // Only system infrastructure apps (Workflow Engines + AI Core)
  const infraApps = apps.filter((a) =>
    MODULE_CATEGORIES.includes(a.category as typeof MODULE_CATEGORIES[number]),
  );
  const workflowApps = infraApps.filter((a) => a.category === "Workflow Engine");
  const aiApps = infraApps.filter((a) => a.category === "AI Core");
  const activeInfraCount = infraApps.filter((a) => a.enabled && a.connected).length;

  const configApp = configAppId ? apps.find((a) => a.id === configAppId) ?? null : null;

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ──
          No "Open DevLab" button here — the single authoritative entryway to
          the DevLab developer workspace is the dedicated "DevLab" navigation
          link in the left-hand main sidebar under the DEVELOPMENT category. */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text flex items-center gap-2">
            <Package className="w-4 h-4 text-axiom-amber" />
            Modules
          </h2>
          <p className="text-[11px] text-axiom-dim">
            System infrastructure and published modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-axiom-dim tabular-nums">
            {activeInfraCount}/{infraApps.length} engines active
          </span>
        </div>
      </div>

      {/* ── Main Content ──
          The System Infrastructure grid (Workflow Engines + AI Core) sits at
          the very top of the page context, right below the sub-header, so the
          installable/active modules utilize the full canvas space immediately
          upon loading. Published modules (if any) render below. */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-6">

        {/* ═══ System Infrastructure (top of page) ═══ */}
        <div className="p-4 rounded-xl border border-axiom-edge/40 bg-axiom-panel/20">
          <button
            onClick={() => setShowInfra((p) => !p)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-axiom-dim" />
              <span className="text-xs font-medium text-axiom-text">System Infrastructure</span>
              <span className="text-[10px] text-axiom-dim/60">
                {activeInfraCount}/{infraApps.length} active
              </span>
            </div>
            {showInfra ? (
              <ChevronDown className="w-3.5 h-3.5 text-axiom-dim" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-axiom-dim" />
            )}
          </button>

          <AnimatePresence>
            {showInfra && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-5">
                  {/* ── Workflow Engines ── */}
                  {workflowApps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <GitBranch className="w-3 h-3 text-axiom-amber/60" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-amber/80 font-medium">
                          Workflow Engines
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {workflowApps.map((app) => (
                          <InfraModuleCard
                            key={app.id}
                            app={app}
                            onConfigure={() => setConfigAppId(app.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── AI Core Infrastructure ── */}
                  {aiApps.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Brain className="w-3 h-3 text-axiom-violet/60" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-violet/80 font-medium">
                          AI Core Infrastructure
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {aiApps.map((app) => (
                          <InfraModuleCard
                            key={app.id}
                            app={app}
                            onConfigure={() => setConfigAppId(app.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ Published Modules Grid (only renders when modules exist —
            no blank-state placeholder. The upper "No Published Modules Yet"
            canvas has been completely removed per the spec.) ═══ */}
        {publishedModules.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Package className="w-3 h-3 text-axiom-emerald/60" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-emerald/80 font-medium">
                Published Modules
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {publishedModules.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  onToggle={() => togglePublishedAppEnabled(mod.id)}
                  onLaunch={() => launchModule(mod.id)}
                  onUnpublish={() => {
                    if (confirm(`Unpublish ${mod.name}?`)) unpublishApp(mod.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Configuration Modal ── */}
      <AnimatePresence>
        {configApp && (
          <ModuleConfigModal
            app={configApp}
            onClose={() => setConfigAppId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  InfraModuleCard — Infrastructure module card matching the AppsPage grid
//  aesthetic. Renders the module's icon (glyph for Workflow Engines, Lucide
//  line-art for AI Core), a status token, and a Configure button that opens
//  the ModuleConfigModal.
// ════════════════════════════════════════════════════════════════════════════

function InfraModuleCard({
  app,
  onConfigure,
}: {
  app: ReturnType<typeof useAxiom.getState>["apps"][number];
  onConfigure: () => void;
}) {
  // ── Module runtime state (single source of truth, shared with Workflows page) ──
  // getModuleState() resolves active/standby/offline/error so this card always
  // agrees with Workspace → Workflows. "installing" is a separate transient
  // install phase that takes precedence over the runtime state token.
  const state = getModuleState(app);
  const isActive = state === "active";
  const isError = state === "error";
  const isOffline = state === "offline";
  const isCore = app.installState === "core";
  const isInstalling = app.installState === "installing";
  // Read the canonical glyph field (set by Visual Identity / Agent Forge).
  // Falls back to iconName for back-compat with seeded apps that only set
  // iconName. GlyphRenderer handles all formats (emoji, Lucide, workspace SVG).
  const effectiveGlyph = getGlyph(app);

  return (
    <motion.div
      layout
      className={cn(
        "p-4 rounded-lg border flex flex-col transition-all",
        isInstalling
          ? "bg-axiom-amber/5 border-axiom-amber/30"
          : isError
            ? "bg-axiom-rose/5 border-axiom-rose/30"
            : isActive
              ? "bg-axiom-panel/50 border-axiom-edge/40"
              : "bg-axiom-panel/20 border-axiom-edge/30 opacity-70",
      )}
    >
      {/* Header: icon + name + status */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-md flex items-center justify-center border shrink-0",
            `text-${getAccentColor(app)} border-${getAccentColor(app)}/30 bg-${getAccentColor(app)}/10`,
          )}
        >
          {isInstalling ? (
            <Loader2 className="w-5 h-5 animate-spin text-axiom-amber" />
          ) : (
            <GlyphRenderer glyph={effectiveGlyph} className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-axiom-text truncate">{app.name}</span>
            {isCore && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-cyan/15 text-axiom-cyan uppercase tracking-wider shrink-0">
                core
              </span>
            )}
            {isInstalling && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-amber/15 text-axiom-amber uppercase tracking-wider shrink-0 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-axiom-amber animate-pulse" />
                installing
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Status token — reflects the module runtime state (shared with
                Workspace → Workflows). active/standby/offline/error all derive
                from getModuleState() so the two pages never disagree. */}
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border flex items-center gap-1",
                isInstalling
                  ? "border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber"
                  : isError
                    ? "border-axiom-rose/40 bg-axiom-rose/10 text-axiom-rose"
                    : isActive
                      ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                      : isOffline
                        ? "border-axiom-edge/40 bg-axiom-panel/40 text-axiom-dim"
                        : "border-axiom-amber/30 bg-axiom-amber/10 text-axiom-amber",
              )}
            >
              <span
                className={cn(
                  "w-1 h-1 rounded-full",
                  isInstalling
                    ? "bg-axiom-amber animate-pulse"
                    : isError
                      ? "bg-axiom-rose"
                      : isActive
                        ? "bg-axiom-emerald"
                        : isOffline
                          ? "bg-axiom-dim"
                          : "bg-axiom-amber",
                )}
              />
              {isInstalling ? "installing" : state}
            </span>
            {app.port && (
              <span className="text-[9px] font-mono text-axiom-dim/50">:{app.port}</span>
            )}
          </div>
          {isError && app.moduleError && (
            <p className="text-[10px] text-axiom-rose/80 mt-1 leading-snug line-clamp-1">
              {app.moduleError}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {app.description && (
        <p className="mt-2.5 text-[11px] text-axiom-dim leading-snug flex-1 line-clamp-2">
          {app.description}
        </p>
      )}

      {/* Instance URL preview (hidden while installing — no endpoint yet) */}
      {app.instanceUrl && !isInstalling && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-axiom-dim/60 font-mono truncate">
          <Link2 className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate" title={app.instanceUrl}>{app.instanceUrl}</span>
        </div>
      )}

      {/* Actions — while installing, show a disabled "Dispatching…" state */}
      <div className="mt-3 flex items-center gap-1.5">
        {isInstalling ? (
          <div
            className="flex-1 px-2.5 py-1.5 rounded text-xs border border-axiom-amber/30 bg-axiom-amber/10 text-axiom-amber/80 flex items-center justify-center gap-1.5"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Dispatching…
          </div>
        ) : (
          <button
            onClick={onConfigure}
            className="flex-1 px-2.5 py-1.5 rounded text-xs border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Settings2 className="w-3 h-3" />
            Configure
          </button>
        )}
        {app.repoUrl && !isInstalling && (
          <button
            onClick={() => window.open(app.repoUrl, "_blank", "noopener")}
            className="w-8 h-8 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
            title="View repository"
          >
            <Github className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ModuleConfigModal — Configuration interface for infrastructure modules.
//  Contains:
//    • Instance Connection URL text input (defaults to localhost:{port})
//    • GitHub Repository URL reference block
//    • ON/OFF activation master toggle (flips the module's "active" status
//      token in the global engine manifest, enabling/disabling workflow routing)
// ════════════════════════════════════════════════════════════════════════════

function ModuleConfigModal({
  app,
  onClose,
}: {
  app: ReturnType<typeof useAxiom.getState>["apps"][number];
  onClose: () => void;
}) {
  const { setModuleActive, setModuleError, updateAppInstanceUrl } = useAxiom();
  const [instanceUrl, setInstanceUrl] = useState(app.instanceUrl ?? (app.port ? `http://localhost:${app.port}` : ""));
  // ── Module runtime state (shared with Workflows page) ──
  const state = getModuleState(app);
  const isActive = state === "active";
  const isError = state === "error";
  // Read the canonical glyph field (set by Visual Identity / Agent Forge).
  const effectiveGlyph = getGlyph(app);

  const handleToggle = () => {
    // Master ON/OFF: ON → active, OFF → offline. This also clears any error
    // state (setModuleActive clears moduleError). Projects are never deleted.
    setModuleActive(app.id, !isActive);
  };

  const handleSaveUrl = () => {
    updateAppInstanceUrl(app.id, instanceUrl.trim());
  };

  // Status description text — reflects the 4-state model so the modal agrees
  // with the card token and the Workflows page.
  const statusDescription = isActive
    ? "Active — routing workflow requests to this endpoint"
    : isError
      ? `Error — ${app.moduleError ?? "engine reported an error"}`
      : state === "standby"
        ? "Standby — enabled but not yet connected. Toggle ON to activate."
        : "Offline — toggle ON to activate and route workflow requests";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-axiom-void/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-axiom-deep border border-axiom-edge/50 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* ── Modal Header ── */}
        <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center border shrink-0",
                `text-${getAccentColor(app)} border-${getAccentColor(app)}/30 bg-${getAccentColor(app)}/10`,
              )}
            >
              <GlyphRenderer glyph={effectiveGlyph} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-axiom-text truncate">{app.name}</h3>
              <span className="text-[10px] text-axiom-dim uppercase tracking-wider">{app.category}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-5">
          {/* ── ON/OFF Master Activation Toggle ── */}
          <div className={cn(
            "p-3 rounded-lg border bg-axiom-panel/30",
            isError ? "border-axiom-rose/40" : "border-axiom-edge/40",
          )}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Power className={cn("w-4 h-4 shrink-0", isActive ? "text-axiom-emerald" : isError ? "text-axiom-rose" : "text-axiom-dim")} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-axiom-text">Activation Status</div>
                  <div className={cn("text-[10px]", isError ? "text-axiom-rose/80" : "text-axiom-dim")}>
                    {statusDescription}
                  </div>
                </div>
              </div>
              {/* Master ON/OFF switch — ON = active, OFF = offline */}
              <button
                onClick={handleToggle}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors shrink-0",
                  isActive ? "bg-axiom-emerald/60" : "bg-axiom-edge/60",
                )}
                title={isActive ? "Deactivate module" : "Activate module"}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all",
                    isActive ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
            {/* Status token readout — reflects the 4-state model */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-[9px] uppercase tracking-wider text-axiom-dim/60">Module state:</span>
              <span
                className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border font-mono",
                  isActive
                    ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                    : isError
                      ? "border-axiom-rose/40 bg-axiom-rose/10 text-axiom-rose"
                      : state === "standby"
                        ? "border-axiom-amber/30 bg-axiom-amber/10 text-axiom-amber"
                        : "border-axiom-edge/40 bg-axiom-panel/40 text-axiom-dim",
                )}
              >
                {state}
              </span>
              {/* Clear-error affordance — only shown when the module is in the
                  error state. Clicking re-derives state from enabled/connected. */}
              {isError && (
                <button
                  onClick={() => setModuleError(app.id, undefined)}
                  className="text-[9px] uppercase tracking-wider text-axiom-rose/70 hover:text-axiom-rose underline-offset-2 hover:underline"
                  title="Clear error and re-derive state"
                >
                  clear error
                </button>
              )}
            </div>
          </div>

          {/* ── Instance Connection URL ── */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5">
              <Link2 className="w-3 h-3" />
              Instance Connection URL
            </label>
            <p className="text-[10px] text-axiom-dim/60 mt-0.5 mb-2">
              The endpoint Axiom OS routes background workflow requests to when this module is active.
              Defaults to <span className="font-mono text-axiom-cyan/70">localhost:{app.port ?? "port"}</span>.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder={`http://localhost:${app.port ?? ""}`}
                className="flex-1 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-2.5 py-1.5 text-sm font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
              />
              <button
                onClick={handleSaveUrl}
                className="px-3 py-1.5 rounded text-xs border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 transition-colors shrink-0"
              >
                Save
              </button>
            </div>
            {app.instanceUrl && app.instanceUrl !== instanceUrl.trim() && (
              <p className="text-[9px] text-axiom-amber/70 mt-1.5">
                Unsaved change — click Save to persist.
              </p>
            )}
          </div>

          {/* ── GitHub Repository URL reference block ── */}
          {app.repoUrl && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5">
                <Github className="w-3 h-3" />
                GitHub Repository
              </label>
              <div className="mt-2 p-3 rounded-lg border border-axiom-edge/40 bg-axiom-panel/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Github className="w-3.5 h-3.5 text-axiom-dim shrink-0" />
                  <span className="text-xs font-mono text-axiom-text/80 truncate" title={app.repoUrl}>
                    {app.repoUrl}
                  </span>
                </div>
                <button
                  onClick={() => window.open(app.repoUrl, "_blank", "noopener")}
                  className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors shrink-0"
                  title="Open repository"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── Module metadata ── */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <MetaItem label="Source" value={app.source} />
            <MetaItem label="Default Port" value={app.port ? `:${app.port}` : "—"} />
            <MetaItem label="Workflow ID" value={app.workflowEngineId ?? "—"} />
            <MetaItem label="Install State" value={app.installState ?? "ready"} />
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 border-t border-axiom-edge/40 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] text-axiom-dim/60">
            System engine — contained to the Modules grid. Does not inject into the sidebar.
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Module Card — Published module (from DevLab) with toggle switch
// ════════════════════════════════════════════════════════════════════════════

function ModuleCard({
  mod,
  onToggle,
  onLaunch,
  onUnpublish,
}: {
  mod: ReturnType<typeof useAxiom.getState>["publishedApps"][number];
  onToggle: () => void;
  onLaunch: () => void;
  onUnpublish: () => void;
}) {
  const isIntegrated = mod.blueprint === "integrated";
  const resolvedColor = mod.customColor && mod.color ? mod.color : (mod.color ?? (isIntegrated ? "axiom-emerald" : "axiom-cyan"));
  const isCustomColor = mod.customColor ?? false;

  return (
    <motion.div
      layout
      className={cn(
        "p-4 rounded-lg border flex flex-col transition-all",
        mod.enabled
          ? "bg-axiom-panel/50 border-axiom-edge/40"
          : "bg-axiom-panel/20 border-axiom-edge/30 opacity-60",
      )}
    >
      {/* Header: glyph + name + toggle */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-md flex items-center justify-center text-xl border shrink-0",
            isCustomColor
              ? ""
              : isIntegrated
                ? "text-axiom-emerald border-axiom-emerald/30 bg-axiom-emerald/10"
                : "text-axiom-cyan border-axiom-cyan/30 bg-axiom-cyan/10",
          )}
          style={
            isCustomColor
              ? {
                  borderColor: resolvedColor + "50",
                  backgroundColor: resolvedColor + "15",
                  color: resolvedColor,
                }
              : undefined
          }
        >
          {mod.glyph || (isIntegrated ? <Package className="w-5 h-5" /> : <Globe className="w-5 h-5" />)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-axiom-text truncate">{mod.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border",
                isIntegrated
                  ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                  : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan",
              )}
            >
              {mod.blueprint}
            </span>
            {mod.githubRepoUrl && (
              <span className="text-[9px] text-axiom-dim/60 flex items-center gap-0.5">
                <Github className="w-2.5 h-2.5" />
                linked
              </span>
            )}
          </div>
        </div>
        {/* ── ON/OFF Toggle Switch ── */}
        <button
          onClick={onToggle}
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5",
            mod.enabled ? "bg-axiom-emerald/60" : "bg-axiom-edge/60",
          )}
          title={mod.enabled ? "Disable module" : "Enable module"}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
              mod.enabled ? "left-[18px]" : "left-0.5",
            )}
          />
        </button>
      </div>

      {/* Description */}
      {mod.description && (
        <p className="mt-2.5 text-[11px] text-axiom-dim leading-snug flex-1 whitespace-pre-line line-clamp-3">
          {mod.description}
        </p>
      )}

      {/* Meta info */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-axiom-dim/60">
        <span>{mod.compiledFiles.length} file{mod.compiledFiles.length !== 1 ? "s" : ""}</span>
        {mod.url && (
          <span className="truncate font-mono" title={mod.url}>
            {mod.url}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={onLaunch}
          disabled={!mod.enabled}
          className={cn(
            "flex-1 px-2.5 py-1.5 rounded text-xs border flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none",
            isIntegrated
              ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald hover:bg-axiom-emerald/20"
              : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20",
          )}
        >
          {isIntegrated ? <Play className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
          {isIntegrated ? "Run" : "Open"}
        </button>
        <button
          onClick={onUnpublish}
          className="w-8 h-8 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40 transition-colors"
          title="Unpublish module"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MetaItem — small key/value readout for the config modal
// ════════════════════════════════════════════════════════════════════════════

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-md bg-axiom-panel/30 border border-axiom-edge/30">
      <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60">{label}</div>
      <div className="text-xs text-axiom-text/80 font-mono truncate" title={value}>{value}</div>
    </div>
  );
}

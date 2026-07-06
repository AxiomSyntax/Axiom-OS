"use client";

import { useAxiom } from "@/lib/axiom/store";
import { motion } from "framer-motion";
import {
  Play, Trash2, ExternalLink, Github,
  Wifi, WifiOff, Package, AppWindow, Box, Globe,
} from "lucide-react";
import { GlyphRenderer } from "../AppIcon";
import { getVisualIdentity, getGlyph, getAccentColor, getDisplayName } from "@/lib/axiom/visual-identity";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
//  Apps Page — Application workspace for custom user-built projects,
//  sandboxed applications, and GitHub integrations.
//
//  This is the APPLICATION section of Axiom OS. It hosts user-facing app
//  workspaces (e.g. Creative Testing Lab) that run as native keep-alive tabs
//  inside the OS viewport. System infrastructure (n8n, LangFlow, etc.) lives
//  on the Modules page, not here.
//
//  Toggling an app ON mounts its nav link in the APPS sidebar group and lets
//  it run as a background-persistent browser tab. Toggling OFF ejects it.
// ════════════════════════════════════════════════════════════════════════════

/** Categories that belong on the Modules page (system infrastructure), excluded here. */
const MODULE_CATEGORIES = ["Workflow Engine", "AI Core"] as const;

export default function AppsPage() {
  const {
    apps,
    uninstallApp,
    toggleAppEnabled,
    launchInstalledApp,
    connectApp,
    disconnectApp,
  } = useAxiom();

  // ── Derived — only show user apps (not system infrastructure) ──
  const userApps = apps.filter((a) => !MODULE_CATEGORIES.includes(a.category as typeof MODULE_CATEGORIES[number]));
  const enabledCount = userApps.filter((a) => a.enabled).length;

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ──
          No "Open DevLab" button here — the single authoritative entryway to
          the DevLab developer workspace is the dedicated "DevLab" navigation
          link in the left-hand main sidebar under the DEVELOPMENT category. */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text flex items-center gap-2">
            <AppWindow className="w-4 h-4 text-axiom-cyan" />
            Apps
          </h2>
          <p className="text-[11px] text-axiom-dim">
            Custom projects, sandboxed applications, and GitHub integrations.
            <span className="text-axiom-cyan/70"> Toggle ON to mount in the APPS sidebar</span>
            <span className="text-axiom-dim/60"> · apps run as keep-alive background tabs.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-axiom-dim tabular-nums">
            {enabledCount}/{userApps.length} enabled
          </span>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-6">
        {/* ═══ Installed Apps Grid ═══ */}
        {userApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-xl border border-axiom-edge/40 bg-axiom-panel/40 flex items-center justify-center mb-4">
              <Box className="w-6 h-6 text-axiom-dim/50" />
            </div>
            <h3 className="text-sm text-axiom-text mb-1">No Apps Yet</h3>
            <p className="text-[11px] text-axiom-dim max-w-xs">
              Install apps from DevLab → Integration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {userApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onLaunch={() => launchInstalledApp(app.id)}
                onToggle={() => toggleAppEnabled(app.id)}
                onUninstall={() => {
                  if (confirm(`Uninstall ${app.name}?`)) uninstallApp(app.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  App Card — Installed app with launch, toggle, and actions
// ════════════════════════════════════════════════════════════════════════════

function AppCard({
  app,
  onLaunch,
  onToggle,
  onUninstall,
}: {
  app: ReturnType<typeof useAxiom.getState>["apps"][number];
  onLaunch: () => void;
  onToggle: () => void;
  onUninstall: () => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "p-4 rounded-lg border flex flex-col transition-all",
        app.enabled
          ? "bg-axiom-panel/50 border-axiom-edge/40"
          : "bg-axiom-panel/20 border-axiom-edge/30 opacity-60",
      )}
    >
      {/* Header: icon + name + toggle — reads from shared VisualIdentity */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-md flex items-center justify-center border shrink-0",
            `text-${getAccentColor(app)} border-${getAccentColor(app)}/30 bg-${getAccentColor(app)}/10`,
          )}
        >
          <GlyphRenderer glyph={getGlyph(app)} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-axiom-text truncate">{getDisplayName(app)}</span>
            {app.enabled && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald uppercase tracking-wider flex items-center gap-1 shrink-0">
                <span className="w-1 h-1 rounded-full bg-axiom-emerald" />
                in APPS
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan">
              {app.source}
            </span>
            {app.sourceUrl && (
              <span className="text-[9px] text-axiom-dim/60 flex items-center gap-0.5">
                <Github className="w-2.5 h-2.5" />
                linked
              </span>
            )}
            {app.liveUrl && (
              <span className="text-[9px] text-axiom-emerald/70 flex items-center gap-0.5">
                <Globe className="w-2.5 h-2.5" />
                integrated
              </span>
            )}
          </div>
        </div>
        {/* ── ON/OFF Toggle Switch — mounts/unmounts from the APPS sidebar ── */}
        <button
          onClick={onToggle}
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5",
            app.enabled ? "bg-axiom-cyan/60" : "bg-axiom-edge/60",
          )}
          title={app.enabled ? "Disable — removes from APPS sidebar" : "Enable — mounts in APPS sidebar"}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
              app.enabled ? "left-[18px]" : "left-0.5",
            )}
          />
        </button>
      </div>

      {/* Description */}
      {app.description && (
        <p className="mt-2.5 text-[11px] text-axiom-dim leading-snug flex-1">
          {app.description}
        </p>
      )}

      {/* Meta info */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-axiom-dim/60">
        <span className="capitalize">{app.category}</span>
        {app.port && (
          <span className="font-mono">:{app.port}</span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={onLaunch}
          disabled={!app.enabled}
          className="flex-1 px-2.5 py-1.5 rounded text-xs border flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20"
        >
          <Play className="w-3 h-3" />
          Open Tab
        </button>
        {app.sourceUrl && (
          <button
            onClick={() => window.open(app.sourceUrl, "_blank", "noopener")}
            className="w-8 h-8 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
            title="View source"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onUninstall}
          className="w-8 h-8 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40 transition-colors"
          title="Uninstall app"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

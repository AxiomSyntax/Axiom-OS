"use client";

// ════════════════════════════════════════════════════════════════════════════
//  Workflows — Overview / Launcher
//
//  This page is the user-facing workspace built on top of the workflow-engine
//  MODULES registered in Infrastructure → Modules. Modules own ALL runtime
//  state (activation, version, provider, health, endpoint, color, icon). This
//  page never duplicates runtime information — it discovers engines dynamically
//  via getWorkflowEngineModules(apps) and reads each engine's state/version/
//  endpoint straight from the module record.
//
//  Adding a new workflow engine requires ONLY registering another module (an
//  InstalledApp with category "Workflow Engine" + a unique workflowEngineId).
//  This page automatically consumes it — no code changes here.
//
//  Projects / tabs / folders are USER CONTENT. They are never deleted by module
//  state changes (disable/stop/uninstall only removes the runtime). When a
//  module becomes active again, every previous project immediately becomes
//  usable again.
//
//  Opening a project calls openWorkflowProjectTab(projectId) on the store,
//  which mounts (or focuses) a persistent tab in WorkflowTabStack — the
//  engine's iframe stays alive across navigation so in-progress work is not
//  lost when the user switches pages.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useAxiom } from "@/lib/axiom/store";
import {
  getWorkflowEngineModules,
  DEFAULT_WORKFLOW_ENGINE_ICON,
  type ModuleRuntimeState,
  type WorkflowEngineModule,
} from "@/lib/axiom/types";
import type { WorkflowProject } from "@/lib/axiom/types";
import { GlyphRenderer } from "../AppIcon";
import {
  GitBranch,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Brand-class generator ───────────────────────────────────────────────────
// All per-engine theming (accent bar, icon wrap, badge, launcher button,
// project button, filter pill) derives from the module's color token. This
// replaces the old hardcoded TOOL_META map — engines are now fully dynamic,
// so a 3rd engine's theme is generated from its module color with no code
// changes here. Storing complete literal class strings keeps Tailwind's
// content scanner happy (no `bg-${color}` at render time).
function brandClasses(color: string) {
  return {
    accentBar: `bg-${color}`,
    iconWrap: `bg-${color}/10 border-${color}/30 text-${color}`,
    badge: `bg-${color}/10 border-${color}/30 text-${color}`,
    launcherButton: `bg-${color}/10 hover:bg-${color}/20 text-${color} border-${color}/30`,
    projectButton: `bg-axiom-panel hover:bg-${color}/15 text-axiom-text hover:text-${color} border-axiom-edge/40 hover:border-${color}/40`,
    filterActive: `bg-${color}/15 text-${color} border-${color}/40`,
  };
}

// ── Filter pills ────────────────────────────────────────────────────────────

type FilterValue = "all" | string; // string = engineId (dynamic)

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const { workflowProjects, openWorkflowProjectTab, createWorkflowProject, apps, openWorkflowTabs } = useAxiom();
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");

  // ── Discover engines from the MODULE registry (single source of truth) ──
  // getWorkflowEngineModules(apps) returns one record per registered workflow-
  // engine module. This page never hardcodes engine ids — adding a 3rd engine
  // only requires registering a module, and it shows up here automatically.
  const modules = useMemo(() => getWorkflowEngineModules(apps), [apps]);

  // Counts per filter for pill badges. Derived from workflowProjects grouped
  // by toolId — no per-engine constants.
  const counts = useMemo(() => {
    const byTool: Record<string, number> = {};
    for (const m of modules) byTool[m.engineId] = 0;
    for (const p of workflowProjects) {
      byTool[p.toolId] = (byTool[p.toolId] ?? 0) + 1;
    }
    return { all: workflowProjects.length, ...byTool };
  }, [workflowProjects, modules]);

  const visibleProjects =
    activeFilter === "all"
      ? workflowProjects
      : workflowProjects.filter((p) => p.toolId === activeFilter);

  // When workflow tabs are open, the tab bar (h-9 = 36px) floats at the top.
  // Add padding-top so the page content isn't cut off.
  const hasOpenTabs = openWorkflowTabs.length > 0;

  return (
    <div className={cn("h-full flex flex-col", hasOpenTabs && "pt-9")}>
      {/* ── Header ── */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-axiom-violet" />
            Workflows
          </h2>
          <p className="text-[11px] text-axiom-dim">
            Browser-style keep-alive workflow automation.
            <span className="text-axiom-violet/70"> Open a tool to mount it as a persistent tab.</span>
            <span className="text-axiom-dim/60"> · switch pages without losing state.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-axiom-dim tabular-nums">
            {workflowProjects.length} projects
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-5">
        {/* ═══ Tool launcher cards (one per registered engine module) ═══ */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] uppercase tracking-wider text-axiom-dim/80">
              Tools
            </h3>
          </div>
          {modules.length === 0 ? (
            <div className="text-[11px] text-axiom-dim/60 italic px-1 py-2">
              No workflow engines registered. Install one in Infrastructure → Modules.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {modules.map((mod) => (
                <ToolLauncherCard
                  key={mod.engineId}
                  module={mod}
                  onOpen={() => {
                    // Module state guard: only create+open when the backing
                    // module is "active". The store also enforces this, but
                    // gating here gives immediate UI feedback.
                    if (mod.state !== "active") return;
                    const newId = createWorkflowProject(mod.engineId);
                    if (newId) openWorkflowProjectTab(newId);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ═══ Projects ═══ */}
        <section>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h3 className="text-[11px] uppercase tracking-wider text-axiom-dim/80">
              Projects
            </h3>
            {/* Filter pills — built dynamically from registered engine modules.
                "All" + one pill per engine. New engines get a pill automatically. */}
            <div className="flex items-center gap-1">
              <FilterPill
                id="all"
                label="All"
                count={counts.all ?? 0}
                isActive={activeFilter === "all"}
                activeClass="bg-axiom-cyan/15 text-axiom-cyan border-axiom-cyan/40"
                onClick={() => setActiveFilter("all")}
              />
              {modules.map((mod) => (
                <FilterPill
                  key={mod.engineId}
                  id={mod.engineId}
                  label={mod.name}
                  count={counts[mod.engineId] ?? 0}
                  isActive={activeFilter === mod.engineId}
                  activeClass={brandClasses(mod.color).filterActive}
                  onClick={() => setActiveFilter(mod.engineId)}
                />
              ))}
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl border border-axiom-edge/40 bg-axiom-panel/40 flex items-center justify-center mb-3">
                <GitBranch className="w-5 h-5 text-axiom-dim/50" />
              </div>
              <h4 className="text-sm text-axiom-text mb-1">No Projects Yet</h4>
              <p className="text-[11px] text-axiom-dim max-w-xs">
                {activeFilter === "all"
                  ? "Open a tool above to start building your first workflow."
                  : `No ${(modules.find((m) => m.engineId === activeFilter)?.name ?? "selected tool")} projects yet — open the tool to create one.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleProjects.map((project) => {
                // Resolve the project's engine module to read its current state.
                // Projects never store runtime state themselves — they read it
                // from the module, so a module state change instantly reflects.
                const mod = modules.find((m) => m.engineId === project.toolId);
                const canOpen = mod?.state === "active";
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    module={mod}
                    canOpen={canOpen}
                    onOpen={() => openWorkflowProjectTab(project.id)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Tool launcher card ──────────────────────────────────────────────────────

/** Status badge config per module state — the single source of truth for how
 *  each state renders on a launcher card. The page reads `mod.state` from the
 *  module record (no duplicated status logic here). */
const STATE_BADGE: Record<ModuleRuntimeState, { label: string; dot: string; wrap: string }> = {
  active: { label: "Ready", dot: "bg-axiom-emerald", wrap: "bg-axiom-emerald/10 text-axiom-emerald border-axiom-emerald/30" },
  standby: { label: "Standby", dot: "bg-axiom-amber", wrap: "bg-axiom-amber/10 text-axiom-amber border-axiom-amber/30" },
  offline: { label: "Offline", dot: "bg-axiom-dim/60", wrap: "bg-axiom-panel text-axiom-dim border-axiom-edge/40" },
  error: { label: "Error", dot: "bg-axiom-rose", wrap: "bg-axiom-rose/10 text-axiom-rose border-axiom-rose/30" },
};

/** Inline message shown under the Open button when the module is not active.
 *  Per the Modules ↔ Workflows state contract: offline shows an activation
 *  prompt; error shows the error; standby shows a brief standby hint. */
const STATE_MESSAGE: Record<ModuleRuntimeState, string> = {
  active: "",
  standby: "Engine is on standby. Activate it in Infrastructure → Modules to create or run workflows.",
  offline: "Engine is offline. Activate it in Infrastructure → Modules first.",
  error: "Engine reported an error. Resolve it in Infrastructure → Modules to continue.",
};

function ToolLauncherCard({
  module: mod,
  onOpen,
}: {
  module: WorkflowEngineModule;
  onOpen: () => void;
}) {
  const brand = brandClasses(mod.color);
  const badge = STATE_BADGE[mod.state];
  const canOpen = mod.state === "active";
  const message = STATE_MESSAGE[mod.state];
  return (
    <div
      className={cn(
        "group relative rounded-lg border border-axiom-edge/40 bg-axiom-panel/60 overflow-hidden",
        "transition-all hover:border-axiom-edge/80 hover:bg-axiom-panel",
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-1 w-full", brand.accentBar)} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center border",
              brand.iconWrap,
            )}
          >
            <GlyphRenderer glyph={mod.iconName ?? DEFAULT_WORKFLOW_ENGINE_ICON} className="w-4 h-4" />
          </div>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border tabular-nums flex items-center gap-1",
              badge.wrap,
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", badge.dot)} />
            {badge.label}
          </span>
        </div>

        <h4 className="text-sm font-medium text-axiom-text mb-1">{mod.name}</h4>
        <p className="text-[11px] text-axiom-dim leading-relaxed mb-3 line-clamp-2">
          {mod.description}
        </p>

        <button
          onClick={onOpen}
          disabled={!canOpen}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium border",
            "transition-all",
            canOpen && "group-hover:translate-x-0.5",
            canOpen
              ? brand.launcherButton
              : "bg-axiom-panel/40 text-axiom-dim/60 border-axiom-edge/30 cursor-not-allowed",
          )}
        >
          {`Open ${mod.name}`}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Inline state message — shown when the module is not active. This is
            required by the state contract (offline → "activate the engine";
            error → error state) and renders inline, not as a new component. */}
        {message && (
          <p className="mt-2 text-[10px] text-axiom-dim/70 leading-snug">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Filter pill ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  count,
  isActive,
  activeClass,
  onClick,
}: {
  id: string;
  label: string;
  count: number;
  isActive: boolean;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border flex items-center gap-1.5",
        isActive
          ? activeClass
          : "text-axiom-dim hover:text-axiom-text border-axiom-edge/40 hover:border-axiom-edge/70",
      )}
    >
      {label}
      <span
        className={cn(
          "text-[10px] tabular-nums",
          isActive ? "opacity-70" : "text-axiom-dim/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ── Project card ────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  module: mod,
  canOpen,
  onOpen,
}: {
  project: WorkflowProject;
  module?: WorkflowEngineModule;
  canOpen: boolean;
  onOpen: () => void;
}) {
  // Resolve brand classes from the module's color. If the module was
  // unregistered (shouldn't normally happen), fall back to a neutral palette
  // so the project card still renders — projects are never deleted.
  const color = mod?.color ?? "axiom-dim";
  const brand = brandClasses(color);
  const tagline = mod?.name ?? project.toolId;
  return (
    <div
      className={cn(
        "group relative rounded-lg border border-axiom-edge/40 bg-axiom-panel/60 overflow-hidden",
        "transition-all hover:border-axiom-edge/80 hover:bg-axiom-panel",
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-1 w-full", brand.accentBar)} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
              brand.badge,
            )}
          >
            <GlyphRenderer glyph={mod?.iconName ?? DEFAULT_WORKFLOW_ENGINE_ICON} className="w-3 h-3" />
            {tagline}
          </span>
        </div>

        <h4 className="text-sm font-medium text-axiom-text mb-1 line-clamp-1">
          {project.name}
        </h4>
        <p className="text-[11px] text-axiom-dim leading-relaxed mb-3 line-clamp-2 min-h-[2.4em]">
          {project.description ?? "No description provided."}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-axiom-dim/70 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(project.lastModified)}
          </span>
          <button
            onClick={onOpen}
            disabled={!canOpen}
            title={canOpen ? "Open in Tab" : "Activate the engine in Infrastructure → Modules first"}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all",
              canOpen
                ? brand.projectButton
                : "bg-axiom-panel/40 text-axiom-dim/50 border-axiom-edge/30 cursor-not-allowed",
            )}
          >
            Open in Tab
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

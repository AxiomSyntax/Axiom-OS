"use client";

import { useMemo } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { NavGroup, NavItem, PageId } from "@/lib/axiom/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  Brain,
  Wrench,
  Bot,
  GitBranch,
  Users,
  Cpu,
  AppWindow,
  Code2,
  Package,
  Plug,
  Settings,
  Info,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  Boxes,
  X,
} from "lucide-react";
import { GlyphRenderer } from "./AppIcon";
import { getGlyph, getAccentColor } from "@/lib/axiom/visual-identity";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
//  Axiom OS Sidebar — v0.4 (4-tier navigation + dynamic APPS injection)
//
//  Hierarchy (top → bottom):
//    1. HOME            — Jarvis chat viewport (standalone)
//    2. WORKSPACE       — Dashboard, Brain, Skills & Tools, Agent Hub, Workflows
//    3. APPS            — DYNAMIC: enabled executable apps mount their nav links here
//    4. INFRASTRUCTURE   — Backend control: Agents, Engines, Modules, Apps
//    5. DEVELOPMENT     — DevLab, Integrations (secondary)
//    6. Footer          — Settings, About
//
//  SECTION 2 (Dynamic Sidebar App Injection): the APPS group reads
//  `apps.filter(a => a.enabled)` from the store. When an app is toggled ON in
//  INFRASTRUCTURE → Apps, its nav link instantly appears here. Toggled OFF → unmounts.
//  Clicking an APPS link opens the app into the keep-alive tab stack.
//
//  DESIGN MANDATE: items inside the APPS group use minimalist Lucide line-art
//  icons (resolved via AppIcon from app.iconName) — NEVER emoji glyphs.
// ════════════════════════════════════════════════════════════════════════════

// Map page id -> icon (for static nav items only; dynamic APPS items use AppGlyph)
const ICONS: Record<PageId, typeof Home> = {
  home: Home,
  dashboard: LayoutDashboard,
  brain: Brain,
  "skills-tools": Wrench,
  "agent-hub": Bot,
  workflows: GitBranch,
  agents: Users,
  engines: Cpu,
  "llm-registry": Cpu,
  apps: AppWindow,
  modules: Package,
  devlab: Code2,
  integrations: Plug,
  settings: Settings,
  about: Info,
};

const COLORS: Record<PageId, string> = {
  home: "axiom-cyan",
  dashboard: "axiom-amber",
  brain: "axiom-violet",
  "skills-tools": "axiom-emerald",
  "agent-hub": "axiom-emerald",
  workflows: "axiom-cyan",
  agents: "axiom-cyan",
  engines: "axiom-amber",
  "llm-registry": "axiom-cyan",
  apps: "axiom-cyan",
  modules: "axiom-amber",
  devlab: "axiom-emerald",
  integrations: "axiom-violet",
  settings: "axiom-dim",
  about: "axiom-dim",
};

// Static groups — MODELS is injected dynamically between WORKSPACE and INFRASTRUCTURE.
const STATIC_GROUPS: NavGroup[] = [
  {
    id: "WORKSPACE",
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", glyph: "▦", color: "axiom-amber", description: "OS overview & costs" },
      { id: "brain", label: "Brain", glyph: "✶", color: "axiom-violet", description: "Graph universe + folders" },
      { id: "skills-tools", label: "Skills & Tools", glyph: "⚒", color: "axiom-emerald", description: "AI skills + tools" },
      { id: "agent-hub", label: "Agent Hub", glyph: "◎", color: "axiom-emerald", description: "Chat with installed agents" },
      { id: "workflows", label: "Workflows", glyph: "⇄", color: "axiom-cyan", description: "Workflow automation tools" },
    ],
  },
  {
    id: "INFRASTRUCTURE",
    label: "Infrastructure",
    items: [
      { id: "agents", label: "Agents", glyph: "👥", color: "axiom-cyan", description: "Install & run agents" },
      { id: "engines", label: "Engines", glyph: "🜂", color: "axiom-amber", description: "AI models & backend control" },
      { id: "modules", label: "Modules", glyph: "⧉", color: "axiom-amber", description: "Published modules & tools" },
      { id: "apps", label: "App Manager", glyph: "⊡", color: "axiom-cyan", description: "Manage installed applications" },
    ],
  },
  {
    id: "DEVELOPMENT",
    label: "Development",
    items: [
      { id: "devlab", label: "DevLab", glyph: "⌬", color: "axiom-emerald", description: "VibeCode + AI sidekick" },
      { id: "integrations", label: "Integrations", glyph: "🔌", color: "axiom-violet", description: "Monitor all connections" },
    ],
  },
];

export default function Sidebar() {
  const {
    currentPage,
    navigate,
    sidebarCollapsed,
    toggleSidebar,
    collapsedGroups,
    toggleGroup,
    installedAgents,
    apps,
    engines,
    // App tab stack (keep-alive)
    openAppTabs,
    activeAppTabId,
    openAppTab,
    focusAppTab,
    closeAppTab,
    viewMode,
    // Workflow projects (for badge count)
    workflowProjects,
    // Profiles — filter which apps are visible in the APPS group
    getActiveProfile,
  } = useAxiom();

  // ── Dynamic APPS group: enabled apps from the Apps Registry ──
  // Profile-aware: when the active profile has a non-empty visibleAppIds set,
  // only those apps appear. Global profile + empty-set profiles = all apps.
  const SIDEBAR_EXCLUDED_CATEGORIES = ["Workflow Engine", "AI Core"] as const;
  const activeProfile = getActiveProfile();
  const enabledApps = useMemo(
    () =>
      apps.filter(
        (a) =>
          a.enabled &&
          !SIDEBAR_EXCLUDED_CATEGORIES.includes(a.category as typeof SIDEBAR_EXCLUDED_CATEGORIES[number]) &&
          // Profile visibility: Global or empty set = all visible; otherwise only listed IDs.
          (activeProfile.isGlobal || activeProfile.visibility.visibleAppIds.length === 0 || activeProfile.visibility.visibleAppIds.includes(a.id)),
      ),
    [apps, activeProfile],
  );
  // Modules badge: the integer value of verified, active system architecture
  // nodes inside the ModulesPage array (infra apps that are enabled+connected).
  // Apps badge: count of compiled custom projects / GitHub integrations on the
  // AppsPage, completely isolated from infra — excludes Workflow Engine / AI
  // Core categories so n8n / Whisper / etc. never leak into the App tier.
  const activeInfraCount = useMemo(
    () =>
      apps.filter(
        (a) =>
          SIDEBAR_EXCLUDED_CATEGORIES.includes(a.category as typeof SIDEBAR_EXCLUDED_CATEGORIES[number]) &&
          a.enabled &&
          a.connected,
      ).length,
    [apps],
  );
  const userAppsCount = useMemo(
    () =>
      apps.filter(
        (a) => !SIDEBAR_EXCLUDED_CATEGORIES.includes(a.category as typeof SIDEBAR_EXCLUDED_CATEGORIES[number]),
      ).length,
    [apps],
  );

  // ── Build the full group list with APPS injected dynamically ──
  // Order: WORKSPACE, APPS (dynamic), INFRASTRUCTURE, DEVELOPMENT
  const appsGroup: NavGroup = {
    id: "APPS",
    label: "Apps",
    items: enabledApps.map((a) => ({
      id: "apps" as PageId,
      label: a.name,
      glyph: a.glyph,
      color: a.color,
      description: a.description,
    })),
  };

  const groups: NavGroup[] = [
    STATIC_GROUPS[0], // WORKSPACE
    appsGroup,
    STATIC_GROUPS[1], // INFRASTRUCTURE
    STATIC_GROUPS[2], // DEVELOPMENT
  ];

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 248 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="absolute top-0 left-0 bottom-0 z-[900] bg-axiom-deep/85 backdrop-blur-xl border-r border-axiom-edge/40 flex flex-col"
    >
      {/* ── Brand ── */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-axiom-edge/40 shrink-0">
        <button
          onClick={() => {
            if (sidebarCollapsed) {
              toggleSidebar();
            } else {
              navigate("home");
            }
          }}
          className="flex items-center gap-2 group min-w-0"
          title={sidebarCollapsed ? "Expand sidebar" : "Home"}
        >
          <div className="relative w-6 h-6 shrink-0">
            <div className="absolute inset-0 rounded-full border border-axiom-cyan/60" />
            <div className="absolute inset-1.5 rounded-full bg-axiom-cyan/80" />
            <div className="absolute inset-0 rounded-full border border-axiom-cyan/30 axiom-pulse-ring" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium tracking-[0.2em] text-axiom-text leading-none">
                AXIOM <span className="text-axiom-cyan">OS</span>
              </span>
              <span className="text-[9px] text-axiom-dim leading-none mt-0.5">
                v0.4.0
              </span>
            </div>
          )}
        </button>
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors shrink-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── HOME (top-level standalone) ── */}
      <div className="p-2 border-b border-axiom-edge/40">
        <NavButton
          item={{
            id: "home",
            label: "Home",
            glyph: "⌂",
            color: "axiom-cyan",
          }}
          active={viewMode === "page" && currentPage === "home"}
          collapsed={sidebarCollapsed}
          onClick={() => navigate("home")}
        />
      </div>

      {/* ── Groups (WORKSPACE → APPS → INFRASTRUCTURE → DEVELOPMENT) ── */}
      <nav className="flex-1 overflow-y-auto axiom-scroll py-2 px-2 space-y-2">
        {groups.map((group) => {
          const collapsed = collapsedGroups[group.id];
          const isApps = group.id === "APPS";

          return (
            <div key={group.id}>
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-dim hover:text-axiom-text/80 transition-colors",
                    isApps && "axiom-models-header",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isApps && <Boxes className="w-3 h-3 text-axiom-cyan/70" />}
                    {group.label}
                  </span>
                  {collapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
              {sidebarCollapsed && (
                <div className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-dim/50 text-center">
                  {group.label.slice(0, 3)}
                </div>
              )}
              <AnimatePresence initial={false}>
                {(!collapsed || sidebarCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden space-y-0.5 mt-1"
                  >
                    {/* ── APPS empty state ── */}
                    {isApps && enabledApps.length === 0 && !sidebarCollapsed && (
                      <div className="px-2 py-2 text-[10px] text-axiom-dim/50 italic border border-dashed border-axiom-edge/30 rounded-md">
                        No active apps.
                        <button
                          onClick={() => navigate("apps")}
                          className="ml-1 text-axiom-cyan/70 hover:text-axiom-cyan underline-offset-2 hover:underline not-italic"
                        >
                          Enable in Apps →
                        </button>
                      </div>
                    )}

                    {/* ── APPS: dynamic app nav links ── */}
                    {isApps &&
                      enabledApps.map((app) => {
                        const isOpen = openAppTabs.some((t) => t.appId === app.id);
                        const isActive =
                          viewMode === "app" && activeAppTabId === app.id;
                        return (
                          <AppNavItem
                            key={app.id}
                            app={app}
                            isOpen={isOpen}
                            isActive={isActive}
                            collapsed={sidebarCollapsed}
                            onOpen={() => openAppTab(app.id)}
                            onFocus={() => focusAppTab(app.id)}
                            onClose={() => closeAppTab(app.id)}
                          />
                        );
                      })}

                    {/* ── Static nav items (WORKSPACE / INFRASTRUCTURE / DEVELOPMENT) ── */}
                    {!isApps &&
                      group.items.map((item) => {
                        const isActive = viewMode === "page" && currentPage === item.id;
                        const badge = getBadge(
                          item.id,
                          installedAgents.filter((a) => a.enabled && !a.isSystemAgent).length,
                          engines.length,
                          activeInfraCount,
                          userAppsCount,
                          workflowProjects.length,
                        );
                        return (
                          <NavButton
                            key={item.id}
                            item={item}
                            active={isActive}
                            collapsed={sidebarCollapsed}
                            badge={badge}
                            onClick={() => navigate(item.id)}
                          />
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Footer: Settings + About ── */}
      <div className="border-t border-axiom-edge/40 p-2 space-y-0.5">
        <NavButton
          item={{
            id: "settings",
            label: "Settings",
            glyph: "⚙",
            color: "axiom-dim",
          }}
          active={viewMode === "page" && currentPage === "settings"}
          collapsed={sidebarCollapsed}
          onClick={() => navigate("settings")}
        />
        <NavButton
          item={{
            id: "about",
            label: "About",
            glyph: "ⓘ",
            color: "axiom-dim",
          }}
          active={viewMode === "page" && currentPage === "about"}
          collapsed={sidebarCollapsed}
          onClick={() => navigate("about")}
        />
      </div>
    </motion.aside>
  );
}

function getBadge(
  pageId: PageId,
  agentCount: number,
  engineCount: number,
  activeInfraCount: number,
  userAppsCount: number,
  workflowProjectsCount?: number,
): number | undefined {
  if (pageId === "agents") return agentCount;
  if (pageId === "engines") return engineCount;
  // Apps badge: ONLY user-facing apps (excludes infra categories). Isolated
  // from the Module array so n8n / Whisper / etc. never leak into App tier.
  if (pageId === "apps") return userAppsCount;
  // Modules badge: the count of verified, active system architecture nodes
  // (infra apps that are enabled+connected) on the ModulesPage grid.
  if (pageId === "modules") return activeInfraCount;
  // Workflows badge: total workflow project count (n8n + LangFlow combined)
  if (pageId === "workflows") return workflowProjectsCount;
  return undefined;
}

// ════════════════════════════════════════════════════════════════════════════
//  NavButton — static page nav item (WORKSPACE / INFRASTRUCTURE / DEVELOPMENT / HOME)
// ════════════════════════════════════════════════════════════════════════════
function NavButton({
  item,
  active,
  collapsed,
  badge,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = ICONS[item.id];
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-all group relative",
        active
          ? "bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-text"
          : "border border-transparent text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60",
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full",
            `bg-${item.color}`,
          )}
        />
      )}
      <Icon
        className={cn(
          "w-3.5 h-3.5 shrink-0 transition-colors",
          active ? `text-${item.color}` : "text-axiom-dim group-hover:text-axiom-text",
        )}
      />
      {!collapsed && (
        <span className="flex-1 text-left truncate">{item.label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-axiom-panel/80 text-axiom-dim tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  AppNavItem — dynamic APPS group item.
//  Renders a minimalist Lucide line-art icon + name, an "open tab" dot
//  indicator, and a close button when the tab is already open.
// ════════════════════════════════════════════════════════════════════════════

function AppNavItem({
  app,
  isOpen,
  isActive,
  collapsed,
  onOpen,
  onFocus,
  onClose,
}: {
  app: {
    id: string;
    name: string;
    glyph?: string;
    color: string;
    description?: string;
    iconName?: string;
  };
  isOpen: boolean;
  isActive: boolean;
  collapsed: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onClose: () => void;
}) {
  return (
    <button
      onClick={() => (isOpen ? onFocus() : onOpen())}
      title={collapsed ? app.name : app.description || app.name}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-all group relative",
        isActive
          ? "axiom-app-nav-active bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-text"
          : "border border-transparent text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60",
      )}
    >
      {isActive && (
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full",
            `bg-${app.color}`,
          )}
        />
      )}
      <GlyphRenderer
        glyph={getGlyph(app)}
        className={cn(
          "w-3.5 h-3.5 shrink-0 transition-colors",
          isActive ? `text-${getAccentColor(app)}` : "text-axiom-dim group-hover:text-axiom-text",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{app.name}</span>
          {isOpen && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-axiom-emerald shrink-0 axiom-pulse-ring--status"
              title="Running in background"
            />
          )}
        </>
      )}
      {!collapsed && isOpen && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Close app tab"
        >
          <X className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

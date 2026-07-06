"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAxiom } from "@/lib/axiom/store";
import type { PageId } from "@/lib/axiom/types";
import { Activity, Cpu, Wifi, ChevronRight, FolderOpen, PanelRight, Lock, ChevronDown, Plus, Trash2, Check, X } from "lucide-react";
import { GlyphRenderer } from "./AppIcon";
import { AssetPicker } from "./AssetPicker";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<PageId, string> = {
  home: "Home",
  dashboard: "Dashboard",
  brain: "Brain",
  "skills-tools": "Skills & Tools",
  "agent-hub": "Agent Hub",
  workflows: "Workflows",
  agents: "Agents",
  engines: "Engines",
  "llm-registry": "LLM Registry",
  apps: "Apps",
  modules: "Modules",
  devlab: "DevLab",
  integrations: "Integrations",
  settings: "Settings",
  about: "About",
};

const PAGE_GROUPS: Record<PageId, string | null> = {
  home: null,
  dashboard: "Workspace",
  brain: "Workspace",
  "skills-tools": "Workspace",
  "agent-hub": "Workspace",
  workflows: "Workspace",
  agents: "Infrastructure",
  engines: "Infrastructure",
  "llm-registry": "Infrastructure",
  apps: "Infrastructure",
  modules: "Infrastructure",
  devlab: "Development",
  integrations: "Development",
  settings: null,
  about: null,
};

export default function TopBar() {
  const currentPage = useAxiom((s) => s.currentPage);
  const viewMode = useAxiom((s) => s.viewMode);
  const activeAppTabId = useAxiom((s) => s.activeAppTabId);
  const openAppTabs = useAxiom((s) => s.openAppTabs);
  const agentStatus = useAxiom((s) => s.agentStatus);
  const telemetry = useAxiom((s) => s.telemetry);
  const graph = useAxiom((s) => s.graph);
  const installedAgents = useAxiom((s) => s.installedAgents);
  const providers = useAxiom((s) => s.providers);
  const chatArchiveOpen = useAxiom((s) => s.chatArchiveOpen);
  const toggleChatArchive = useAxiom((s) => s.toggleChatArchive);

  // Archive is only functional on chat-capable pages (and never in app mode)
  const archiveEnabled =
    viewMode !== "app" &&
    (currentPage === "home" || currentPage === "agent-hub" || currentPage === "devlab" || currentPage === "workflows");
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      setNow(`${hh}:${mm}:${ss}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const activeAgents = Object.values(agentStatus).filter(
    (s) => s !== "offline" && s !== "idle",
  ).length;
  const lastSample = telemetry[telemetry.length - 1];
  const cpu = lastSample ? Math.round(lastSample.cpu * 100) : 0;
  const mem = lastSample ? Math.round(lastSample.mem * 100) : 0;
  const totalCost = installedAgents.reduce((acc, a) => acc + a.costUsd, 0);
  const connectedProviders = providers.filter((p) => p.enabled && p.connected).length;

  const group = PAGE_GROUPS[currentPage];

  // When an app tab is focused, the breadcrumb shows Apps → AppName instead
  // of the underlying routed page (which stays mounted underneath invisibly).
  const activeTab =
    viewMode === "app" && activeAppTabId
      ? openAppTabs.find((t) => t.appId === activeAppTabId)
      : null;

  return (
    <div className="h-10 shrink-0 bg-axiom-deep/90 backdrop-blur-md border-b border-axiom-edge/40 flex items-center justify-between px-4 text-xs select-none">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        {activeTab ? (
          <>
            <span className="text-axiom-cyan/80 uppercase tracking-[0.15em] text-[10px]">
              Apps
            </span>
            <ChevronRight className="w-3 h-3 text-axiom-dim/50" />
            <span className="text-axiom-text font-medium flex items-center gap-1.5">
              <GlyphRenderer glyph={activeTab.iconName} className={`w-3.5 h-3.5 text-${activeTab.color}`} textClassName="text-sm leading-none" />
              {activeTab.title}
            </span>
            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-axiom-emerald axiom-pulse-ring--status" />
              live tab
            </span>
          </>
        ) : (
          <>
            {group && (
              <>
                <span className="text-axiom-dim uppercase tracking-[0.15em] text-[10px]">
                  {group}
                </span>
                <ChevronRight className="w-3 h-3 text-axiom-dim/50" />
              </>
            )}
            <span className="text-axiom-text font-medium">
              {PAGE_LABELS[currentPage]}
            </span>
          </>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-5 text-axiom-dim">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              activeAgents > 0 ? "bg-axiom-emerald" : "bg-axiom-dim",
            )}
          />
          <span>{activeAgents} active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-axiom-cyan/80">{graph.nodes.length}</span>
          <span className="text-axiom-dim/70">nodes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plug className="w-3 h-3 text-axiom-violet/80" />
          <span>{connectedProviders}/{providers.length} providers</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-axiom-amber/80">${totalCost.toFixed(2)}</span>
          <span className="text-axiom-dim/70">spent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-axiom-amber/80" />
          <span>{cpu}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-axiom-emerald/80" />
          <span>{mem}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-axiom-cyan/80" />
          <span>linked</span>
        </div>
        <ProfileSwitcher />
        <span className="text-axiom-text font-mono tabular-nums">{now}</span>
        {/* Right sidebar toggle — disabled on non-chat pages, never hidden */}
        <button
          onClick={archiveEnabled ? toggleChatArchive : undefined}
          disabled={!archiveEnabled}
          className={cn(
            "ml-2 w-8 h-8 flex items-center justify-center rounded-md border transition-all relative",
            !archiveEnabled
              ? "opacity-40 cursor-not-allowed border-axiom-edge/20 text-axiom-dim/40"
              : chatArchiveOpen
                ? "border-axiom-cyan/50 bg-axiom-cyan/15 text-axiom-cyan"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-cyan/40",
          )}
          title={archiveEnabled ? "Conversations & Projects" : "Archive not available on this page"}
        >
          {chatArchiveOpen ? (
            <PanelRight className="w-3.5 h-3.5" />
          ) : (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
          {!archiveEnabled && <Lock className="absolute w-2 h-2 text-axiom-dim/30 -bottom-0.5 -right-0.5" />}
        </button>
      </div>
    </div>
  );
}

// Local icon plug to avoid extra import
function Plug({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 2v6M15 2v6M5 8h14v3a7 7 0 0 1-14 0V8zM12 18v4" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Profile Switcher — lightweight dropdown for switching working environments
//  Profiles NEVER duplicate data — they only control visibility + defaults.
//  Switching is instantaneous. Sits in the TopBar where "operator" used to be.
//
//  The dropdown is rendered through a React portal to the document body so it
//  escapes any stacking context / overflow clipping in the TopBar. It uses the
//  same solid-background + backdrop-blur + border + shadow styling as the rest
//  of Axiom OS (matches ModuleConfigModal, PublishAppModal, etc.).
// ════════════════════════════════════════════════════════════════════════════

function ProfileSwitcher() {
  const { profiles, activeProfileId, switchProfile } = useAxiom();
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  // ── Close on click-outside + Escape ──
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      // Don't close if the click is on the trigger button (it toggles)
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      // Don't close if the click is inside the portal dropdown
      const portal = document.getElementById("profile-switcher-portal");
      if (portal && portal.contains(e.target as Node)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleCreateClick = () => {
    setOpen(false);
    setShowCreateModal(true);
  };

  // ── Compute dropdown position from the trigger button ──
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
      width: 240,
    });
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200",
          open
            ? "border-axiom-cyan/50 bg-axiom-cyan/10 text-axiom-cyan shadow-[0_0_12px_-2px_rgba(120,220,255,0.3)]"
            : "border-axiom-cyan/30 bg-axiom-cyan/5 text-axiom-cyan/90 shadow-[0_0_8px_-2px_rgba(120,220,255,0.15)] hover:bg-axiom-cyan/10 hover:border-axiom-cyan/40",
        )}
        title="Switch profile"
      >
        <GlyphRenderer glyph={activeProfile?.icon ?? "Globe"} className="w-3 h-3" textClassName="text-xs leading-none" />
        <span className="text-[11px] leading-none font-medium tracking-wide">{activeProfile?.name ?? "Global"}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-70" />
      </button>

      {/* ── Dropdown (portaled to document.body to escape stacking/clipping) ── */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          id="profile-switcher-portal"
          style={dropdownStyle}
          className="z-[10000] bg-axiom-deep/95 backdrop-blur-md border border-axiom-edge/50 rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
        >
          {/* Profile list */}
          <div className="max-h-64 overflow-y-auto axiom-scroll py-1">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { switchProfile(p.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left",
                  p.id === activeProfileId
                    ? "bg-axiom-cyan/10 text-axiom-cyan"
                    : "text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60",
                )}
              >
                <GlyphRenderer glyph={p.icon ?? "Globe"} className="w-3.5 h-3.5 shrink-0" textClassName="text-sm leading-none" />
                <span className="flex-1 truncate">{p.name}</span>
                {p.isGlobal && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-cyan uppercase tracking-wider">
                    Global
                  </span>
                )}
                {p.id === activeProfileId && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
          {/* Create new profile */}
          <div className="border-t border-axiom-edge/40 p-1">
            <button
              onClick={handleCreateClick}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-axiom-dim hover:text-axiom-emerald hover:bg-axiom-emerald/10 rounded transition-colors"
            >
              <Plus className="w-3 h-3" /> New Profile
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Create Profile Modal ── */}
      {showCreateModal && (
        <CreateProfileModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Create Profile Modal — a true modal layer rendered via portal to document.body.
//  Matches the Axiom OS modal pattern (ModuleConfigModal / PublishAppModal):
//  fixed inset-0 backdrop + centered panel with solid surface, border, backdrop
//  blur, and shadow. Portaling escapes the TopBar's stacking context so the
//  modal always renders above every application layer.
// ════════════════════════════════════════════════════════════════════════════

function CreateProfileModal({ onClose }: { onClose: () => void }) {
  const { createProfile, switchProfile } = useAxiom();
  const [name, setName] = useState("");
  const [glyph, setGlyph] = useState("User"); // Icon reference (stored as glyph string for back-compat)
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the name input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createProfile({ name: name.trim(), icon: glyph });
    switchProfile(id);
    onClose();
  };

  // Portal to document.body so the modal escapes the TopBar's stacking context
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-axiom-deep border border-axiom-edge/60 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "rgb(13 17 23 / 1)" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center border border-axiom-violet/30 bg-axiom-violet/10 text-axiom-violet">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-axiom-text">Create Profile</h3>
              <p className="text-[10px] text-axiom-dim">A new lightweight working environment</p>
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

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto axiom-scroll">
          {/* Profile Name */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Profile Name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Coding, Marketing, Music, Research"
              className="mt-1 w-full bg-axiom-void/60 border border-axiom-edge/40 rounded px-3 py-2 text-sm text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-violet/50 transition-colors"
            />
          </div>

          {/* Icon picker — provider-based (Axiom, Lucide, Phosphor, Heroicons, Tabler, Workspace) */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Icon</label>
            <p className="text-[9px] text-axiom-dim/50 mb-2">Browse the Axiom geometric glyphs, Lucide, or any installed icon library.</p>
            <AssetPicker
              selectedGlyph={glyph}
              onSelect={setGlyph}
              accentColor="axiom-violet"
              compact
            />
            {/* Selected glyph preview */}
            <div className="flex items-center gap-2 mt-2">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center border border-axiom-violet/30 bg-axiom-violet/10 text-axiom-violet")}>
                <GlyphRenderer glyph={glyph} className="w-3.5 h-3.5" textClassName="text-sm leading-none" />
              </div>
              <span className="text-[10px] text-axiom-dim font-mono">{glyph}</span>
            </div>
          </div>

          <p className="text-[10px] text-axiom-dim/60 leading-relaxed">
            Profiles never duplicate data — they only control which apps, skills, and collections are visible. You can configure visibility after creation in Settings.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-axiom-edge/40 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium border bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet hover:bg-axiom-violet/25 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-3 h-3" /> Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

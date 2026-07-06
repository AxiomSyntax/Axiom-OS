"use client";

import { useState, useMemo } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { Profile, ProfileConfig } from "@/lib/axiom/types";
import {
  KeyRound,
  Settings2,
  AlertCircle,
  Wrench,
  FolderTree,
  HardDrive,
  Check,
  Folder,
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_FOLDERS } from "@/lib/axiom/storage";
import { GlyphRenderer } from "../AppIcon";

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable Toggle Switch with glow
   ═══════════════════════════════════════════════════════════════════════════ */

const GLOW_COLORS: Record<string, string> = {
  "axiom-cyan": "rgba(34,211,238,0.3)",
  "axiom-emerald": "rgba(52,211,153,0.3)",
  "axiom-amber": "rgba(251,191,36,0.3)",
  "axiom-violet": "rgba(167,139,250,0.3)",
  "axiom-rose": "rgba(251,113,133,0.3)",
};

function AxiomToggle({
  on,
  onToggle,
  color = "axiom-cyan",
  size = "sm",
}: {
  on: boolean;
  onToggle: () => void;
  color?: string;
  size?: "sm" | "md";
}) {
  const trackW = size === "sm" ? "w-9" : "w-11";
  const trackH = size === "sm" ? "h-[18px]" : "h-[22px]";
  const thumbD = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const thumbOff = size === "sm" ? "top-[2px] left-[2px]" : "top-[3px] left-[3px]";
  const thumbOn = size === "sm" ? "translate-x-[18px]" : "translate-x-[22px]";

  const glowStyle = useMemo(
    () =>
      on
        ? {
            boxShadow: `0 0 8px ${GLOW_COLORS[color] ?? GLOW_COLORS["axiom-cyan"]}`,
          }
        : undefined,
    [on, color],
  );

  return (
    <button
      onClick={onToggle}
      style={glowStyle}
      className={cn(
        "relative shrink-0 rounded-full transition-colors duration-200",
        trackW,
        trackH,
        on ? `bg-${color}/60` : "bg-axiom-edge/50",
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-white transition-transform duration-200 ease-in-out",
          thumbD,
          on ? cn(thumbOff, thumbOn) : thumbOff,
        )}
      />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Header
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-axiom-dim" />
      <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Card Wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 axiom-hud-frame relative",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Settings Page
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const [tab, setTab] = useState<"general">("general");
  const { workspaceConfig, setWorkspaceRoot, profiles, activeProfileId, createProfile, switchProfile, updateProfile, updateProfileConfig, deleteProfile, apps, folders, engines, llmFamilies, installedAgents, skills, tools } = useAxiom();
  const [editingRoot, setEditingRoot] = useState(false);
  const [rootInput, setRootInput] = useState(workspaceConfig?.rootPath ?? "/home/user/Axiom");
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");

  const handleSetRoot = () => {
    if (rootInput.trim()) {
      setWorkspaceRoot(rootInput.trim());
      setEditingRoot(false);
    }
  };

  const folderEntries = Object.entries(WORKSPACE_FOLDERS) as [keyof typeof WORKSPACE_FOLDERS, string][];

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    const id = createProfile({ name: newProfileName.trim() });
    setNewProfileName("");
    setExpandedProfileId(id);
  };

  const toggleAppVisibility = (profileId: string, appId: string, currentVisible: string[]) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.isGlobal) return;
    const newVisible = currentVisible.includes(appId)
      ? currentVisible.filter((id) => id !== appId)
      : [...currentVisible, appId];
    updateProfile(profileId, { visibility: { ...profile.visibility, visibleAppIds: newVisible } });
  };

  const toggleFolderVisibility = (profileId: string, folderId: string, currentVisible: string[]) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.isGlobal) return;
    const newVisible = currentVisible.includes(folderId)
      ? currentVisible.filter((id) => id !== folderId)
      : [...currentVisible, folderId];
    updateProfile(profileId, { visibility: { ...profile.visibility, visibleFolderIds: newVisible } });
  };

  // ── Activation toggles (profile-specific enabled state) ──
  // These toggle whether an entity is ENABLED in the profile's runtime config.
  // When the set is empty = unrestricted (all enabled). Once non-empty, only
  // listed IDs are enabled. Toggling an item ON adds it to the set; toggling OFF
  // removes it. If the set becomes empty, it reverts to unrestricted.
  const toggleActivation = (
    profileId: string,
    entityId: string,
    currentSet: string[],
    setKey: keyof ProfileConfig,
  ) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || profile.isGlobal) return;
    // Back-compat: profiles created before the config field existed have no config
    const existingConfig = profile.config ?? {
      enabledEngineIds: [],
      enabledLlmFamilyIds: [],
      enabledAgentIds: [],
      enabledAppIds: [],
      enabledModuleIds: [],
      enabledSkillIds: [],
      enabledToolIds: [],
    };
    // If the set is currently empty (unrestricted), we need to first populate it
    // with ALL currently-enabled IDs, THEN toggle the target off. This converts
    // from "unrestricted" to "explicit set" mode.
    let newSet: string[];
    if (currentSet.length === 0) {
      // Seed from the live state: all currently-enabled IDs of this type
      const allEnabled = seedAllEnabled(setKey);
      newSet = allEnabled.filter((id) => id !== entityId);
    } else {
      newSet = currentSet.includes(entityId)
        ? currentSet.filter((id) => id !== entityId)
        : [...currentSet, entityId];
    }
    updateProfileConfig(profileId, { ...existingConfig, [setKey]: newSet });
  };

  const seedAllEnabled = (setKey: keyof ProfileConfig): string[] => {
    switch (setKey) {
      case "enabledEngineIds": return engines.filter((e) => e.enabled).map((e) => e.id);
      case "enabledLlmFamilyIds": return llmFamilies.filter((f) => f.enabled).map((f) => f.id);
      case "enabledAgentIds": return installedAgents.filter((a) => a.enabled && !a.isSystemAgent).map((a) => a.id);
      case "enabledAppIds": return apps.filter((a) => a.enabled && a.category !== "Workflow Engine" && a.category !== "AI Core").map((a) => a.id);
      case "enabledModuleIds": return apps.filter((a) => a.enabled && (a.category === "Workflow Engine" || a.category === "AI Core")).map((a) => a.id);
      case "enabledSkillIds": return skills.filter((s) => s.enabled).map((s) => s.id);
      case "enabledToolIds": return tools.filter((t) => t.enabled).map((t) => t.id);
      default: return [];
    }
  };

  // Check if an entity is enabled in a profile's config (or unrestricted)
  const isEntityEnabledInProfile = (profile: Profile, entityId: string, setKey: keyof ProfileConfig): boolean => {
    if (profile.isGlobal) return true;
    // Back-compat: profiles created before the config field existed have no config
    const config = profile.config;
    if (!config) return true;
    const set = config[setKey] ?? [];
    return set.length === 0 || set.includes(entityId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text">Settings</h2>
          <p className="text-[11px] text-axiom-dim">
            General OS preferences, identity, and workspace configuration.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {([
            { id: "general", label: "General", icon: KeyRound },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-2.5 py-1 rounded text-xs transition-colors border flex items-center gap-1.5",
                tab === t.id
                  ? "bg-axiom-cyan/15 border-axiom-cyan/40 text-axiom-cyan"
                  : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
              )}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-4">
        {/* ── General Tab ───────────────────────────────────────────── */}
        {tab === "general" && (
          <div className="max-w-2xl space-y-6">
            <SectionCard>
              <SectionHeader icon={Settings2} label="OS Preferences" />
              <div className="space-y-3">
                <PrefRow
                  label="Sidebar collapse on boot"
                  desc="Start with the sidebar collapsed to icon-only mode."
                  value={false}
                />
                <PrefRow
                  label="Auto-ingest conversations"
                  desc="Scribe extracts memory nodes from every agent reply."
                  value={true}
                />
                <PrefRow
                  label="Telemetry sampling"
                  desc="Sample CPU/mem/net every 2 seconds for the dashboard."
                  value={true}
                />
                <PrefRow
                  label="DevLab autosave"
                  desc="Persist file edits immediately (no manual save needed)."
                  value={true}
                />
              </div>
            </SectionCard>

            {/* ── Workspace Storage ── */}
            <SectionCard>
              <SectionHeader icon={HardDrive} label="Workspace Storage" />
              <div className="space-y-3">
                {/* Workspace Root path */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Workspace Root</label>
                  {editingRoot ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        value={rootInput}
                        onChange={(e) => setRootInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSetRoot()}
                        autoFocus
                        className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-sm text-axiom-text font-mono focus:outline-none focus:border-axiom-cyan/50 transition-colors"
                        placeholder="/home/user/Axiom"
                      />
                      <button
                        onClick={handleSetRoot}
                        className="px-2 py-1.5 rounded text-xs border border-axiom-emerald/40 bg-axiom-emerald/15 text-axiom-emerald hover:bg-axiom-emerald/25 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Set
                      </button>
                      <button
                        onClick={() => { setEditingRoot(false); setRootInput(workspaceConfig?.rootPath ?? "/home/user/Axiom"); }}
                        className="px-2 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="flex-1 bg-axiom-void/60 border border-axiom-edge/30 rounded px-2 py-1.5 text-xs font-mono text-axiom-dim truncate">
                        {workspaceConfig?.rootPath ?? "/home/user/Axiom"}
                      </span>
                      {workspaceConfig?.initialized && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/10 border border-axiom-emerald/30 text-axiom-emerald flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                      <button
                        onClick={() => setEditingRoot(true)}
                        className="px-2 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-axiom-dim/60 mt-1.5 leading-relaxed">
                    The single source of truth for all user data. Apps store projects, models, modules, and logs here through the centralized Storage Service. Provider: <span className="text-axiom-cyan/70 font-mono">{workspaceConfig?.provider ?? "local"}</span>
                  </p>
                </div>

                {/* Folder structure */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FolderTree className="w-3 h-3 text-axiom-dim/60" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim/60">Folder Structure</span>
                  </div>
                  <div className="bg-axiom-void/60 border border-axiom-edge/30 rounded p-2 max-h-56 overflow-y-auto axiom-scroll">
                    <div className="space-y-0.5 font-mono text-[10px]">
                      <div className="text-axiom-cyan/70">{workspaceConfig?.rootPath ?? "/home/user/Axiom"}/</div>
                      {folderEntries.map(([key, path]) => (
                        <div key={key} className="flex items-center gap-1 pl-3 text-axiom-dim/70 hover:text-axiom-text">
                          <Folder className="w-2.5 h-2.5 shrink-0 opacity-50" />
                          <span className="truncate">{path}/</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Storage provider info */}
                <div className="flex items-center justify-between p-2 rounded bg-axiom-panel/30 border border-axiom-edge/30">
                  <div>
                    <div className="text-xs text-axiom-text">Storage Provider</div>
                    <div className="text-[10px] text-axiom-dim">Browser Storage (localStorage) — future: Filesystem, Google Drive, OneDrive, S3</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-cyan">
                    {workspaceConfig?.provider ?? "local"}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* ── Profiles ── */}
            <SectionCard>
              <SectionHeader icon={Users} label="Profiles" />
              <p className="text-[10px] text-axiom-dim/70 mb-3 leading-relaxed">
                Lightweight working environments. Profiles never duplicate data — they only control which apps, skills, brain collections, and projects are visible, plus preferred engine/LLM/agent defaults. The Global profile has unrestricted access.
              </p>
              <div className="space-y-2">
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;
                  const isExpanded = expandedProfileId === profile.id;
                  // Back-compat: profiles created before the config field existed have no config
                  const config: ProfileConfig = profile.config ?? {
                    enabledEngineIds: [],
                    enabledLlmFamilyIds: [],
                    enabledAgentIds: [],
                    enabledAppIds: [],
                    enabledModuleIds: [],
                    enabledSkillIds: [],
                    enabledToolIds: [],
                  };
                  return (
                    <div
                      key={profile.id}
                      className={cn(
                        "rounded-md border transition-all",
                        isActive
                          ? "border-axiom-cyan/40 bg-axiom-cyan/5"
                          : "border-axiom-edge/40 bg-axiom-panel/30",
                      )}
                    >
                      {/* Profile row */}
                      <div className="flex items-center gap-2 p-2">
                        <GlyphRenderer glyph={profile.icon ?? "User"} className="w-4 h-4 text-axiom-dim" textClassName="text-base leading-none" />
                        <span className="text-xs font-medium text-axiom-text flex-1 truncate">{profile.name}</span>
                        {profile.isGlobal && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-cyan uppercase tracking-wider">
                            Global
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/10 border border-axiom-emerald/30 text-axiom-emerald uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-2 h-2" /> Active
                          </span>
                        )}
                        {!isActive && (
                          <button
                            onClick={() => switchProfile(profile.id)}
                            className="px-2 py-0.5 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
                          >
                            Switch
                          </button>
                        )}
                        {!profile.isGlobal && (
                          <button
                            onClick={() => setExpandedProfileId(isExpanded ? null : profile.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60 transition-colors"
                            title="Configure visibility"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        )}
                        {!profile.isGlobal && (
                          <button
                            onClick={() => { if (confirm(`Delete profile "${profile.name}"? Data is NOT deleted — only the profile configuration.`)) deleteProfile(profile.id); }}
                            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10 transition-colors"
                            title="Delete profile"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Expanded visibility config */}
                      {isExpanded && !profile.isGlobal && (
                        <div className="border-t border-axiom-edge/30 p-2 space-y-3">
                          {/* Apps visibility */}
                          <div>
                            <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1.5">Visible Apps (empty = all visible)</div>
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto axiom-scroll">
                              {apps.filter((a) => a.enabled && !["Workflow Engine", "AI Core"].includes(a.category)).map((app) => {
                                const visible = profile.visibility.visibleAppIds.includes(app.id);
                                return (
                                  <button
                                    key={app.id}
                                    onClick={() => toggleAppVisibility(profile.id, app.id, profile.visibility.visibleAppIds)}
                                    className={cn(
                                      "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                      visible || profile.visibility.visibleAppIds.length === 0
                                        ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald"
                                        : "border-axiom-edge/30 text-axiom-dim/50",
                                    )}
                                  >
                                    {visible || profile.visibility.visibleAppIds.length === 0 ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                    {app.name}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-axiom-dim/50 mt-1">
                              {profile.visibility.visibleAppIds.length === 0
                                ? "All apps visible (unrestricted)"
                                : `${profile.visibility.visibleAppIds.length} app(s) visible`}
                            </p>
                          </div>
                          {/* Brain collections visibility */}
                          {folders.length > 0 && (
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1.5">Visible Brain Collections (empty = all visible)</div>
                              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto axiom-scroll">
                                {folders.map((folder) => {
                                  const visible = profile.visibility.visibleFolderIds.includes(folder.id);
                                  return (
                                    <button
                                      key={folder.id}
                                      onClick={() => toggleFolderVisibility(profile.id, folder.id, profile.visibility.visibleFolderIds)}
                                      className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                        visible || profile.visibility.visibleFolderIds.length === 0
                                          ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald"
                                          : "border-axiom-edge/30 text-axiom-dim/50",
                                      )}
                                    >
                                      {visible || profile.visibility.visibleFolderIds.length === 0 ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                      {folder.name}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-axiom-dim/50 mt-1">
                                {profile.visibility.visibleFolderIds.length === 0
                                  ? "All collections visible (unrestricted)"
                                  : `${profile.visibility.visibleFolderIds.length} collection(s) visible`}
                              </p>
                            </div>
                          )}

                          {/* ── Activation config (profile-specific enabled state) ── */}
                          {/* These toggles change what's ENABLED in the runtime when this profile is active.
                              Switching profiles swaps these activation sets — each profile has its own
                              enabled engines/agents/apps/modules/skills/tools. */}
                          <div className="mt-3 pt-3 border-t border-axiom-edge/30">
                            <div className="text-[9px] uppercase tracking-wider text-axiom-violet/70 mb-2">Activation Config (enabled when profile is active)</div>

                            {/* Runtime Engines */}
                            {engines.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Runtime Engines</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {engines.map((e) => {
                                    const enabled = isEntityEnabledInProfile(profile, e.id, "enabledEngineIds");
                                    return (
                                      <button
                                        key={e.id}
                                        onClick={() => toggleActivation(profile.id, e.id, config.enabledEngineIds, "enabledEngineIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {e.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* LLM Families */}
                            {llmFamilies.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">LLM Registry</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {llmFamilies.map((f) => {
                                    const enabled = isEntityEnabledInProfile(profile, f.id, "enabledLlmFamilyIds");
                                    return (
                                      <button
                                        key={f.id}
                                        onClick={() => toggleActivation(profile.id, f.id, config.enabledLlmFamilyIds, "enabledLlmFamilyIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {f.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Agents */}
                            {installedAgents.filter((a) => !a.isSystemAgent).length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Agents</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {installedAgents.filter((a) => !a.isSystemAgent).map((a) => {
                                    const enabled = isEntityEnabledInProfile(profile, a.id, "enabledAgentIds");
                                    return (
                                      <button
                                        key={a.id}
                                        onClick={() => toggleActivation(profile.id, a.id, config.enabledAgentIds, "enabledAgentIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {a.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Apps (non-infra) */}
                            {apps.filter((a) => a.category !== "Workflow Engine" && a.category !== "AI Core").length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Apps</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {apps.filter((a) => a.category !== "Workflow Engine" && a.category !== "AI Core").map((app) => {
                                    const enabled = isEntityEnabledInProfile(profile, app.id, "enabledAppIds");
                                    return (
                                      <button
                                        key={app.id}
                                        onClick={() => toggleActivation(profile.id, app.id, config.enabledAppIds, "enabledAppIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {app.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Modules (infra) */}
                            {apps.filter((a) => a.category === "Workflow Engine" || a.category === "AI Core").length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Modules (Infrastructure)</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {apps.filter((a) => a.category === "Workflow Engine" || a.category === "AI Core").map((mod) => {
                                    const enabled = isEntityEnabledInProfile(profile, mod.id, "enabledModuleIds");
                                    return (
                                      <button
                                        key={mod.id}
                                        onClick={() => toggleActivation(profile.id, mod.id, config.enabledModuleIds, "enabledModuleIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {mod.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Skills */}
                            {skills.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Skills</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {skills.map((s) => {
                                    const enabled = isEntityEnabledInProfile(profile, s.id, "enabledSkillIds");
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => toggleActivation(profile.id, s.id, config.enabledSkillIds, "enabledSkillIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {s.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Tools */}
                            {tools.length > 0 && (
                              <div className="mb-2">
                                <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-1">Tools</div>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto axiom-scroll">
                                  {tools.map((t) => {
                                    const enabled = isEntityEnabledInProfile(profile, t.id, "enabledToolIds");
                                    return (
                                      <button
                                        key={t.id}
                                        onClick={() => toggleActivation(profile.id, t.id, config.enabledToolIds, "enabledToolIds")}
                                        className={cn(
                                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                                          enabled ? "border-axiom-emerald/30 bg-axiom-emerald/5 text-axiom-emerald" : "border-axiom-edge/30 text-axiom-dim/40",
                                        )}
                                      >
                                        {enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                                        {t.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <p className="text-[9px] text-axiom-dim/50 mt-2">
                              {config.enabledEngineIds.length === 0 && config.enabledLlmFamilyIds.length === 0 && config.enabledAgentIds.length === 0 && config.enabledAppIds.length === 0 && config.enabledModuleIds.length === 0 && config.enabledSkillIds.length === 0 && config.enabledToolIds.length === 0
                                ? "Unrestricted (all enabled) — toggle an item off to customize"
                                : "Custom activation set — only enabled items are active when this profile is switched to"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Create new profile */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
                  placeholder="New profile name (e.g. Coding, Marketing, Music)"
                  className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-violet/50 transition-colors"
                />
                <button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim()}
                  className="px-3 py-1.5 rounded text-xs border border-axiom-violet/40 bg-axiom-violet/15 text-axiom-violet hover:bg-axiom-violet/25 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="w-3 h-3" /> Create
                </button>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={Wrench} label="Identity" />
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Operator name</label>
                  <input
                    defaultValue="operator"
                    className="mt-1 w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-sm text-axiom-text focus:outline-none focus:border-axiom-cyan/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Session ID</label>
                  <input
                    disabled
                    value="web-fc3df0a9-c2b7-4440-8855-cf40a70c348b"
                    className="mt-1 w-full bg-axiom-void/60 border border-axiom-edge/30 rounded px-2 py-1.5 text-xs font-mono text-axiom-dim"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={AlertCircle} label="Danger Zone" />
              <button
                onClick={() => {
                  if (confirm("Reset all data? This will clear the workspace storage (projects, memory graph, conversations, workspaces) and re-seed the OS.")) {
                    void (async () => {
                      const { resetWorkspace } = await import("@/lib/axiom/storage");
                      await resetWorkspace();
                      location.reload();
                    })();
                  }
                }}
                className="px-3 py-1.5 rounded text-xs border border-axiom-rose/40 text-axiom-rose hover:bg-axiom-rose/10 transition-colors"
              >
                Reset Axiom OS
              </button>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Preference Row (General tab)
   ═══════════════════════════════════════════════════════════════════════════ */

function PrefRow({
  label,
  desc,
  value,
}: {
  label: string;
  desc: string;
  value: boolean;
}) {
  const [on, setOn] = useState(value);
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded bg-axiom-panel/30 border border-axiom-edge/30">
      <div>
        <div className="text-xs text-axiom-text">{label}</div>
        <div className="text-[10px] text-axiom-dim">{desc}</div>
      </div>
      <AxiomToggle
        on={on}
        onToggle={() => setOn(!on)}
        color="axiom-cyan"
      />
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useAxiom } from "@/lib/axiom/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Trash2, Power, Bot, Check, Loader2, ExternalLink,
  MessageSquare, Plus, X, Save, Cpu, Box, Search, Sparkles, Wand2, Hash, ChevronDown, ChevronRight,
  Pencil, Shield, Activity, Hammer, Swords, Brain, Folder, FolderOpen, Lock,
  User, Palette, ClipboardCheck, ArrowLeft, ArrowRight, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GLYPH_REGISTRY, type GlyphCategory } from "@/lib/axiom/glyph-registry";
import { EXTENDED_PALETTE, autoForge, validateHex, findClosestPaletteColor, isRawHexColor, resolveAccentContainer, type AccentColor } from "@/lib/axiom/forge-auto";
import { GlyphRenderer } from "../AppIcon";
import { AssetPicker } from "../AssetPicker";
import { ColorPickerPopover } from "../ColorPickerPopover";
import AxiomSelect from "../AxiomSelect";
import type { InstalledAgent, Engine, SystemAgentStatus, BrainFolder } from "@/lib/axiom/types";
import { SYSTEM_AGENT_STATUS_LABELS } from "@/lib/axiom/types";

type InstallState = Record<string, "idle" | "installing" | "done">;

export default function AgentsPage() {
  const {
    installedAgents,
    availableAgents,
    installAgent,
    createCustomAgent,
    updateAgent,
    uninstallAgent,
    toggleAgentEnabled,
    startConversation,
    navigate,
    agentStatus,
    engines,
    skills,
    folders,
    getSystemAgent,
    systemAgentStatus,
  } = useAxiom();
  const [installState, setInstallState] = useState<InstallState>({});
  const [filter, setFilter] = useState<"all" | "installed" | "available">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const systemAgent = getSystemAgent();
  const editingAgent = editingAgentId
    ? installedAgents.find((a) => a.id === editingAgentId) ?? null
    : null;

  // Opens the Agent Forge in CREATE mode (fresh form).
  const openCreateModal = () => {
    setEditingAgentId(null);
    setShowCreateModal(true);
  };

  // Opens the Agent Forge in EDIT mode (pre-filled with the agent's data).
  const openEditModal = (agentId: string) => {
    setEditingAgentId(agentId);
    setShowCreateModal(true);
  };

  // Closes the modal and clears the editing state.
  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAgentId(null);
  };

  const isInstalled = (id: string) =>
    installedAgents.some((a) => a.source.includes(id) || a.name.toLowerCase().includes(id));

  const handleInstall = (id: string) => {
    setInstallState((s) => ({ ...s, [id]: "installing" }));
    setTimeout(() => {
      installAgent(id);
      setInstallState((s) => ({ ...s, [id]: "done" }));
      setTimeout(() => setInstallState((s) => ({ ...s, [id]: "idle" })), 1500);
    }, 1400);
  };

  const categories = Array.from(new Set(availableAgents.map((a) => a.category)));
  const visibleAvailable = availableAgents.filter((a) => {
    if (filter === "available") return !isInstalled(a.id);
    if (filter === "installed") return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text">Agents</h2>
          <p className="text-[11px] text-axiom-dim">
            Install external agents or forge custom ones. Chat with any of them from Agent Hub.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* + Create Custom Agent button — enhanced with glow */}
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded text-xs border border-axiom-amethyst/50 bg-axiom-amethyst/15 text-axiom-amethyst hover:bg-axiom-amethyst/25 flex items-center gap-1.5 transition-colors font-medium"
            style={{ boxShadow: "0 0 16px -2px rgba(168,85,247,0.35)" }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Agent Forge
          </button>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 ml-1">
            {(["all", "installed", "available"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs capitalize transition-colors border",
                  filter === f
                    ? "bg-axiom-cyan/15 border-axiom-cyan/40 text-axiom-cyan"
                    : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
                )}
              >
                {f}
                {f === "installed" && (
                  <span className="ml-1 text-[9px] text-axiom-dim">{installedAgents.filter((a) => !a.isSystemAgent).length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto axiom-scroll">
        {/* ── System Agent (Axiom — System Architect) ── */}
        {/* Dedicated section for the permanent system agent. Config-only:
            Runtime Engine, Model, System Prompt, Permissions, Status.
            NO Chat, Enable/Disable, or Uninstall actions. */}
        {filter !== "available" && systemAgent && (
          <SystemAgentSection
            agent={systemAgent}
            engines={engines}
            systemAgentStatus={systemAgentStatus}
            onUpdate={(patch) => updateAgent(systemAgent.id, patch)}
          />
        )}

        {/* Installed agents (excluding the system agent) */}
        {filter !== "available" && installedAgents.filter((a) => !a.isSystemAgent).length > 0 && (
          <div className="p-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-dim mb-2">
              Installed ({installedAgents.filter((a) => !a.isSystemAgent).length})
            </h3>
            <div className="space-y-2">
              {installedAgents.filter((a) => !a.isSystemAgent).map((a) => {
                const status = agentStatus[a.id] ?? "idle";
                return (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg bg-axiom-panel/40 border border-axiom-edge/40 flex items-center gap-3 hover:border-axiom-edge/60 transition-colors"
                  >
                    <div
                      className={cn("w-10 h-10 rounded-md flex items-center justify-center text-xl border", resolveAccentContainer(a.color).className)}
                      style={resolveAccentContainer(a.color).style}
                    >
                      <GlyphRenderer glyph={a.glyph} className="text-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-axiom-text font-medium">{a.name}</span>
                        {a.isSystemAgent ? (
                          <span className="text-[9px] uppercase tracking-wider text-axiom-cyan/80 px-1.5 py-0.5 rounded border border-axiom-cyan/40 bg-axiom-cyan/10">
                            SYSTEM
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-wider text-axiom-dim/60 px-1.5 py-0.5 rounded border border-axiom-edge/40">
                            {a.source}
                          </span>
                        )}
                        {a.source !== "builtin" && a.source !== "system" && a.sourceUrl && (
                          <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-axiom-dim hover:text-axiom-cyan">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-axiom-dim">{a.role}</div>
                      <div className="text-[10px] text-axiom-dim/70 mt-0.5">
                        {a.tokensUsed.toLocaleString()} tokens · ${a.costUsd.toFixed(2)} spent
                      </div>
                    </div>
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border w-16 text-center",
                      status === "thinking" || status === "executing"
                        ? "text-axiom-emerald border-axiom-emerald/40 bg-axiom-emerald/10"
                        : status === "error"
                          ? "text-axiom-rose border-axiom-rose/40 bg-axiom-rose/10"
                          : "text-axiom-dim border-axiom-edge/40 bg-axiom-panel/40",
                    )}>
                      {status}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { startConversation(a.id); navigate("agent-hub"); }}
                        disabled={!a.enabled}
                        className="px-2 py-1 rounded text-xs border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3 h-3" /> Chat
                      </button>
                      <button
                        onClick={() => openEditModal(a.id)}
                        className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-amethyst hover:border-axiom-amethyst/40"
                        title="Edit agent"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {!a.isSystemAgent && (
                        <button
                          onClick={() => toggleAgentEnabled(a.id)}
                          className={cn("w-7 h-7 rounded flex items-center justify-center border",
                            a.enabled ? "border-axiom-emerald/40 text-axiom-emerald hover:bg-axiom-emerald/10" : "border-axiom-edge/40 text-axiom-dim hover:bg-axiom-panel/60",
                          )}
                          title={a.enabled ? "Disable" : "Enable"}
                        >
                          <Power className="w-3 h-3" />
                        </button>
                      )}
                      {a.source !== "builtin" && a.source !== "system" && (
                        <button
                          onClick={() => { if (confirm(`Uninstall ${a.name}?`)) uninstallAgent(a.id); }}
                          className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40"
                          title="Uninstall"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available agents */}
        {filter !== "installed" && (
          <div className="p-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-dim mb-2">
              Available to Install ({visibleAvailable.length})
            </h3>
            {categories.map((cat) => {
              const items = visibleAvailable.filter((a) => a.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-axiom-dim/70 mb-1.5">{cat}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {items.map((a) => {
                      const installed = isInstalled(a.id);
                      const state = installState[a.id] ?? "idle";
                      return (
                        <motion.div layout key={a.id}
                          className="p-3 rounded-lg bg-axiom-panel/40 border border-axiom-edge/40 hover:border-axiom-cyan/40 transition-colors flex flex-col"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cn("w-9 h-9 rounded-md flex items-center justify-center text-lg border", resolveAccentContainer(a.color).className)}
                              style={resolveAccentContainer(a.color).style}
                            >
                              <GlyphRenderer glyph={a.glyph} className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-axiom-text">{a.name}</div>
                              <div className="text-[9px] text-axiom-dim/60 truncate">{a.source}</div>
                            </div>
                            <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="text-axiom-dim hover:text-axiom-cyan">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <p className="mt-2 text-[11px] text-axiom-dim leading-snug flex-1">{a.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] uppercase tracking-wider text-axiom-dim/60">{a.role}</span>
                            {installed ? (
                              <span className="text-[10px] text-axiom-emerald flex items-center gap-1">
                                <Check className="w-3 h-3" /> installed
                              </span>
                            ) : state === "installing" ? (
                              <span className="text-[10px] text-axiom-amber flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> installing…
                              </span>
                            ) : state === "done" ? (
                              <span className="text-[10px] text-axiom-emerald flex items-center gap-1">
                                <Check className="w-3 h-3" /> done
                              </span>
                            ) : (
                              <button
                                onClick={() => handleInstall(a.id)}
                                className="px-2 py-1 rounded text-xs border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 flex items-center gap-1.5"
                              >
                                <Download className="w-3 h-3" /> Install
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {visibleAvailable.length === 0 && (
              <div className="text-center py-8 text-axiom-dim text-xs">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                All available agents are already installed.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Custom Agent Modal — Enhanced Agent Forge */}
      <AnimatePresence>
        {showCreateModal && (
          <AgentForgeModal
            engines={engines}
            skills={skills}
            folders={folders}
            editingAgent={editingAgent}
            onClose={closeModal}
            onSave={(input) => {
              if (editingAgentId) {
                updateAgent(editingAgentId, input);
              } else {
                createCustomAgent(input);
              }
              closeModal();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent Forge — Guided Creation Wizard
// Four-step workflow: Identity → Appearance → Equipment → Review
// Fixed window size, smooth transitions, per-step validation gates.
// ═══════════════════════════════════════════════════════════════════════════

type ForgeStep = 0 | 1 | 2 | 3;

const FORGE_STEPS: { id: ForgeStep; label: string; icon: typeof User }[] = [
  { id: 0, label: "Identity", icon: User },
  { id: 1, label: "Appearance", icon: Palette },
  { id: 2, label: "Equipment", icon: Swords },
  { id: 3, label: "Review", icon: ClipboardCheck },
];

function AgentForgeModal({
  engines,
  skills,
  folders,
  editingAgent,
  onClose,
  onSave,
}: {
  engines: ReturnType<typeof useAxiom.getState>["engines"];
  skills: ReturnType<typeof useAxiom.getState>["skills"];
  folders: ReturnType<typeof useAxiom.getState>["folders"];
  /** When provided, the modal is in EDIT mode — all fields pre-fill from this
   *  agent and the save button calls `updateAgent` instead of `createCustomAgent`. */
  editingAgent?: InstalledAgent | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    role: string;
    description?: string;
    systemPrompt: string;
    engineId?: string;
    model?: string;
    glyph: string;
    color: string;
    equippedSkills: string[];
    linkedFolders: string[];
  }) => void;
}) {
  const isEditing = !!editingAgent;

  // ── Pre-fill computation (only used on mount, when editing) ──
  const editingIsCustomColor = editingAgent ? isRawHexColor(editingAgent.color) : false;
  const editingPaletteToken =
    editingAgent && !editingIsCustomColor && editingAgent.color
      ? EXTENDED_PALETTE.find((c) => c.token === editingAgent.color)?.token ?? "axiom-amethyst"
      : "axiom-amethyst";
  const editingCustomHex = editingIsCustomColor ? editingAgent!.color : "";
  const editingIsSystemGlyph = editingAgent
    ? !/^(\p{Extended_Pictographic}|\p{Emoji})$/u.test(editingAgent.glyph)
    : false;

  // ── Wizard step state ──
  const [step, setStep] = useState<ForgeStep>(0);

  // ── Core Identity ──
  const [name, setName] = useState(editingAgent?.name ?? "");
  const [role, setRole] = useState(editingAgent?.role ?? "");
  const [engineId, setEngineId] = useState(editingAgent?.engineId ?? engines[0]?.id ?? "");
  const [systemPrompt, setSystemPrompt] = useState(editingAgent?.systemPrompt ?? "");
  const selectedEngine = engines.find((e) => e.id === engineId) ?? null;
  const engineModels = selectedEngine?.models ?? [];
  const [model, setModel] = useState(editingAgent?.model ?? engineModels[0] ?? "default");

  // ── Unified Accent Color ──
  // ONE single source of truth for the agent's accent color. Holds either a
  // palette token ("axiom-cyan") OR a raw hex ("#ff5733"). Both the Extended
  // Palette and the Custom HEX input write to THIS state — there is no longer
  // a separate `useCustomHex` / `colorToken` / `customHex` trio that can drift
  // out of sync. The preview always reads this single value.
  const [accentColor, setAccentColor] = useState<string>(
    editingIsCustomColor ? editingCustomHex : editingPaletteToken,
  );
  const [customHexInput, setCustomHexInput] = useState(editingCustomHex);
  const [customHexError, setCustomHexError] = useState(false);

  // Derived: the active palette entry (for hex lookup) or null if custom hex
  const activePaletteEntry = EXTENDED_PALETTE.find((c) => c.token === accentColor) ?? null;
  const activeHex = activePaletteEntry?.hex ?? (isRawHexColor(accentColor) ? accentColor : "#a855f7");
  const isCustomAccent = isRawHexColor(accentColor);

  // ── Glyph ──
  const [glyph, setGlyph] = useState(editingAgent?.glyph ?? "🤖");
  const [glyphType, setGlyphType] = useState<"emoji" | "system">(editingIsSystemGlyph ? "system" : "emoji");
  const [activeGlyphCategory, setActiveGlyphCategory] = useState(GLYPH_REGISTRY[0]?.id ?? "");
  const [glyphSearch, setGlyphSearch] = useState("");

  // ── Equipment ──
  const [equippedSkills, setEquippedSkills] = useState<string[]>(editingAgent?.equippedSkills ?? []);
  const [linkedFolders, setLinkedFolders] = useState<string[]>(editingAgent?.linkedFolders ?? []);
  // Equipment UI state (search, filters, tree expansion)
  const [skillSearch, setSkillSearch] = useState("");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string | null>(null);
  const [collapsedSkillCats, setCollapsedSkillCats] = useState<Set<string>>(new Set());
  const [memorySearch, setMemorySearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f_root"]));

  // ── Per-step validation ──
  const identityValid = name.trim().length > 0 && role.trim().length > 0 && engineId.length > 0 && model.length > 0 && systemPrompt.trim().length > 0;
  const equipmentValid = equippedSkills.length > 0 && linkedFolders.length > 0;
  // Appearance is always valid (defaults exist)
  const appearanceValid = true;

  const stepValid = [identityValid, appearanceValid, equipmentValid, true][step];

  // ── Handlers ──
  const handleEngineChange = (newEngineId: string) => {
    setEngineId(newEngineId);
    const eng = engines.find((e) => e.id === newEngineId);
    setModel(eng?.models?.[0] ?? "default");
  };

  // Auto-Forge: writes glyph + accent into the unified state
  const handleAutoForge = () => {
    const desc = `${name} ${role} ${systemPrompt}`.trim();
    if (!desc) return;
    const result = autoForge(desc);
    setGlyph(result.glyph);
    setAccentColor(result.color); // palette token from autoForge
    setCustomHexInput(result.hex);
  };

  // Custom HEX handler: writes to the unified accent state directly
  const handleCustomHexChange = (value: string) => {
    const cleaned = value.replace(/[^#0-9A-Fa-f]/g, "");
    setCustomHexInput(cleaned);
    if (cleaned.length >= 7) {
      const validated = validateHex(cleaned);
      if (validated) {
        setCustomHexError(false);
        setAccentColor(validated); // unified state — palette + hex share this
      } else {
        setCustomHexError(true);
      }
    } else {
      setCustomHexError(false);
    }
  };

  // Palette preset handler: writes the token to the unified accent state
  const handlePaletteSelect = (token: string) => {
    setAccentColor(token);
    setCustomHexInput("");
    setCustomHexError(false);
  };

  // ── Glyph Filtering ──
  const filteredCategories = useMemo(() => {
    if (!glyphSearch.trim()) return GLYPH_REGISTRY;
    const q = glyphSearch.toLowerCase();
    return GLYPH_REGISTRY.map((cat) => ({
      ...cat,
      glyphs: cat.glyphs.filter(
        (g) =>
          g.emoji.includes(q) ||
          g.keywords.some((kw) => kw.includes(q)),
      ),
    })).filter((cat) => cat.glyphs.length > 0);
  }, [glyphSearch]);

  // ── Equipment Toggles ──
  const toggleSkill = (id: string) => {
    setEquippedSkills((prev) => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };
  const toggleFolder = (id: string) => {
    setLinkedFolders((prev) => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // ── Equipment derived data (skills + memory tree) ──
  // Skills: grouped by category, filtered by search + category filter
  const skillCategories = useMemo(() => {
    const cats = new Map<string, typeof skills>();
    for (const s of skills) {
      if (!cats.has(s.category)) cats.set(s.category, []);
      cats.get(s.category)!.push(s);
    }
    return cats;
  }, [skills]);

  const filteredSkills = useMemo(() => {
    let result = skills;
    if (skillCategoryFilter) result = result.filter(s => s.category === skillCategoryFilter);
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [skills, skillCategoryFilter, skillSearch]);

  const filteredSkillCats = useMemo(() => {
    const cats = new Map<string, typeof skills>();
    for (const s of filteredSkills) {
      if (!cats.has(s.category)) cats.set(s.category, []);
      cats.get(s.category)!.push(s);
    }
    return cats;
  }, [filteredSkills]);

  // Memory: build folder tree with children
  const folderTree = useMemo(() => {
    const buildTree = (parentId: string | null): Array<BrainFolder & { children: ReturnType<typeof buildTree> }> => {
      return folders
        .filter(f => f.parentId === parentId && f.id !== "f_root")
        .map(f => ({ ...f, children: buildTree(f.id) }));
    };
    return buildTree("f_root");
  }, [folders]);

  const filteredFolderTree = useMemo(() => {
    if (!memorySearch.trim()) return folderTree;
    const q = memorySearch.toLowerCase();
    const filterTree = (nodes: typeof folderTree): typeof folderTree => {
      return nodes.map(n => {
        const children = filterTree(n.children);
        if (n.name.toLowerCase().includes(q) || children.length > 0) {
          return { ...n, children };
        }
        return null;
      }).filter(Boolean) as typeof folderTree;
    };
    return filterTree(folderTree);
  }, [folderTree, memorySearch]);

  const toggleSkillCat = (cat: string) => {
    setCollapsedSkillCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleFolderExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all skills in a category
  const toggleCategoryAll = (cat: string, catSkills: typeof skills) => {
    const allEquipped = catSkills.every(s => equippedSkills.includes(s.id));
    if (allEquipped) {
      setEquippedSkills((prev) => prev.filter(id => !catSkills.some(s => s.id === id)));
    } else {
      setEquippedSkills((prev) => [...new Set([...prev, ...catSkills.map(s => s.id)])]);
    }
  };

  // Select a folder and all its descendants
  const toggleFolderRecursive = (folderId: string) => {
    const collectDescendants = (id: string): string[] => {
      const children = folders.filter(f => f.parentId === id);
      return [id, ...children.flatMap(c => collectDescendants(c.id))];
    };
    const all = collectDescendants(folderId);
    const allLinked = all.every(id => linkedFolders.includes(id));
    if (allLinked) {
      setLinkedFolders((prev) => prev.filter(id => !all.includes(id)));
    } else {
      setLinkedFolders((prev) => [...new Set([...prev, ...all])]);
    }
  };

  // ── Save Handler ──
  const handleSave = () => {
    // accentColor is already the resolved value (palette token OR raw hex)
    onSave({
      name: name.trim(),
      role: role.trim(),
      systemPrompt: systemPrompt.trim(),
      engineId,
      model,
      glyph,
      color: accentColor,
      equippedSkills,
      linkedFolders,
    });
  };

  // ── Navigation ──
  const canGoNext = stepValid && step < 3;
  const canGoBack = step > 0;
  const goNext = () => { if (canGoNext) setStep((s) => (s + 1) as ForgeStep); };
  const goBack = () => { if (canGoBack) setStep((s) => (s - 1) as ForgeStep); };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-axiom-void/70 backdrop-blur-sm"
      />
      {/* Modal — FIXED dimensions. The wizard never resizes between steps.
          Width: 920px, Height: 640px. Internal body scrolls if content overflows. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[920px] h-[640px] max-w-[95vw] max-h-[95vh] bg-axiom-panel/95 backdrop-blur-xl border border-axiom-amethyst/30 rounded-xl flex flex-col overflow-hidden"
        style={{ boxShadow: "0 32px 80px -16px rgba(0,0,0,0.9), 0 0 0 1px rgba(168,85,247,0.10), 0 0 64px -8px rgba(168,85,247,0.15)" }}
      >
        {/* ═══ Header ═══ */}
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="w-4 h-4 text-axiom-amethyst" />
            ) : (
              <Hammer className="w-4 h-4 text-axiom-amethyst" />
            )}
            <span className="text-sm font-medium text-axiom-amethyst tracking-[0.2em]">
              {isEditing ? "EDIT AGENT" : "AGENT FORGE"}
            </span>
          </div>
          {/* Live preview badge — the SINGLE source of truth. Updates live with
              name, role, glyph, and accent color (unified state).
              ALL preview colors use `activeHex` via inline styles — there is
              NO branching between palette tokens and custom hex. Both resolve
              to activeHex, and the preview always reads from that one value. */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-md border backdrop-blur-sm"
              style={{
                color: activeHex,
                borderColor: activeHex + "4d",
                backgroundColor: activeHex + "1a",
              }}
            >
              <div className="w-7 h-7 rounded flex items-center justify-center text-base shrink-0">
                {glyphType === "emoji" ? (
                  <span className="text-base">{glyph}</span>
                ) : (
                  <GlyphRenderer glyph={glyph} className="text-base" />
                )}
              </div>
              <div className="min-w-0 max-w-[160px]">
                <div className="text-xs font-medium truncate leading-tight">
                  {name || "Unnamed"}
                </div>
                <div className="text-[9px] text-axiom-dim/70 truncate leading-tight">
                  {role || "No role"}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ═══ Step Indicator Bar ═══ */}
        <div className="px-4 py-2.5 border-b border-axiom-edge/30 shrink-0 bg-axiom-deep/30 flex items-center justify-between">
          {FORGE_STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isCurrent = step === s.id;
            const isComplete = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                {/* Step circle + label */}
                <button
                  onClick={() => { /* Allow jumping back to completed steps, not forward to unvalidated ones */
                    if (s.id <= step || (s.id === step + 1 && stepValid)) setStep(s.id);
                  }}
                  disabled={s.id > step && !(s.id <= step + 1 && stepValid)}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    isCurrent ? "text-axiom-amethyst" : isComplete ? "text-axiom-emerald" : "text-axiom-dim/50",
                    "disabled:cursor-not-allowed",
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all",
                    isCurrent
                      ? "border-axiom-amethyst bg-axiom-amethyst/15 shadow-[0_0_8px_-1px_rgba(168,85,247,0.4)]"
                      : isComplete
                        ? "border-axiom-emerald bg-axiom-emerald/15"
                        : "border-axiom-edge/50",
                  )}>
                    {isComplete ? <Check className="w-2.5 h-2.5" /> : <StepIcon className="w-2.5 h-2.5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase tracking-[0.15em] font-medium hidden sm:inline",
                    isCurrent ? "text-axiom-amethyst" : isComplete ? "text-axiom-emerald/80" : "text-axiom-dim/50",
                  )}>
                    {s.label}
                  </span>
                </button>
                {/* Connector line */}
                {i < FORGE_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-px transition-colors",
                    step > s.id ? "bg-axiom-emerald/40" : "bg-axiom-edge/30",
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══ Body — fixed height, internal scroll ═══ */}
        <div className="flex-1 overflow-y-auto axiom-scroll min-h-0">
          <AnimatePresence mode="wait">
            {/* ───────────────────────────────────────────────────────────────
                STEP 1 — IDENTITY
                Name, Role, Runtime Engine, Model, LARGE System Prompt editor
            ─────────────────────────────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step-identity"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="p-5 space-y-4 h-full flex flex-col"
              >
                <SectionLabel color="axiom-cyan" title="Core Identity" />

                {/* Name + Role row */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim block mb-1.5">Agent Name</label>
                    <input
                      name="agent-name"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Etsy SEO Expert"
                      autoFocus
                      className="w-full bg-axiom-void/40 border border-axiom-edge/40 rounded-md px-2.5 py-2 text-sm text-axiom-text focus:outline-none focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)] placeholder:text-axiom-dim/40 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim block mb-1.5">Core Role / Function</label>
                    <input
                      name="agent-role"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Optimizes product titles and tags"
                      className="w-full bg-axiom-void/40 border border-axiom-edge/40 rounded-md px-2.5 py-2 text-sm text-axiom-text focus:outline-none focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)] placeholder:text-axiom-dim/40 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Engine + Model row */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center gap-1.5 mb-1.5">
                      <Cpu className="w-2.5 h-2.5" /> Runtime Engine
                    </label>
                    <div className="relative">
                      <select
                        name="agent-engine"
                        autoComplete="off"
                        value={engineId}
                        onChange={(e) => handleEngineChange(e.target.value)}
                        className="w-full appearance-none bg-axiom-void/40 border border-axiom-edge/40 rounded-md px-2.5 py-2 pr-8 text-sm text-axiom-text focus:outline-none focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)] transition-all duration-200"
                      >
                        {engines.map((eng) => (
                          <option key={eng.id} value={eng.id}>
                            {eng.glyph}  {eng.name} — {eng.type}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-axiom-dim absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center gap-1.5 mb-1.5">
                      <Box className="w-2.5 h-2.5" /> Model
                    </label>
                    <div className="relative">
                      <select
                        name="agent-model"
                        autoComplete="off"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full appearance-none bg-axiom-void/40 border border-axiom-edge/40 rounded-md px-2.5 py-2 pr-8 text-xs font-mono text-axiom-text focus:outline-none focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)] transition-all duration-200"
                      >
                        {engineModels.length > 0 ? (
                          engineModels.map((m) => <option key={m} value={m}>{m}</option>)
                        ) : (
                          <option value="default">default</option>
                        )}
                      </select>
                      <ChevronDown className="w-3 h-3 text-axiom-dim absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* System Prompt — LARGE IDE-like editor. Fills remaining height. */}
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center justify-between mb-1.5 shrink-0">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-full bg-axiom-cyan" />
                      System Instructions (Prompt)
                    </span>
                    <span className="text-[9px] text-axiom-dim/50 normal-case tracking-normal font-mono">
                      {systemPrompt.length} chars · ⌘⏎ to forge
                    </span>
                  </label>
                  <textarea
                    name="agent-system-prompt"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={"Type the agent's unique personality and rules here…\n\nThis is a large IDE-like editor. Write long, detailed system prompts that define exactly how the agent should behave, what it should prioritize, and what it should avoid."}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && identityValid) {
                        e.preventDefault();
                        setStep(1);
                      }
                    }}
                    className="flex-1 w-full bg-axiom-void/40 border border-axiom-edge/40 rounded-md px-3 py-2.5 text-xs text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)] resize-none axiom-scroll transition-all duration-200 font-mono leading-relaxed min-h-0"
                  />
                </div>
              </motion.div>
            )}

            {/* ───────────────────────────────────────────────────────────────
                STEP 2 — APPEARANCE
                Unified accent color (palette + HEX → same state) + all glyph pickers
            ─────────────────────────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-appearance"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="p-5 space-y-4"
              >
                {/* Auto-Forge banner */}
                <div className="flex items-center justify-between">
                  <SectionLabel color="axiom-neon-lime" title="Glyph & Accent Selection" />
                  <button
                    onClick={handleAutoForge}
                    disabled={!name.trim() && !role.trim() && !systemPrompt.trim()}
                    className="px-3 py-1.5 rounded-md text-xs border border-axiom-neon-lime/40 bg-axiom-neon-lime/10 text-axiom-neon-lime hover:bg-axiom-neon-lime/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors font-medium tracking-[0.05em]"
                    style={!(!name.trim() && !role.trim() && !systemPrompt.trim()) ? { boxShadow: "0 0 12px -2px rgba(132,204,22,0.25)" } : {}}
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Auto-Forge
                  </button>
                </div>

                {/* ── Unified Accent Palette ──
                    Both palette presets and custom HEX write to `accentColor`.
                    Selecting a palette fills the unified state with the token.
                    Selecting a HEX overwrites the unified state with the hex.
                    There is ONE preview, ONE state, no drift. */}
                <div className="p-3.5 rounded-lg bg-axiom-void/30 border border-axiom-edge/40 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-axiom-cyan via-axiom-violet to-axiom-ruby" />
                      Accent Color
                      <span className="text-[8px] text-axiom-dim/40 normal-case tracking-normal ml-1">
                        {isCustomAccent ? `Custom ${accentColor}` : `Palette · ${activePaletteEntry?.label ?? ""}`}
                      </span>
                    </label>
                    <span className="text-[9px] text-axiom-dim/50">{EXTENDED_PALETTE.length} presets</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
                    {EXTENDED_PALETTE.map((c) => {
                      const isActive = !isCustomAccent && accentColor === c.token;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handlePaletteSelect(c.token)}
                          className={cn(
                            "group relative flex flex-col items-center gap-1 py-2 px-1 rounded-md border transition-all",
                            isActive
                              ? "border-white/20 bg-white/5 scale-105"
                              : "border-axiom-edge/30 hover:border-axiom-edge/60 hover:bg-white/3",
                          )}
                          style={isActive ? { boxShadow: `0 0 16px -4px ${c.hex}60` } : {}}
                        >
                          <div
                            className="w-6 h-6 rounded-md border border-white/10 group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className={cn(
                            "text-[9px] leading-none",
                            isActive ? "text-axiom-text" : "text-axiom-dim",
                          )}>
                            {c.label}
                          </span>
                          {isActive && (
                            <Check className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-axiom-neon-lime text-axiom-void p-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Custom HEX Input ── */}
                <div className="p-3.5 rounded-lg bg-axiom-void/30 border border-axiom-edge/40 backdrop-blur-sm">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium flex items-center gap-1.5 mb-2.5">
                    <Hash className="w-2.5 h-2.5" />
                    Custom Accent Hex
                    <span className="text-[8px] text-axiom-dim/40 normal-case tracking-normal ml-1">Overwrites the same accent color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-axiom-dim text-xs">#</span>
                      <input
                        name="agent-custom-hex"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-form-type="other"
                        value={customHexInput.replace("#", "")}
                        onChange={(e) => handleCustomHexChange("#" + e.target.value)}
                        placeholder="FF5733"
                        maxLength={7}
                        className={cn(
                          "w-full bg-axiom-void/60 border rounded-md px-2.5 py-2 pl-7 text-sm font-mono text-axiom-text focus:outline-none transition-all duration-200",
                          customHexError
                            ? "border-axiom-ruby/60 focus:border-axiom-ruby focus:shadow-[0_0_12px_rgba(255,80,100,0.1)]"
                            : "border-axiom-edge/40 focus:border-axiom-amethyst/50 focus:shadow-[0_0_12px_rgba(168,85,247,0.08)]",
                        )}
                      />
                    </div>
                    <ColorPickerPopover
                      value={validateHex(customHexInput) ?? activeHex}
                      onChange={(hex) => handleCustomHexChange(hex)}
                    />
                  </div>
                  {customHexError && (
                    <p className="text-[9px] text-axiom-ruby mt-1">Invalid hex code. Must be 6 characters (0-9, A-F).</p>
                  )}
                </div>

                {/* ── Glyph Selection Matrix ── */}
                <div className="p-3.5 rounded-lg bg-axiom-void/30 border border-axiom-edge/40 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Glyph Selection Matrix
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 rounded-md border border-axiom-edge/40 overflow-hidden">
                        <button
                          onClick={() => { setGlyphType("emoji"); setGlyph("🤖"); setActiveGlyphCategory(GLYPH_REGISTRY[0]?.id ?? ""); }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] transition-colors",
                            glyphType === "emoji" ? "bg-axiom-amethyst/15 text-axiom-amethyst" : "text-axiom-dim hover:text-axiom-text",
                          )}
                        >
                          Emoji
                        </button>
                        <button
                          onClick={() => { setGlyphType("system"); setGlyph("Bot"); }}
                          className={cn(
                            "px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] transition-colors",
                            glyphType === "system" ? "bg-axiom-amethyst/15 text-axiom-amethyst" : "text-axiom-dim hover:text-axiom-text",
                          )}
                        >
                          Icons
                        </button>
                      </div>
                      {glyphType === "emoji" && (
                        <div className="relative">
                          <Search className="w-3 h-3 text-axiom-dim/50 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            name="agent-glyph-search"
                            autoComplete="off"
                            value={glyphSearch}
                            onChange={(e) => setGlyphSearch(e.target.value)}
                            placeholder="Search glyphs…"
                            className="bg-axiom-void/60 border border-axiom-edge/40 rounded-md pl-7 pr-2.5 py-1 text-[10px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-amethyst/40 focus:shadow-[0_0_8px_rgba(168,85,247,0.06)] w-36 transition-all duration-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {glyphType === "emoji" && (
                    <>
                      <div className="flex items-center gap-0.5 mb-2.5 overflow-x-auto pb-1 axiom-scroll-x">
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveGlyphCategory(cat.id)}
                            className={cn(
                              "px-2 py-1 rounded text-[10px] whitespace-nowrap border transition-colors flex items-center gap-1",
                              activeGlyphCategory === cat.id
                                ? "bg-axiom-amethyst/15 border-axiom-amethyst/40 text-axiom-amethyst"
                                : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/50",
                            )}
                          >
                            <span className="text-xs">{cat.icon}</span>
                            {cat.label}
                            <span className="text-[8px] opacity-60">{cat.glyphs.length}</span>
                          </button>
                        ))}
                      </div>
                      <div className="max-h-40 overflow-y-auto axiom-scroll">
                        {filteredCategories
                          .filter((cat) => cat.id === activeGlyphCategory)
                          .map((cat) => (
                            <div key={cat.id} className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-1">
                              {cat.glyphs.map((g) => (
                                <button
                                  key={g.emoji}
                                  onClick={() => setGlyph(g.emoji)}
                                  title={g.keywords.slice(0, 3).join(", ")}
                                  className={cn(
                                    "w-8 h-8 rounded border flex items-center justify-center text-sm transition-all hover:scale-110",
                                    glyph === g.emoji
                                      ? "border-axiom-neon-lime/60 bg-axiom-neon-lime/15 scale-105"
                                      : "border-axiom-edge/30 hover:border-axiom-edge/60 hover:bg-white/3",
                                  )}
                                  style={glyph === g.emoji ? { boxShadow: "0 0 10px -2px rgba(132,204,22,0.35)" } : {}}
                                >
                                  {g.emoji}
                                </button>
                              ))}
                            </div>
                          ))}
                        {filteredCategories.find((c) => c.id === activeGlyphCategory) === undefined && glyphSearch.trim() && (
                          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-14 gap-1">
                            {filteredCategories.flatMap((c) => c.glyphs).map((g) => (
                              <button
                                key={g.emoji}
                                onClick={() => setGlyph(g.emoji)}
                                title={g.keywords.slice(0, 3).join(", ")}
                                className={cn(
                                  "w-8 h-8 rounded border flex items-center justify-center text-sm transition-all hover:scale-110",
                                  glyph === g.emoji
                                    ? "border-axiom-neon-lime/60 bg-axiom-neon-lime/15 scale-105"
                                    : "border-axiom-edge/30 hover:border-axiom-edge/60 hover:bg-white/3",
                                )}
                                style={glyph === g.emoji ? { boxShadow: "0 0 10px -2px rgba(132,204,22,0.35)" } : {}}
                              >
                                {g.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {glyphType === "system" && (
                    <AssetPicker
                      selectedGlyph={glyph}
                      onSelect={setGlyph}
                      accentColor="axiom-amethyst"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* ───────────────────────────────────────────────────────────────
                STEP 3 — EQUIPMENT
                Two-column layout: Skills (left) + Memory (right) + Summary.
                Scalable: search, category filters, collapsible groups, folder tree.
                Tools are NOT selected here — Skills decide which Tools are used.
            ─────────────────────────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-equipment"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="p-4 h-full flex flex-col gap-3"
              >
                {/* Validation hint */}
                {!equipmentValid && (
                  <div className="px-3 py-2 rounded-md border border-axiom-amber/30 bg-axiom-amber/5 text-[10px] text-axiom-amber/90 flex items-center gap-2 shrink-0">
                    <span className="w-1 h-1 rounded-full bg-axiom-amber animate-pulse" />
                    An AI needs at least one Skill AND one Memory source to be forgeable.
                  </div>
                )}

                {/* Two-column layout: Skills | Memory */}
                <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
                  {/* ═══ LEFT: SKILLS ═══ */}
                  <div className="flex flex-col min-h-0 rounded-lg border border-axiom-edge/40 bg-axiom-void/30 overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/40">
                      <div className="flex items-center gap-1.5">
                        <Swords className="w-3 h-3 text-axiom-emerald" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim font-medium">Skills</span>
                        {equippedSkills.length > 0 && (
                          <span className="text-[9px] text-axiom-emerald">{equippedSkills.length} equipped</span>
                        )}
                      </div>
                      <span className="text-[9px] text-axiom-dim/50">{skills.length} total</span>
                    </div>
                    {/* Search */}
                    <div className="p-2 border-b border-axiom-edge/30 shrink-0">
                      <div className="relative">
                        <Search className="w-3 h-3 text-axiom-dim/50 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          placeholder="Search skills…"
                          className="w-full bg-axiom-void/60 border border-axiom-edge/40 rounded-md pl-7 pr-2.5 py-1.5 text-[11px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-emerald/40 transition-colors"
                        />
                      </div>
                      {/* Category filter chips */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <button
                          onClick={() => setSkillCategoryFilter(null)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border transition-colors",
                            skillCategoryFilter === null
                              ? "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald"
                              : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text",
                          )}
                        >
                          All
                        </button>
                        {[...skillCategories.keys()].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSkillCategoryFilter(cat === skillCategoryFilter ? null : cat)}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border transition-colors",
                              skillCategoryFilter === cat
                                ? "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald"
                                : "border-axiom-edge/30 text-axiom-dim hover:text-axiom-text",
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Collapsible category list */}
                    <div className="flex-1 overflow-y-auto axiom-scroll p-1.5 min-h-0">
                      {[...filteredSkillCats.entries()].length === 0 && (
                        <div className="text-[10px] text-axiom-dim/50 italic px-2 py-4 text-center">No skills match your search.</div>
                      )}
                      {[...filteredSkillCats.entries()].map(([cat, catSkills]) => {
                        const collapsed = collapsedSkillCats.has(cat);
                        const allEquipped = catSkills.every(s => equippedSkills.includes(s.id));
                        const someEquipped = catSkills.some(s => equippedSkills.includes(s.id));
                        return (
                          <div key={cat} className="mb-1">
                            {/* Category header */}
                            <div className="flex items-center gap-1 px-1.5 py-1 group">
                              <button
                                onClick={() => toggleSkillCat(cat)}
                                className="w-3.5 h-3.5 flex items-center justify-center text-axiom-dim hover:text-axiom-text shrink-0"
                              >
                                {collapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                              </button>
                              <span className="text-[9px] uppercase tracking-[0.1em] text-axiom-dim font-medium flex-1">{cat}</span>
                              <span className="text-[8px] text-axiom-dim/50">{catSkills.length}</span>
                              {/* Select-all checkbox */}
                              <button
                                onClick={() => toggleCategoryAll(cat, catSkills)}
                                className={cn(
                                  "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ml-1 transition-colors",
                                  allEquipped
                                    ? "bg-axiom-emerald/30 border-axiom-emerald/50"
                                    : someEquipped
                                      ? "bg-axiom-emerald/10 border-axiom-emerald/30"
                                      : "border-axiom-edge/40 hover:border-axiom-edge/60",
                                )}
                              >
                                {allEquipped && <Check className="w-2 h-2 text-axiom-emerald" />}
                              </button>
                            </div>
                            {/* Skill items */}
                            {!collapsed && (
                              <div className="ml-3 border-l border-axiom-edge/20 pl-1.5 space-y-0.5">
                                {catSkills.map((skill) => {
                                  const equipped = equippedSkills.includes(skill.id);
                                  return (
                                    <button
                                      key={skill.id}
                                      onClick={() => toggleSkill(skill.id)}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-all text-left border",
                                        equipped
                                          ? "bg-axiom-emerald/10 border-axiom-emerald/30 text-axiom-emerald"
                                          : "bg-transparent border-transparent text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/40",
                                      )}
                                    >
                                      <span className="text-sm shrink-0">{skill.glyph}</span>
                                      <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium leading-tight">{skill.name}</div>
                                        <div className="text-[9px] text-axiom-dim/50 truncate leading-tight">{skill.description}</div>
                                      </div>
                                      <span className={cn(
                                        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                                        equipped ? "bg-axiom-emerald/30 border-axiom-emerald/50" : "border-axiom-edge/40",
                                      )}>
                                        {equipped && <Check className="w-2 h-2" />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ═══ RIGHT: MEMORY ═══ */}
                  <div className="flex flex-col min-h-0 rounded-lg border border-axiom-edge/40 bg-axiom-void/30 overflow-hidden">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/40">
                      <div className="flex items-center gap-1.5">
                        <Brain className="w-3 h-3 text-axiom-cyan" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim font-medium">Memory</span>
                        {linkedFolders.length > 0 && (
                          <span className="text-[9px] text-axiom-cyan">{linkedFolders.length} linked</span>
                        )}
                      </div>
                      <span className="text-[9px] text-axiom-dim/50">{folders.filter(f => f.id !== "f_root").length} collections</span>
                    </div>
                    {/* Search */}
                    <div className="p-2 border-b border-axiom-edge/30 shrink-0">
                      <div className="relative">
                        <Search className="w-3 h-3 text-axiom-dim/50 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          value={memorySearch}
                          onChange={(e) => setMemorySearch(e.target.value)}
                          placeholder="Search memory collections…"
                          className="w-full bg-axiom-void/60 border border-axiom-edge/40 rounded-md pl-7 pr-2.5 py-1.5 text-[11px] text-axiom-text placeholder:text-axiom-dim/40 focus:outline-none focus:border-axiom-cyan/40 transition-colors"
                        />
                      </div>
                    </div>
                    {/* Folder tree */}
                    <div className="flex-1 overflow-y-auto axiom-scroll p-1.5 min-h-0">
                      {filteredFolderTree.length === 0 && (
                        <div className="text-[10px] text-axiom-dim/50 italic px-2 py-4 text-center">No memory collections match your search.</div>
                      )}
                      {filteredFolderTree.map((node) => (
                        <MemoryTreeNode
                          key={node.id}
                          node={node}
                          depth={0}
                          linkedFolders={linkedFolders}
                          expandedFolders={expandedFolders}
                          onToggleFolder={toggleFolder}
                          onToggleRecursive={toggleFolderRecursive}
                          onToggleExpand={toggleFolderExpand}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* ═══ SUMMARY PANEL ═══ */}
                <div className="shrink-0 px-3 py-2 rounded-lg border border-axiom-edge/40 bg-axiom-deep/30 flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Swords className="w-2.5 h-2.5 text-axiom-emerald" />
                    <span className="text-axiom-dim">Skills:</span>
                    <span className="text-axiom-emerald font-medium">{equippedSkills.length}</span>
                  </div>
                  <div className="w-px h-3 bg-axiom-edge/40" />
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-2.5 h-2.5 text-axiom-cyan" />
                    <span className="text-axiom-dim">Memory:</span>
                    <span className="text-axiom-cyan font-medium">{linkedFolders.length}</span>
                  </div>
                  <div className="w-px h-3 bg-axiom-edge/40" />
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-2.5 h-2.5 text-axiom-violet" />
                    <span className="text-axiom-dim">Capabilities:</span>
                    <span className="text-axiom-violet font-medium">
                      {equippedSkills.length > 0 ? `${equippedSkills.length} skill${equippedSkills.length > 1 ? "s" : ""}` : "none"}
                      {" · "}
                      {linkedFolders.length > 0 ? `${linkedFolders.length} memory source${linkedFolders.length > 1 ? "s" : ""}` : "no memory"}
                    </span>
                  </div>
                  {!equipmentValid && (
                    <div className="ml-auto text-axiom-amber/80 text-[9px] flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-axiom-amber animate-pulse" />
                      Needs ≥1 skill AND ≥1 memory
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ───────────────────────────────────────────────────────────────
                STEP 4 — REVIEW
                Large agent card + full summary. FORGE AGENT button only here.
            ─────────────────────────────────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step-review"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="p-5 space-y-4"
              >
                <SectionLabel color="axiom-amethyst" title="Review & Forge" />

                {/* Large Agent Card */}
                <div className="p-4 rounded-lg bg-axiom-void/30 border border-axiom-edge/40 backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl border shrink-0"
                      style={{
                        borderColor: activeHex + "40",
                        backgroundColor: activeHex + "12",
                        color: activeHex,
                      }}
                    >
                      {glyphType === "emoji" ? (
                        <span className="text-3xl">{glyph}</span>
                      ) : (
                        <GlyphRenderer glyph={glyph} className="text-3xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-lg font-medium truncate"
                        style={{ color: activeHex }}
                      >
                        {name || "Unnamed Agent"}
                      </div>
                      <div className="text-xs text-axiom-dim truncate">{role || "No role defined"}</div>
                      <div className="text-[10px] text-axiom-dim/50 mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full",
                            selectedEngine?.status === "active" ? "bg-axiom-emerald" :
                            selectedEngine?.status === "connected" ? "bg-axiom-cyan" :
                            selectedEngine?.status === "standby" ? "bg-axiom-amber" : "bg-axiom-dim",
                          )} />
                          {selectedEngine?.name ?? "—"} · {model}
                        </span>
                        <span className="text-axiom-dim/30">·</span>
                        <span>{isCustomAccent ? `Custom ${accentColor}` : `Palette · ${activePaletteEntry?.label}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prompt summary */}
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-[0.15em] text-axiom-dim/60 mb-1">System Prompt</div>
                    <div className="text-[11px] text-axiom-dim/80 font-mono leading-relaxed line-clamp-4 axiom-scroll max-h-20 overflow-y-auto p-2 rounded bg-axiom-void/40 border border-axiom-edge/30">
                      {systemPrompt || "No prompt defined."}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2 text-[9px]">
                    <div className="px-2.5 py-2 rounded-md bg-axiom-panel/40 border border-axiom-edge/30 text-center">
                      <div className="text-axiom-dim/60 uppercase tracking-[0.1em]">Engine</div>
                      <div className="text-axiom-text truncate mt-0.5">{selectedEngine?.name ?? "—"}</div>
                    </div>
                    <div className="px-2.5 py-2 rounded-md bg-axiom-panel/40 border border-axiom-edge/30 text-center">
                      <div className="text-axiom-dim/60 uppercase tracking-[0.1em]">Model</div>
                      <div className="text-axiom-text truncate mt-0.5">{model}</div>
                    </div>
                    <div className="px-2.5 py-2 rounded-md bg-axiom-panel/40 border border-axiom-edge/30 text-center">
                      <div className="text-axiom-dim/60 uppercase tracking-[0.1em]">Skills</div>
                      <div className="text-axiom-text mt-0.5">{equippedSkills.length}</div>
                    </div>
                    <div className="px-2.5 py-2 rounded-md bg-axiom-panel/40 border border-axiom-edge/30 text-center">
                      <div className="text-axiom-dim/60 uppercase tracking-[0.1em]">Memory</div>
                      <div className="text-axiom-text mt-0.5">{linkedFolders.length}</div>
                    </div>
                  </div>
                </div>

                {/* Equipped Skills list */}
                {equippedSkills.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] text-axiom-dim/60 mb-1.5">Equipped Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {equippedSkills.map((sid) => {
                        const s = skills.find((sk) => sk.id === sid);
                        if (!s) return null;
                        return (
                          <span key={sid} className="px-2 py-1 rounded-md text-[10px] bg-axiom-emerald/10 border border-axiom-emerald/30 text-axiom-emerald flex items-center gap-1">
                            <span>{s.glyph}</span> {s.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Linked Memory list */}
                {linkedFolders.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.15em] text-axiom-dim/60 mb-1.5">Linked Memory Sources</div>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedFolders.map((fid) => {
                        const f = folders.find((fo) => fo.id === fid);
                        if (!f) return null;
                        return (
                          <span key={fid} className="px-2 py-1 rounded-md text-[10px] bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-cyan flex items-center gap-1">
                            <Folder className="w-2.5 h-2.5" /> {f.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ Footer — Back / Next / Forge ═══ */}
        <div className="px-4 py-3 border-t border-axiom-edge/40 bg-axiom-deep/40 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
          {/* Left: step counter */}
          <div className="text-[9px] uppercase tracking-[0.15em] text-axiom-dim/50">
            Step {step + 1} of {FORGE_STEPS.length}
          </div>
          {/* Right: navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-md text-xs text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors tracking-[0.1em]"
            >
              Cancel
            </button>
            {canGoBack && (
              <button
                onClick={goBack}
                className="px-3.5 py-2 rounded-md text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60 flex items-center gap-1.5 transition-colors tracking-[0.1em]"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm border flex items-center gap-2 transition-all font-medium tracking-[0.15em] disabled:opacity-30 disabled:cursor-not-allowed",
                  "bg-axiom-amethyst/20 border-axiom-amethyst/50 text-axiom-amethyst hover:bg-axiom-amethyst/30",
                )}
                style={canGoNext ? { boxShadow: "0 0 24px -4px rgba(168,85,247,0.4), inset 0 0 0 1px rgba(168,85,247,0.15)" } : {}}
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm border flex items-center gap-2 transition-all font-medium tracking-[0.15em]",
                  "bg-axiom-amethyst/20 border-axiom-amethyst/50 text-axiom-amethyst hover:bg-axiom-amethyst/30",
                )}
                style={{ boxShadow: "0 0 24px -4px rgba(168,85,247,0.4), inset 0 0 0 1px rgba(168,85,247,0.15)" }}
              >
                {isEditing ? (
                  <Save className="w-3.5 h-3.5" />
                ) : (
                  <Hammer className="w-3.5 h-3.5" />
                )}
                <span>{isEditing ? "SAVE CHANGES" : "FORGE AGENT"}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function SectionLabel({ color, title }: { color: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-1 h-4 rounded-full shadow-[0_0_8px_-1px_currentColor]", `bg-${color}`)} />
      <span className={cn("text-[10px] uppercase tracking-[0.2em] font-medium", `text-${color}`)}>{title}</span>
    </div>
  );
}

// ── MemoryTreeNode — recursive folder tree for the Equipment step ──────────
// Renders a single folder node with expand/collapse, checkbox, and recursively
// renders its children. Supports selecting individual folders or an entire
// subtree (toggleFolderRecursive).

type MemoryNode = BrainFolder & { children: MemoryNode[] };

function MemoryTreeNode({
  node,
  depth,
  linkedFolders,
  expandedFolders,
  onToggleFolder,
  onToggleRecursive,
  onToggleExpand,
}: {
  node: MemoryNode;
  depth: number;
  linkedFolders: string[];
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onToggleRecursive: (id: string) => void;
  onToggleExpand: (id: string) => void;
}) {
  const linked = linkedFolders.includes(node.id);
  const hasChildren = node.children.length > 0;
  const expanded = expandedFolders.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-1 px-1.5 py-1 rounded text-[11px] transition-colors hover:bg-axiom-panel/40 group"
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        {/* Expand/collapse toggle (or spacer for leaf nodes) */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(node.id)}
            className="w-3.5 h-3.5 flex items-center justify-center text-axiom-dim hover:text-axiom-text shrink-0"
          >
            {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        {/* Folder icon */}
        {linked ? (
          <FolderOpen className="w-3 h-3 text-axiom-cyan shrink-0" />
        ) : (
          <Folder className={cn("w-3 h-3 shrink-0 text-axiom-dim/60")} />
        )}
        {/* Name — click toggles single selection */}
        <button
          onClick={() => onToggleFolder(node.id)}
          className={cn(
            "flex-1 text-left truncate transition-colors",
            linked ? "text-axiom-cyan font-medium" : "text-axiom-dim hover:text-axiom-text",
          )}
        >
          {node.name}
        </button>
        {/* Recursive select checkbox — click toggles entire subtree */}
        {hasChildren && (
          <button
            onClick={() => onToggleRecursive(node.id)}
            className={cn(
              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors mr-1",
              linked ? "bg-axiom-cyan/30 border-axiom-cyan/50" : "border-axiom-edge/40 hover:border-axiom-edge/60",
            )}
            title="Select entire subtree"
          >
            {linked && <Check className="w-2 h-2 text-axiom-cyan" />}
          </button>
        )}
        {/* Individual checkbox */}
        <button
          onClick={() => onToggleFolder(node.id)}
          className={cn(
            "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
            linked ? "bg-axiom-cyan/30 border-axiom-cyan/50" : "border-axiom-edge/40 hover:border-axiom-edge/60",
          )}
        >
          {linked && <Check className="w-2 h-2 text-axiom-cyan" />}
        </button>
      </div>
      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <MemoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              linkedFolders={linkedFolders}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onToggleRecursive={onToggleRecursive}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SystemAgentSection — dedicated section for the permanent System Agent
//  (Axiom — System Architect). Config-only: Runtime Engine, Model, System
//  Prompt, Permissions, Status. NO Chat, Enable/Disable, or Uninstall actions.
// ════════════════════════════════════════════════════════════════════════════

function SystemAgentSection({
  agent,
  engines,
  systemAgentStatus,
  onUpdate,
}: {
  agent: InstalledAgent;
  engines: Engine[];
  systemAgentStatus: SystemAgentStatus;
  onUpdate: (patch: Partial<{ name: string; role: string; description: string; systemPrompt: string; engineId: string; model: string }>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const selectedEngine = engines.find((e) => e.id === agent.engineId) ?? null;
  const engineModels = selectedEngine?.models ?? [];
  const isWorking = systemAgentStatus !== "idle";

  const permissions = [
    { label: "Core Customization", enabled: true },
    { label: "Installation Pipeline", enabled: true },
    { label: "Registry Management", enabled: true },
    { label: "Workspace", enabled: true },
    { label: "Storage", enabled: true },
    { label: "Integrations", enabled: true },
  ];

  return (
    <div className="p-4 pb-0">
      <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-cyan/70 mb-2 flex items-center gap-1.5">
        <Shield className="w-3 h-3" />
        System Architect
      </h3>
      <div className="rounded-lg border border-axiom-cyan/30 bg-axiom-cyan/5 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 p-3">
          {/* Icon — distinct geometric glyph (upward triangle + centered dot)
              with a protected inner-ring treatment that differs from normal
              agent cards. */}
          <div className="relative w-10 h-10 rounded-md flex items-center justify-center border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan shrink-0 text-xl shadow-[0_0_12px_-2px_rgba(120,220,255,0.25)]">
            <GlyphRenderer glyph={agent.glyph} className="text-xl" />
            {isWorking && (
              <span className="absolute inset-0 rounded-md border border-axiom-cyan/40 animate-ping" style={{ animationDuration: "1.5s" }} />
            )}
          </div>
          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-axiom-text">{agent.name}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-cyan uppercase tracking-wider">
                System Architect
              </span>
            </div>
            <div className="text-[10px] mt-0.5">
              {selectedEngine ? (
                <span className="text-axiom-dim">
                  {selectedEngine.name}
                  {agent.model ? ` · ${agent.model}` : ""}
                </span>
              ) : engines.length === 0 ? (
                <span className="text-axiom-rose flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  No Runtime Engine available — configure one in Infrastructure → Engines
                </span>
              ) : (
                <span className="text-axiom-amber">
                  No engine assigned — will auto-assign on next boot
                </span>
              )}
            </div>
          </div>
          {/* Status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isWorking ? "bg-axiom-cyan animate-pulse" : "bg-axiom-dim/40",
            )} />
            <span className={cn(
              "text-[9px] uppercase tracking-wider",
              isWorking ? "text-axiom-cyan" : "text-axiom-dim",
            )}>
              {SYSTEM_AGENT_STATUS_LABELS[systemAgentStatus]}
            </span>
          </div>
          {/* Expand/collapse */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5 transition-colors shrink-0"
            title={expanded ? "Collapse" : "Configure"}
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        {/* Config panel (expandable) */}
        {expanded && (
          <div className="border-t border-axiom-cyan/20 p-3 space-y-3">
            {/* Runtime Engine — never empty, always valid.
                Uses the Axiom OS custom select (no browser default dropdown).
                If the agent somehow has no engineId, the first available engine
                is auto-selected on change. The "— None —" option is deliberately
                absent: Axiom must always have a usable runtime. */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center gap-1.5 mb-1.5">
                <Cpu className="w-2.5 h-2.5" /> Runtime Engine
              </label>
              <AxiomSelect
                value={agent.engineId ?? engines[0]?.id ?? ""}
                onChange={(v) => {
                  const eng = engines.find((x) => x.id === v);
                  // Always assign a valid model — never leave Axiom without a runtime.
                  onUpdate({ engineId: v, model: eng?.models?.[0] ?? "" });
                }}
                options={engines.map((e) => ({ value: e.id, label: `${e.glyph} ${e.name}` }))}
                size="md"
                className="focus-within:border-axiom-cyan/50"
              />
            </div>

            {/* Model — always has a valid default. The first model of the
                active engine is flagged "Recommended". */}
            {engineModels.length > 0 && (
              <div>
                <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center gap-1.5 mb-1.5">
                  <Box className="w-2.5 h-2.5" /> Model
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-axiom-cyan/15 border border-axiom-cyan/30 text-axiom-cyan normal-case tracking-normal font-medium flex items-center gap-0.5">
                    <Check className="w-2 h-2" /> Recommended
                  </span>
                </label>
                <AxiomSelect
                  value={agent.model ?? engineModels[0] ?? ""}
                  onChange={(v) => onUpdate({ model: v })}
                  options={engineModels.map((m, i) => ({
                    value: m,
                    label: i === 0 ? `${m} · Recommended` : m,
                  }))}
                  size="md"
                  className="focus-within:border-axiom-cyan/50"
                />
              </div>
            )}

            {/* System Prompt — PROTECTED. This is a core system resource, not
                an editable field. The original prompt is locked; future editing
                will be handled through versioning or cloning, never by modifying
                the original in-place. */}
            <div>
              <label className="text-[10px] uppercase tracking-[0.15em] text-axiom-dim flex items-center gap-1.5 mb-1.5">
                <Lock className="w-2.5 h-2.5" /> Core Identity
              </label>
              <div className="rounded-lg border border-axiom-cyan/25 bg-axiom-void/40 overflow-hidden">
                {/* Protected header bar */}
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-axiom-cyan/15 bg-axiom-cyan/5">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-2.5 h-2.5 text-axiom-cyan" />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-axiom-cyan font-medium">Protected</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider text-axiom-dim/60">Locked</span>
                </div>
                {/* Read-only prompt content */}
                <div className="p-2.5 text-[11px] text-axiom-dim/80 font-mono leading-relaxed axiom-scroll max-h-32 overflow-y-auto">
                  {agent.systemPrompt}
                </div>
              </div>
              <p className="text-[9px] text-axiom-dim/50 mt-1 flex items-center gap-1">
                <Shield className="w-2 h-2" />
                Core system resource — editing requires versioning or cloning, not direct modification.
              </p>
            </div>

            {/* Permissions */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-1.5">
                <Shield className="w-2.5 h-2.5" /> Permissions
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {permissions.map((p) => (
                  <div key={p.label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-axiom-panel/30 border border-axiom-edge/20">
                    <Check className="w-3 h-3 text-axiom-emerald shrink-0" />
                    <span className="text-[10px] text-axiom-dim">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-1">
                <Activity className="w-2.5 h-2.5" /> Activity
              </label>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-axiom-panel/30 border border-axiom-edge/20">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isWorking ? "bg-axiom-cyan animate-pulse" : "bg-axiom-dim/40",
                )} />
                <span className={cn(
                  "text-[10px]",
                  isWorking ? "text-axiom-cyan" : "text-axiom-dim",
                )}>
                  {SYSTEM_AGENT_STATUS_LABELS[systemAgentStatus]}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
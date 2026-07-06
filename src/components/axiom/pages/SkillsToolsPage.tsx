"use client";

import { useState } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { Skill, Tool, SkillParameter, ToolParameter } from "@/lib/axiom/types";
import {
  Wrench,
  Zap,
  Search,
  Plus,
  Play,
  Trash2,
  X,
  Edit3,
  Sparkles,
  Loader2,
  Eye,
  Tag,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type ParamType = "string" | "number" | "boolean" | "object" | "array";
const PARAM_TYPES: ParamType[] = ["string", "number", "boolean", "object", "array"];

const GLYPH_CHOICES = ["✦", "⚡", "⚙", "🔍", "🎨", "📊", "📄", "📝", "📈", "🧠", "🛠", "🌐", "👁", "🔔", "🌿", "⏰", "💡", "🔮"];

export default function SkillsToolsPage() {
  const {
    skills,
    tools,
    toggleSkill,
    invokeSkill,
    addSkill,
    updateSkill,
    removeSkill,
    toggleTool,
    invokeTool,
    addTool,
    updateTool,
    removeTool,
    pushActivity,
  } = useAxiom();
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"skills" | "tools">("skills");

  // Detail drawer state — when set, a side panel opens showing the full skill/tool.
  // We store only the id; the live object is looked up from the store so toggles
  // and edits propagate automatically without triggering effect-based setState.
  const [viewSkillId, setViewSkillId] = useState<string | null>(null);
  const [viewToolId, setViewToolId] = useState<string | null>(null);
  const viewSkill = viewSkillId ? skills.find((s) => s.id === viewSkillId) ?? null : null;
  const viewTool = viewToolId ? tools.find((t) => t.id === viewToolId) ?? null : null;

  // Editor modal state — when set, a modal opens to add or edit a skill/tool
  const [editSkill, setEditSkill] = useState<Skill | "new" | null>(null);
  const [editTool, setEditTool] = useState<Tool | "new" | null>(null);

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase()) ||
      s.category.toLowerCase().includes(filter.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())),
  );
  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(filter.toLowerCase()) ||
      t.description.toLowerCase().includes(filter.toLowerCase()) ||
      t.category.toLowerCase().includes(filter.toLowerCase()) ||
      t.tags.some((tg) => tg.toLowerCase().includes(filter.toLowerCase())),
  );

  const skillCategories = Array.from(new Set(skills.map((s) => s.category))).sort();
  const toolCategories = Array.from(new Set(tools.map((t) => t.category))).sort();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-axiom-text">Skills & Tools</h2>
          <p className="text-[11px] text-axiom-dim leading-snug">
            <span className="text-axiom-emerald/90">Skills</span> are modular packages of
            instructions that teach agents how to perform a task.{" "}
            <span className="text-axiom-cyan/90">Tools</span> are lower-level utilities
            agents can invoke. Click any card to read full docs, ask the AI to describe it,
            or edit it.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setTab("skills")}
            className={cn(
              "px-3 py-1.5 rounded text-xs flex items-center gap-1.5 border transition-colors",
              tab === "skills"
                ? "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
            )}
          >
            <Zap className="w-3 h-3" /> Skills ({skills.filter((s) => s.enabled).length}/{skills.length})
          </button>
          <button
            onClick={() => setTab("tools")}
            className={cn(
              "px-3 py-1.5 rounded text-xs flex items-center gap-1.5 border transition-colors",
              tab === "tools"
                ? "bg-axiom-cyan/15 border-axiom-cyan/40 text-axiom-cyan"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
            )}
          >
            <Wrench className="w-3 h-3" /> Tools ({tools.filter((t) => t.enabled).length}/{tools.length})
          </button>
          <button
            onClick={() => (tab === "skills" ? setEditSkill("new") : setEditTool("new"))}
            className="px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 border bg-axiom-cyan/15 border-axiom-cyan/40 text-axiom-cyan hover:bg-axiom-cyan/25 transition-colors"
            title={tab === "skills" ? "Create new skill" : "Create new tool"}
          >
            <Plus className="w-3 h-3" /> New {tab === "skills" ? "Skill" : "Tool"}
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-axiom-dim" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="search…"
              className="w-44 pl-7 pr-2 py-1.5 rounded-md bg-axiom-deep/70 border border-axiom-edge/40 text-xs focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-4">
        {tab === "skills" ? (
          <div className="space-y-6">
            {skillCategories.map((cat) => {
              const items = filteredSkills.filter((s) => s.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-dim">
                      {cat}
                    </h3>
                    <span className="text-[10px] text-axiom-dim/60">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {items.map((s) => (
                      <SkillCard
                        key={s.id}
                        skill={s}
                        onView={() => setViewSkillId(s.id)}
                        onToggle={() => toggleSkill(s.id)}
                        onInvoke={() => {
                          invokeSkill(s.id);
                          pushActivity({
                            kind: "system",
                            text: `Invoked skill: ${s.name}`,
                            severity: "info",
                          });
                        }}
                        onEdit={() => setEditSkill(s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredSkills.length === 0 && <EmptyState label="skills" onAdd={() => setEditSkill("new")} />}
          </div>
        ) : (
          <div className="space-y-6">
            {toolCategories.map((cat) => {
              const items = filteredTools.filter((t) => t.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-dim">
                      {cat}
                    </h3>
                    <span className="text-[10px] text-axiom-dim/60">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {items.map((t) => (
                      <ToolCard
                        key={t.id}
                        tool={t}
                        onView={() => setViewToolId(t.id)}
                        onToggle={() => toggleTool(t.id)}
                        onInvoke={() => {
                          invokeTool(t.id);
                          pushActivity({
                            kind: "system",
                            text: `Invoked tool: ${t.name}`,
                            severity: "info",
                          });
                        }}
                        onEdit={() => setEditTool(t)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredTools.length === 0 && <EmptyState label="tools" onAdd={() => setEditTool("new")} />}
          </div>
        )}
      </div>

      {/* Detail drawer — Skill */}
      <AnimatePresence>
        {viewSkill && (
          <DetailDrawer
            kind="skill"
            title={viewSkill.name}
            glyph={viewSkill.glyph}
            color="axiom-emerald"
            onClose={() => setViewSkillId(null)}
            onEdit={() => {
              if (viewSkill) setEditSkill(viewSkill);
              setViewSkillId(null);
            }}
            onDelete={() => {
              if (viewSkill && confirm(`Delete skill "${viewSkill.name}"?`)) {
                removeSkill(viewSkill.id);
                setViewSkillId(null);
              }
            }}
            canDelete={viewSkill.source === "custom"}
          >
            <SkillDetail
              skill={viewSkill}
              onToggle={() => toggleSkill(viewSkill.id)}
              onInvoke={() => invokeSkill(viewSkill.id)}
            />
          </DetailDrawer>
        )}
      </AnimatePresence>

      {/* Detail drawer — Tool */}
      <AnimatePresence>
        {viewTool && (
          <DetailDrawer
            kind="tool"
            title={viewTool.name}
            glyph={viewTool.glyph}
            color="axiom-cyan"
            onClose={() => setViewToolId(null)}
            onEdit={() => {
              if (viewTool) setEditTool(viewTool);
              setViewToolId(null);
            }}
            onDelete={() => {
              if (viewTool && confirm(`Delete tool "${viewTool.name}"?`)) {
                removeTool(viewTool.id);
                setViewToolId(null);
              }
            }}
            canDelete={viewTool.source === "custom"}
          >
            <ToolDetail
              tool={viewTool}
              onToggle={() => toggleTool(viewTool.id)}
              onInvoke={() => invokeTool(viewTool.id)}
            />
          </DetailDrawer>
        )}
      </AnimatePresence>

      {/* Editor modal — Skill */}
      <AnimatePresence>
        {editSkill && (
          <SkillEditor
            initial={editSkill === "new" ? null : editSkill}
            onClose={() => setEditSkill(null)}
            onSave={(payload) => {
              if (editSkill === "new") {
                addSkill(payload);
              } else {
                updateSkill(editSkill.id, payload);
              }
              setEditSkill(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Editor modal — Tool */}
      <AnimatePresence>
        {editTool && (
          <ToolEditor
            initial={editTool === "new" ? null : editTool}
            onClose={() => setEditTool(null)}
            onSave={(payload) => {
              if (editTool === "new") {
                addTool(payload);
              } else {
                updateTool(editTool.id, payload);
              }
              setEditTool(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  onView,
  onToggle,
  onInvoke,
  onEdit,
}: {
  skill: Skill;
  onView: () => void;
  onToggle: () => void;
  onInvoke: () => void;
  onEdit: () => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "group p-3 rounded-lg border transition-colors flex flex-col",
        skill.enabled
          ? "bg-axiom-panel/60 border-axiom-emerald/30 hover:border-axiom-emerald/50"
          : "bg-axiom-panel/20 border-axiom-edge/30 opacity-70 hover:opacity-100",
      )}
    >
      <div className="flex items-start gap-2 cursor-pointer" onClick={onView}>
        <span className="text-lg leading-none mt-0.5">{skill.glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-axiom-text truncate">{skill.name}</span>
            <span className="text-[9px] text-axiom-dim/60 uppercase tracking-wider">
              {skill.source}
            </span>
            {skill.version && (
              <span className="text-[9px] text-axiom-dim/40 font-mono">v{skill.version}</span>
            )}
          </div>
          <p className="text-[11px] text-axiom-dim mt-0.5 leading-snug line-clamp-2">
            {skill.longDescription ?? skill.description}
          </p>
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skill.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="px-1 py-0.5 rounded text-[9px] bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim"
                >
                  {t}
                </span>
              ))}
              {skill.tags.length > 4 && (
                <span className="text-[9px] text-axiom-dim/60">+{skill.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onView}
          className="text-[9px] text-axiom-dim hover:text-axiom-emerald flex items-center gap-1 transition-colors"
          title="View full docs"
        >
          <Eye className="w-2.5 h-2.5" /> docs
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-axiom-dim mr-1">invoked {skill.invoked}×</span>
          <button
            onClick={onEdit}
            className="w-5 h-5 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-cyan hover:bg-axiom-cyan/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onInvoke}
            disabled={!skill.enabled}
            className="w-5 h-5 rounded flex items-center justify-center border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan disabled:opacity-30 transition-colors"
            title="Test invoke"
          >
            <Play className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "relative w-8 h-4 rounded-full transition-colors",
              skill.enabled ? "bg-axiom-emerald/60" : "bg-axiom-edge/40",
            )}
            title={skill.enabled ? "Disable" : "Enable"}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                skill.enabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ToolCard({
  tool,
  onView,
  onToggle,
  onInvoke,
  onEdit,
}: {
  tool: Tool;
  onView: () => void;
  onToggle: () => void;
  onInvoke: () => void;
  onEdit: () => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "group p-3 rounded-lg border transition-colors flex flex-col",
        tool.enabled
          ? "bg-axiom-panel/60 border-axiom-cyan/30 hover:border-axiom-cyan/50"
          : "bg-axiom-panel/20 border-axiom-edge/30 opacity-70 hover:opacity-100",
      )}
    >
      <div className="flex items-start gap-2 cursor-pointer" onClick={onView}>
        <span className="text-lg leading-none mt-0.5">{tool.glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-axiom-text truncate">{tool.name}</span>
            <span className="text-[9px] text-axiom-dim/60 uppercase tracking-wider">
              {tool.source}
            </span>
            {tool.method && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim font-mono">
                {tool.method}
              </span>
            )}
          </div>
          <p className="text-[11px] text-axiom-dim mt-0.5 leading-snug line-clamp-2">
            {tool.description}
          </p>
          {tool.endpoint && (
            <div className="mt-1 text-[9px] font-mono text-axiom-dim/60 truncate">
              {tool.endpoint}
            </div>
          )}
          {tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tool.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="px-1 py-0.5 rounded text-[9px] bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onView}
          className="text-[9px] text-axiom-dim hover:text-axiom-cyan flex items-center gap-1 transition-colors"
          title="View full docs"
        >
          <Eye className="w-2.5 h-2.5" /> docs
        </button>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-axiom-dim mr-1">invoked {tool.invoked}×</span>
          <button
            onClick={onEdit}
            className="w-5 h-5 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-cyan hover:bg-axiom-cyan/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onInvoke}
            disabled={!tool.enabled}
            className="w-5 h-5 rounded flex items-center justify-center border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan disabled:opacity-30 transition-colors"
            title="Test invoke"
          >
            <Play className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "relative w-8 h-4 rounded-full transition-colors",
              tool.enabled ? "bg-axiom-cyan/60" : "bg-axiom-edge/40",
            )}
            title={tool.enabled ? "Disable" : "Enable"}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                tool.enabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="text-center py-12 text-axiom-dim">
      <Plus className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-xs mb-3">No {label} match your filter.</p>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 rounded text-xs border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 inline-flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" /> Create one
      </button>
    </div>
  );
}

// ── Detail drawer ───────────────────────────────────────────────────────────

function DetailDrawer({
  kind,
  title,
  glyph,
  color,
  onClose,
  onEdit,
  onDelete,
  canDelete,
  children,
}: {
  kind: "skill" | "tool";
  title: string;
  glyph: string;
  color: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-40 bg-axiom-void/70 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className="absolute top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-axiom-deep/95 backdrop-blur-xl border-l border-axiom-edge/40 flex flex-col"
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-xl", `text-${color}`)}>{glyph}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-axiom-text truncate">{title}</div>
              <div className="text-[9px] uppercase tracking-wider text-axiom-dim">
                {kind} documentation
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan flex items-center gap-1 transition-colors"
              title="Edit"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
            {canDelete && (
              <button
                onClick={onDelete}
                className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 hover:border-axiom-rose/40 text-axiom-dim hover:text-axiom-rose flex items-center gap-1 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto axiom-scroll">{children}</div>
      </motion.aside>
    </>
  );
}

// ── Skill detail content ───────────────────────────────────────────────────

function SkillDetail({
  skill,
  onToggle,
  onInvoke,
}: {
  skill: Skill;
  onToggle: () => void;
  onInvoke: () => void;
}) {
  const [aiDesc, setAiDesc] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const askAi = async (question?: string) => {
    setAiLoading(true);
    setAiError(null);
    setAiDesc(null);
    try {
      const res = await fetch("/api/axiom/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "skill",
          name: skill.name,
          description: skill.description,
          longDescription: skill.longDescription,
          instructions: skill.instructions,
          parameters: skill.parameters,
          tags: skill.tags,
          question,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiDesc(data.reply || "…");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(skill.instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top: status + actions */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-axiom-panel/40 border border-axiom-edge/40">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border",
            skill.enabled
              ? "text-axiom-emerald border-axiom-emerald/40 bg-axiom-emerald/10"
              : "text-axiom-dim border-axiom-edge/40",
          )}
        >
          {skill.enabled ? "enabled" : "disabled"}
        </span>
        <span className="text-[10px] text-axiom-dim">
          {skill.source} · v{skill.version ?? "1.0.0"} · invoked {skill.invoked}×
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onInvoke}
            disabled={!skill.enabled}
            className="px-2 py-1 rounded text-[10px] border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 disabled:opacity-40 flex items-center gap-1"
          >
            <Play className="w-2.5 h-2.5" /> Test invoke
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "relative w-9 h-4 rounded-full transition-colors",
              skill.enabled ? "bg-axiom-emerald/60" : "bg-axiom-edge/40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                skill.enabled ? "translate-x-6" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      {/* Long description */}
      {skill.longDescription && (
        <Section title="Overview">
          <p className="text-xs text-axiom-text/85 leading-relaxed">{skill.longDescription}</p>
        </Section>
      )}

      {/* Short description */}
      <Section title="Summary">
        <p className="text-xs text-axiom-dim">{skill.description}</p>
      </Section>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[10px] bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim flex items-center gap-1"
              >
                <Tag className="w-2 h-2" /> {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Parameters */}
      {skill.parameters.length > 0 && (
        <Section title={`Parameters (${skill.parameters.length})`}>
          <div className="space-y-1">
            {skill.parameters.map((p) => (
              <div
                key={p.name}
                className="p-2 rounded bg-axiom-panel/40 border border-axiom-edge/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <code className="text-axiom-cyan font-mono">{p.name}</code>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-axiom-panel/80 border border-axiom-edge/40 text-axiom-dim font-mono">
                    {p.type}
                  </span>
                  {p.required && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-axiom-rose/15 border border-axiom-rose/40 text-axiom-rose uppercase tracking-wider">
                      required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-axiom-dim mt-1">{p.description}</p>
                {p.default !== undefined && p.default !== null && (
                  <p className="text-[10px] text-axiom-dim/70 mt-0.5 font-mono">
                    default: {String(p.default)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* AI Describe */}
      <Section title="AI Description">
        <div className="space-y-2">
          {!aiDesc && !aiLoading && !aiError && (
            <p className="text-[11px] text-axiom-dim italic">
              Ask Scribe to describe this skill in plain language.
            </p>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 text-xs text-axiom-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="axiom-blink">Scribe is reading the instructions…</span>
            </div>
          )}
          {aiError && (
            <div className="text-xs text-axiom-rose">⚠️ {aiError}</div>
          )}
          {aiDesc && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded bg-axiom-panel/40 border border-axiom-emerald/30 text-xs text-axiom-text/90 leading-relaxed whitespace-pre-wrap"
            >
              {aiDesc}
            </motion.div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => askAi()}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald hover:bg-axiom-emerald/20 disabled:opacity-40 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" /> Describe this skill
            </button>
            <button
              onClick={() => askAi("When should I use this skill, and when should I avoid it?")}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text disabled:opacity-40"
            >
              When to use?
            </button>
            <button
              onClick={() => askAi("Give me 3 concrete example use cases for this skill.")}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text disabled:opacity-40"
            >
              Examples?
            </button>
          </div>
        </div>
      </Section>

      {/* Full instructions */}
      <Section
        title="Full Instructions"
        right={
          <button
            onClick={copyInstructions}
            className="text-[10px] text-axiom-dim hover:text-axiom-cyan flex items-center gap-1"
          >
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "copied" : "copy"}
          </button>
        }
      >
        <pre className="p-3 rounded bg-axiom-void/60 border border-axiom-edge/30 text-[11px] font-mono text-axiom-text/85 whitespace-pre-wrap break-words axiom-scroll max-h-96 overflow-y-auto leading-relaxed">
          {skill.instructions}
        </pre>
      </Section>

      {/* Metadata */}
      <Section title="Metadata">
        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <Meta k="ID" v={skill.id} mono />
          <Meta k="Source" v={skill.source} />
          <Meta k="Author" v={skill.author ?? "—"} />
          <Meta k="Version" v={skill.version ?? "—"} />
          <Meta k="Category" v={skill.category} />
          <Meta k="Created" v={new Date(skill.createdAt).toLocaleString()} />
          {skill.updatedAt && <Meta k="Updated" v={new Date(skill.updatedAt).toLocaleString()} />}
        </dl>
      </Section>
    </div>
  );
}

// ── Tool detail content ────────────────────────────────────────────────────

function ToolDetail({
  tool,
  onToggle,
  onInvoke,
}: {
  tool: Tool;
  onToggle: () => void;
  onInvoke: () => void;
}) {
  const [aiDesc, setAiDesc] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const askAi = async (question?: string) => {
    setAiLoading(true);
    setAiError(null);
    setAiDesc(null);
    try {
      const res = await fetch("/api/axiom/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "tool",
          name: tool.name,
          description: tool.description,
          instructions: tool.instructions,
          parameters: tool.parameters,
          tags: tool.tags,
          endpoint: tool.endpoint,
          returns: tool.returns,
          question,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAiDesc(data.reply || "…");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(tool.instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top: status + actions */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-axiom-panel/40 border border-axiom-edge/40">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border",
            tool.enabled
              ? "text-axiom-cyan border-axiom-cyan/40 bg-axiom-cyan/10"
              : "text-axiom-dim border-axiom-edge/40",
          )}
        >
          {tool.enabled ? "enabled" : "disabled"}
        </span>
        <span className="text-[10px] text-axiom-dim">
          {tool.source} · v{tool.version ?? "1.0.0"} · invoked {tool.invoked}×
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onInvoke}
            disabled={!tool.enabled}
            className="px-2 py-1 rounded text-[10px] border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 disabled:opacity-40 flex items-center gap-1"
          >
            <Play className="w-2.5 h-2.5" /> Test invoke
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "relative w-9 h-4 rounded-full transition-colors",
              tool.enabled ? "bg-axiom-cyan/60" : "bg-axiom-edge/40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                tool.enabled ? "translate-x-6" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      {/* Summary */}
      <Section title="Summary">
        <p className="text-xs text-axiom-dim">{tool.description}</p>
      </Section>

      {/* Endpoint / method / auth */}
      {(tool.endpoint || tool.method || tool.authRequired !== undefined) && (
        <Section title="Interface">
          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            {tool.endpoint && <Meta k="Endpoint" v={tool.endpoint} mono />}
            {tool.method && <Meta k="Method" v={tool.method} mono />}
            {tool.authRequired !== undefined && (
              <Meta k="Auth required" v={tool.authRequired ? "yes" : "no"} />
            )}
            {tool.returns && <Meta k="Returns" v={tool.returns} mono />}
          </dl>
        </Section>
      )}

      {/* Tags */}
      {tool.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {tool.tags.map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[10px] bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim flex items-center gap-1"
              >
                <Tag className="w-2 h-2" /> {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Parameters */}
      {tool.parameters.length > 0 && (
        <Section title={`Parameters (${tool.parameters.length})`}>
          <div className="space-y-1">
            {tool.parameters.map((p) => (
              <div
                key={p.name}
                className="p-2 rounded bg-axiom-panel/40 border border-axiom-edge/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <code className="text-axiom-cyan font-mono">{p.name}</code>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-axiom-panel/80 border border-axiom-edge/40 text-axiom-dim font-mono">
                    {p.type}
                  </span>
                  {p.required && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-axiom-rose/15 border border-axiom-rose/40 text-axiom-rose uppercase tracking-wider">
                      required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-axiom-dim mt-1">{p.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* AI Describe */}
      <Section title="AI Description">
        <div className="space-y-2">
          {!aiDesc && !aiLoading && !aiError && (
            <p className="text-[11px] text-axiom-dim italic">
              Ask Scribe to describe this tool in plain language.
            </p>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 text-xs text-axiom-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="axiom-blink">Scribe is reading the docs…</span>
            </div>
          )}
          {aiError && <div className="text-xs text-axiom-rose">⚠️ {aiError}</div>}
          {aiDesc && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded bg-axiom-panel/40 border border-axiom-cyan/30 text-xs text-axiom-text/90 leading-relaxed whitespace-pre-wrap"
            >
              {aiDesc}
            </motion.div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => askAi()}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20 disabled:opacity-40 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" /> Describe this tool
            </button>
            <button
              onClick={() => askAi("How do I call this tool from an agent?")}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text disabled:opacity-40"
            >
              How to call?
            </button>
            <button
              onClick={() => askAi("What does this tool return and what should I do with the result?")}
              disabled={aiLoading}
              className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text disabled:opacity-40"
            >
              What does it return?
            </button>
          </div>
        </div>
      </Section>

      {/* Full instructions */}
      <Section
        title="Full Documentation"
        right={
          <button
            onClick={copyInstructions}
            className="text-[10px] text-axiom-dim hover:text-axiom-cyan flex items-center gap-1"
          >
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "copied" : "copy"}
          </button>
        }
      >
        <pre className="p-3 rounded bg-axiom-void/60 border border-axiom-edge/30 text-[11px] font-mono text-axiom-text/85 whitespace-pre-wrap break-words axiom-scroll max-h-96 overflow-y-auto leading-relaxed">
          {tool.instructions}
        </pre>
      </Section>

      {/* Metadata */}
      <Section title="Metadata">
        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <Meta k="ID" v={tool.id} mono />
          <Meta k="Source" v={tool.source} />
          <Meta k="Author" v={tool.author ?? "—"} />
          <Meta k="Version" v={tool.version ?? "—"} />
          <Meta k="Category" v={tool.category} />
          <Meta k="Created" v={new Date(tool.createdAt).toLocaleString()} />
          {tool.updatedAt && <Meta k="Updated" v={new Date(tool.updatedAt).toLocaleString()} />}
        </dl>
      </Section>
    </div>
  );
}

// ── Small shared bits ───────────────────────────────────────────────────────

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="p-2 rounded bg-axiom-panel/30 border border-axiom-edge/30">
      <dt className="text-[9px] uppercase tracking-wider text-axiom-dim">{k}</dt>
      <dd className={cn("text-axiom-text/90 mt-0.5 truncate", mono && "font-mono text-[10px]")}>{v}</dd>
    </div>
  );
}

// ── Skill editor ────────────────────────────────────────────────────────────

function SkillEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Skill | null;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    longDescription?: string;
    instructions: string;
    category: string;
    tags: string[];
    glyph: string;
    parameters: SkillParameter[];
    author?: string;
    version?: string;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [longDescription, setLongDescription] = useState(initial?.longDescription ?? "");
  const [instructions, setInstructions] = useState(
    initial?.instructions ?? "# My Skill\n\n## When to use\n- \n\n## Steps\n1. \n",
  );
  const [category, setCategory] = useState(initial?.category ?? "Custom");
  const [tagsStr, setTagsStr] = useState((initial?.tags ?? []).join(", "));
  const [glyph, setGlyph] = useState(initial?.glyph ?? "✦");
  const [author, setAuthor] = useState(initial?.author ?? "operator");
  const [version, setVersion] = useState(initial?.version ?? "1.0.0");
  const [params, setParams] = useState<SkillParameter[]>(initial?.parameters ?? []);

  const valid = name.trim().length > 0 && instructions.trim().length > 0;

  return (
    <EditorModal
      title={initial ? `Edit Skill: ${initial.name}` : "Create New Skill"}
      accent="axiom-emerald"
      onClose={onClose}
      onSave={
        valid
          ? () =>
              onSave({
                name: name.trim(),
                description: description.trim() || name.trim(),
                longDescription: longDescription.trim() || undefined,
                instructions,
                category: category.trim() || "Custom",
                tags: tagsStr
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                glyph,
                parameters: params,
                author: author.trim() || undefined,
                version: version.trim() || undefined,
              })
          : undefined
      }
    >
      <Field label="Name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Email Drafter"
          className={inputCls}
        />
      </Field>

      <Field label="Glyph">
        <div className="flex flex-wrap gap-1">
          {GLYPH_CHOICES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGlyph(g)}
              className={cn(
                "w-7 h-7 rounded border flex items-center justify-center text-sm transition-colors",
                glyph === g
                  ? "border-axiom-emerald/60 bg-axiom-emerald/15 text-axiom-emerald"
                  : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Short description (shown on the card)">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence summary."
          className={inputCls}
        />
      </Field>

      <Field label="Longer overview (optional, shown in docs)">
        <textarea
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          rows={2}
          placeholder="2–3 sentences explaining what this skill does and when to reach for it."
          className={cn(inputCls, "resize-none")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Custom"
            className={inputCls}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="email, draft, writing"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Author">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Version">
          <input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Instructions (markdown — the agent receives this verbatim)">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={10}
          className={cn(inputCls, "font-mono text-[11px] leading-relaxed resize-y axiom-scroll")}
          style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
        />
      </Field>

      <ParametersEditor
        params={params}
        onChange={setParams}
        accent="axiom-emerald"
      />
    </EditorModal>
  );
}

// ── Tool editor ─────────────────────────────────────────────────────────────

function ToolEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Tool | null;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    instructions: string;
    category: string;
    tags: string[];
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "WS" | "STDIO";
    authRequired?: boolean;
    glyph: string;
    parameters: ToolParameter[];
    returns?: string;
    author?: string;
    version?: string;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(
    initial?.instructions ?? "# My Tool\n\n## When to use\n- \n\n## API\n```\nfn(args) → result\n```\n",
  );
  const [category, setCategory] = useState(initial?.category ?? "Custom");
  const [tagsStr, setTagsStr] = useState((initial?.tags ?? []).join(", "));
  const [glyph, setGlyph] = useState(initial?.glyph ?? "⚙");
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? "");
  const [method, setMethod] = useState<Tool["method"]>(initial?.method ?? "GET");
  const [authRequired, setAuthRequired] = useState(initial?.authRequired ?? false);
  const [returns, setReturns] = useState(initial?.returns ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "operator");
  const [version, setVersion] = useState(initial?.version ?? "1.0.0");
  const [params, setParams] = useState<ToolParameter[]>(initial?.parameters ?? []);

  const valid = name.trim().length > 0 && instructions.trim().length > 0;

  return (
    <EditorModal
      title={initial ? `Edit Tool: ${initial.name}` : "Create New Tool"}
      accent="axiom-cyan"
      onClose={onClose}
      onSave={
        valid
          ? () =>
              onSave({
                name: name.trim(),
                description: description.trim() || name.trim(),
                instructions,
                category: category.trim() || "Custom",
                tags: tagsStr
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                endpoint: endpoint.trim() || undefined,
                method,
                authRequired,
                glyph,
                parameters: params,
                returns: returns.trim() || undefined,
                author: author.trim() || undefined,
                version: version.trim() || undefined,
              })
          : undefined
      }
    >
      <Field label="Name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weather API"
          className={inputCls}
        />
      </Field>

      <Field label="Glyph">
        <div className="flex flex-wrap gap-1">
          {GLYPH_CHOICES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGlyph(g)}
              className={cn(
                "w-7 h-7 rounded border flex items-center justify-center text-sm transition-colors",
                glyph === g
                  ? "border-axiom-cyan/60 bg-axiom-cyan/15 text-axiom-cyan"
                  : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Short description">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence summary."
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Custom"
            className={inputCls}
          />
        </Field>
        <Field label="Tags (comma-separated)">
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="weather, api, network"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Endpoint (optional)">
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.example.com/v1 or axiom.fs.*"
            className={cn(inputCls, "font-mono text-[11px]")}
          />
        </Field>
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as Tool["method"])}
            className={inputCls}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="WS">WS</option>
            <option value="STDIO">STDIO</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Returns (optional)">
          <input
            value={returns}
            onChange={(e) => setReturns(e.target.value)}
            placeholder="e.g. Promise<Response> or string"
            className={cn(inputCls, "font-mono text-[11px]")}
          />
        </Field>
        <Field label="Auth required?">
          <button
            type="button"
            onClick={() => setAuthRequired(!authRequired)}
            className={cn(
              "relative w-9 h-4 rounded-full transition-colors mt-2",
              authRequired ? "bg-axiom-rose/60" : "bg-axiom-edge/40",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                authRequired ? "translate-x-6" : "translate-x-0",
              )}
            />
          </button>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Author">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Version">
          <input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Documentation / instructions (markdown — agents read this)">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={10}
          className={cn(inputCls, "font-mono text-[11px] leading-relaxed resize-y axiom-scroll")}
          style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
        />
      </Field>

      <ParametersEditor params={params} onChange={setParams} accent="axiom-cyan" />
    </EditorModal>
  );
}

// ── Editor shared bits ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">{label}</label>
      {children}
    </div>
  );
}

function EditorModal({
  title,
  accent,
  onClose,
  onSave,
  children,
}: {
  title: string;
  accent: string;
  onClose: () => void;
  onSave?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-40 bg-axiom-void/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="absolute inset-4 md:inset-8 z-50 bg-axiom-panel border border-axiom-edge/60 rounded-lg flex flex-col max-w-3xl mx-auto"
      >
        <div className="h-11 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className={cn("w-3.5 h-3.5", `text-${accent}`)} />
            <span className="text-sm font-medium text-axiom-text">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3">{children}</div>
        <div className="px-4 py-2.5 border-t border-axiom-edge/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-axiom-dim">
            {onSave ? "Ready to save." : "Fill in name + instructions to enable save."}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-axiom-dim hover:text-axiom-text"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!onSave}
              className={cn(
                "px-3 py-1.5 rounded text-xs border disabled:opacity-40",
                `bg-${accent}/15 border-${accent}/40 text-${accent} hover:bg-${accent}/25`,
              )}
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Parameters editor ───────────────────────────────────────────────────────

function ParametersEditor({
  params,
  onChange,
  accent,
}: {
  params: Array<{ name: string; type: ParamType; description: string; required?: boolean; default?: string | number | boolean | null }>;
  onChange: (next: any[]) => void;
  accent: string;
}) {
  const update = (i: number, patch: Partial<(typeof params)[number]>) => {
    const next = params.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(params.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([
      ...params,
      { name: `param${params.length + 1}`, type: "string", description: "", required: false },
    ]);

  return (
    <Field label={`Parameters (${params.length})`}>
      <div className="space-y-1.5">
        {params.map((p, i) => (
          <div
            key={i}
            className="p-2 rounded bg-axiom-deep/60 border border-axiom-edge/40 grid grid-cols-12 gap-1.5 items-start"
          >
            <input
              value={p.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="name"
              className="col-span-3 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-1.5 py-1 text-[11px] font-mono focus:outline-none focus:border-axiom-cyan/50"
            />
            <select
              value={p.type}
              onChange={(e) => update(i, { type: e.target.value as ParamType })}
              className="col-span-2 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-1 py-1 text-[10px] focus:outline-none"
            >
              {PARAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={p.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="description"
              className="col-span-5 bg-axiom-panel/60 border border-axiom-edge/40 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-axiom-cyan/50"
            />
            <button
              type="button"
              onClick={() => update(i, { required: !p.required })}
              className={cn(
                "col-span-1 px-1 py-1 rounded text-[9px] uppercase border tracking-wider",
                p.required
                  ? "bg-axiom-rose/15 border-axiom-rose/40 text-axiom-rose"
                  : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim",
              )}
              title="Toggle required"
            >
              req
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="col-span-1 w-6 h-6 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10"
              title="Remove parameter"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className={cn(
            "w-full px-2 py-1.5 rounded text-xs border border-dashed flex items-center justify-center gap-1.5 transition-colors",
            `border-${accent}/40 text-${accent}/80 hover:bg-${accent}/10`,
          )}
        >
          <Plus className="w-3 h-3" /> Add parameter
        </button>
      </div>
    </Field>
  );
}

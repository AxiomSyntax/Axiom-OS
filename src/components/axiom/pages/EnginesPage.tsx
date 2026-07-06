"use client";

import { useState } from "react";
import { useAxiom } from "@/lib/axiom/store";
import type { Engine, EngineStatus, LLMFamily, LLMModelTier, MCPServer } from "@/lib/axiom/types";
import {
  Cpu,
  Plus,
  Settings as SettingsIcon,
  Plug,
  Loader2,
  Check,
  X,
  Power,
  Trash2,
  Activity,
  Server,
  Globe,
  HardDrive,
  RefreshCw,
  Shield,
  Zap,
  ArrowRight,
  Key,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Status → dot color + label
const STATUS_META: Record<
  EngineStatus,
  { dot: string; label: string; ring: string; text: string }
> = {
  active: {
    dot: "bg-axiom-emerald",
    label: "Active",
    ring: "shadow-[0_0_0_3px_rgba(80,220,180,0.18)]",
    text: "text-axiom-emerald",
  },
  connected: {
    dot: "bg-axiom-cyan",
    label: "Connected",
    ring: "shadow-[0_0_0_3px_rgba(120,220,255,0.18)]",
    text: "text-axiom-cyan",
  },
  standby: {
    dot: "bg-axiom-amber",
    label: "Standby",
    ring: "shadow-[0_0_0_3px_rgba(255,200,90,0.15)]",
    text: "text-axiom-amber",
  },
  error: {
    dot: "bg-axiom-rose",
    label: "Error",
    ring: "shadow-[0_0_0_3px_rgba(255,130,140,0.18)]",
    text: "text-axiom-rose",
  },
  disabled: {
    dot: "bg-axiom-dim",
    label: "Disabled",
    ring: "",
    text: "text-axiom-dim",
  },
};

// Location → icon
const LOCATION_ICON = {
  Local: HardDrive,
  API: Globe,
  Hybrid: Server,
};

type EnginesTab = "engines" | "llm-registry" | "mcp";

export default function EnginesPage() {
  const { engines, addEngine, removeEngine, navigate, llmFamilies, mcps, addMcp, removeMcp, toggleMcp } = useAxiom();
  const [settingsFor, setSettingsFor] = useState<Engine | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<EnginesTab>("engines");

  const activeCount = engines.filter(
    (e) => e.status === "active" || e.status === "connected",
  ).length;

  const enabledFamilyCount = llmFamilies.filter((f) => f.enabled).length;
  const enabledModelCount = llmFamilies.reduce(
    (acc, f) => acc + f.models.filter((m) => m.enabled).length,
    0,
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-axiom-edge/40 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-medium text-axiom-text flex items-center gap-2">
            <Cpu className="w-4 h-4 text-axiom-amber" />
            Engines
          </h2>
          <p className="text-[11px] text-axiom-dim">
            Modular engine control center. Disabled engines & models are hidden from Chat Terminal & Agent Hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "engines" && (
            <>
              <button
                onClick={() => navigate("integrations")}
                className="px-2.5 py-1.5 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-cyan/40 flex items-center gap-1.5 transition-colors"
                title="View all integrations"
              >
                <Activity className="w-3 h-3" /> All Integrations
              </button>
              <button
                onClick={() => navigate("devlab")}
                className="px-2.5 py-1.5 rounded text-xs border bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber hover:bg-axiom-amber/25 flex items-center gap-1.5 transition-colors"
                title="Install engines via DevLab → Integration"
              >
                <Plus className="w-3 h-3" /> Add Engine
              </button>
            </>
          )}
          {activeTab === "mcp" && (
            <McpAddButton onAdd={(input) => addMcp(input)} />
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="px-4 pt-3 flex items-center gap-1 shrink-0">
        <button
          onClick={() => setActiveTab("engines")}
          className={cn(
            "px-3 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-colors",
            activeTab === "engines"
              ? "bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber"
              : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
          )}
        >
          <Zap className="w-3 h-3" />
          Runtime Engines
          <span className="text-[9px] opacity-70">({engines.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("llm-registry")}
          className={cn(
            "px-3 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-colors",
            activeTab === "llm-registry"
              ? "bg-axiom-cyan/15 border-axiom-cyan/40 text-axiom-cyan"
              : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
          )}
        >
          <Layers className="w-3 h-3" />
          LLM Registry
          <span className="text-[9px] opacity-70">({enabledModelCount} active)</span>
        </button>
        <button
          onClick={() => setActiveTab("mcp")}
          className={cn(
            "px-3 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-colors",
            activeTab === "mcp"
              ? "bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet"
              : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/60",
          )}
        >
          <Plug className="w-3 h-3" />
          MCP Servers
          <span className="text-[9px] opacity-70">({mcps.length})</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "engines" ? (
          <motion.div
            key="engines"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto axiom-scroll"
          >
            {/* Pipeline mandate banner */}
            <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-axiom-amber/20 bg-axiom-amber/5 flex items-center gap-2 text-[10px] text-axiom-amber/90">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Pipeline Mandate:</span>
              <span className="text-axiom-text/70">Tasks route exclusively through enabled engines. Reasoning complexity scales with active engine capability.</span>
            </div>

            <div className="p-4 space-y-5">
              {/* Core Primary Engines */}
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <Zap className="w-3.5 h-3.5 text-axiom-amber" />
                  <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-amber font-medium">Core Primary Engines</h3>
                  <span className="text-[10px] text-axiom-dim">— always prioritized</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {engines.filter(e => ["eng_hermes","eng_openclaw","eng_ollama"].includes(e.id)).map((engine) => (
                    <EngineCard key={engine.id} engine={engine} onSettings={() => setSettingsFor(engine)} />
                  ))}
                </div>
              </section>

              {/* Extended Integrations & Modular Engines */}
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <Server className="w-3.5 h-3.5 text-axiom-cyan" />
                  <h3 className="text-xs uppercase tracking-[0.2em] text-axiom-cyan font-medium">Extended Integrations</h3>
                  <span className="text-[10px] text-axiom-dim">— modular engines</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {engines.filter(e => !["eng_hermes","eng_openclaw","eng_ollama"].includes(e.id)).map((engine) => (
                    <EngineCard key={engine.id} engine={engine} onSettings={() => setSettingsFor(engine)} />
                  ))}
                </div>
              </section>
              {engines.length === 0 && (
                <div className="text-center py-16 text-axiom-dim">
                  <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs mb-3">No engines registered.</p>
                  <button
                    onClick={() => navigate("devlab")}
                    className="px-3 py-1.5 rounded text-xs border border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber hover:bg-axiom-amber/20 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" /> Add your first engine
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === "llm-registry" ? (
          <motion.div
            key="llm-registry"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto axiom-scroll"
          >
            <LLMRegistryView />
          </motion.div>
        ) : (
          <motion.div
            key="mcp"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto axiom-scroll"
          >
            <McpRegistryView
              mcps={mcps}
              onToggle={(id) => toggleMcp(id)}
              onRemove={(id) => removeMcp(id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {settingsFor && (
          <EngineSettingsModal
            engine={settingsFor}
            onClose={() => setSettingsFor(null)}
          />
        )}
      </AnimatePresence>

      {/* Add engine modal */}
      <AnimatePresence>
        {showAdd && (
          <AddEngineModal
            onClose={() => setShowAdd(false)}
            onAdd={(input) => {
              addEngine(input);
              setShowAdd(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Engine Card ─────────────────────────────────────────────────────────────

function EngineCard({
  engine,
  onSettings,
}: {
  engine: Engine;
  onSettings: () => void;
}) {
  const { updateEngine, testEngine, toggleEngine, removeEngine } = useAxiom();
  const [testing, setTesting] = useState(false);
  const [justTested, setJustTested] = useState(false);

  const status = STATUS_META[engine.status];
  const LocationIcon = LOCATION_ICON[engine.location];

  const handleTest = async () => {
    setTesting(true);
    await testEngine(engine.id);
    setTesting(false);
    setJustTested(true);
    setTimeout(() => setJustTested(false), 1800);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl border bg-axiom-panel/40 overflow-hidden flex flex-col",
        engine.enabled
          ? `border-${engine.color}/40`
          : "border-axiom-edge/40 opacity-90",
      )}
    >
      {/* Color accent bar */}
      <div className={cn("h-1 w-full", `bg-${engine.color}`)} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header: glyph + name + status dot */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "relative w-12 h-12 rounded-lg flex items-center justify-center text-2xl border shrink-0",
              `text-${engine.color} border-${engine.color}/30 bg-${engine.color}/10`,
            )}
          >
            {engine.glyph}
            {/* Status indicator dot — top-right of glyph.
                Uses the engine's own color (not a generic green/cyan/amber)
                so the dot matches the engine's brand accent. The status
                shape (filled vs ringed) still reflects active/standby. */}
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-axiom-deep",
                `bg-${engine.color}`,
                engine.status === "active" && "axiom-pulse-ring",
              )}
              title={status.label}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-axiom-text truncate">
                {engine.name}
              </h3>
              {["eng_hermes","eng_openclaw","eng_ollama"].includes(engine.id) && (
                <span className="px-1.5 py-0 rounded text-[8px] uppercase tracking-wider font-bold bg-axiom-amber/20 text-axiom-amber border border-axiom-amber/30 leading-tight">
                  Core
                </span>
              )}
            </div>
            <div className="text-[11px] text-axiom-dim leading-snug mt-0.5">
              {engine.type}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border",
                  `border-${engine.color}/30 bg-${engine.color}/10 ${status.text}`,
                )}
              >
                <span className={cn("w-1 h-1 rounded-full", status.dot)} />
                {status.label}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-axiom-edge/40 text-axiom-dim">
                <LocationIcon className="w-2.5 h-2.5" />
                {engine.location}
              </span>
            </div>
          </div>
        </div>

        {/* API address input */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-1">
            <Plug className="w-2.5 h-2.5" /> API Address
          </label>
          <div className="flex items-center gap-1">
            <input
              value={engine.apiAddress}
              onChange={(e) =>
                updateEngine(engine.id, { apiAddress: e.target.value })
              }
              spellCheck={false}
              className="flex-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
              placeholder="http://localhost:3000"
            />
            <button
              onClick={() =>
                updateEngine(engine.id, {
                  apiAddress: engine.defaultApiAddress,
                })
              }
              className="w-7 h-7 shrink-0 rounded border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan flex items-center justify-center transition-colors"
              title="Reset to default"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          {engine.lastTestedAt && (
            <div className="mt-1 text-[9px] text-axiom-dim/70 flex items-center gap-1.5">
              {engine.lastTestOk ? (
                <Check className="w-2.5 h-2.5 text-axiom-emerald" />
              ) : (
                <X className="w-2.5 h-2.5 text-axiom-rose" />
              )}
              last tested {timeAgo(engine.lastTestedAt)}
            </div>
          )}
        </div>

        {/* Models (if any) */}
        {engine.models && engine.models.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
              Models ({engine.models.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {engine.models.slice(0, 4).map((m) => (
                <span
                  key={m}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim font-mono"
                >
                  {m}
                </span>
              ))}
              {engine.models.length > 4 && (
                <span className="text-[10px] text-axiom-dim/60 self-center">
                  +{engine.models.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto pt-2 border-t border-axiom-edge/30 flex items-center gap-1.5">
          <button
            onClick={handleTest}
            disabled={testing}
            className={cn(
              "flex-1 px-2.5 py-1.5 rounded text-xs border flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50",
              justTested
                ? "border-axiom-emerald/50 bg-axiom-emerald/15 text-axiom-emerald"
                : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20",
            )}
          >
            {testing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Testing…
              </>
            ) : justTested ? (
              <>
                <Check className="w-3 h-3" /> Tested OK
              </>
            ) : (
              <>
                <Plug className="w-3 h-3" /> Test Connection
              </>
            )}
          </button>
          <button
            onClick={onSettings}
            className="px-2.5 py-1.5 rounded text-xs border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-text flex items-center gap-1.5 transition-colors"
            title="Engine settings"
          >
            <SettingsIcon className="w-3 h-3" /> Settings
          </button>
        </div>

        {/* Footer: enable toggle + delete */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1.5 text-[10px] text-axiom-dim cursor-pointer">
            <button
              onClick={() => toggleEngine(engine.id)}
              className="relative w-9 h-4 rounded-full transition-colors"
              style={{
                backgroundColor: engine.enabled
                  ? `rgba(${colorToRgb(engine.color)}, 0.6)`
                  : "rgba(160, 170, 200, 0.25)",
              }}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform",
                  engine.enabled ? "translate-x-6" : "translate-x-0",
                )}
              />
            </button>
            <Power className="w-2.5 h-2.5" />
            <span>{engine.enabled ? "Enabled" : "Disabled"}</span>
          </label>
          <button
            onClick={() => {
              if (confirm(`Remove engine "${engine.name}"?`)) {
                removeEngine(engine.id);
              }
            }}
            className="text-[10px] text-axiom-dim hover:text-axiom-rose flex items-center gap-1 transition-colors"
            title="Remove engine"
          >
            <Trash2 className="w-2.5 h-2.5" /> Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Settings modal ──────────────────────────────────────────────────────────

function EngineSettingsModal({
  engine,
  onClose,
}: {
  engine: Engine;
  onClose: () => void;
}) {
  const { updateEngine, engines } = useAxiom();
  // Look up the live engine from the store so edits propagate
  const live = engines.find((e) => e.id === engine.id) ?? engine;
  const [configDraft, setConfigDraft] = useState<Record<string, string>>(
    live.config ?? {},
  );

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
        className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[80vh] z-50 bg-axiom-panel border border-axiom-edge/60 rounded-lg flex flex-col"
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-xl", `text-${live.color}`)}>{live.glyph}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-axiom-text truncate">
                {live.name} — Settings
              </div>
              <div className="text-[10px] text-axiom-dim">{live.type}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-4">
          {/* Description */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
              About
            </div>
            <p className="text-xs text-axiom-text/85 leading-relaxed">
              {live.description}
            </p>
          </div>

          {/* Status row */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Status" value={STATUS_META[live.status].label} color={STATUS_META[live.status].text} />
            <Stat label="Location" value={live.location} />
            <Stat label="Kind" value={live.kind} />
          </div>

          {/* API address (full width) */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              API Address
            </label>
            <input
              value={live.apiAddress}
              onChange={(e) =>
                updateEngine(live.id, { apiAddress: e.target.value })
              }
              spellCheck={false}
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
            />
            <div className="text-[9px] text-axiom-dim/60 mt-1">
              Default: <code className="font-mono">{live.defaultApiAddress}</code>
            </div>
          </div>

          {/* Models */}
          {live.models && live.models.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
                Available Models ({live.models.length})
              </div>
              <div className="space-y-1">
                {live.models.map((m) => (
                  <div
                    key={m}
                    className="px-2 py-1.5 rounded bg-axiom-deep/50 border border-axiom-edge/40 text-xs font-mono text-axiom-text/90 flex items-center justify-between"
                  >
                    <span>{m}</span>
                    <span className="text-[9px] text-axiom-dim/60 uppercase tracking-wider">
                      ready
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config key/values */}
          {Object.keys(configDraft).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
                Configuration
              </div>
              <div className="space-y-1.5">
                {Object.entries(configDraft).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-2 items-center">
                    <label className="text-[11px] text-axiom-dim truncate">
                      {k}
                    </label>
                    <input
                      value={v}
                      onChange={(e) => {
                        const next = { ...configDraft, [k]: e.target.value };
                        setConfigDraft(next);
                        updateEngine(live.id, { config: next });
                      }}
                      className="bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-[11px] font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
              Metadata
            </div>
            <dl className="grid grid-cols-2 gap-2 text-[11px]">
              <Meta k="ID" v={live.id} mono />
              <Meta k="Created" v={new Date(live.createdAt).toLocaleDateString()} />
              {live.lastTestedAt && (
                <Meta
                  k="Last tested"
                  v={new Date(live.lastTestedAt).toLocaleString()}
                />
              )}
              <Meta k="Test result" v={live.lastTestOk ? "OK" : live.lastTestOk === false ? "Failed" : "—"} />
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-axiom-edge/40 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className={cn(
              "px-3 py-1.5 rounded text-xs border",
              `bg-${live.color}/15 border-${live.color}/40 text-${live.color} hover:bg-${live.color}/25`,
            )}
          >
            Done
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-2 rounded bg-axiom-panel/40 border border-axiom-edge/30">
      <div className="text-[9px] uppercase tracking-wider text-axiom-dim">
        {label}
      </div>
      <div className={cn("text-xs mt-0.5 capitalize", color ?? "text-axiom-text")}>
        {value}
      </div>
    </div>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="p-2 rounded bg-axiom-panel/30 border border-axiom-edge/30">
      <dt className="text-[9px] uppercase tracking-wider text-axiom-dim">{k}</dt>
      <dd className={cn("text-axiom-text/90 mt-0.5 truncate", mono && "font-mono text-[10px]")}>
        {v}
      </dd>
    </div>
  );
}

// ── Add Engine modal ────────────────────────────────────────────────────────

const GLYPH_CHOICES = ["⚙", "🜂", "🌐", "🦙", "🔮", "⚡", "🧠", "🛠", "📡", "🔌"];
const COLOR_CHOICES = [
  { id: "axiom-cyan", label: "Cyan" },
  { id: "axiom-emerald", label: "Emerald" },
  { id: "axiom-amber", label: "Amber" },
  { id: "axiom-violet", label: "Violet" },
  { id: "axiom-rose", label: "Rose" },
];

function AddEngineModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (input: {
    name: string;
    type: string;
    description?: string;
    kind?: import("@/lib/axiom/types").EngineKind;
    location?: "Local" | "API" | "Hybrid";
    apiAddress: string;
    glyph?: string;
    color?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [apiAddress, setApiAddress] = useState("http://localhost:3000");
  const [glyph, setGlyph] = useState("⚙");
  const [color, setColor] = useState("axiom-cyan");
  const [kind, setKind] = useState<import("@/lib/axiom/types").EngineKind>("custom");
  const [location, setLocation] = useState<"Local" | "API" | "Hybrid">("API");

  const valid = name.trim().length > 0 && apiAddress.trim().length > 0;

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
        className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] z-50 bg-axiom-panel border border-axiom-edge/60 rounded-lg flex flex-col"
      >
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-axiom-amber" />
            <span className="text-sm font-medium text-axiom-text">Add Engine</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. vLLM Server"
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              Type (tagline)
            </label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Local LLM Inference"
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this engine do?"
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50 resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              API Address
            </label>
            <input
              value={apiAddress}
              onChange={(e) => setApiAddress(e.target.value)}
              spellCheck={false}
              placeholder="http://localhost:3000"
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
                Kind
              </label>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as import("@/lib/axiom/types").EngineKind)
                }
                className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
              >
                <option value="autonomous">Autonomous</option>
                <option value="gateway">Gateway</option>
                <option value="local-llm">Local LLM</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
                Location
              </label>
              <select
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value as "Local" | "API" | "Hybrid")
                }
                className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
              >
                <option value="Local">Local</option>
                <option value="API">API</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              Glyph
            </label>
            <div className="flex flex-wrap gap-1">
              {GLYPH_CHOICES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGlyph(g)}
                  className={cn(
                    "w-7 h-7 rounded border flex items-center justify-center text-sm transition-colors",
                    glyph === g
                      ? "border-axiom-amber/60 bg-axiom-amber/15 text-axiom-amber"
                      : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] border flex items-center gap-1.5 transition-colors",
                    color === c.id
                      ? `bg-${c.id}/15 border-${c.id}/50 text-${c.id}`
                      : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", `bg-${c.id}`)} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-axiom-edge/40 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-axiom-dim hover:text-axiom-text"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onAdd({
                name: name.trim(),
                type: type.trim() || "Custom Engine",
                description: description.trim() || undefined,
                kind,
                location,
                apiAddress: apiAddress.trim(),
                glyph,
                color,
              })
            }
            disabled={!valid}
            className="px-3 py-1.5 rounded text-xs border bg-axiom-amber/15 border-axiom-amber/40 text-axiom-amber hover:bg-axiom-amber/25 disabled:opacity-40"
          >
            Add Engine
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── LLM Registry View ────────────────────────────────────────────────────────

const TIER_META: Record<LLMModelTier, { label: string; color: string; bg: string; border: string }> = {
  flagship: { label: "Flagship", color: "text-axiom-amber", bg: "bg-axiom-amber/15", border: "border-axiom-amber/30" },
  standard: { label: "Standard", color: "text-axiom-cyan", bg: "bg-axiom-cyan/10", border: "border-axiom-cyan/25" },
  lightweight: { label: "Lightweight", color: "text-axiom-emerald", bg: "bg-axiom-emerald/10", border: "border-axiom-emerald/25" },
  specialized: { label: "Specialized", color: "text-axiom-violet", bg: "bg-axiom-violet/10", border: "border-axiom-violet/25" },
};

function LLMRegistryView() {
  const { llmFamilies, toggleLLMFamily, toggleLLMModel, setLLMApiKey, validateLLMKey } = useAxiom();
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [keyVisibility, setKeyVisibility] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<string | null>(null);

  const enabledCount = llmFamilies.filter((f) => f.enabled).length;
  const totalModels = llmFamilies.reduce((a, f) => a + f.models.length, 0);
  const enabledModels = llmFamilies.reduce(
    (a, f) => a + f.models.filter((m) => m.enabled).length, 0,
  );

  const handleValidate = async (familyId: string) => {
    setValidating(familyId);
    await validateLLMKey(familyId);
    setValidating(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* LLM Registry banner */}
      <div className="px-3 py-2 rounded-lg border border-axiom-cyan/20 bg-axiom-cyan/5 flex items-center gap-2 text-[10px] text-axiom-cyan/90">
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">LLM Management Layer:</span>
        <span className="text-axiom-text/70">
          Separate from runtime engines. Each model family has independent toggles and API keys.
          Disabled families are instantly removed from Chat Terminal & Agent Hub dropdowns.
        </span>
      </div>

      {/* Fallback Chain Banner */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.08 }}
        className="space-y-1.5"
      >
        <div className="text-[9px] uppercase tracking-[0.2em] text-axiom-dim font-medium flex items-center gap-1.5">
          <ArrowRight className="w-2.5 h-2.5" />
          Fallback Chain
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 axiom-scroll">
          {[...llmFamilies]
            .sort((a, b) => a.fallbackPriority - b.fallbackPriority)
            .map((f, idx, arr) => {
              const emCount = f.models.filter((m) => m.enabled).length;
              return (
                <div key={f.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
                      !f.enabled && "border-axiom-edge/20 bg-axiom-deep/20 opacity-40",
                    )}
                    style={f.enabled ? {
                      borderColor: `rgba(${colorToRgb(f.color)}, 0.4)`,
                      backgroundColor: `rgba(${colorToRgb(f.color)}, 0.1)`,
                    } : undefined}
                    title={`Priority #${f.fallbackPriority} — ${f.enabled ? "enabled" : "disabled"}`}
                  >
                    <span
                      className={cn(
                        "text-sm leading-none",
                        !f.enabled && "text-axiom-dim line-through",
                      )}
                      style={f.enabled ? { color: `rgb(${colorToRgb(f.color)})` } : undefined}
                    >
                      {f.glyph}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium max-w-[80px] truncate",
                        f.enabled ? "text-axiom-text" : "text-axiom-dim line-through",
                      )}
                    >
                      {f.name}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] tabular-nums px-1.5 py-0.5 rounded-full",
                        !f.enabled && "bg-axiom-edge/20 text-axiom-dim",
                      )}
                      style={f.enabled ? {
                        backgroundColor: `rgba(${colorToRgb(f.color)}, 0.2)`,
                        color: `rgb(${colorToRgb(f.color)})`,
                      } : undefined}
                    >
                      {emCount}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-axiom-dim/30 shrink-0" />
                  )}
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-axiom-panel/40 border border-axiom-edge/30">
          <div className="text-[9px] uppercase tracking-wider text-axiom-dim">Families</div>
          <div className="text-sm font-medium text-axiom-text mt-0.5">
            <span className="text-axiom-emerald">{enabledCount}</span>
            <span className="text-axiom-dim">/{llmFamilies.length}</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-axiom-panel/40 border border-axiom-edge/30">
          <div className="text-[9px] uppercase tracking-wider text-axiom-dim">Models Active</div>
          <div className="text-sm font-medium text-axiom-text mt-0.5">
            <span className="text-axiom-cyan">{enabledModels}</span>
            <span className="text-axiom-dim">/{totalModels}</span>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-axiom-panel/40 border border-axiom-edge/30">
          <div className="text-[9px] uppercase tracking-wider text-axiom-dim">Fallback</div>
          <div className="text-xs text-axiom-text mt-1 leading-snug">
            Auto-reroute to next <span className="text-axiom-emerald">lightweight</span> LLM on failure
          </div>
        </div>
      </div>

      {/* Family cards */}
      <div className="space-y-2.5">
        {llmFamilies.map((family) => (
          <LLMFamilyCard
            key={family.id}
            family={family}
            expanded={expandedFamily === family.id}
            onToggleExpand={() =>
              setExpandedFamily(expandedFamily === family.id ? null : family.id)
            }
            onToggleFamily={() => toggleLLMFamily(family.id)}
            onToggleModel={(modelId) => toggleLLMModel(family.id, modelId)}
            onSetApiKey={(key) => setLLMApiKey(family.id, key)}
            onValidateKey={() => handleValidate(family.id)}
            validating={validating === family.id}
            showKey={keyVisibility[family.id] ?? false}
            onToggleKeyVisibility={() =>
              setKeyVisibility((s) => ({ ...s, [family.id]: !s[family.id] }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function LLMFamilyCard({
  family,
  expanded,
  onToggleExpand,
  onToggleFamily,
  onToggleModel,
  onSetApiKey,
  onValidateKey,
  validating,
  showKey,
  onToggleKeyVisibility,
}: {
  family: LLMFamily;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleFamily: () => void;
  onToggleModel: (modelId: string) => void;
  onSetApiKey: (key: string) => void;
  onValidateKey: () => void;
  validating: boolean;
  showKey: boolean;
  onToggleKeyVisibility: () => void;
}) {
  const { getFallbackModel, llmFamilies } = useAxiom();
  const enabledModels = family.models.filter((m) => m.enabled).length;

  // Compute next fallback family using store logic
  const firstEnabledModel = family.models.find((m) => m.enabled);
  const fallback = firstEnabledModel ? getFallbackModel(firstEnabledModel.id) : null;
  const fallbackFamily =
    fallback && fallback.familyId !== family.id
      ? llmFamilies.find((f) => f.id === fallback.familyId) ?? null
      : null;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border bg-axiom-panel/40 overflow-hidden transition-colors",
        family.enabled
          ? `border-${family.color}/40`
          : "border-axiom-edge/30 opacity-80",
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-3.5">
        {/* Glyph */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-xl border shrink-0",
            `text-${family.color} border-${family.color}/30 bg-${family.color}/10`,
          )}
        >
          {family.glyph}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-axiom-text truncate">
              {family.name}
            </h3>
            {family.keyValidated && (
              <span className="flex items-center gap-0.5 px-1.5 py-0 rounded text-[8px] uppercase tracking-wider font-bold bg-axiom-emerald/20 text-axiom-emerald border border-axiom-emerald/30 leading-tight">
                <Check className="w-2 h-2" /> Key Valid
              </span>
            )}
          </div>
          <div className="text-[11px] text-axiom-dim leading-snug truncate">
            {family.tagline}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-axiom-dim">
              {enabledModels}/{family.models.length} models
            </span>
            <span className="text-[9px] text-axiom-dim">·</span>
            <span className="text-[9px] text-axiom-dim">Fallback #{family.fallbackPriority}</span>
            {family.apiKey && (
              <>
                <span className="text-[9px] text-axiom-dim">·</span>
                <span className="text-[9px] text-axiom-emerald flex items-center gap-0.5">
                  <Key className="w-2 h-2" /> Key set
                </span>
              </>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggleFamily}
          className="relative w-9 h-5 rounded-full transition-colors shrink-0"
          style={{
            backgroundColor: family.enabled
              ? `rgba(${colorToRgb(family.color)}, 0.6)`
              : "rgba(160, 170, 200, 0.25)",
          }}
        >
          <span
            className={cn(
              "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
              family.enabled ? "translate-x-4" : "translate-x-0",
            )}
          />
        </button>

        {/* Expand chevron */}
        <button
          onClick={onToggleExpand}
          className={cn(
            "w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text transition-all shrink-0",
            expanded && "rotate-90",
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-axiom-edge/30 p-3.5 space-y-3">
              {/* Description */}
              <p className="text-[11px] text-axiom-text/70 leading-relaxed">
                {family.description}
              </p>

              {/* API Key row */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-1">
                  <Key className="w-2.5 h-2.5" /> {family.apiKeyVar}
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={family.apiKey}
                      onChange={(e) => onSetApiKey(e.target.value)}
                      spellCheck={false}
                      placeholder={`Enter ${family.name} API key…`}
                      className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded-lg px-3 py-1.5 pr-8 text-xs font-mono text-axiom-text focus:outline-none focus:border-axiom-cyan/50"
                    />
                    <button
                      onClick={onToggleKeyVisibility}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-axiom-dim hover:text-axiom-text"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={onValidateKey}
                    disabled={validating || !family.apiKey}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0",
                      family.keyValidated
                        ? "border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald"
                        : "border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan hover:bg-axiom-cyan/20",
                    )}
                  >
                    {validating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : family.keyValidated ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Plug className="w-3 h-3" />
                    )}
                    {family.keyValidated ? "Valid" : "Validate"}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[9px] text-axiom-dim/60 font-mono truncate">
                    Base: {family.apiBase}
                  </div>
                  {family.lastValidatedAt && (
                    <div className="text-[9px] text-axiom-dim/50">
                      Validated {new Date(family.lastValidatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Models grid */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-2 flex items-center gap-2">
                  <span>Models</span>
                  <span className="text-[9px] opacity-60">— toggle individual models</span>
                </div>
                <div className="space-y-1.5">
                  {family.models.map((model) => {
                    const tier = TIER_META[model.tier];
                    return (
                      <div
                        key={model.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border transition-colors group",
                          model.enabled
                            ? "bg-axiom-panel/30 border-axiom-edge/30"
                            : "bg-axiom-deep/20 border-axiom-edge/20 opacity-60",
                        )}
                      >
                        {/* Toggle */}
                        <button
                          onClick={() => onToggleModel(model.id)}
                          className="relative w-7 h-4 rounded-full transition-colors shrink-0"
                          style={{
                            backgroundColor: model.enabled
                              ? `rgba(${colorToRgb(family.color)}, 0.6)`
                              : "rgba(160, 170, 200, 0.2)",
                          }}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                              model.enabled ? "translate-x-3" : "translate-x-0",
                            )}
                          />
                        </button>

                        {/* Model info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-axiom-text truncate">
                              {model.name}
                            </span>
                            <span className={cn(
                              "px-1.5 py-0 rounded text-[8px] uppercase tracking-wider font-bold border leading-tight",
                              `${tier.bg} ${tier.border} ${tier.color}`,
                            )}>
                              {tier.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-axiom-dim/70 mt-0.5 truncate">
                            {model.description}
                          </div>
                        </div>

                        {/* Capabilities badges */}
                        <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-[200px] justify-end shrink-0">
                          {model.capabilities.slice(0, 3).map((cap) => (
                            <span
                              key={cap}
                              className="px-1.5 py-0.5 rounded text-[8px] bg-axiom-panel/50 border border-axiom-edge/30 text-axiom-dim"
                            >
                              {cap}
                            </span>
                          ))}
                          {model.capabilities.length > 3 && (
                            <span className="text-[8px] text-axiom-dim/50">
                              +{model.capabilities.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Context window + cost */}
                        <div className="text-right shrink-0 hidden md:block">
                          <div className="text-[9px] text-axiom-dim">
                            {(model.contextWindow / 1000).toFixed(0)}k ctx
                          </div>
                          <div className="text-[9px] text-axiom-dim/60">
                            ${model.costPer1kInput}/${model.costPer1kOutput} per 1k
                          </div>
                        </div>

                        {/* Model ID (monospace) */}
                        <div className="text-[9px] font-mono text-axiom-dim/50 max-w-[140px] truncate hidden lg:block shrink-0">
                          {model.modelId}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fallback info line */}
              <div className="border-t border-axiom-edge/20 pt-2 flex items-center gap-1.5 text-[10px]">
                <ArrowRight className="w-3 h-3 text-axiom-dim/60" />
                <span className="text-axiom-dim">Next fallback:</span>
                {fallbackFamily ? (
                  <>
                    <span className={cn("font-medium", `text-${fallbackFamily.color}`)}>
                      {fallbackFamily.glyph} {fallbackFamily.name}
                    </span>
                    {fallback && (
                      <span className="text-axiom-dim/50">
                        → {fallback.modelName}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-axiom-dim/40 italic">End of chain</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ════════════════════════════════════════════════════════════════════════════
//  colorToRgb — resolves an axiom color token to an RGB triplet string for
//  inline-style usage. This bypasses Tailwind's purge of dynamically-
//  constructed classes (bg-${color}/60) by using explicit inline styles.
// ════════════════════════════════════════════════════════════════════════════

function colorToRgb(color: string): string {
  switch (color) {
    case "axiom-cyan": return "120,220,255";
    case "axiom-emerald": return "80,220,180";
    case "axiom-amber": return "255,200,90";
    case "axiom-violet": return "180,130,255";
    case "axiom-rose": return "255,130,140";
    case "axiom-dim": return "160,170,200";
    case "axiom-sapphire": return "74,144,226";
    case "axiom-silver": return "192,192,192";
    case "axiom-indigo": return "100,100,220";
    case "axiom-navy": return "60,90,180";
    case "axiom-graphite": return "60,70,85";
    case "axiom-orange": return "255,160,60";
    default: return "120,220,255";
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  MCP Registry View — MCP Server management (moved from Settings)
//  MCP Servers are infrastructure. This tab is the single management surface
//  for MCP servers in Axiom OS — Settings no longer manages them.
// ════════════════════════════════════════════════════════════════════════════

function McpRegistryView({
  mcps,
  onToggle,
  onRemove,
}: {
  mcps: MCPServer[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = (id: string) => {
    setTestingId(id);
    // Simulate connection test (same behavior as the old Settings test)
    setTimeout(() => {
      useAxiom.setState((s) => ({
        mcps: s.mcps.map((m) =>
          m.id === id ? { ...m, connected: !m.connected, enabled: true } : m,
        ),
      }));
      setTestingId(null);
    }, 800);
  };

  if (mcps.length === 0) {
    return (
      <div className="p-8 text-center">
        <Plug className="w-10 h-10 mx-auto mb-3 text-axiom-dim/30" />
        <p className="text-xs text-axiom-dim mb-1">No MCP servers registered.</p>
        <p className="text-[11px] text-axiom-dim/60">
          Add a server above or install one via DevLab → Integration.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2 max-w-4xl">
      <div className="mb-3 flex items-center gap-2">
        <Plug className="w-4 h-4 text-axiom-violet" />
        <span className="text-sm font-medium text-axiom-text">MCP Servers</span>
        <span className="text-[10px] text-axiom-dim">
          Model Context Protocol servers — infrastructure-level tool providers.
        </span>
      </div>
      {mcps.map((mcp) => (
        <McpCard
          key={mcp.id}
          mcp={mcp}
          onToggle={() => onToggle(mcp.id)}
          onRemove={() => onRemove(mcp.id)}
          onTest={() => handleTest(mcp.id)}
          testing={testingId === mcp.id}
        />
      ))}
    </div>
  );
}

function McpCard({
  mcp,
  onToggle,
  onRemove,
  onTest,
  testing,
}: {
  mcp: MCPServer;
  onToggle: () => void;
  onRemove: () => void;
  onTest: () => void;
  testing: boolean;
}) {
  const statusColor = mcp.connected
    ? "bg-axiom-emerald"
    : mcp.enabled
      ? "bg-axiom-amber"
      : "bg-axiom-dim/40";
  const statusLabel = mcp.connected ? "connected" : mcp.enabled ? "standby" : "disabled";

  return (
    <div
      className={cn(
        "p-3 rounded-md border transition-all duration-200 group hover:border-axiom-violet/40",
        mcp.enabled
          ? "bg-axiom-panel/50 border-axiom-edge/40 hover:bg-axiom-panel/60"
          : "bg-axiom-panel/20 border-axiom-edge/30 opacity-60 hover:opacity-80",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-md flex items-center justify-center text-lg border text-axiom-violet border-axiom-violet/30 bg-axiom-violet/10">
            🔌
          </div>
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-axiom-void", statusColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-axiom-text font-medium">{mcp.name}</span>
            {mcp.tools.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-dim tabular-nums">
                {mcp.tools.length} tools
              </span>
            )}
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border",
                mcp.connected
                  ? "text-axiom-emerald border-axiom-emerald/40 bg-axiom-emerald/10"
                  : mcp.enabled
                    ? "text-axiom-amber border-axiom-amber/40 bg-axiom-amber/10"
                    : "text-axiom-dim border-axiom-edge/40",
              )}
            >
              {statusLabel}
            </span>
          </div>
          <div className="text-[10px] font-mono text-axiom-dim mt-0.5 truncate">{mcp.url}</div>
          {mcp.description && <div className="text-[11px] text-axiom-dim mt-1">{mcp.description}</div>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onTest}
            disabled={testing}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center border transition-colors",
              testing
                ? "border-axiom-violet/40 text-axiom-violet"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40",
            )}
            title="Test connection"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center border transition-colors",
              mcp.enabled
                ? "border-axiom-emerald/40 text-axiom-emerald hover:bg-axiom-emerald/10"
                : "border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
            )}
            title={mcp.enabled ? "Disable" : "Enable"}
          >
            <Power className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function McpAddButton({ onAdd }: { onAdd: (input: { name: string; url: string; description?: string }) => void }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    onAdd({ name: name.trim(), url: url.trim(), description: desc.trim() || undefined });
    setName(""); setUrl(""); setDesc(""); setShow(false);
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="px-2.5 py-1.5 rounded text-xs border bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet hover:bg-axiom-violet/25 flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add Server
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-28 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-violet/50"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="http://localhost:3001"
        className="w-44 bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1 text-xs text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none focus:border-axiom-violet/50"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <button
        onClick={handleAdd}
        className="px-2 py-1 rounded text-xs border border-axiom-violet/40 bg-axiom-violet/15 text-axiom-violet hover:bg-axiom-violet/25"
      >
        Add
      </button>
      <button
        onClick={() => { setShow(false); setName(""); setUrl(""); setDesc(""); }}
        className="px-2 py-1 rounded text-xs border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text"
      >
        Cancel
      </button>
    </div>
  );
}

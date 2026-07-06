"use client";

import { motion } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";
import {
  Network,
  Bot,
  Code2,
  Layers,
  Cpu,
  GitBranch,
  Brain,
  Wrench,
  Shield,
  Workflow,
  AppWindow,
  Zap,
  ArrowRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const TECH_STACK = [
  { name: "Next.js 16", tag: "App Router" },
  { name: "React 19", tag: "RSC" },
  { name: "TypeScript 5", tag: "Strict" },
  { name: "Tailwind CSS 4", tag: "oklch" },
  { name: "Zustand 5", tag: "State" },
  { name: "Framer Motion 12", tag: "Animation" },
  { name: "Recharts 2", tag: "Charts" },
  { name: "shadcn/ui", tag: "Components" },
  { name: "z-ai-web-dev-sdk", tag: "AI" },
  { name: "StorageService", tag: "Local + Pluggable" },
  { name: "Lucide React", tag: "Icons" },
  { name: "dnd-kit", tag: "Drag & Drop" },
];

export default function AboutPage() {
  const installedAgents = useAxiom((s) => s.installedAgents);
  const apps = useAxiom((s) => s.apps);
  const graph = useAxiom((s) => s.graph);
  const providers = useAxiom((s) => s.providers);
  const engines = useAxiom((s) => s.engines);
  const skills = useAxiom((s) => s.skills);
  const tools = useAxiom((s) => s.tools);
  const llmFamilies = useAxiom((s) => s.llmFamilies);
  const folders = useAxiom((s) => s.folders);
  const workflows = useAxiom((s) => s.workflows);
  const activity = useAxiom((s) => s.activity);

  const enabledAgents = installedAgents.filter((a) => a.enabled).length;
  const enabledEngines = engines.filter((e) => e.enabled).length;
  const activeEngines = engines.filter(
    (e) => e.status === "active" || e.status === "connected",
  ).length;
  const enabledSkills = skills.filter((s) => s.enabled).length;
  const enabledTools = tools.filter((t) => t.enabled).length;
  const enabledFamilies = llmFamilies.filter((f) => f.enabled).length;
  const enabledModels = llmFamilies.reduce(
    (acc, f) => acc + f.models.filter((m) => m.enabled).length,
    0,
  );
  const totalModels = llmFamilies.reduce((acc, f) => acc + f.models.length, 0);
  const runningApps = apps.filter((a) => a.running).length;
  const connectedApps = apps.filter((a) => a.connected).length;
  const bookmarkedNodes = graph.nodes.filter((n) => n.bookmarked).length;
  const recentActivity = activity.slice(-8).reverse();

  const inventoryCards = [
    {
      icon: Network,
      color: "axiom-cyan",
      label: "Memory Graph",
      stats: [
        { label: "Nodes", value: graph.nodes.length },
        { label: "Edges", value: graph.edges.length },
        { label: "Folders", value: folders.length },
        { label: "Bookmarked", value: bookmarkedNodes },
      ],
    },
    {
      icon: Bot,
      color: "axiom-emerald",
      label: "Agent Roster",
      stats: [
        { label: "Installed", value: installedAgents.length },
        { label: "Enabled", value: enabledAgents },
        {
          label: "Tokens Used",
          value: installedAgents.reduce((a, b) => a + b.tokensUsed, 0),
        },
        {
          label: "Cost",
          value: `$${installedAgents.reduce((a, b) => a + b.costUsd, 0).toFixed(2)}`,
        },
      ],
    },
    {
      icon: Wrench,
      color: "axiom-violet",
      label: "Skills & Tools",
      stats: [
        { label: "Skills", value: skills.length },
        { label: "Enabled", value: enabledSkills },
        { label: "Tools", value: tools.length },
        { label: "Enabled", value: enabledTools },
      ],
    },
    {
      icon: Cpu,
      color: "axiom-amber",
      label: "Engine Fleet",
      stats: [
        { label: "Total", value: engines.length },
        { label: "Enabled", value: enabledEngines },
        { label: "Active", value: activeEngines },
        { label: "Disabled", value: engines.length - enabledEngines },
      ],
    },
    {
      icon: Brain,
      color: "axiom-cyan",
      label: "LLM Registry",
      stats: [
        { label: "Families", value: llmFamilies.length },
        { label: "Enabled", value: enabledFamilies },
        { label: "Models", value: totalModels },
        { label: "Active", value: enabledModels },
      ],
    },
    {
      icon: AppWindow,
      color: "axiom-rose",
      label: "App Ecosystem",
      stats: [
        { label: "Total", value: apps.length },
        { label: "Running", value: runningApps },
        { label: "Connected", value: connectedApps },
        { label: "Workflows", value: workflows.length },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto axiom-scroll">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* ── Hero Section ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center pt-4 pb-2"
        >
          {/* Logo orb */}
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 axiom-pulse-ring rounded-full border border-axiom-cyan/40" />
            <div className="relative w-20 h-20 rounded-full border border-axiom-cyan/50 flex items-center justify-center axiom-glow-cyan mx-auto">
              <svg viewBox="0 0 64 64" className="w-12 h-12">
                <circle cx="32" cy="32" r="3" fill="rgb(120,220,255)" />
                <circle cx="32" cy="32" r="12" fill="none" stroke="rgb(120,220,255)" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="22" fill="none" stroke="rgb(120,220,255)" strokeWidth="1" opacity="0.5" />
                <circle cx="32" cy="20" r="1.8" fill="rgb(80,220,180)" />
                <circle cx="44" cy="32" r="1.8" fill="rgb(255,200,90)" />
                <circle cx="32" cy="44" r="1.8" fill="rgb(180,130,255)" />
                <circle cx="20" cy="32" r="1.8" fill="rgb(255,130,140)" />
              </svg>
            </div>
          </div>

          {/* Title with neon glow */}
          <h1 className="text-3xl font-light tracking-[0.3em] axiom-neon-text">
            AXIOM <span className="text-axiom-cyan">OS</span>
          </h1>

          {/* Version badge */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-bold border border-axiom-cyan/30 bg-axiom-cyan/10 text-axiom-cyan">
              v0.2.0
            </span>
            <span className="text-[10px] text-axiom-dim tracking-wider">
              graph-universe build
            </span>
          </div>

          {/* Subtitle with reveal */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-3 text-sm text-axiom-dim max-w-lg mx-auto leading-relaxed"
          >
            An agentic operating system. Persistent graph-universe memory,
            plug-and-play multi-agent integration, and an in-app VibeCode
            laboratory that can write back into the OS itself.
          </motion.p>
        </motion.div>

        {/* ── System Inventory Grid ────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {inventoryCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className={cn(
                "relative p-4 rounded-lg bg-axiom-panel/30 border border-axiom-edge/40 axiom-grid-bg axiom-hover-lift",
              )}
            >
              {/* HUD corner brackets */}
              <div className="axiom-hud-frame absolute inset-0 rounded-lg pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <card.icon className={cn("w-4 h-4", `text-${card.color}`)} />
                  <span className="text-[10px] uppercase tracking-wider text-axiom-dim">
                    {card.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {card.stats.map((stat) => (
                    <div key={stat.label}>
                      <div className="text-lg font-light tabular-nums text-axiom-text leading-none">
                        {stat.value}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-axiom-dim mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Technology Stack ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="relative p-4 rounded-lg bg-axiom-panel/20 border border-axiom-edge/40"
        >
          <div className="axiom-gradient-border absolute inset-0 rounded-lg pointer-events-none" />

          <div className="relative z-10">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim mb-3 flex items-center gap-2">
              <Cpu className="w-3 h-3 text-axiom-cyan" />
              Technology Stack
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-axiom-panel/40 border border-axiom-edge/30 axiom-hover-lift"
                >
                  <span className="text-[11px] text-axiom-text/90 font-medium">
                    {tech.name}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-axiom-dim ml-auto">
                    {tech.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Activity Timeline ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="p-4 rounded-lg bg-axiom-panel/20 border border-axiom-edge/40"
        >
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3 text-axiom-amber" />
            Recent Activity
          </h3>

          {recentActivity.length === 0 ? (
            <div className="text-[11px] text-axiom-dim italic text-center py-4">
              No activity recorded yet.
            </div>
          ) : (
            <div className="relative pl-4 space-y-0">
              {/* Vertical connector line */}
              <div className="absolute left-[5px] top-1 bottom-1 w-px bg-axiom-edge/30" />

              {recentActivity.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.06, duration: 0.3 }}
                  className="relative flex items-start gap-2.5 py-1.5"
                >
                  {/* Severity dot */}
                  <div
                    className={cn(
                      "absolute left-[-12px] top-2 w-2 h-2 rounded-full shrink-0",
                      entry.severity === "success" && "bg-axiom-emerald",
                      entry.severity === "warn" && "bg-axiom-amber",
                      entry.severity === "error" && "bg-axiom-rose",
                      (entry.severity === "info" || !entry.severity) && "bg-axiom-cyan",
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-axiom-text/80 leading-snug truncate">
                      {entry.text}
                    </div>
                    <div className="text-[9px] text-axiom-dim/60 mt-0.5">
                      {timeAgo(entry.ts)} · {entry.kind}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center pb-6 space-y-1"
        >
          <div className="text-[10px] text-axiom-dim">
            built with Z.ai · GLM-4.6 · operating in browser sandbox
          </div>
          <div className="text-[9px] text-axiom-dim/50">
            {graph.nodes.length} nodes · {installedAgents.length} agents · {enabledModels} LLM models · {apps.length} apps
          </div>
        </motion.div>
      </div>
    </div>
  );
}

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
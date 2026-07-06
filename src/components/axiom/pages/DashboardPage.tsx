"use client";

import { useAxiom } from "@/lib/axiom/store";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Cpu,
  MemoryStick,
  Wifi,
  Users,
  DollarSign,
  Zap,
  Activity,
  Server,
  Bot,
  AppWindow,
  Wrench,
  Plug,
  Brain,
  FlaskConical,
  Play,
  Link2,
  Gauge,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { GlyphRenderer } from "../AppIcon";
import { isRawHexColor } from "@/lib/axiom/forge-auto";
import type { PageId } from "@/lib/axiom/types";

/* ── Reusable HUD corner-bracket decoration ─────────────────────────── */
function HudBrackets({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)}>
      {/* top-left */}
      <span className="absolute top-0 left-0 h-3 w-3 border-t border-l border-axiom-cyan/40" />
      {/* top-right */}
      <span className="absolute top-0 right-0 h-3 w-3 border-t border-r border-axiom-cyan/40" />
      {/* bottom-left */}
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-axiom-cyan/40" />
      {/* bottom-right */}
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-axiom-cyan/40" />
    </div>
  );
}

/* ── Scan-line overlay for chart containers ──────────────────────────── */
function ScanLineOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      <div className="axiom-scan absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-axiom-cyan/20 to-transparent" />
    </div>
  );
}

/* ── Section divider ─────────────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-axiom-edge/20" />
      <span className="text-[10px] uppercase tracking-widest text-axiom-dim/60">
        {label}
      </span>
      <div className="h-px flex-1 bg-axiom-edge/20" />
    </div>
  );
}

/* ── Custom glow dot for area charts ─────────────────────────────────── */
function GlowDot({ cx, cy, stroke, r = 3 }: { cx?: number; cy?: number; stroke?: string; r?: number }) {
  if (cx == null || cy == null || !stroke) return null;
  return (
    <g>
      {/* outer glow halo */}
      <circle cx={cx} cy={cy} r={r + 5} fill={stroke} opacity={0.15} />
      <circle cx={cx} cy={cy} r={r + 2.5} fill={stroke} opacity={0.3} />
      {/* core dot */}
      <circle cx={cx} cy={cy} r={r} fill={stroke} opacity={0.9} />
      <circle cx={cx} cy={cy} r={r * 0.4} fill="white" opacity={0.7} />
    </g>
  );
}

/* ── Color map for axiom-* classes → raw RGB ─────────────────────────── */
const AXIOM_RGB: Record<string, string> = {
  "axiom-cyan": "120,220,255",
  "axiom-emerald": "80,220,180",
  "axiom-amber": "255,200,90",
  "axiom-violet": "180,130,255",
  "axiom-rose": "255,130,140",
};

function axiomRgb(color: string) {
  return AXIOM_RGB[color] ?? "120,220,255";
}

/* ── Tooltip style shared across charts ──────────────────────────────── */
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(24,26,38,0.96)",
  border: "1px solid rgba(120,220,255,0.15)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "rgba(255,255,255,0.9)",
  boxShadow: "0 0 20px -4px rgba(120,220,255,0.15)",
  backdropFilter: "blur(8px)",
};

const AXIS_TICK = { fontSize: 9, fill: "rgba(255,255,255,0.35)" };
const AXIS_STROKE = "rgba(255,255,255,0.06)";
const GRID_STROKE = "rgba(120,220,255,0.06)";

/* ══════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const {
    telemetry,
    installedAgents,
    apps,
    graph,
    providers,
    skills,
    tools,
    mcps,
    agentStatus,
    activity,
    navigate,
    llmFamilies,
    engines,
  } = useAxiom();

  /* ── Derived data ─────────────────────────────────────────────────── */
  const teleData = telemetry.slice(-30).map((t) => ({
    t: new Date(t.ts).toLocaleTimeString("en-GB", { hour12: false }),
    cpu: Math.round(t.cpu * 100),
    mem: Math.round(t.mem * 100),
    net: Math.round(t.net * 100),
  }));

  const last = telemetry[telemetry.length - 1];
  const cpu = last ? Math.round(last.cpu * 100) : 0;
  const mem = last ? Math.round(last.mem * 100) : 0;
  const net = last ? Math.round(last.net * 100) : 0;
  const activeAgents = Object.values(agentStatus).filter(
    (s) => s === "thinking" || s === "executing",
  ).length;
  const totalCost = installedAgents.reduce((acc, a) => acc + a.costUsd, 0);
  const totalTokens = installedAgents.reduce((acc, a) => acc + a.tokensUsed, 0);
  const runningApps = apps.filter((a) => a.running).length;

  // Cost by agent (bar chart)
  const costByAgent = installedAgents
    .slice()
    .sort((a, b) => b.costUsd - a.costUsd)
    .slice(0, 8)
    .map((a) => ({
      name: a.name,
      cost: Number(a.costUsd.toFixed(2)),
      color: a.color,
    }));

  // LLM Registry summary
  const enabledFamilies = llmFamilies.filter((f) => f.enabled);
  const enabledFamilyCount = enabledFamilies.length;
  const totalEnabledModels = llmFamilies.reduce(
    (acc, f) => acc + (f.enabled ? f.models.filter((m) => m.enabled).length : 0),
    0,
  );

  // Resource cards
  const topStats = [
    {
      label: "CPU",
      value: cpu,
      suffix: "%",
      icon: Cpu,
      color: "axiom-amber",
      glow: "axiom-glow-amber",
      sub: `${activeAgents} agents active`,
    },
    {
      label: "Memory",
      value: mem,
      suffix: "%",
      icon: MemoryStick,
      color: "axiom-emerald",
      glow: "axiom-glow-emerald",
      sub: `${graph.nodes.length} graph nodes`,
    },
    {
      label: "Network",
      value: net,
      suffix: "%",
      icon: Wifi,
      color: "axiom-cyan",
      glow: "axiom-glow-cyan",
      sub: `${providers.filter((p) => p.connected).length} providers`,
    },
    {
      label: "API Spend",
      value: totalCost,
      suffix: " USD",
      icon: DollarSign,
      color: "axiom-violet",
      glow: "axiom-glow-violet",
      sub: `${(totalTokens / 1000).toFixed(1)}k tokens`,
      float: true,
    },
  ];

  // Quick Actions
  const quickActions: { label: string; icon: LucideIcon; page: PageId; color: string }[] = [
    { label: "New Agent", icon: Bot, page: "agent-hub", color: "axiom-emerald" },
    { label: "Open DevLab", icon: FlaskConical, page: "devlab", color: "axiom-amber" },
    { label: "View Brain", icon: Brain, page: "brain", color: "axiom-cyan" },
    { label: "Run Workflow", icon: Play, page: "workflows", color: "axiom-violet" },
    { label: "Check Integrations", icon: Link2, page: "integrations", color: "axiom-rose" },
    { label: "Manage Engines", icon: Gauge, page: "engines", color: "axiom-cyan" },
  ];

  const integrationCounts = [
    {
      kind: "Agents",
      count: installedAgents.length,
      icon: Bot,
      color: "axiom-emerald",
      page: "agents" as const,
    },
    {
      kind: "Apps",
      count: apps.length,
      icon: AppWindow,
      color: "axiom-amber",
      page: "apps" as const,
      sub: `${runningApps} running`,
    },
    {
      kind: "Skills",
      count: skills.filter((s) => s.enabled).length,
      icon: Zap,
      color: "axiom-cyan",
      page: "skills-tools" as const,
      sub: `of ${skills.length}`,
    },
    {
      kind: "Tools",
      count: tools.filter((t) => t.enabled).length,
      icon: Wrench,
      color: "axiom-emerald",
      page: "skills-tools" as const,
      sub: `of ${tools.length}`,
    },
    {
      kind: "LLM Models",
      count: providers.reduce(
        (acc, p) => acc + (p.enabled ? p.models.length : 0),
        0,
      ),
      icon: Server,
      color: "axiom-violet",
      page: "settings" as const,
    },
    {
      kind: "MCP Servers",
      count: mcps.filter((m) => m.enabled).length,
      icon: Plug,
      color: "axiom-rose",
      page: "settings" as const,
      sub: `of ${mcps.length}`,
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="h-full overflow-y-auto axiom-scroll p-6 space-y-5">
      {/* ── Top stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topStats.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className={cn(
              "relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 axiom-grid-bg overflow-hidden",
              s.glow,
            )}
          >
            <HudBrackets />
            {/* subtle top glow bar */}
            <div
              className="absolute top-0 inset-x-0 h-px opacity-40"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${axiomRgb(s.color)},0.6), transparent)`,
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <s.icon className={cn("w-3.5 h-3.5", `text-${s.color}`)} />
                  <span className="text-[10px] uppercase tracking-wider text-axiom-dim">
                    {s.label}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-2xl font-light tabular-nums text-axiom-text">
                {s.float ? s.value.toFixed(2) : s.value}
                <span className="text-[11px] text-axiom-dim ml-0.5">{s.suffix}</span>
              </div>
              <div className="text-[10px] text-axiom-dim mt-0.5">{s.sub}</div>
              {s.label !== "API Spend" && (
                <div className="mt-2.5 h-1 bg-axiom-edge/30 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", `bg-${s.color}`)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, s.value)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + idx * 0.06 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <SectionDivider label="Quick Actions" />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {quickActions.map((qa, idx) => (
          <motion.button
            key={qa.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + idx * 0.04 }}
            onClick={() => navigate(qa.page)}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-lg p-3",
              "bg-axiom-panel/30 border border-axiom-edge/40",
              "hover:border-axiom-cyan/40 hover:bg-axiom-panel/50",
              "transition-all duration-200",
            )}
          >
            <qa.icon
              className={cn(
                "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                `text-${qa.color}`,
              )}
            />
            <span className="text-[10px] uppercase tracking-wider text-axiom-dim group-hover:text-axiom-text transition-colors">
              {qa.label}
            </span>
            {/* bottom glow on hover */}
            <div
              className="absolute bottom-0 inset-x-0 h-px opacity-0 group-hover:opacity-50 transition-opacity duration-200"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${axiomRgb(qa.color)},0.7), transparent)`,
              }}
            />
          </motion.button>
        ))}
      </div>

      {/* ── Two charts side by side ─────────────────────────────────── */}
      <SectionDivider label="Telemetry" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System Telemetry chart */}
        <div className="lg:col-span-2 relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 axiom-grid-bg overflow-hidden">
          <ScanLineOverlay />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">System Telemetry</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  Last 60s &middot; CPU / Memory / Network
                </p>
              </div>
              <Activity className="w-4 h-4 text-axiom-cyan/60" />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={teleData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(255,200,90)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="rgb(255,200,90)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(80,220,180)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="rgb(80,220,180)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(120,220,255)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="rgb(120,220,255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="t" tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU"
                    stroke="rgb(255,200,90)"
                    strokeWidth={1.5}
                    fill="url(#cpuG)"
                    dot={<GlowDot stroke="rgb(255,200,90)" />}
                    activeDot={<GlowDot stroke="rgb(255,200,90)" r={4} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="mem"
                    name="Mem"
                    stroke="rgb(80,220,180)"
                    strokeWidth={1.5}
                    fill="url(#memG)"
                    dot={<GlowDot stroke="rgb(80,220,180)" />}
                    activeDot={<GlowDot stroke="rgb(80,220,180)" r={4} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name="Net"
                    stroke="rgb(120,220,255)"
                    strokeWidth={1.5}
                    fill="url(#netG)"
                    dot={<GlowDot stroke="rgb(120,220,255)" />}
                    activeDot={<GlowDot stroke="rgb(120,220,255)" r={4} />}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Cost by Agent chart */}
        <div className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 axiom-grid-bg overflow-hidden">
          <ScanLineOverlay />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">Cost by Agent</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  Top spenders &middot; USD
                </p>
              </div>
              <DollarSign className="w-4 h-4 text-axiom-violet/60" />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={costByAgent}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_STROKE}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={AXIS_TICK}
                    stroke={AXIS_STROKE}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ ...AXIS_TICK, fill: "rgba(255,255,255,0.6)" }}
                    stroke={AXIS_STROKE}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [`$${v}`, "Cost"]}
                  />
                  <Bar dataKey="cost" radius={[0, 3, 3, 0]} barSize={14}>
                    {costByAgent.map((entry, i) => {
                      const rgb = axiomRgb(entry.color);
                      return (
                        <Cell
                          key={i}
                          fill={`rgba(${rgb},0.7)`}
                          stroke={`rgba(${rgb},0.9)`}
                          strokeWidth={0.5}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── LLM Registry Summary ────────────────────────────────────── */}
      <SectionDivider label="LLM Registry" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 axiom-grid-bg overflow-hidden"
      >
        <HudBrackets />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-axiom-violet/70" />
              <h3 className="text-sm font-medium text-axiom-text">Model Registry</h3>
            </div>
            <div className="flex items-baseline gap-6">
              <div>
                <span className="text-2xl font-light tabular-nums text-axiom-text">
                  {enabledFamilyCount}
                </span>
                <span className="text-[10px] text-axiom-dim ml-1.5 uppercase tracking-wider">
                  families enabled
                </span>
              </div>
              <div>
                <span className="text-2xl font-light tabular-nums text-axiom-text">
                  {totalEnabledModels}
                </span>
                <span className="text-[10px] text-axiom-dim ml-1.5 uppercase tracking-wider">
                  models active
                </span>
              </div>
              <div>
                <span className="text-2xl font-light tabular-nums text-axiom-text">
                  {llmFamilies.length}
                </span>
                <span className="text-[10px] text-axiom-dim ml-1.5 uppercase tracking-wider">
                  total families
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("llm-registry")}
              className="text-[10px] text-axiom-cyan hover:underline uppercase tracking-wider"
            >
              Open Registry &rarr;
            </button>
          </div>

          {/* Right: family dot matrix */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-axiom-dim/60 mb-1">
              Family Status
            </span>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {llmFamilies.map((f) => {
                const enabledCount = f.models.filter((m) => m.enabled).length;
                const total = f.models.length;
                return (
                  <div key={f.id} className="flex items-center gap-1.5">
                    {/* colored dot — bright if enabled, dim if not */}
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full shrink-0",
                        f.enabled
                          ? `bg-${f.color} shadow-[0_0_6px_rgba(${axiomRgb(f.color)},0.5)]`
                          : "bg-axiom-dim/30",
                      )}
                    />
                    <span className="text-[10px] text-axiom-dim truncate max-w-[80px]">
                      {f.name}
                    </span>
                    <span className="text-[9px] text-axiom-dim/50 tabular-nums ml-auto">
                      {f.enabled ? `${enabledCount}/${total}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Running apps + integration counts ───────────────────────── */}
      <SectionDivider label="Systems" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Running apps */}
        <div className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 overflow-hidden">
          <div className="absolute inset-0 bg-axiom-grid-bg opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">Running Apps</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  {runningApps} active &middot; {apps.length} installed
                </p>
              </div>
              <button
                onClick={() => navigate("apps")}
                className="text-[10px] text-axiom-cyan hover:underline uppercase tracking-wider"
              >
                manage &rarr;
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto axiom-scroll">
              {apps.filter((a) => a.running).length === 0 ? (
                <div className="text-xs text-axiom-dim italic py-8 text-center">
                  No apps currently running. Launch one from the Apps page.
                </div>
              ) : (
                apps
                  .filter((a) => a.running)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-axiom-panel/40 border border-axiom-edge/30"
                    >
                      <span className="text-lg">{a.glyph}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-axiom-text">{a.name}</div>
                        <div className="text-[10px] text-axiom-dim">{a.category}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-axiom-emerald/15 border border-axiom-emerald/40 text-axiom-emerald uppercase tracking-wider">
                        running
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Integration counts */}
        <div className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 overflow-hidden">
          <div className="absolute inset-0 bg-axiom-grid-bg opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">Integration Overview</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  Connected subsystems
                </p>
              </div>
              <button
                onClick={() => navigate("integrations")}
                className="text-[10px] text-axiom-cyan hover:underline uppercase tracking-wider"
              >
                all &rarr;
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {integrationCounts.map((c) => (
                <button
                  key={c.kind}
                  onClick={() => navigate(c.page)}
                  className="text-left p-2.5 rounded-lg bg-axiom-panel/40 border border-axiom-edge/40 hover:border-axiom-cyan/40 transition-colors duration-200"
                >
                  <c.icon className={cn("w-3.5 h-3.5 mb-1", `text-${c.color}`)} />
                  <div className="text-lg font-light tabular-nums text-axiom-text">
                    {c.count}
                  </div>
                  <div className="text-[10px] text-axiom-dim uppercase tracking-wider">{c.kind}</div>
                  {c.sub && (
                    <div className="text-[9px] text-axiom-dim/60">{c.sub}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active agents + recent activity (5 entries) ─────────────── */}
      <SectionDivider label="Live Status" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active agents */}
        <div className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 overflow-hidden">
          <div className="absolute inset-0 bg-axiom-grid-bg opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">Active Agents</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  {activeAgents} running &middot; {installedAgents.length} installed
                </p>
              </div>
              <Users className="w-4 h-4 text-axiom-emerald/60" />
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto axiom-scroll">
              {installedAgents.map((a) => {
                const status = agentStatus[a.id] ?? "idle";
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-axiom-panel/30 border border-axiom-edge/30"
                  >
                    <span
                      className={cn("text-base w-5 text-center", isRawHexColor(a.color) ? "" : `text-${a.color}`)}
                      style={isRawHexColor(a.color) ? { color: a.color } : undefined}
                    >
                      <GlyphRenderer glyph={a.glyph} className="text-base" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-axiom-text">{a.name}</div>
                      <div className="text-[10px] text-axiom-dim">{a.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-axiom-amber tabular-nums">
                        ${a.costUsd.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-axiom-dim tabular-nums">
                        {(a.tokensUsed / 1000).toFixed(1)}k
                      </div>
                    </div>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border w-16 text-center",
                        status === "thinking" || status === "executing"
                          ? "text-axiom-emerald border-axiom-emerald/40 bg-axiom-emerald/10"
                          : status === "error"
                            ? "text-axiom-rose border-axiom-rose/40 bg-axiom-rose/10"
                            : "text-axiom-dim border-axiom-edge/40 bg-axiom-panel/40",
                      )}
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity — last 5 */}
        <div className="relative bg-axiom-panel/30 border border-axiom-edge/40 rounded-lg p-4 overflow-hidden">
          <div className="absolute inset-0 bg-axiom-grid-bg opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-axiom-text">Recent Activity</h3>
                <p className="text-[10px] text-axiom-dim uppercase tracking-wider mt-0.5">
                  System event log
                </p>
              </div>
              <Activity className="w-4 h-4 text-axiom-cyan/60" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto axiom-scroll">
              {activity.slice(0, 5).map((a, idx) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className="flex items-start gap-2.5 text-xs"
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                      a.severity === "success"
                        ? "bg-axiom-emerald shadow-[0_0_6px_rgba(80,220,180,0.5)]"
                        : a.severity === "error"
                          ? "bg-axiom-rose shadow-[0_0_6px_rgba(255,130,140,0.5)]"
                          : a.severity === "warn"
                            ? "bg-axiom-amber shadow-[0_0_6px_rgba(255,200,90,0.5)]"
                            : "bg-axiom-cyan/60",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-axiom-text/90 leading-snug">{a.text}</div>
                    <div className="text-[10px] text-axiom-dim mt-0.5">
                      {new Date(a.ts).toLocaleTimeString()} &middot;{" "}
                      <span className="uppercase tracking-wider">{a.kind}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
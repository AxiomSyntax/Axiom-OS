"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ChatArchivePanel from "./ChatArchivePanel";
import { BackgroundLayer } from "./BackgroundLayer";
import SystemAgentStatusIndicator from "./SystemAgentStatusIndicator";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import BrainPage from "./pages/BrainPage";
import SkillsToolsPage from "./pages/SkillsToolsPage";
import AgentHubPage from "./pages/AgentHubPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import AgentsPage from "./pages/AgentsPage";
import EnginesPage from "./pages/EnginesPage";
import ModulesPage from "./pages/ModulesPage";
import AppsPage from "./pages/AppsPage";
import DevLabPage from "./pages/DevLabPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import { RuntimeStyleInjector } from "./RuntimeStyleInjector";
import ModuleRunnerPage from "./ModuleRunnerPage";
import AppTabStack from "./AppTabStack";
import WorkflowTabStack from "./WorkflowTabStack";
import { Safelist } from "./Safelist";

export default function AppShell() {
  const currentPage = useAxiom((s) => s.currentPage);
  const runningModuleId = useAxiom((s) => s.runningModuleId);
  const viewMode = useAxiom((s) => s.viewMode);
  const sidebarCollapsed = useAxiom((s) => s.sidebarCollapsed);
  const pushTelemetry = useAxiom((s) => s.pushTelemetry);
  const agentStatus = useAxiom((s) => s.agentStatus);
  const graph = useAxiom((s) => s.graph);

  // Telemetry simulation
  useEffect(() => {
    const tick = () => {
      const activeAgents = Object.values(agentStatus).filter(
        (s) => s === "thinking" || s === "executing",
      ).length;
      const base = 0.08 + activeAgents * 0.12;
      const jitter = () => Math.random() * 0.06;
      pushTelemetry({
        ts: Date.now(),
        cpu: Math.min(0.95, base + jitter() + graph.nodes.length / 200),
        mem: Math.min(0.9, 0.25 + graph.nodes.length * 0.01 + jitter()),
        net: Math.min(0.9, 0.15 + activeAgents * 0.2 + jitter()),
        agents: activeAgents,
      });
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [agentStatus, graph.nodes.length, pushTelemetry]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background flex">
      <RuntimeStyleInjector />
      <Safelist />

      <Sidebar />

      {/* Main column — BackgroundLayer is INSIDE here so the universe rings
          follow the Jarvis Orb when the sidebar expands/collapses. */}
      <motion.div
        animate={{ marginLeft: sidebarCollapsed ? 56 : 248 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex-1 flex flex-col min-w-0 relative z-10"
      >
        {/* Background universe — inside the main column so rings follow the orb */}
        <BackgroundLayer />
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          {/* Routed page (or published module). The animation key no longer
              includes runningAppId — apps are keep-alive tabs layered ABOVE
              this page via AppTabStack, so navigating to an app doesn't unmount
              the page underneath. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={runningModuleId ?? currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0"
            >
              {runningModuleId ? <ModuleRunnerPage /> : renderPage(currentPage)}
            </motion.div>
          </AnimatePresence>

          {/* ── Keep-alive app tab stack ──
              Rendered as a sibling layer on top of the routed page. When
              viewMode === "app", the focused tab covers the page; when
              "page", the whole stack is hidden (invisible + pointer-events-none)
              but every open tab stays mounted in the background, preserving
              its full state. See AppTabStack.tsx for the full architecture. */}
          <AppTabStack />

          {/* ── Keep-alive workflow tab stack ──
              Same architecture as AppTabStack. When viewMode === "workflow",
              the focused n8n/LangFlow tab covers the page; when "page", the
              whole stack is hidden but every open tab stays mounted. */}
          <WorkflowTabStack />
        </main>
      </motion.div>

      {/* Right sidebar — Conversations & Projects archive.
          Persistent panel that pushes content, styled like the left sidebar. */}
      <ChatArchivePanel />

      {/* System Agent status indicator — shows when Axiom (System Architect)
          is performing system-level operations. */}
      <SystemAgentStatusIndicator />
    </div>
  );
}

function renderPage(page: string) {
  switch (page) {
    case "home":
      return <HomePage />;
    case "dashboard":
      return <DashboardPage />;
    case "brain":
      return <BrainPage />;
    case "skills-tools":
      return <SkillsToolsPage />;
    case "agent-hub":
      return <AgentHubPage />;
    case "workflows":
      return <WorkflowsPage />;
    case "agents":
      return <AgentsPage />;
    case "engines":
      return <EnginesPage />;
    case "apps":
      return <AppsPage />;
    case "modules":
      return <ModulesPage />;
    case "devlab":
      return <DevLabPage />;
    case "integrations":
      return <IntegrationsPage />;
    case "settings":
      return <SettingsPage />;
    case "about":
      return <AboutPage />;
    default:
      return <HomePage />;
  }
}

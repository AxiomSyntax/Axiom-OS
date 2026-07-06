"use client";

import { useAxiom } from "@/lib/axiom/store";
import { X, Loader2, Network, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { WorkflowTab } from "@/lib/axiom/types";

// ════════════════════════════════════════════════════════════════════════════
//  WorkflowTabStack — Browser-style keep-alive multitasking for workflow
//  PROJECTS. Each tab represents an open project. Multiple projects can be
//  open simultaneously. Tabs persist across navigation.
//
//  The tab bar is ALWAYS visible at the top of the Workflows page when tabs
//  are open — both in overview mode AND when a project iframe is showing.
//  The iframe content sits BELOW the tab bar and is hidden in overview mode
//  (but stays mounted for keep-alive).
// ════════════════════════════════════════════════════════════════════════════

const WORKFLOW_ICONS: Record<string, typeof Network> = {
  Network,
  Workflow,
};

export default function WorkflowTabStack() {
  const openWorkflowTabs = useAxiom((s) => s.openWorkflowTabs);
  const activeWorkflowTabId = useAxiom((s) => s.activeWorkflowTabId);
  const viewMode = useAxiom((s) => s.viewMode);
  const currentPage = useAxiom((s) => s.currentPage);
  const focusWorkflowTab = useAxiom((s) => s.focusWorkflowTab);
  const closeWorkflowTab = useAxiom((s) => s.closeWorkflowTab);

  if (openWorkflowTabs.length === 0) return null;

  const workflowMode = viewMode === "workflow";
  const onWorkflowsPage = currentPage === "workflows";

  // Don't render if we're not on the Workflows page at all.
  if (!onWorkflowsPage) return null;

  return (
    <>
      {/* ═══ TAB BAR — always visible at the top when tabs are open ═══
          This is a SEPARATE element from the iframe stack so it stays
          visible in BOTH overview mode and workflow mode. It floats at
          the top of the Workflows page as a sticky bar. */}
      <div className="axiom-tab-bar h-9 shrink-0 flex items-stretch overflow-x-auto axiom-scroll absolute top-0 left-0 right-0 z-40 bg-axiom-deep/95 backdrop-blur-md border-b border-axiom-edge/40">
        {openWorkflowTabs.map((tab) => (
          <WorkflowTabChip
            key={tab.projectId}
            tab={tab}
            active={workflowMode && activeWorkflowTabId === tab.projectId}
            onFocus={() => focusWorkflowTab(tab.projectId)}
            onClose={() => closeWorkflowTab(tab.projectId)}
          />
        ))}
      </div>

      {/* ═══ IFRAME STACK — visible only in workflow mode ═══
          When in overview mode, the entire stack is hidden (invisible +
          pointer-events-none) but iframes stay mounted (keep-alive).
          The tab bar above is SEPARATE so it remains visible. */}
      <div
        className={cn(
          "absolute inset-0 z-30 flex flex-col bg-axiom-void",
          !workflowMode && "pointer-events-none invisible",
        )}
        aria-hidden={!workflowMode}
      >
        {/* Spacer for the tab bar height so iframe content starts below it */}
        <div className="h-9 shrink-0" />

        <div className="flex-1 relative min-h-0 axiom-keepalive-frame">
          {openWorkflowTabs.map((tab) => {
            const visible = workflowMode && activeWorkflowTabId === tab.projectId;
            return (
              <div
                key={tab.projectId}
                className={cn(
                  "absolute inset-0",
                  visible ? "block" : "hidden",
                )}
              >
                <WorkflowIframe tab={tab} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  WorkflowIframe — renders the project's tool instance URL in a sandboxed
//  iframe. Per-tab loading spinner persists across tab switches.
// ════════════════════════════════════════════════════════════════════════════

function WorkflowIframe({ tab }: { tab: WorkflowTab }) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="h-full flex flex-col bg-axiom-void">
      <div className="flex-1 relative bg-axiom-void min-h-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-axiom-void/80">
            <Loader2 className={cn("w-8 h-8 animate-spin mb-3", `text-${tab.color}`)} />
            <p className="text-xs text-axiom-dim">
              Loading {tab.title}…
            </p>
            <p className="text-[10px] text-axiom-dim/50 font-mono mt-1">{tab.instanceUrl}</p>
          </div>
        )}
        <iframe
          key={`workflow-${tab.projectId}`}
          src={tab.instanceUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="w-full h-full border-0 bg-white"
          title={tab.title}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  WorkflowTabChip — [Tool Icon] [Project Name] [Close]
// ════════════════════════════════════════════════════════════════════════════

function WorkflowTabChip({
  tab,
  active,
  onFocus,
  onClose,
}: {
  tab: WorkflowTab;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
}) {
  const Icon = WORKFLOW_ICONS[tab.iconName ?? ""] ?? Network;
  return (
    <div
      onClick={onFocus}
      className={cn(
        "group flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs cursor-pointer border-r border-axiom-edge/30 shrink-0 transition-colors min-w-[120px] max-w-[200px]",
        active
          ? "axiom-tab-active text-axiom-text"
          : "text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/30",
      )}
      title={tab.title}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", `text-${tab.color}`)} />
      <span className="flex-1 truncate">{tab.title}</span>
      {active && (
        <span className="axiom-live-blink w-1.5 h-1.5 rounded-full bg-axiom-emerald shrink-0" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={cn(
          "w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0",
          active
            ? "text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10"
            : "text-axiom-dim/60 hover:text-axiom-rose hover:bg-axiom-rose/10 opacity-0 group-hover:opacity-100",
        )}
        title="Close tab"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

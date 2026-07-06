"use client";

import { useAxiom } from "@/lib/axiom/store";
import InstalledAppRunnerPage from "./InstalledAppRunnerPage";
import { GlyphRenderer } from "./AppIcon";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppTab } from "@/lib/axiom/types";

// ════════════════════════════════════════════════════════════════════════════
//  AppTabStack — Browser-style keep-alive multitasking for Axiom OS apps.
//
//  SECTION 3 of the architecture update. Replaces the old "one app at a time,
//  unmount on navigate" model with a persistent, background-managed view stack.
//
//  How it works:
//  ─────────────
//  • Every open app tab is ALWAYS mounted in the DOM (keyed by appId).
//  • Only the focused tab (when viewMode === "app") is visible (display:block).
//  • All other tabs are hidden via display:none — they keep their full React
//    state (input values, scroll position, running computations, intervals).
//  • When the user navigates away to a regular page (Dashboard, Agent Hub…),
//    viewMode flips to "page" and EVERY tab becomes hidden — but none unmount.
//    Switching back to the app is instant and lossless.
//  • A browser-style tab bar (ported from the Brain pane tab system) sits on
//    top, letting the user switch tabs and close them.
//
//  This component is rendered by AppShell as a sibling layer ABOVE the routed
//  page. When viewMode === "app", it covers the page; when "page", it's hidden
//  entirely (but its mounted tabs survive underneath).
// ════════════════════════════════════════════════════════════════════════════

export default function AppTabStack() {
  const openAppTabs = useAxiom((s) => s.openAppTabs);
  const activeAppTabId = useAxiom((s) => s.activeAppTabId);
  const viewMode = useAxiom((s) => s.viewMode);
  const focusAppTab = useAxiom((s) => s.focusAppTab);
  const closeAppTab = useAxiom((s) => s.closeAppTab);
  const navigate = useAxiom((s) => s.navigate);

  // If there are no open tabs, render nothing — the routed page shows through.
  if (openAppTabs.length === 0) return null;

  const appMode = viewMode === "app";

  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col bg-axiom-void",
        !appMode && "pointer-events-none invisible",
      )}
      aria-hidden={!appMode}
    >
      {/* ── Browser-style tab bar (ported from Brain pane tabs) ── */}
      <div className="axiom-tab-bar h-9 shrink-0 flex items-stretch overflow-x-auto axiom-scroll">
        {openAppTabs.map((tab) => (
          <AppTabChip
            key={tab.appId}
            tab={tab}
            active={appMode && activeAppTabId === tab.appId}
            onFocus={() => focusAppTab(tab.appId)}
            onClose={() => closeAppTab(tab.appId)}
          />
        ))}
        {/* Trailing spacer + "back to page" hint */}
        <div className="flex-1 flex items-center justify-end pr-2 gap-2 shrink-0">
          <button
            onClick={() => navigate("home")}
            className="text-[10px] uppercase tracking-wider text-axiom-dim/70 hover:text-axiom-cyan transition-colors px-2 py-1 rounded border border-transparent hover:border-axiom-cyan/30"
            title="Back to Jarvis Home"
          >
            ⌂ Home
          </button>
        </div>
      </div>

      {/* ── Keep-alive view stack ──
          Every open tab is mounted here, always. Only the active one is
          visible (display:block); the rest are display:none. NONE unmount
          when navigating away — that's the whole point of keep-alive. */}
      <div className="flex-1 relative min-h-0 axiom-keepalive-frame">
        {openAppTabs.map((tab) => {
          const visible = appMode && activeAppTabId === tab.appId;
          return (
            <div
              key={tab.appId}
              className={cn(
                "absolute inset-0",
                visible ? "block" : "hidden",
              )}
              // NOTE: deliberately NOT using AnimatePresence here — we want
              // the hidden tabs to stay fully mounted (no exit animation that
              // would unmount them). display:none keeps them in memory.
            >
              <InstalledAppRunnerPage appId={tab.appId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  AppTabChip — a single tab in the browser-style tab bar.
//  Ported from the Brain pane tab system: glyph + title + close-on-hover,
//  active indicator underline, click-to-focus.
// ════════════════════════════════════════════════════════════════════════════
function AppTabChip({
  tab,
  active,
  onFocus,
  onClose,
}: {
  tab: AppTab;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
}) {
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
      {/* Icon — supports Lucide defaults + Workspace Assets via GlyphRenderer */}
      <GlyphRenderer glyph={tab.iconName} className={cn("w-3.5 h-3.5 shrink-0", `text-${tab.color}`)} />
      <span className="flex-1 truncate">{tab.title}</span>
      {/* Active dot — shows the tab is "live" in the background even when not focused */}
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

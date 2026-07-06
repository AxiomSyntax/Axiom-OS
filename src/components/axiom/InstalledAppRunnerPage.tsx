"use client";

import { useAxiom } from "@/lib/axiom/store";
import { useMemo, useState } from "react";
import { X, ExternalLink, Play, Wifi, WifiOff, Code2, Terminal, Package, Loader2, Globe } from "lucide-react";
import { GlyphRenderer } from "./AppIcon";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
//  Installed App Runner — Native page rendering (NOT a floating overlay).
//  Shown inside the main OS canvas when runningAppId is set.
//  Navigating away via sidebar cleanly unmounts this component.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Safe arithmetic evaluator — supports + - * / ( ) and unary minus.
 * Replaces `eval()` so no arbitrary code can run. Throws on invalid input.
 */
function safeArithmetic(expr: string): number {
  const s = expr.replace(/\s+/g, "");
  let i = 0;
  function factor(): number {
    if (s[i] === "(") {
      i++;
      const v = expr1();
      if (s[i] === ")") i++;
      return v;
    }
    if (s[i] === "-") { i++; return -factor(); }
    if (s[i] === "+") { i++; return factor(); }
    let num = "";
    while (i < s.length && /[\d.]/.test(s[i])) num += s[i++];
    if (!num) throw new Error("invalid");
    return parseFloat(num);
  }
  function term(): number {
    let v = factor();
    while (i < s.length && (s[i] === "*" || s[i] === "/")) {
      const op = s[i++];
      const r = factor();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function expr1(): number {
    let v = term();
    while (i < s.length && (s[i] === "+" || s[i] === "-")) {
      const op = s[i++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const result = expr1();
  if (i < s.length) throw new Error("invalid");
  return result;
}


export default function InstalledAppRunnerPage({ appId }: { appId?: string }) {
  const runningAppId = useAxiom((s) => s.runningAppId);
  const closeInstalledApp = useAxiom((s) => s.closeInstalledApp);
  const closeAppTab = useAxiom((s) => s.closeAppTab);
  const apps = useAxiom((s) => s.apps);

  // When mounted inside the keep-alive AppTabStack, appId is provided and
  // pins this instance to a specific app. Otherwise (legacy direct usage) it
  // falls back to the store's runningAppId. This is what lets each tab keep
  // its own independent state — each InstalledAppRunnerPage instance is
  // keyed to one app and never re-targets.
  const targetAppId = appId ?? runningAppId;

  // "live" tab is the integrated-iframe view for apps with a liveUrl. It runs
  // the app's staging build INSIDE the Axiom OS viewport as a native route —
  // no separate window. Agents can read layout params + navigate in-process.
  const [activeTab, setActiveTab] = useState<"live" | "info" | "code" | "console">("live");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [iframeLoading, setIframeLoading] = useState(true);

  const activeApp = useMemo(
    () => apps.find((a) => a.id === targetAppId) ?? null,
    [apps, targetAppId],
  );

  if (!activeApp) return null;

  const isConnected = !!activeApp.connected;
  const isVibecoded = activeApp.source === "vibecode";
  const hasCode = !!activeApp.code;
  const hasSourceUrl = !!activeApp.sourceUrl;
  const hasLiveUrl = !!activeApp.liveUrl;

  const handleRun = () => {
    if (!activeApp.code) return;
    setConsoleOutput((prev) => [...prev, `$ run ${activeApp.name}`, "..."]);
    setTimeout(() => {
      try {
        // Simulate execution for vibecoded apps
        const result = isVibecoded && inputValue.trim()
          ? `→ ${inputValue} = ${safeArithmetic(inputValue)}`
          : "→ Execution complete.";
        setConsoleOutput((prev) => [...prev, result]);
      } catch {
        setConsoleOutput((prev) => [...prev, "→ Error: Invalid input."]);
      }
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-axiom-void">
      {/* ── Slim top bar ── */}
      <div className="h-10 bg-axiom-deep border-b border-axiom-edge/40 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center border shrink-0",
              `text-${activeApp.color} border-${activeApp.color}/30 bg-${activeApp.color}/10`,
            )}
          >
            <GlyphRenderer glyph={activeApp.iconName} className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-medium text-axiom-text truncate">{activeApp.name}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none shrink-0 border border-axiom-cyan/25 bg-axiom-cyan/15 text-axiom-cyan">
            APP
          </span>
          {hasLiveUrl && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" /> integrated
            </span>
          )}
          {isConnected && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-axiom-emerald/15 text-axiom-emerald uppercase tracking-wider flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasCode && (
            <button
              onClick={handleRun}
              className="px-2.5 py-1 rounded text-xs border border-axiom-emerald/40 bg-axiom-emerald/15 text-axiom-emerald hover:bg-axiom-emerald/25 transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          {hasSourceUrl && (
            <button
              onClick={() => window.open(activeApp.sourceUrl, "_blank", "noopener")}
              className="p-1.5 rounded-md text-axiom-dim hover:text-axiom-cyan hover:bg-axiom-cyan/10 transition-colors"
              title="View source"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              // When pinned to a specific tab (keep-alive stack), close that
              // exact tab. Otherwise fall back to the legacy "close active"
              // behavior.
              if (appId) closeAppTab(appId);
              else closeInstalledApp();
            }}
            className="p-1.5 rounded-md text-axiom-dim hover:text-axiom-rose hover:bg-axiom-rose/10 transition-colors"
            aria-label="Close app"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="h-8 bg-axiom-deep/60 border-b border-axiom-edge/40 flex items-center px-4 gap-4 shrink-0">
        {(["live", "info", "code", "console"] as const).map((tab) => {
          const show =
            tab === "live" ? hasLiveUrl
              : tab === "code" ? hasCode
                : tab === "console" ? hasCode
                  : true;
          if (!show) return null;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-[10px] uppercase tracking-wider py-1 border-b-2 transition-colors",
                activeTab === tab
                  ? "text-axiom-text border-axiom-cyan"
                  : "text-axiom-dim border-transparent hover:text-axiom-text/80",
              )}
            >
              {tab === "live" && <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Live</span>}
              {tab === "info" && <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> Info</span>}
              {tab === "code" && <span className="flex items-center gap-1.5"><Code2 className="w-3 h-3" /> Code</span>}
              {tab === "console" && <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> Console</span>}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {/* "live" tab renders the app's staging build in a sandboxed iframe INSIDE
          the OS viewport — this is the native integrated route (Section 3).
          No separate window; agents can read layout params + navigate in-process. */}
      {activeTab === "live" && hasLiveUrl ? (
        <div className="flex-1 relative bg-axiom-void min-h-0">
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-axiom-void/60">
              <Loader2 className="w-6 h-6 text-axiom-cyan animate-spin" />
            </div>
          )}
          <iframe
            key={`live-${activeApp.id}`}
            src={activeApp.liveUrl}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="w-full h-full border-0 bg-white"
            title={activeApp.name}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto axiom-scroll">
        {activeTab === "info" && (
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Hero */}
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center border shrink-0",
                  `text-${activeApp.color} border-${activeApp.color}/30 bg-${activeApp.color}/10`,
                )}
              >
                <GlyphRenderer glyph={activeApp.iconName} className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-medium text-axiom-text">{activeApp.name}</h1>
                <p className="text-xs text-axiom-dim mt-1 capitalize">{activeApp.category}</p>
                {activeApp.description && (
                  <p className="text-sm text-axiom-dim/80 mt-2 leading-relaxed">{activeApp.description}</p>
                )}
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetaCard label="Source" value={activeApp.source} />
              <MetaCard label="Category" value={activeApp.category} />
              {activeApp.port && <MetaCard label="Port" value={`:${activeApp.port}`} />}
              {activeApp.sourceUrl && (
                <MetaCard label="Repository" value={activeApp.sourceUrl} truncate />
              )}
              {activeApp.liveUrl && (
                <MetaCard label="Live Sandbox" value={activeApp.liveUrl} truncate />
              )}
              <MetaCard label="Installed" value={new Date(activeApp.installedAt).toLocaleDateString()} />
              <MetaCard label="Status" value={activeApp.enabled ? "Enabled" : "Disabled"} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasCode && (
                <button
                  onClick={() => setActiveTab("code")}
                  className="px-3 py-2 rounded text-xs border border-axiom-emerald/40 bg-axiom-emerald/10 text-axiom-emerald hover:bg-axiom-emerald/20 transition-colors flex items-center gap-1.5"
                >
                  <Code2 className="w-3 h-3" />
                  View Source
                </button>
              )}
              {hasSourceUrl && (
                <button
                  onClick={() => window.open(activeApp.sourceUrl, "_blank", "noopener")}
                  className="px-3 py-2 rounded text-xs border border-axiom-violet/40 bg-axiom-violet/10 text-axiom-violet hover:bg-axiom-violet/20 transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Repository
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "code" && hasCode && (
          <div className="p-4">
            <pre className="bg-axiom-panel/60 border border-axiom-edge/40 rounded-lg p-4 text-xs font-mono text-axiom-text/90 overflow-x-auto">
              <code>{activeApp.code}</code>
            </pre>
          </div>
        )}

        {activeTab === "console" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto axiom-scroll p-4 font-mono text-xs space-y-1">
              {consoleOutput.length === 0 ? (
                <p className="text-axiom-dim italic">
                  {activeApp.name} console. Click Run to execute.
                </p>
              ) : (
                consoleOutput.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      line.startsWith("$")
                        ? "text-axiom-cyan"
                        : line.startsWith("→")
                          ? "text-axiom-emerald"
                          : "text-axiom-dim",
                    )}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
            {isVibecoded && (
              <div className="p-3 border-t border-axiom-edge/40 flex items-center gap-2">
                <span className="text-axiom-cyan font-mono text-xs">$</span>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRun();
                  }}
                  placeholder="input..."
                  className="flex-1 bg-transparent text-xs font-mono text-axiom-text placeholder:text-axiom-dim/50 focus:outline-none"
                />
                <button
                  onClick={handleRun}
                  className="px-2 py-1 rounded text-[10px] border border-axiom-edge/40 text-axiom-dim hover:text-axiom-text hover:bg-axiom-panel/60 transition-colors"
                >
                  Run
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function MetaCard({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-axiom-panel/30 border border-axiom-edge/30">
      <div className="text-[9px] uppercase tracking-wider text-axiom-dim mb-1">{label}</div>
      <div
        className={cn(
          "text-xs text-axiom-text",
          truncate && "truncate",
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
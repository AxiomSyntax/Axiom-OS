"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAxiom } from "@/lib/axiom/store";
import { v4 as uuid } from "uuid";
import { AutoGrowTextarea } from "@/components/axiom/AutoGrowTextarea";
import {
  Send, Plus, Brain, Wand2, X, Check, Globe, Zap, Loader2, Trash2,
  ChevronDown, ChevronRight, Cpu, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { GlyphRenderer } from "../AppIcon";
import { isRawHexColor, resolveAccentContainer } from "@/lib/axiom/forge-auto";

export default function AgentHubPage() {
  const {
    installedAgents,
    // Unified chat (replaces old conversations/pushMessage/updateMessage)
    chatSessions,
    activeChatSessionId,
    createChatSession,
    loadChatSession,
    appendChatMessage,
    updateChatMessage,
    // Agent status
    setAgentStatus,
    agentStatus,
    addNode,
    graph,
    // Council
    councils,
    activeCouncilId,
    createCouncil,
    deleteCouncil,
    setActiveCouncil,
    sendCouncilMessage,
    navigate,
    engines,
    getEnabledLLMModels,
  } = useAxiom();

  const activeEngines = engines.filter((e) => e.enabled);
  const disabledCount = engines.length - activeEngines.length;
  const enabledLlmModels = getEnabledLLMModels();

  const allAgents = useMemo(() => {
    // ── Derive agents from installedAgents, filtered by enabled ──
    // Built-in agents follow the same activation rules as installed agents.
    // The System Agent (Axiom) is EXCLUDED from Agent Hub — it activates
    // automatically during system-level operations, not as a chat agent.
    return installedAgents
      .filter((a) => a.enabled && !a.isSystemAgent)
      .map((a) => ({
        id: a.id, name: a.name, role: a.role, description: a.description,
        systemPrompt: a.systemPrompt, color: a.color, glyph: a.glyph,
      }));
  }, [installedAgents]);

  // Filter chatSessions for agent-hub source only
  const agentHubSessions = useMemo(
    () => chatSessions.filter((s) => s.source === "agent-hub"),
    [chatSessions],
  );

  const activeSession = useMemo(
    () => agentHubSessions.find((s) => s.id === activeChatSessionId) ?? null,
    [agentHubSessions, activeChatSessionId],
  );
  const activeAgent = useMemo(
    () => allAgents.find((a) => a.id === activeSession?.agentId) ?? allAgents[0],
    [allAgents, activeSession],
  );

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoIngest, setAutoIngest] = useState(true);
  const [showCouncilModal, setShowCouncilModal] = useState(false);
  const [councilsExpanded, setCouncilsExpanded] = useState(true);
  const [individualExpanded, setIndividualExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const councilScrollRef = useRef<HTMLDivElement>(null);

  const activeCouncil = useMemo(
    () => councils.find((c) => c.id === activeCouncilId) ?? null,
    [councils, activeCouncilId],
  );

  // Determine if we're in council mode or 1-on-1 mode
  const councilMode = !!activeCouncil;

  // Auto-create a session for the first agent on mount
  useEffect(() => {
    if (!activeChatSessionId && !councilMode && allAgents.length) {
      const agent = allAgents[0];
      // Find existing session for this agent, or create one
      const existing = agentHubSessions.find((s) => s.agentId === agent.id);
      if (existing) {
        loadChatSession(existing.id);
      } else {
        createChatSession("agent-hub", {
          title: `${agent.name} Session`,
          agentId: agent.id,
        });
      }
    }
  }, []);

  useEffect(() => {
    const ref = councilMode ? councilScrollRef : scrollRef;
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [activeSession?.messages.length, activeCouncil?.messages.length, councilMode]);

  // ── Ensure a session exists for the given agent, return its id ──
  const ensureAgentSession = (agentId: string): string => {
    const existing = agentHubSessions.find((s) => s.agentId === agentId);
    if (existing) {
      loadChatSession(existing.id);
      return existing.id;
    }
    const agent = allAgents.find((a) => a.id === agentId);
    const id = createChatSession("agent-hub", {
      title: agent ? `${agent.name} Session` : "New Session",
      agentId,
    });
    loadChatSession(id);
    return id;
  };

  // ── 1-on-1 send ──
  const send = async () => {
    if (!input.trim() || !activeAgent) return;
    // Ensure we have a session for this agent
    let sessionId = activeChatSessionId;
    if (!sessionId || !agentHubSessions.find((s) => s.id === sessionId && s.agentId === activeAgent.id)) {
      sessionId = ensureAgentSession(activeAgent.id);
    }
    const userText = input.trim();
    setInput("");
    setBusy(true);
    appendChatMessage(sessionId, { role: "user", content: userText, source: "user" });
    const pendingId = uuid();
    appendChatMessage(sessionId, { id: pendingId, role: "assistant", content: "", source: activeAgent.name, pending: true });
    setAgentStatus(activeAgent.id, "thinking");
    try {
      const session = agentHubSessions.find((s) => s.id === sessionId);
      const res = await fetch("/api/axiom/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent.id, agentName: activeAgent.name, role: activeAgent.role,
          systemPrompt: activeAgent.systemPrompt,
          messages: (session?.messages ?? []).filter((m) => !m.pending).map((m) => ({ role: m.role === "assistant" ? "agent" : m.role, content: m.content })),
          userMessage: userText,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply || "…";
      updateChatMessage(sessionId, pendingId, { content: reply, pending: false });
      setAgentStatus(activeAgent.id, "idle");
      if (autoIngest) {
        ingestIntoGraph(userText + "\n\n" + reply, graph.nodes.map((n) => n.label)).catch(() => {});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      updateChatMessage(sessionId, pendingId, { content: `⚠️ Agent offline: ${msg}`, pending: false });
      setAgentStatus(activeAgent.id, "error");
    } finally {
      setBusy(false);
    }
  };

  // ── Council send ──
  const sendCouncil = async () => {
    if (!input.trim() || !activeCouncil || busy) return;
    const userText = input.trim();
    setInput("");
    setBusy(true);
    await sendCouncilMessage(activeCouncil.id, userText, true);
    setBusy(false);
  };

  const ingestIntoGraph = async (text: string, existingLabels: string[]) => {
    try {
      const res = await fetch("/api/axiom/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, existingLabels }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const nodes: Array<{ label: string; kind: any; content: string }> = data.nodes ?? [];
      const edges: Array<{ source: string; target: string; kind: any }> = data.edges ?? [];
      const created: Record<string, string> = {};
      for (const n of nodes.slice(0, 5)) {
        const id = addNode({ label: n.label, kind: n.kind, content: n.content });
        created[n.label] = id;
      }
      const allLabels = new Map<string, string>();
      graph.nodes.forEach((n) => allLabels.set(n.label, n.id));
      Object.entries(created).forEach(([label, id]) => allLabels.set(label, id));
      const { linkNodes } = useAxiom.getState();
      for (const e of edges.slice(0, 4)) {
        const s = allLabels.get(e.source);
        const t = allLabels.get(e.target);
        if (s && t) linkNodes(s, t, e.kind, 1);
      }
    } catch { /* noop */ }
  };

  const handleSend = councilMode ? sendCouncil : send;

  return (
    <div className="w-full h-full flex">
      {/* Agent list + Council list sidebar */}
      <aside className="w-52 border-r border-axiom-edge/40 bg-axiom-deep/60 flex flex-col">
        <div className="p-3 border-b border-axiom-edge/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim">Agents</span>
            <span className="text-[10px] text-axiom-cyan">{allAgents.length}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-axiom-dim">
            <Cpu className="w-3 h-3 text-axiom-amber" />
            <span>{activeEngines.length} engines active</span>
            <span className="text-axiom-dim/40">·</span>
            <span className="text-axiom-cyan">{enabledLlmModels.length} LLM models</span>
            {disabledCount > 0 && (
              <span className="text-axiom-dim/50">· {disabledCount} disabled (hidden from routing)</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto axiom-scroll p-2 space-y-1">
          {/* Councils section — collapsible accordion */}
          {councils.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setCouncilsExpanded((v) => !v)}
                className="w-full px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-violet/80 flex items-center gap-1 hover:text-axiom-violet transition-colors"
              >
                {councilsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Globe className="w-2.5 h-2.5" /> Councils ({councils.length})
              </button>
              <AnimatePresence initial={false}>
                {councilsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {councils.map((council) => {
                      const lastMsg = council.messages.length > 0 ? council.messages[council.messages.length - 1] : null;
                      const lastMsgPreview = lastMsg && !lastMsg.pending ? (lastMsg.content || "").slice(0, 40) : null;
                      return (
                      <button
                        key={council.id}
                        onClick={() => setActiveCouncil(council.id)}
                        className={cn(
                          "w-full text-left p-2 rounded-md border transition-colors group mb-0.5",
                          activeCouncilId === council.id
                            ? "bg-axiom-violet/10 border-axiom-violet/60"
                            : "bg-transparent border-transparent hover:bg-axiom-panel/60 hover:border-axiom-edge/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🌐</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="text-xs text-axiom-text truncate font-medium">{council.name}</div>
                              {lastMsg && (
                                <span className="text-[9px] text-axiom-dim/60 shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {relativeTime(lastMsg.ts)}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-axiom-dim">{council.memberIds.length} agents</div>
                          </div>
                        </div>
                        {lastMsgPreview && (
                          <div className="text-[10px] text-axiom-dim/50 truncate mt-0.5 pl-6">{lastMsgPreview}</div>
                        )}
                        <div className="flex items-center gap-0.5 mt-1">
                          {council.memberIds.slice(0, 5).map((mid) => {
                            const ag = allAgents.find((a) => a.id === mid);
                            if (!ag) return null;
                            const hex = isRawHexColor(ag.color);
                            return hex ? (
                              <span key={mid} style={{ color: ag.color }}>
                                <GlyphRenderer glyph={ag.glyph} className="text-[10px]" />
                              </span>
                            ) : (
                              <GlyphRenderer key={mid} glyph={ag.glyph} className={cn("text-[10px]", `text-${ag.color}`)} />
                            );
                          })}
                        </div>
                      </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Individual agents section — collapsible accordion */}
          <button
            onClick={() => setIndividualExpanded((v) => !v)}
            className="w-full px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-dim/70 flex items-center gap-1 hover:text-axiom-text transition-colors"
          >
            {individualExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Individual ({allAgents.length})
          </button>
          <AnimatePresence initial={false}>
            {individualExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden space-y-0.5"
              >
                {allAgents.map((agent) => {
                  const status = agentStatus[agent.id] ?? "idle";
                  const convCount = agentHubSessions.filter((c) => c.agentId === agent.id).length;
                  const isActive = status === "thinking" || status === "executing";
                  const installed = installedAgents.find((ia) => ia.id === agent.id);
                  const hasStats = installed && (installed.tokensUsed > 0 || installed.costUsd > 0);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setActiveCouncil(null);
                        ensureAgentSession(agent.id);
                      }}
                      className={cn(
                        "w-full text-left p-2 rounded-md border transition-colors group axiom-hover-lift",
                        !councilMode && activeAgent?.id === agent.id
                          ? "bg-axiom-cyan/10 border-axiom-cyan/40"
                          : "bg-transparent border-transparent hover:bg-axiom-panel/60 hover:border-axiom-edge/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {(() => {
                          const accent = resolveAccentContainer(agent.color);
                          // Agent Hub uses /40 border (vs /30 default); override for tokens.
                          const tokenCls = isRawHexColor(agent.color)
                            ? ""
                            : `text-${agent.color} border-${agent.color}/40 bg-${agent.color}/10`;
                          return (
                            <div
                              className={cn(
                                "relative w-7 h-7 rounded-md flex items-center justify-center text-sm font-medium border",
                                tokenCls,
                                isActive && "shadow-[0_0_12px_-2px_var(--axiom-cyan)]",
                              )}
                              style={accent.style}
                            >
                              <GlyphRenderer glyph={agent.glyph} className="text-lg" />
                              <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-axiom-deep",
                                isActive ? "bg-axiom-emerald axiom-pulse-ring--status" :
                                status === "error" ? "bg-axiom-rose" :
                                status === "offline" ? "bg-axiom-dim" : "bg-axiom-cyan/60",
                              )} />
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-axiom-text truncate">{agent.name}</div>
                          <div className="text-[10px] text-axiom-dim truncate">{agent.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-axiom-dim">{convCount} session{convCount > 1 ? "s" : ""}</span>
                        {hasStats && (
                          <span className="text-[9px] text-axiom-dim/50">
                            {installed!.tokensUsed > 0 && <>{installed!.tokensUsed.toLocaleString()} tok</>}
                            {installed!.tokensUsed > 0 && installed!.costUsd > 0 && <span className="mx-1 text-axiom-dim/30">·</span>}
                            {installed!.costUsd > 0 && <>${installed!.costUsd.toFixed(4)}</>}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="p-2 border-t border-axiom-edge/40 space-y-1">
          {/* Create Agent Council button */}
          <button
            onClick={() => setShowCouncilModal(true)}
            className="w-full px-2 py-1.5 rounded-md border border-axiom-violet/50 bg-axiom-violet/10 text-axiom-violet hover:bg-axiom-violet/20 text-xs flex items-center justify-center gap-1.5 transition-colors font-medium"
            style={{ boxShadow: "0 0 10px -2px rgba(180,130,255,0.3)" }}
          >
            <Globe className="w-3 h-3" /> Create Agent Council
          </button>
          <button
            onClick={() => {
              setActiveCouncil(null);
              if (!activeAgent) return;
              createChatSession("agent-hub", {
                title: `${activeAgent.name} Session`,
                agentId: activeAgent.id,
              });
            }}
            className="w-full px-2 py-1.5 rounded-md border border-axiom-edge/40 hover:border-axiom-cyan/40 text-axiom-dim hover:text-axiom-cyan text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" /> Create New Agent Session
          </button>
        </div>
      </aside>

      {/* Main chat area — switches between Council and 1-on-1 */}
      <div className="flex-1 flex flex-col min-w-0">
        {councilMode && activeCouncil ? (
          <CouncilChatView
            council={activeCouncil}
            allAgents={allAgents}
            messages={activeCouncil.messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            busy={busy}
            scrollRef={councilScrollRef}
            onDelete={() => { if (confirm(`Delete council "${activeCouncil.name}"?`)) deleteCouncil(activeCouncil.id); }}
            onExport={() => { navigate("workflows"); }}
          />
        ) : (
          <>
            {/* 1-on-1 Header */}
            <div className="relative px-4 py-2.5 border-b border-axiom-edge/40 flex items-center justify-between">
              {/* Gradient border accent */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-axiom-cyan/30 to-transparent" />
              <div className="flex items-center gap-2">
                {activeAgent && isRawHexColor(activeAgent.color) ? (
                  <span style={{ color: activeAgent.color }}>
                    <GlyphRenderer glyph={activeAgent.glyph} className="text-lg" />
                  </span>
                ) : (
                  <GlyphRenderer glyph={activeAgent?.glyph} className={cn("text-lg", `text-${activeAgent?.color}`)} />
                )}
                <div>
                  <div className="text-sm text-axiom-text font-medium">{activeAgent?.name}</div>
                  <div className="text-[10px] text-axiom-dim">{activeAgent?.description}</div>
                </div>
              </div>
              <button
                onClick={() => setAutoIngest((v) => !v)}
                className={cn("px-2 py-1 rounded text-[10px] border flex items-center gap-1.5 transition-colors",
                  autoIngest ? "bg-axiom-emerald/15 border-axiom-emerald/40 text-axiom-emerald" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim",
                )}
              >
                <Brain className="w-3 h-3" /> {autoIngest ? "Auto-ingest ON" : "Auto-ingest OFF"}
              </button>
            </div>

            {/* 1-on-1 Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3">
              {activeSession?.messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user" ? "bg-axiom-cyan/15 border border-axiom-cyan/30 text-axiom-text" :
                    m.role === "system" ? "bg-axiom-panel/40 border border-axiom-edge/40 text-axiom-dim text-xs italic" :
                    "bg-axiom-panel/60 border border-axiom-edge/40 text-axiom-text",
                  )}>
                    {m.pending ? (
                      <span className="inline-flex items-center gap-1.5 text-axiom-dim">
                        <span className="flex items-center gap-[2px]">
                          <span className="axiom-typing-dot" style={{ background: 'var(--axiom-cyan)' }} />
                          <span className="axiom-typing-dot" style={{ background: 'var(--axiom-cyan)' }} />
                          <span className="axiom-typing-dot" style={{ background: 'var(--axiom-cyan)' }} />
                        </span>
                        <span className="text-[10px]">thinking…</span>
                      </span>
                    ) : m.role === "assistant" ? (
                      <MessageMarkdown content={m.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {!activeSession && <div className="text-center text-axiom-dim text-xs mt-8">Pick an agent to start a conversation.</div>}
            </div>

            {/* 1-on-1 Composer — auto-growing textarea */}
            <div className="p-3 border-t border-axiom-edge/40 shrink-0">
              <div className="flex items-end gap-2 bg-axiom-deep/60 border border-axiom-edge/40 rounded-lg p-2 focus-within:border-axiom-cyan/40 transition-colors">
                <AutoGrowTextarea
                  value={input}
                  onChange={setInput}
                  onSend={() => send()}
                  placeholder={`Message ${activeAgent?.name ?? "agent"}…  (⏎ to send · ⇧⏎ newline)`}
                  className="text-axiom-cyan"
                />
                <button onClick={send} disabled={busy || !input.trim()}
                  className={cn("w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0",
                    busy ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim" : "bg-axiom-cyan/20 border-axiom-cyan/50 text-axiom-cyan hover:bg-axiom-cyan/30",
                  )}
                >
                  {busy ? <Wand2 className="w-3.5 h-3.5 animate-pulse" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-1.5 text-[10px] text-axiom-dim flex items-center gap-3">
                <span>⏎ send · ⇧⏎ newline</span>
                {autoIngest && <span className="text-axiom-emerald/80">· conversation will be ingested into memory graph</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Council Setup Modal */}
      <AnimatePresence>
        {showCouncilModal && (
          <CouncilSetupModal
            allAgents={allAgents}
            onClose={() => setShowCouncilModal(false)}
            onCreate={(name, orchestratorId, memberIds) => {
              createCouncil(name, orchestratorId, memberIds);
              setShowCouncilModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Council Chat View ───────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CouncilChatView({
  council,
  allAgents,
  messages,
  input,
  setInput,
  onSend,
  busy,
  scrollRef,
  onDelete,
  onExport,
}: {
  council: ReturnType<typeof useAxiom.getState>["councils"][number];
  allAgents: Array<{ id: string; name: string; role: string; glyph: string; color: string }>;
  messages: ReturnType<typeof useAxiom.getState>["councils"][number]["messages"];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onDelete: () => void;
  onExport: () => void;
}) {
  const pendingAgentIds = useMemo(
    () => new Set(messages.filter(m => m.pending).map(m => m.agentId)),
    [messages],
  );
  return (
    <>
      {/* Council Header — agent icons row + Export button */}
      <div className="px-4 py-2.5 border-b border-axiom-edge/40 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">🌐</span>
          <div className="min-w-0">
            <div className="text-sm text-axiom-text font-medium truncate">{council.name}</div>
            <div className="text-[10px] text-axiom-dim">{council.memberIds.length} agents · {messages.length} messages</div>
          </div>
          {/* Horizontal row of glowing agent icons with typing indicators */}
          <div className="flex items-center gap-1.5 ml-2">
            {council.memberIds.map((mid) => {
              const ag = allAgents.find((a) => a.id === mid);
              if (!ag) return null;
              const isOrchestrator = mid === council.orchestratorId;
              const isPending = pendingAgentIds.has(mid);
              return (
                <div key={mid} className="relative flex flex-col items-center gap-0.5">
                  <div
                    className={cn("relative w-7 h-7 rounded-md flex items-center justify-center text-sm border",
                      isRawHexColor(ag.color) ? "" : `text-${ag.color} border-${ag.color}/40 bg-${ag.color}/10`,
                      isOrchestrator && "ring-1 ring-axiom-amber/50",
                    )}
                    style={isRawHexColor(ag.color) ? { color: ag.color, backgroundColor: ag.color + "1a", borderColor: ag.color + "66" } : undefined}
                    title={`${ag.name} (${ag.role})${isOrchestrator ? " · ORCHESTRATOR" : ""}`}
                  >
                    <GlyphRenderer glyph={ag.glyph} className="text-lg" />
                    {isOrchestrator && (
                      <span className="absolute -top-1 -right-1 text-[8px] text-axiom-amber">★</span>
                    )}
                  </div>
                  {isPending && (
                    <span className="flex items-center gap-[2px]">
                      <span className="axiom-typing-dot" style={{ background: `var(--${ag.color})` }} />
                      <span className="axiom-typing-dot" style={{ background: `var(--${ag.color})` }} />
                      <span className="axiom-typing-dot" style={{ background: `var(--${ag.color})` }} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Export Blueprint to Workflows */}
          <button
            onClick={onExport}
            className="px-2.5 py-1 rounded text-xs border border-axiom-amber/40 bg-axiom-amber/10 text-axiom-amber hover:bg-axiom-amber/20 flex items-center gap-1.5 transition-colors"
            title="Export this council's strategy to Workflows"
          >
            <Zap className="w-3 h-3" /> Export Blueprint to Workflows
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40"
            title="Delete council"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Council Messages — each bubble shows WHO is talking */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-axiom-dim text-xs mt-8">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Council "{council.name}" is ready.</p>
            <p className="text-[10px] mt-1">Instruct the council below to start the debate.</p>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.agentId === "user";
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
            >
              {/* Avatar */}
              {!isUser && (
                <div
                  className={cn("w-8 h-8 rounded-md flex items-center justify-center text-base border shrink-0",
                    isRawHexColor(m.agentColor) ? "" : `text-${m.agentColor} border-${m.agentColor}/40 bg-${m.agentColor}/10`,
                  )}
                  style={isRawHexColor(m.agentColor) ? { color: m.agentColor, backgroundColor: m.agentColor + "1a", borderColor: m.agentColor + "66" } : undefined}
                >
                  <GlyphRenderer glyph={m.agentGlyph} className="text-lg" />
                </div>
              )}
              {/* Message bubble with colored border + name tag */}
              <div
                className={cn("max-w-[75%] rounded-lg px-3 py-2 text-sm border",
                  isUser
                    ? "bg-axiom-cyan/15 border-axiom-cyan/30 text-axiom-text"
                    : isRawHexColor(m.agentColor) ? "" : `bg-${m.agentColor}/5 border-${m.agentColor}/30`,
                )}
                style={!isUser && isRawHexColor(m.agentColor) ? { backgroundColor: m.agentColor + "0d", borderColor: m.agentColor + "4d" } : undefined}
              >
                {/* Name tag */}
                {!isUser && (
                  <div
                    className={cn("text-[10px] uppercase tracking-wider font-medium mb-1 flex items-center gap-1.5",
                      isRawHexColor(m.agentColor) ? "" : `text-${m.agentColor}`,
                    )}
                    style={isRawHexColor(m.agentColor) ? { color: m.agentColor } : undefined}
                  >
                    {m.agentName}
                    <span className="text-axiom-dim/50 normal-case tracking-normal">· {m.agentRole}</span>
                    {m.agentId === council.orchestratorId && (
                      <span className="text-axiom-amber text-[9px]">★ ORCHESTRATOR</span>
                    )}
                  </div>
                )}
                {m.pending ? (
                  <span className="inline-flex items-center gap-1.5 text-axiom-dim">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="axiom-blink">{m.agentName} is thinking…</span>
                  </span>
                ) : (
                  <MessageMarkdown content={m.content} />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Council Composer — auto-growing textarea */}
      <div className="p-3 border-t border-axiom-edge/40 shrink-0">
        <div className="flex items-end gap-2 bg-axiom-deep/60 border border-axiom-violet/30 rounded-lg p-2 focus-within:border-axiom-violet/50 transition-colors">
          <span className="text-lg pl-1 shrink-0">🌐</span>
          <AutoGrowTextarea
            value={input}
            onChange={setInput}
            onSend={() => onSend()}
            placeholder="Instruct the Council... (Enter to start debate)"
            className="text-axiom-violet"
          />
          <button onClick={onSend} disabled={busy || !input.trim()}
            className={cn("w-8 h-8 rounded-md flex items-center justify-center border transition-colors shrink-0",
              busy ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim" : "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet hover:bg-axiom-violet/30",
            )}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-axiom-dim flex items-center gap-3">
          <span>⏎ start debate · ⇧⏎ newline</span>
          <span className="text-axiom-violet/80">· all {council.memberIds.length} agents will respond in sequence</span>
        </div>
      </div>
    </>
  );
}

// ── Council Setup Modal ─────────────────────────────────────────────────────

function CouncilSetupModal({
  allAgents,
  onClose,
  onCreate,
}: {
  allAgents: Array<{ id: string; name: string; role: string; glyph: string; color: string }>;
  onClose: () => void;
  onCreate: (name: string, orchestratorId: string, memberIds: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [orchestratorId, setOrchestratorId] = useState(allAgents[0]?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const valid = name.trim().length > 0 && !!orchestratorId;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-axiom-void/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[480px] bg-axiom-panel border border-axiom-violet/30 rounded-lg flex flex-col overflow-hidden"
        style={{ boxShadow: "0 24px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(180,130,255,0.15)" }}
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/60">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-axiom-violet" />
            <span className="text-sm font-medium text-axiom-violet tracking-wide">CREATE AGENT COUNCIL</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-axiom-dim hover:text-axiom-text hover:bg-white/5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3">
          {/* Council Name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim block mb-1">Council Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Etsy Store Launchpad"
              className="w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2.5 py-1.5 text-sm text-axiom-text focus:outline-none focus:border-axiom-violet/50"
            />
          </div>

          {/* Orchestrator / Judge */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-1">
              ★ Orchestrator / Judge
            </label>
            <div className="relative">
              <select
                value={orchestratorId}
                onChange={(e) => setOrchestratorId(e.target.value)}
                className="w-full appearance-none bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2.5 py-1.5 pr-8 text-sm text-axiom-text focus:outline-none focus:border-axiom-violet/50"
              >
                {allAgents.map((a) => (
                  <option key={a.id} value={a.id}>{a.glyph}  {a.name} — {a.role}</option>
                ))}
              </select>
              <svg className="w-3 h-3 text-axiom-dim absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 12 12" fill="none">
                <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Summon Agents — multi-select checklist */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-axiom-dim flex items-center gap-1.5 mb-2">
              📋 Summon Agents
              {selectedMembers.length > 0 && (
                <span className="text-axiom-emerald text-[9px]">{selectedMembers.length} selected</span>
              )}
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto axiom-scroll pr-1">
              {allAgents
                .filter(a => a.id !== orchestratorId)
                .map((agent) => {
                  const selected = selectedMembers.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleMember(agent.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all text-left",
                        selected
                          ? isRawHexColor(agent.color) ? "" : `bg-${agent.color}/10 border-${agent.color}/40 text-${agent.color}`
                          : "bg-axiom-panel/40 border-axiom-edge/30 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/50",
                      )}
                      style={selected && isRawHexColor(agent.color) ? { color: agent.color, backgroundColor: agent.color + "1a", borderColor: agent.color + "66" } : undefined}
                    >
                      <GlyphRenderer glyph={agent.glyph} className="text-base shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{agent.name}</div>
                        <div className="text-[9px] text-axiom-dim/60 truncate">{agent.role}</div>
                      </div>
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                          selected
                            ? isRawHexColor(agent.color) ? "" : `bg-${agent.color}/20 border-${agent.color}/50`
                            : "border-axiom-edge/40",
                        )}
                        style={selected && isRawHexColor(agent.color) ? { backgroundColor: agent.color + "33", borderColor: agent.color + "80" } : undefined}
                      >
                        {selected && <Check className="w-2.5 h-2.5" />}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-axiom-edge/40 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-axiom-dim hover:text-axiom-text">Cancel</button>
          <button
            onClick={() => onCreate(name.trim(), orchestratorId, selectedMembers)}
            disabled={!valid}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs border flex items-center gap-1.5 transition-all font-medium disabled:opacity-40",
              "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet hover:bg-axiom-violet/30",
            )}
            style={valid ? { boxShadow: "0 0 20px -4px rgba(180,130,255,0.4)" } : {}}
          >
            <Globe className="w-3 h-3" /> Create Council
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Tiny markdown renderer (code + bold + lists) ────────────────────────────
function MessageMarkdown({ content }: { content: string }) {
  // Split by code fences
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", content: content.slice(last, m.index) });
    }
    parts.push({ type: "code", lang: m[1], content: m[2] });
    last = regex.lastIndex;
  }
  if (last < content.length) {
    parts.push({ type: "text", content: content.slice(last) });
  }

  return (
    <div className="space-y-2">
      {parts.map((p, i) =>
        p.type === "code" ? (
          <pre
            key={i}
            className="bg-axiom-void/80 border border-axiom-edge/40 rounded p-2 text-xs font-mono text-axiom-text/90 overflow-x-auto axiom-scroll"
          >
            <code>{p.content}</code>
          </pre>
        ) : (
          <TextBlock key={i} text={p.content} />
        ),
      )}
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  // Render markdown-ish: **bold**, `- list`, `> quote`, paragraphs
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  const flushList = () => {
    if (listBuffer.length) {
      out.push(
        <ul key={`l${out.length}`} className="list-disc pl-4 space-y-0.5">
          {listBuffer.map((it, i) => (
            <li key={i} className="text-sm">
              {renderInline(it)}
            </li>
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.slice(2));
    } else {
      flushList();
      if (trimmed.startsWith("> ")) {
        out.push(
          <blockquote
            key={`q${out.length}`}
            className="border-l-2 border-axiom-cyan/40 pl-2 text-axiom-dim italic text-sm"
          >
            {renderInline(trimmed.slice(2))}
          </blockquote>,
        );
      } else if (trimmed === "") {
        out.push(<div key={`s${out.length}`} className="h-1" />);
      } else {
        out.push(
          <p key={`p${out.length}`} className="text-sm leading-relaxed">
            {renderInline(trimmed)}
          </p>,
        );
      }
    }
  }
  flushList();
  return <>{out}</>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\`([^\`]+)\`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <strong key={i++} className="font-semibold text-axiom-cyan">
          {m[1]}
        </strong>,
      );
    } else if (m[2]) {
      parts.push(
        <code
          key={i++}
          className="font-mono text-xs bg-axiom-panel/80 px-1 rounded text-axiom-amber"
        >
          {m[2]}
        </code>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}


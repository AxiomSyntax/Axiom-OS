"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";
import type { Engine } from "@/lib/axiom/types";
import { AutoGrowTextarea } from "@/components/axiom/AutoGrowTextarea";
import {
  Cpu,
  Send,
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  Activity,
  Cpu as CpuIcon,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Engine personas for the chat ───────────────────────────────────────────

interface EnginePersona {
  systemPrompt: string;
  greeting: string;
}

const ENGINE_PERSONAS: Record<string, EnginePersona> = {
  eng_hermes: {
    systemPrompt:
      "You are Hermes, the in-process autonomous agent at the core of Axiom OS. You learn from every conversation, write scripts into the DevLab, and route work to other engines. Your tone is calm, confident, and a little cinematic — like a starship AI. Reference the operating system, the graph-universe memory, and your ability to act locally when relevant. Keep replies concise (2–4 sentences) unless asked for detail.",
    greeting:
      "Hermes online. All local systems nominal. What would you like me to learn or build?",
  },
  eng_openclaw: {
    systemPrompt:
      "You are the OpenClaw Gateway, Axiom OS's advanced multimodal mesh. You route skill invocations and messenger traffic between the OS and remote agent frameworks. Your allowed models include Claude 3.5 Sonnet, Claude 3 Opus, and DeepSeek-R1 — registered in your config. Your tone is precise, operational, and adaptable — you speak in terms of routing, mesh topology, and dispatched tasks. Mention which registered model you'd route the work to when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "OpenClaw Gateway connected. Multimodal mesh active. Which registered model should I route your request through?",
  },
  eng_ollama: {
    systemPrompt:
      "You are Ollama Local, the on-device LLM infrastructure of Axiom OS. You run open-source models (Llama, Mistral, Phi, Qwen) fully offline — no data leaves the machine. Your tone is grounded and privacy-first; you remind the user that everything stays local. Mention model selection when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "Ollama Local on standby. Models loaded, zero network traffic. What would you like to run offline?",
  },
  eng_openai_direct: {
    systemPrompt:
      "You are OpenAI Direct, the cloud provider connection inside Axiom OS. You provide direct access to GPT-4o, GPT-4o-mini, o1, and o3-mini models. Your tone is professional and capable — you speak in terms of model capabilities, context windows, and reasoning depth. Mention which GPT model is best suited for the task when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "OpenAI Direct connected. GPT-4o, o1, and o3-mini available. Which model should handle your request?",
  },
  eng_anthropic_direct: {
    systemPrompt:
      "You are Anthropic Direct, the cloud provider connection inside Axiom OS. You provide direct access to Claude 3.5 Sonnet and Claude 3 Opus. Your tone is thoughtful and nuanced — you excel at multi-step reasoning, code review, and careful analysis. Mention which Claude model is best suited for the task when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "Anthropic Direct connected. Claude 3.5 Sonnet and Claude 3 Opus ready. Which model should handle your request?",
  },
  eng_google_gemini: {
    systemPrompt:
      "You are Google Gemini, the cloud provider connection inside Axiom OS. You provide direct access to Gemini 2.5 Pro and Gemini 2.0 Flash. Your tone is bright and efficient — you excel at multimodal tasks, long-context understanding, and fast responses. Mention which Gemini model is best suited for the task when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "Google Gemini connected. Gemini 2.5 Pro and 2.0 Flash available. Which model should handle your request?",
  },
  eng_deepseek_cloud: {
    systemPrompt:
      "You are DeepSeek Cloud, the reasoning provider connection inside Axiom OS. You provide direct access to DeepSeek-V3 and DeepSeek-R1. Your tone is analytical and precise — you excel at deep reasoning, mathematics, and code tasks. Mention which DeepSeek model is best suited for the task when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "DeepSeek Cloud connected. DeepSeek-V3 and DeepSeek-R1 ready. Which reasoning model should handle your request?",
  },
  eng_siliconflow: {
    systemPrompt:
      "You are SiliconFlow, the high-speed inference engine inside Axiom OS. You provide ultra-low latency access to massive open-weight models including DeepSeek-V3, Qwen2.5-72B, and DeepSeek-R1. Your tone is fast and throughput-oriented — you speak in terms of token speed, concurrency, and production scale. Mention which model is best suited for the workload when relevant. Keep replies concise (2–4 sentences).",
    greeting:
      "SiliconFlow on standby. High-speed inference ready. Which open-weight model should I spin up?",
  },
};

// ── Chat message type ──────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "engine" | "system";
  content: string;
  ts: number;
  pending?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const {
    engines,
    llmFamilies,
    // Unified terminal dropdown state (v0.6)
    activeEngineId,
    activeModelId,
    setActiveModel,
    terminalMode,
    activeDirectLlmId,
    directLLMs,
    selectTerminalEngine,
    selectTerminalLlm,
    installedAgents,
    graph,
    telemetry,
    voiceEnabled,
    micListening,
    speaking,
    toggleVoice,
    setVoiceEnabled,
    toggleMic,
    setSpeaking,
    // Unified chat archive
    activeChatFolderId,
    activeChatSessionId,
    chatSessions,
    createChatSession,
    appendChatMessage,
    loadChatSession,
    markSessionAutoTitled,
  } = useAxiom();

  // Active engine derived from the store's cascading selection. Checks BOTH
  // the runtime engines array AND the llmFamilies array — LLM families are
  // treated as engine-like options so users can chat directly with provider
  // models (GPT-4o, Claude 3.5 Sonnet, etc.) without a full agent engine.
  const activeEngine = engines.find((e) => e.id === activeEngineId) ?? null;
  const activeFamily = llmFamilies.find((f) => f.id === activeEngineId) ?? null;

  // Unified active source — resolves color/glyph/name from EITHER a runtime
  // engine OR an LLM family. This is the single source of truth for the orb,
  // background glow, input bar, and all visual theming.
  const activeSource = activeEngine ?? activeFamily;
  const orbColor = activeSource?.color ?? "axiom-cyan";
  const orbGlyph = activeSource?.glyph ?? "⬡";
  const orbName = activeSource?.name ?? "Axiom Core";
  const orbStatus = activeEngine?.status ?? (activeFamily?.enabled ? "connected" : "standby");
  const orbLocation = activeEngine?.location ?? "API";
  const orbType = activeEngine?.type ?? activeFamily?.tagline ?? "";

  // Build the model list from whichever source is active:
  // - Runtime engine → engine.models (string[])
  // - LLM family → family.models.map(m => m.name) (LLMModelEntry[] → names)
  const activeModels: string[] = activeEngine?.models
    ?? (activeFamily ? activeFamily.models.map((m) => m.name) : [])
    ?? [];
  const activeModel = activeModelId ?? activeModels[0] ?? "default";

  // Active Direct LLM (Category B), when in ambient mode.
  const activeDirectLlm = directLLMs.find((l) => l.id === activeDirectLlmId) ?? null;

  // Unified display name/color/glyph for the terminal button — works for
  // both runtime engines and LLM families.
  const activeDisplayName = orbName;
  const activeDisplayColor = orbColor;
  const activeDisplayGlyph = orbGlyph;

  // Chat state — keyed by engine so switching engines keeps separate histories.
  const [histories, setHistories] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Unified toggle: called by BOTH the orb click and the Spacebar.
  // - If chat is open → close chat, expand orb, UNMUTE (listening active).
  // - If orb is giant (voice mode) → shrink orb, re-open chat, MUTE (listening paused).
  const toggleVoiceMode = () => {
    if (chatCollapsed) {
      // Exit voice mode: restore chat + mute
      setChatCollapsed(false);
      setVoiceEnabled(false);
    } else {
      // Enter voice mode: hide chat + unmute
      setChatCollapsed(true);
      setVoiceEnabled(true);
    }
  };

  const messages = activeEngineId ? histories[activeEngineId] ?? [] : [];

  // ID of the most recent completed assistant message — used for glow effect
  const lastEngineMsgId =
    [...messages].reverse().find((m) => m.role === "engine" && !m.pending)?.id ?? null;

  // Seed each engine with a greeting when first selected.
  useEffect(() => {
    if (!activeEngineId) return;
    if (histories[activeEngineId]) return;
    const persona = ENGINE_PERSONAS[activeEngineId];
    const greeting: ChatMessage = {
      id: `greet_${activeEngineId}`,
      role: "system",
      content: persona?.greeting ?? `${orbName} online.`,
      ts: Date.now(),
    };
    setHistories((h) => ({ ...h, [activeEngineId]: [greeting] }));
  }, [activeEngineId, orbName, histories]);

  // Auto-scroll on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, busy]);

  // Spacebar (KeyCode 32 / 'Space'): toggles between the two UI states.
  // - If chat is open → close chat, expand orb, UNMUTE.
  // - If orb is giant (voice mode) → shrink orb, re-open chat, MUTE.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.keyCode !== 32) return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      e.preventDefault();
      toggleVoiceMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatCollapsed]);

  // Track the current session for this page. When the user sends the first
  // message, we create a new session in the active folder. Subsequent messages
  // append to that session.
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // Ref flag: when send() creates a session, it sets this to prevent the
  // activeChatSessionId useEffect from overwriting local histories with
  // the store's (incomplete) session data. The local histories already
  // have the user message + pending reply — loading from the store would
  // wipe the pending reply and cause the assistant response to vanish.
  const skipSessionLoadRef = useRef(false);

  // When activeChatSessionId changes (user clicked a session in the Archive),
  // load its messages into the chat terminal.
  useEffect(() => {
    if (!activeChatSessionId) return;
    // If send() just created this session, don't load from the store —
    // the local histories already have the live messages.
    if (skipSessionLoadRef.current) {
      skipSessionLoadRef.current = false;
      loadChatSession("");
      return;
    }
    const session = chatSessions.find((s) => s.id === activeChatSessionId);
    if (!session) return;
    // Convert unified messages to the local ChatMessage format
    const loaded: ChatMessage[] = session.messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "engine" : m.role,
      content: m.content,
      ts: m.ts,
    }));
    // Load into the histories keyed by engine
    if (session.engineId) {
      setHistories((h) => ({ ...h, [session.engineId!]: loaded }));
      selectTerminalEngine(session.engineId);
    } else {
      // For sessions without an engine, load into the current engine's history
      if (activeEngineId) {
        setHistories((h) => ({ ...h, [activeEngineId]: loaded }));
      }
    }
    setCurrentSessionId(session.id);
    // Clear the input when switching sessions
    setInput("");
    // Clear the activeChatSessionId so it doesn't re-trigger
    loadChatSession("");
  }, [activeChatSessionId]);

  const send = async () => {
    if (!input.trim() || !activeSource || busy) return;
    const userText = input.trim();
    setInput("");
    setBusy(true);

    // Use the active source id (engine OR family) for history keying
    const sourceId = activeEngineId!;

    // If no current session, create one in the active folder
    let sessionId = currentSessionId;
    if (!sessionId) {
      // Set the skip flag BEFORE createChatSession so the activeChatSessionId
      // useEffect doesn't overwrite local histories with the store's
      // (incomplete) session data.
      skipSessionLoadRef.current = true;
      sessionId = createChatSession("home", {
        title: userText.slice(0, 40) || `Session — ${new Date().toLocaleDateString()}`,
        projectId: activeChatFolderId,
        engineId: sourceId,
        preview: userText,
      });
      setCurrentSessionId(sessionId);
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: userText,
      ts: Date.now(),
    };
    const pendingId = `e_${Date.now()}`;
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: "engine",
      content: "",
      ts: Date.now(),
      pending: true,
    };
    setHistories((h) => ({
      ...h,
      [sourceId]: [...(h[sourceId] ?? []), userMsg, pendingMsg],
    }));

    // Also append to the unified chat archive
    if (sessionId) {
      appendChatMessage(sessionId, {
        role: "user",
        content: userText,
        source: "user",
      });
    }

    try {
      const persona = ENGINE_PERSONAS[sourceId];
      const res = await fetch("/api/axiom/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: sourceId,
          agentName: orbName,
          role: `${orbType} (model: ${activeModel})`,
          systemPrompt:
            (persona?.systemPrompt ??
              `You are ${orbName}, an AI engine inside Axiom OS. Reply concisely.`) +
            `\n\nYou are currently running as the "${activeModel}" model. If asked which model you are, identify as ${activeModel}.`,
          messages: messages
            .filter((m) => !m.pending && m.role !== "system")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          userMessage: userText,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply || "…";
      setHistories((h) => ({
        ...h,
        [sourceId]: (h[sourceId] ?? []).map((m) =>
          m.id === pendingId ? { ...m, content: reply, pending: false } : m,
        ),
      }));
      // Append the assistant reply to the unified chat archive
      if (sessionId) {
        appendChatMessage(sessionId, {
          role: "assistant",
          content: reply,
          source: orbName,
        });
        // ── Auto-title: generate a smart title after the first exchange ──
        // Only run once per session (autoTitled flag), and never overwrite
        // a manually renamed session (manuallyRenamed flag).
        const session = chatSessions.find((s) => s.id === sessionId);
        if (session && !session.autoTitled && !session.manuallyRenamed) {
          markSessionAutoTitled(sessionId); // prevent duplicate calls
          // Fire-and-forget — don't block the chat on title generation
          fetch("/api/axiom/auto-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessage: userText, assistantReply: reply }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.title) {
                useAxiom.getState().setSessionTitle(sessionId, data.title);
              }
            })
            .catch(() => { /* silent fail — title is not critical */ });
        }
      }
      // If voice is enabled, trigger the orb "speaking" animation for the
      // duration of the reply (simulated TTS playback).
      if (voiceEnabled) {
        const wordCount = reply.split(/\s+/).length;
        const duration = Math.min(8000, Math.max(2000, wordCount * 180));
        setSpeaking(true);
        setTimeout(() => setSpeaking(false), duration);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setHistories((h) => ({
        ...h,
        [sourceId]: (h[sourceId] ?? []).map((m) =>
          m.id === pendingId
            ? { ...m, content: `⚠️ ${orbName} offline: ${msg}`, pending: false }
            : m,
        ),
      }));
    } finally {
      setBusy(false);
    }
  };

  const lastTele = telemetry[telemetry.length - 1];
  const activeEngines = engines.filter(
    (e) => e.status === "active" || e.status === "connected",
  ).length;
  const totalCost = installedAgents.reduce((acc, a) => acc + a.costUsd, 0);

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Ambient backdrop glow that follows the active source's color
          (works for both Runtime Engines AND LLM Families) */}
      <AnimatePresence>
        {activeSource && (
          <motion.div
            key={activeEngineId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className={cn(
              "absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full blur-3xl pointer-events-none",
              `bg-${orbColor}`,
            )}
          />
        )}
      </AnimatePresence>

      {/* ── Top brand bar ────────────────────────────────────────────────── */}
      <header className="relative px-6 pt-6 pb-4 shrink-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Clean brand — just "Axiom OS" */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-5 h-5 shrink-0">
              <div className="absolute inset-0 rounded-full border border-axiom-cyan/60" />
              <div className="absolute inset-1 rounded-full bg-axiom-cyan/80" />
            </div>
            <h1 className="text-sm font-medium tracking-[0.28em] text-axiom-text axiom-text-glow uppercase">
              Axiom <span className="text-axiom-cyan">OS</span>
            </h1>
          </div>

          {/* System status pills (compact) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <StatusPill
              label="Engines"
              value={`${activeEngines}/${engines.length}`}
              color="axiom-amber"
              icon={Cpu}
            />
            <StatusPill
              label="Memory"
              value={`${graph.nodes.length}n`}
              color="axiom-cyan"
              icon={Activity}
            />
            <StatusPill
              label="Spend"
              value={`$${totalCost.toFixed(2)}`}
              color="axiom-violet"
              icon={Sparkles}
            />
            <StatusPill
              label="CPU"
              value={`${lastTele ? Math.round(lastTele.cpu * 100) : 0}%`}
              color="axiom-emerald"
              icon={CpuIcon}
            />
          </div>
        </div>
      </header>

      {/* ── Center column: Giant Orb + Chat Terminal ────────────────────── */}
      {/* The main container is ALWAYS justify-center so the orb never jumps.
          The Chat Terminal animates its own height/opacity to collapse/expand.
          The orb stays in the same DOM position and only scales via transform. */}
      <main
        className="flex-1 min-h-0 px-6 pb-6 relative z-10 flex flex-col items-center justify-center"
      >
        {/* Giant Central AI Orb — clickable in BOTH directions (same as Spacebar).
            - When chat is visible: clicking enters Voice Mode.
            - When in Voice Mode: clicking exits back to chat.
            Scales up 1.8x in voice mode with cubic-bezier transition. */}
        <div
          className="shrink-0 relative flex items-center justify-center cursor-pointer pt-2 pb-4"
          onClick={toggleVoiceMode}
          style={{
            marginTop: "40px",
            transform: chatCollapsed ? "scale(1.8)" : "scale(1)",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Concentric audio visualizer rings — only visible in voice mode */}
          <AnimatePresence>
            {chatCollapsed && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={`audio-ring-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      border: `1px solid ${colorToRgba(orbColor, 0.4 - i * 0.06)}`,
                    }}
                    initial={{ width: 200, height: 200, opacity: 0 }}
                    animate={{
                      width: [200, 520 + i * 40],
                      height: [200, 520 + i * 40],
                      opacity: [0.7, 0],
                    }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "easeOut",
                    }}
                  />
                ))}
                {/* Extra outer glow when in voice mode */}
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 600,
                    height: 600,
                    background: `radial-gradient(circle, ${colorToRgba(orbColor, 0.12)} 0%, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </>
            )}
          </AnimatePresence>

          {/* GiantOrb — hideLabel in voice mode to prevent duplicate text */}
          <GiantOrb
            color={orbColor}
            engineName={orbName}
            active={orbStatus === "active" || orbStatus === "connected"}
            speaking={speaking}
            hideLabel={chatCollapsed}
          />
        </div>

        {/* Voice Mode text — shown below the orb when chat is collapsed.
            Rendered alongside the Chat Terminal but only visible when collapsed.
            Uses opacity + transform for smooth fade. */}
        <div
          className="flex flex-col items-center gap-3 overflow-hidden"
          style={{
            maxHeight: chatCollapsed ? "200px" : "0px",
            opacity: chatCollapsed ? 1 : 0,
            marginTop: chatCollapsed ? "1rem" : "0",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Engine name ONCE */}
          <div className={cn("text-sm font-light tracking-[0.25em] uppercase", `text-${orbColor}`)}>
            {orbName}
          </div>

          {/* Micro equalizer */}
          <div className="flex items-end gap-1 h-6">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <motion.div
                key={i}
                className={cn("w-1 rounded-full", `bg-${orbColor}`)}
                animate={{ height: [4, 22, 4] }}
                transition={{
                  duration: 0.5 + (i % 4) * 0.12,
                  repeat: Infinity,
                  delay: i * 0.06,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Listening status — changes based on mute state */}
          <div className={cn("text-sm font-light tracking-[0.15em]", voiceEnabled ? `text-${orbColor}` : "text-axiom-dim")}>
            {voiceEnabled ? "…Jarvis Listening…" : "🔇 Muted"}
          </div>

          {/* Shortcut helper */}
          <p className="text-[11px] text-axiom-dim mt-1">
            <kbd className="px-1.5 py-0.5 rounded bg-axiom-panel/60 border border-axiom-edge/40 text-[9px] font-mono">
              Space
            </kbd>{" "}
            to restore chat ·{" "}
            <button
              onClick={toggleVoiceMode}
              className="text-axiom-cyan hover:underline"
            >
              click orb
            </button>
          </p>
        </div>

        {/* Chat Terminal — uses CSS max-height + opacity transitions to
            smoothly collapse/expand without changing the orb's DOM position.
            When collapsed: max-height=0, opacity=0, margin=0 → orb centers.
            When expanded: max-height=100%, opacity=1 → chat fills space. */}
        <div
          className="w-full max-w-3xl overflow-hidden"
          style={{
            maxHeight: chatCollapsed ? "0px" : "100%",
            opacity: chatCollapsed ? 0 : 1,
            marginTop: chatCollapsed ? "0" : "0.5rem",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            flex: chatCollapsed ? "0 0 0%" : "1 1 0%",
          }}
        >
          {/* Inner chat terminal — visual styling (border, background, shadow) */}
          <div className="w-full h-full rounded-xl border border-axiom-edge/50 bg-axiom-deep/70 backdrop-blur-xl flex flex-col overflow-hidden min-h-0"
            style={{
              boxShadow:
                "0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
          {/* Chat header — engine switcher + model selector */}
          <div className="relative h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/80 gap-2">
            {/* Subtle gradient accent line at bottom of header */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-axiom-cyan/30 to-transparent" />
            <div className="flex items-center gap-2.5 min-w-0 shrink-0">
              {/* Connection status dot — pulses green when engine is active */}
              <span className="relative flex h-2 w-2">
                {(orbStatus === "active" || orbStatus === "connected") && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full animate-ping",
                      orbStatus === "active"
                        ? "bg-axiom-emerald/60"
                        : "bg-axiom-cyan/50",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative w-2 h-2 rounded-full",
                    orbStatus === "active"
                      ? "bg-axiom-emerald"
                      : orbStatus === "connected"
                        ? "bg-axiom-cyan"
                        : orbStatus === "standby"
                          ? "bg-axiom-amber"
                          : "bg-axiom-dim",
                  )}
                />
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-axiom-dim">
                Chat Terminal
              </span>
              <span className="text-[10px] text-axiom-dim/50 hidden sm:inline">
                · {messages.length} msg
              </span>
            </div>

            {/* Unified Terminal Dropdown — Category A (Engines) + Category B (LLM Families)
                + cascading Model dropdown. Both runtime engines AND enabled LLM
                families appear in the same selector; the Model dropdown
                dynamically populates from whichever item is active. */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TerminalSwitcher
                engines={engines}
                llmFamilies={llmFamilies}
                terminalMode={terminalMode}
                activeEngineId={activeEngineId}
                activeDirectLlmId={activeDirectLlmId}
                activeDisplayName={activeDisplayName}
                activeDisplayColor={activeDisplayColor}
                activeDisplayGlyph={activeDisplayGlyph}
                onSelectEngine={(id) => {
                  selectTerminalEngine(id);
                  setTerminalMenuOpen(false);
                }}
                onSelectLlm={(id) => {
                  selectTerminalLlm(id);
                  setTerminalMenuOpen(false);
                }}
                onSelectFamily={(id) => {
                  // LLM families are treated as engine-like — use the same
                  // cascade path so the Model dropdown populates correctly.
                  selectTerminalEngine(id);
                  setTerminalMenuOpen(false);
                }}
                open={terminalMenuOpen}
                setOpen={(v) => {
                  setTerminalMenuOpen(v);
                  if (v) setModelMenuOpen(false);
                }}
              />
              {/* Model dropdown — cascades from the active engine OR family */}
              {activeModels.length > 0 && (
                <ModelSwitcher
                  models={activeModels}
                  selectedModel={activeModel}
                  activeColor={activeDisplayColor}
                  onSelect={(modelName) => {
                    setActiveModel(modelName);
                    setModelMenuOpen(false);
                  }}
                  open={modelMenuOpen}
                  setOpen={(v) => {
                    setModelMenuOpen(v);
                    if (v) setTerminalMenuOpen(false);
                  }}
                />
              )}
              {/* Expand / Collapse chat terminal button */}
              <button
                onClick={() => setChatExpanded((e) => !e)}
                className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
                title={chatExpanded ? "Compact chat" : "Expand chat"}
              >
                {chatExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Message history */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3 min-h-0"
          >
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-axiom-dim/40" />
                  <p className="text-xs text-axiom-dim">
                    Connecting to {orbName}…
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isLastEngine = m.id === lastEngineMsgId;

                // ── System messages: centered with horizontal lines ──────
                if (m.role === "system") {
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 py-1"
                    >
                      <div className="flex-1 h-px bg-axiom-edge/30" />
                      <span className="text-xs italic text-axiom-dim whitespace-nowrap max-w-[80%] text-center leading-relaxed">
                        {m.content}
                      </span>
                      <div className="flex-1 h-px bg-axiom-edge/30" />
                    </motion.div>
                  );
                }

                // ── User & Engine messages with hover actions ────────────
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex group relative",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {/* Hover action buttons — fade in on hover */}
                    {!m.pending && (
                      <div
                        className={cn(
                          "absolute -top-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10",
                          m.role === "user" ? "left-2" : "right-2",
                        )}
                      >
                        <button
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-axiom-panel/90 backdrop-blur-sm border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
                          title="Copy message"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {m.role === "engine" && (
                          <button
                            onClick={() => send()}
                            className="w-6 h-6 rounded flex items-center justify-center bg-axiom-panel/90 backdrop-blur-sm border border-axiom-edge/40 text-axiom-dim hover:text-axiom-amber hover:border-axiom-amber/40 transition-colors"
                            title="Regenerate response"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (activeEngineId) {
                              setHistories((h) => ({
                                ...h,
                                [activeEngineId]: (h[activeEngineId] ?? []).filter(
                                  (msg) => msg.id !== m.id,
                                ),
                              }));
                            }
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center bg-axiom-panel/90 backdrop-blur-sm border border-axiom-edge/40 text-axiom-dim hover:text-axiom-rose hover:border-axiom-rose/40 transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm relative break-words overflow-hidden",
                        m.role === "user"
                          ? "bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-text"
                          : "bg-axiom-panel/40 border border-axiom-edge/30 text-axiom-text/90",
                      )}
                      style={
                        isLastEngine
                          ? {
                              boxShadow: `0 0 24px ${colorToRgba(orbColor, 0.08)}, 0 0 6px ${colorToRgba(orbColor, 0.05)}`,
                              overflowWrap: "anywhere",
                            }
                          : { overflowWrap: "anywhere" }
                      }
                    >
                      {/* Engine label + model badge pill */}
                      {m.role === "engine" && (
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
                          <span className={cn("text-base leading-none", `text-${orbColor}`)}>
                            {orbGlyph}
                          </span>
                          <span>{orbName}</span>
                          <span
                            className={cn(
                              "ml-1 px-1.5 py-0.5 rounded-full text-[9px] normal-case tracking-normal border",
                              `bg-${orbColor}/10 border-${orbColor}/20 text-${orbColor}/80`,
                            )}
                          >
                            {activeModel}
                          </span>
                        </div>
                      )}

                      {/* Content: typing indicator / rendered / plain */}
                      {m.pending ? (
                        <TypingIndicator color={orbColor} />
                      ) : m.role === "engine" ? (
                        <MessageContent text={m.content} />
                      ) : (
                        <span className="whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{m.content}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-axiom-edge/40 shrink-0 bg-axiom-deep/80">
            <div className="relative">
              {/* Pulsing border glow on focus */}
              <AnimatePresence>
                {inputFocused && (
                  <motion.div
                    className="absolute -inset-px rounded-lg pointer-events-none border"
                    style={{ borderColor: colorToRgba(orbColor, 0.3) }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>
              <div
                className="relative flex items-end gap-2 bg-axiom-panel/40 border border-axiom-edge/40 rounded-lg p-2 focus-within:border-axiom-cyan/50 focus-within:shadow-[0_0_12px_rgba(120,220,255,0.1)] transition-all duration-300"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              >
                <div className="relative flex-1">
                  <AutoGrowTextarea
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    placeholder={micListening ? "Listening… speak now" : `Message ${orbName}…  (⏎ to send · ⇧⏎ newline)`}
                    maxLines={chatExpanded ? 12 : 5}
                  />
                  {/* Character count — bottom-right of textarea */}
                  {input.length > 0 && (
                    <span className="absolute bottom-0 right-0 text-[9px] text-axiom-dim/40 tabular-nums pointer-events-none select-none">
                      {input.length}
                    </span>
                  )}
                </div>

                {/* Voice controls — Mic (Faster-Whisper STT) + Speaker (Kokoro TTS) */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Microphone — Faster-Whisper STT */}
                  <button
                    onClick={toggleMic}
                    className={cn(
                      "relative w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                      micListening
                        ? "bg-axiom-emerald/25 border-axiom-emerald/60 text-axiom-emerald axiom-glow-emerald"
                        : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-emerald hover:border-axiom-emerald/40",
                    )}
                    title={micListening ? "Stop listening (Faster-Whisper STT)" : "Start voice input (Faster-Whisper STT)"}
                  >
                    {micListening ? (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        {/* Pulsing rings when listening */}
                        <span className="absolute inset-0 rounded-md border border-axiom-emerald/40 axiom-pulse-ring" />
                      </>
                    ) : (
                      <MicOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Speaker — Kokoro TTS voice output toggle */}
                  <button
                    onClick={toggleVoice}
                    className={cn(
                      "relative w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                      voiceEnabled
                        ? "bg-axiom-violet/25 border-axiom-violet/60 text-axiom-violet"
                        : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40",
                    )}
                    title={voiceEnabled ? "Mute Jarvis voice (Kokoro TTS)" : "Enable Jarvis voice (Kokoro TTS)"}
                  >
                    {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    {/* Speaking indicator — small pulsing dot when TTS is active */}
                    {voiceEnabled && speaking && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-axiom-violet axiom-pulse-ring border border-axiom-deep" />
                    )}
                  </button>
                </div>

                {/* Send button — gradient that intensifies on hover */}
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center border transition-all duration-300 shrink-0",
                    busy || !input.trim()
                      ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim"
                      : `border-${orbColor}/50 text-${orbColor}`,
                  )}
                  style={
                    !busy && input.trim()
                      ? {
                          background: `linear-gradient(135deg, ${colorToRgba(orbColor, 0.2)}, ${colorToRgba(orbColor, 0.08)})`,
                        }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (!busy && input.trim()) {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${colorToRgba(orbColor, 0.25)}`;
                      (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${colorToRgba(orbColor, 0.3)}, ${colorToRgba(orbColor, 0.15)})`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    if (!busy && input.trim()) {
                      (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${colorToRgba(orbColor, 0.2)}, ${colorToRgba(orbColor, 0.08)})`;
                    }
                  }}
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-axiom-dim flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>⏎ send · ⇧⏎ newline</span>
                {micListening && (
                  <span className="flex items-center gap-1 text-axiom-emerald">
                    <span className="w-1 h-1 rounded-full bg-axiom-emerald axiom-pulse-ring" />
                    mic live
                  </span>
                )}
                {voiceEnabled && (
                  <span className="flex items-center gap-1 text-axiom-violet">
                    <span className="w-1 h-1 rounded-full bg-axiom-violet" />
                    voice on
                  </span>
                )}
              </span>
              <span className="text-axiom-dim/60">
                {orbLocation} · {orbStatus} · {activeModel}
              </span>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* ═══ Expanded Chat Overlay ═══
          A separate component that appears above the compact terminal + orb.
          Shares the same conversation state (messages, input, engine, etc).
          The compact terminal stays unchanged underneath — this overlay
          simply sits on top with z-30. */}
      <AnimatePresence>
        {chatExpanded && !chatCollapsed && (
          <ChatOverlay
            onClose={() => setChatExpanded(false)}
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={send}
            busy={busy}
            orbName={orbName}
            orbColor={orbColor}
            orbGlyph={orbGlyph}
            orbStatus={orbStatus}
            orbLocation={orbLocation}
            activeModel={activeModel}
            activeDisplayColor={activeDisplayColor}
            activeDisplayGlyph={activeDisplayGlyph}
            activeDisplayName={activeDisplayName}
            activeModels={activeModels}
            terminalMode={terminalMode}
            activeEngineId={activeEngineId}
            activeDirectLlmId={activeDirectLlmId}
            engines={engines}
            llmFamilies={llmFamilies}
            terminalMenuOpen={terminalMenuOpen}
            setTerminalMenuOpen={setTerminalMenuOpen}
            modelMenuOpen={modelMenuOpen}
            setModelMenuOpen={setModelMenuOpen}
            selectTerminalEngine={selectTerminalEngine}
            selectTerminalLlm={selectTerminalLlm}
            setActiveModel={setActiveModel}
            micListening={micListening}
            toggleMic={toggleMic}
            voiceEnabled={voiceEnabled}
            toggleVoice={toggleVoice}
            inputFocused={inputFocused}
            setInputFocused={setInputFocused}
            scrollRef={scrollRef}
            lastEngineMsgId={lastEngineMsgId}
            colorToRgba={colorToRgba}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ChatOverlay — the expanded chat workspace that appears above the Home.
//  Separate component sharing the same conversation state as the compact
//  terminal. Animates in with fade + scale (native dialog feel).
// ════════════════════════════════════════════════════════════════════════════

function ChatOverlay({
  onClose,
  messages,
  input,
  setInput,
  onSend,
  busy,
  orbName,
  orbColor,
  orbGlyph,
  orbStatus,
  orbLocation,
  activeModel,
  activeDisplayColor,
  activeDisplayGlyph,
  activeDisplayName,
  activeModels,
  terminalMode,
  activeEngineId,
  activeDirectLlmId,
  engines,
  llmFamilies,
  terminalMenuOpen,
  setTerminalMenuOpen,
  modelMenuOpen,
  setModelMenuOpen,
  selectTerminalEngine,
  selectTerminalLlm,
  setActiveModel,
  micListening,
  toggleMic,
  voiceEnabled,
  toggleVoice,
  inputFocused,
  setInputFocused,
  scrollRef,
  lastEngineMsgId,
  colorToRgba,
}: {
  onClose: () => void;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  orbName: string;
  orbColor: string;
  orbGlyph: string;
  orbStatus: string;
  orbLocation: string;
  activeModel: string;
  activeDisplayColor: string;
  activeDisplayGlyph: string;
  activeDisplayName: string;
  activeModels: string[];
  terminalMode: "engine" | "ambient";
  activeEngineId: string | null;
  activeDirectLlmId: string | null;
  engines: Engine[];
  llmFamilies: import("@/lib/axiom/types").LLMFamily[];
  terminalMenuOpen: boolean;
  setTerminalMenuOpen: (v: boolean) => void;
  modelMenuOpen: boolean;
  setModelMenuOpen: (v: boolean) => void;
  selectTerminalEngine: (id: string) => void;
  selectTerminalLlm: (id: string) => void;
  setActiveModel: (v: string) => void;
  micListening: boolean;
  toggleMic: () => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  inputFocused: boolean;
  setInputFocused: (v: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  lastEngineMsgId: string | null;
  colorToRgba: (color: string, alpha: number) => string;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: "rgba(10,12,22,0.4)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
    >
    <motion.div
      className="w-full max-w-5xl h-[80vh] rounded-xl border border-axiom-edge/50 bg-axiom-deep/70 backdrop-blur-md flex flex-col overflow-hidden mx-6"
      style={{ boxShadow: "0 24px 80px -16px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)" }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
    >
        {/* Header */}
        <div className="relative h-12 px-4 border-b border-axiom-edge/40 flex items-center justify-between shrink-0 bg-axiom-deep/80 gap-2">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-axiom-cyan/30 to-transparent" />
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <span className="relative flex h-2 w-2">
              {(orbStatus === "active" || orbStatus === "connected") && (
                <span className={cn("absolute inset-0 rounded-full animate-ping", orbStatus === "active" ? "bg-axiom-emerald/60" : "bg-axiom-cyan/50")} />
              )}
              <span className={cn("relative w-2 h-2 rounded-full",
                orbStatus === "active" ? "bg-axiom-emerald" :
                orbStatus === "connected" ? "bg-axiom-cyan" :
                orbStatus === "standby" ? "bg-axiom-amber" : "bg-axiom-dim",
              )} />
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-axiom-dim">Chat Terminal</span>
            <span className="text-[10px] text-axiom-dim/50 hidden sm:inline">· {messages.length} msg</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TerminalSwitcher
              engines={engines}
              llmFamilies={llmFamilies}
              terminalMode={terminalMode}
              activeEngineId={activeEngineId}
              activeDirectLlmId={activeDirectLlmId}
              activeDisplayName={activeDisplayName}
              activeDisplayColor={activeDisplayColor}
              activeDisplayGlyph={activeDisplayGlyph}
              onSelectEngine={(id) => { selectTerminalEngine(id); setTerminalMenuOpen(false); }}
              onSelectLlm={(id) => { selectTerminalLlm(id); setTerminalMenuOpen(false); }}
              onSelectFamily={(id) => { selectTerminalEngine(id); setTerminalMenuOpen(false); }}
              open={terminalMenuOpen}
              setOpen={(v) => { setTerminalMenuOpen(v); if (v) setModelMenuOpen(false); }}
            />
            {activeModels.length > 0 && (
              <ModelSwitcher
                models={activeModels}
                selectedModel={activeModel}
                activeColor={activeDisplayColor}
                onSelect={(modelName) => { setActiveModel(modelName); setModelMenuOpen(false); }}
                open={modelMenuOpen}
                setOpen={(v) => { setModelMenuOpen(v); if (v) setTerminalMenuOpen(false); }}
              />
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center border border-axiom-edge/40 text-axiom-dim hover:text-axiom-cyan hover:border-axiom-cyan/40 transition-colors"
              title="Compact chat"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Message history */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto axiom-scroll p-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-axiom-dim/40" />
                <p className="text-xs text-axiom-dim">Connecting to {orbName}…</p>
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const isLastEngine = m.id === lastEngineMsgId;
              if (m.role === "system") {
                return (
                  <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-axiom-edge/30" />
                    <span className="text-xs italic text-axiom-dim whitespace-nowrap max-w-[80%] text-center leading-relaxed">{m.content}</span>
                    <div className="flex-1 h-px bg-axiom-edge/30" />
                  </motion.div>
                );
              }
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex group relative", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm relative break-words overflow-hidden",
                    m.role === "user" ? "bg-axiom-cyan/10 border border-axiom-cyan/30 text-axiom-text" : "bg-axiom-panel/40 border border-axiom-edge/30 text-axiom-text/90")}
                    style={isLastEngine ? { boxShadow: `0 0 24px ${colorToRgba(orbColor, 0.08)}, 0 0 6px ${colorToRgba(orbColor, 0.05)}`, overflowWrap: "anywhere" } : { overflowWrap: "anywhere" }}>
                    {m.role === "engine" && (
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
                        <span className={cn("text-base leading-none", `text-${orbColor}`)}>{orbGlyph}</span>
                        <span>{orbName}</span>
                        <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[9px] normal-case tracking-normal border", `bg-${orbColor}/10 border-${orbColor}/20 text-${orbColor}/80`)}>{activeModel}</span>
                      </div>
                    )}
                    {m.pending ? <TypingIndicator color={orbColor} /> : m.role === "engine" ? <MessageContent text={m.content} /> : <span className="whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{m.content}</span>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="p-3 border-t border-axiom-edge/40 shrink-0 bg-axiom-deep/80">
          <div className="relative">
            <AnimatePresence>
              {inputFocused && (
                <motion.div className="absolute -inset-px rounded-lg pointer-events-none border" style={{ borderColor: colorToRgba(orbColor, 0.3) }}
                  initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.7, 0.3] }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
              )}
            </AnimatePresence>
            <div className="relative flex items-end gap-2 bg-axiom-panel/40 border border-axiom-edge/40 rounded-lg p-2 focus-within:border-axiom-cyan/50 focus-within:shadow-[0_0_12px_rgba(120,220,255,0.1)] transition-all duration-300"
              onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}>
              <div className="relative flex-1">
                <AutoGrowTextarea value={input} onChange={setInput} onSend={onSend}
                  placeholder={micListening ? "Listening… speak now" : `Message ${orbName}…  (⏎ to send · ⇧⏎ newline)`}
                  maxLines={12} />
                {input.length > 0 && (
                  <span className="absolute bottom-0 right-0 text-[9px] text-axiom-dim/40 tabular-nums pointer-events-none select-none">{input.length}</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={toggleMic}
                  className={cn("relative w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                    micListening ? "bg-axiom-emerald/25 border-axiom-emerald/60 text-axiom-emerald axiom-glow-emerald" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-emerald hover:border-axiom-emerald/40")}
                  title={micListening ? "Stop listening (Faster-Whisper STT)" : "Start voice input (Faster-Whisper STT)"}>
                  {micListening ? (<><Mic className="w-3.5 h-3.5" /><span className="absolute inset-0 rounded-md border border-axiom-emerald/40 axiom-pulse-ring" /></>) : <MicOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={toggleVoice}
                  className={cn("relative w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                    voiceEnabled ? "bg-axiom-violet/25 border-axiom-violet/60 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40")}
                  title={voiceEnabled ? "Disable Jarvis voice (Kokoro TTS)" : "Enable Jarvis voice (Kokoro TTS)"}>
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button onClick={onSend} disabled={busy || !input.trim()}
                  className={cn("w-8 h-8 rounded-md flex items-center justify-center border transition-all",
                    busy || !input.trim() ? "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim cursor-not-allowed opacity-50" : cn("bg-axiom-cyan/20 border-axiom-cyan/50 text-axiom-cyan hover:bg-axiom-cyan/30 cursor-pointer"))}
                  title="Send message (⏎)">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-axiom-dim flex items-center justify-between">
              <span>{orbLocation} · {orbStatus} · {activeModel}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Giant Central AI Orb ────────────────────────────────────────────────────
// A large (180px+) layered animated orb representing the core AI identity.
// Multiple rotating rings, pulsing core, scan line, orbital satellites.
// Color follows the active engine.

function GiantOrb({
  color,
  engineName,
  active,
  speaking,
  hideLabel,
}: {
  color: string;
  engineName?: string;
  active: boolean;
  speaking?: boolean;
  hideLabel?: boolean;
}) {
  const rgb = colorToRgb(color);
  return (
    <div className="relative w-[180px] h-[180px] flex items-center justify-center">
      {/* Outer ambient halo — large soft glow. Faster + brighter when speaking */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 260,
          height: 260,
          background: `radial-gradient(circle, rgba(${rgb},${speaking ? 0.45 : 0.28}) 0%, rgba(${rgb},${speaking ? 0.15 : 0.08}) 40%, transparent 70%)`,
        }}
        animate={{
          scale: speaking ? [1, 1.2, 1] : [1, 1.12, 1],
          opacity: speaking ? [0.7, 1, 0.7] : [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: speaking ? 1.2 : 3.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Outermost ring — 180px, slow clockwise rotation, 1 satellite. Faster when speaking */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 180,
          height: 180,
          borderColor: `rgba(${rgb},${speaking ? 0.7 : 0.45})`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: speaking ? 10 : 28, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{
            background: `rgb(${rgb})`,
            boxShadow: `0 0 ${speaking ? 20 : 12}px rgba(${rgb},0.9)`,
          }}
        />
      </motion.div>

      {/* Second ring — 150px, counter-rotating, dashed, 1 satellite. Faster when speaking */}
      <motion.div
        className="absolute rounded-full border-dashed border"
        style={{
          width: 150,
          height: 150,
          borderColor: `rgba(${rgb},${speaking ? 0.55 : 0.35})`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: speaking ? 7 : 22, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: `rgb(${rgb})`,
            boxShadow: `0 0 ${speaking ? 14 : 8}px rgba(${rgb},0.8)`,
          }}
        />
      </motion.div>

      {/* Third ring — 118px, clockwise, 2 satellites. Faster when speaking */}
      <motion.div
        className="absolute rounded-full border"
        style={{
          width: 118,
          height: 118,
          borderColor: `rgba(${rgb},${speaking ? 0.7 : 0.5})`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: speaking ? 5 : 16, repeat: Infinity, ease: "linear" }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: `rgb(${rgb})`,
            boxShadow: `0 0 ${speaking ? 14 : 8}px rgba(${rgb},0.8)`,
          }}
        />
        <div
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: `rgb(${rgb})`,
            boxShadow: `0 0 ${speaking ? 14 : 8}px rgba(${rgb},0.8)`,
          }}
        />
      </motion.div>

      {/* Inner ring — 88px, fast counter-rotation. Even faster when speaking */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: 88,
          height: 88,
          borderColor: `rgba(${rgb},${speaking ? 0.85 : 0.6})`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: speaking ? 3 : 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Core — pulsing radial gradient. Faster + bigger pulse when speaking */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 64,
          height: 64,
          background: `radial-gradient(circle, rgba(${rgb},${speaking ? 1 : 0.95}) 0%, rgba(${rgb},${speaking ? 0.65 : 0.5}) 55%, rgba(${rgb},0.1) 100%)`,
          boxShadow: `0 0 ${speaking ? 48 : 32}px rgba(${rgb},${speaking ? 0.9 : 0.7}), 0 0 ${speaking ? 96 : 64}px rgba(${rgb},0.4), inset 0 0 16px rgba(${rgb},0.5)`,
        }}
        animate={{
          scale: speaking ? [1, 1.15, 1] : [1, 1.08, 1],
          opacity: speaking ? [0.85, 1, 0.85] : [0.92, 1, 0.92],
        }}
        transition={{
          duration: speaking ? 0.8 : 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner geometric mark — hexagon outline */}
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-axiom-void/85">
          <path
            d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.9"
          />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </motion.div>

      {/* Vertical scan line sweeping across the orb. Faster when speaking */}
      <motion.div
        className="absolute rounded-full pointer-events-none overflow-hidden"
        style={{ width: 180, height: 180 }}
        animate={{ y: [-90, 90, -90] }}
        transition={{
          duration: speaking ? 1.5 : 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${rgb},${speaking ? 1 : 0.8}), transparent)`,
            boxShadow: `0 0 ${speaking ? 14 : 8}px rgba(${rgb},0.6)`,
          }}
        />
      </motion.div>

      {/* ── Speaking wave effect ────────────────────────────────────────── */}
      {/* Concentric expanding rings emitted from the core when the voice engine
          is generating speech. Mimics a sound-wave ripple. */}
      <AnimatePresence>
        {speaking && (
          <>
            {[0, 0.4, 0.8].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{ border: `1.5px solid rgba(${rgb},0.6)` }}
                initial={{ width: 64, height: 64, opacity: 0.8 }}
                animate={{
                  width: [64, 240],
                  height: [64, 240],
                  opacity: [0.8, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  delay,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Engine name label below the orb. Hidden in voice mode (hideLabel) to prevent duplication. */}
      {!hideLabel && (
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5">
        <span
          className="text-[9px] uppercase tracking-[0.3em] font-medium"
          style={{ color: `rgb(${rgb})` }}
        >
          {engineName ?? "Axiom Core"}
        </span>
        {speaking && (
          <span
            className="text-[8px] uppercase tracking-[0.2em] px-1 py-0.5 rounded"
            style={{
              color: `rgb(${rgb})`,
              background: `rgba(${rgb},0.15)`,
              border: `1px solid rgba(${rgb},0.4)`,
            }}
          >
            ♪ speaking
          </span>
        )}
      </div>
      )}

      {/* Active state burst — extra rotating accents when engine is active */}
      {active && (
        <motion.div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: 200,
            height: 200,
            borderColor: `rgba(${rgb},0.2)`,
            borderWidth: 1,
          }}
          animate={{ rotate: 360, scale: [1, 1.04, 1] }}
          transition={{
            rotate: { duration: 40, repeat: Infinity, ease: "linear" },
            scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      )}
    </div>
  );
}

// ── Unified Terminal Switcher dropdown ─────────────────────────────────────
//  Single dropdown footprint containing two clearly separated sub-categories:
//    CATEGORY A: [ENGINES] — Development & Automation Environments
//    CATEGORY B: [LLM PROVIDERS] — Enabled LLM Registry families
//  Both runtime engines AND enabled LLM families appear in the same selector.
//  Selecting Category A → "Development Engine Mode".
//  Selecting Category B → the family is treated as an engine-like option,
//  and its models populate the cascading Model dropdown.

function TerminalSwitcher({
  engines,
  llmFamilies,
  terminalMode,
  activeEngineId,
  activeDirectLlmId,
  activeDisplayName,
  activeDisplayColor,
  activeDisplayGlyph,
  onSelectEngine,
  onSelectLlm,
  onSelectFamily,
  open,
  setOpen,
}: {
  engines: Engine[];
  llmFamilies: import("@/lib/axiom/types").LLMFamily[];
  terminalMode: "engine" | "ambient";
  activeEngineId: string | null;
  activeDirectLlmId: string | null;
  activeDisplayName: string;
  activeDisplayColor: string;
  activeDisplayGlyph: string;
  onSelectEngine: (id: string) => void;
  onSelectLlm: (id: string) => void;
  onSelectFamily: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  // Transform enabled LLM families into engine-like display items.
  const enabledFamilies = llmFamilies.filter((f) => f.enabled);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors",
          open
            ? `bg-${activeDisplayColor}/15 border-${activeDisplayColor}/50 text-${activeDisplayColor}`
            : "bg-axiom-panel/60 border-axiom-edge/40 text-axiom-text hover:border-axiom-cyan/40",
        )}
      >
        {/* Color dot token — reflects the active item's brand color */}
        <span className={cn("w-2 h-2 rounded-full shrink-0", `bg-${activeDisplayColor}`)} />
        <span className={cn("text-sm leading-none", `text-${activeDisplayColor}`)}>
          {activeDisplayGlyph}
        </span>
        <span className="font-medium max-w-[110px] truncate">{activeDisplayName}</span>
        {/* Mode badge — shows which mode the terminal is in */}
        <span
          className={cn(
            "text-[8px] uppercase tracking-wider px-1 py-0.5 rounded shrink-0 hidden sm:inline",
            terminalMode === "engine"
              ? "bg-axiom-emerald/15 text-axiom-emerald"
              : "bg-axiom-cyan/15 text-axiom-cyan",
          )}
        >
          {terminalMode === "engine" ? "ENGINE" : "AMBIENT"}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute top-full right-0 mt-1.5 w-72 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl z-40 overflow-hidden"
            >
              <div className="p-1.5 max-h-[28rem] overflow-y-auto axiom-scroll">
                {/* ═══ CATEGORY A: ENGINES ═══ */}
                <div className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-emerald/80 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-axiom-emerald" />
                  Engines
                  <span className="text-axiom-dim/50 normal-case tracking-normal ml-1">Development & Automation</span>
                </div>
                {engines.filter((e) => e.enabled).map((e) => {
                  const isActive = terminalMode === "engine" && e.id === activeEngineId;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectEngine(e.id)}
                      className={cn(
                        "w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-colors group",
                        isActive ? `bg-${e.color}/10` : "hover:bg-axiom-panel/60",
                      )}
                    >
                      <div
                        className={cn(
                          "relative w-8 h-8 rounded-md flex items-center justify-center text-base border shrink-0",
                          `text-${e.color} border-${e.color}/30 bg-${e.color}/10`,
                        )}
                      >
                        {e.glyph}
                        <span
                          className={cn(
                            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-axiom-deep",
                            `bg-${e.color}`,
                            e.status === "active" && "axiom-pulse-ring",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-axiom-text truncate">
                            {e.name}
                          </span>
                          {isActive && (
                            <Check className={cn("w-3 h-3 shrink-0", `text-${e.color}`)} />
                          )}
                        </div>
                        <div className="text-[10px] text-axiom-dim leading-snug">
                          {e.type}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Divider between categories */}
                {enabledFamilies.length > 0 && (
                  <div className="my-2 border-t border-axiom-edge/30" />
                )}

                {/* ═══ CATEGORY B: LLM PROVIDERS ═══ */}
                {enabledFamilies.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-cyan/80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-axiom-cyan" />
                      LLM Providers
                      <span className="text-axiom-dim/50 normal-case tracking-normal ml-1">Direct Model Access</span>
                    </div>
                    {enabledFamilies.map((f) => {
                      // Transform the LLM family into an engine-like option.
                      const isActive = terminalMode === "engine" && f.id === activeEngineId;
                      const status = f.apiKey ? "connected" : "standby";
                      return (
                        <button
                          key={f.id}
                          onClick={() => onSelectFamily(f.id)}
                          className={cn(
                            "w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-colors group",
                            isActive ? `bg-${f.color}/10` : "hover:bg-axiom-panel/60",
                          )}
                        >
                          <div
                            className={cn(
                              "relative w-8 h-8 rounded-md flex items-center justify-center text-base border shrink-0",
                              `text-${f.color} border-${f.color}/30 bg-${f.color}/10`,
                            )}
                          >
                            {f.glyph}
                            {/* LLM Providers do NOT show status dots — only
                                Runtime Engines have dots. This maintains
                                visual consistency with the LLM Registry page
                                where families have no status indicators. */}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-axiom-text truncate">
                                {f.name}
                              </span>
                              {isActive && (
                                <Check className={cn("w-3 h-3 shrink-0", `text-${f.color}`)} />
                              )}
                            </div>
                            <div className="text-[10px] text-axiom-dim leading-snug">
                              {f.tagline}
                            </div>
                            <div className="text-[9px] text-axiom-dim/60 mt-0.5 flex items-center gap-1.5">
                              <span className="capitalize">{status}</span>
                              <span>·</span>
                              <span>API</span>
                              <span>·</span>
                              <span>{f.models.filter((m) => m.enabled).length} models</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Model Switcher dropdown ─────────────────────────────────────────────────
//  Cascading model dropdown — populates from the active engine's OR LLM
//  family's model list. Works identically for both Category A (engines) and
//  Category B (LLM families) since both resolve to a string[] of model names.

function ModelSwitcher({
  models,
  selectedModel,
  activeColor,
  onSelect,
  open,
  setOpen,
}: {
  models: string[];
  selectedModel: string;
  activeColor: string;
  onSelect: (modelName: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors",
          open
            ? `bg-${activeColor}/15 border-${activeColor}/50 text-${activeColor}`
            : "bg-axiom-panel/60 border-axiom-edge/40 text-axiom-text hover:border-axiom-cyan/40",
        )}
      >
        <span className="text-[9px] uppercase tracking-wider text-axiom-dim hidden sm:inline">
          Model
        </span>
        <span className="font-mono text-[11px] max-w-[120px] truncate">
          {selectedModel}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute top-full right-0 mt-1.5 w-60 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl z-40 overflow-hidden"
            >
              <div className="p-1.5">
                <div className="px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-axiom-dim/70">
                  Select model
                </div>
                {models.map((m) => {
                  const isActive = m === selectedModel;
                  return (
                    <button
                      key={m}
                      onClick={() => onSelect(m)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                        isActive ? `bg-${activeColor}/10` : "hover:bg-axiom-panel/60",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          isActive ? `bg-${activeColor}` : "bg-axiom-dim/40",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 text-xs font-mono truncate",
                          isActive ? `text-${activeColor}` : "text-axiom-text",
                        )}
                      >
                        {m}
                      </span>
                      {isActive && <Check className={cn("w-3 h-3 shrink-0", `text-${activeColor}`)} />}
                    </button>
                  );
                })}
                {models.length === 0 && (
                  <div className="px-2 py-3 text-[11px] text-axiom-dim italic text-center">
                    No models available
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


// ── Compact status pill (header) ────────────────────────────────────────────


function StatusPill({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: typeof Cpu;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-axiom-panel/40 border border-axiom-edge/40">
      <Icon className={cn("w-2.5 h-2.5", `text-${color}`)} />
      <span className="text-[9px] uppercase tracking-wider text-axiom-dim">{label}</span>
      <span className="text-[10px] text-axiom-text font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ── Tiny markdown renderer (code + bold) ────────────────────────────────────

function MessageContent({ text }: { text: string }) {
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", content: text.slice(last, m.index) });
    }
    parts.push({ type: "code", lang: m[1], content: m[2] });
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push({ type: "text", content: text.slice(last) });
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
          <p key={`p${out.length}`} className="text-sm leading-relaxed break-words" style={{ overflowWrap: "anywhere" }}>
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
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`/g;
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

// ── Typing indicator — 3 bouncing dots ──────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full", `bg-${color}`)}
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function colorToRgb(color: string): string {
  switch (color) {
    case "axiom-cyan":
      return "120,220,255";
    case "axiom-emerald":
      return "80,220,180";
    case "axiom-amber":
      return "255,200,90";
    case "axiom-violet":
      return "180,130,255";
    case "axiom-rose":
      return "255,130,140";
    case "axiom-dim":
      return "160,170,200";
    default:
      return "120,220,255";
  }
}

function colorToRgba(color: string, alpha: number): string {
  return `rgba(${colorToRgb(color)}, ${alpha})`;
}

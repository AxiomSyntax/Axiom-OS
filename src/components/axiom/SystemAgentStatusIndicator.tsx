"use client";

import { useAxiom } from "@/lib/axiom/store";
import { SYSTEM_AGENT_STATUS_LABELS } from "@/lib/axiom/types";
import { motion, AnimatePresence } from "framer-motion";

// ════════════════════════════════════════════════════════════════════════════
//  SystemAgentStatusIndicator — shows "Axiom / System Architect / Working…"
//  whenever the permanent System Agent is performing system-level operations.
//  Renders as a subtle floating indicator in the bottom-right corner.
//
//  Uses the dedicated Axiom geometric glyph (◬ — upward triangle with
//  centered dot) to visually distinguish the System Architect from normal
//  agents. This is NOT a Lucide icon — it's the same geometric symbol family
//  used throughout Axiom OS (⬡ ◎ ⌬ ✶ ▲ ◈ ◬).
// ════════════════════════════════════════════════════════════════════════════

export default function SystemAgentStatusIndicator() {
  const systemAgentStatus = useAxiom((s) => s.systemAgentStatus);

  const isWorking = systemAgentStatus !== "idle";

  return (
    <AnimatePresence>
      {isWorking && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-[500] pointer-events-none"
        >
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-axiom-cyan/30 bg-axiom-deep/95 backdrop-blur-md shadow-xl">
            {/* Icon — dedicated Axiom geometric glyph */}
            <div className="relative w-7 h-7 rounded-md flex items-center justify-center border border-axiom-cyan/40 bg-axiom-cyan/10 text-axiom-cyan shrink-0 shadow-[0_0_10px_-2px_rgba(120,220,255,0.3)]">
              <span className="text-base leading-none">◬</span>
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-md border border-axiom-cyan/40 animate-ping" style={{ animationDuration: "1.5s" }} />
            </div>
            {/* Text */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-axiom-text">Axiom</span>
                <span className="text-[9px] text-axiom-dim uppercase tracking-[0.15em]">System Architect</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-axiom-cyan animate-pulse" />
                <span className="text-[10px] text-axiom-cyan">
                  {SYSTEM_AGENT_STATUS_LABELS[systemAgentStatus]}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

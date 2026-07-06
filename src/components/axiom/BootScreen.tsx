"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";

const BOOT_LINES = [
  "[ 0.000 ] axiom kernel: loading graph-universe memory……… ok",
  "[ 0.142 ] axiom memory: 12 nodes, 12 edges indexed",
  "[ 0.287 ] axiom agents: 5 personas online (Oracle, Forge, Scribe, Warden, Echo)",
  "[ 0.418 ] axiom vibecode: devlab sandbox ready",
  "[ 0.553 ] axiom net: integration bus bound to /api/axiom/*",
  "[ 0.690 ] axiom ui: workspace shell ready",
  "[ 0.824 ] axiom os: boot complete. landing on Home.",
];

export default function BootScreen() {
  const finishBoot = useAxiom((s) => s.finishBoot);
  const hydrateFromStorage = useAxiom((s) => s.hydrateFromStorage);
  const [shown, setShown] = useState<number>(0);
  const [done, setDone] = useState(false);

  // ── Hydrate the store from the Workspace Storage Service on boot ──
  // Loads workflowProjects, devlabWorkspaces, brain graph/folders from storage.
  // Falls back to seed data if storage is empty (first boot). Runs once.
  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (shown >= BOOT_LINES.length) {
      const t = setTimeout(() => setDone(true), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), 220 + Math.random() * 180);
    return () => clearTimeout(t);
  }, [shown]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => finishBoot(), 760);
    return () => clearTimeout(t);
  }, [done, finishBoot]);

  return (
    <AnimatePresence>
      <motion.div
        key="boot"
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
      >
        {/* animated grid + scanline */}
        <div className="absolute inset-0 axiom-grid-bg opacity-40" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-axiom-cyan/60 to-transparent axiom-scan" />
        </div>

        <div className="relative w-full max-w-2xl px-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute inset-0 axiom-pulse-ring rounded-full border border-axiom-cyan/40" />
              <div className="relative w-24 h-24 rounded-full border border-axiom-cyan/50 flex items-center justify-center axiom-glow-cyan">
                <svg viewBox="0 0 64 64" className="w-12 h-12">
                  <circle cx="32" cy="32" r="4" fill="rgb(120,220,255)" />
                  <circle
                    cx="32"
                    cy="32"
                    r="14"
                    fill="none"
                    stroke="rgb(120,220,255)"
                    strokeWidth="1.5"
                    opacity="0.9"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    fill="none"
                    stroke="rgb(120,220,255)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  <circle cx="32" cy="18" r="2" fill="rgb(80,220,180)" />
                  <circle cx="46" cy="32" r="2" fill="rgb(255,200,90)" />
                  <circle cx="32" cy="46" r="2" fill="rgb(180,130,255)" />
                  <circle cx="18" cy="32" r="2" fill="rgb(255,130,140)" />
                </svg>
              </div>
            </motion.div>

            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-6 text-4xl font-light tracking-[0.3em] axiom-text-glow"
            >
              AXIOM <span className="text-axiom-cyan">OS</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-2 text-xs uppercase tracking-[0.4em] text-axiom-dim"
            >
              agentic operating system
            </motion.p>
          </div>

          {/* Boot log */}
          <div className="font-mono text-[11px] text-axiom-dim space-y-1 min-h-[140px]">
            {BOOT_LINES.slice(0, shown).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex"
              >
                <span className="text-axiom-cyan/70">{line.split(":")[0]}:</span>
                <span className="ml-2">{line.split(":").slice(1).join(":")}</span>
              </motion.div>
            ))}
            {shown < BOOT_LINES.length && (
              <div className="text-axiom-cyan">
                <span className="axiom-blink">▋</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-8 h-1 bg-axiom-edge/40 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-axiom-cyan/30 via-axiom-cyan to-axiom-emerald"
              initial={{ width: "0%" }}
              animate={{ width: `${(shown / BOOT_LINES.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
            <div className="absolute inset-0 overflow-hidden">
              <div className="axiom-boot-bar h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-axiom-dim">
            {done ? "entering desktop" : "booting…"}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

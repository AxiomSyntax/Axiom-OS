"use client";

import { motion } from "framer-motion";
import { useAxiom } from "@/lib/axiom/store";
import { useMemo } from "react";

// Animated background: faint grid + drifting "stars" + rotating universe ring.
export function BackgroundLayer() {
  const agentStatus = useAxiom((s) => s.agentStatus);

  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.6 + 0.4,
        d: Math.random() * 6 + 3,
        delay: Math.random() * 5,
      })),
    [],
  );

  const activeAgentCount = Object.values(agentStatus).filter(
    (s) => s === "thinking" || s === "executing",
  ).length;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* radial gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(28,32,60,0.6) 0%, rgba(10,12,22,0.95) 70%)",
        }}
      />

      {/* grid */}
      <div className="absolute inset-0 axiom-grid-bg opacity-30" />

      {/* stars */}
      {stars.map((st, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1] }}
          transition={{
            duration: st.d,
            repeat: Infinity,
            delay: st.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* central rotating rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] opacity-40">
        <motion.div
          className="absolute inset-0 rounded-full border border-axiom-cyan/15"
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-axiom-cyan/80" />
        </motion.div>
        <motion.div
          className="absolute inset-8 rounded-full border border-axiom-emerald/15"
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-axiom-emerald/80" />
        </motion.div>
        <motion.div
          className="absolute inset-16 rounded-full border border-axiom-amber/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-axiom-amber/80" />
        </motion.div>
      </div>

      {/* telemetry ring pulse */}
      {activeAgentCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] rounded-full"
          style={{
            boxShadow: "0 0 80px 10px rgba(120,220,255,0.08) inset",
          }}
        />
      )}
    </div>
  );
}

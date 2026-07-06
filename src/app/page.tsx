"use client";

import { useAxiom } from "@/lib/axiom/store";
import BootScreen from "@/components/axiom/BootScreen";
import AppShell from "@/components/axiom/AppShell";

export default function Page() {
  const bootPhase = useAxiom((s) => s.bootPhase);
  return bootPhase === "booting" ? <BootScreen /> : <AppShell />;
}

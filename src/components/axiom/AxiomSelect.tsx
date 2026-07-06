"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AxiomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AxiomSelect({
  value,
  onChange,
  options,
  size = "md",
  className,
}: AxiomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const sizeClasses = {
    sm: "h-6 text-[10px] px-1.5",
    md: "h-8 text-xs px-2",
    lg: "h-10 text-sm px-3",
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between gap-1 rounded border border-axiom-edge/50 bg-axiom-panel/60 text-axiom-text hover:border-axiom-cyan/40 transition-colors focus:outline-none",
          sizeClasses[size],
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown className="w-3 h-3 text-axiom-dim shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[140px] bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl py-1 max-h-48 overflow-y-auto axiom-scroll">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs transition-colors",
                o.value === value
                  ? "bg-axiom-cyan/15 text-axiom-cyan"
                  : "text-axiom-text/80 hover:bg-axiom-cyan/10 hover:text-axiom-text",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
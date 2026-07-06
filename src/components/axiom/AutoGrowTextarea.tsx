"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Auto-growing textarea — grows from 1 line up to 5 lines, then shows a scrollbar.
// The parent flex container must use `items-end` so the send button stays aligned.

export function AutoGrowTextarea({
  value,
  onChange,
  onSend,
  placeholder,
  className,
  minHeight = 24,
  maxLines = 5,
  lineHeight = 20,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
  className?: string;
  minHeight?: number;
  maxLines?: number;
  lineHeight?: number;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    // Reset height to auto so scrollHeight measures correctly
    ta.style.height = "auto";
    // When empty, use minHeight (don't let long placeholders inflate the height)
    if (!value) {
      ta.style.height = `${minHeight}px`;
      return;
    }
    const maxHeight = lineHeight * maxLines + 12;
    const newHeight = Math.min(ta.scrollHeight, maxHeight);
    ta.style.height = `${Math.max(newHeight, minHeight)}px`;
  }, [value, lineHeight, maxLines, minHeight]);

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      }}
      rows={1}
      placeholder={placeholder}
      spellCheck={false}
      className={cn(
        "w-full bg-transparent text-sm text-axiom-text placeholder:text-axiom-dim/60 focus:outline-none resize-none overflow-y-auto axiom-scroll transition-[height] duration-100",
        className,
      )}
      style={{
        minHeight,
        maxHeight: lineHeight * maxLines + 12,
        lineHeight: `${lineHeight}px`,
      }}
    />
  );
}

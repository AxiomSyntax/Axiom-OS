"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
//  RenameableText — the single OS-wide inline rename component.
//
//  Every archive in Axiom uses this exact same rename behavior:
//    • Chat Archive sessions
//    • Project folders (Home / Agent Hub / DevLab / Workflows)
//    • DevLab workspaces (Core Extension + App Development)
//    • Integration configurations
//    • Workflow projects + folders
//    • Future archive-based modules
//
//  Interaction:
//    • Double-click the text → enter edit mode
//    • Right-click the text → context menu with "Rename"
//    • Enter   = Save
//    • Escape  = Cancel
//    • Click outside (blur) = Save
//    • Empty save is rejected (reverts to original)
//
//  Props:
//    value         — current text
//    onSave        — callback with the new value (only called if changed + non-empty)
//    className     — class for the wrapper span (display mode)
//    inputClassName — class for the input (edit mode)
//    emptyTitle    — fallback shown when value is empty in display mode
//    title         — tooltip text
//    editOnSingleClick — when true, single-click enters edit mode (default: false = double-click)
//                       (use this for elements where double-click would be confusing,
//                        e.g. inside list items where single-click already opens)
// ════════════════════════════════════════════════════════════════════════════

export function RenameableText({
  value,
  onSave,
  className,
  inputClassName,
  emptyTitle = "Untitled",
  title = "Double-click or right-click to rename",
  editOnSingleClick = false,
}: {
  value: string;
  /** Save callback. If omitted, the text is not renameable (read-only). */
  onSave?: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
  emptyTitle?: string;
  title?: string;
  editOnSingleClick?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // draft + sourceValue: when not editing, draft tracks `value`. We store the
  // source value the draft was derived from so we can detect external changes
  // and re-sync without using refs or effects.
  const [draft, setDraft] = useState(value);
  const [sourceValue, setSourceValue] = useState(value);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // If the external value changed since we last synced, re-derive draft.
  // This is the React-recommended pattern for "reset state when a prop
  // changes" without using useEffect (which causes cascading renders).
  if (!editing && sourceValue !== value) {
    setSourceValue(value);
    setDraft(value);
  }

  // Focus + select all when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const startEdit = useCallback(() => {
    if (!onSave) return; // read-only mode — no rename
    setSourceValue(value);
    setDraft(value);
    setShowMenu(false);
    setEditing(true);
  }, [value, onSave]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value && onSave) {
      onSave(trimmed);
    }
    setEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  // ── Edit mode ──
  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-axiom-void/80 border border-axiom-cyan/40 rounded px-1.5 py-0.5 text-xs text-axiom-text focus:outline-none focus:border-axiom-cyan/60 focus:ring-1 focus:ring-axiom-cyan/30 transition-colors",
          inputClassName,
        )}
      />
    );
  }

  // ── Display mode (with double-click + right-click handlers) ──
  // When onSave is omitted, the text is read-only (no rename interaction).
  const renameable = !!onSave;
  return (
    <span
      ref={wrapperRef}
      className={cn(
        "renameable-text relative inline-flex items-center group/rename",
        renameable && "cursor-text",
        className,
      )}
      title={renameable ? title : undefined}
      onClick={renameable && editOnSingleClick ? (e) => { e.stopPropagation(); startEdit(); } : undefined}
      onDoubleClick={renameable ? (e) => { e.stopPropagation(); startEdit(); } : undefined}
      onContextMenu={renameable ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(true);
      } : undefined}
    >
      <span className={cn("truncate", !value && "text-axiom-dim/50 italic")}>
        {value || emptyTitle}
      </span>

      {/* Subtle pencil hint on hover (only when renameable) */}
      {renameable && (
        <Pencil
          className="w-2.5 h-2.5 ml-1 text-axiom-dim/0 group-hover/rename:text-axiom-dim/50 transition-colors shrink-0"
          aria-hidden
        />
      )}

      {/* Right-click context menu (only when renameable) */}
      {renameable && showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 z-50 w-28 bg-axiom-panel/95 backdrop-blur-xl border border-axiom-edge/50 rounded-lg shadow-2xl py-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-axiom-text hover:bg-axiom-cyan/10 transition-colors text-left"
          >
            <Pencil className="w-3 h-3" /> Rename
          </button>
        </div>
      )}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Legacy InlineRename export — kept for back-compat.
//  Internally delegates to RenameableText with editOnSingleClick=true
//  so any existing caller that expected single-click-to-edit still works.
// ════════════════════════════════════════════════════════════════════════════

export function InlineRename(props: {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  title?: string;
}) {
  return (
    <RenameableText
      value={props.value}
      onSave={props.onSave}
      className={props.className ?? props.displayClassName}
      inputClassName={props.inputClassName}
      title={props.title ?? "Click to rename"}
      editOnSingleClick
    />
  );
}

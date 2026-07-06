"use client";

import { useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LivePreviewEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onWikiLinkClick?: (noteName: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML / Markdown utilities
// ─────────────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SYNTAX_DIM = '<span class="md-syntax-dim">';
const SYNTAX_END = "</span>";

function inlineFormat(text: string): string {
  if (!text) return "";
  let html = esc(text);
  const codes: string[] = [];
  const wikis: string[] = [];

  html = html.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `${SYNTAX_DIM}\`${SYNTAX_END}\x00C${codes.length - 1}\x00${SYNTAX_DIM}\`${SYNTAX_END}`;
  });
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, w) => {
    wikis.push(w);
    return `${SYNTAX_DIM}[[${SYNTAX_END}\x00W${wikis.length - 1}\x00${SYNTAX_DIM}]]${SYNTAX_END}`;
  });
  html = html.replace(/\*\*([^*]+?)\*\*/g, `${SYNTAX_DIM}**${SYNTAX_END}<strong class="md-bold">$1</strong>${SYNTAX_DIM}**${SYNTAX_END}`);
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, `${SYNTAX_DIM}*${SYNTAX_END}<em class="md-italic">$1</em>${SYNTAX_DIM}*${SYNTAX_END}`);
  html = html.replace(/(?<![A-Za-z0-9])_([^_]+?)_(?![A-Za-z0-9])/g, `${SYNTAX_DIM}_${SYNTAX_END}<em class="md-italic">$1</em>${SYNTAX_DIM}_${SYNTAX_END}`);
  html = html.replace(/~~([^~]+?)~~/g, `${SYNTAX_DIM}~~${SYNTAX_END}<del class="md-strike">$1</del>${SYNTAX_DIM}~~${SYNTAX_END}`);
  html = html.replace(/\x00W(\d+)\x00/g, (_, i) => `<span class="wiki-link" data-note="${esc(wikis[+i])}">${esc(wikis[+i])}</span>`);
  html = html.replace(/\x00C(\d+)\x00/g, (_, i) => `<code class="md-code">${esc(codes[+i])}</code>`);
  return html;
}

function blockRender(line: string): string {
  if (!line) return '<div class="line-block line-empty"><br/></div>';
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return `<div class="line-block line-hr">${SYNTAX_DIM}${esc(line)}${SYNTAX_END}</div>`;
  const h = /^(#{1,6})(\s+)(.*)$/.exec(line);
  if (h) { const lvl = h[1].length; return `<h${lvl} class="line-block md-heading md-h${lvl}">${SYNTAX_DIM}${esc(h[1])}${SYNTAX_END}${SYNTAX_DIM}${esc(h[2])}${SYNTAX_END}${inlineFormat(h[3])}</h${lvl}>`; }
  const t = /^([-*]\s+)\[([ xX])\]\s+(.*)$/.exec(line);
  if (t) { const c = t[2].toLowerCase()==="x"; return `<div class="line-block line-task">${SYNTAX_DIM}${esc(t[1])}[${t[2]}] ${SYNTAX_END}<span class="task-check" contenteditable="false" data-checked="${c?"1":"0"}">${c?"✓":""}</span><span class="task-text ${c?"task-done":""}">${inlineFormat(t[3])}</span></div>`; }
  const n = /^(\d+\.\s+)(.*)$/.exec(line);
  if (n) return `<div class="line-block line-numbered">${SYNTAX_DIM}${esc(n[1])}${SYNTAX_END}<span class="list-text">${inlineFormat(n[2])}</span></div>`;
  const b = /^([-*]\s+)(.*)$/.exec(line);
  if (b) return `<div class="line-block line-bullet">${SYNTAX_DIM}${esc(b[1])}${SYNTAX_END}<span class="bullet-glyph" contenteditable="false">•</span><span class="list-text">${inlineFormat(b[2])}</span></div>`;
  const q = /^(>\s*)(.*)$/.exec(line);
  if (q) return `<div class="line-block line-quote">${SYNTAX_DIM}${esc(q[1])}${SYNTAX_END}<span class="quote-text">${inlineFormat(q[2])}</span></div>`;
  return `<div class="line-block line-text">${inlineFormat(line)}</div>`;
}

function renderFullHtml(text: string): string {
  const lines = text.split("\n");
  let inCodeFence = false;
  const parts: string[] = [];
  for (const line of lines) {
    if (/^```/.test(line)) {
      if (!inCodeFence) { inCodeFence = true; parts.push(`<div class="line-block code-fence-open">${SYNTAX_DIM}${esc(line)}${SYNTAX_END}</div>`); }
      else { inCodeFence = false; parts.push(`<div class="line-block code-fence-close">${SYNTAX_DIM}${esc(line)}${SYNTAX_END}</div>`); }
      continue;
    }
    if (inCodeFence) { parts.push(`<div class="line-block code-fence-line"><code>${esc(line) || " "}</code></div>`); continue; }
    parts.push(blockRender(line));
  }
  return parts.join("");
}

// Raw line — plain text for the active line (browser handles editing natively)
function rawLineRender(text: string): string {
  if (!text) return '<div class="line-block line-empty active-line"><br/></div>';
  return `<div class="line-block line-text active-line">${esc(text)}</div>`;
}

// Reading-only render (clean, no syntax dims) — exported for PDF
export function renderReadingHtml(text: string): string {
  const lines = text.split("\n");
  let inCodeFence = false;
  const parts: string[] = [];
  for (const line of lines) {
    if (/^```/.test(line)) { if (!inCodeFence) { inCodeFence = true; parts.push('<div class="line-block code-fence-open"></div>'); } else { inCodeFence = false; parts.push('<div class="line-block code-fence-close"></div>'); } continue; }
    if (inCodeFence) { parts.push(`<div class="line-block code-fence-line"><code>${esc(line) || " "}</code></div>`); continue; }
    if (!line) { parts.push('<div class="line-block line-empty"><br/></div>'); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { parts.push('<div class="line-block line-hr"></div>'); continue; }
    const h = /^(#{1,6})(\s+)(.*)$/.exec(line);
    if (h) { parts.push(`<h${h[1].length} class="line-block md-heading md-h${h[1].length}">${inlineFormat(h[3])}</h${h[1].length}>`); continue; }
    const t = /^([-*]\s+)\[([ xX])\]\s+(.*)$/.exec(line);
    if (t) { const c = t[2].toLowerCase()==="x"; parts.push(`<div class="line-block line-task"><span class="task-check" data-checked="${c?"1":"0"}">${c?"✓":""}</span><span class="task-text ${c?"task-done":""}">${inlineFormat(t[3])}</span></div>`); continue; }
    const n = /^(\d+\.\s+)(.*)$/.exec(line);
    if (n) { parts.push(`<div class="line-block line-numbered"><span class="list-text">${inlineFormat(n[2])}</span></div>`); continue; }
    const b = /^([-*]\s+)(.*)$/.exec(line);
    if (b) { parts.push(`<div class="line-block line-bullet"><span class="bullet-glyph">•</span><span class="list-text">${inlineFormat(b[2])}</span></div>`); continue; }
    const q = /^(>\s*)(.*)$/.exec(line);
    if (q) { parts.push(`<div class="line-block line-quote"><span class="quote-text">${inlineFormat(q[2])}</span></div>`); continue; }
    parts.push(`<div class="line-block line-text">${inlineFormat(line)}</div>`);
  }
  return parts.join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// Caret helpers — marker-based, reliable
// ─────────────────────────────────────────────────────────────────────────────

function isEditable(node: Node): boolean {
  let el: Element | null = node.parentElement;
  while (el) {
    if (el.getAttribute && el.getAttribute("contenteditable") === "false") return false;
    el = el.parentElement;
  }
  return true;
}

// Get caret character offset within a container using a marker element
function getCaretOffset(container: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.endContainer)) return 0;

  const marker = document.createElement("span");
  marker.setAttribute("data-m", "1");
  marker.contentEditable = "false";
  range.insertNode(marker);

  let offset = 0;
  let found = false;
  function walk(node: Node) {
    if (found) return;
    if (node === marker) { found = true; return; }
    if (node.nodeType === Node.TEXT_NODE) {
      if (isEditable(node)) offset += (node as Text).data.length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.getAttribute && el.getAttribute("contenteditable") === "false") return;
    for (let i = 0; i < node.childNodes.length; i++) {
      walk(node.childNodes[i]);
      if (found) return;
    }
  }
  walk(container);
  marker.remove();
  return found ? offset : 0;
}

// Set caret at character offset within a container
function setCaretOffset(container: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let remaining = offset;
  let found = false;
  function walk(node: Node) {
    if (found) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (!isEditable(node)) return;
      if (remaining <= (node as Text).data.length) {
        range.setStart(node, Math.max(0, remaining));
        range.collapse(true);
        found = true;
        return;
      }
      remaining -= (node as Text).data.length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (let i = 0; i < node.childNodes.length; i++) {
      walk(node.childNodes[i]);
      if (found) return;
    }
  }
  walk(container);
  if (!found) { range.selectNodeContents(container); range.collapse(false); }
  sel.removeAllRanges();
  sel.addRange(range);
}

function getActiveLine(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== editor) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList?.contains("line-block")) return node as HTMLElement;
    node = node.parentNode;
  }
  return null;
}

function getLineIndex(editor: HTMLElement, lineEl: HTMLElement): number {
  return Array.from(editor.children).indexOf(lineEl);
}

function getLineText(lineEl: HTMLElement): string {
  let text = "";
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => isEditable(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  while (walker.nextNode()) text += (walker.currentNode as Text).data;
  return text;
}

function getEditorText(editor: HTMLElement): string {
  const lines: string[] = [];
  for (let i = 0; i < editor.childNodes.length; i++) {
    const child = editor.childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.tagName === "BR") lines.push("");
      else lines.push(getLineText(el));
    } else if (child.nodeType === Node.TEXT_NODE && isEditable(child as Text)) {
      lines.push((child as Text).data);
    }
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — WYSIWYG with raw active line
// ─────────────────────────────────────────────────────────────────────────────

export default function LivePreviewEditor({
  value, onChange, readOnly = false, onWikiLinkClick,
}: LivePreviewEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitRef = useRef(false);
  const isInternalRef = useRef(false);
  const lastTextRef = useRef("");
  const activeLineIdxRef = useRef(-1);

  // Sync value → DOM (external changes only, never during typing)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (readOnly) { editor.innerHTML = renderReadingHtml(value); return; }
    if (!isInitRef.current) { editor.innerHTML = renderFullHtml(value); lastTextRef.current = value; isInitRef.current = true; return; }
    if (isInternalRef.current) { isInternalRef.current = false; lastTextRef.current = value; return; }
    if (value !== lastTextRef.current) { editor.innerHTML = renderFullHtml(value); lastTextRef.current = value; activeLineIdxRef.current = -1; }
  }, [value, readOnly]);

  // Input — extract text for persistence, DON'T touch DOM
  const handleInput = useCallback(() => {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;
    const rawText = getEditorText(editor);
    lastTextRef.current = rawText;
    isInternalRef.current = true;
    onChange(rawText);
  }, [onChange, readOnly]);

  // Key down — Enter, Backspace, Tab
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    const editor = editorRef.current;
    if (!editor) return;

    // Enter — split line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const activeLine = getActiveLine(editor);
      if (!activeLine) return;
      const idx = getLineIndex(editor, activeLine);
      const caret = getCaretOffset(activeLine);
      const lineText = getLineText(activeLine);
      const before = lineText.slice(0, caret);
      const after = lineText.slice(caret);

      const tempA = document.createElement("div");
      tempA.innerHTML = blockRender(before);
      const newBefore = tempA.firstElementChild as HTMLElement | null;

      const tempB = document.createElement("div");
      tempB.innerHTML = rawLineRender(after);
      const newAfter = tempB.firstElementChild as HTMLElement | null;

      if (newBefore && newAfter) {
        activeLine.replaceWith(newBefore);
        newBefore.after(newAfter);
        activeLineIdxRef.current = idx + 1;
        editor.focus();
        setCaretOffset(newAfter, 0);

        const allLines = lastTextRef.current.split("\n");
        allLines[idx] = before;
        allLines.splice(idx + 1, 0, after);
        const newText = allLines.join("\n");
        lastTextRef.current = newText;
        isInternalRef.current = true;
        onChange(newText);
      }
      return;
    }

    // Backspace at start of line — merge with previous
    if (e.key === "Backspace") {
      const activeLine = getActiveLine(editor);
      if (!activeLine) return;
      const caret = getCaretOffset(activeLine);
      if (caret === 0) {
        const idx = getLineIndex(editor, activeLine);
        if (idx > 0) {
          e.preventDefault();
          const prevLine = editor.children[idx - 1] as HTMLElement;
          const prevText = getLineText(prevLine);
          const curText = getLineText(activeLine);
          const mergedPos = prevText.length;
          const merged = prevText + curText;

          const temp = document.createElement("div");
          temp.innerHTML = rawLineRender(merged);
          const newEl = temp.firstElementChild as HTMLElement | null;
          if (newEl) {
            prevLine.replaceWith(newEl);
            activeLine.remove();
            activeLineIdxRef.current = idx - 1;
            editor.focus();
            setCaretOffset(newEl, mergedPos);

            const allLines = lastTextRef.current.split("\n");
            allLines[idx - 1] = merged;
            allLines.splice(idx, 1);
            const newText = allLines.join("\n");
            lastTextRef.current = newText;
            isInternalRef.current = true;
            onChange(newText);
          }
          return;
        }
      }
    }

    // Tab — insert 2 spaces
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
      return;
    }
  }, [onChange, readOnly]);

  // Paste — insert as plain text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    document.execCommand("insertText", false, text);
  }, [readOnly]);

  // Selection change — format old line, raw-ify new line
  useEffect(() => {
    if (readOnly) return;
    const handler = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!anchor || !editor.contains(anchor)) return;

      const activeLine = getActiveLine(editor);
      if (!activeLine) return;
      const newIdx = getLineIndex(editor, activeLine);
      if (newIdx === activeLineIdxRef.current) return;

      const oldIdx = activeLineIdxRef.current;
      activeLineIdxRef.current = newIdx;

      // Format old line (it's becoming inactive)
      if (oldIdx >= 0 && oldIdx < editor.children.length && oldIdx !== newIdx) {
        const oldLine = editor.children[oldIdx] as HTMLElement;
        if (oldLine && oldLine.classList.contains("active-line")) {
          const oldText = getLineText(oldLine);
          const temp = document.createElement("div");
          temp.innerHTML = blockRender(oldText);
          const newEl = temp.firstElementChild as HTMLElement | null;
          if (newEl) oldLine.replaceWith(newEl);
        }
      }

      // Raw-ify new line (it's becoming active)
      if (newIdx >= 0 && newIdx < editor.children.length) {
        const newLine = editor.children[newIdx] as HTMLElement;
        if (newLine && !newLine.classList.contains("active-line")) {
          const savedCaret = getCaretOffset(newLine);
          const newText = getLineText(newLine);
          const temp = document.createElement("div");
          temp.innerHTML = rawLineRender(newText);
          const newEl = temp.firstElementChild as HTMLElement | null;
          if (newEl) {
            newLine.replaceWith(newEl);
            editor.focus();
            setCaretOffset(newEl, savedCaret);
          }
        }
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [readOnly]);

  // Click — wiki links + task toggles
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest(".wiki-link") as HTMLElement | null;
    if (link) {
      if (readOnly || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const note = link.getAttribute("data-note");
        if (note) onWikiLinkClick?.(note);
      }
      return;
    }
    const check = target.closest(".task-check") as HTMLElement | null;
    if (check) {
      e.preventDefault();
      const lineEl = check.closest(".line-block") as HTMLElement | null;
      if (lineEl && editorRef.current) {
        const editor = editorRef.current;
        const idx = getLineIndex(editor, lineEl);
        if (idx >= 0) {
          const textLines = getEditorText(editor).split("\n");
          const line = textLines[idx];
          const m = /^([-*]\s+)\[([ xX])\]\s+(.*)$/.exec(line);
          if (m) {
            const newMark = m[2].toLowerCase() === "x" ? "[ ]" : "[x]";
            const next = textLines.slice();
            next[idx] = `${m[1]}${newMark} ${m[3]}`;
            isInternalRef.current = false;
            onChange(next.join("\n"));
          }
        }
      }
    }
  }, [onChange, onWikiLinkClick, readOnly]);

  return (
    <>
      <style>{`
        .live-preview-editor, .live-preview-editor * { box-sizing: border-box; }
        .live-preview-editor {
          display: block; width: 100%; height: auto; min-height: 100%;
          padding: 18px 22px 80px; overflow-y: visible;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Inter", sans-serif;
          font-size: 14px; line-height: 1.7; color: var(--axiom-text, #e2e8f0);
          background: transparent; border: 0; outline: none;
          white-space: pre-wrap; word-break: break-word;
          -webkit-font-smoothing: antialiased; text-align: left;
          -webkit-user-select: text; user-select: text;
        }
        .live-preview-editor .line-block {
          display: block; width: 100%; min-height: 1.7em; margin: 0;
          padding: 1px 6px; border-radius: 4px; line-height: 1.7;
        }
        .live-preview-editor .line-block.active-line { background-color: rgba(34, 211, 238, 0.05); }
        .live-preview-editor .line-empty { min-height: 1.7em; }

        /* Syntax dimming — CSS only */
        .live-preview-editor .md-syntax-dim { display: inline; }
        .live-preview-editor .line-block:not(.active-line) .md-syntax-dim { display: none !important; }
        .live-preview-editor .line-block.active-line .md-syntax-dim { display: inline !important; opacity: 0.35; color: #64748b; }

        /* Headings */
        .live-preview-editor .md-heading { font-weight: 700; color: #67e8f9; text-shadow: 0 0 12px rgba(34,211,238,0.55), 0 0 24px rgba(34,211,238,0.25); letter-spacing: -0.01em; line-height: 1.25; }
        .live-preview-editor .md-h1 { font-size: 1.9em; padding: 14px 0 6px !important; border-bottom: 1px solid rgba(34,211,238,0.2); }
        .live-preview-editor .md-h2 { font-size: 1.6em; padding: 12px 0 5px !important; color: #22d3ee; }
        .live-preview-editor .md-h3 { font-size: 1.35em; padding: 10px 0 4px !important; }
        .live-preview-editor .md-h4 { font-size: 1.15em; padding: 8px 0 3px !important; }
        .live-preview-editor .md-h5 { font-size: 1.0em; padding: 6px 0 2px !important; }
        .live-preview-editor .md-h6 { font-size: 0.9em; padding: 6px 0 2px !important; opacity: 0.85; }

        /* HR */
        .live-preview-editor .line-hr { padding: 14px 0 !important; min-height: 1.7em; }
        .live-preview-editor .line-hr::after { content: ""; display: block; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, #22d3ee, transparent); box-shadow: 0 0 10px rgba(34,211,238,0.6); }
        .live-preview-editor .line-block.active-line.line-hr::after { display: none; }

        /* Lists */
        .live-preview-editor .line-bullet, .live-preview-editor .line-numbered { padding: 1px 0 !important; }
        .live-preview-editor .bullet-glyph { display: inline-block; color: #22d3ee; margin-right: 8px; font-size: 1.1em; vertical-align: top; text-shadow: 0 0 6px rgba(34,211,238,0.4); user-select: none; }
        .live-preview-editor .list-text { display: inline; }

        /* Tasks */
        .live-preview-editor .line-task { display: flex; align-items: flex-start; gap: 8px; padding: 3px 0 !important; }
        .live-preview-editor .task-check { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-top: 4px; border-radius: 4px; border: 1px solid rgba(34,211,238,0.55); background: transparent; color: #0a0e1a; font-size: 11px; font-weight: 700; cursor: pointer; flex-shrink: 0; user-select: none; transition: all 0.15s ease; }
        .live-preview-editor .task-check[data-checked="1"] { background: #22d3ee; border-color: #22d3ee; box-shadow: 0 0 8px rgba(34,211,238,0.5); }
        .live-preview-editor .task-check:hover { box-shadow: 0 0 10px rgba(34,211,238,0.7); }
        .live-preview-editor .task-text { display: inline; flex: 1; min-width: 0; }
        .live-preview-editor .task-done { text-decoration: line-through; opacity: 0.55; }

        /* Blockquotes */
        .live-preview-editor .line-quote { display: block; border-left: 2px solid #22d3ee; padding: 4px 0 4px 14px !important; margin: 4px 0 !important; background: rgba(34,211,238,0.04); box-shadow: -2px 0 8px rgba(34,211,238,0.15); }
        .live-preview-editor .quote-text { display: inline; color: #cbd5e1; font-style: italic; }

        /* Inline */
        .live-preview-editor .md-bold { font-weight: 700; color: var(--axiom-text, #f1f5f9); }
        .live-preview-editor .md-italic { font-style: italic; }
        .live-preview-editor .md-strike { text-decoration: line-through; color: var(--axiom-dim, #64748b); }
        .live-preview-editor .md-code { display: inline; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.4); color: #22d3ee; font-family: ui-monospace, monospace; font-size: 0.85em; }
        .live-preview-editor .wiki-link { display: inline; color: #22d3ee; text-decoration: underline; text-underline-offset: 2px; text-decoration-color: rgba(34,211,238,0.5); cursor: pointer; border-radius: 2px; transition: all 0.15s; }
        .live-preview-editor .wiki-link:hover { color: #67e8f9; text-shadow: 0 0 10px rgba(34,211,238,0.7); background: rgba(34,211,238,0.08); }

        /* Code fences */
        .live-preview-editor .code-fence-open, .live-preview-editor .code-fence-close { display: block; padding: 8px 12px !important; color: #475569; font-family: ui-monospace, monospace; font-size: 0.9em; background: rgba(0,0,0,0.35); border: 1px solid rgba(34,211,238,0.15); line-height: 1.5; }
        .live-preview-editor .code-fence-open { border-bottom: 0; border-radius: 8px 8px 0 0; }
        .live-preview-editor .code-fence-close { border-top: 0; border-radius: 0 0 8px 8px; }
        .live-preview-editor .code-fence-line { display: block; padding: 1px 12px !important; background: rgba(0,0,0,0.35); border-left: 1px solid rgba(34,211,238,0.15); border-right: 1px solid rgba(34,211,238,0.15); line-height: 1.5; }
        .live-preview-editor .code-fence-line code { display: block; width: 100%; padding: 0 !important; margin: 0 !important; background: transparent !important; color: #e2e8f0; font-family: ui-monospace, monospace; font-size: 0.88em; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }

        /* Scrollbar */
        .live-preview-editor::-webkit-scrollbar { width: 8px; }
        .live-preview-editor::-webkit-scrollbar-track { background: transparent; }
        .live-preview-editor::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.2); border-radius: 4px; }
        .live-preview-editor::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.4); }

        /* PDF print */
        @media print {
          body * { visibility: hidden !important; }
          #axiom-print-container, #axiom-print-container * { visibility: visible !important; }
          #axiom-print-container { position: absolute !important; left: 0 !important; top: 0 !important; display: block !important; width: 100% !important; max-width: 750px !important; margin: 0 auto !important; padding: 20mm !important; color: #000 !important; background: #fff !important; font-size: 11pt !important; line-height: 1.5 !important; white-space: pre-wrap !important; min-height: auto !important; height: auto !important; overflow: visible !important; }
          #axiom-print-container .md-heading { color: #000 !important; text-shadow: none !important; page-break-after: avoid; }
          #axiom-print-container .md-syntax-dim { display: none !important; }
          #axiom-print-container .wiki-link { color: #000 !important; text-shadow: none !important; }
          #axiom-print-container .line-hr::after { background: #999 !important; box-shadow: none !important; }
          #axiom-print-container .line-quote { border-left-color: #999 !important; background: #f5f5f5 !important; box-shadow: none !important; }
          #axiom-print-container .task-check { border-color: #999 !important; background: transparent !important; box-shadow: none !important; }
          #axiom-print-container .task-check[data-checked="1"] { background: #666 !important; }
          #axiom-print-container .code-fence-open, #axiom-print-container .code-fence-close, #axiom-print-container .code-fence-line { background: #f5f5f5 !important; border-color: #ddd !important; box-shadow: none !important; }
          #axiom-print-container .code-fence-line code, #axiom-print-container .md-code { color: #000 !important; background: #f0f0f0 !important; }
        }
      `}</style>

      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        spellCheck={false}
        className="live-preview-editor brain-note-document-container"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
      />
    </>
  );
}

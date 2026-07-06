"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, ChevronDown, ChevronRight, ChevronLeft, MousePointer2,
  Type, Square, Sparkles, RotateCcw, Lock, Unlock, Crosshair,
  TreePine, Search, Code2, Braces, Tag, FileText,
  Home, LayoutDashboard, Network, Bot, Workflow, Grid3x3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline,
  Move, Maximize, Minimize, Save, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HomePage from "@/components/axiom/pages/HomePage";
import DashboardPage from "@/components/axiom/pages/DashboardPage";
import BrainPage from "@/components/axiom/pages/BrainPage";
import AgentsPage from "@/components/axiom/pages/AgentsPage";
import WorkflowsPage from "@/components/axiom/pages/WorkflowsPage";
import AppsPage from "@/components/axiom/pages/AppsPage";
import { saveCustomStyles, parseCssToEntries, type CustomStyleEntry } from "@/lib/axiom/customStyles";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectedElement {
  selector: string;
  tagName: string;
  className: string;
  id: string;
  inlineStyles: Record<string, string>;
  computedStyles: Record<string, string>;
  element: HTMLElement | null; // null in static mode
}

type PageId = "home" | "dashboard" | "brain" | "agents" | "workflows" | "apps";

interface PageOption {
  id: PageId;
  label: string;
  icon: typeof Home;
}

const PAGES: PageOption[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "brain", label: "Brain", icon: Network },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "apps", label: "Apps", icon: Grid3x3 },
];

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC LAYER TREE — Built from real DOM elements in the live preview canvas
// Uses a universal label extractor: ID > class > tag name
// ─────────────────────────────────────────────────────────────────────────────

interface LayerNode {
  id: string;
  icon: string;
  label: string;
  selector: string;
  tagName: string;
  className: string;
  elementId: string;
  isContainer: boolean;
  isText: boolean;
  textContent: string;
  element: HTMLElement | null;
  children: LayerNode[];
}

// Cyberpunk default styles — NO #000000 anywhere
const CYBER_DEFAULTS: Record<string, string> = {
  "margin-top": "0px", "margin-right": "0px", "margin-bottom": "0px", "margin-left": "0px",
  "padding-top": "0px", "padding-right": "0px", "padding-bottom": "0px", "padding-left": "0px",
  "font-size": "16px", "font-family": "Inter, sans-serif", "font-weight": "400",
  "text-align": "left", "letter-spacing": "0px", "line-height": "1.5",
  "text-transform": "none",
  "opacity": "1", "color": "#e5e7eb",
  "border-color": "#00f0ff", "border-width": "0px", "border-style": "solid", "border-radius": "0px",
  "background-color": "#0c0f12", "background-image": "none",
  "box-shadow": "none", "transition": "all 200ms ease",
  "width": "auto", "height": "auto",
  "display": "block", "position": "static",
  "flex-direction": "row", "align-items": "stretch", "justify-content": "flex-start", "gap": "0px",
  "top": "auto", "right": "auto", "bottom": "auto", "left": "auto",
  "backdrop-filter": "none",
};

// ── Universal label extractor ──
// Rule A: ID → [#] id-name
// Rule B: class → [📦] class-name
// Rule C: tag → [📝] h1, [📝] p, [📝] button, etc.
function extractLabel(el: HTMLElement): { icon: string; label: string } {
  const tag = el.tagName.toLowerCase();
  const textTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button", "label", "input", "textarea"];

  // Rule A: ID
  if (el.id) {
    return { icon: "#", label: el.id };
  }

  // Rule B: semantic class (skip utility classes like flex, w-full, etc.)
  if (el.className && typeof el.className === "string") {
    const classes = el.className.split(/\s+/).filter(Boolean);
    // Find the first non-utility class (skip Tailwind utilities)
    const semanticClass = classes.find((c) =>
      !c.match(/^(flex|grid|block|inline|hidden|w-|h-|p-|m-|text-|font-|bg-|border-|rounded|gap-|space-|items-|justify-|overflow|relative|absolute|fixed|sticky|shrink|grow|min-|max-|opacity|transition|duration|ease|cursor|select|truncate|uppercase|lowercase|capitalize|tracking|leading|aspect|object|z-|top-|bottom-|left-|right-|inset-)/)
    );
    if (semanticClass) {
      return { icon: "📦", label: semanticClass };
    }
    // If all classes are utility classes, use the first one
    if (classes.length > 0) {
      return { icon: "📦", label: classes[0] };
    }
  }

  // Rule C: text/typography tag
  if (textTags.includes(tag)) {
    return { icon: "📝", label: tag };
  }

  // Fallback: just the tag name
  return { icon: tag === "div" ? "▣" : tag === "section" ? "§" : "▪", label: tag };
}

// ── Build a layer node from a real DOM element ──
function buildLayerFromDOM(el: HTMLElement, depth: number): LayerNode {
  const { icon, label } = extractLabel(el);
  const tag = el.tagName.toLowerCase();
  const textTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button", "label", "input", "textarea"];
  const isText = textTags.includes(tag) || (!!el.textContent?.trim() && el.children.length === 0);

  // Build selector
  let selector = tag;
  if (el.id) selector = `#${el.id}`;
  else if (el.className && typeof el.className === "string") {
    const firstClass = el.className.split(/\s+/)[0];
    if (firstClass) selector = `.${firstClass}`;
  }

  // Recursively build children
  const children: LayerNode[] = [];
  Array.from(el.children).forEach((child) => {
    const childEl = child as HTMLElement;
    // Skip script/style/meta/svg elements
    if (["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "SVG"].includes(childEl.tagName)) return;
    if (childEl.id?.startsWith("__designer")) return;
    if (childEl.hasAttribute("data-designer-overlay")) return;
    children.push(buildLayerFromDOM(childEl, depth + 1));
  });

  return {
    id: `layer-${depth}-${tag}-${Math.random().toString(36).slice(2, 8)}`,
    icon,
    label,
    selector,
    tagName: tag,
    className: (typeof el.className === "string" ? el.className : "") || "",
    elementId: el.id || "",
    isContainer: children.length > 0,
    isText,
    textContent: isText ? (el.textContent || "").trim().slice(0, 60) : "",
    element: el,
    children,
  };
}

// ── Find all ancestor layer IDs for a given layer (for auto-expand) ──
function findAncestorIds(layers: LayerNode[], targetId: string, ancestors: string[] = []): string[] | null {
  for (const layer of layers) {
    if (layer.id === targetId) return [...ancestors];
    if (layer.children.length > 0) {
      const result = findAncestorIds(layer.children, targetId, [...ancestors, layer.id]);
      if (result) return result;
    }
  }
  return null;
}

// ── Find a layer node by ID in the tree ──
function findLayerById(layers: LayerNode[], id: string): LayerNode | null {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    const found = findLayerById(layer.children, id);
    if (found) return found;
  }
  return null;
}

// ── Read real computed styles from a DOM element ──
function readRealStyles(el: HTMLElement): Record<string, string> {
  try {
    const c = window.getComputedStyle(el);
    const safeColor = (v: string, fb: string) => (!v || v === "transparent" || v === "rgba(0, 0, 0, 0)") ? fb : v;
    return {
      ...CYBER_DEFAULTS,
      "margin-top": c.marginTop || "0px", "margin-right": c.marginRight || "0px",
      "margin-bottom": c.marginBottom || "0px", "margin-left": c.marginLeft || "0px",
      "padding-top": c.paddingTop || "0px", "padding-right": c.paddingRight || "0px",
      "padding-bottom": c.paddingBottom || "0px", "padding-left": c.paddingLeft || "0px",
      "font-size": c.fontSize || "16px", "font-family": c.fontFamily || "Inter, sans-serif",
      "font-weight": c.fontWeight || "400", "text-align": c.textAlign || "left",
      "letter-spacing": c.letterSpacing || "0px", "line-height": c.lineHeight || "1.5",
      "text-transform": c.textTransform || "none",
      "opacity": c.opacity || "1", "color": safeColor(c.color, "#e5e7eb"),
      "border-color": safeColor(c.borderColor, "#00f0ff"), "border-width": c.borderWidth || "0px",
      "border-style": c.borderStyle || "solid", "border-radius": c.borderRadius || "0px",
      "background-color": safeColor(c.backgroundColor, "#0c0f12"),
      "background-image": c.backgroundImage || "none",
      "box-shadow": c.boxShadow || "none", "transition": c.transition || "all 200ms ease",
      "width": c.width || "auto", "height": c.height || "auto",
      "display": c.display || "block", "position": c.position || "static",
      "flex-direction": c.flexDirection || "row", "align-items": c.alignItems || "stretch",
      "justify-content": c.justifyContent || "flex-start", "gap": c.gap || "0px",
      "top": c.top || "auto", "right": c.right || "auto", "bottom": c.bottom || "auto", "left": c.left || "auto",
      "backdrop-filter": c.backdropFilter || "none",
    };
  } catch {
    return { ...CYBER_DEFAULTS };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Designer Mode Toggle
// ─────────────────────────────────────────────────────────────────────────────

export function DesignerModeToggle({ active, onToggle }: { active: boolean; onToggle: () => void; }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all",
        active ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40",
      )}
      style={active ? { boxShadow: "0 0 16px rgba(139,92,246,0.4), inset 0 0 8px rgba(139,92,246,0.1)" } : undefined}
      title="Toggle Webflow-style Visual Designer"
    >
      <Palette className={cn("w-3 h-3", active && "animate-pulse")} />
      <span className="uppercase tracking-wider">Designer Mode</span>
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-axiom-violet">
          <span className="absolute inset-0 rounded-full bg-axiom-violet animate-ping" />
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderPage(page: PageId): React.ReactNode {
  switch (page) {
    case "home": return <HomePage />;
    case "dashboard": return <DashboardPage />;
    case "brain": return <BrainPage />;
    case "agents": return <AgentsPage />;
    case "workflows": return <WorkflowsPage />;
    case "apps": return <AppsPage />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS Source Rewriter (kept for potential future use)
// ─────────────────────────────────────────────────────────────────────────────

export function rewriteCssInSource(source: string, selector: string, property: string, value: string): string {
  const escSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`(${escSelector}\\s*\\{)([^}]*)(\\})`, "g");
  let updated = false;
  let newSource = source.replace(blockRegex, (_match, opening, body, closing) => {
    updated = true;
    const propRegex = new RegExp(`(\\s*)${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*[^;]+;?`, "g");
    if (propRegex.test(body)) return `${opening}${body.replace(propRegex, `$1${property}: ${value};`)}${closing}`;
    const trimmedBody = body.trimEnd();
    return `${opening}${trimmedBody}${trimmedBody ? "\n  " : ""}${property}: ${value};\n${closing}`;
  });
  if (!updated) newSource = source + `\n\n${selector} {\n  ${property}: ${value};\n}\n`;
  return newSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Nav Tree Item — renders from LayerNode (no DOM scanning)
// ─────────────────────────────────────────────────────────────────────────────

function NavLayerItem({
  node, depth, selectedId, hoveredId, onHover, onClick, expandedNodes, setExpanded,
}: {
  node: LayerNode; depth: number; selectedId: string | null; hoveredId: string | null;
  onHover: (id: string | null) => void; onClick: (node: LayerNode) => void;
  expandedNodes: Record<string, boolean>; setExpanded: (id: string, val: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes[node.id] === true;
  const isSelected = selectedId === node.id;
  const isHovered = hoveredId === node.id;
  const itemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the LEFT SIDEBAR ONLY (not the global viewport) when selected.
  // Uses container-relative scrollTo instead of scrollIntoView to avoid shifting
  // the main application viewport.
  useEffect(() => {
    if (isSelected && itemRef.current) {
      // Find the navigator scroll container (the parent with .html-navigator-container)
      const container = itemRef.current.closest(".html-navigator-container") as HTMLElement | null;
      if (container) {
        // Calculate relative offset: position the node in the vertical center of the container
        const targetOffset = itemRef.current.offsetTop - container.offsetTop - (container.clientHeight / 2) + (itemRef.current.clientHeight / 2);
        container.scrollTo({ top: Math.max(0, targetOffset), behavior: "smooth" });
      }
    }
  }, [isSelected]);

  return (
    <div>
      <div
        ref={itemRef}
        data-layer-id={node.id}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(node); }}
        className={cn(
          "flex items-center gap-1 py-1 px-1.5 rounded cursor-pointer text-[11px] font-mono transition-colors",
          isSelected ? "bg-axiom-violet/15 border border-axiom-violet/40 text-axiom-violet"
            : isHovered ? "bg-axiom-cyan/10 text-axiom-cyan"
            : "hover:bg-axiom-panel/40 text-axiom-text/70 border border-transparent",
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(node.id, !isExpanded); }}
            className="w-3 h-3 flex items-center justify-center text-axiom-dim hover:text-axiom-text shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          </button>
        ) : <span className="w-3 shrink-0" />}
        <span className="shrink-0 text-[10px]">{node.icon}</span>
        <span className={cn("truncate", isSelected ? "text-axiom-violet" : "text-axiom-text/80")}>
          {node.label}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <NavLayerItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} hoveredId={hoveredId}
              onHover={onHover} onClick={onClick} expandedNodes={expandedNodes} setExpanded={setExpanded} />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN: DesignerStudio
// ════════════════════════════════════════════════════════════════════════════

export function DesignerStudio({
  source,
  onReset,
}: {
  source: string;
  onApplyStyle?: (property: string, value: string) => void;
  onReset?: () => void;
}) {
  // ── State ──
  const [activePage, setActivePage] = useState<PageId>("home");
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<LayerNode | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [hoveredSelector, setHoveredSelector] = useState<string | null>(null);
  const [styleVersion, setStyleVersion] = useState(0);
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(false);
  const [rightColumnCollapsed, setRightColumnCollapsed] = useState(false);
  const [htmlBoxCollapsed, setHtmlBoxCollapsed] = useState(false);
  const [cssBoxCollapsed, setCssBoxCollapsed] = useState(false);
  const [globalSync, setGlobalSync] = useState(false);
  const [elementContent, setElementContent] = useState("");
  const [originalStyles, setOriginalStyles] = useState<Record<string, string>>({});
  const [activeState, setActiveState] = useState<"normal" | "hover" | "focus" | "active">("normal");
  const [savedFlash, setSavedFlash] = useState(false);
  const [sections, setSections] = useState<Record<string, boolean>>({
    classes: true, content: true, layout: true, typography: true, appearance: true, effects: false,
  });
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [pageLayers, setPageLayers] = useState<LayerNode[]>([]);

  // ── Build the layer tree from the real DOM in the canvas ──
  const buildTreeFromDOM = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      // Find the page wrapper (first non-overlay child of canvas)
      const pageWrapper = Array.from(canvas.children).find(
        (child) => {
          const el = child as HTMLElement;
          return !el.id?.startsWith("__designer") && !el.hasAttribute("data-designer-overlay");
        },
      ) as HTMLElement | undefined;
      if (!pageWrapper) return;

      // Build layers from the wrapper's children (the actual page content)
      const roots: LayerNode[] = [];
      Array.from(pageWrapper.children).forEach((child) => {
        const childEl = child as HTMLElement;
        if (["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "SVG"].includes(childEl.tagName)) return;
        if (childEl.id?.startsWith("__designer")) return;
        if (childEl.hasAttribute("data-designer-overlay")) return;
        roots.push(buildLayerFromDOM(childEl, 0));
      });

      // If no direct children, drill one level deeper
      if (roots.length === 0) {
        Array.from(pageWrapper.children).forEach((child) => {
          const childEl = child as HTMLElement;
          Array.from(childEl.children).forEach((inner) => {
            const innerEl = inner as HTMLElement;
            if (["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "SVG"].includes(innerEl.tagName)) return;
            roots.push(buildLayerFromDOM(innerEl, 0));
          });
        });
      }

      setPageLayers(roots);
    } catch { /* safe */ }
  }, []);

  // ── Select a layer (reads REAL styles + auto-expands parent chain) ──
  const selectLayer = useCallback((layer: LayerNode) => {
    if (!layer.element) return;
    try {
      const computed = readRealStyles(layer.element);
      // Clear previous selection
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.querySelectorAll(".__designer_selected").forEach((n) => n.classList.remove("__designer_selected"));
      }
      layer.element.classList.add("__designer_selected");

      // Auto-expand all ancestor nodes so the selected layer is visible
      const ancestorIds = findAncestorIds(pageLayers, layer.id);
      if (ancestorIds) {
        setExpandedNodes((prev) => {
          const next = { ...prev };
          for (const id of ancestorIds) next[id] = true;
          return next;
        });
      }

      setOriginalStyles({ ...computed });
      setSelectedLayer(layer);
      setElementContent(layer.textContent);
      setSelectedElement({
        selector: layer.selector,
        tagName: layer.tagName,
        className: layer.className,
        id: layer.elementId,
        inlineStyles: {},
        computedStyles: computed,
        element: layer.element,
      });
    } catch { /* safe */ }
  }, [pageLayers]);

  // ── Change tracker ──
  const isChanged = useCallback((property: string): boolean => {
    if (!selectedElement || !originalStyles[property]) return false;
    return selectedElement.computedStyles[property] !== originalStyles[property];
  }, [selectedElement, originalStyles]);

  // ── Reset a single property (removes inline style from the REAL DOM) ──
  const resetProperty = useCallback((property: string) => {
    if (!selectedElement?.element || !originalStyles[property]) return;
    try {
      selectedElement.element.style.removeProperty(property);
      const newComputed = readRealStyles(selectedElement.element);
      setSelectedElement((prev) => prev ? { ...prev, computedStyles: newComputed, inlineStyles: { ...prev.inlineStyles, [property]: originalStyles[property] } } : prev);
    } catch { /* safe */ }
    setStyleVersion((v) => v + 1);
  }, [selectedElement, originalStyles]);

  // ── Reset ALL overrides (clears ALL inline styles from the REAL DOM) ──
  const resetAllOverrides = useCallback(() => {
    if (!selectedElement?.element) return;
    try {
      const el = document.querySelector(".__designer_selected") as HTMLElement | null;
      if (el) el.style.cssText = "";
      const target = el || selectedElement.element;
      const newComputed = readRealStyles(target);
      setSelectedElement((prev) => prev ? { ...prev, computedStyles: newComputed, inlineStyles: {} } : prev);
      setOriginalStyles({ ...newComputed });
    } catch { /* safe */ }
    setStyleVersion((v) => v + 1);
  }, [selectedElement]);

  const changedCount = selectedElement
    ? Object.keys(selectedElement.computedStyles).filter((k) => isChanged(k)).length
    : 0;

  // ── Save styles to localStorage ──
  const saveAllStyles = useCallback(() => {
    try {
      const entries: CustomStyleEntry[] = [];
      if (selectedElement?.inlineStyles) {
        for (const [property, value] of Object.entries(selectedElement.inlineStyles)) {
          entries.push({ selector: selectedElement.selector, property, value, timestamp: Date.now() });
        }
      }
      if (entries.length === 0 && selectedElement) {
        for (const [property, value] of Object.entries(selectedElement.computedStyles)) {
          if (isChanged(property)) entries.push({ selector: selectedElement.selector, property, value, timestamp: Date.now() });
        }
      }
      if (entries.length === 0) return;
      saveCustomStyles(entries);
      window.dispatchEvent(new Event("axiom-styles-saved"));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch { /* safe */ }
  }, [selectedElement, isChanged]);

  // ── Apply style (mutates the REAL DOM element inline + updates state) ──
  const applyStyle = useCallback((property: string, value: string) => {
    setSelectedElement((prev) => {
      if (!prev?.element) return prev;
      try {
        // Apply inline style to the REAL DOM element
        prev.element.style.setProperty(property, value);
        // Re-read computed styles to reflect the change
        const newComputed = readRealStyles(prev.element);
        const newInline = prev.element.style.cssText
          ? prev.element.style.cssText.split(";").reduce<Record<string, string>>((acc, decl) => {
              const [k, v] = decl.split(":").map((s) => s?.trim());
              if (k && v) acc[k] = v;
              return acc;
            }, {})
          : { [property]: value };
        return { ...prev, computedStyles: newComputed, inlineStyles: newInline };
      } catch {
        return prev;
      }
    });
    setStyleVersion((v) => v + 1);
  }, []);

  // ── Update element text content (mutates the REAL DOM element) ──
  const updateElementContent = useCallback((newText: string) => {
    if (selectedElement?.element) {
      try {
        const el = document.querySelector(".__designer_selected") as HTMLElement | null;
        if (el) el.textContent = newText;
      } catch { /* safe */ }
    }
    setElementContent(newText);
    setStyleVersion((v) => v + 1);
  }, [selectedElement]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSelectedLayer(null);
    setSelectedElement(null);
    setHoveredSelector(null);
    setHoveredNavId(null);
    setElementContent("");
    setOriginalStyles({});
    onReset?.();
  }, [onReset]);

  // ── Canvas event delegation: hover + click → match to layer by DOM identity ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!document.getElementById("__designer_overlay_styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "__designer_overlay_styles";
      styleEl.textContent = `
        .__designer_hover { outline: 1.5px solid rgba(120,220,255,0.9) !important; outline-offset: 1px !important; cursor: crosshair !important; box-shadow: 0 0 12px rgba(120,220,255,0.3) !important; }
        .__designer_selected { outline: 2px solid rgba(139,92,246,0.9) !important; outline-offset: 1px !important; box-shadow: 0 0 16px rgba(139,92,246,0.4) !important; }
      `;
      document.head.appendChild(styleEl);
    }

    // Find a layer node that matches a DOM element by identity (same element reference)
    const findLayerByElement = (layers: LayerNode[], target: HTMLElement): LayerNode | null => {
      for (const layer of layers) {
        if (layer.element === target) return layer;
        const found = findLayerByElement(layer.children, target);
        if (found) return found;
      }
      return null;
    };

    const handleClick = (e: Event) => {
      try {
        const t = e.target as HTMLElement;
        if (!t || t === canvas || t.id?.startsWith("__designer") || t.closest("[data-designer-overlay]")) return;
        e.preventDefault(); e.stopPropagation();

        // Try to find the exact layer matching the clicked element
        let matched = findLayerByElement(pageLayers, t);
        // If not found, walk up the DOM to find a parent that IS in the layer tree
        if (!matched) {
          let parent = t.parentElement;
          while (parent && parent !== canvas) {
            matched = findLayerByElement(pageLayers, parent);
            if (matched) break;
            parent = parent.parentElement;
          }
        }
        if (matched) selectLayer(matched);
      } catch { /* safe */ }
    };

    const handleMouseOver = (e: Event) => {
      try {
        const t = e.target as HTMLElement;
        if (!t || t === canvas || t.id?.startsWith("__designer") || t.closest("[data-designer-overlay]")) return;
        canvas?.querySelectorAll(".__designer_hover").forEach((n) => n.classList.remove("__designer_hover"));
        t.classList.add("__designer_hover");
        const { icon, label } = extractLabel(t);
        setHoveredSelector(`${icon} ${label}`);
      } catch { /* safe */ }
    };
    const handleMouseOut = () => { try { setHoveredSelector(null); } catch { /* safe */ } };

    canvas.addEventListener("mouseover", handleMouseOver);
    canvas.addEventListener("mouseout", handleMouseOut);
    canvas.addEventListener("click", handleClick, true);
    return () => {
      canvas.removeEventListener("mouseover", handleMouseOver);
      canvas.removeEventListener("mouseout", handleMouseOut);
      canvas.removeEventListener("click", handleClick, true);
    };
  }, [activePage, pageLayers, selectLayer]);

  // ── Build the tree when the page changes (deferred to allow rendering) ──
  // Also reset expanded nodes + selection on page switch.
  useEffect(() => {
    // Use a microtask to reset state, then build the tree on timers
    Promise.resolve().then(() => {
      setExpandedNodes({});
      setSelectedLayer(null);
      setSelectedElement(null);
      setHoveredNavId(null);
    });
    const timers: ReturnType<typeof setTimeout>[] = [];
    [100, 300, 600, 1000].forEach((d) => timers.push(setTimeout(() => buildTreeFromDOM(), d)));
    return () => timers.forEach(clearTimeout);
  }, [activePage, buildTreeFromDOM]);

  // ── Nav hover → highlight element on canvas ──
  const handleNavHover = (id: string | null) => {
    setHoveredNavId(id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.querySelectorAll(".__designer_hover").forEach((n) => n.classList.remove("__designer_hover"));
    if (id) {
      const layer = findLayerById(pageLayers, id);
      if (layer?.element) layer.element.classList.add("__designer_hover");
    }
  };

  // ── Nav click → select the layer (bidirectional sync) ──
  const handleNavClick = (node: LayerNode) => selectLayer(node);

  const activePageOption = PAGES.find((p) => p.id === activePage)!;
  const toggleSection = (id: string) => setSections((p) => ({ ...p, [id]: !p[id] }));
  const showTypography = selectedLayer?.isText ?? false;
  const showAdvancedLayout = selectedLayer?.isContainer ?? false;
  void styleVersion;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full h-full overflow-hidden bg-axiom-void relative" style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ══ LEFT COLUMN ══ */}
      <AnimatePresence initial={false}>
        {!leftColumnCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0 flex flex-col border-r border-axiom-edge/40 bg-axiom-deep/60 overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {/* Page Selector */}
            <div className="p-3 border-b border-axiom-edge/40">
              <label className="text-[9px] uppercase tracking-[0.2em] text-axiom-dim block mb-1.5">Select Page</label>
              <div className="relative">
                <button
                  onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-md bg-axiom-panel/60 border border-axiom-violet/30 text-xs text-axiom-text hover:border-axiom-violet/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <activePageOption.icon className="w-3.5 h-3.5 text-axiom-violet" />
                    <span className="font-medium">{activePageOption.label}</span>
                  </span>
                  <ChevronDown className={cn("w-3 h-3 text-axiom-dim transition-transform", pageDropdownOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {pageDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPageDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute z-50 mt-1 w-full bg-axiom-panel/95 backdrop-blur-xl border border-axiom-violet/40 rounded-md shadow-2xl py-1"
                      >
                        {PAGES.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setActivePage(p.id); setPageDropdownOpen(false); handleReset(); }}
                            className={cn(
                              "w-full px-2.5 py-1.5 text-xs flex items-center gap-2 text-left transition-colors",
                              p.id === activePage ? "bg-axiom-violet/15 text-axiom-violet" : "text-axiom-text/80 hover:bg-axiom-cyan/10 hover:text-axiom-cyan",
                            )}
                          >
                            <p.icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {/* HTML Navigator — renders from dynamic DOM scan */}
            <div className="px-3 py-2 border-b border-axiom-edge/40 flex items-center gap-2">
              <TreePine className="w-3.5 h-3.5 text-axiom-emerald" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium">HTML Navigator</span>
            </div>
            <div className="html-navigator-container flex-1 overflow-y-auto axiom-scroll p-1.5" style={{ minHeight: 0 }}>
              {pageLayers.map((node) => (
                <NavLayerItem key={node.id} node={node} depth={0}
                  selectedId={selectedLayer?.id ?? null} hoveredId={hoveredNavId}
                  onHover={handleNavHover} onClick={handleNavClick}
                  expandedNodes={expandedNodes} setExpanded={(id, val) => setExpandedNodes((p) => ({ ...p, [id]: val }))} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left collapse toggle */}
      <button
        onClick={() => setLeftColumnCollapsed(!leftColumnCollapsed)}
        className="shrink-0 w-5 flex items-center justify-center bg-axiom-deep/60 border-r border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:bg-axiom-panel/60 transition-colors"
        title={leftColumnCollapsed ? "Show left panel" : "Hide left panel"}
      >
        {leftColumnCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* ══ CENTER COLUMN ══ */}
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0, overflow: "hidden" }}>
        <div className="h-8 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-deep/40 shrink-0">
          <div className="flex items-center gap-2">
            <Crosshair className="w-3 h-3 text-axiom-violet" />
            <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Live Preview — {activePageOption.label}</span>
          </div>
          {hoveredSelector && (
            <span className="text-[10px] font-mono text-axiom-cyan bg-axiom-cyan/10 px-2 py-0.5 rounded">{hoveredSelector}</span>
          )}
        </div>
        <div ref={canvasRef} className="flex-1 relative min-h-0 overflow-auto bg-axiom-void" data-designer-canvas>
          <div key={activePage} className="h-full">{renderPage(activePage)}</div>
          <div data-designer-overlay className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-md bg-axiom-panel/70 backdrop-blur-sm border border-axiom-violet/20 text-[9px] text-axiom-dim uppercase tracking-wider pointer-events-none">
            <MousePointer2 className="w-2.5 h-2.5 text-axiom-violet" />
            <span>Click to inspect</span>
          </div>
        </div>
      </div>

      {/* Right collapse toggle */}
      <button
        onClick={() => setRightColumnCollapsed(!rightColumnCollapsed)}
        className="shrink-0 w-5 flex items-center justify-center bg-axiom-deep/60 border-l border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:bg-axiom-panel/60 transition-colors"
        title={rightColumnCollapsed ? "Show right panel" : "Hide right panel"}
      >
        {rightColumnCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ══ RIGHT COLUMN ══ */}
      <AnimatePresence initial={false}>
        {!rightColumnCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0 flex flex-col border-l border-axiom-edge/40 bg-axiom-deep/60 overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-axiom-edge/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-axiom-violet" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium">Styles</span>
                {changedCount > 0 && (
                  <span className="text-[8px] text-axiom-cyan bg-axiom-cyan/10 px-1.5 py-0.5 rounded-full border border-axiom-cyan/30">{changedCount} changed</span>
                )}
                {savedFlash && (
                  <span className="text-[8px] text-axiom-emerald bg-axiom-emerald/10 px-1.5 py-0.5 rounded-full border border-axiom-emerald/30 flex items-center gap-0.5">
                    <Check className="w-2 h-2" /> Saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {selectedElement && changedCount > 0 && (
                  <button onClick={saveAllStyles} className="text-[9px] text-axiom-emerald hover:text-axiom-cyan flex items-center gap-1 transition-colors px-2 py-0.5 rounded border border-axiom-emerald/40 hover:border-axiom-cyan/40 bg-axiom-emerald/10 hover:bg-axiom-cyan/10 font-medium" title="Apply Changes">
                    {savedFlash ? <Check className="w-2.5 h-2.5" /> : <Save className="w-2.5 h-2.5" />}
                    {savedFlash ? "Applied" : "Apply"}
                  </button>
                )}
                {selectedElement && changedCount > 0 && (
                  <button onClick={resetAllOverrides} className="text-[9px] text-axiom-amber hover:text-axiom-rose flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded border border-axiom-amber/30 hover:border-axiom-rose/40" title="Reset all">
                    <RotateCcw className="w-2.5 h-2.5" /> Reset All
                  </button>
                )}
                {selectedElement && (
                  <button onClick={handleReset} className="text-[9px] text-axiom-dim hover:text-axiom-rose transition-colors">Clear</button>
                )}
              </div>
            </div>
            {/* Selected element info */}
            <div className="px-3 py-2 border-b border-axiom-edge/40 bg-axiom-panel/20 shrink-0">
              {selectedElement ? (
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-axiom-violet shrink-0" />
                  <span className="text-[11px] font-mono text-axiom-violet font-medium truncate">{selectedElement.selector}</span>
                  {showTypography && <span className="text-[8px] text-axiom-cyan bg-axiom-cyan/10 px-1 rounded">TEXT</span>}
                  {showAdvancedLayout && <span className="text-[8px] text-axiom-emerald bg-axiom-emerald/10 px-1 rounded">BOX</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] text-axiom-dim">
                  <Unlock className="w-3 h-3" />
                  <span>Click a layer to inspect.</span>
                </div>
              )}
            </div>

            {/* ── Scrollable Styles Panel ── */}
            <div className="flex-1 overflow-y-auto axiom-scroll" style={{ minHeight: 0 }}>
              {/* A. SELECTOR CLASSES & STATE */}
              <StyleSection label="Selector Classes & State" icon={Tag} open={sections.classes} onToggle={() => toggleSection("classes")}>
                <div className="space-y-2.5">
                  {selectedElement?.className ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedElement.className.split(/\s+/).filter(Boolean).map((cls, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-axiom-violet/15 border border-axiom-violet/40 text-[10px] font-mono text-axiom-violet">.{cls}</span>
                      ))}
                    </div>
                  ) : <p className="text-[10px] text-axiom-dim italic">{selectedElement ? "No classes." : "Select a layer."}</p>}
                  <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                    <span className="text-[10px] uppercase tracking-wider text-axiom-dim">State</span>
                    <select value={activeState} disabled={!selectedElement} onChange={(e) => setActiveState(e.target.value as any)} className="w-full bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 text-[11px] text-axiom-text focus:outline-none focus:border-axiom-violet/40 disabled:cursor-not-allowed">
                      <option value="normal">Normal</option><option value="hover">Hover</option><option value="focus">Focus</option><option value="active">Active</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2 p-1.5 rounded bg-axiom-panel/40 border border-axiom-edge/40 hover:border-axiom-violet/40 transition-colors">
                    <button type="button" onClick={() => setGlobalSync(!globalSync)} className={cn("w-8 h-4 rounded-full transition-colors relative shrink-0", globalSync ? "bg-axiom-violet/60" : "bg-axiom-edge/40")}>
                      <span className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", globalSync ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                    <span className="text-[10px] text-axiom-text/80 leading-tight">Global Sync<span className="block text-[8px] text-axiom-dim">Apply to all elements with this class</span></span>
                    {globalSync && <span className="ml-auto text-[8px] text-axiom-violet uppercase tracking-wider font-medium">ON</span>}
                  </label>
                </div>
              </StyleSection>

              {/* B. ELEMENT CONTENT */}
              <StyleSection label="Element Content" icon={FileText} open={sections.content} onToggle={() => toggleSection("content")}>
                <div className="space-y-1.5">
                  {selectedElement ? (
                    <>
                      <span className="text-[9px] text-axiom-dim uppercase tracking-wider">&lt;{selectedElement.tagName}&gt; text content</span>
                      <textarea value={elementContent} onChange={(e) => updateElementContent(e.target.value)} placeholder="Type to edit text…" rows={3} className="w-full bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1.5 text-[11px] text-axiom-text focus:outline-none focus:border-axiom-violet/40 resize-none font-mono" />
                    </>
                  ) : <p className="text-[10px] text-axiom-dim italic">Select a layer to edit content.</p>}
                </div>
              </StyleSection>

              {/* C. LAYOUT & POSITIONING */}
              <StyleSection label="Layout & Positioning" icon={Square} open={sections.layout} onToggle={() => toggleSection("layout")}>
                <div className="space-y-3">
                  <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                    <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Display</span>
                    <div className="grid grid-cols-5 gap-1">
                      {["block", "flex", "grid", "inline-block", "none"].map((d) => (
                        <button key={d} onClick={() => applyStyle("display", d)} disabled={!selectedElement} className={cn("py-1 rounded text-[8px] border transition-colors disabled:cursor-not-allowed truncate", selectedElement?.computedStyles["display"] === d ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-text")}>{d === "inline-block" ? "i-block" : d}</button>
                      ))}
                    </div>
                  </div>
                  {(showAdvancedLayout || selectedElement?.computedStyles["display"] === "flex" || selectedElement?.computedStyles["display"] === "grid") && (
                    <div className="space-y-2 p-2 rounded bg-axiom-panel/20 border border-axiom-edge/30">
                      <div className="text-[9px] uppercase tracking-wider text-axiom-emerald/80">Flex / Grid Controls</div>
                      <div className="grid grid-cols-2 gap-2">
                        <SelectControl label="Direction" value={selectedElement?.computedStyles["flex-direction"] || "row"} disabled={!selectedElement} onChange={(v) => applyStyle("flex-direction", v)} options={[{ v: "row", l: "Row" }, { v: "column", l: "Column" }, { v: "row-reverse", l: "Row Rev" }, { v: "column-reverse", l: "Col Rev" }]} changed={isChanged("flex-direction")} onReset={() => resetProperty("flex-direction")} />
                        <SelectControl label="Align Items" value={selectedElement?.computedStyles["align-items"] || "stretch"} disabled={!selectedElement} onChange={(v) => applyStyle("align-items", v)} options={[{ v: "flex-start", l: "Start" }, { v: "center", l: "Center" }, { v: "flex-end", l: "End" }, { v: "stretch", l: "Stretch" }]} changed={isChanged("align-items")} onReset={() => resetProperty("align-items")} />
                        <SelectControl label="Justify" value={selectedElement?.computedStyles["justify-content"] || "flex-start"} disabled={!selectedElement} onChange={(v) => applyStyle("justify-content", v)} options={[{ v: "flex-start", l: "Start" }, { v: "center", l: "Center" }, { v: "flex-end", l: "End" }, { v: "space-between", l: "Between" }]} changed={isChanged("justify-content")} onReset={() => resetProperty("justify-content")} />
                        <NumberControl label="Gap" value={parsePx(selectedElement?.computedStyles["gap"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("gap", `${v}px`)} changed={isChanged("gap")} onReset={() => resetProperty("gap")} />
                      </div>
                    </div>
                  )}
                  <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                    <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Position</span>
                    <div className="grid grid-cols-4 gap-1">
                      {["static", "relative", "absolute", "fixed"].map((p) => (
                        <button key={p} onClick={() => applyStyle("position", p)} disabled={!selectedElement} className={cn("py-1 rounded text-[8px] border transition-colors disabled:cursor-not-allowed", selectedElement?.computedStyles["position"] === p ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-text")}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberControl label="Top" value={parsePx(selectedElement?.computedStyles["top"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("top", `${v}px`)} changed={isChanged("top")} onReset={() => resetProperty("top")} />
                    <NumberControl label="Left" value={parsePx(selectedElement?.computedStyles["left"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("left", `${v}px`)} changed={isChanged("left")} onReset={() => resetProperty("left")} />
                    <NumberControl label="Right" value={parsePx(selectedElement?.computedStyles["right"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("right", `${v}px`)} changed={isChanged("right")} onReset={() => resetProperty("right")} />
                    <NumberControl label="Bottom" value={parsePx(selectedElement?.computedStyles["bottom"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("bottom", `${v}px`)} changed={isChanged("bottom")} onReset={() => resetProperty("bottom")} />
                  </div>
                  <SpacingControl label="Margin" top={parsePx(selectedElement?.computedStyles["margin-top"])} right={parsePx(selectedElement?.computedStyles["margin-right"])} bottom={parsePx(selectedElement?.computedStyles["margin-bottom"])} left={parsePx(selectedElement?.computedStyles["margin-left"])} disabled={!selectedElement} onChange={(s, v) => applyStyle(`margin-${s}`, `${v}px`)} changed={isChanged("margin-top") || isChanged("margin-right") || isChanged("margin-bottom") || isChanged("margin-left")} onReset={() => { resetProperty("margin-top"); resetProperty("margin-right"); resetProperty("margin-bottom"); resetProperty("margin-left"); }} />
                  <SpacingControl label="Padding" top={parsePx(selectedElement?.computedStyles["padding-top"])} right={parsePx(selectedElement?.computedStyles["padding-right"])} bottom={parsePx(selectedElement?.computedStyles["padding-bottom"])} left={parsePx(selectedElement?.computedStyles["padding-left"])} disabled={!selectedElement} onChange={(s, v) => applyStyle(`padding-${s}`, `${v}px`)} changed={isChanged("padding-top") || isChanged("padding-right") || isChanged("padding-bottom") || isChanged("padding-left")} onReset={() => { resetProperty("padding-top"); resetProperty("padding-right"); resetProperty("padding-bottom"); resetProperty("padding-left"); }} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberControl label="Width" value={parsePx(selectedElement?.computedStyles["width"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("width", `${v}px`)} changed={isChanged("width")} onReset={() => resetProperty("width")} />
                    <NumberControl label="Height" value={parsePx(selectedElement?.computedStyles["height"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("height", `${v}px`)} changed={isChanged("height")} onReset={() => resetProperty("height")} />
                    <NumberControl label="Min-W" value={parsePx(selectedElement?.computedStyles["min-width"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("min-width", `${v}px`)} changed={isChanged("min-width")} onReset={() => resetProperty("min-width")} />
                    <NumberControl label="Max-W" value={parsePx(selectedElement?.computedStyles["max-width"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("max-width", `${v}px`)} changed={isChanged("max-width")} onReset={() => resetProperty("max-width")} />
                  </div>
                </div>
              </StyleSection>

              {/* D. TYPOGRAPHY */}
              {showTypography && (
                <StyleSection label="Typography" icon={Type} open={sections.typography} onToggle={() => toggleSection("typography")}>
                  <div className="space-y-3">
                    <SelectControl label="Font Family" value={selectedElement?.computedStyles["font-family"] || "Inter, sans-serif"} disabled={!selectedElement} onChange={(v) => applyStyle("font-family", v)} options={[{ v: "Inter, sans-serif", l: "System (Inter)" }, { v: "'JetBrains Mono', monospace", l: "Monospace" }, { v: "Orbitron, sans-serif", l: "Sci-Fi (Orbitron)" }]} changed={isChanged("font-family")} onReset={() => resetProperty("font-family")} />
                    <div className="grid grid-cols-2 gap-2">
                      <SliderControl label="Font Size" value={parsePx(selectedElement?.computedStyles["font-size"])} min={8} max={48} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("font-size", `${v}px`)} changed={isChanged("font-size")} onReset={() => resetProperty("font-size")} />
                      <SliderControl label="Line Height" value={parseFloat(selectedElement?.computedStyles["line-height"] || "1.5") * 10} min={10} max={30} unit="" disabled={!selectedElement} onChange={(v) => applyStyle("line-height", `${(v / 10).toFixed(1)}`)} changed={isChanged("line-height")} onReset={() => resetProperty("line-height")} />
                    </div>
                    <SelectControl label="Font Weight" value={selectedElement?.computedStyles["font-weight"] || "400"} disabled={!selectedElement} onChange={(v) => applyStyle("font-weight", v)} options={[{ v: "100", l: "Thin (100)" }, { v: "300", l: "Light (300)" }, { v: "400", l: "Regular (400)" }, { v: "500", l: "Medium (500)" }, { v: "700", l: "Bold (700)" }, { v: "900", l: "Black (900)" }]} changed={isChanged("font-weight")} onReset={() => resetProperty("font-weight")} />
                    <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                      <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Text Transform</span>
                      <div className="grid grid-cols-4 gap-1">
                        {["none", "uppercase", "lowercase", "capitalize"].map((t) => (
                          <button key={t} onClick={() => applyStyle("text-transform", t)} disabled={!selectedElement} className={cn("py-1 rounded text-[8px] border transition-colors disabled:cursor-not-allowed truncate", selectedElement?.computedStyles["text-transform"] === t ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-text")}>{t === "none" ? "N" : t.slice(0, 3)}</button>
                        ))}
                      </div>
                    </div>
                    <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                      <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Text Align</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[{ v: "left", icon: AlignLeft }, { v: "center", icon: AlignCenter }, { v: "right", icon: AlignRight }, { v: "justify", icon: AlignJustify }].map((opt) => (
                          <button key={opt.v} onClick={() => applyStyle("text-align", opt.v)} disabled={!selectedElement} className={cn("py-1.5 rounded border transition-colors disabled:cursor-not-allowed flex items-center justify-center", selectedElement?.computedStyles["text-align"] === opt.v ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet" : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-text")}><opt.icon className="w-3 h-3" /></button>
                        ))}
                      </div>
                    </div>
                    <SliderControl label="Letter Spacing" value={parsePx(selectedElement?.computedStyles["letter-spacing"])} min={-2} max={10} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("letter-spacing", `${v}px`)} changed={isChanged("letter-spacing")} onReset={() => resetProperty("letter-spacing")} />
                  </div>
                </StyleSection>
              )}

              {/* E. APPEARANCE & STYLING */}
              <StyleSection label="Appearance & Styling" icon={Palette} open={sections.appearance} onToggle={() => toggleSection("appearance")}>
                <div className="space-y-3">
                  <ColorControl label="Background Color" value={rgbToHex(selectedElement?.computedStyles["background-color"] || "")} disabled={!selectedElement} onChange={(v) => applyStyle("background-color", v)} changed={isChanged("background-color")} onReset={() => resetProperty("background-color")} />
                  <div className={cn("space-y-1", !selectedElement && "opacity-50")}>
                    <span className="text-[10px] uppercase tracking-wider text-axiom-dim">Background Image URL</span>
                    <input type="text" placeholder="https://…" disabled={!selectedElement} className="w-full bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 text-[11px] text-axiom-text focus:outline-none focus:border-axiom-violet/40 disabled:cursor-not-allowed font-mono" onChange={(e) => applyStyle("background-image", `url(${e.target.value})`)} />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <NumberControl label="B-Width" value={parsePx(selectedElement?.computedStyles["border-width"])} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("border-width", `${v}px`)} changed={isChanged("border-width")} onReset={() => resetProperty("border-width")} />
                    <SelectControl label="B-Style" value={selectedElement?.computedStyles["border-style"] || "solid"} disabled={!selectedElement} onChange={(v) => applyStyle("border-style", v)} options={[{ v: "solid", l: "Solid" }, { v: "dashed", l: "Dashed" }, { v: "none", l: "None" }]} changed={isChanged("border-style")} onReset={() => resetProperty("border-style")} />
                  </div>
                  <ColorControl label="Border Color" value={rgbToHex(selectedElement?.computedStyles["border-color"] || "")} disabled={!selectedElement} onChange={(v) => applyStyle("border-color", v)} changed={isChanged("border-color")} onReset={() => resetProperty("border-color")} />
                  <SliderControl label="Border Radius" value={parsePx(selectedElement?.computedStyles["border-radius"])} min={0} max={50} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("border-radius", `${v}px`)} changed={isChanged("border-radius")} onReset={() => resetProperty("border-radius")} />
                  <SliderControl label="Opacity" value={selectedElement ? Math.round(parseFloat(selectedElement.computedStyles["opacity"] || "1") * 100) : 100} min={0} max={100} unit="%" disabled={!selectedElement} onChange={(v) => applyStyle("opacity", `${v / 100}`)} changed={isChanged("opacity")} onReset={() => resetProperty("opacity")} />
                </div>
              </StyleSection>

              {/* F. ADVANCED CYBER EFFECTS */}
              <StyleSection label="Advanced Cyber Effects" icon={Sparkles} open={sections.effects} onToggle={() => toggleSection("effects")}>
                <div className="space-y-3">
                  <SliderControl label="Glow Intensity" value={extractGlowIntensity(selectedElement?.computedStyles["box-shadow"] || "")} min={0} max={60} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("box-shadow", `0 0 ${v}px rgba(120,220,255,${Math.min(v / 60, 0.9).toFixed(2)})`)} changed={isChanged("box-shadow")} onReset={() => resetProperty("box-shadow")} />
                  <ColorControl label="Glow Color" value="#00f0ff" disabled={!selectedElement} onChange={(v) => applyStyle("box-shadow", `0 0 20px ${v}`)} changed={isChanged("box-shadow")} onReset={() => resetProperty("box-shadow")} />
                  <SliderControl label="Backdrop Blur" value={extractBlurPx(selectedElement?.computedStyles["backdrop-filter"] || "")} min={0} max={30} unit="px" disabled={!selectedElement} onChange={(v) => applyStyle("backdrop-filter", `blur(${v}px)`)} changed={isChanged("backdrop-filter")} onReset={() => resetProperty("backdrop-filter")} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberControl label="Transition" value={extractTransitionMs(selectedElement?.computedStyles["transition"] || "")} unit="ms" disabled={!selectedElement} onChange={(v) => applyStyle("transition", `all ${v}ms ease`)} changed={isChanged("transition")} onReset={() => resetProperty("transition")} />
                    <SelectControl label="Timing" value="ease" disabled={!selectedElement} onChange={(v) => applyStyle("transition", `all 200ms ${v}`)} options={[{ v: "ease", l: "Ease" }, { v: "linear", l: "Linear" }, { v: "ease-in", l: "Ease-In" }, { v: "ease-out", l: "Ease-Out" }]} changed={isChanged("transition")} onReset={() => resetProperty("transition")} />
                  </div>
                </div>
              </StyleSection>
            </div>

            {/* ── Code Inspector ── */}
            <div className="border-t border-axiom-edge/40 bg-axiom-deep/80 shrink-0 flex flex-col" style={{ height: 200, minHeight: 200 }}>
              <div className="h-7 border-b border-axiom-edge/40 flex items-center px-3 bg-axiom-panel/40 shrink-0">
                <Search className="w-3 h-3 text-axiom-violet mr-2" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-axiom-dim font-medium">Code Inspector</span>
              </div>
              <div className="flex-1 flex min-h-0">
                <div className={cn("min-w-0 flex flex-col border-r border-axiom-edge/40 transition-all", htmlBoxCollapsed ? "w-8" : "flex-1")}>
                  <div className="px-2 py-1 border-b border-axiom-edge/30 flex items-center gap-1.5 bg-axiom-panel/20 shrink-0">
                    <Code2 className="w-2.5 h-2.5 text-axiom-cyan shrink-0" />
                    {!htmlBoxCollapsed && <span className="text-[8px] uppercase tracking-wider text-axiom-cyan/80 font-medium">HTML</span>}
                    <button onClick={() => setHtmlBoxCollapsed(!htmlBoxCollapsed)} className="ml-auto text-axiom-dim hover:text-axiom-cyan transition-colors" title={htmlBoxCollapsed ? "Expand" : "Minimize"}>
                      {htmlBoxCollapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                  {!htmlBoxCollapsed && (
                    <pre className="flex-1 overflow-auto axiom-scroll p-2 text-[10px] font-mono leading-relaxed">
                      {selectedElement ? (
                        <code className="text-axiom-text/90 whitespace-pre-wrap break-words">
                          {buildHtmlSnippet(selectedElement, elementContent).split(/(<[^>]+>)/g).map((part, i) =>
                            part.startsWith("<") ? <span key={i} className="text-axiom-cyan">{part}</span> : <span key={i} className="text-axiom-text/70">{part}</span>,
                          )}
                        </code>
                      ) : <span className="text-axiom-dim italic text-[9px]">Select a layer.</span>}
                    </pre>
                  )}
                </div>
                <div className={cn("min-w-0 flex flex-col transition-all", cssBoxCollapsed ? "w-8" : "flex-1")}>
                  <div className="px-2 py-1 border-b border-axiom-edge/30 flex items-center gap-1.5 bg-axiom-panel/20 shrink-0">
                    <Braces className="w-2.5 h-2.5 text-axiom-violet shrink-0" />
                    {!cssBoxCollapsed && <span className="text-[8px] uppercase tracking-wider text-axiom-violet/80 font-medium">CSS</span>}
                    <button onClick={() => setCssBoxCollapsed(!cssBoxCollapsed)} className="ml-auto text-axiom-dim hover:text-axiom-violet transition-colors" title={cssBoxCollapsed ? "Expand" : "Minimize"}>
                      {cssBoxCollapsed ? <ChevronLeft className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                  {!cssBoxCollapsed && (
                    <pre className="flex-1 overflow-auto axiom-scroll p-2 text-[10px] font-mono leading-relaxed">
                      {selectedElement ? (
                        <code className="text-axiom-text/90 whitespace-pre-wrap break-words">
                          {buildCssRules(selectedElement).split("\n").map((line, i) => {
                            if (line.match(/^[.#\w-]+\s*\{/)) return <div key={i} className="text-axiom-violet font-medium">{line}</div>;
                            if (line.match(/^\s*[\w-]+:/)) { const ci = line.indexOf(":"); return <div key={i}><span className="text-axiom-cyan">{line.slice(0, ci)}</span><span className="text-axiom-text/70">{line.slice(ci)}</span></div>; }
                            return <div key={i} className="text-axiom-dim">{line || "\u00A0"}</div>;
                          })}
                        </code>
                      ) : <span className="text-axiom-dim italic text-[9px]">Select a layer.</span>}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════════════

function StyleSection({ label, icon: Icon, open, onToggle, children }: { label: string; icon: typeof Square; open: boolean; onToggle: () => void; children: React.ReactNode; }) {
  return (
    <div className="border-b border-axiom-edge/30">
      <button onClick={onToggle} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-axiom-panel/30 transition-colors">
        {open ? <ChevronDown className="w-3 h-3 text-axiom-dim" /> : <ChevronRight className="w-3 h-3 text-axiom-dim" />}
        <Icon className="w-3 h-3 text-axiom-violet" />
        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-text/80 font-medium flex-1 text-left">{label}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpacingControl({ label, top, right, bottom, left, disabled, onChange, changed, onReset }: { label: string; top: number; right: number; bottom: number; left: number; disabled: boolean; onChange: (s: "top" | "right" | "bottom" | "left", v: number) => void; changed?: boolean; onReset?: () => void; }) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50")}>
      <div className="flex items-center gap-1">
        <span className={cn("text-[10px] uppercase tracking-wider flex items-center gap-1", changed ? "text-axiom-cyan" : "text-axiom-dim")}>{label}{changed && <span className="w-1 h-1 rounded-full bg-axiom-cyan shadow-[0_0_4px_rgba(120,220,255,0.8)]" />}</span>
        {changed && onReset && <button onClick={onReset} className="ml-auto text-axiom-cyan hover:text-axiom-rose transition-colors"><RotateCcw className="w-2.5 h-2.5" /></button>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberInput label="T" value={top} disabled={disabled} onChange={(v) => onChange("top", v)} />
        <NumberInput label="R" value={right} disabled={disabled} onChange={(v) => onChange("right", v)} />
        <NumberInput label="B" value={bottom} disabled={disabled} onChange={(v) => onChange("bottom", v)} />
        <NumberInput label="L" value={left} disabled={disabled} onChange={(v) => onChange("left", v)} />
      </div>
    </div>
  );
}

function NumberInput({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (v: number) => void; }) {
  return (
    <div className="flex items-center gap-1 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-1.5 py-1 focus-within:border-axiom-violet/40">
      <span className="text-[9px] text-axiom-dim font-mono w-3">{label}</span>
      <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed" />
    </div>
  );
}

function NumberControl({ label, value, unit, disabled, onChange, changed, onReset }: { label: string; value: number; unit: string; disabled: boolean; onChange: (v: number) => void; changed?: boolean; onReset?: () => void; }) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center gap-1">
        <span className={cn("text-[10px] uppercase tracking-wider flex items-center gap-1", changed ? "text-axiom-cyan" : "text-axiom-dim")}>{label}{changed && <span className="w-1 h-1 rounded-full bg-axiom-cyan shadow-[0_0_4px_rgba(120,220,255,0.8)]" />}</span>
        {changed && onReset && <button onClick={onReset} className="ml-auto text-axiom-cyan hover:text-axiom-rose transition-colors"><RotateCcw className="w-2.5 h-2.5" /></button>}
      </div>
      <div className="flex items-center gap-1 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 focus-within:border-axiom-violet/40">
        <input type="number" value={value} disabled={disabled} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed" />
        <span className="text-[9px] text-axiom-dim">{unit}</span>
      </div>
    </div>
  );
}

function SelectControl({ label, value, disabled, onChange, options, changed, onReset }: { label: string; value: string; disabled: boolean; onChange: (v: string) => void; options: { v: string; l: string }[]; changed?: boolean; onReset?: () => void; }) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center gap-1">
        <span className={cn("text-[10px] uppercase tracking-wider flex items-center gap-1", changed ? "text-axiom-cyan" : "text-axiom-dim")}>{label}{changed && <span className="w-1 h-1 rounded-full bg-axiom-cyan shadow-[0_0_4px_rgba(120,220,255,0.8)]" />}</span>
        {changed && onReset && <button onClick={onReset} className="ml-auto text-axiom-cyan hover:text-axiom-rose transition-colors"><RotateCcw className="w-2.5 h-2.5" /></button>}
      </div>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 text-[11px] text-axiom-text focus:outline-none focus:border-axiom-violet/40 disabled:cursor-not-allowed">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function SliderControl({ label, value, min, max, unit, disabled, onChange, changed, onReset }: { label: string; value: number; min: number; max: number; unit: string; disabled: boolean; onChange: (v: number) => void; changed?: boolean; onReset?: () => void; }) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] uppercase tracking-wider flex items-center gap-1", changed ? "text-axiom-cyan" : "text-axiom-dim")}>{label}{changed && <span className="w-1 h-1 rounded-full bg-axiom-cyan shadow-[0_0_4px_rgba(120,220,255,0.8)]" />}</span>
        <div className="flex items-center gap-1">
          <span className={cn("text-[10px] font-mono", changed ? "text-axiom-cyan" : "text-axiom-violet")}>{value}{unit}</span>
          {changed && onReset && <button onClick={onReset} className="text-axiom-cyan hover:text-axiom-rose transition-colors"><RotateCcw className="w-2.5 h-2.5" /></button>}
        </div>
      </div>
      <input type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-axiom-panel/60 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-axiom-violet [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.6)] [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-axiom-violet [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
    </div>
  );
}

function ColorControl({ label, value, disabled, onChange, changed, onReset }: { label: string; value: string; disabled: boolean; onChange: (v: string) => void; changed?: boolean; onReset?: () => void; }) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center gap-1">
        <span className={cn("text-[10px] uppercase tracking-wider flex items-center gap-1", changed ? "text-axiom-cyan" : "text-axiom-dim")}>{label}{changed && <span className="w-1 h-1 rounded-full bg-axiom-cyan shadow-[0_0_4px_rgba(120,220,255,0.8)]" />}</span>
        {changed && onReset && <button onClick={onReset} className="ml-auto text-axiom-cyan hover:text-axiom-rose transition-colors"><RotateCcw className="w-2.5 h-2.5" /></button>}
      </div>
      <div className="flex items-center gap-2 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 focus-within:border-axiom-violet/40">
        <input type="color" value={value || "#0c0f12"} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 disabled:cursor-not-allowed" style={{ minWidth: 24 }} />
        <input type="text" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="#0c0f12" className="flex-1 w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function parsePx(val: string | undefined): number {
  if (!val) return 0;
  const m = val.match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function rgbToHex(color: string): string {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return "#0c0f12";
  if (color === "rgb(0, 0, 0)") return "#0c0f12";
  if (color.startsWith("#")) {
    if (color.length === 4) return "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    return color;
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return "#e5e7eb";
  return "#" + [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function extractGlowIntensity(boxShadow: string): number {
  if (!boxShadow || boxShadow === "none") return 0;
  const m = boxShadow.match(/0px\s+0px\s+(\d+)px/);
  if (m) return parseInt(m[1]);
  const m2 = boxShadow.match(/0\s+0\s+(\d+)/);
  return m2 ? parseInt(m2[1]) : 0;
}

function extractBlurPx(backdropFilter: string): number {
  if (!backdropFilter || backdropFilter === "none") return 0;
  const m = backdropFilter.match(/blur\((\d+)px\)/);
  return m ? parseInt(m[1]) : 0;
}

function extractTransitionMs(transition: string): number {
  if (!transition || transition === "all 0s ease 0s") return 200;
  const m = transition.match(/(\d+(?:\.\d+)?)ms/);
  if (m) return parseFloat(m[1]);
  const m2 = transition.match(/(\d+(?:\.\d+)?)s/);
  if (m2) return parseFloat(m2[1]) * 1000;
  return 200;
}

function buildHtmlSnippet(selected: SelectedElement, content: string): string {
  const tag = selected.tagName;
  const cls = selected.className ? ` class="${selected.className}"` : "";
  const text = content || "";
  const preview = text.length > 40 ? text.slice(0, 40) + "…" : text;
  return `<${tag}${cls}>${preview}</${tag}>`;
}

function buildCssRules(selected: SelectedElement): string {
  const entries = Object.entries(selected.inlineStyles);
  if (entries.length === 0) {
    return `${selected.selector} {\n  /* No modifications — drag a slider to begin */\n}`;
  }
  return `${selected.selector} {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
}

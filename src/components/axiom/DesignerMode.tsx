"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, ChevronDown, ChevronRight, MousePointer2,
  Type, Square, Sparkles, RotateCcw, Lock, Unlock, Crosshair,
  TreePine, Search, Code2, Braces, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  element: HTMLElement;
}

export interface DesignerModeProps {
  active: boolean;
  source: string;
  fileName: string;
  onToggle: () => void;
  onSourceChange: (newSource: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Designer Mode Toggle — glowing pill button
// ─────────────────────────────────────────────────────────────────────────────

export function DesignerModeToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all",
        active
          ? "bg-axiom-violet/20 border-axiom-violet/50 text-axiom-violet"
          : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40",
      )}
      style={
        active
          ? { boxShadow: "0 0 16px rgba(139,92,246,0.4), inset 0 0 8px rgba(139,92,246,0.1)" }
          : undefined
      }
      title="Toggle Webflow-style Visual Designer"
    >
      <Palette className={cn("w-3 h-3", active && "animate-pulse")} />
      <span className="uppercase tracking-wider">Designer Mode</span>
      {/* Glowing dot when active */}
      {active && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-axiom-violet">
          <span className="absolute inset-0 rounded-full bg-axiom-violet animate-ping" />
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Designer Preview Canvas — renders the source HTML with hover-to-select
// ─────────────────────────────────────────────────────────────────────────────

export function DesignerPreviewCanvas({
  source,
  fileName,
  selectedSelector,
  onSelectElement,
  iframeRef: externalIframeRef,
  onIframeReady,
}: {
  source: string;
  fileName: string;
  selectedSelector: string | null;
  onSelectElement: (sel: SelectedElement | null) => void;
  /** Optional external ref — when provided, the iframe is attached to it so
   *  parent components (Navigator, Inspector) can query the iframe's DOM. */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** Called after the iframe loads and handlers are attached. */
  onIframeReady?: () => void;
}) {
  const internalRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = externalIframeRef ?? internalRef;
  const [hoveredSelector, setHoveredSelector] = useState<string | null>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);

  // Build the HTML document to inject into the iframe.
  // We wrap the user's source in a basic HTML skeleton + inject a hover/outline
  // helper script. The source is treated as HTML (CSS files get rendered as text).
  const docHTML = useMemo(() => {
    const isCssFile = fileName.endsWith(".css");
    const isJsFile = fileName.endsWith(".js") || fileName.endsWith(".jsx") || fileName.endsWith(".ts") || fileName.endsWith(".tsx");

    if (isCssFile) {
      // For CSS files: render a preview page that uses the CSS
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${source}</style>
<style>
  body { background: transparent; font-family: ui-sans-serif, system-ui, sans-serif; padding: 16px; color: #e5e7eb; }
  .__designer_preview { padding: 16px; }
  .__designer_preview h1 { color: inherit; }
  .__designer_preview .demo-card { padding: 16px; margin: 8px 0; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
</style>
</head>
<body>
  <div class="__designer_preview">
    <h1>Demo Preview</h1>
    <p>This CSS file styles the elements below:</p>
    <div class="demo-card">.demo-card — styled by your CSS</div>
    <div class="demo-card">.demo-card — second instance</div>
    <button>Button element</button>
    <a href="#">Anchor link</a>
  </div>
</body>
</html>`;
    }

    if (isJsFile) {
      // For JS files: show a static preview of common Axiom OS components
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background: transparent; font-family: ui-sans-serif, system-ui, sans-serif; padding: 16px; color: #e5e7eb; margin: 0; }
  * { box-sizing: border-box; }
  .jarvis-orb { width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(120,220,255,0.6), rgba(120,220,255,0.1)); margin: 20px auto; border: 2px solid rgba(120,220,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #7dd3fc; }
  .chat-terminal { padding: 12px; background: rgba(20,20,30,0.6); border: 1px solid rgba(120,220,255,0.2); border-radius: 8px; margin: 12px 0; font-size: 12px; }
  .sidebar-item { padding: 8px 12px; margin: 2px 0; border-radius: 4px; background: rgba(255,255,255,0.04); font-size: 12px; }
  .neon-btn { padding: 8px 16px; background: rgba(120,220,255,0.15); border: 1px solid rgba(120,220,255,0.4); color: #7dd3fc; border-radius: 6px; cursor: pointer; font-size: 12px; margin: 4px; }
  .neon-btn:hover { background: rgba(120,220,255,0.25); }
</style>
</head>
<body>
  <div class="jarvis-orb">Jarvis Orb</div>
  <div class="chat-terminal">
    <div class="sidebar-item">Home</div>
    <div class="sidebar-item">Brain</div>
    <div class="sidebar-item">Agents</div>
  </div>
  <button class="neon-btn">Neon Button</button>
  <div class="sidebar-item">Standalone Item</div>
</body>
</html>`;
    }

    // Default: render the source as HTML
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background: transparent; font-family: ui-sans-serif, system-ui, sans-serif; padding: 16px; color: #e5e7eb; margin: 0; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${source}
</body>
</html>`;
  }, [source, fileName]);

  // Setup hover + click handlers inside the iframe once it loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const setupHandlers = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Inject designer overlay styles
      const styleEl = doc.createElement("style");
      styleEl.id = "__designer_overlay_styles";
      styleEl.textContent = `
        .__designer_hover { outline: 1.5px solid rgba(120,220,255,0.8) !important; outline-offset: 1px !important; cursor: crosshair !important; }
        .__designer_selected { outline: 2px solid rgba(139,92,246,0.9) !important; outline-offset: 1px !important; }
        * { pointer-events: auto !important; }
      `;
      doc.head.appendChild(styleEl);

      const allElements = doc.body.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        // Skip our own overlay elements
        if (htmlEl.id?.startsWith("__designer")) return;

        htmlEl.addEventListener("mouseenter", (e) => {
          e.stopPropagation();
          // Clear previous hover
          doc.querySelectorAll(".__designer_hover").forEach((n) => n.classList.remove("__designer_hover"));
          htmlEl.classList.add("__designer_hover");
          const selector = generateSelector(htmlEl);
          setHoveredSelector(selector);
          const rect = htmlEl.getBoundingClientRect();
          const iframeRect = iframe.getBoundingClientRect();
          setHoveredRect({
            ...rect,
            top: rect.top + iframeRect.top,
            left: rect.left + iframeRect.left,
          } as DOMRect);
        });

        htmlEl.addEventListener("mouseleave", (e) => {
          e.stopPropagation();
          htmlEl.classList.remove("__designer_hover");
          setHoveredSelector(null);
          setHoveredRect(null);
        });

        htmlEl.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Clear previous selection
          doc.querySelectorAll(".__designer_selected").forEach((n) => n.classList.remove("__designer_selected"));
          htmlEl.classList.add("__designer_selected");
          const selector = generateSelector(htmlEl);
          const computed = doc.defaultView?.getComputedStyle(htmlEl);
          const inline = htmlEl.style.cssText
            ? htmlEl.style.cssText.split(";").reduce<Record<string, string>>((acc, decl) => {
                const [k, v] = decl.split(":").map((s) => s?.trim());
                if (k && v) acc[k] = v;
                return acc;
              }, {})
            : {};
          const computedRecord: Record<string, string> = {};
          if (computed) {
            computedRecord["margin-top"] = computed.marginTop || "";
            computedRecord["margin-right"] = computed.marginRight || "";
            computedRecord["margin-bottom"] = computed.marginBottom || "";
            computedRecord["margin-left"] = computed.marginLeft || "";
            computedRecord["padding-top"] = computed.paddingTop || "";
            computedRecord["padding-right"] = computed.paddingRight || "";
            computedRecord["padding-bottom"] = computed.paddingBottom || "";
            computedRecord["padding-left"] = computed.paddingLeft || "";
            computedRecord["font-size"] = computed.fontSize || "";
            computedRecord["opacity"] = computed.opacity || "";
            computedRecord["color"] = computed.color || "";
            computedRecord["border-color"] = computed.borderColor || "";
            computedRecord["box-shadow"] = computed.boxShadow || "";
            computedRecord["transition"] = computed.transition || "";
            computedRecord["width"] = computed.width || "";
            computedRecord["height"] = computed.height || "";
          }
          const rect = htmlEl.getBoundingClientRect();
          const iframeRect = iframe.getBoundingClientRect();
          setSelectedRect({
            ...rect,
            top: rect.top + iframeRect.top,
            left: rect.left + iframeRect.left,
          } as DOMRect);
          onSelectElement({
            selector,
            tagName: htmlEl.tagName.toLowerCase(),
            className: htmlEl.className || "",
            id: htmlEl.id || "",
            inlineStyles: inline,
            computedStyles: computedRecord,
            element: htmlEl,
          });
        });
      });
    };

    const handleLoad = () => {
      setupHandlers();
      onIframeReady?.();
    };
    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [docHTML, onSelectElement, onIframeReady]);

  // Re-render iframe when source changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = docHTML;
  }, [docHTML]);

  return (
    <div className="relative flex-1 min-h-0 bg-axiom-void/40 overflow-hidden">
      {/* Top label bar */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2 px-2 py-1 rounded-md bg-axiom-panel/80 backdrop-blur-sm border border-axiom-violet/30 text-[10px] text-axiom-dim uppercase tracking-wider">
        <Crosshair className="w-3 h-3 text-axiom-violet" />
        <span>Hover + click to inspect</span>
      </div>

      {/* The iframe */}
      <iframe
        ref={iframeRef}
        title="designer-preview"
        className="w-full h-full bg-transparent border-0"
        sandbox="allow-same-origin"
      />

      {/* Hover tag (floating) */}
      {hoveredSelector && hoveredRect && (
        <div
          className="absolute z-30 pointer-events-none px-2 py-0.5 rounded bg-axiom-cyan/90 text-axiom-void text-[10px] font-mono font-medium shadow-lg"
          style={{
            top: Math.max(hoveredRect.top - 22, 4),
            left: hoveredRect.left,
          }}
        >
          {hoveredSelector}
        </div>
      )}

      {/* Selection tag (floating, violet) */}
      {selectedSelector && selectedRect && (
        <div
          className="absolute z-30 pointer-events-none px-2 py-0.5 rounded bg-axiom-violet/90 text-white text-[10px] font-mono font-medium shadow-lg flex items-center gap-1"
          style={{
            top: Math.max(selectedRect.top - 22, 4),
            left: selectedRect.left,
          }}
        >
          <Lock className="w-2.5 h-2.5" />
          {selectedSelector}
        </div>
      )}
    </div>
  );
}

// Generate a CSS selector for an element (class > id > tag)
function generateSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const classes = el.className
    .split(/\s+/)
    .filter((c) => c && !c.startsWith("__designer"))
    .map((c) => `.${c}`)
    .join("");
  if (classes) return classes || el.tagName.toLowerCase();
  return el.tagName.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Webflow Style Panel — the right sidebar with collapsible sections
// ─────────────────────────────────────────────────────────────────────────────

export function WebflowStylePanel({
  selected,
  onApplyStyle,
  onReset,
}: {
  selected: SelectedElement | null;
  onApplyStyle: (property: string, value: string) => void;
  onReset: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    typography: true,
    effects: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract numeric value from a CSS string (e.g., "16px" → 16)
  const parsePx = (val: string | undefined): number => {
    if (!val) return 0;
    const m = val.match(/(-?\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };

  return (
    <aside className="w-80 border-l border-axiom-edge/40 bg-axiom-deep/60 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-axiom-edge/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-axiom-violet" />
          <span className="text-xs uppercase tracking-[0.2em] text-axiom-dim">
            Styles
          </span>
        </div>
        {selected && (
          <button
            onClick={onReset}
            className="text-[10px] text-axiom-dim hover:text-axiom-rose flex items-center gap-1 transition-colors"
            title="Clear selection"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Selected element info */}
      <div className="p-3 border-b border-axiom-edge/40 bg-axiom-panel/30">
        {selected ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-3 h-3 text-axiom-violet" />
              <span className="text-xs font-mono text-axiom-violet font-medium">
                {selected.selector}
              </span>
            </div>
            <div className="text-[10px] text-axiom-dim">
              &lt;{selected.tagName}&gt; · {selected.className || "no class"}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-axiom-dim">
            <Unlock className="w-3 h-3" />
            <span>Click an element in the preview to inspect.</span>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto axiom-scroll">
        {/* ── LAYOUT & SPACING ── */}
        <Section
          id="layout"
          label="Layout & Spacing"
          icon={Square}
          open={openSections.layout}
          onToggle={() => toggleSection("layout")}
        >
          <div className="space-y-3">
            <SpacingControl
              label="Margin"
              top={parsePx(selected?.computedStyles["margin-top"])}
              right={parsePx(selected?.computedStyles["margin-right"])}
              bottom={parsePx(selected?.computedStyles["margin-bottom"])}
              left={parsePx(selected?.computedStyles["margin-left"])}
              disabled={!selected}
              onChange={(side, val) => onApplyStyle(`margin-${side}`, `${val}px`)}
            />
            <SpacingControl
              label="Padding"
              top={parsePx(selected?.computedStyles["padding-top"])}
              right={parsePx(selected?.computedStyles["padding-right"])}
              bottom={parsePx(selected?.computedStyles["padding-bottom"])}
              left={parsePx(selected?.computedStyles["padding-left"])}
              disabled={!selected}
              onChange={(side, val) => onApplyStyle(`padding-${side}`, `${val}px`)}
            />
            <div className="grid grid-cols-2 gap-2">
              <NumberControl
                label="Width"
                value={parsePx(selected?.computedStyles["width"])}
                unit="px"
                disabled={!selected}
                onChange={(val) => onApplyStyle("width", `${val}px`)}
              />
              <NumberControl
                label="Height"
                value={parsePx(selected?.computedStyles["height"])}
                unit="px"
                disabled={!selected}
                onChange={(val) => onApplyStyle("height", `${val}px`)}
              />
            </div>
          </div>
        </Section>

        {/* ── TYPOGRAPHY & COLORS ── */}
        <Section
          id="typography"
          label="Typography & Colors"
          icon={Type}
          open={openSections.typography}
          onToggle={() => toggleSection("typography")}
        >
          <div className="space-y-3">
            <SliderControl
              label="Font Size"
              value={parsePx(selected?.computedStyles["font-size"])}
              min={8}
              max={48}
              unit="px"
              disabled={!selected}
              onChange={(val) => onApplyStyle("font-size", `${val}px`)}
            />
            <SliderControl
              label="Opacity"
              value={selected ? Math.round(parseFloat(selected.computedStyles["opacity"] || "1") * 100) : 100}
              min={0}
              max={100}
              unit="%"
              disabled={!selected}
              onChange={(val) => onApplyStyle("opacity", `${val / 100}`)}
            />
            <ColorControl
              label="Text Color"
              value={rgbToHex(selected?.computedStyles["color"] || "")}
              disabled={!selected}
              onChange={(val) => onApplyStyle("color", val)}
            />
            <ColorControl
              label="Border Color"
              value={rgbToHex(selected?.computedStyles["border-color"] || "")}
              disabled={!selected}
              onChange={(val) => onApplyStyle("border-color", val)}
            />
            <ColorControl
              label="Background"
              value={rgbToHex(selected?.computedStyles["background-color"] || "")}
              disabled={!selected}
              onChange={(val) => onApplyStyle("background-color", val)}
            />
          </div>
        </Section>

        {/* ── EFFECTS ── */}
        <Section
          id="effects"
          label="Effects"
          icon={Sparkles}
          open={openSections.effects}
          onToggle={() => toggleSection("effects")}
        >
          <div className="space-y-3">
            <SliderControl
              label="Glow Intensity"
              value={selected ? extractGlowIntensity(selected.computedStyles["box-shadow"] || "") : 0}
              min={0}
              max={60}
              unit="px"
              disabled={!selected}
              onChange={(val) => onApplyStyle("box-shadow", `0 0 ${val}px rgba(120,220,255,${Math.min(val / 60, 0.9).toFixed(2)})`)}
            />
            <SliderControl
              label="Transition Speed"
              value={extractTransitionMs(selected?.computedStyles["transition"] || "")}
              min={0}
              max={1000}
              unit="ms"
              disabled={!selected}
              onChange={(val) => onApplyStyle("transition", `all ${val}ms cubic-bezier(0.4,0,0.2,1)`)}
            />
            <SliderControl
              label="Border Radius"
              value={parsePx(selected?.computedStyles["border-radius"] || "0px")}
              min={0}
              max={50}
              unit="px"
              disabled={!selected}
              onChange={(val) => onApplyStyle("border-radius", `${val}px`)}
            />
            <SliderControl
              label="Border Width"
              value={parsePx(selected?.computedStyles["border-width"] || "0px")}
              min={0}
              max={10}
              unit="px"
              disabled={!selected}
              onChange={(val) => onApplyStyle("border-width", `${val}px`)}
            />
          </div>
        </Section>
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t border-axiom-edge/40 text-[9px] text-axiom-dim leading-relaxed">
        Changes apply inline + rewrite the active CSS file.
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  id, label, icon: Icon, open, onToggle, children,
}: {
  id: string;
  label: string;
  icon: typeof Square;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-axiom-edge/30">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-axiom-panel/30 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-axiom-dim" />
        ) : (
          <ChevronRight className="w-3 h-3 text-axiom-dim" />
        )}
        <Icon className="w-3 h-3 text-axiom-violet" />
        <span className="text-[10px] uppercase tracking-[0.15em] text-axiom-text/80 font-medium flex-1 text-left">
          {label}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpacingControl({
  label, top, right, bottom, left, disabled, onChange,
}: {
  label: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
  disabled: boolean;
  onChange: (side: "top" | "right" | "bottom" | "left", val: number) => void;
}) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50")}>
      <div className="text-[10px] uppercase tracking-wider text-axiom-dim">{label}</div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberInput label="T" value={top} disabled={disabled} onChange={(v) => onChange("top", v)} />
        <NumberInput label="R" value={right} disabled={disabled} onChange={(v) => onChange("right", v)} />
        <NumberInput label="B" value={bottom} disabled={disabled} onChange={(v) => onChange("bottom", v)} />
        <NumberInput label="L" value={left} disabled={disabled} onChange={(v) => onChange("left", v)} />
      </div>
    </div>
  );
}

function NumberInput({
  label, value, disabled, onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-1.5 py-1 focus-within:border-axiom-violet/40">
      <span className="text-[9px] text-axiom-dim font-mono w-3">{label}</span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed"
      />
    </div>
  );
}

function NumberControl({
  label, value, unit, disabled, onChange,
}: {
  label: string;
  value: number;
  unit: string;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="text-[10px] uppercase tracking-wider text-axiom-dim">{label}</div>
      <div className="flex items-center gap-1 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 focus-within:border-axiom-violet/40">
        <input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed"
        />
        <span className="text-[9px] text-axiom-dim">{unit}</span>
      </div>
    </div>
  );
}

function SliderControl({
  label, value, min, max, unit, disabled, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-axiom-dim">{label}</span>
        <span className="text-[10px] font-mono text-axiom-violet">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-axiom-panel/60 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-axiom-violet
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.6)]
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-axiom-violet [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

function ColorControl({
  label, value, disabled, onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-50")}>
      <div className="text-[10px] uppercase tracking-wider text-axiom-dim">{label}</div>
      <div className="flex items-center gap-2 bg-axiom-panel/50 border border-axiom-edge/40 rounded px-2 py-1 focus-within:border-axiom-violet/40">
        <input
          type="color"
          value={value || "#000000"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 disabled:cursor-not-allowed"
          style={{ minWidth: 24 }}
        />
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 w-full bg-transparent text-[11px] text-axiom-text focus:outline-none font-mono disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function rgbToHex(rgb: string): string {
  if (!rgb) return "#000000";
  if (rgb.startsWith("#")) return rgb;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  const r = parseInt(m[1]);
  const g = parseInt(m[2]);
  const b = parseInt(m[3]);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function extractGlowIntensity(boxShadow: string): number {
  if (!boxShadow || boxShadow === "none") return 0;
  const m = boxShadow.match(/0px\s+0px\s+(\d+)px/);
  if (m) return parseInt(m[1]);
  // Try generic first number after "0 0"
  const m2 = boxShadow.match(/0\s+0\s+(\d+)/);
  return m2 ? parseInt(m2[1]) : 0;
}

function extractTransitionMs(transition: string): number {
  if (!transition || transition === "all 0s ease 0s") return 0;
  const m = transition.match(/(\d+(?:\.\d+)?)ms/);
  if (m) return parseFloat(m[1]);
  const m2 = transition.match(/(\d+(?:\.\d+)?)s/);
  if (m2) return parseFloat(m2[1]) * 1000;
  return 200;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS Source Rewriter — updates the active file's CSS rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rewrites a CSS property value inside the source string for a given selector.
 * If the selector block exists, the property is updated (or added if missing).
 * If the selector block doesn't exist, a new block is appended.
 */
export function rewriteCssInSource(
  source: string,
  selector: string,
  property: string,
  value: string,
): string {
  // Try to find the selector block. We match `selector { ... }` allowing for
  // multi-line blocks and nested braces (rare in CSS but possible).
  // Escape selector for regex
  const escSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRegex = new RegExp(`(${escSelector}\\s*\\{)([^}]*)(\\})`, "g");
  let updated = false;
  let newSource = source.replace(blockRegex, (_match, opening, body, closing) => {
    updated = true;
    const propRegex = new RegExp(`(\\s*)${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*[^;]+;?`, "g");
    if (propRegex.test(body)) {
      // Replace existing property
      const newBody = body.replace(propRegex, `$1${property}: ${value};`);
      return `${opening}${newBody}${closing}`;
    }
    // Append new property
    const trimmedBody = body.trimEnd();
    const needsNewline = trimmedBody.length > 0 && !trimmedBody.endsWith("\n");
    return `${opening}${trimmedBody}${needsNewline ? "\n  " : trimmedBody ? "  " : ""}${property}: ${value};\n${closing}`;
  });

  if (!updated) {
    // Append a new block at the end
    const newBlock = `\n\n${selector} {\n  ${property}: ${value};\n}\n`;
    newSource = source + newBlock;
  }

  return newSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Navigator — collapsible DOM tree sidebar (left side of canvas)
// ─────────────────────────────────────────────────────────────────────────────

interface DomNode {
  id: string;
  tagName: string;
  className: string;
  selector: string;
  depth: number;
  element: HTMLElement;
  children: DomNode[];
}

export function HtmlNavigator({
  iframeRef,
  selectedSelector,
  onSelectElement,
  refreshKey,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  selectedSelector: string | null;
  onSelectElement: (sel: SelectedElement | null) => void;
  /** Bump this to force a tree rebuild (e.g., after iframe reloads). */
  refreshKey: number;
}) {
  const [tree, setTree] = useState<DomNode[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build the DOM tree from the iframe's document
  const buildTree = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument?.body) return;

    const buildNode = (el: HTMLElement, depth: number): DomNode => {
      const selector = generateSelector(el);
      const id = `${selector}-${depth}-${el.tagName}-${Math.random().toString(36).slice(2, 6)}`;
      const children: DomNode[] = [];
      Array.from(el.children).forEach((child) => {
        const childEl = child as HTMLElement;
        if (
          childEl.id?.startsWith("__designer") ||
          ["SCRIPT", "STYLE", "LINK", "META"].includes(childEl.tagName)
        ) return;
        children.push(buildNode(childEl, depth + 1));
      });
      return {
        id,
        tagName: el.tagName.toLowerCase(),
        className: el.className || "",
        selector,
        depth,
        element: el,
        children,
      };
    };

    const body = iframe.contentDocument.body;
    // Skip body itself, start from its children
    const rootNodes = Array.from(body.children)
      .filter((child) => {
        const el = child as HTMLElement;
        return !el.id?.startsWith("__designer") && !["SCRIPT", "STYLE", "LINK", "META"].includes(el.tagName);
      })
      .map((child) => buildNode(child as HTMLElement, 0));
    setTree(rootNodes);
  }, [iframeRef]);

  useEffect(() => {
    buildTree();
  }, [buildTree, refreshKey]);

  // Hover handler — highlight the corresponding element in the iframe
  const handleHover = (node: DomNode | null) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    // Clear previous hover
    iframe.contentDocument
      .querySelectorAll(".__designer_hover")
      .forEach((n) => n.classList.remove("__designer_hover"));
    if (node) {
      node.element.classList.add("__designer_hover");
      setHoveredId(node.id);
    } else {
      setHoveredId(null);
    }
  };

  // Click handler — select the element
  const handleClick = (node: DomNode) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    // Clear previous selection
    iframe.contentDocument
      .querySelectorAll(".__designer_selected")
      .forEach((n) => n.classList.remove("__designer_selected"));
    node.element.classList.add("__designer_selected");

    // Build SelectedElement from the DOM node
    const computed = iframe.contentWindow?.getComputedStyle(node.element);
    const inline = node.element.style.cssText
      ? node.element.style.cssText.split(";").reduce<Record<string, string>>((acc, decl) => {
          const [k, v] = decl.split(":").map((s) => s?.trim());
          if (k && v) acc[k] = v;
          return acc;
        }, {})
      : {};
    const computedRecord: Record<string, string> = {};
    if (computed) {
      computedRecord["margin-top"] = computed.marginTop || "";
      computedRecord["margin-right"] = computed.marginRight || "";
      computedRecord["margin-bottom"] = computed.marginBottom || "";
      computedRecord["margin-left"] = computed.marginLeft || "";
      computedRecord["padding-top"] = computed.paddingTop || "";
      computedRecord["padding-right"] = computed.paddingRight || "";
      computedRecord["padding-bottom"] = computed.paddingBottom || "";
      computedRecord["padding-left"] = computed.paddingLeft || "";
      computedRecord["font-size"] = computed.fontSize || "";
      computedRecord["opacity"] = computed.opacity || "";
      computedRecord["color"] = computed.color || "";
      computedRecord["border-color"] = computed.borderColor || "";
      computedRecord["border-width"] = computed.borderWidth || "";
      computedRecord["border-radius"] = computed.borderRadius || "";
      computedRecord["background-color"] = computed.backgroundColor || "";
      computedRecord["box-shadow"] = computed.boxShadow || "";
      computedRecord["transition"] = computed.transition || "";
      computedRecord["width"] = computed.width || "";
      computedRecord["height"] = computed.height || "";
    }
    onSelectElement({
      selector: node.selector,
      tagName: node.tagName,
      className: node.className,
      id: node.element.id || "",
      inlineStyles: inline,
      computedStyles: computedRecord,
      element: node.element,
    });
  };

  const renderNode = (node: DomNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed[node.id];
    const isSelected = selectedSelector === node.selector;
    const isHovered = hoveredId === node.id;

    return (
      <div key={node.id}>
        <div
          onMouseEnter={() => handleHover(node)}
          onMouseLeave={() => handleHover(null)}
          onClick={() => handleClick(node)}
          className={cn(
            "flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer text-[11px] font-mono transition-colors group",
            isSelected
              ? "bg-axiom-violet/15 border border-axiom-violet/40 text-axiom-violet"
              : isHovered
                ? "bg-axiom-cyan/10 text-axiom-cyan"
                : "hover:bg-axiom-panel/40 text-axiom-text/70 border border-transparent",
          )}
          style={{ paddingLeft: node.depth * 12 + 4 }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
              }}
              className="w-3 h-3 flex items-center justify-center text-axiom-dim hover:text-axiom-text shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="w-2.5 h-2.5" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5" />
              )}
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span className="text-axiom-dim/60 shrink-0">&lt;</span>
          <span className={cn("shrink-0", isSelected ? "text-axiom-violet" : "text-axiom-cyan")}>
            {node.tagName}
          </span>
          {node.className && (
            <span className="text-axiom-amber/70 truncate">
              .{node.className.split(/\s+/).filter(Boolean).slice(0, 1).join(".")}
            </span>
          )}
          <span className="text-axiom-dim/60 shrink-0">&gt;</span>
        </div>
        {hasChildren && !isCollapsed && (
          <div>{node.children.map((child) => renderNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-56 border-r border-axiom-edge/40 bg-axiom-deep/60 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-2 border-b border-axiom-edge/40 flex items-center gap-2">
        <TreePine className="w-3.5 h-3.5 text-axiom-emerald" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium">
          Navigator
        </span>
        <button
          onClick={buildTree}
          className="ml-auto text-[9px] text-axiom-dim hover:text-axiom-cyan transition-colors"
          title="Refresh tree"
        >
          ↻
        </button>
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto axiom-scroll p-1.5">
        {tree.length === 0 ? (
          <p className="text-[10px] text-axiom-dim italic px-2 py-4 text-center">
            No elements. Load a file to see the DOM tree.
          </p>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
      {/* Footer */}
      <div className="p-1.5 border-t border-axiom-edge/40 text-[9px] text-axiom-dim">
        {tree.length} root node{tree.length === 1 ? "" : "s"}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Inspector — bottom split drawer (HTML source + CSS rules)
// ─────────────────────────────────────────────────────────────────────────────

export function LiveInspector({
  selected,
  source,
  isOpen,
  onToggle,
}: {
  selected: SelectedElement | null;
  source: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Extract the HTML source line for the selected element
  const htmlSnippet = useMemo(() => {
    if (!selected) return "";
    // Build a clean representation of the element's opening tag + immediate content
    const el = selected.element;
    const tempDiv = document.createElement("div");
    const clone = el.cloneNode(false) as HTMLElement; // shallow clone (no children)
    tempDiv.appendChild(clone);
    let openingTag = tempDiv.innerHTML;
    // If the element has children, add ellipsis + closing tag
    if (el.children.length > 0 || el.textContent?.trim()) {
      const textContent = el.textContent?.trim() ?? "";
      const innerPreview = textContent.length > 40 ? textContent.slice(0, 40) + "…" : textContent;
      openingTag = openingTag.replace(/<\/[^>]+>$/, "");
      return `${openingTag}${el.children.length > 0 ? "\n  …" : innerPreview}\n</${selected.tagName}>`;
    }
    return openingTag;
  }, [selected]);

  // Extract CSS rules for the selected selector from the source
  const cssRules = useMemo(() => {
    if (!selected) return "";
    // Find the selector block in source
    const escSelector = selected.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockRegex = new RegExp(`${escSelector}\\s*\\{([^}]*)\\}`, "g");
    const matches: string[] = [];
    let match;
    while ((match = blockRegex.exec(source)) !== null) {
      matches.push(match[1].trim());
    }
    if (matches.length === 0) {
      // No CSS block found — show inline styles if any
      const inlineEntries = Object.entries(selected.inlineStyles);
      if (inlineEntries.length === 0) return "/* No CSS rules found for this selector */";
      return `${selected.selector} {\n${inlineEntries.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
    }
    // Combine all matching blocks
    return matches
      .map((body, i) => `${selected.selector} {${i > 0 ? " /* matched block " + (i + 1) + " */" : ""}\n${body.split("\n").map((l) => "  " + l.trim()).filter(Boolean).join("\n")}\n}`)
      .join("\n\n");
  }, [selected, source]);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 200 }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="border-t border-axiom-edge/40 bg-axiom-deep/80 overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="h-8 border-b border-axiom-edge/40 flex items-center justify-between px-3 bg-axiom-panel/40">
            <div className="flex items-center gap-2">
              <Search className="w-3 h-3 text-axiom-violet" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-axiom-dim font-medium">
                Live Inspector
              </span>
              {selected && (
                <span className="text-[10px] font-mono text-axiom-violet ml-2">
                  {selected.selector}
                </span>
              )}
            </div>
            <button
              onClick={onToggle}
              className="text-[10px] text-axiom-dim hover:text-axiom-rose transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Split view: HTML (left) + CSS (right) */}
          <div className="flex h-[calc(100%-2rem)]">
            {/* HTML Source View */}
            <div className="flex-1 min-w-0 border-r border-axiom-edge/40 flex flex-col">
              <div className="px-3 py-1 border-b border-axiom-edge/30 flex items-center gap-1.5 bg-axiom-panel/20">
                <Code2 className="w-3 h-3 text-axiom-cyan" />
                <span className="text-[9px] uppercase tracking-wider text-axiom-cyan/80 font-medium">
                  HTML Source
                </span>
              </div>
              <pre className="flex-1 overflow-auto axiom-scroll p-3 text-[11px] font-mono leading-relaxed">
                {selected ? (
                  <code className="text-axiom-text/90 whitespace-pre-wrap break-words">
                    {htmlSnippet.split(/(<[^>]+>)/g).map((part, i) => {
                      if (part.startsWith("<")) {
                        return (
                          <span key={i} className="text-axiom-cyan">
                            {part}
                          </span>
                        );
                      }
                      return <span key={i} className="text-axiom-text/70">{part}</span>;
                    })}
                  </code>
                ) : (
                  <span className="text-axiom-dim italic text-[10px]">
                    Select an element to view its HTML source.
                  </span>
                )}
              </pre>
            </div>

            {/* CSS Rules View */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="px-3 py-1 border-b border-axiom-edge/30 flex items-center gap-1.5 bg-axiom-panel/20">
                <Braces className="w-3 h-3 text-axiom-violet" />
                <span className="text-[9px] uppercase tracking-wider text-axiom-violet/80 font-medium">
                  CSS Rules
                </span>
              </div>
              <pre className="flex-1 overflow-auto axiom-scroll p-3 text-[11px] font-mono leading-relaxed">
                {selected ? (
                  <code className="text-axiom-text/90 whitespace-pre-wrap break-words">
                    {cssRules.split("\n").map((line, i) => {
                      // Highlight selector lines, property names, and values
                      if (line.match(/^[.#\w-]+\s*\{/)) {
                        return (
                          <div key={i} className="text-axiom-violet font-medium">
                            {line}
                          </div>
                        );
                      }
                      if (line.match(/^\s*[\w-]+:/)) {
                        const colonIdx = line.indexOf(":");
                        const prop = line.slice(0, colonIdx);
                        const rest = line.slice(colonIdx);
                        return (
                          <div key={i}>
                            <span className="text-axiom-cyan">{prop}</span>
                            <span className="text-axiom-text/70">{rest}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="text-axiom-dim">
                          {line || "\u00A0"}
                        </div>
                      );
                    })}
                  </code>
                ) : (
                  <span className="text-axiom-dim italic text-[10px]">
                    Select an element to view its CSS rules.
                  </span>
                )}
              </pre>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Designer Workspace — arranges Navigator + Canvas + Inspector + toggle button
// ─────────────────────────────────────────────────────────────────────────────

export function DesignerWorkspace({
  source,
  fileName,
  selected,
  selectedSelector,
  onSelectElement,
  onApplyStyle,
  onReset,
  inspectorOpen,
  onToggleInspector,
}: {
  source: string;
  fileName: string;
  selected: SelectedElement | null;
  selectedSelector: string | null;
  onSelectElement: (sel: SelectedElement | null) => void;
  onApplyStyle: (property: string, value: string) => void;
  onReset: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      {/* Main row: Navigator + Canvas */}
      <div className="flex-1 min-h-0 flex">
        <HtmlNavigator
          iframeRef={iframeRef}
          selectedSelector={selectedSelector}
          onSelectElement={onSelectElement}
          refreshKey={refreshKey}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 flex">
            <DesignerPreviewCanvas
              source={source}
              fileName={fileName}
              selectedSelector={selectedSelector}
              onSelectElement={onSelectElement}
              iframeRef={iframeRef}
              onIframeReady={() => setRefreshKey((k) => k + 1)}
            />
          </div>
          {/* Live Inspector (bottom drawer) */}
          <LiveInspector
            selected={selected}
            source={source}
            isOpen={inspectorOpen}
            onToggle={onToggleInspector}
          />
        </div>
      </div>
      {/* Right sidebar — Webflow Style Panel */}
      <WebflowStylePanel
        selected={selected}
        onApplyStyle={onApplyStyle}
        onReset={onReset}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspector Toggle Button — for the DevLab header
// ─────────────────────────────────────────────────────────────────────────────

export function InspectorToggleButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "px-2 py-1 rounded text-[10px] flex items-center gap-1.5 border transition-colors shrink-0",
        open
          ? "bg-axiom-violet/15 border-axiom-violet/40 text-axiom-violet"
          : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-violet hover:border-axiom-violet/40",
      )}
      title="Toggle Live Inspector"
    >
      {open ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      <span className="uppercase tracking-wider">Inspector</span>
    </button>
  );
}

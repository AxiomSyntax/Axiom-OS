"use client";

import { useEffect, useRef, useState } from "react";
import { useAxiom, KIND_COLORS, KIND_GLYPHS } from "@/lib/axiom/store";
import type { MemoryNode, MemoryNodeKind } from "@/lib/axiom/types";
import AxiomSelect from "./AxiomSelect";
import { Plus, Link2, Trash2, Pin, PinOff, Search, Sparkles, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_LIST: MemoryNodeKind[] = [
  "concept",
  "agent",
  "event",
  "artifact",
  "code",
  "intent",
  "datum",
];

const REPULSION = 9000;
const SPRING = 0.018;
const SPRING_LEN = 130;
const DAMPING = 0.82;
const CENTER_PULL = 0.0015;

export default function GraphCanvas() {
  const {
    graph,
    selectedNodeId,
    selectNode,
    setNodePosition,
    addNode,
    linkNodes,
    removeNode,
    updateNode,
  } = useAxiom();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });

  const nodesRef = useRef<Map<string, MemoryNode>>(new Map());
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // linkPreview is a ref (not state) so mouse moves don't tear down the
  // physics RAF loop on every frame — that was causing the flashing.
  const linkPreviewRef = useRef<{ x: number; y: number } | null>(null);

  // ── Refs that mirror state so the RAF loop can read latest values
  //    without being torn down and rebuilt on every state change.
  //    The main useEffect (RAF loop) has [] deps and runs once on mount.
  //    These refs are kept in sync by the tiny effects below.
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const hoverIdRef = useRef<string | null>(null);
  const linkSourceRef = useRef<string | null>(null);
  const filterRef = useRef("");
  const edgesRef = useRef(graph.edges);

  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);
  useEffect(() => { hoverIdRef.current = hoverId; }, [hoverId]);
  useEffect(() => { linkSourceRef.current = linkSource; }, [linkSource]);
  useEffect(() => { filterRef.current = filter; }, [filter]);
  useEffect(() => { edgesRef.current = graph.edges; }, [graph.edges]);

  useEffect(() => {
    const m = nodesRef.current;
    for (const id of Array.from(m.keys())) {
      if (!graph.nodes.find((n) => n.id === id)) m.delete(id);
    }
    for (const n of graph.nodes) {
      const existing = m.get(n.id);
      if (existing) {
        existing.kind = n.kind;
        existing.label = n.label;
        existing.content = n.content;
        existing.pinned = n.pinned;
        existing.meta = n.meta;
        if (n.pinned) {
          existing.x = n.x;
          existing.y = n.y;
        }
      } else {
        m.set(n.id, { ...n });
      }
    }
  }, [graph.nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let cw = container.clientWidth;
    let ch = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      cw = container.clientWidth;
      ch = container.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const step = () => {
      const nodes = Array.from(nodesRef.current.values());
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.pinned) {
          a.vx = 0;
          a.vy = 0;
          continue;
        }
        let fx = 0;
        let fy = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const d = Math.sqrt(d2);
          const force = REPULSION / d2;
          fx += (dx / d) * force;
          fy += (dy / d) * force;
        }
        for (const e of edgesRef.current) {
          let other: MemoryNode | null = null;
          if (e.source === a.id) other = nodesRef.current.get(e.target) ?? null;
          else if (e.target === a.id) other = nodesRef.current.get(e.source) ?? null;
          if (!other) continue;
          const dx = other.x - a.x;
          const dy = other.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const f = SPRING * (d - SPRING_LEN);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
        fx -= a.x * CENTER_PULL;
        fy -= a.y * CENTER_PULL;
        a.vx = (a.vx + fx) * DAMPING;
        a.vy = (a.vy + fy) * DAMPING;
        a.x += a.vx;
        a.y += a.vy;
      }
      draw();
      rafRef.current = requestAnimationFrame(step);
    };

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cw, ch);

      const vp = viewportRef.current;
      ctx.translate(cw / 2 + vp.x, ch / 2 + vp.y);
      ctx.scale(vp.scale, vp.scale);

      const nodes = Array.from(nodesRef.current.values());
      const _filter = filterRef.current;
      const visibleNodeIds = new Set(
        _filter
          ? nodes
              .filter((n) =>
                (n.label + " " + n.content + " " + n.kind)
                  .toLowerCase()
                  .includes(_filter.toLowerCase()),
              )
              .map((n) => n.id)
          : nodes.map((n) => n.id),
      );

      const _edges = edgesRef.current;
      const _selectedNodeId = selectedNodeIdRef.current;
      for (const e of _edges) {
        const a = nodesRef.current.get(e.source);
        const b = nodesRef.current.get(e.target);
        if (!a || !b) continue;
        if (!visibleNodeIds.has(a.id) || !visibleNodeIds.has(b.id)) continue;
        const isHi =
          _selectedNodeId && (e.source === _selectedNodeId || e.target === _selectedNodeId);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.06;
        const my = (a.y + b.y) / 2 + (a.x - b.x) * 0.06;
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = isHi ? "rgba(120,220,255,0.85)" : "rgba(120,220,255,0.18)";
        ctx.lineWidth = isHi ? 1.6 : 0.8;
        ctx.stroke();

        const dx = b.x - mx;
        const dy = b.y - my;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / d;
        const ny = dy / d;
        const tipX = b.x - nx * 14;
        const tipY = b.y - ny * 14;
        ctx.beginPath();
        ctx.moveTo(b.x - nx * 14, b.y - ny * 14);
        ctx.lineTo(tipX - ny * 4, tipY + nx * 4);
        ctx.lineTo(tipX + ny * 4, tipY - nx * 4);
        ctx.closePath();
        ctx.fillStyle = isHi ? "rgba(120,220,255,0.85)" : "rgba(120,220,255,0.35)";
        ctx.fill();

        if (isHi) {
          ctx.fillStyle = "rgba(180,220,255,0.8)";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(e.kind, mx, my - 4);
        }
      }

      if (linkSourceRef.current && linkPreviewRef.current) {
        const src = nodesRef.current.get(linkSourceRef.current);
        if (src) {
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(linkPreviewRef.current.x, linkPreviewRef.current.y);
          ctx.strokeStyle = "rgba(255,200,90,0.6)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      for (const n of nodes) {
        if (!visibleNodeIds.has(n.id)) continue;
        const color = colorForKind(n.kind);
        const _hoverId = hoverIdRef.current;
        const _linkSource = linkSourceRef.current;
        const isSel = n.id === _selectedNodeId;
        const isHover = n.id === _hoverId;
        const isLinkSrc = n.id === _linkSource;
        const r = n.kind === "concept" ? 14 : n.kind === "agent" ? 12 : 9;

        if (isSel || isHover || isLinkSrc) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 10, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + 18);
          grad.addColorStop(0, colorWithAlpha(color, 0.33));
          grad.addColorStop(1, colorWithAlpha(color, 0));
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = colorWithAlpha(color, isSel ? 1 : 0.67);
        ctx.fill();
        ctx.strokeStyle = isSel ? "#ffffff" : isLinkSrc ? "#ffd166" : color;
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(10,12,22,0.95)";
        ctx.font = `${r * 0.9}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(KIND_GLYPHS[n.kind], n.x, n.y + 0.5);

        ctx.fillStyle = "rgba(220,230,255,0.95)";
        ctx.font = "11px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(n.label, n.x, n.y + r + 4);
      }

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []); // ← runs ONCE on mount; all values read from refs

  // ── interaction ──
  const dragNode = useRef<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const toWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const vp = viewportRef.current;
    return {
      x: (clientX - rect.left - rect.width / 2 - vp.x) / vp.scale,
      y: (clientY - rect.top - rect.height / 2 - vp.y) / vp.scale,
    };
  };

  const hitTest = (wx: number, wy: number): MemoryNode | null => {
    const nodes = Array.from(nodesRef.current.values());
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = n.kind === "concept" ? 14 : n.kind === "agent" ? 12 : 9;
      const dx = n.x - wx;
      const dy = n.y - wy;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return n;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    const hit = hitTest(x, y);
    if (hit) {
      selectNode(hit.id);
      if (linkSource && linkSource !== hit.id) {
        linkNodes(linkSource, hit.id, "relates", 1);
        setLinkSource(null);
        return;
      }
      dragNode.current = hit.id;
      dragOffset.current = { x: hit.x - x, y: hit.y - y };
      const node = nodesRef.current.get(hit.id);
      if (node) node.pinned = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      selectNode(null);
      setLinkSource(null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (dragNode.current) {
      const node = nodesRef.current.get(dragNode.current);
      if (node) {
        node.x = x + dragOffset.current.x;
        node.y = y + dragOffset.current.y;
        node.vx = 0;
        node.vy = 0;
        setNodePosition(node.id, node.x, node.y);
      }
    } else if (linkSource) {
      linkPreviewRef.current = { x, y };
    } else if (panRef.current.active) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
      viewportRef.current.x += dx;
      viewportRef.current.y += dy;
    } else {
      const hit = hitTest(x, y);
      setHoverId(hit?.id ?? null);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragNode.current) {
      const node = nodesRef.current.get(dragNode.current);
      if (node) {
        setNodePosition(node.id, node.x, node.y);
      }
      dragNode.current = null;
    }
    panRef.current.active = false;
    linkPreviewRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const vp = viewportRef.current;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    vp.scale = Math.max(0.3, Math.min(3, vp.scale * factor));
  };

  const resetView = () => {
    viewportRef.current = { x: 0, y: 0, scale: 1 };
  };

  const zoomBy = (factor: number) => {
    const vp = viewportRef.current;
    vp.scale = Math.max(0.3, Math.min(3, vp.scale * factor));
  };

  const selected = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const connectedEdges = graph.edges.filter(
    (e) => selected && (e.source === selected.id || e.target === selected.id),
  );

  return (
    <div ref={containerRef} className="w-full h-full flex">
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <button
            onClick={() => setShowAdd(true)}
            className="px-2.5 py-1.5 rounded-md bg-axiom-cyan/20 hover:bg-axiom-cyan/30 border border-axiom-cyan/40 text-axiom-cyan text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" /> New Node
          </button>
          <button
            onClick={() => {
              if (selectedNodeId) {
                if (linkSource === selectedNodeId) setLinkSource(null);
                else setLinkSource(selectedNodeId);
              }
            }}
            disabled={!selectedNodeId}
            className={cn(
              "px-2.5 py-1.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40",
              linkSource
                ? "bg-axiom-amber/30 border-axiom-amber/60 text-axiom-amber"
                : "bg-axiom-panel/70 border-axiom-edge/40 hover:border-axiom-amber/40 text-axiom-text",
            )}
          >
            <Link2 className="w-3 h-3" /> {linkSource ? "Pick target…" : "Link"}
          </button>
          <button
            onClick={() => selectedNodeId && removeNode(selectedNodeId)}
            disabled={!selectedNodeId}
            className="px-2.5 py-1.5 rounded-md bg-axiom-panel/70 hover:bg-axiom-rose/20 border border-axiom-edge/40 hover:border-axiom-rose/40 text-axiom-text hover:text-axiom-rose text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-axiom-dim" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter nodes…"
              className="w-44 pl-7 pr-2 py-1.5 rounded-md bg-axiom-deep/70 border border-axiom-edge/40 text-xs text-axiom-text placeholder:text-axiom-dim/60 focus:outline-none focus:border-axiom-cyan/50"
            />
          </div>
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-axiom-deep/70 border border-axiom-edge/40 rounded-md p-0.5">
          <button
            onClick={() => zoomBy(0.85)}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 text-axiom-dim hover:text-axiom-text"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 text-axiom-dim hover:text-axiom-text"
            title="Reset view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => zoomBy(1.18)}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 text-axiom-dim hover:text-axiom-text"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 bg-axiom-deep/70 border border-axiom-edge/40 rounded-md p-2 text-[10px] space-y-1">
          {KIND_LIST.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", `bg-${KIND_COLORS[k]}`)} />
              <span className="text-axiom-dim capitalize">{k}</span>
            </div>
          ))}
        </div>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-axiom-dim">
          {linkSource ? "click a target node to link" : "drag · scroll to zoom · drag bg to pan"}
        </div>
      </div>

      {/* Inspector */}
      <aside className="w-72 border-l border-axiom-edge/40 bg-axiom-deep/60 flex flex-col">
        <div className="p-3 border-b border-axiom-edge/40 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-axiom-cyan" />
          <span className="text-xs uppercase tracking-[0.2em] text-axiom-dim">
            Node Inspector
          </span>
        </div>
        <div className="flex-1 overflow-y-auto axiom-scroll p-3 space-y-3">
          {selected ? (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
                  Label
                </label>
                <input
                  value={selected.label}
                  onChange={(e) => updateNode(selected.id, { label: e.target.value })}
                  className="mt-1 w-full bg-axiom-panel/60 border border-axiom-edge/40 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-axiom-cyan/50"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
                  Kind
                </label>
                <AxiomSelect
                  value={selected.kind}
                  onChange={(v) =>
                    updateNode(selected.id, { kind: v as MemoryNodeKind })
                  }
                  options={KIND_LIST.map((k) => ({ value: k, label: k }))}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
                  Content
                </label>
                <textarea
                  value={selected.content}
                  onChange={(e) => updateNode(selected.id, { content: e.target.value })}
                  rows={5}
                  className="mt-1 w-full bg-axiom-panel/60 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-axiom-cyan/50 axiom-scroll"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-axiom-dim">
                  Pinned
                </span>
                <button
                  onClick={() => {
                    const node = nodesRef.current.get(selected.id);
                    if (node) {
                      node.pinned = !node.pinned;
                      updateNode(selected.id, { pinned: node.pinned });
                    } else {
                      updateNode(selected.id, { pinned: !selected.pinned });
                    }
                    /* setTick removed — state update via updateNode triggers re-render */
                  }}
                  className={cn(
                    "px-2 py-1 rounded border text-xs flex items-center gap-1.5",
                    selected.pinned
                      ? "bg-axiom-amber/20 border-axiom-amber/50 text-axiom-amber"
                      : "bg-axiom-panel/40 border-axiom-edge/40 text-axiom-dim",
                  )}
                >
                  {selected.pinned ? (
                    <>
                      <Pin className="w-3 h-3" /> Pinned
                    </>
                  ) : (
                    <>
                      <PinOff className="w-3 h-3" /> Free
                    </>
                  )}
                </button>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-axiom-dim mb-1">
                  Connections ({connectedEdges.length})
                </div>
                <div className="space-y-1">
                  {connectedEdges.map((e) => {
                    const otherId = e.source === selected.id ? e.target : e.source;
                    const other = graph.nodes.find((n) => n.id === otherId);
                    if (!other) return null;
                    const dir = e.source === selected.id ? "→" : "←";
                    return (
                      <button
                        key={e.id}
                        onClick={() => selectNode(other.id)}
                        className="w-full text-left px-2 py-1.5 rounded bg-axiom-panel/40 hover:bg-axiom-panel/70 border border-axiom-edge/30 text-xs flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-axiom-dim">{dir}</span>
                          <span className={cn("w-1.5 h-1.5 rounded-full", `bg-${KIND_COLORS[other.kind]}`)} />
                          <span className="text-axiom-text">{other.label}</span>
                        </span>
                        <span className="text-[9px] text-axiom-dim group-hover:text-axiom-cyan">
                          {e.kind}
                        </span>
                      </button>
                    );
                  })}
                  {connectedEdges.length === 0 && (
                    <p className="text-[10px] text-axiom-dim italic">
                      No connections yet. Use Link to connect.
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-axiom-edge/30 text-[10px] text-axiom-dim space-y-0.5 font-mono">
                <div>id: {selected.id}</div>
                <div>pos: ({selected.x.toFixed(0)}, {selected.y.toFixed(0)})</div>
                <div>created: {new Date(selected.createdAt).toLocaleTimeString()}</div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-axiom-dim text-xs">
              <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-30" />
              Select a node to inspect, or create a new one.
            </div>
          )}
        </div>
      </aside>

      {showAdd && (
        <AddNodeModal
          onClose={() => setShowAdd(false)}
          onCreate={(payload) => {
            const id = addNode(payload);
            selectNode(id);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function colorForKind(kind: MemoryNodeKind): string {
  switch (kind) {
    case "concept":
      return "rgb(120,220,255)";
    case "agent":
      return "rgb(80,220,180)";
    case "event":
      return "rgb(255,200,90)";
    case "artifact":
      return "rgb(180,130,255)";
    case "code":
      return "rgb(120,220,170)";
    case "intent":
      return "rgb(255,130,140)";
    case "datum":
      return "rgb(160,170,200)";
  }
}

// Convert "rgb(r,g,b)" -> "rgba(r,g,b,a)" (or pass through hex/rgba unchanged)
function colorWithAlpha(color: string, alpha: number): string {
  const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) {
    return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  }
  // hex like #rrggbb
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function AddNodeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: { label: string; kind: MemoryNodeKind; content: string }) => void;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<MemoryNodeKind>("concept");
  const [content, setContent] = useState("");

  return (
    <div
      className="absolute inset-0 z-50 bg-axiom-void/70 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-80 bg-axiom-panel border border-axiom-edge/60 rounded-lg p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-axiom-text flex items-center gap-2">
          <Plus className="w-4 h-4 text-axiom-cyan" /> New Memory Node
        </h3>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
            Label
          </label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Customer Onboarding"
            className="mt-1 w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-axiom-cyan/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
            Kind
          </label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {KIND_LIST.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "px-1.5 py-1 rounded text-[10px] border transition-colors capitalize",
                  kind === k
                    ? "bg-axiom-cyan/20 border-axiom-cyan/50 text-axiom-cyan"
                    : "bg-axiom-deep/40 border-axiom-edge/40 text-axiom-dim hover:text-axiom-text",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-axiom-dim">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Short description…"
            className="mt-1 w-full bg-axiom-deep/70 border border-axiom-edge/40 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-axiom-cyan/50"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-axiom-dim hover:text-axiom-text"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onCreate({
                label: label.trim() || "Untitled",
                kind,
                content: content.trim(),
              })
            }
            className="px-3 py-1.5 rounded bg-axiom-cyan/20 border border-axiom-cyan/50 text-axiom-cyan text-xs hover:bg-axiom-cyan/30"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

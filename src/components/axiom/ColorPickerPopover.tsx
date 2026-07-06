"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
//  Native EyeDropper API type declaration (Chromium-only; gracefully
//  hidden in Firefox/Safari where the API doesn't exist).
// ════════════════════════════════════════════════════════════════════════════
interface EyeDropperResult { sRGBHex: string }
interface EyeDropperOpenOptions { signal?: AbortSignal }
interface EyeDropper {
  open(options?: EyeDropperOpenOptions): Promise<EyeDropperResult>;
}
interface EyeDropperConstructor { new (): EyeDropper }

interface WindowWithEyeDropper extends Window {
  EyeDropper?: EyeDropperConstructor;
}

/** True when the native EyeDropper API is available (Chromium browsers). */
function isEyeDropperAvailable(): boolean {
  return typeof window !== "undefined" && typeof (window as WindowWithEyeDropper).EyeDropper === "function";
}

// ════════════════════════════════════════════════════════════════════════════
//  ColorPickerPopover — compact HS color picker for the Axiom OS design system
// ════════════════════════════════════════════════════════════════════════════
//
//  A floating popover color picker built on Radix Popover (already used across
//  the OS). The trigger is a clickable color preview square; the popover body
//  contains:
//
//    • Saturation/Brightness square (200×140) — click/drag to pick S and V
//    • Hue slider (200×12) — click/drag to pick H
//    • Hex preview row — shows the current hex + an eyedropper tool button
//
//  Always-interactive
//  ──────────────────
//  The picker is NEVER disabled. When `value` is empty or invalid (e.g. the
//  user hasn't typed a hex yet), the picker falls back to FALLBACK_HEX
//  (#00f2fe — the default Axiom-cyan) so the swatch always shows a real
//  color and the user can drag/pick/eyedropper immediately. As soon as the
//  user interacts, a real hex flows back through `onChange` and populates
//  the parent's HEX field.
//
//  EyeDropper tool (Chromium-only)
//  ───────────────────────────────
//  When the native `window.EyeDropper` API is available, an eyedropper button
//  appears in the hex preview row. Clicking it closes the popover, launches
//  the browser's magnifier-style screen color picker, and writes the picked
//  hex back through `onChange`. Hidden in Firefox/Safari where the API
//  doesn't exist — no broken UI, just a missing button.
//
//  Synchronization contract
//  ────────────────────────
//  The picker is CONTROLLED by the parent's `value` (a `#rrggbb` string).
//  When the user interacts with the picker (drag, hue, or eyedropper), we
//  convert HSV → hex and call `onChange(newHex)`. The parent's `onChange`
//  handler is responsible for re-validating and updating the shared
//  `customHex` state — that's the same handler the HEX `<input>` uses, so
//  all controls stay in sync by writing through the same pipeline.
//
//  When the parent's `value` changes externally (e.g. user types in the HEX
//  field, Auto-Forge runs, or a palette preset is clicked), the picker's HSV
//  re-derives from the new hex on the next render (via useMemo). This means
//  dragging the picker, typing hex, and using the eyedropper are all fully
//  bidirectional.
//
//  Color math
//  ──────────
//  We use HSV (Hue 0–360, Saturation 0–1, Value 0–1) because it maps naturally
//  to the two-dimensional SB square + 1-D hue slider UI. Conversions are the
//  standard algorithms — no external color library needed.

interface ColorPickerPopoverProps {
  /** Current color as a `#rrggbb` string. If invalid/empty, the picker falls
   *  back to a sensible default so it is ALWAYS interactive — the user can
   *  open it and pick a color before any hex has been entered. */
  value: string;
  /** Called with a normalized `#rrggbb` whenever the user picks a new color
   *  (via the SB square, hue slider, or eyedropper tool). */
  onChange: (hex: string) => void;
  /** Optional className for the trigger square. */
  className?: string;
}

/** The fallback color used when `value` is empty or invalid. Matches the
 *  default `--axiom-custom` CSS variable (#00f2fe) so the picker always shows
 *  a meaningful Axiom-cyan starting point. */
const FALLBACK_HEX = "#00f2fe";

// ── Color conversion helpers ───────────────────────────────────────────────
// Standard hex ↔ HSV ↔ RGB. All functions are pure and allocation-free.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ── Component ──────────────────────────────────────────────────────────────

export function ColorPickerPopover({ value, onChange, className }: ColorPickerPopoverProps) {
  // ── HSV state model ──
  // The HSV is derived from the parent's `value` via useMemo (no effect, no
  // setState-in-effect lint violation). When `value` is empty/invalid we fall
  // back to FALLBACK_HEX so the picker is ALWAYS interactive — the user can
  // open it and pick a color before any hex has been entered. When the user
  // actively drags the SB square or hue slider, a `dragOverride` is set and
  // takes precedence over the derived value — this prevents the parent's
  // echoed value from fighting an in-flight drag (the drag IS the source of
  // truth during that window). On pointer-up, the override is cleared and the
  // next render re-derives from the (now-updated) parent value.
  const derivedHsv = useMemo<{ h: number; s: number; v: number }>(() => {
    const rgb = hexToRgb(value) ?? hexToRgb(FALLBACK_HEX)!;
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  }, [value]);

  const [dragOverride, setDragOverride] = useState<{ h: number; s: number; v: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [sbDragging, setSbDragging] = useState(false);
  const [hueDragging, setHueDragging] = useState(false);
  const [eyeDropperActive, setEyeDropperActive] = useState(false);
  const sbRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const eyeDropperAvailable = useMemo(() => isEyeDropperAvailable(), []);

  // Effective HSV used for rendering: drag override wins, otherwise derived
  // from the parent's `value`. The override is cleared synchronously in the
  // pointer-up handlers (not via an effect) so the next render re-derives
  // from the parent's now-updated value.
  const hsv = dragOverride ?? derivedHsv;

  // ── SB square pointer handling ──
  // nx = saturation (0 left → 1 right), ny = value (0 top → 1 bottom, inverted).
  const updateSbFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = sbRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const next = { h: hsv.h, s: nx, v: 1 - ny };
      setDragOverride(next);
      onChange(hsvToHex(next.h, next.s, next.v));
    },
    [hsv.h, onChange],
  );

  const onSbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
      setSbDragging(true);
      updateSbFromEvent(e.clientX, e.clientY);
    },
    [updateSbFromEvent],
  );

  const onSbPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!sbDragging) return;
      updateSbFromEvent(e.clientX, e.clientY);
    },
    [sbDragging, updateSbFromEvent],
  );

  const endSbDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!sbDragging) return;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      setSbDragging(false);
      // Clear the drag override so the next render re-derives HSV from the
      // parent's now-updated value (which echoes back what we just sent).
      setDragOverride(null);
    },
    [sbDragging],
  );

  // ── Hue slider pointer handling ──
  // nx = hue (0 → 360). ny is ignored.
  const updateHueFromEvent = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const next = { h: nx * 360, s: hsv.s, v: hsv.v };
      setDragOverride(next);
      onChange(hsvToHex(next.h, next.s, next.v));
    },
    [hsv.s, hsv.v, onChange],
  );

  const onHuePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
      setHueDragging(true);
      updateHueFromEvent(e.clientX);
    },
    [updateHueFromEvent],
  );

  const onHuePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hueDragging) return;
      updateHueFromEvent(e.clientX);
    },
    [hueDragging, updateHueFromEvent],
  );

  const endHueDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hueDragging) return;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      setHueDragging(false);
      setDragOverride(null);
    },
    [hueDragging],
  );

  // ── Current color display ──
  // Falls back to FALLBACK_HEX when `value` is empty/invalid so the swatch
  // always shows a real color (never black/transparent). This is what makes
  // the picker always-interactive: even before the user has entered a hex,
  // the swatch shows the default Axiom-cyan and the user can drag the picker
  // to set a real value.
  const currentHex = useMemo(() => {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : FALLBACK_HEX;
  }, [value]);

  // ── EyeDropper tool (Chromium-only) ──
  // Uses the native EyeDropper API to let the user pick any color from the
  // screen. We close the popover first so the user can see the whole screen,
  // then open the browser's magnifier-style eyedropper. On success, the
  // picked hex flows through `onChange` → the same pipeline as drag/type.
  const handleEyeDropper = useCallback(async () => {
    if (!eyeDropperAvailable) return;
    const ctor = (window as WindowWithEyeDropper).EyeDropper;
    if (!ctor) return;
    try {
      setEyeDropperActive(true);
      // Close the popover so the user has an unobstructed view of the screen.
      setOpen(false);
      const dropper = new ctor();
      const result = await dropper.open();
      // result.sRGBHex is always a normalized #rrggbb string.
      onChange(result.sRGBHex.toLowerCase());
    } catch {
      // The user pressed Escape or clicked away — no action needed.
    } finally {
      setEyeDropperActive(false);
    }
  }, [eyeDropperAvailable, onChange]);

  // The hue slider cursor shows the pure hue at S=1, V=1.
  const hueTrackColor = useMemo(() => `hsl(${hsv.h}, 100%, 50%)`, [hsv.h]);

  // The SB square's background is the pure hue at S=1, V=1.
  const sbBackground = useMemo(() => {
    const pure = hsvToRgb(hsv.h, 1, 1);
    return rgbToHex(pure.r, pure.g, pure.b);
  }, [hsv.h]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open color picker"
          className={cn(
            "w-10 h-10 rounded-md border shrink-0 transition-all relative cursor-pointer hover:scale-105",
            "border-white/10 hover:border-white/25",
            className,
          )}
          style={{
            backgroundColor: currentHex,
            boxShadow: `0 0 16px -4px ${currentHex}80`,
          }}
        >
          {/* Subtle inner ring so the swatch is visible against any color */}
          <span className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/10 pointer-events-none" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[220px] p-3 bg-axiom-panel border border-axiom-edge/60 rounded-lg shadow-2xl"
        style={{ boxShadow: "0 16px 40px -8px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)" }}
        // Prevent the popover from stealing focus from the rest of the dialog
        // (the dialog's inputs should remain interactable while picking).
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-2.5">
          {/* ── Saturation/Brightness square ── */}
          <div
            ref={sbRef}
            onPointerDown={onSbPointerDown}
            onPointerMove={onSbPointerMove}
            onPointerUp={endSbDrag}
            onPointerCancel={endSbDrag}
            className="relative w-full h-[140px] rounded-md overflow-hidden cursor-crosshair touch-none select-none"
            style={{
              backgroundColor: sbBackground,
              backgroundImage:
                "linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%)",
            }}
          >
            {/* Cursor */}
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white pointer-events-none"
              style={{
                left: `calc(${hsv.s * 100}% - 6px)`,
                top: `calc(${(1 - hsv.v) * 100}% - 6px)`,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          {/* ── Hue slider ── */}
          <div
            ref={hueRef}
            onPointerDown={onHuePointerDown}
            onPointerMove={onHuePointerMove}
            onPointerUp={endHueDrag}
            onPointerCancel={endHueDrag}
            className="relative w-full h-3 rounded-full overflow-hidden cursor-pointer touch-none select-none"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          >
            {/* Hue cursor */}
            <div
              className="absolute top-1/2 w-3 h-4 rounded-sm border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: hueTrackColor,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          {/* ── Hex preview row + Eyedropper tool ── */}
          <div className="flex items-center gap-2 pt-0.5">
            <div
              className="w-6 h-6 rounded-md border border-white/15 shrink-0"
              style={{ backgroundColor: currentHex, boxShadow: `0 0 8px -2px ${currentHex}80` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-axiom-dim/60 mb-0.5">Current</div>
              <div className="text-xs font-mono text-axiom-text uppercase truncate">{currentHex}</div>
            </div>
            {/* EyeDropper tool — pick any color from the screen.
                Only rendered when the native EyeDropper API is available
                (Chromium browsers). Hidden in Firefox/Safari. */}
            {eyeDropperAvailable && (
              <button
                type="button"
                onClick={handleEyeDropper}
                disabled={eyeDropperActive}
                aria-label="Pick color from screen (eyedropper)"
                title="Pick color from screen"
                className={cn(
                  "w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-all",
                  eyeDropperActive
                    ? "border-axiom-cyan/50 bg-axiom-cyan/10 text-axiom-cyan"
                    : "border-axiom-edge/50 bg-axiom-void/40 text-axiom-dim hover:text-axiom-text hover:border-axiom-edge/80 hover:bg-axiom-panel/60",
                )}
              >
                {eyeDropperActive ? (
                  <span className="block w-3 h-3 rounded-full border-2 border-axiom-cyan border-t-transparent animate-spin" />
                ) : (
                  <Pipette className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

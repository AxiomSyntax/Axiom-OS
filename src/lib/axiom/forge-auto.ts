// ═══════════════════════════════════════════════════════════════════════════
// Agent Forge — Auto-Generation Engine
// Parses agent descriptions to select the most relevant glyph and
// generate a complementary hex accent color.
// ═══════════════════════════════════════════════════════════════════════════

import { findBestGlyph } from "./glyph-registry";

// ── Extended Accent Palette ────────────────────────────────────────────────

export interface AccentColor {
  id: string;
  label: string;
  hex: string;
  /** Tailwind-compatible color token name (for bg-/text-/border- utilities). */
  token: string;
}

export const EXTENDED_PALETTE: AccentColor[] = [
  { id: "cyan", label: "Cyan", hex: "#00f2fe", token: "axiom-cyan" },
  { id: "emerald", label: "Emerald", hex: "#10b981", token: "axiom-emerald" },
  { id: "amber", label: "Amber", hex: "#f59e0b", token: "axiom-amber" },
  { id: "violet", label: "Violet", hex: "#8b5cf6", token: "axiom-violet" },
  { id: "rose", label: "Rose", hex: "#f43f5e", token: "axiom-rose" },
  { id: "ruby", label: "Ruby", hex: "#e11d48", token: "axiom-ruby" },
  { id: "sapphire", label: "Sapphire", hex: "#2563eb", token: "axiom-sapphire" },
  { id: "amethyst", label: "Amethyst", hex: "#a855f7", token: "axiom-amethyst" },
  { id: "topaz", label: "Topaz", hex: "#06b6d4", token: "axiom-topaz" },
  { id: "obsidian", label: "Obsidian", hex: "#1e293b", token: "axiom-obsidian" },
  { id: "neon-lime", label: "Neon-Lime", hex: "#84cc16", token: "axiom-neon-lime" },
];

// ── Color Generation Utilities ─────────────────────────────────────────────

/**
 * Convert hex string to HSL values.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Convert HSL to hex string.
 */
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, "0");
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate a harmonious hex color from a base hue.
 * Shifts the hue slightly and ensures high saturation + good lightness for dark UI.
 */
function generateComplementaryHex(baseHex: string): string {
  const hsl = hexToHsl(baseHex);
  // Complementary hue shift (180°) with slight randomization
  const newHue = (hsl.h + 150 + Math.round(Math.random() * 60)) % 360;
  // Ensure good saturation and appropriate lightness for dark backgrounds
  const newSat = Math.max(55, Math.min(85, hsl.s + 10));
  const newLight = Math.max(45, Math.min(65, 55 + Math.round(Math.random() * 10)));
  return hslToHex(newHue, newSat, newLight);
}

/**
 * Find the closest palette color to a given hex.
 */
export function findClosestPaletteColor(hex: string): AccentColor {
  const target = hexToHsl(hex);
  let closest = EXTENDED_PALETTE[0];
  let minDist = Infinity;

  for (const color of EXTENDED_PALETTE) {
    const c = hexToHsl(color.hex);
    const hDiff = Math.min(Math.abs(target.h - c.h), 360 - Math.abs(target.h - c.h));
    const dist = Math.sqrt(
      (hDiff / 180) ** 2 * 2 +
      ((target.s - c.s) / 100) ** 2 +
      ((target.l - c.l) / 100) ** 2,
    );
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }

  return closest;
}

// ── Auto-Forge Engine ─────────────────────────────────────────────────────

export interface AutoForgeResult {
  glyph: string;
  color: string; // Tailwind token like "axiom-cyan"
  hex: string;   // The actual hex color
}

/**
 * Auto-forge: Given a natural language agent description, select the best glyph
 * and generate a complementary hex color.
 */
export function autoForge(description: string): AutoForgeResult {
  // 1. Find the best glyph
  const glyphEntry = findBestGlyph(description);

  // 2. Determine color
  let hex: string;
  let token: string;

  if (glyphEntry?.hexHint) {
    // Use the glyph's suggested hex color
    hex = glyphEntry.hexHint;
    // Find the closest palette color for the token
    const closest = findClosestPaletteColor(hex);
    token = closest.token;
  } else {
    // Generate a unique hex based on the description hash
    const hash = simpleHash(description);
    const baseHue = hash % 360;
    hex = hslToHex(baseHue, 70 + (hash % 20), 55 + (hash % 10));
    const closest = findClosestPaletteColor(hex);
    token = closest.token;
  }

  return {
    glyph: glyphEntry?.emoji ?? "🤖",
    color: token,
    hex,
  };
}

/**
 * Simple deterministic string hash for color generation.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Validate a hex color string. Returns the normalized hex or null.
 */
export function validateHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toLowerCase()}`;
}

// ── Accent color resolution ───────────────────────────────────────────────
// The single shared helper that the entire agent rendering pipeline uses to
// resolve a `color` field to concrete CSS. Handles BOTH:
//   • Preset tokens  — "axiom-cyan", "axiom-violet", … → Tailwind utilities
//   • Raw hex values — "#ff5733"                     → inline style
//
// This is the ONE rendering path. Every site that renders an agent's accent
// (AgentsPage list, Agent Hub, Dashboard, council messages) calls this helper
// so preset and custom colors are handled identically.
//
// Background: agents forged with a custom hex used to store the sentinel token
// "axiom-custom" in `color` and rely on a shared `--axiom-custom` CSS variable.
// That broke because (a) the `text-axiom-custom` utility was purged by
// Tailwind's content scanner (never appeared as a literal), and (b) all
// custom-color agents shared ONE CSS variable, so they collided on reload.
// The fix: store the real hex on the agent record and resolve it here.

export type AccentKind = "text" | "bg" | "border";

export interface ResolvedAccent {
  /** Tailwind utility classes for the accent (text-axiom-cyan, bg-axiom-cyan/10,
   *  border-axiom-cyan/30, etc.). Empty string for raw hex values — use `style`. */
  className: string;
  /** Inline style for raw hex values. Undefined for preset tokens. */
  style?: { color?: string; backgroundColor?: string; borderColor?: string };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Returns true when `color` is a raw hex value (e.g. "#ff5733") rather than a
 *  preset Tailwind token (e.g. "axiom-cyan"). */
export function isRawHexColor(color: string): boolean {
  return HEX_RE.test(color);
}

/** Resolve any accent color (preset token OR raw hex) to concrete CSS.
 *  `kind` selects which property to set: "text" → color, "bg" → backgroundColor,
 *  "border" → borderColor. `opacity` applies the Tailwind `/NN` opacity suffix
 *  to preset tokens (ignored for raw hexes — use rgba in the hex itself or
 *  pre-blend). */
export function resolveAccent(
  color: string,
  kind: AccentKind,
  opacity?: number,
): ResolvedAccent {
  // Raw hex → inline style
  if (isRawHexColor(color)) {
    const style: ResolvedAccent["style"] = {};
    if (kind === "text") style.color = color;
    else if (kind === "bg") style.backgroundColor = color;
    else if (kind === "border") style.borderColor = color;
    return { className: "", style };
  }
  // Preset token → Tailwind utility
  const suffix = opacity != null ? `/${opacity}` : "";
  const utility =
    kind === "text" ? `text-${color}${suffix}`
    : kind === "bg" ? `bg-${color}${suffix}`
    : `border-${color}${suffix}`;
  return { className: utility };
}

/** Convenience: resolve the full agent-icon container styling (text + bg +
 *  border) for any accent color. Returns className + style to spread onto the
 *  container element. Matches the pattern used at every agent icon site:
 *  `text-${color} border-${color}/30 bg-${color}/10`. */
export function resolveAccentContainer(color: string): {
  className: string;
  style?: { color?: string; backgroundColor?: string; borderColor?: string };
} {
  if (isRawHexColor(color)) {
    // For raw hexes, derive the tinted backgrounds from the hex with alpha.
    // We use 8-digit hex (#rrggbbaa) so there's exactly one color source.
    return {
      className: "",
      style: {
        color,
        backgroundColor: color + "1a", // ~10% opacity
        borderColor: color + "4d",     // ~30% opacity
      },
    };
  }
  return {
    className: `text-${color} border-${color}/30 bg-${color}/10`,
  };
}
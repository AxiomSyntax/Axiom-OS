// ════════════════════════════════════════════════════════════════════════════
// Axiom OS — Runtime Custom Styles Persistence
// ════════════════════════════════════════════════════════════════════════════
//
// This module handles saving and loading custom CSS styles created in the
// DevLab Designer Studio. Modified styles are persisted to localStorage so
// they survive page refreshes and are instantly applied across all pages.
//
// ─────────────────────────────────────────────────────────────────────────────
// NATIVE BACKEND HOOK: Replace localStorage with real Node.js fs.writeFile
// for PC deployment.
//
// When packaging Axiom OS as a desktop app (Electron/Tauri), replace the
// localStorage.getItem/setItem calls below with:
//
//   import { readFileSync, writeFileSync } from "fs";
//   import { join } from "path";
//
//   const STYLES_PATH = join(app.getPath("userData"), "axiom_custom_styles.json");
//
//   export function loadCustomStyles(): CustomStyleEntry[] {
//     try {
//       return JSON.parse(readFileSync(STYLES_PATH, "utf-8"));
//     } catch { return []; }
//   }
//
//   export function saveCustomStyles(styles: CustomStyleEntry[]): void {
//     writeFileSync(STYLES_PATH, JSON.stringify(styles, null, 2));
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomStyleEntry {
  /** CSS selector (e.g., ".jarvis-orb", "#sidebar", "button.neon-btn") */
  selector: string;
  /** CSS property name (e.g., "margin-top", "font-size", "color") */
  property: string;
  /** CSS value (e.g., "20px", "1.5rem", "#00f0ff") */
  value: string;
  /** Timestamp of when the style was saved */
  timestamp: number;
}

const STORAGE_KEY = "axiom_custom_styles";

/**
 * Load all custom styles from localStorage.
 * Returns an empty array if none exist or if parsing fails.
 */
export function loadCustomStyles(): CustomStyleEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CustomStyleEntry[];
  } catch {
    return [];
  }
}

/**
 * Save an array of custom styles to localStorage.
 * Merges with existing styles (dedupes by selector+property).
 */
export function saveCustomStyles(styles: CustomStyleEntry[]): void {
  try {
    const existing = loadCustomStyles();
    // Merge: new styles override existing ones with the same selector+property
    const merged = new Map<string, CustomStyleEntry>();
    for (const entry of existing) {
      merged.set(`${entry.selector}|${entry.property}`, entry);
    }
    for (const entry of styles) {
      merged.set(`${entry.selector}|${entry.property}`, entry);
    }
    const all = Array.from(merged.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage may be unavailable in some environments — fail silently
  }
}

/**
 * Clear ALL custom styles from localStorage.
 */
export function clearCustomStyles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // fail silently
  }
}

/**
 * Convert an array of CustomStyleEntry objects into a CSS string
 * suitable for injection into a <style> tag.
 */
export function stylesToCss(entries: CustomStyleEntry[]): string {
  // Group by selector
  const bySelector = new Map<string, CustomStyleEntry[]>();
  for (const entry of entries) {
    const group = bySelector.get(entry.selector) ?? [];
    group.push(entry);
    bySelector.set(entry.selector, group);
  }
  // Build CSS string
  const blocks: string[] = [];
  for (const [selector, props] of bySelector) {
    const declarations = props.map((p) => `  ${p.property}: ${p.value};`).join("\n");
    blocks.push(`${selector} {\n${declarations}\n}`);
  }
  return blocks.join("\n\n");
}

/**
 * Parse a CSS string (from a <style> tag) back into CustomStyleEntry objects.
 * Used to extract the designer's global overrides for saving.
 */
export function parseCssToEntries(css: string): CustomStyleEntry[] {
  const entries: CustomStyleEntry[] = [];
  const blockRegex = /([^{}]+)\{([^}]*)\}/g;
  let match;
  while ((match = blockRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();
    if (!selector || !body) continue;
    const declarations = body.split(";").map((d) => d.trim()).filter(Boolean);
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(":");
      if (colonIdx === -1) continue;
      const property = decl.slice(0, colonIdx).trim();
      const value = decl.slice(colonIdx + 1).trim();
      if (property && value) {
        entries.push({ selector, property, value, timestamp: Date.now() });
      }
    }
  }
  return entries;
}

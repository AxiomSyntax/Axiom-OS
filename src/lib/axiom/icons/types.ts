// ════════════════════════════════════════════════════════════════════════════
//  Asset Provider Architecture — Types
// ════════════════════════════════════════════════════════════════════════════
//
//  Axiom OS has exactly THREE icon sources:
//
//  1. AXIOM — 37 built-in geometric glyphs (local, permanent, identity)
//  2. WORKSPACE ASSETS — user's personal imported SVG library (local, grows over time)
//  3. EXTERNAL LIBRARIES — NOT bundled. Provider cards link to official websites.
//     User copies SVG from the official site, pastes into Axiom, imports to
//     Workspace Assets. Only imported icons exist locally.
//
//  The ~34 Lucide icons used as functional defaults in seed data are kept
//  bundled in AppIcon.tsx for synchronous rendering. They are NOT browsable
//  in the picker — they're just functional defaults that render when no
//  custom icon is set.

/** A reference to an icon in a specific library. */
export interface IconReference {
  library: string;
  name: string;
}

/** A category within a library (for browsing in the picker). */
export interface IconCategory {
  id: string;
  label: string;
  iconNames: string[];
}

/** Metadata about an icon library. */
export interface IconLibrary {
  id: string;
  label: string;
  available: boolean;
  hasCategories: boolean;
  hasSearch: boolean;
}

/** An asset catalog provider. Only Axiom and Workspace are registered.
 *  External libraries are NOT providers — they're just links. */
export interface AssetProvider {
  libraryId: string;
  library: IconLibrary;
  listIcons(categoryId?: string): string[];
  listCategories(): IconCategory[];
  searchIcons(query: string): string[];
  getIconSvg(name: string): Promise<string | null>;
  hasIcon(name: string): boolean;
  subscribe?: (fn: () => void) => () => void;
}

// ── Migration ───────────────────────────────────────────────────────────────

/** Back-compat: convert a legacy glyph string to an IconReference.
 *
 *  Resolution order:
 *  1. Ends with ".svg" → workspace provider (user-imported asset, may have folder path)
 *  2. PascalCase alphanumeric (e.g. "Bot", "Network") → lucide provider
 *     (renderer uses the 34-icon local map; falls back to text if not found)
 *  3. Everything else (geometric symbols, emoji, unicode) → axiom provider
 */
export function migrateGlyph(glyph: string | undefined | null): IconReference | null {
  if (!glyph) return null;
  // Workspace asset (imported SVG, may have folder path like "AI/Oracle.svg")
  if (/\.svg$/i.test(glyph)) {
    return { library: "workspace", name: glyph };
  }
  // Lucide icon names are PascalCase alphanumeric
  if (/^[A-Z][a-zA-Z0-9]+$/.test(glyph)) {
    return { library: "lucide", name: glyph };
  }
  // Geometric symbols, emoji, unicode → Axiom
  return { library: "axiom", name: glyph };
}

/** Convert an IconReference back to a legacy glyph string. */
export function iconRefToGlyph(ref: IconReference | null | undefined): string | undefined {
  if (!ref) return undefined;
  return ref.name;
}

// ── SVG hashing (for duplicate detection) ───────────────────────────────────

/** Normalize an SVG string for hashing: strip whitespace, lowercase. */
export function normalizeSvgForHash(svg: string): string {
  return svg
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\sstyle="[^"]*"/gi, "")
    .trim()
    .toLowerCase();
}

/** Compute a djb2 hash of a normalized SVG string. Returns a short base36 string. */
export function hashSvg(svg: string): string {
  const normalized = normalizeSvgForHash(svg);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36);
}

// ── SVG validation ──────────────────────────────────────────────────────────

/** Basic SVG validation: must contain <svg ...> and </svg>. */
export function isValidSvg(svg: string): boolean {
  const trimmed = svg.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("<svg") && !trimmed.startsWith("<?xml")) return false;
  if (!trimmed.includes("</svg>")) return false;
  return true;
}

/** Extract a name suggestion from an SVG string (from id attribute or first path id).
 *  Falls back to "icon" + a short random suffix to avoid collisions when no
 *  id is present. */
export function suggestSvgName(svg: string): string {
  const idMatch = svg.match(/<svg[^>]*\sid="([^"]+)"/i);
  if (idMatch) {
    const name = idMatch[1].replace(/[^a-zA-Z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    if (name) return name;
  }
  const pathMatch = svg.match(/<path[^>]*\sid="([^"]+)"/i);
  if (pathMatch) {
    const name = pathMatch[1].replace(/[^a-zA-Z0-9-_]/g, "-").replace(/^-+|-+$/g, "");
    if (name) return name;
  }
  // Fallback: "icon" + short random suffix. The saveWorkspaceAsset function
  // will further deduplicate if "icon-XXXX.svg" already exists.
  const suffix = Math.random().toString(36).substring(2, 6);
  return `icon-${suffix}`;
}

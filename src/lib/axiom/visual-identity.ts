// ════════════════════════════════════════════════════════════════════════════
//  getVisualIdentity — the single resolver for subsystem appearance.
//
//  Every UI component calls this helper to read a subsystem's visual identity.
//  It checks the shared `visualIdentity` field first (the canonical source of
//  truth), then falls back to legacy fields (glyph, color, name, etc.) for
//  back-compat with seeded/older records.
//
//  This guarantees there is exactly ONE code path for resolving appearance.
//  No page reads visual fields directly — they all go through this function.
// ════════════════════════════════════════════════════════════════════════════

import type { VisualIdentity } from "./types";

// ── Subsystem record shapes ─────────────────────────────────────────────────
// A minimal interface that covers every subsystem type. We use structural
// typing so this works for InstalledApp, AgentPersona, Skill, Tool, Engine,
// MCPServer, LLMFamily, LLMProvider, etc.

interface SubsystemWithVisualIdentity {
  visualIdentity?: VisualIdentity;
  name?: string;
  description?: string;
  glyph?: string;
  iconName?: string;
  color?: string;
  category?: string;
  badge?: string;
  type?: string;
  tagline?: string;
}

/**
 * Resolve the visual identity for ANY subsystem record.
 *
 * Priority:
 * 1. `record.visualIdentity` (the shared object — canonical source of truth)
 * 2. Legacy fields on the record (glyph, color, name, etc.)
 *
 * This function ALWAYS returns a complete VisualIdentity — it never returns
 * undefined. If no visual data exists at all, sensible defaults are used.
 */
export function getVisualIdentity(record: SubsystemWithVisualIdentity): VisualIdentity {
  // 1. If the shared object exists, use it directly
  if (record.visualIdentity) {
    return record.visualIdentity;
  }

  // 2. Fall back to legacy fields (back-compat with seeded/older records)
  // Use || (not ??) for glyph so empty string "" falls through to iconName
  const glyph = record.glyph || record.iconName;
  const color = record.color ?? "axiom-violet";
  const name = record.name ?? record.tagline ?? "Untitled";
  const description = record.description ?? record.type ?? "";
  const category = record.category ?? record.type ?? "";
  const badge = record.badge ?? "";

  return {
    displayName: name,
    description,
    category,
    glyph,
    accentColor: color,
    badge,
  };
}

/**
 * Resolve just the glyph (icon) for any subsystem record.
 * Convenience wrapper — reads visualIdentity.glyph, falls back to legacy
 * `glyph` then `iconName`.
 */
export function getGlyph(record: SubsystemWithVisualIdentity): string | undefined {
  if (record.visualIdentity?.glyph) return record.visualIdentity.glyph;
  // Use || (not ??) so empty string "" falls through to iconName.
  // AI Core apps set glyph: "" and rely on iconName for Lucide icons.
  return record.glyph || record.iconName;
}

/**
 * Resolve just the accent color for any subsystem record.
 * Convenience wrapper — reads visualIdentity.accentColor, falls back to
 * legacy `color`.
 */
export function getAccentColor(record: SubsystemWithVisualIdentity): string {
  if (record.visualIdentity?.accentColor) return record.visualIdentity.accentColor;
  return record.color ?? "axiom-violet";
}

/**
 * Resolve just the display name for any subsystem record.
 * Convenience wrapper — reads visualIdentity.displayName, falls back to
 * legacy `name`.
 */
export function getDisplayName(record: SubsystemWithVisualIdentity): string {
  if (record.visualIdentity?.displayName) return record.visualIdentity.displayName;
  return record.name ?? record.tagline ?? "Untitled";
}

/**
 * Resolve just the description for any subsystem record.
 */
export function getDescription(record: SubsystemWithVisualIdentity): string {
  if (record.visualIdentity?.description) return record.visualIdentity.description;
  return record.description ?? record.type ?? "";
}

// ════════════════════════════════════════════════════════════════════════════
//  migrateVisualIdentity — one-time data migration.
//
//  For every existing registry entry that does NOT have a `visualIdentity`
//  field, reconstruct it from the legacy fields (glyph, color, name, etc.).
//
//  Rules:
//  - If visualIdentity already exists, leave it untouched.
//  - If glyph exists, preserve it (never replace with a default).
//  - If iconName exists, preserve it (use as fallback for glyph).
//  - If color exists, preserve it (never replace with a default).
//  - If name exists, preserve it as displayName.
//  - If description exists, preserve it.
//  - Never generate random icons.
//  - Never assign generic placeholders.
//  - Never clear existing visual metadata.
//
//  This is a DATA MIGRATION only — it does not change the architecture.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Migrate a single record: if `visualIdentity` is missing, reconstruct it
 * from legacy fields. Returns the record with `visualIdentity` populated.
 * NON-DESTRUCTIVE: if `visualIdentity` already exists, the record is returned
 * unchanged.
 */
export function migrateRecordVisualIdentity<T extends SubsystemWithVisualIdentity>(
  record: T,
  defaults?: { accentColor?: string; badge?: string; category?: string },
): T {
  // If visualIdentity already exists, leave it untouched
  if (record.visualIdentity) return record;

  // Reconstruct from legacy fields — preserve every existing value
  // Use || (not ??) for glyph so empty string "" falls through to iconName
  const glyph = record.glyph || record.iconName;
  const accentColor = record.color ?? defaults?.accentColor ?? "axiom-violet";
  const displayName = record.name ?? record.tagline ?? "Untitled";
  const description = record.description ?? record.type ?? "";
  const category = record.category ?? record.type ?? defaults?.category ?? "";
  const badge = record.badge ?? defaults?.badge ?? "";

  return {
    ...record,
    visualIdentity: {
      displayName,
      description,
      category,
      glyph,
      accentColor,
      badge,
    },
  };
}

/**
 * Migrate an entire registry array. Applies `migrateRecordVisualIdentity`
 * to every entry. Returns a new array (does not mutate the input).
 */
export function migrateRegistryVisualIdentity<T extends SubsystemWithVisualIdentity>(
  registry: T[],
  defaults?: { accentColor?: string; badge?: string; category?: string },
): T[] {
  return registry.map((record) => migrateRecordVisualIdentity(record, defaults));
}

"use client";

// ════════════════════════════════════════════════════════════════════════════
//  Asset Provider Registry + Unified Renderer
// ════════════════════════════════════════════════════════════════════════════
//
//  Only TWO providers are registered:
//    • Axiom     — 37 built-in geometric glyphs (synchronous text rendering)
//    • Workspace — user-imported SVGs (async SVG fetch, cached)
//
//  Lucide icons (the ~34 functional defaults) are NOT a registered provider.
//  They are resolved directly via the lucideResolver callback set by
//  AppIcon.tsx. Lucide is NOT browsable in the picker.
//
//  External libraries (Phosphor, Heroicons, Tabler, Lucide) are NOT providers
//  at all. The picker shows provider cards that link to official websites.
//  The user copies SVG from the official site, pastes into Axiom, and the
//  SVG is stored in Workspace Assets.

import { useState, useEffect } from "react";
import type { AssetProvider, IconReference, IconLibrary } from "./types";
import { migrateGlyph } from "./types";
import { axiomProvider } from "./axiom-provider";
import { workspaceProvider } from "./workspace-provider";

// ── Lucide resolver callback ────────────────────────────────────────────────
// AppIcon.tsx sets this to its static component map (~34 icons). The
// GlyphRenderer uses it to resolve Lucide icons synchronously.
type LucideResolver = (name: string) => unknown | null;
let lucideResolver: LucideResolver | null = null;

export function setLucideResolver(resolver: LucideResolver): void {
  lucideResolver = resolver;
}

// ── Provider registry ───────────────────────────────────────────────────────

const providers = new Map<string, AssetProvider>();

export function registerAssetProvider(provider: AssetProvider): void {
  providers.set(provider.libraryId, provider);
}

// Register built-in providers — ONLY Axiom + Workspace
registerAssetProvider(axiomProvider);
registerAssetProvider(workspaceProvider);

// ── Registry API ────────────────────────────────────────────────────────────

export function getProvider(libraryId: string): AssetProvider | undefined {
  return providers.get(libraryId);
}

export function listLibraries(): IconLibrary[] {
  return Array.from(providers.values()).map((p) => p.library);
}

export function listAvailableLibraries(): IconLibrary[] {
  return listLibraries().filter((l) => l.available);
}

// ── SVG cache (in-memory, per-icon) ────────────────────────────────────────
const svgCache = new Map<string, string | null>();

async function fetchIconSvg(library: string, name: string): Promise<string | null> {
  const cacheKey = `${library}:${name}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey) ?? null;

  const provider = getProvider(library);
  if (!provider) {
    svgCache.set(cacheKey, null);
    return null;
  }

  const svg = await provider.getIconSvg(name);
  svgCache.set(cacheKey, svg);
  return svg;
}

/** Invalidate the cached SVG for a specific icon (e.g. after re-importing or
 *  deleting a workspace asset). Call this whenever an asset's SVG changes. */
export function invalidateIconCache(library: string, name: string): void {
  svgCache.delete(`${library}:${name}`);
}

// ── SVG normalization ──────────────────────────────────────────────────────
// Normalizes imported SVGs so they render reliably inside ANY container:
// • Removes any fixed width/height from the original SVG
// • Uses a unified 0 0 24 24 viewBox (scales original geometry to fit)
// • preserveAspectRatio="xMidYMid meet" — centers + scales to fit
// • NO padding applied here — the container controls size/padding via className
// • Inherits currentColor for stroke (line icons) or fill (solid icons)
// • vector-effect="non-scaling-stroke" for consistent stroke width
//
// The SVG fills its container 100% (via CSS width/height injected at render).
// The container (caller) defines the visual size. To get "padding" in a
// specific component, use a smaller className.

function normalizeSvgString(svg: string): string {
  // Extract the original viewBox
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  const originalViewBox = viewBoxMatch ? viewBoxMatch[1].trim().split(/\s+/).map(Number) : [0, 0, 24, 24];

  // Extract inner content
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const inner = innerMatch ? innerMatch[1] : "";

  // Check if the SVG uses fill (solid icons) or stroke (line icons)
  const hasFill = /fill="[^"]*"/i.test(inner) && !/fill="none"/i.test(inner);

  // Scale the original geometry to fit the 24x24 viewBox (no padding).
  const [vx, vy, vw, vh] = originalViewBox;
  const scale = Math.min(24 / vw, 24 / vh);
  const tx = (24 - vw * scale) / 2 - vx * scale;
  const ty = (24 - vh * scale) / 2 - vy * scale;

  // For stroke icons: use vector-effect so the stroke width is NOT scaled
  // by the transform. This ensures consistent line weight regardless of the
  // original viewBox size.
  const strokeAttrs = hasFill
    ? ""
    : ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';

  // No width/height attributes on the <svg>. The SVG is sized entirely by
  // its container via CSS (width:100%;height:100% injected at render time).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"${strokeAttrs}><g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g></svg>`;
}

// ── Unified GlyphRenderer ───────────────────────────────────────────────────
// The ONE renderer. Accepts either:
// • iconRef ({ library, name })
// • glyph (bare string) — legacy, auto-migrated
// • iconName (bare string) — legacy back-compat
//
// Resolution rules (NEVER returns null for a valid reference):
// • Lucide    → synchronous component lookup via lucideResolver
// • Axiom     → synchronous text rendering (geometric symbols + emoji)
// • Workspace → async SVG fetch (cached)
//
// Icons are ALWAYS centered via flexbox. File names are NEVER displayed
// as previews — if an SVG is loading or not found, a transparent spacer
// is rendered (never the filename).

export function GlyphRenderer({
  glyph,
  iconName,
  iconRef,
  className,
  textClassName,
}: {
  glyph?: string;
  iconName?: string;
  iconRef?: IconReference | null;
  className?: string;
  textClassName?: string;
}) {
  const effectiveGlyph = glyph ?? iconName;
  const ref = iconRef ?? migrateGlyph(effectiveGlyph);
  const refKey = ref ? `${ref.library}:${ref.name}` : null;

  const [svgState, setSvgState] = useState<{ key: string; svg: string | null } | null>(null);

  useEffect(() => {
    if (!ref || !refKey) return;
    // Axiom + Lucide are synchronous — no fetch needed
    if (ref.library === "axiom" || ref.library === "lucide") {
      return;
    }
    // Workspace: async SVG fetch
    let cancelled = false;
    fetchIconSvg(ref.library, ref.name).then((s) => {
      if (!cancelled && refKey) setSvgState({ key: refKey, svg: s ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, [refKey, ref?.library, ref?.name]);

  const svg = svgState && svgState.key === refKey && svgState.svg ? svgState.svg : null;

  // No reference at all — render nothing
  if (!ref) return null;

  // ── Lucide: synchronous component lookup ──
  if (ref.library === "lucide") {
    if (lucideResolver) {
      const Comp = lucideResolver(ref.name);
      if (Comp) {
        const LucideIcon = Comp as React.FC<{ className?: string }>;
        return <LucideIcon className={className} />;
      }
    }
    // Not in the local map — render a transparent spacer (never the filename)
    return <span className={className} style={{ display: "inline-block" }} aria-hidden />;
  }

  // ── Axiom: synchronous text rendering (geometric symbols + emoji) ──
  if (ref.library === "axiom") {
    return (
      <span
        className={textClassName ?? className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {ref.name}
      </span>
    );
  }

  // ── Workspace: async SVG ──
  if (svg) {
    const normalized = normalizeSvgString(svg);
    // The outer span is the sized container.
    // CRITICAL: some callers pass text-size classes (e.g. "text-2xl",
    // "text-lg", "text-base") instead of dimension classes (e.g. "w-5 h-5").
    // For text-size classes, the span has no explicit width/height, so the
    // SVG's width:100% would resolve to the intrinsic SVG size (300x150px),
    // causing an enormous icon that overflows the dialog.
    // Fix: when className doesn't include w-*/h-*, set width:1em;height:1em
    // so the SVG matches the current font-size (just like text glyphs).
    const hasExplicitSize = /\bw-\d/.test(className || "") || /\bh-\d/.test(className || "");
    const svgWithSize = normalized.replace(
      /<svg /,
      '<svg style="width:100%;height:100%;display:block;" ',
    );
    return (
      <span
        className={className}
        style={{
          display: "inline-block",
          overflow: "hidden",
          boxSizing: "border-box",
          verticalAlign: "middle",
          ...(hasExplicitSize ? {} : { width: "1em", height: "1em" }),
        }}
        dangerouslySetInnerHTML={{ __html: svgWithSize }}
      />
    );
  }

  // Loading or not found — transparent spacer (NEVER the filename)
  return <span className={className} style={{ display: "inline-block" }} aria-hidden />;
}

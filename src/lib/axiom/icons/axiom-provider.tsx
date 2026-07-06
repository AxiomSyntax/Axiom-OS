"use client";

// ════════════════════════════════════════════════════════════════════════════
//  Axiom Asset Provider — geometric symbols (internal, no external dependency)
// ════════════════════════════════════════════════════════════════════════════

import type { AssetProvider, IconCategory, IconLibrary } from "./types";

export const AXIOM_GLYPHS: string[] = [
  "○", "●", "◎", "◉", "⊙", "◯", "◐", "◑",
  "△", "▲", "▽", "▼",
  "□", "■", "◽", "◾",
  "◇", "◆", "◈",
  "⬡", "⬢",
  "⬣", "⬤",
  "★", "☆", "✦", "✧", "✶", "✷", "✸",
  "⊖", "⊗", "⊕",
  "⌬", "⌖", "✺", "❋",
];

const AXIOM_CATEGORIES: IconCategory[] = [
  { id: "circles", label: "Circles", iconNames: ["○", "●", "◎", "◉", "⊙", "◯", "◐", "◑"] },
  { id: "triangles", label: "Triangles", iconNames: ["△", "▲", "▽", "▼"] },
  { id: "squares", label: "Squares", iconNames: ["□", "■", "◽", "◾"] },
  { id: "diamonds", label: "Diamonds", iconNames: ["◇", "◆", "◈"] },
  { id: "hexagons", label: "Hexagons", iconNames: ["⬡", "⬢"] },
  { id: "octagons", label: "Octagons", iconNames: ["⬣", "⬤"] },
  { id: "stars", label: "Stars", iconNames: ["★", "☆", "✦", "✧", "✶", "✷", "✸"] },
  { id: "rings", label: "Rings", iconNames: ["⊖", "⊗", "⊕"] },
  { id: "special", label: "Special", iconNames: ["⌬", "⌖", "✺", "❋"] },
];

const AXIOM_LIBRARY: IconLibrary = {
  id: "axiom",
  label: "Axiom",
  available: true,
  hasCategories: true,
  hasSearch: true,
};

export const axiomProvider: AssetProvider = {
  libraryId: "axiom",
  library: AXIOM_LIBRARY,

  listIcons(categoryId?: string): string[] {
    if (!categoryId) return AXIOM_GLYPHS;
    const cat = AXIOM_CATEGORIES.find((c) => c.id === categoryId);
    return cat ? cat.iconNames : [];
  },

  listCategories(): IconCategory[] {
    return AXIOM_CATEGORIES;
  },

  searchIcons(query: string): string[] {
    const q = query.toLowerCase();
    const nameMap: Record<string, string[]> = {
      "circle": ["○", "●", "◎", "◉", "⊙", "◯", "◐", "◑"],
      "triangle": ["△", "▲", "▽", "▼"],
      "square": ["□", "■", "◽", "◾"],
      "diamond": ["◇", "◆", "◈"],
      "hexagon": ["⬡", "⬢"],
      "octagon": ["⬣", "⬤"],
      "star": ["★", "☆", "✦", "✧", "✶", "✷", "✸"],
      "ring": ["⊖", "⊗", "⊕"],
      "oracle": ["◎"],
      "forge": ["⌬"],
      "scribe": ["✶"],
      "warden": ["▲"],
      "echo": ["◈"],
      "axiom": ["⬡"],
    };
    const results = new Set<string>();
    for (const [key, glyphs] of Object.entries(nameMap)) {
      if (key.includes(q)) glyphs.forEach((g) => results.add(g));
    }
    AXIOM_GLYPHS.forEach((g) => { if (g.includes(q)) results.add(g); });
    return Array.from(results);
  },

  async getIconSvg(name: string): Promise<string | null> {
    // Axiom glyphs are unicode characters — they render as text, not SVG.
    // Return null so the GlyphRenderer falls back to text rendering.
    return null;
  },

  hasIcon(name: string): boolean {
    return AXIOM_GLYPHS.includes(name);
  },
};
